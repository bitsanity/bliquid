const fs = require( 'fs' )
const http = require( 'node:http' )
const https = require( 'https' )
const wss = require( 'ws' )
const ecies = require( 'eciesjs' )

const bitcoind = require( './bitcoind.js' )

const PORT = 8888
const SERVERLOG = './server.txt'

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

function blackStrToRedObj( blackstr ) {
  let redobj

  try {
    let redstr = ecies.decrypt( privkey, blackstr )
    redobj = JSON.parse( redstr )
  } catch( pe ) { throw 'Invalid message' }

  return redobj
}

function redObjToBlackStr( redobj ) {
  let redstr = JSON.stringify(redobj)
  return ecies.encrypt( clntpub, redstr )
}

function validResponse( redobj, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.result = redobj
  response.id = reqid
  return response
}

function errorResponse( errorCode, strErrorMessage, reqid ) {
  let response = JSON.parse( JSON.stringify(ERRORRESPONSE) )
  response.id = reqid
  response.error.code = errorCode
  response.error.message = strErrorMessage
  return response
}

function log( whichlog, msg ) {
  let now = Date.now()
  if (whichlog)
    whichlog.write( now + ' ' + msg )
  else
    console.log( now + ' ' + msg )
}

// START

if (process.argc != 4) {
  log( serverLog, 'usage $ node <file.js> <priv> <pub>' )
  process.exit( 1 )
}

var privkey = ecies.PrivateKey.fromHex( process.argv[1] )
var clntpub = ecies.PublicKey.fromHex( process.argv[2] )

var serverLog = fs.createWriteStream( SERVERLOG, { flags: 'a' } )
log( serverLog, '\n\t********** hello\n' )

const wsServer = new wss.Server( {
  port: PORT,
  noServer: true
} )

wsServer.on( 'connection', (ws, req) => {

  ws.on( 'message', black => {

    let redobj

    try {
      redobj = blackStrToRedObj( black )
      log( serverLog, JSON.stringify(redobj,null,2) )

      if (    !redobj.jsonrpc
           || redobj.jsonrpc !== "2.0"
           || !redobj.method
           || !redobj.params ) {
        throw ('JSON-RPC 2.0 required');
      }

      if (redobj.method === 'btc.balance') {
        bitcoind.balance( redobj.params[0], redobj.id, resobj => {
          ws.send( redObjToBlackStr(validResponse(resobj, redobj.id)) )
        } )
      }
      else if (redobj.method === 'newBTCAddr') {
      }
      else if (redobj.method === 'sendBTC') {
      }
      else {
        throw errorResponse(400, 'method not found', redobj.id)
      }
    }
    catch( e ) {
      ws.send( redObjToBlackStr(errorResponse(500,e.toString(), redobj.id)) )
    }
  } )

  ws.onerror = () => {
    log( serverLog, 'socket error' )
  }
} )

console.log( 'B-Liquid backend server is running on port ', PORT )

