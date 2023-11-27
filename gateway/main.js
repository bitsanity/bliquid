const fs = require( 'fs' )
const crypto = require( 'node:crypto' )
const wss = require( 'ws' )
const ecies = require( 'eciesjs' )
const EC = require( 'elliptic' ).ec
var ec = new EC( 'secp256k1' )
const bitcoind = require( './bitcoind.js' )

const readline = require( 'readline' ).createInterface( {
  input: process.stdin,
  output: process.stdout
} )

const PORT = 8888
const SERVERLOG = './server.txt'

var REDHELLOMSG = {
  jsonrpc: "2.0",
  method: "hello",
  params: [],
  id: 0
}
const ERRORRESPONSE = {
  jsonrpc: "2.0",
  error: {
    code: 0,
    message: ''
  },
  id: 0
}

const BLANKRESPONSE = {
  jsonrpc: "2.0",
  result: {},
  id: 0
}

function blackToRed( blackstr ) {
  let result

  try {
    let red = ecies.decrypt( privkey, blackstr )
    result = JSON.parse( red )
  }
  catch( pe ) {
    throw 'Invalid message'
  }

  return result
}

function redToBlack( clntpub, redobj ) {
  let redstr = JSON.stringify(redobj)
  return ecies.encrypt( clntpub, redstr )
}

function log( whichlog, msg ) {
  let now = Date.now()
  if (whichlog)
    whichlog.write( now + ' ' + msg + '\n' )
  else
    console.log( now + ' ' + msg )
}

// START

var privkey = null
var wsspubkey = null
readline.question( 'gateway (my) privkey: ', (pk) => {
  try {
    privkey = ecies.PrivateKey.fromHex( pk )
    REDHELLOMSG.params = [ privkey.publicKey.toHex() ]
    log( null, 'gateway pubkey is: ' + privkey.publicKey.toHex() )

    readline.question( 'wss pubkey: ', (pub) => {
    wsspubkey = ecies.PublicKey.fromHex( pub )
    log( null, 'wss pubkey: ' + wsspubkey.toHex() )
    } )
  }
  catch( e ) {
    log( null, e )
    process.exit( 1 )
  }
} )

var serverLog = fs.createWriteStream( SERVERLOG, { flags: 'a' } )
log( serverLog, 'start' )

const wsServer = new wss.Server( {
  port: PORT
} )

wsServer.on( 'connection', (ws, req) => {

  console.log( 'sending red hello' )
  ws.send( JSON.stringify(REDHELLOMSG) )

  ws.on( 'message', blackobj => {

    console.log( 'black:\n' + JSON.stringify(blackobj,null,2) )

    let redobj

    try {
      if (!blackobj.id) {
        throw 'need client pubkey'
      }

      if (!blackobj.params || blackobj.params.length != 2) {
        throw 'need msg and sig params'
      }

      // confirm param[1] is ecdsa sig of param[0] and signed by pubkey
      let msg = Buffer.from( blackobj.params[0], 'hex' )
      let msghash = crypto.createHash('sha256').update(msg).digest()
      let sig = Buffer.from( blackobj.params[1], 'hex' )

      let clntpub = ec.keyFromPublic( blackobj.id )
      if (!ec.verify(msghash, sig, clntpub)) {
        throw 'invalid signature for specified pubkey'
      }

      // confirm pubkey is on our access control list
      if (wsspubkey.toHex().toLowerCase() !== blackobj.id.toLowerCase()) {
        throw 'unrecognized client'
      }

      redobj = blackToRed( blackobj.params[0] )
      log( serverLog, JSON.stringify(redobj,null,2) )

      if (    !redobj.jsonrpc
           || redobj.jsonrpc !== "2.0"
           || !redobj.method
           || !redobj.params ) {
        throw ('JSON-RPC 2.0 required');
      }

      if (redobj.method === 'btc.balance') {
        bitcoind.balance( redobj.params[0], redobj.id, resobj => {
          ws.send( redToBlack(validResponse(resobj, redobj.id)) )
        } )
      }
      else if (redobj.method === 'btc.newaddr') {
      }
      else if (redobj.method === 'btc.send') {
      }
      else {
        throw 'method not found'
      }
    }
    catch( e ) {
      let errobj = JSON.parse( JSON.stringify(ERRORRESPONSE) )
      errobj.error.code = 500
      errobj.error.message = e.toString()
      errobj.id = redobj.id
      ws.send( redToBlack(errobj) )
    }
  } )

  ws.onerror = () => {
    log( serverLog, 'socket error' )
  }
} )

