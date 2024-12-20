const fs = require( 'fs' )
const wss = require( 'ws' )
const crypto = require( 'crypto' )
const acl = require( './acl.js' )
const bitcoin = require( './bitcoind.js' )
const ethereum = require( './ethereum.js' )
const ecjson = require( './ecjsonrpc.js' )
const rates = require( './rates.js' )
const bldate = require( './bldate.js' )
const bliquiddb = require( './bliquiddb.js' )

const readline = require( 'readline' ).createInterface( {
  input: process.stdin,
  output: process.stdout
} )

const PORT = 8888
const SERVERLOG = './gateway.txt'

var mylog = fs.createWriteStream( SERVERLOG, {flags:'a'} )
var privkey = null
var dbpassword = null

function log( errstr ) {
  mylog.write( bldate.timestamp() + ' ' + errstr + '\n' )
  console.log( errstr )
}

function redError( code, exstr ) {
  log( 'redError: ' + code + ' ' + exstr )
  return ecjson.makeErrorObj( code, exstr, 0 )
}

function blackError( code, exstr, cid, txprivkey, rxpubkey ) {
  let errobj = ecjson.makeErrorObj( code, exstr, cid )
  let result
  try {
    result = ecjson.redToBlack( txprivkey, rxpubkey, errobj )
  }
  catch (ex) {
    result = null
  }
  return result
}

function blackResponse( txprivkeyhex, rxpubkeyhex, cid, redobj ) {
  let result

  let redrsp = JSON.parse( JSON.stringify(ecjson.RESPONSE) )
  try {
    redrsp.result = redobj
    redrsp.id = cid
    result = ecjson.redToBlack( txprivkeyhex, rxpubkeyhex, redrsp )
  }
  catch( ex ) {
    log( ex.toString() )
    result = null
  }
  return result
}

function calcFees( ctxAmount, ctxCurr, crxCurr, crxMethod ) {

  let resObj = {
    curr: "CAD",
    fees: {},
    total: 0.0
  }

  let fee
  if (crxMethod === 'INTERAC') {
    fee = 1.50
    resObj.fees["INTERAC e-Transfer"] = rates.toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'CANADAPOST') {
    fee = 3.50
    resObj.fees["Postage+Handling"] = rates.toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'BTCMAINNET') {
    fee = bitcoin.getFee() * rates.getRates().bitcoin.cad
    resObj.fees["Bitcoin mining"] = rates.toCurrency( fee )
    resObj.total += fee
  }

  if (crxMethod === 'BTCLIGHTNING') {
    fee = 0.05
    resObj.fees["Bitcoin lightning"] = rates.toCurrency( fee )
    resObj.total += fee
  }

  let valueincad = rates.toCAD( ctxAmount, ctxCurr )
  let ourFee = Number.parseFloat(valueincad) * 0.015
  if (ourFee < 3.0) ourFee = 3.0
  resObj.total += ourFee

  resObj.fees[bliquiddb.BLIQUIDFEENAME] = '' + rates.toCurrency(ourFee)
  resObj.fees["PST+GST"] = rates.toCurrency( "0.00" )
  resObj.total = Math.floor(resObj.total * 100) / 100

  return resObj
}

function getNextRxAddress( label, curr ) {

  return new Promise( (resolve,reject) => {

    if (curr === 'BTC') {
      bitcoin.nextAddress( label )
      .then( res => {
        resolve( res )
      } )
      .catch( reject )
    }
    else if (curr === 'CAD')
      resolve( 'admin@b-liquid.money' )
    else
      reject( 'invalid curr: ' + curr )
  } )
}

