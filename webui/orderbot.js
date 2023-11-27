const BOOKITURL = "ws://localhost:8443"
const BOOKITREQ = {
  jsonrpc: "2.0",
  method: "sale",
  params: [],
  id: 0
}

var ctx, crx

function initOrderbot() {
  $('#rxAddrArrow').hide()
  $('#bookArrow').hide()
  $('#ClientReceiveAddress').val("")
  getRates() // fetch from server and update Rates variable
}

function getFees() {
  $('#Fees').html = ""

  let ctxAmount = $('#ClientSendAmountInput').val()
  if (Number.parseFloat(ctxAmount) == 0) {
    $('#Fees').html = "0.00"
    $('#ClientReceiveAmount').html = "0.00"
    return 0
  }

  WSSCX.getFees( ctxAmount, ctx, crx, $('#CrxMethodSelect').val() )
}

PubSub.subscribe( 'Fees', rsp => {
  let contents = '<table cellspacing=0 cellpadding=0>'
  Object.keys(rsp.fees).forEach( (key,index) => {
    contents += '<tr>' +
      '<td align=right style="padding:0">' + key + ':&nbsp;</td>' +
      '<td align=right style="padding:0">' + rsp.fees[key] + '</td></tr>'
  } )
  contents += '</table>'
  $('#Fees').html( contents )

  // client to receive:  toCAD(amount * rate) - fees (in CAD)
  let toclientcad = toCAD( ctxAmount, ctx ) - rsp.total

  if (toclientcad < 0) {
    $('#ClientReceiveAmount').html( "0.00" )
  }
  else {
    let toclientamt = cadToCurr( toclientcad, crx )
    $('#ClientReceiveAmount').html( toclientamt )
  }
)

function bookIt() {
  let sendAmt = $('#ClientSendAmountInput').val()
  if (!sendAmt || Number.parseFloat(sendAmt) == 0.0) {
    alert( 'Valid send amount required.' )
    return
  }

  let pair = (ctx === 'CAD' || ctx === 'USD' || ctx === 'EUR' || ctx === 'GBP')
             ? crx + ctx
             : ctx + crx

  if (!Rates[pair]) {
    alert( 'Valid rate required.' )
    return
  }

  let rxAmt = $('#ClientReceiveAmount').html()
  if (!rxAmt || Number.parseFloat(rxAmt) == 0.0) {
    alert( 'Valid receive amount required.' )
    return
  }

  let crxObj = getCrxCoords()
  if (!crxObj) {
    alert( 'Valid address to receive payment required.' )
    return
  }

  let order = {
    channel : "b-liquid.money",
    ctxMethod : $('#CtxMethodSelect').val(),
    ctxAmount : sendAmt,
    ctxCurr : ctx,
    crxCurr : crx,
    crxCoords : crxObj
  }

  let params = [ order ]
  let req = JSON.parse( JSON.stringify(BOOKITREQ) )
  req.params = params

  let socket = new WebSocket( BOOKITURL )

  socket.addEventListener( 'open', (e) => {
    socket.send( JSON.stringify(req) )
  } )

  socket.addEventListener( 'message', (msg) => {
    try {
      let rsp = JSON.parse( msg.data )
      if (rsp.error) throw rsp.error.message

      let id = rsp.result.ID

      // goto our page that shows the payment instructions
      window.open( './ctxInstructions.html?id=' + id, '_self' )
    }
    catch( e ) {
      alert( "error: " + e.toString() )
    }
  } )
}

function toFlagImage(curr) {
  if (curr == 'CAD')
    return "<img src=img/Flag_of_Canada.svg width=40 height=25 />"
  else if (curr == 'USD')
    return "<img src=img/Flag_of_USA.svg width=40 height=25 />"
  else if (curr == 'GBP')
    return "<img src=img/Flag_of_UK.svg width=40 height=25 />"
  else if (curr == 'EUR')
    return "<img src=img/Flag_of_Europe.svg width=40 height=25 />"
  else if (curr == 'BTC')
    return "<img src=img/bitcoin-btc-logo.svg width=25 height=25 />"
  else if (curr == 'ETH')
    return "<img src=img/ethereum-eth-logo.svg width=25 height=25 />"
  else if (curr == 'XMR')
    return "<img src=img/monero-xmr-logo.svg width=25 height=25 />"
  else if (curr == 'DAI')
   return "<img src=img/dai-dai-logo.svg width=25 height=25 />"
  else
    return "&nbsp;"
}

function sendAmountChanged() {
  $('#sendAmountArrow').hide()
  $('#bookArrow').hide()
  $('#rxAddrArrow').show()
  getFees()
}

function getCrxCoords() {
  let meth = $('#CrxMethodSelect').val()

  let result = {
    CrxMethod : "",
    CrxAddress : null
  }

  let addr = null

  if (meth == 'BTCMAINNET') {
    result.CrxMethod = 'BTCMAINNET'
    addr = $('#BTCMAINNET').val()
    if (    crx === 'BTC'
         && !BLAddrValidator.isValidBTCAddr(addr) ) {
      alert( BLAddrValidator.bitcoinRules() )
      return null
    }
  }
  else if (meth == 'BTCLIGHTNING') {
    result.CrxMethod = 'BTCLIGHTNING'
    addr = $('#BTCLIGHTNING').val()
    if (!BLAddrValidator.isValidEmail(addr) ) {
      alert( BLAddrValidator.lightningRules() )
      return null;
    }
  }
  else if (meth == 'ETHMAINNET') {
    result.CrxMethod = 'ETHMAINNET'
    addr = $('#ETHMAINNET').val()
    if (!BLAddrValidator.isValidEth(addr) ) {
      alert( BLAddrValidator.ethRules() )
      return null;
    }
  }
  else if (meth == 'ETHPOLYGON') {
    result.CrxMethod = 'ETHPOLYGON'
    addr = $('#ETHPOLYGON').val()
    if (!BLAddrValidator.isValidPolygon(addr) ) {
      alert( BLAddrValidator.polygonRules() )
      return null;
    }
  }
  else if (meth == 'XMRMAINNET') {
    result.CrxMethod = 'XMRMAINNET'
    addr = $('#XMRMAINNET').val()
    if (!BLAddrValidator.isValidMonero(addr) ) {
      alert( BLAddrValidator.moneroRules() )
      return null;
    }
  }
  else if (meth == 'INTERAC') {
    result.CrxMethod = 'INTERAC'
    addr = $('#INTERAC').val()
    if (!BLAddrValidator.isValidEmail(addr) ) {
      alert( BLAddrValidator.interacRules() )
      return null;
    }
  }
  else if (meth == 'CANADAPOST') {
    result.CrxMethod = 'CANADAPOST'

    let addr1 = $('#AddrLine1').text()
    let addr2 = $('#AddrLine2').text()
    let cito = $('#CityTown').text()
    let prst = $('#ProvState').text()
    let pozp = $('#PostalZip').text()

    if ( (!addr1 || addr1.length == 0) && (!addr2 || addr2.length == 0) ) {
      alert( 'Require at least one address line.' )
      return null;
    }
    if (!cito || cito.length == 0) {
      alert( 'Require a city or town name.' )
      return null;
    }
    if (!prst || prst.length == 0) {
      alert( 'Require a province or US state.' )
      return null;
    }
    if (!pozp || pozp.length == 0) {
      alert( 'Require a postal or zip code.' )
      return null;
    }

    addr = {
      AddrLine1 : addr1,
      AddrLine2 : addr2,
      CityTown : cito,
      ProvState : prst,
      PostalZip : pozp
    }
  }
  else if (meth == 'ZELLE') {
    result.CrxMethod = 'ZELLE'
    addr = $('#ZELLE').val()
    if (!BLAddrValidator.isValidEmail(addr) ) {
      alert( BLAddrValidator.zelleRules() )
      return null;
    }
  }
  else if (meth == 'WISE') {
    result.CrxMethod = 'WISE'
    addr = $('#WISE').val()
    if (!BLAddrValidator.isValidEmail(addr) ) {
      alert( BLAddrValidator.wiseRules() )
      return null;
    }
  }
  else if (meth == 'SEPA') {
    result.CrxMethod = 'SEPA'
    addr = $('#SEPA').val()
    if (!BLAddrValidator.isValidIBAN(addr) ) {
      alert( BLAddrValidator.ibanRules() )
      return null;
    }
  }

  $('#rxAddrArrow').hide()
  $('#bookArrow').show()

  result.CrxAddress = addr

  return result
}

function toMethodImage( meth ) {
  if (meth == 'INTERAC') {
    return "<img src=./img/ETransfer-logo.svg height=25 align=center></img>"
  } else if (meth == 'CANADAPOST') {
    return "<img src=./img/canada-post-logo.svg height=25 align=center></img>"
  } else if (meth == 'ZELLE') {
    return "<img src=./img/Zelle_logo.svg height=25 align=center></img>"
  } else if (meth == 'WISE') {
    return "<img src=./img/Wise-logo.svg height=25 align=center></img>"
  } else if (meth == 'SEPA') {
    return "<img src=./img/sepa-logo.svg height=25 align=center></img>"
  } else if (meth == 'BTCMAINNET') {
    return "<img src=./img/bitcoin-btc-logo.svg width=25 align=center></img>"
  } else if (meth == 'BTCLIGHTNING') {
    return "<img src=./img/lightning_logo.svg width=25 align=center></img>"
  } else if (meth == 'ETHMAINNET') {
    return "<img src=./img/ethereum-eth-logo.svg width=25 align=center></img>"
  } else if (meth == 'ETHPOLYGON') {
    return "<img src=./img/polygon-matic-logo.svg width=25 align=center></img>"
  } else if (meth == 'XMRMAINNET') {
    return "<img src=./img/monero-xmr-logo.svg width=25 align=center></img>"
  }
}

function setMethodGlyph(val, isCtx) {
  if (!val) {
    val = (isCtx) ? $('#CtxMethodSelect').val() : $('#CrxMethodSelect').val()
  }

  let idv = (isCtx) ? $('#CtxMethodImage') : $('#CrxMethodImage')
  idv.html( toMethodImage(val) )
}

function setMethods( curr, isCtx, seldiv ) {
  let selectid = seldiv.attr('id') + 'Select'

  if (curr == 'CAD') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=INTERAC>INTERAC</option>' +
      '<option value=CANADAPOST>Cash by Mail</option>' +
      '</select>' )
  } else if (curr == 'USD') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=ZELLE>Zelle</option>' +
      '</select>' )
  } else if (curr == 'GBP') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=WISE>Wise</option>' +
      '</select>' )
  } else if (curr == 'EUR') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=SEPA>SEPA Transfer</option>' +
      '</select>' )
  } else if (curr == 'BTC') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=BTCMAINNET>Bitcoin (Mainnet)</option>' +
      '<option value=BTCLIGHTNING>Bitcoin (Lightning)</option>' +
      '</select>' )
  } else if (curr == 'ETH' || curr == 'DAI') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=ETHMAINNET>Ethereum (Mainnet)</option>' +
      '<option value=ETHPOLYGON>Polygon (Sidechain)</option>' +
      '</select>' )
  } else if (curr == 'XMR') {
    seldiv.html(
      '<select id=' + selectid +
      ' onchange=PubSub.publish(' +
        ((isCtx) ? '"CtxMethod",' : '"CrxMethod",') + 'this.value) >' +
      '<option value=XMRMAINNET>Monero (Mainnet)</option>' +
      '</select>' )
  }
}

