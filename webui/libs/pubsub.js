// Simplest internal Pub/Sub implementation possible
//
// source:
//   https://jsmanifest.com/the-publish-subscribe-pattern-in-javascript/

var PubSub = (function() {
  const subscribers = {}

  function publish(eventName, data) {

    if (!Array.isArray(subscribers[eventName])) {
      return
    }
    subscribers[eventName].forEach((callback) => {
      try {
        callback(data)
      }
      catch( ex ) {
        console.log( ex )
      }
    })
  }

  function subscribe(eventName, callback) {
    if (!Array.isArray(subscribers[eventName])) {
      subscribers[eventName] = []
    }
    subscribers[eventName].push(callback)
  }

  return {
    publish:publish,
    subscribe:subscribe
  }
})();
