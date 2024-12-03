const fs = require( 'fs' )
const loki = require( 'lokijs' )
const blefa = require( './blefa.js' )
const crypto = require( 'crypto' )

const FULLDAYMS = 1000 * 60 * 60 * 24

var BLDB

function initCollection( name ) {
  let coll = BLDB.getCollection( name )
  if (null == coll) {
    BLDB.addCollection( name )
  }
  return coll
}

function bldbInitialize() {
  initCollection( "BANNED" )
  initCollection( "LOSSES" )
  initCollection( "NOTES" )
  initCollection( "PURCHASES" )
  initCollection( "SALES" )
  initCollection( "SARS" )
}

module.exports.BLIQUIDFEENAME = "B-Liquid fee"

module.exports.init = function( aeskeybytes ) {
  blefa.setAESKey( aeskeybytes )

  BLDB = new loki( 'bliquiddb', {
    autoload : true,
    autoloadCallback : bldbInitialize,
    autosave : true,
    autosaveInterval: 10000,
    adapter : blefa
  } )
}

module.exports.addLoss = function( fromChan, amt, curr, rate, ref ) {
  let loss = {
    When : Date.now(),
    Channel : fromChan,
    Amount : amt,
    Curr : curr,
    Rate : rate,
    Ref : ref
  }
  BLDB.getCollection('LOSSES').insert( loss )
  return { When: loss.When }
}

module.exports.getLosses = function( fromDatetime, toDatetime, channel, curr ) {
  return BLDB.getCollection('LOSSES')
        .chain()
        .find( { 
          '$and' : [
            { 'When' : { '$gte' : fromDatetime } },
            { 'When' : { '$lt' : toDatetime } },
            { 'Channel' : { '$eq' : channel } },
            { 'Curr' : { '$eq' : curr } }
          ]
        } )
        .simplesort('When')
        .data()
}

module.exports.addNote = function(
  saleid, message, source, isclientvisible=false ) {

  let sale = module.exports.getSale( saleid )
  if (!sale) throw 'No sale found with that saleid'

  let note = {
    SaleID : saleid,
    Message : message,
    Created : Date.now(),
    Source : source,
    ClientVisible : isclientvisible
  }
  BLDB.getCollection('NOTES').insert( note )
  return { Created: note.Created }
}

module.exports.getNotes = function( saleid ) {
  return BLDB.getCollection('NOTES')
             .chain()
             .find( { SaleID : saleid } )
             .simplesort('Created')
             .data()
}

module.exports.addPurchase =
  function( toChan, amt, curr, rate, fees, psource, pref ) {

  let purch = {
    Added : Date.now(),
    Channel : toChan,
    Amount : amt,
    Curr : curr,
    Rate : rate,
    Fees : fees,
    Source : psource,
    Ref : pref
  }
  BLDB.getCollection('PURCHASES').insert( purch )

  return { Added : purch.Added }
}

module.exports.getPurchases = function(
  fromDatetime, toDatetime, channel, curr ) {

  return BLDB.getCollection('PURCHASES')
             .chain()
             .find( { 
               '$and' : [
                 { 'Channel' : { '$eq' : channel } },
                 { 'Curr' : { '$eq' : curr } },
                 { 'Added' : { '$gte' : fromDatetime } },
                 { 'Added' : { '$lt' : toDatetime } }
               ]
             } )
             .simplesort( 'Added' )
             .data()
}

module.exports.addSale = function(
  chan, clientip, rate, ctxMethod, ourRxAddr,
  ctxamt, ctxcurr, fees, crxamt, crxcurr, crxCoords ) {

  let sale = null, giveup = 0, id
  while (giveup++ < 3) {
    let rndbuff = crypto.randomBytes( 8 )
    id = rndbuff.toString( 'hex' )
    sale = module.exports.getSale( id )
    if (!sale || sale.length == 0)
      break
  }

  let entry = {
    ID : id,
    Channel : chan,
    Submitted : Date.now(),
    Cancelled : 0,
    ClientIP : clientip,
    Rate : rate,
    CtxMethod : ctxMethod,
    OurRxAddr : ourRxAddr,
    CtxAmount : ctxamt,
    CtxCurr : ctxcurr,
    Fees : fees,
    CtxReceived : 0,
    CtxRef : "TBD",
    CrxAmount : crxamt,
    CrxCurr : crxcurr,
    CrxCoords : crxCoords,
    CrxSent : 0,
    CrxFeePaid : 0,
    XMRViewKey : "TBD",
    CrxRef : "TBD"
  }

  BLDB.getCollection('SALES').insert( entry )
  console.log( 'added sale: ' + JSON.stringify(entry) )
  return id
}