async function newSale( clientip, order ) {

  let available = bliquiddb.inventory( order.channel )
  if (    !available[order.crxCurr]
       || available[order.crxCurr] <= order.crxAmount ) {
    throw 'order of ' + order.crxAmount + ' ' +
          order.crxCurr + ' exceeds available float'
  }

  // TODO confirm client ip and crx address are not on some banned list

  if (!bliquiddb.isFinRegCheckOk( clientip, order.crxCoords) ) {
    throw '24hr violation by IP or receive address'
  }

  let fees =
    calcFees( order.ctxAmount, order.ctxCurr, order.crxCurr, order.crxMethod )

  let cadAmt = rates.toCAD( order.ctxAmount, order.ctxCurr )
  if (cadAmt >= 1000.0) throw 'orders must be less than CA$1000.00'

  let toClientCad = cadAmt - fees.total
  order.crxAmount = rates.cadToCurr( toClientCad, order.crxCurr )

  let ourRxAddr = await getNextRxAddress( '', order.ctxCurr )
  if (!ourRxAddr) throw 'failed to create a receive address'

  let rateInEffect =
    Number.parseFloat(order.crxAmount) / Number.parseFloat(order.ctxAmount )

  let saleId = bliquiddb.addSale(
    order.channel,
    clientip,
    rateInEffect,
    order.ctxMethod,
    ourRxAddr,
    order.ctxAmount,
    order.ctxCurr,
    fees,
    order.crxAmount,
    order.crxCurr,
    order.crxCoords )

  if (order.ctxCurr === 'BTC') bitcoin.labelAddress( ourRxAddr, saleId )

  return { "ID" : saleId }
}

// ====
// MAIN
// ====

log( 'start' )

const wsServer = new wss.Server( {
  port: PORT
} )

