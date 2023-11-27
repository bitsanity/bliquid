//
// 1. Polls current rates in the background
// 2. Provides services for our webapps including:
//
//      a. Get the latest fetched cryptocurrency rates
//      b. Estimate fees for an order based on order parameters
//      c. Place an order and return its ID
//      d. Get order details given its ID (support, compliance)
//      e. Get details of all orders for a client receive address (compliance)

const fs = require( 'fs' )
const crypto = require( 'crypto' )
const ecies = require( 'eciesjs' )
const wss = require( 'ws' )

const readline = require( 'readline' ).createInterface( {
  input: process.stdin,
  output: process.stdout
} )

const bliquiddb = require( './bliquiddb.js' )

// hack to do #include file in node.js ... doesnt work with 'use strict'
// target is not a module because shared with browser environment
eval( fs.readFileSync('../common/BLDate.js').toString() )

const PORT = 8443
const MXPORT = 9000

const ACCESSLOG = './access.txt'
const SERVERLOG = './server.txt'
const RATESFILE = './feeds/rates.json'
const NETFEESFILE = './feeds/netfees.json'

var HELLOMSG = {
  jsonrpc: "2.0",
  method: "hello",
  params: [], // pubkey placed here on startup
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

function blackStrToRedObj( blackstr ) {
  let redobj

  try {
    let redstr = ecies.decrypt( privkey, blackstr )
    redobj = JSON.parse( redstr )
  } catch( pe ) { throw 'Invalid message' }

  return redobj
}

function redObjToBlackStr( clntpub, redobj ) {
  let redstr = JSON.stringify(redobj)
  return ecies.encrypt( clntpub, redstr )
}

// read from a local file that gets written periodically by some other process
var Rates = {}, NetworkFees = {}

function timestamp() {
  let now = new Date()

  let mon = now.getUTCMonth() + 1
  if (mon < 10) mon = '0' + mon
  let day = now.getUTCDate()
  if (day < 10) day = '0' + day
  let hr = now.getUTCHours()
  if (hr < 10) hr = '0' + hr
  let min = now.getUTCMinutes()
  if (min < 10) min = '0' + min

  return '' + now.getUTCFullYear() + mon + day + hr + min
}

function toCurrency(number) {
  let it = Number.parseFloat(number)
  return it.toLocaleString( 'en-US', { style: 'currency', currency: 'USD' } );
}

function toCAD( amt, curr ) {
  let result = amt

  if (curr === 'USD')
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.USDCAD)
  else if (curr == 'BTC')
    result = Number.parseFloat(amt) * Number.parseFloat(Rates.BTCCAD)
  else if (curr == 'ETH')
    result = Number.parseFloat(amt) * Number.parseFloat(Rates.ETHCAD)
  else if (curr == 'XMR')
    result = Number.parseFloat(amt) * Number.parseFloat(Rates.XMRCAD)
  else if (curr == 'USDC')
    result = Number.parseFloat(amt) * Number.parseFloat(Rates.USDCCAD)

  result = Math.floor(result * 100.0) / 100.0
  return result
}

function cadToCurr( amt, curr ) {
  let result = amt

  if (curr === 'CAD') {
    result = Math.floor( result * 100.0 ) / 100.0
  } else if (curr === 'USD') {
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.USDCAD)
    result = Math.floor( result * 100.0 ) / 100.0
  }
  else if (curr == 'BTC') {
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.BTCCAD)
    result = Math.floor( result * 100000000.0 ) / 100000000.0
  }
  else if (curr == 'ETH') {
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.ETHCAD)
    result = Math.floor( result * 1000000.0 ) / 1000000.0
  }
  else if (curr == 'XMR') {
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.XMRCAD)
    result = Math.floor( result * 1000000.0 ) / 1000000.0
  }
  else if (curr == 'USDC') {
    result = Number.parseFloat(amt) / Number.parseFloat(Rates.USDCCAD)
    result = Math.floor( result * 100.0 ) / 100.0
  }

  return result
}

