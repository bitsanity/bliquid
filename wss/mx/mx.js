const fs = require( 'fs' )
const WebSocket = require( 'ws' )
const PP = require( './PP.js' )

eval( fs.readFileSync('../../common/BLDate.js').toString() )

function mkReq( mth, prms, rqid ) {
  return {
    jsonrpc: "2.0",
    method: mth,
    params: (prms) ? prms : [],
    id: rqid
  }
}

function usage() {
  PP.norm( 'USAGE', '$ node <this.js> ... ' + `
status
sale <saleid>
crxs <channel=bliquid.money>
ctxs <channel=bliquid.money>
inventory <channel=bliquid.money>
purchase <chan> <amount> <curr> <ratetocad> <source> <reference>
loss <chan> <amount> <curr> <cadrate> <ref>
note <saleid> <message> <source> <clientvisible>
sar <saleid | 0> <reason> <ourref> <fintracref>
ctxrcvd <saleid> <ctxref>
crxsent <saleid> <crxsentref> <xmrviewkey | 0>
notes <saleid>
sars <saleid>
sales <channel> <day | month | year> or <fromtimestamp> <totimestamp=now>
pnl <channel> <currency> <fromtime=0> <totime=now>
` )
}

let cmd = process.argv[2]
if (!cmd) {
  usage()
  process.exit(1)
}

let req
if (cmd === 'status')
  req = mkReq( 'mxstatus', null, 1 )
else if (cmd === 'sale')
  req = mkReq( 'mxsale', [ process.argv[3] ], 2 )
else if (cmd === 'crxs')
  req = mkReq( 'mxcrxs',
              [ (process.argv[3]) ? process.argv[3] : 'b-liquid.money' ], 3 )
else if (cmd === 'ctxs')
  req = mkReq( 'mxctxs',
              [ (process.argv[3]) ? process.argv[3] : 'b-liquid.money' ], 4 )
else if (cmd === 'inventory')
  req = mkReq( 'mxinventory',
              [ (process.argv[3]) ? process.argv[3] : 'b-liquid.money' ], 5 )
else if (cmd === 'purchase')
  req = mkReq( 'mxaddpurchase',
    [ process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6],
      process.argv[7],
      process.argv[8]
    ],
    6 )
else if (cmd === 'loss')
  req = mkReq( 'mxaddloss',
    [ process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6],
      process.argv[7]
    ],
    7 )
else if (cmd === 'note')
  req = mkReq( 'mxaddnote',
    [ process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6]
    ], 8 )
else if (cmd === 'sar')
  req = mkReq( 'mxaddsar',
    [ process.argv[3],
      process.argv[4],
      process.argv[5],
      process.argv[6]
    ], 9 )
else if (cmd === 'ctxrcvd')
  req = mkReq( 'mxctxrcvd',
    [ process.argv[3],
      process.argv[4]
    ], 10 )
else if (cmd === 'crxsent')
  req = mkReq( 'mxcrxsent',
    [ process.argv[3],
      process.argv[4],
      process.argv[5]
    ], 11 )
else if (cmd === 'notes')
  req = mkReq( 'mxnotes', [ process.argv[3] ], 12 )
else if (cmd === 'sars')
  req = mkReq( 'mxsars', [ process.argv[3] ], 13 )
else if (cmd === 'sales') {
  let chan = process.argv[3]
  let from = new Date()
  let to

  if (process.argv[4] === 'day') {
    from.setUTCHours(0)
    from.setUTCMinutes(0)
    from.setUTCSeconds(0)
    from.setUTCMilliseconds(0)
  }
  else if (process.argv[4] === 'month') {
    from.setUTCDate(1)
    from.setUTCHours(0)
    from.setUTCMinutes(0)
    from.setUTCSeconds(0)
    from.setUTCMilliseconds(0)
  }
  else if (process.argv[4] === 'year') {
    from.setUTCMonth(0)
    from.setUTCDate(1)
    from.setUTCHours(0)
    from.setUTCMinutes(0)
    from.setUTCSeconds(0)
    from.setUTCMilliseconds(0)
  }
  else {
    from = new Date( process.argv[4] )
    to = (process.argv[5]) ? new Date( process.argv[5] ) : null
  }
  req = mkReq( 'mxsales', [ chan, from.getTime(), (to) ? to.getTime() : null ], 14 )
}
else if (cmd === 'pnl') {
  let chan = process.argv[3]
  let curr = process.argv[4]
  let from = (process.argv[5]) ? process.argv[5] : 0
  let to = (process.argv[6]) ? process.argv[6] : Date.now()
  req = mkReq( 'mxpnl', [ chan, curr, from, to ], 15 )
}
else {
  usage()
  process.exit(1)
}

let mxws = new WebSocket('ws://localhost:9000');

mxws.on( 'error', console.error );