// ========================
// Subscriptions to events
// ========================

PubSub.subscribe( 'CtxCurr', (curr) => {
  let seldiv = $('#CtxMethod')
  setMethods( curr, true, seldiv )
} )

PubSub.subscribe( 'CrxCurr', (curr) => {
  let seldiv = $('#CrxMethod')
  let imgdiv = $('#CrxMethodImage')
  setMethods( curr, false, seldiv )
} )

PubSub.subscribe( 'CtxMethod', (meth) => {
  setMethodGlyph( meth, true )
} )

PubSub.subscribe( 'CrxMethod', (meth) => {
  if (!meth)
    meth = $('#CrxMethodSelect').val()

  let dv = $('#ClientReceiveCoordsDiv')
  if (meth == 'BTCMAINNET') {
    dv.html( '<input id=BTCMAINNET type=text required size=42 maxlength=75 ' +
      'placeholder="Bitcoin/BTC mainnet address" ></input>' )
  }
  else if (meth == 'BTCLIGHTNING') {
    dv.html( '<input id=BTCLIGHTNING type=text required size=42 maxlength=75 '
      + 'placeholder="Bitcoin/Lightning email address" ></input>' )
  }
  else if (meth == 'INTERAC') {
    dv.html( '<input id=INTERAC type=text required size=42 maxlength=75 ' +
      'placeholder="email to receive INTERAC payment" ></input>' )
  }
  else if (meth == 'ZELLE') {
    dv.html( '<input id=ZELLE type=text required size=42 maxlength=75 ' +
      'placeholder="Zelle email address" ></input>' )
  }
  else if (meth == 'WISE') {
    dv.html( '<input id=WISE type=text required size=42 maxlength=75 ' +
      'placeholder="WISE email address" ></input>' )
  }
  else if (meth == 'SEPA') {
    dv.html( '<input id=SEPA type=text required size=42 maxlength=75 ' +
      'placeholder="receiving account IBAN code" ></input>' )
  }
  else if (meth == 'CANADAPOST') {
    dv.html(
      '<table>' +
      '<tr>' +
      '  <th class=nested align=right>Address 1:</th>' +
      '  <td><input id=AddrLine1 type=text required size=32 maxlength=75 />' +
      '</tr>' +
      '<tr>' +
      '  <th class=nested align=right>Address 2:</th>' +
      '  <td><input id=AddrLine2 type=text required size=32 maxlength=75 />' +
      '</tr>' +
      '<tr>' +
      '  <th class=nested align=right>City/Town:</th>' +
      '  <td><input id=CityTown type=text required size=32 maxlength=75 />' +
      '</tr>' +
      '<tr>' +
      '  <th class=nested align=right>Prov/State:</th>' +
      '  <td><input id=ProvState type=text required size=32 maxlength=75 />' +
      '</tr>' +
      '<tr>' +
      '  <th class=nested align=right>Postal/Zip:</th>' +
      '  <td><input id=PostalZip type=text required size=10 maxlength=32 />' +
      '</tr>' +
      '</table>'
    )
  }

  setMethodGlyph( meth, false )

  getFees()
} )

