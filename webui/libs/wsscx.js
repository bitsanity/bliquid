const FEESREQ = {
  jsonrpc: "2.0",
  method: "fees",
  params: [],
  id: 0
}

const RATESREQ = {
  jsonrpc: "2.0",
  method: "rates",
  params: [],
  id: 0
}

const BOOKITREQ = {
  jsonrpc: "2.0",
  method: "sale",
  params: [],
  id: 0
}

var WSSCX = (function() {

  var socket
  var myPrivkey
  var svrPubkey

  var Fees = {}
  var Rates = {}

  function init( wssurl ) {
    myPrivkey = new ECIES.PrivateKey( CRYPTO.randomBytes(32) )

    socket = new WebSocket( wssurl )

    socket.addEventListener( 'message', (msg) => {
      let rsp

      try {
        rsp = JSON.parse( msg.data )
      } catch( e ) { // ***

        try {
          rsp = blackToRed( msg.data )
        } catch( f ) {
          rsp = null
        }

      } // ***

      if (!rsp || rsp.error || !rsp.method)
        return

      if (rsp.method == "hello") {
        svrPubkey = rsp.params[0]
      }
      if (rsp.method == 'rates') {
        Rates = rsp.result
        PubSub.publish( 'Rates', rsp.result )
      }
      if (rsp.method == 'fees') {
        PubSub.publish( 'Fees', rsp.result )
      }

    } )
  }

  function myPublicKey() {
    return myPrivkey.publicKey.toHex()
  }

  function blackToRed( blackstr ) {
    return JSON.parse( ECIES.decrypt(myPrivkey.toHex(), blackstr) )
  }

  function redToBlack( redobj ) {
    return ecies.encrypt( svrPubkeyHex, JSON.stringify(redobj) )
  }

  function getFees( ctxamt, ctxcurr, crxcurr, method, rescb ) {

    let params = [ ctxamt, ctxcurr, crxcurr, method ]
    let req = JSON.parse( JSON.stringify(FEESREQ) )
    req.params = params

    socket.send( REDBLACK.redToBlack(req) )

    ***
  }

  function getRates() {

    socket.send( JSON.stringify(RATESREQ) )

    ***
  }

  function book( orderobj ) {
    let params = [ orderobj ]
    let req = JSON.parse( JSON.stringify(BOOKITREQ) )
    req.params = params

    socket.send( JSON.stringify(req) )

    ***
  }

  return {
    init : init,
    blackToRed : blackToRed,
    redToBlack : redToBlack,
    myPublicKey : myPublicKey,
    getFees : getFees,
    getRates : getRates
  }

})();