mxws.on('open', function open() {
  mxws.send( JSON.stringify(req) )
});

mxws.on('message', function message(data) {
  let ans = JSON.parse( data )

  if (ans.error) {
    PP.alarm( 'ERROR', ans.error );
    process.exit(1)
  }

  if (ans.id == 1) { // status, all fields are dates
    console.log( 'response = {' )
    Object.keys( ans.result ).forEach( key => {
      PP.norm( '  ' + key, BLDate.toReadableDate(ans.result[key]) )
    } )
    console.log( '}' )
  }

  if (ans.id == 2) { // sale data, just dump all fields
    console.log( 'response = {' )
    Object.keys( ans.result ).forEach( key => {
      PP.norm( '  ' + key, ans.result[key] )
    } )
    console.log( '}' )
  }

  if (ans.id == 3) { // crx's returns an array of sales awaiting our settlement
    console.log( 'response = {' )
    ans.result.forEach( sale => {
      let late = Date.now() - sale.CtxReceived > BLDate.FOURHOURSMS
      console.log( '  ' + sale.ID + ' ' +
                   '\x1b[31m' +
                   sale.CrxAmount + ' ' + sale.CrxCurr +
                   '\x1b[0m' + ' ' +
                   ((late) ? '\x1b[31m' : '\x1b[32m') +
                   BLDate.toReadableDate(sale.CtxReceived) +
                   '\x1b[0m ' +
                   sale.CrxAddr )
    } )
    console.log( '}' )
  }

  if (ans.id == 4) { // ctx's returns array of sales awaiting client payment
    console.log( 'response = {' )
    ans.result.forEach( sale => {
      let late = Date.now() - sale.Submitted > BLDate.FOURHOURSMS
      console.log( '  ' + sale.ID + ' ' +
                   '\x1b[32m' +
                   sale.CtxAmount + ' ' + sale.CtxCurr +
                   '\x1b[0m' + ' ' +
                   ((late) ? '\x1b[31m' : '\x1b[32m') +
                   BLDate.toReadableDate(sale.Submitted) +
                   '\x1b[0m ' +
                   sale.OurRxAddr )
    } )
    console.log( '}' )
  }

  if (ans.id >= 5 && ans.id <= 8) {
    console.log( 'response = {' )
    Object.keys( ans.result ).forEach( key => {
      PP.norm( '  ' + key, ans.result[key] )
    } )
    console.log( '}' )
  }

  if (ans.id == 9) {
    console.log( 'response = {' )
    PP.norm( '  Logged', BLDate.toReadableDate(ans.result.Logged) )
    console.log( '}' )
  }

  if (ans.id == 10) {
    console.log( 'response = {' )
    PP.norm( '  Received', BLDate.toReadableDate(ans.result.Received) )
    console.log( '}' )
  }

  if (ans.id == 11) {
    console.log( 'response = {' )
    PP.norm( '  Sent', BLDate.toReadableDate(ans.result.Sent) )
    console.log( '}' )
  }

  if (ans.id == 12) {
    console.log( 'response = {' )
    ans.result.forEach( note => {
      console.log(
        BLDate.toReadableDate(note.Created) +
        ' from=' + note.Source + ' isClientVisible=' + note.ClientVisible + '\n' +
        ' \x1b[32m' + note.Message + '\x1b[0m' )
    } )
    console.log( '}' )
  }

  if (ans.id == 13) {
    console.log( 'response = {' )
    ans.result.forEach( sar => {
      console.log(
        BLDate.toReadableDate(sar.Logged) + ' ' +
        PP.GREEN + sar.Reason + PP.RESET + ' ' +
        sar.OurRef + ' ' +
        sar.FINTRACRef )
    } )
    console.log( '}' )
  }

  if (ans.id == 14) {
    console.log( 'response = {' )
    ans.result.forEach( sale => {
      console.log(
        '  ' + sale.ID + ' ' +
        PP.YELLOW +
          BLDate.toReadableDate(sale.Submitted,true) + PP.RESET + ' ' +

        (   (sale.CtxReceived == 0)
          ? (PP.RED + 'awaiting ctx' + PP.RESET)
          : (PP.GREEN + BLDate.toReadableDate(sale.CtxReceived,true) +
             PP.RESET) ) +
        ' ' +
        (   (sale.CrxSent == 0)
          ? (PP.RED + 'crx unsent' + PP.RESET)
          : (PP.YELLOW + BLDate.toReadableDate(sale.CrxSent,true) + PP.RESET) )
      )
    } )
    console.log( '}' )
  }

  if (ans.id == 15) {
    console.log( 'response = {' )
    Object.keys( ans.result ).forEach( key => {
      PP.norm( '  ' + key, ans.result[key] )
    } )
    console.log( '}' )
  }

  process.exit(0)
});