// ====== ===== ===== =====
// START
// ====== ===== ===== =====

initOrderbot()

let urlparams = document.URL.substring(document.URL.indexOf('?'))
let params = new URLSearchParams( urlparams )

ctx = params.get('ctx')
crx = params.get('crx')

if (ctx == 'CAD' || ctx == 'USD' || ctx == 'GBP' || ctx == 'EUR') {
  $("#ClientSendAmount").html(
    "<input id=ClientSendAmountInput type=number required " +
    "placeholder=\"000.00\" step=\"0.01\" min=\"0\" " +
    "onchange=\"sendAmountChanged();\" " +
    "/>"
  )
  $("#ClientReceiveAmount").html( "0.00000" )
}
else {
  $("#ClientSendAmount").html(
    "<input id=ClientSendAmountInput type=number required " +
    "placeholder=\"0.00000\" step=\"0.00001\" min=\"0\" " +
    "onchange=\"sendAmountChanged()\" " +
    " />"
  )
  $("#ClientReceiveAmount").html( "000.00" )
}

$("#ClientSendCurrency").html( ctx )
$("#ClientSendCurrencyFlag").html( toFlagImage(ctx) )

PubSub.publish( 'CtxCurr', ctx )
PubSub.publish( 'CtxMethod', null )

$("#ClientReceiveCurrency").html( crx )
$("#ClientReceiveCurrencyFlag").html( toFlagImage(crx) )

PubSub.publish( 'CrxCurr', crx )
PubSub.publish( 'CrxMethod', null )

$("#ClientSendAmountInput").focus()