function getNextRxAddress( curr ) {
  if (curr === 'BTC') return '1bitcoinaddresshere'
  if (curr === 'CAD') return 'admin@b-liquid.money'
  if (curr === 'ETH') return '0x0123456789abcdef0123456789abcdef01234567'
  if (curr === 'XMR') return
'888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkRxbANsAnjyPbb3iQ1YBRk1UXcdRsiKc9dhwMVgN5S9cQUiyoogDavup3H'
  if (curr === 'DAI') return '0xfedcba9876543210fedcba9876543210f00000000'
  if (curr === 'USD') return 'admin@b-liquid.money'
}

function calcFees( ctxAmount, ctxCurr, crxCurr, crxMethod ) {
  let resObj = {
    curr: "CAD",
    fees: {},
    total: 0.0
  }

  NetworkFees = JSON.parse( fs.readFileSync(NETFEESFILE) )

  let fee
  if (crxMethod === 'INTERAC') {
    fee = Number.parseFloat( NetworkFees["INTERACETransfer"] )
    resObj.fees["INTERAC e-Transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'CANADAPOST') {
    fee = Number.parseFloat( NetworkFees["CanadaPost"] )
    resObj.fees["Postage+Handling"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'ZELLE') {
    fee = Number.parseFloat( NetworkFees["ZELLETransfer"] )
    resObj.fees["ZELLE transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'WISE') {
    fee = Number.parseFloat( NetworkFees["WISETransfer"] )
    resObj.fees["WISE transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'SEPA') {
    fee = Number.parseFloat( NetworkFees["SEPATransfer"] )
    resObj.fees["SEPA transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'BTCMAINNET') {
    fee = Number.parseFloat( NetworkFees["BitcoinTransfer"] )
    resObj.fees["Bitcoin mining"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'BTCLIGHTNING') {
    fee = Number.parseFloat( NetworkFees["LightningTransfer"] )
    resObj.fees["Bitcoin lightning"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'ETHMAINNET') {
    fee = Number.parseFloat( NetworkFees["EthereumTransfer"] )
    resObj.fees["Ethereum transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'ETHPOLYGON') {
    fee = Number.parseFloat( NetworkFees["PolygonTransfer"] )
    resObj.fees["Polygon transfer"] = toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'XMRMAINNET') {
    fee = Number.parseFloat( NetworkFees["MoneroTransfer"] )
    resObj.fees["Monero mining"] = toCurrency( fee )
    resObj.total += fee
  }

  let ourFee = toCAD( ctxAmount, ctxCurr ) * 0.025
  if (ourFee < 3.0) ourFee = 3.0
  resObj.total += ourFee

  resObj.fees[bliquiddb.BLIQUIDFEENAME] = '' + toCurrency(ourFee)
  resObj.fees["PST+GST"] = toCurrency( "0.00" )
  resObj.total = Math.floor(resObj.total * 100) / 100

  return resObj
}

function errorResponse( errorCode, strErrorMessage, reqid ) {
  let response = JSON.parse( JSON.stringify(ERRORRESPONSE) )
  response.id = reqid
  response.error.code = errorCode
  response.error.message = strErrorMessage
  return response
}

function ratesResponse( reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  Rates = JSON.parse( fs.readFileSync(RATESFILE) )
  response.result = Rates;
  return response;
}

function addSaleResponse( clientip, reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )

  try {
    let order = reqparams[0]

    // TODO confirm caller isn't on a FINTRAC banned list

    if (!bliquiddb.isFinRegCheckOk( clientip, order.crxCoords) ) {
      throw '24hr violation by IP or receive address'
    }

    let pair =    (order.ctxCurr === 'CAD' || order.ctxCurr === 'USD')
                ? (order.crxCurr + order.ctxCurr)
                : (order.ctxCurr + order.crxCurr)

    Rates = JSON.parse( fs.readFileSync(RATESFILE) )
    let currentRate = Number.parseFloat( Rates[pair] )
    let cadAmt = toCAD( order.ctxAmount, order.ctxCurr )
    if (cadAmt >= 1000) throw 'orders must be less than CA$1000.00'

    let fees = calcFees( order.ctxAmount, order.ctxCurr, order.crxCurr )
    let toClientCad = cadAmt - fees.total
    order.crxAmount = cadToCurr( toClientCad, order.crxCurr )

    // confirm we have enough float on hand to settle
    let available = bliquiddb.inventory( order.channel )

    if (    !available[order.crxCurr]
         || available[order.crxCurr] <= order.crxAmount ) {
      throw 'order amount exceeds available float'
    }

    let ourRxAddr = getNextRxAddress( order.ctxCurr )

    let saleId = bliquiddb.addSale(
      order.channel,
      clientip,
      currentRate,
      order.ctxMethod,
      ourRxAddr,
      order.ctxAmount,
      order.ctxCurr,
      fees,
      order.crxAmount,
      order.crxCurr,
      order.crxCoords )

    response.id = reqid
    response.result = { "ID" : saleId }
  }
  catch( e ) {
    console.log( e )
    return errorResponse( 400, e.toString(), reqid )
  }

  return response;
}

// params[0] = ctxAmount
// params[1] = ctxCurr
// params[2] = crxCurr
function feesResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid

  let cadAmt = toCAD( reqparams[0], reqparams[1] )
  if (cadAmt >= 1000.0)
    throw 'Deals must be less than $1000.00 CAD'

  response.result = calcFees( reqparams[0], reqparams[1], reqparams[2] )

  return response;
}

function ctxInstrResponse( reqparams, reqid ) {
  let saleid = reqparams[0]
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid

  let sale = bliquiddb.getSale( saleid )

  if (!sale) throw ('Invalid Order Reference: ' + saleid)
  if (sale.Cancelled) throw ('Sale ' + saleid + ' was cancelled.')
  if (sale.CtxReceived) throw ('Sale ' + saleid + ' payment received.')
  if (sale.CrxSent) throw ('Sale ' + saleid + ' settlement payment sent.')

  response.result = {
    Submitted : sale.Submitted,
    CtxAmount : sale.CtxAmount,
    CtxCurr : sale.CtxCurr,
    OurRxAddr : sale.OurRxAddr,
    Rate : sale.Rate,
    Fees : sale.Fees,
    CrxAmount : sale.CrxAmount,
    CrxCurr : sale.CrxCurr,
    CrxCoords : sale.CrxCoords,
    CrxAddr : sale.CrxAddr
  }

  return response
}

function saleStatusResponse( reqparams, reqid ) {
  let saleid = reqparams[0]
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid

  let sale = bliquiddb.getSale( saleid )
  if (!sale) throw ( 'Invalid Order Reference: ' + saleid )
  if (sale.Cancelled) throw ( 'Sale ' + saleid + ' was cancelled.' )

  response.result = {
    Submitted : sale.Submitted,
    Cancelled : sale.Cancelled,
    CtxReceived : sale.CtxReceived,
    CrxSent : sale.CrxSent
  }

  return response
}

// technical/system status
function mxStatusResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid

  // latest feed updates
  let rates = JSON.parse( fs.readFileSync(RATESFILE) )
  let netFees = JSON.parse( fs.readFileSync(NETFEESFILE) )

  response.result = {
    ratesUpdated : rates.timestamp,
    feesUpdated : netFees.timestamp,
    latestSale : bliquiddb.latestSaleTime(),
    latestCtxTime : bliquiddb.latestCtxTime(),
    latestCrxTime : bliquiddb.latestCrxTime(),
    latestPurchaseTime : bliquiddb.latestPurchaseTime(),
    latestLossTime : bliquiddb.latestLossTime()
  }

  return response
}

function mxSaleResponse( reqparams, reqid ) {
  let saleid = reqparams[0]
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.getSale( saleid )
  if (!response.result) throw ('Invalid Order Reference: ' + saleid)
  return response
}

function mxCRXsResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.pendingSettlements( reqparams[0] )
  return response
}

function mxCTXsResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.waitingPayments( reqparams[0] )
  return response
}

function mxInventoryResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.inventory( reqparams[0] )
  return response
}

function mxAddPurchaseResponse(reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.addPurchase(
    reqparams[0],
    reqparams[1],
    reqparams[2],
    reqparams[3],
    reqparams[4],
    reqparams[5] )
  return response
}

function mxAddLossResponse(reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.addLoss(
    reqparams[0],
    reqparams[1],
    reqparams[2],
    reqparams[3],
    reqparams[4] )
  return response
}

function mxAddNoteResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.addNote(
    reqparams[0],
    reqparams[1],
    reqparams[2],
    reqparams[3] )
  return response
}

function mxAddSARResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.addSAR(
    reqparams[0],
    reqparams[1],
    reqparams[2],
    reqparams[3] )
  return response
}

function mxCTXReceivedResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.ctxReceived( reqparams[0], reqparams[1] )
  return response
}

function mxCRXSentResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result =
    bliquiddb.crxSent( reqparams[0], reqparams[1], reqparams[2] )
  return response
}

function mxNotesResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.getNotes( reqparams[0] )
  return response
}

function mxSARsResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result = bliquiddb.getSARs( reqparams[0] )
  return response
}

function mxSalesResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result =
    bliquiddb.getSales( reqparams[0], reqparams[1], reqparams[2] )
  return response
}

function mxPNLResponse( reqparams, reqid ) {
  let response = JSON.parse( JSON.stringify(BLANKRESPONSE) )
  response.id = reqid
  response.result =
    bliquiddb.calcPnL( reqparams[0], reqparams[1], reqparams[2], reqparams[3] )
  return response
}

function log( whichlog, msg ) {
  if (whichlog)
    whichlog.write( timestamp() + ' ' + msg )
  else
    console.log( timestamp() + ' ' + msg )
}

function getGatewayPubkey() {
  if (gwpubkey) return

  let socket = new wss.WebSocket( gwurl )

  socket.addEventListener( 'message', msg => {
    console.log( msg.data )
    let rsp = JSON.parse( msg.data )
    if (rsp.error) {
      log( null, 'gateway error: ' + rsp.error.message )
      return
    }
    if (rsp.method && rsp.method === 'hello') {
      gwpubkey = rsp.params[0]
      log( null, 'gateway pubkey: ' + rsp.params[0] )
    }
  } )
}

