var gulp = require("gulp"),
    gutil = require("gulp-util"),
    plugins = require("gulp-load-plugins")(),
    browserify = require("browserify"),
    exorcist = require("exorcist"),
    transform = require("vinyl-transform"),
    watchify = require("watchify"),
    browserSync = require("browser-sync"),
    source = require("vinyl-source-stream"),
    to5 = require("gulp-babel"),
    eslint = require("gulp-eslint"),
    to5ify = require("babelify"),
    rename = require("gulp-rename"),
    historyApiFallback = require("connect-history-api-fallback"),
    minimist = require("minimist");

// ================================================================================
// CLI args

var cliOptions = {
    string: 'app-root',
    default: {
        'app-root': 'dist/app/'
    }
};

var options = minimist(process.argv.slice(2), cliOptions),
    appRoot = options['app-root'];

if (appRoot.substr(appRoot.length - 1, 1) !== "/") {
    appRoot += "/";
}

var APP_ROOT = appRoot,
    APP_ASSETS_ROOT = APP_ROOT + "assets/",
    APP_I18N_ROOT = APP_ROOT + "i18n/",
    APP_VENDOR_ROOT = APP_ROOT + "vendor/",
    APP_JS_ROOT = APP_ASSETS_ROOT + "js/",
    APP_JS_SOURCE_MAP = APP_JS_ROOT + "app.js.map",
    APP_CSS_ROOT = APP_ASSETS_ROOT + "css/",
    APP_SVG_ROOT = APP_ASSETS_ROOT + "svg/",
    APP_FONTS_ROOT = APP_ASSETS_ROOT + "fonts/",
    APP_IMAGES_ROOT = APP_ASSETS_ROOT + "img/",
    MOCKUPS_ROOT = "dist/mockups/",
    MOCKUPS_ASSETS_ROOT = MOCKUPS_ROOT + "assets/",
    MOCKUPS_CSS_ROOT = MOCKUPS_ASSETS_ROOT + "css/",
    MOCKUPS_FONTS_ROOT = MOCKUPS_ASSETS_ROOT + "fonts/",
    MOCKUPS_IMAGES_ROOT = MOCKUPS_ASSETS_ROOT + "img/";

// ================================================================================
// JS

gulp.task("scripts-dev", ["app-dev", "vendor-dev"]);
gulp.task("scripts-prod", ["app-prod", "vendor-prod"]);
gulp.task("scripts-docker", ["app-docker", "vendor-prod"]);
gulp.task("scripts-acceptance", ["app-acceptance", "vendor-dev"]);

// Browserify configs

function browserifyConfigFactory(configFile, sourceMaps, debug, watch){
    return {
	watchify: watch,
        debug: debug,
        cache: {},
        packageCache: {},
        paths: ["./src/app"],
        transform: [
            ["babelify", {
                "optional": ["runtime"],
                "sourceMap": sourceMaps,
                "blacklist": ["useStrict"]
            }],
            ["aliasify", {
                "aliases": {
                    "config": {
                        "relative": configFile
                    }
                }
            }]
        ]
    };
}

var browserifyDevConfig = browserifyConfigFactory("./config/dev.js", true, true, true);
var browserifyProdConfig = browserifyConfigFactory("./config/prod.js", false, false, false);
var browserifyDockerConfig = browserifyConfigFactory("./config/docker.js", false, false, false);
var browserifyAcceptanceConfig = browserifyConfigFactory("./config/acceptance.js", true, true, false);

// App builds

function buildBundle(b, hasSourceMaps) {
    var stream = b.bundle()
      .on("error", function(error){
          console.log("~_~U  Failed to generate .js files");
          console.error(error.toString());
          this.emit("end");
      })
      .pipe(source("app.js"));

    if (hasSourceMaps) {
        stream = stream.pipe(transform(function(){ return exorcist(APP_JS_SOURCE_MAP); }));
    }

    stream = stream.pipe(gulp.dest(APP_JS_ROOT));

    if (browserSync.active) {
        return stream.pipe(browserSync.reload({stream: true}));
    }
    return stream;

}

function buildApp(browserifyConfig){
    return function(){
        var b = browserify("./src/app/main.js", browserifyConfig);

        if (browserifyConfig.watchify) {
            b = watchify(b);
        }

        b.on("update", function(){
            buildBundle(b, browserifyConfig.debug);
        });
        b.on("time", function(milis) {
            gutil.log("Finished bundling after", milis / 1000, "seconds");
        });
        b.on("error", function(error){
            console.log(error.toString());
        });

        var stream = buildBundle(b);
        return stream;
    };
}

gulp.task("app-dev", buildApp(browserifyDevConfig));
gulp.task("app-prod", buildApp(browserifyProdConfig));
gulp.task("app-docker", buildApp(browserifyDockerConfig));
gulp.task("app-acceptance", buildApp(browserifyAcceptanceConfig));

// Vendorized deps

gulp.task("vendor-dev", function(){

    return gulp.src("./src/vendor/es6-shim.js")
      .pipe(gulp.dest(APP_VENDOR_ROOT));

});

gulp.task("vendor-prod", function(){

    return gulp.src("./src/vendor/es6-shim.min.js")
      .pipe(plugins.rename("es6-shim.js"))
      .pipe(gulp.dest(APP_VENDOR_ROOT));

});

// Linter