module.exports.isFinRegCheckOk = function( clientip, crxAddress ) {

  let now = Date.now()
  let from24Hr = Date.now() - FULLDAYMS

  let last24 = BLDB.getCollection('SALES')
                   .chain()
                   .find( { '$and' : [
                              {'Cancelled' : { '$eq' : 0 }},
                              {'CtxReceived' : { '$gt' : 0 }},
                              {'Submitted' : { '$gt' : from24Hr } },
                              {'Submitted' : { '$lt' : now }}
                            ]
                          } )
                   .simplesort('Submitted')
                   .data()

  let sum = 0.0

  if (last24) {
    last24.forEach( sale => {

      if (    sale.ClientIP === clientip
           || sale.CrxCoords === crxAddress ) {
        sum += sale.CtxAmount / sale.Rate
        console.log( 'added: ' + (sale.CtxAmount / sale.Rate) + ' to sum' )
      }
    } )
  }

  if (sum >= 1000.00)
    return false

  return true
}

module.exports.getSale = function( id ) {
  let rset = BLDB.getCollection('SALES').find( {'ID': {'$eq' : id}} )
  if (rset.length != 1) return null
  return rset[0]
}

module.exports.getSales = function( chan, from, to ) {
  if (!to) to = Date.now()

  let result = BLDB.getCollection('SALES')
                   .chain()
                   .find( { '$and' : [
                              {'Channel' : { '$eq' : chan }},
                              {'Cancelled' : { '$eq' : 0 }},
                              {'Submitted' : { '$gte' : from }},
                              {'Submitted' : { '$lte' : to }}
                            ]
                          } )
                   .simplesort('Submitted')
                   .data()

  return result
}

module.exports.updateSaleOurRxAddress = function( id, ourAddr ) {
  let sale = module.exports.getSale( id )
  if (!sale) throw 'invalid sale id: ' + id
  sale.OurRxAddr = ourAddr
  BLDB.getCollection('SALES').update( sale )
}

module.exports.cancelSale = function( id ) {
  let sale = module.exports.getSale( id )
  if (!sale) throw 'invalid sale id'
  sale.Cancelled = Date.now()
  BLDB.getCollection('SALES').update( sale )
}

module.exports.ctxReceived = function( saleid, ctxref ) {
  let sale = module.exports.getSale( saleid )
  if (!sale) throw 'invalid saleid'
  if (sale.CtxReceived != 0) throw 'Client payment already received'
  sale.CtxReceived = Date.now()
  sale.CtxRef = ctxref
  BLDB.getCollection('SALES').update( sale )
  return { 'Received' : sale.CtxReceived }
}

module.exports.crxSent = function( saleid, crxref, feepaidcad, xmrviewkey="" ) {
  let sale = module.exports.getSale( saleid )
  if (!sale) throw 'invalid saleid'
  if (sale.CrxSent != 0) throw 'Settlement already sent'
  sale.CrxSent = Date.now()
  sale.CrxRef = crxref
  sale.CrxFeePaid = feepaidcad
  sale.XMRViewKey = xmrviewkey
  BLDB.getCollection('SALES').update( sale )
  return { 'Sent' : sale.CrxSent }
}

module.exports.addSAR = function( saleid, reason, ourref, fintracref ) {
  let sale = module.exports.getSale( saleid )
  if (!sale) throw 'invalid sale id'

  let sar = {
    SaleID : saleid,
    Logged : Date.now(),
    Reason : reason,
    OurRef : ourref,
    FINTRACRef : fintracref
  }

  BLDB.getCollection('SARS').insert( sar )
  return { Logged : sar.Logged }
}

module.exports.getSARs = function( saleid ) {
  return BLDB.getCollection('SARS')
             .chain()
             .find( { SaleID : { '$eq' : saleid } } )
             .simplesort('Logged')
             .data()
}

module.exports.latestSaleTime = function() {
  let ar = BLDB.getCollection('SALES')
               .chain()
               .simplesort( 'Submitted' )
               .data()
  if (ar && ar[0])
    return ar.Submitted
  return 0
}

