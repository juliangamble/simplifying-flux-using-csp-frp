'use strict';

var csp = require('js-csp');
var React = require('react');

var channel = csp.chan();
var root = document.querySelector('#content');

//MODEL
var model = {count: 0};

//VIEW
var View = React.createClass({
  render: function() {
    return (
      <div>
        <button onClick={this.clickHandler}>this is a button</button>
        <div>clicked {this.props.model.count} times</div>
      </div>
    );
  },
  
  clickHandler: function() {
    csp.go(function*(){
      yield csp.put(channel, {actionType: 'incr'});
    });
  }
});

//UPDATE
function update(model, action) {
  switch (action.actionType) {
    case 'incr':
      model.count += 1;
      return model;
  }
}

//RENDER LOOP
function renderLoop(model) {
  React.render(<View model={model}/>, root);

  csp.go(function*() {
    while (true) {
      var action = yield csp.take(channel);
      model = update(model, action);
      React.render(<View model={model}/>, root);
    }
  });
}

renderLoop(model);


