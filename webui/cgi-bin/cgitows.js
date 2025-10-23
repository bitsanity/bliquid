const fs = require( 'fs' )
const wss = require( 'ws' )
const ecjson = require( './ecjsonrpc.js' )

const WSURL = 'ws://10.0.0.113:8888'
//const WSURL = 'ws://70.66.248.196:8888'

var privkeyhex =
  "e25a5ca7b7bfd9bd08cceb55a22cdb8ac9c1827ed61fdcf032a8c103bacc6f15"
// pub: 036d084b5cf6649bc0711f0073af0f43b46e54b08e8b455652149eaad909074930

function getResponseTo( method, reqobj ) {

  let ws = new wss.WebSocket( WSURL )

  ws.on( 'message', msgdata => {
    let obj
    try {
      obj = JSON.parse( msgdata.toString() )

      if (obj.method === "hello") {
        let gwpubkeyhex = obj.params[0]
        let redreq = JSON.parse( JSON.stringify(ecjson.REQUEST) )
        redreq.method = method
        redreq.params = [ reqobj ]
        redreq.id = process.pid
        let blackreq = ecjson.redToBlack( privkeyhex, gwpubkeyhex, redreq )
        ws.send( JSON.stringify(blackreq) )
      }
      else if (obj.error) {
        throw JSON.stringify( obj.error )
      }
      else if (obj.msghex) {
        let redobj = ecjson.blackToRed( privkeyhex, obj )
        if (redobj.error)
          throw JSON.stringify( redobj.error )
        let rspobj = { result: redobj.result }
        console.log( "Content-Type: application/json\r\n\r\n" )
        console.log( JSON.stringify(rspobj) )
        ws.close()
      }
      else {
        throw 'unrecognized response: ' + msgdata.toString()
      }
    }
    catch( ex ) {
      let errobj = { error: { code: 500, message: ex.toString() } }
      console.log( "Content-Type: application/json\r\n\r\n" )
      console.log( JSON.stringify(errobj) )
      ws.close()
    }
  } )
}

function handlePost( meth ) {
  process.stdin.on('data', data => {
    let body = JSON.parse( data.toString() )
    getResponseTo( meth, body )
  });
}

module.exports.setPrivateKey = function( pkhex ) {
  privkeyhex = pkhex
}

module.exports.doit = function( meth ) {

  try {
    if (process.env.REQUEST_METHOD === 'GET') {
      let reqobj = {}
      let args = process.env.QUERY_STRING.split('&')

      for ( var ii = 0; ii < args.length; ii++ ) {
        let arg = args[ii].split('=')
        let argname = arg[0], argval = arg[1]
        reqobj[ argname ] = argval
      }

      getResponseTo( meth, reqobj )
    }
    else if (process.env.REQUEST_METHOD === 'POST') {
      handlePost( meth )
    }
    else
      throw "unrecognized REQUEST_METHOD: " + process.env.REQUEST_METHOD
  }
  catch( ex ) {
    let errrsp = { error: { code: 500, message: ex.toString() } }
    console.log( "Content-Type: application/json\r\n\r\n" )
    console.log( JSON.stringify(errrsp) )
  }

}
