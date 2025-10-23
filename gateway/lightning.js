const net = require( 'node:net' )

const UNIXSOCKETPATH = '/home/bliquid/.lightning/bitcoin/lightning-rpc'

function doRPC( rpcReq ) {
  return new Promise( (resolve,reject) => {
    try {
      var client = net.createConnection( UNIXSOCKETPATH )
      client.on( 'connect', () => {
        client.write( JSON.stringify(rpcReq) )
      } )
      client.on( 'data', data => {
        let response = JSON.parse( data.toString() )
        resolve( response.result )
        client.end()
      } )
      client.on( 'error', err => {
        throw( err )
      } )
    }
    catch( ex ) {
      reject( ex )
    }
  } )
}

exports.listFunds = function( spent=false ) {
  var rpcRequest = {
    jsonrpc: "2.0",
    method : "listfunds",
    params : [spent],
    id : process.pid
  }

  return new Promise( (resolve,reject) => {
    doRPC( rpcRequest )
    .then( rsp => {
      let outputsum = 0
      rsp.outputs.forEach( op => { outputsum += op.amount_msat } )
      let channelsum = 0
      rsp.channels.forEach( ch => { channelsum += ch.our_amount_msat } )

      resolve( {
        outputs : outputsum,
        channels : channelsum
      } )
    } )
    .catch( err => {
      reject(err)
    } )
  } )
}

exports.invoice = function( amt, label, desc ) {
  var rpcRequest = {
    jsonrpc: "2.0",
    method : "invoice",
    params : [amt, label, desc],
    id : process.pid
  }

  return new Promise( (resolve,reject) => {
    doRPC( rpcRequest )
    .then( rsp => {
      resolve( rsp.bolt11 )
    } )
    .catch( err => {
      reject(err)
    } )
  } )
}

exports.invoiceStatus = function( bolt11str ) {
  var rpcRequest = {
    jsonrpc: "2.0",
    method : "listpays",
    params : [bolt11str],
    id : process.pid
  }

  return new Promise( (resolve,reject) => {
    doRPC( rpcRequest )
    .then( rsp => {
      let result = { totalmsat : 0, rspstatus : 'complete' }

      rsp.pays.forEach( pmnt => {
        if (pmnt.status === 'complete')
          result.totalmsat += pmnt.amount
        else
          result.rspstatus = pmnt.status
      } )

      resolve( result )
    } )
    .catch( err => {
      reject(err)
    } )
  } )
}

exports.listInvoices = function( label ) {
  var rpcRequest = {
    jsonrpc: "2.0",
    method : "listinvoices",
    params : ( (label != null) ? [label] : [] ),
    id : process.pid
  }

  return new Promise( (resolve,reject) => {
    doRPC( rpcRequest )
    .then( rsp => {
      resolve( rsp )
    } )
    .catch( err => {
      reject(err)
    } )
  } )
}

exports.smokeTest = async function() {
  let result = await exports.listInvoices()
  console.log( JSON.stringify(result,null,2) )
}

//exports.smokeTest()