wsServer.on( 'connection', (ws, req) => {

  let clientip = req.socket.remoteAddress
  let sessionkey = ecjson.makeKey()
  let redhello = ecjson.makeRedHello( sessionkey.pub )
  ws.send( JSON.stringify(redhello) )
  log( 'connection from ' + clientip )

  ws.on( 'message', async function(blackstr) {

    let blackobj, redobj
    try {
      blackobj = JSON.parse( blackstr.toString() )
      if (blackobj == null || !ecjson.isBlackMsg(blackobj))
        throw 'Bad Request: not a valid black message'

      // ensure blackobj.spkhex is a recognized client
      console.log( 'spkhex: ' + blackobj.spkhex )
      if (!acl.isEnabled(blackobj.spkhex)) throw 'not allowed'

      redobj = ecjson.blackToRed( sessionkey.prv, blackobj )
      if (!ecjson.isJSONRPC(redobj))
        throw 'Bad Request: not valid JSON-RPC 2.0'
    }
    catch( ex )
    {
      log( ex.toString() )
      ws.send( JSON.stringify(redError(400, ex.toString(), 0)) )
      ws.close()
      return
    }

    log( 'red request: ' + JSON.stringify(redobj) )

    let resobj
    try {
      // --------------------------
      // Public webserver functions
      // --------------------------

      if (redobj.method === 'rates') {
        resobj = rates.getRates()
      } else if (redobj.method === 'btc.balance') {
        resobj = await bitcoin.balance( redobj.params[0] )
      } else if (redobj.method === 'btc.fee') {
        resobj = bitcoin.getFee()
      } else if (redobj.method === 'fees') {
        let reqobj = redobj.params[0]
        resobj = calcFees(
          reqobj.ctxAmount,
          reqobj.ctxCurr,
          reqobj.crxCurr,
          reqobj.crxMethod
        )
      } else if (redobj.method === 'eth.epkscan') {
        resobj = await ethereum.ethEpkScan( redobj.params[0] )
      } else if (redobj.method === 'eth.balances') {
        resobj = await ethereum.ethBalances( redobj.params )
      } else if (redobj.method === 'book') {
        resobj = await newSale( clientip, redobj.params[0] )
      } else if (redobj.method === 'orderstatus') {
        resobj = bliquiddb.getSale( redobj.params[0].orderId )
      } else {
        if (!acl.isAdmin(blackobj.spkhex)) throw 'must be admin'
      }

      // --------------------------------------------
      // Functions for which caller must be an admin
      // --------------------------------------------

      if (redobj.method === 'mxctxs') {
        resobj = bliquiddb.waitingPayments( redobj.params[0] )
      }
      else if (redobj.method === 'mxcrxs') {
        resobj = bliquiddb.pendingSettlements( redobj.params[0] )
      }
      else if (redobj.method === 'mxinventory') {
        resobj = bliquiddb.inventory( redobj.params[0] )
      }
      else if (redobj.method === 'mxaddpurchase') {
        resobj = bliquiddb.addPurchase(
          redobj.params[0].toChan,
          redobj.params[0].amount,
          redobj.params[0].currency,
          redobj.params[0].rate,
          redobj.params[0].fees,
          redobj.params[0].source,
          redobj.params[0].ref )
      }
      else if (redobj.method === 'mxgetpurchases') {
        resobj = bliquiddb.getPurchases(
          redobj.params[0].fromtime,
          redobj.params[0].totime,
          redobj.params[0].channel,
          redobj.params[0].curr )
      }
      else if (redobj.method === 'mxaddloss') {
        resobj = bliquiddb.addLoss(
          redobj.params[0].channel,
          redobj.params[0].amount,
          redobj.params[0].currency,
          redobj.params[0].rate,
          redobj.params[0].ref )
      }
      else if (redobj.method === 'mxgetlosses') {
        resobj = bliquiddb.getLosses(
          redobj.params[0].fromDatetime,
          redobj.params[0].toDatetime,
          redobj.params[0].channel,
          redobj.params[0].currency )
      }
      else if (redobj.method === 'mxaddnote') {
        resobj = bliquiddb.addNote(
          redobj.params[0].saleId,
          redobj.params[0].message,
          redobj.params[0].source,
          redobj.params[0].isclientvisible )
      }
      else if (redobj.method === 'mxgetnotes') {
        resobj = bliquiddb.getNotes( redobj.params[0] )
      }
      else if (redobj.method === 'mxaddsar') {
        resobj = bliquiddb.addSAR(
          redobj.params[0].saleId,
          redobj.params[0].reason,
          redobj.params[0].ourref,
          redobj.params[0].fintracref )
      }
      else if (redobj.method === 'mxgetsars') {
        resobj = bliquiddb.getSARs( redobj.params[0] )
      }
      else if (redobj.method === 'mxctxreceived') {
        resobj = bliquiddb.ctxReceived(
          redobj.params[0].saleId,
          redobj.params[0].ctxRef )
      }
      else if (redobj.method === 'mxcrxsent') {
        resobj = bliquiddb.crxSent(
          redobj.params[0].saleId,
          redobj.params[0].crxRef,
          redobj.params[0].feesCAD,
          redobj.params[0].xmrViewKey )
      }
      else if (redobj.method === 'mxgetsales') {
        resobj = bliquiddb.getSales(
          redobj.params[0].channel,
          redobj.params[0].fromDatetime,
          redobj.params[0].toDatetime
        )
      }
      else if (redobj.method === 'mxcalcpnl') {
        resobj = bliquiddb.calcPnL(
          redobj.params[0].channel,
          redobj.params[0].currency,
          redobj.params[0].fromDatetime,
          redobj.params[0].toDatetime )
      }
      else {
        resobj = 'unrecognized method: ' + redobj.method
      }
    }
    catch( ex ) {
      ws.send( JSON.stringify(blackError(
        400,
        'gateway: ' + ex.toString(),
        redobj.id,
        sessionkey.prv,
        blackobj.spkhex)) )
      ws.close()
      return
    }

    log( 'red response: ' + JSON.stringify(resobj) )

    if (resobj != null) {
      ws.send( JSON.stringify(blackResponse(
        sessionkey.prv, blackobj.spkhex, redobj.id, resobj)) )
    }
    else {
      ws.send( JSON.stringify(blackError(
        500,
        'gateway problem',
        redobj.id,
        sessionkey.prv,
        blackobj.spkhex))
      )
      ws.close()
      return
    }
  } )

  ws.on( 'error', (err) => {
    log( 'socket error: ' + err )
  } )
} )

ethereum.syncEpks()
//setInterval( ethereum.syncEpks, 3600000 )

rates.fetchRates()
//setInterval( rates.fetchRates, 3600000 )

bitcoin.fetchFee()
//setInterval( bitcoin.fetchFee, 1800000 )

readline.question( 'db password: ', (pass) => {
  try {
    let dbpass = Buffer.from( pass )
    let hashpass = crypto.createHash('sha256').update(dbpass).digest()
    bliquiddb.init( hashpass )
    readline.close()
  }
  catch( e ) {
    log( e )
    process.exit( 1 )
  }
} )