var accessLog = fs.createWriteStream( ACCESSLOG, { flags: 'a' } )
var serverLog = fs.createWriteStream( SERVERLOG, { flags: 'a' } )

var privkey = null
var gwurl = null
var gwpubkey = null

readline.question( '\nwss (my) privkey: ', (pk) => {
  try {
    privkey = ecies.PrivateKey.fromHex( pk )
    HELLOMSG.params = [ privkey.publicKey.toHex() ]
    log( null, 'my pubkey: ' + privkey.publicKey.toHex() )

    readline.question( '\ndbpassword: ', (pass) => {
      let dbpass = Buffer.from( pass )
      let hashpass = crypto.createHash('sha256').update(dbpass).digest()
      bliquiddb.init( hashpass )

      readline.question( '\nGateway URL: ', (url) => {
        gwurl = url
        getGatewayPubkey()
      } )
    } )
  }
  catch( e ) {
    log( null, e )
    process.exit( 1 )
  }
} )

const wsServer = new wss.Server( {
  port: PORT
} )

wsServer.on( 'connection', (ws, req) => {
  let clientip = req.socket.remoteAddress
  log( accessLog, clientip + '\n' )

  ws.send( HELLOMSG )

  ws.on( 'message', data => {
    try {
      let req
      try {
        req = JSON.parse( data )
      } catch( pe ) {
        throw 'JSON text required'
      }

      if (    !req.jsonrpc
           || req.jsonrpc !== "2.0"
           || !req.method
           || !req.params ) {
        throw ('Must be JSON-RPC 2.0 request');
      }

      if (req.method == 'rates')
        ws.send( JSON.stringify(ratesResponse(req.id)) )
      else if (req.method == 'fees')
        ws.send( JSON.stringify(feesResponse(req.params,req.id)) )
      else if (req.method == 'sale')
        ws.send( JSON.stringify(addSaleResponse(clientip, req.params, req.id)) )
      else if (req.method == 'ctxInstr')
        ws.send( JSON.stringify( ctxInstrResponse(req.params,req.id)) )
      else if (req.method == 'status')
        ws.send( JSON.stringify( saleStatusResponse(req.params,req.id)) )
      else
        ws.send(
          JSON.stringify( errorResponse(400, 'method not found', req.id)) )
    }
    catch( e ) {
      ws.send( JSON.stringify(errorResponse(500,e.toString())) )
    }
  } )

  ws.onerror = () => {
    log( serverLog, 'socket error' )
  }
} )