gulp.task("jslint", function() {

  var stream = gulp.src("./src/app/**/*.js")
    .pipe(eslint())
    .pipe(eslint.format());

  return stream;

});

// ================================================================================
// CSS

gulp.task("csslint", ["styles"], function() {

  gulp.src("./dist/css/*.css")
    .pipe(plugins.csslint());

});

gulp.task("styles", function() {

  var stream = gulp.src("./src/styles/index.styl")
    .pipe(plugins.stylus())
    .pipe(plugins.rename("styles.css"))
    .pipe(gulp.dest(APP_CSS_ROOT))
    .pipe(gulp.dest(MOCKUPS_CSS_ROOT));

  if (browserSync.active) {
    stream.pipe(browserSync.reload({stream:true}));
  }

  return stream;

});

// ================================================================================
// Templates

gulp.task("templates", function() {

  var stream = gulp.src("./src/templates/**/*.jade")
    .pipe(plugins.jade({
        pretty: true
    }))
    .pipe(gulp.dest(MOCKUPS_ROOT))
    .pipe(gulp.dest(APP_ROOT));

  if (browserSync.active) {
    stream.pipe(browserSync.reload());
  }

  return stream;

});

// ================================================================================
// HTML

gulp.task("html", function() {

  var stream = gulp.src("./src/public/**/*.html")
    //.pipe(plugins.jade({
    //    pretty: true
    //}))
    .pipe(gulp.dest(MOCKUPS_ROOT))
    .pipe(gulp.dest(APP_ROOT));

  if (browserSync.active) {
    stream.pipe(browserSync.reload());
  }

  return stream;

});

// =================================================================================
// Mockup

gulp.task("mockup", ["styles", "templates", "fonts", "pngs", "html"], function() {

  gulp.watch("./src/styles/**/*.styl", ["styles", "csslint"]);
  //gulp.watch("./src/templates/**/*.jade", ["templates"]);
  gulp.watch("./src/public/**/*.html", ["html"]);
  gulp.watch("./src/assets/fonts/*.*", ["fonts"]);
  gulp.watch("./src/assets/img/*.png", ["pngs"]);

  browserSync({
      open: false,
      server: {
          baseDir: MOCKUPS_ROOT,
          directory: true
      }
  });
});

// ================================================================================
// i18n & l10n

gulp.task("locale", function(){

    return gulp.src("./src/app/i18n/**/*.json")
      .pipe(gulp.dest(APP_I18N_ROOT));

});

// ================================================================================
// Fonts

gulp.task("fonts", function(){

    return gulp.src("./src/assets/fonts/*.ttf")
      .pipe(plugins.ttf2woff())
      .pipe(gulp.dest(MOCKUPS_FONTS_ROOT))
      .pipe(gulp.dest(APP_FONTS_ROOT));

});

// ================================================================================
// Images

gulp.task("images", ["pngs", "svgs"]);

gulp.task("pngs", function(){

    return gulp.src("./src/assets/img/*.png")
      .pipe(gulp.dest(MOCKUPS_IMAGES_ROOT))
      .pipe(gulp.dest(APP_IMAGES_ROOT));

});

gulp.task("svgs", function(){

    return gulp.src("./src/assets/svg/*.svg")
      .pipe(gulp.dest(MOCKUPS_IMAGES_ROOT))
      .pipe(gulp.dest(APP_SVG_ROOT));

});

// ================================================================================
// Dev

gulp.task("browser-sync", ["scripts-dev", "styles", "templates", "html"], function() {
  browserSync({
      open: false,
      server: {
          baseDir: APP_ROOT
      },
      middleware: [ historyApiFallback ]
  });
});


gulp.task("watch", ["browser-sync", "scripts-dev", "styles", "templates","html",  "locale", "images", "fonts"], function() {

  gulp.watch("./src/fonts/*.*", ["fonts"]);
  gulp.watch("./src/styles/**/*.styl", ["styles", "csslint"]);
  gulp.watch("./src/templates/**/*.jade", ["templates"]);
  gulp.watch("./src/public/**/*.html", ["html"]);
  gulp.watch("./src/app/i18n/{messages,formats}/*.json", ["locale"]);
  gulp.watch("./src/assets/img/*.png", ["pngs"]);
  gulp.watch("./src/assets/svg/*.svg", ["svgs"]);

});

gulp.task("default", ["watch"]);

// ================================================================================
// Distribution

gulp.task("dist", ["scripts-prod", "fonts", "styles", "templates","html", "locale", "images"]);

gulp.task("docker", ["scripts-docker", "fonts", "styles", "templates","html", "locale", "images"]);

gulp.task("dist-mockup", ["fonts", "styles", "templates","html", "images"]);

// ================================================================================
// Acceptance testing

gulp.task("acceptance", ["scripts-acceptance", "styles", "templates","html", "locale", "images", "fonts"], function() {

  gulp.watch("./src/fonts/*.*", ["fonts"]);
  gulp.watch("./src/styles/**/*.styl", ["styles", "csslint"]);
  gulp.watch("./src/templates/**/*.jade", ["templates"]);
  gulp.watch("./src/public/**/*.html", ["html"]);
  gulp.watch("./src/app/i18n/{messages,formats}/*.json", ["locale"]);
  gulp.watch("./src/assets/img/*.png", ["pngs"]);
  gulp.watch("./src/assets/svg/*.svg", ["svgs"]);

});