module.exports.latestCtxTime = function() {
  let ar = BLDB.getCollection('SALES')
               .chain()
               .simplesort( 'CtxReceived' )
               .data()
  if (ar && ar[0])
    return ar.CtxReceived
  return 0
}

module.exports.latestCrxTime = function() {
  let ar = BLDB.getCollection('SALES')
               .chain()
               .simplesort( 'CrxSent' )
               .data()
  if (ar && ar[0])
    return ar.CrxSent
  return 0
}

module.exports.latestPurchaseTime = function() {
  let ar = BLDB.getCollection('PURCHASES')
               .chain()
               .simplesort( 'Added' )
               .data()
  if (ar && ar[0])
    return ar[0].Added
  return 0
}

module.exports.latestLossTime = function() {
  let ar = BLDB.getCollection('LOSSES')
               .chain()
               .simplesort( 'When' )
               .data()
  if (ar && ar[0])
    return ar[0].When
  return 0
}

module.exports.pendingSettlements = function( chan ) {
  return BLDB.getCollection('SALES')
             .chain()
             .find( { 
               '$and' : [
                 { 'CrxSent' : { '$eq' : 0 } },
                 { 'CtxReceived' : { '$ne' : 0 } },
                 { 'Cancelled' : { '$eq' : 0 } },
                 { 'Channel' : { '$eq' : chan } }
               ]
             } )
             .simplesort( 'Submitted' )
             .data()
}

module.exports.waitingPayments = function( chan ) {
  return BLDB.getCollection('SALES')
             .chain()
             .find( { 
               '$and' : [
                 { 'CtxReceived' : { '$eq' : 0 } },
                 { 'Cancelled' : { '$eq' : 0 } },
                 { 'Channel' : { '$eq' : chan } }
               ]
             } )
             .simplesort( 'Submitted' )
             .data()
}

// Inventory (I) for given channel
//
// Σ(PURCHASES) - Σ(LOSSES) + Σ(SALES.CTX) - Σ(SALES.CRX)

module.exports.inventory = function( chan ) {
  let sums = {}

  let pu = BLDB.getCollection('PURCHASES')
               .chain()
               .find( { Channel : { '$eq' : chan } } )
               .data()

  pu.forEach( purch => {
    if (!sums[purch.Curr]) sums[purch.Curr] = 0.0
    sums[purch.Curr] += Number.parseFloat(purch.Amount)
  } )

  let lo = BLDB.getCollection('LOSSES')
               .chain()
               .find( { Channel : { '$eq' : chan } } )
               .data()

  lo.forEach( loss => {
    sums[loss.Curr] -= Number.parseFloat(loss.Amount)
  } )

  let ins = BLDB.getCollection('SALES')
                .chain()
                .find( {
                  '$and' : [
                    { Channel : { '$eq' : chan } },
                    { Cancelled : { '$eq' : 0 } },
                    { CtxReceived : { '$ne' : 0 } }
                  ]
                } )
                .data()

  ins.forEach( sale => {
    sums[sale.CtxCurr] += Number.parseFloat(sale.CtxAmount)
  } )

  let outs = BLDB.getCollection('SALES')
                 .chain()
                 .find( {
                   '$and' : [
                     { Channel : { '$eq' : chan } },
                     { CrxSent : { '$ne' : 0 } }
                   ]
                 } )
                 .data()

  outs.forEach( sale => {
    sums[sale.CrxCurr] -= Number.parseFloat(sale.CrxAmount)
  } )

  console.log( 'inventory: returning ' + JSON.stringify(sums) )
  return sums
}