const wsMXServer = new wss.Server( {
  port: MXPORT
} )

wsMXServer.on( 'connection', (ws, req) => {
  ws.on( 'message', data => {
    log( serverLog, data )
    try {
      let req
      try {
        req = JSON.parse( data )
      } catch( pe ) {
        throw 'mx JSON text required'
      }

      if (    !req.jsonrpc
           || req.jsonrpc !== "2.0"
           || !req.method
           || !req.params ) {
        throw ('Must be JSON-RPC 2.0 mx request');
      }

      if (req.method == 'mxstatus')
        ws.send( JSON.stringify(mxStatusResponse(req.params,req.id)) )
      else if (req.method == 'mxsale')
        ws.send( JSON.stringify(mxSaleResponse(req.params,req.id)) )
      else if (req.method == 'mxcrxs')
        ws.send( JSON.stringify( mxCRXsResponse(req.params, req.id )) )
      else if (req.method == 'mxctxs')
        ws.send( JSON.stringify( mxCTXsResponse(req.params, req.id )) )
      else if (req.method == 'mxinventory')
        ws.send( JSON.stringify( mxInventoryResponse(req.params, req.id )) )
      else if (req.method == 'mxaddpurchase')
        ws.send( JSON.stringify( mxAddPurchaseResponse(req.params, req.id )) )
      else if (req.method == 'mxaddloss')
        ws.send( JSON.stringify( mxAddLossResponse(req.params, req.id )) )
      else if (req.method == 'mxaddnote')
        ws.send( JSON.stringify( mxAddNoteResponse(req.params, req.id )) )
      else if (req.method == 'mxaddsar')
        ws.send( JSON.stringify( mxAddSARResponse(req.params, req.id )) )
      else if (req.method == 'mxctxrcvd')
        ws.send( JSON.stringify( mxCTXReceivedResponse(req.params, req.id )) )
      else if (req.method == 'mxcrxsent')
        ws.send( JSON.stringify( mxCRXSentResponse(req.params, req.id )) )
      else if (req.method == 'mxnotes')
        ws.send( JSON.stringify( mxNotesResponse(req.params, req.id )) )
      else if (req.method == 'mxsars')
        ws.send( JSON.stringify( mxSARsResponse(req.params, req.id )) )
      else if (req.method == 'mxsales')
        ws.send( JSON.stringify( mxSalesResponse(req.params, req.id )) )
      else if (req.method == 'mxpnl')
        ws.send( JSON.stringify( mxPNLResponse(req.params, req.id )) )
      else
        ws.send(
          JSON.stringify( errorResponse(400, 'mx method not found', req.id)) )
    }
    catch( e ) {
      ws.send( JSON.stringify(errorResponse(500,e.toString())) )
    }
  } )

  ws.onerror = () => {
    log( serverLog, 'mx socket error' )
  }
} )

