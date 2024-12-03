const http = require('node:http');
const auth = 'Basic ' + Buffer.from('bliquid:bl1qu1d').toString('base64')

var cachedFee = {}

exports.balance = function( address ) {

  var postData = {
    "jsonrpc": "2.0",
    "method": "listreceivedbyaddress",
    "params": [1, true, false, address],
    "id": 'gateway'
  }

  var options = {
    hostname: "127.0.0.1",
    port: 8332,
    method: 'POST',
    headers: { 'Authorization' : auth,
               'Content-Type' : 'application/json',
               'Content-Length' : Buffer.byteLength(JSON.stringify(postData)) }
  }

  return new Promise( (resolve,reject) => {

    var req = http.request( options, res => {
      var resbuff = ''
      res.setEncoding( 'utf8' )

      res.on('data', chunk => {
        resbuff += chunk
      } )

      res.on('end', () => {
        let it = JSON.parse( resbuff )
        let answer = it['result'][0]
        resolve( { address : answer.address,
                   amount : answer.amount } )
      } )

      req.on('error', e => {
        reject( e )
      } )
    } )

    req.write( JSON.stringify(postData) )
    req.end()
  } )
}

// sample result from bitcoind:
// {"result":{"feerate":0.00061982,"blocks":3},"error":null,"id":"gateway"}

exports.getFee = function() {
  return cachedFee.feerate
}

exports.fetchFee = function( confirmationTgt=6, estimateMode="CONSERVATIVE") {

  var postData = {
    "jsonrpc": "2.0",
    "method": "estimatesmartfee",
    "params": [confirmationTgt, estimateMode],
    "id": 'gateway'
  }

  var options = {
    hostname: "127.0.0.1",
    port: 8332,
    method: 'POST',
    headers: { 'Authorization' : auth,
               'Content-Type' : 'application/json',
               'Content-Length' : Buffer.byteLength(JSON.stringify(postData)) }
  }

  return new Promise( (resolve,reject) => {

    var req = http.request( options, res => {
      var resbuff = ''
      res.setEncoding( 'utf8' )

      res.on('data', chunk => {
        resbuff += chunk
      } )

      res.on('end', () => {
        cachedFee = JSON.parse( resbuff ).result
        resolve( cachedFee )
      } )
    } )

    req.on('error', e => {
      reject( e )
    } )

    req.write( JSON.stringify(postData) )
    req.end()
  } )
}

exports.nextAddress = function( label, addrType='bech32' ) {

  var postData = {
    "jsonrpc": "2.0",
    "method": "getnewaddress",
    "params": [label, addrType],
    "id": 'gateway'
  }

  var options = {
    hostname: "127.0.0.1",
    port: 8332,
    method: 'POST',
    headers: { 'Authorization' : auth,
               'Content-Type' : 'application/json',
               'Content-Length' : Buffer.byteLength(JSON.stringify(postData)) }
  }

  return new Promise( (resolve,reject) => {

    var req = http.request( options, res => {
      var resbuff = ''
      res.setEncoding( 'utf8' )

      res.on('data', chunk => {
        resbuff += chunk
      } )

      res.on('end', () => {
        resolve( JSON.parse(resbuff).result )
      } )
    } )

    req.on('error', e => {
      reject( e )
    } )

    req.write( JSON.stringify(postData) )
    req.end()
  } )
}

exports.labelAddress = function( addr, label ) {

  var postData = {
    "jsonrpc": "2.0",
    "method": "setlabel",
    "params": [addr, label],
    "id": 'gateway'
  }

  var options = {
    hostname: "127.0.0.1",
    port: 8332,
    method: 'POST',
    headers: { 'Authorization' : auth,
               'Content-Type' : 'application/json',
               'Content-Length' : Buffer.byteLength(JSON.stringify(postData)) }
  }

  return new Promise( (resolve,reject) => {

    var req = http.request( options, res => {
      var resbuff = ''
      res.setEncoding( 'utf8' )
      res.on( 'end', () => { resolve() } )
      res.on( 'data', chunk => {} )
    } )

    req.on('error', e => { reject } )
    req.write( JSON.stringify(postData) )
    req.end()
  } )
}
