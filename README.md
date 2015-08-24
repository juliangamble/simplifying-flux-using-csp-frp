# simplifying-flux-using-csp-frp
This is based on http://codrspace.com/allenkim67/a-simpler-web-architecture-using-flux-csp-and-frp-concepts/ which is a proposal for porting the concepts like `core.async` in ClojureScript pure JavaScript. 

#Critiques of Flux
The author had the following to say about Flux:

*But when you look at the various implementations of flux it’s not very functional at all. Typically what you see is that actions, models, and views are each some kind of stateful event object. Each link in the chain has references to the previous link so that it can listen to it trigger an event. Models have references to actions to listen to its events. Views have references to models to listen its changes. IMO events are very complex, because it can be hard to trace the flow of logic between them.*

*Things would be much simpler if we could just use plain javascript objects as our data. And when an action occurs we simply update our model and pass it to a rendering function.*

#Setting up
Ensure you're running node `0.10` using `nvm`.
```
nvm install 0.10
nvm use 0.10

npm rebuild
npm install
```

#Starting:
```
npm install --global gulp
npm install --save-dev gulp
npm install
gulp
```


#Finally
You should follow [Allen Kim](https://github.com/allenkim67) on Github - he's got some interesting ideas. 


