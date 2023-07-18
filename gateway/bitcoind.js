//
// bitcoind
//

const http = require('node:http');
const auth = 'Basic ' + Buffer.from('bliquid:bl1qu1d').toString('base64')

exports.balance = function( address, reqid, rescb ) {

  var postData = {
    "jsonrpc": "2.0",
    "method": "listreceivedbyaddress",
    "params": [1, true, false, address],
    "id": 'test'
  }

  var options = {
    hostname: "127.0.0.1",
    port: 8332,
    method: 'POST',
    headers: { 'Authorization' : auth,
               'Content-Type' : 'application/json',
               'Content-Length' : Buffer.byteLength(JSON.stringify(postData)) }
  }

  var req = http.request( options, res => {
    var resbuff = ''
    res.setEncoding( 'utf8' )

    res.on('data', chunk => {
      resbuff += chunk
    } )

    res.on('end', () => {
      let it = JSON.parse( resbuff )
      let answer = it['result'][0]
      rescb( { address : answer.address,
               amount : answer.amount } )
    } )
  } )

  req.on('error', e => {
    console.log( e.message )
  } )

  req.write( JSON.stringify(postData) )
  req.end()

}

exports.newaddress = function( reqid, rescb ) {
}

exports.send = function( amt, to, cb ) {
}