module.exports.calcPnL = function( chan, curr, fromst=0, tost=Date.now() )
{
  let ins = [],
      outs = [],
      sumGains = 0.0,
      sumOurFees = 0.0,
      sumFeesPaid = 0.0

  let purchases = BLDB.getCollection('PURCHASES')
                 .chain()
                 .find( {
                   '$and' : [
                     { Channel : { '$eq' : chan } },
                     { Curr : { '$eq' : curr } },
                     { Added : { '$gte' : fromst } },
                     { Added : { '$lt' : tost } },
                   ]
                 } )
                 .data()

  purchases.forEach( pu => {
    let cadequiv =
      Math.floor(Number.parseFloat(pu.Amount) *
                 Number.parseFloat(pu.Rate) * 100) / 100

    let it = {
      Timestamp : pu.Added,
      Amount : pu.Amount,
      Rate : pu.Rate,
      CADEquivAmt : cadequiv
    }

    ins.push( it )
    sumFeesPaid += Number.parseFloat( pu.Fees ) // in CAD
  } )

  let sales = BLDB.getCollection('SALES')
                  .chain()
                  .find( {
                    '$and' : [
                      { Channel : { '$eq' : chan } },
                      { '$or' : [ {CtxCurr : { '$eq' : curr } },
                                  {CrxCurr : { '$eq' : curr } }
                                ] },
                      { Submitted : { '$gte' : fromst } },
                      { Submitted : { '$lt' : tost } },
                      { Cancelled : { '$eq' : 0} },
                      { CtxReceived : { '$ne' : 0} },
                      { CrxSent : { '$ne' : 0} },
                    ]
                  } )
                  .data()

  sales.forEach( sa => {
    // client is transmitting fiat and receiving $curr
    if (sa.CtxCurr === 'CAD') {

      // note: rate is CADBTC not BTCCAD
      let cadout =
        Math.floor(   100.0 * 
                      Number.parseFloat(sa.CrxAmount)
                    / Number.parseFloat(sa.Rate) ) / 100.0
        - Number.parseFloat(sa.Fees.total)

      let it = {
        Type : "SALE",
        Timestamp : sa.Submitted,
        Amount : sa.CrxAmount,
        Rate : 1.0 / Number.parseFloat(sa.Rate),
        CADEquivAmt : cadout
      }
      outs.push( it )
    }
    else { // we are buying $curr with fiat
      let cadin = Math.floor( Number.parseFloat(sa.CtxAmount) *
                              Number.parseFloat(sa.Rate) * 100 ) / 100
      let it = {
        Type : "SALE",
        Timestamp : sa.Submitted,
        Amount : sa.CtxAmount,
        Rate : sa.Rate,
        CADEquivAmt : cadin
      }
      ins.push( it )
    }

    sumFeesPaid += Number.parseFloat( sa.CrxFeePaid )
    let ourfee = sa.Fees.fees[module.exports.BLIQUIDFEENAME].replace('$','')
    sumOurFees += Number.parseFloat( ourfee )
  } )

  ins.sort( (a,b) => { b.Timestamp - a.Timestamp } ) // sort ASCENDING

  let losses = BLDB.getCollection('LOSSES')
                   .chain()
                   .find( {
                     '$and' : [
                       { Channel : { '$eq' : chan } },
                       { Curr : { '$eq' : curr } },
                       { When : { '$gte' : fromst } },
                       { When : { '$lt' : tost } },
                     ]
                   } )
                 .data()

  losses.forEach( lo => {
    let cadequiv = Math.floor( Number.parseFloat(lo.Amount) /
                               Number.parseFloat(lo.Rate) * 100 ) / 100
    outs.push( {
      Type : "LOSS",
      Timestamp : lo.When,
      Amount : lo.Amount,
      Rate : lo.Rate,
      CADEquivAmt : cadequiv
    } )
  } )

  outs.sort( (a,b) => { b.Timestamp - a.Timestamp } ) // sorts ASCENDING

  // calculate gains using accounting fifo rule ...

  let inIndex = 0, inPtr = 0.00, gains = 0.0

  outs.forEach( (ot) => {
    let outtogo = ot.Amount

    while (inIndex < ins.length && outtogo > 0) {

      if (inPtr + outtogo < ins[inIndex].Amount) {
        if (ot.Type === 'LOSS') {
          gains -= ot.CADEquivAmt
        } else if (ot.Type === 'SALE') {
          gains += outtogo * (ot.Rate - ins[inIndex].Rate)
          console.log( 'outtogo: ' + outtogo + '\n' +
            'ot.Rate: ' + ot.Rate + '\n' +
            'ins[' + inIndex + '].Rate: ' + ins[inIndex].Rate + '\n' +
            'gains: ' + gains )
        }

        inPtr += outtogo
        outtogo = 0
      }
      else {
        let inc = ins[inIndex].Amount - inPtr

        if (ot.Type === 'LOSS') {
          gains -= inc * ins[inIndex].Rate
        } else if (ot.Type === 'SALE') {
          gains += inc * (ot.Rate - ins[inIndex].Rate)
        }

        inIndex++
        outtogo -= inc
        inPtr = 0
      }

    }

  } )

  let result = { gains: Math.floor(gains * 100)/100,
                 ourFees: sumOurFees,
                 feesPaid: sumFeesPaid }

  console.log( 'returning: ' + JSON.stringify(result) )
  return result
}
