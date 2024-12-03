const CHANNEL = 'b-liquid.money'

function unshowError() {
  $( '#StatusArea' ).html(
    "<span class=label style='color:white;font-size: 1.5em;'>" +
       "<b>OK</b>" +
    "</span>" )
}

function showError( msg ) {
  $( '#StatusArea' ).html(
    "<span style='color:black;background-color:lightyellow;'>" +
       "<b>" + msg + "</b>" +
    "</span>" )
}

// payments (transmissions from clients) on which we are waiting
function initCTXTab() {

  unshowError()
  $( "#CTXDiv" ).html('')

  fetch( '/cgi-bin/mxctxs', { method: "POST", body: JSON.stringify(CHANNEL) } )
  .then( async rsp => {

    if (!rsp.ok) throw 'Invalid result from mxctxs'
    let obj = await rsp.json()
    let rsparr = obj.result

    let content =
      "<table>" +
      "<tr class=tableheaderrow>" +
      "<th>Order</th>" +
      "<th>Submitted</th>" +
      "<th>CTX Amount</th>" +
      "<th>CTX Currency</th>" +
      "<th>CTX Method</th>" +
      "<th colspan=2>Mark as Received</th>" +
      "</tr>"

    if (!rsparr || rsparr.length == 0)
      content += '<tr>' +
                   '<td colspan=7>No results found.</td>' +
                 '</tr>'

    rsparr.forEach( ctx => {
      content +=
      "<tr>" +
        "<td>" + ctx.ID + "</td>" +
        "<td>" + BLDate.toReadableDate( ctx.Submitted ) + "</td>" +
        "<td>" + ctx.CtxAmount + "</td>" +
        "<td>" + ctx.CtxCurr + "</td>" +
        "<td>" + ctx.CtxMethod + "</td>" +
        "<td><span class=label>Ref:</span> " + 
          '<input class=data type=text id=ctx' + ctx.ID + ' size=24 />' +
        "</td>" + 
        "<td>" +
          '<button class=databutton onclick="markReceived(\'' + ctx.ID +
            '\')")">Received</button>' +
        '</td>' +
      "</tr>"
    } )

    content += "</table>"
    $( "#CTXDiv" ).html( content )

  } )
  .catch( err => { showError( err ) } )
}

async function markReceived( orderid ) {
  let ref = $('#ctx' + orderid).val()

  if (!ref || ref.length == 0) {
    alert( 'Reference to incoming payment is mandatory.' )
    return
  }

  let mkrxreq = {
    saleId : orderid,
    ctxRef : ref
  }

  let rsp = await fetch( '/cgi-bin/mxctxreceived',
      { method: "POST", body: JSON.stringify(mkrxreq) } )

  if (!rsp.ok) throw 'Invalid response to mxctxreceived'
  let obj = await rsp.json()
  let ack = obj.result
  alert( 'Marked Received at: ' + BLDate.toReadableDate(ack.Received) )
}

// settlements to be received by clients
function initCRXTab() {

  unshowError()
  $( "#CRXDiv" ).html('')

  fetch( '/cgi-bin/mxcrxs', { method: "POST", body: JSON.stringify(CHANNEL) } )
  .then( async rsp => {

    if (!rsp.ok) throw 'Invalid result from mxcrxs'
    let obj = await rsp.json()
    let rsparr = obj.result

    let content =
      "<table>" +
      "<tr class=tableheaderrow>" +
      "<th>Order</th>" +
      "<th>Payment Received</th>" +
      "<th>CRX Amount</th>" +
      "<th>CRX Curr</th>" +
      "<th>CRX Method</th>" +
      "<th colspan=3>Mark as Sent</th>" +
      "</tr>"

    if (!rsparr || rsparr.length == 0)
      content += '<tr>' +
                   '<td colspan=8>No results found.</td>' +
                 '</tr>'

    rsparr.forEach( crx => {
      content +=
        "<tr>" +
        "<td>" + crx.ID + "</td>" +
        "<td>" + BLDate.toReadableDate( crx.CtxReceived ) + "</td>" +
        "<td>" + crx.CrxAmount + "</td>" +
        "<td>" + crx.CrxCurr + "</td>" +
        "<td>" + crx.CrxCoords.CrxMethod + "</td>" +
        "<td><span class=label>Ref:</span> " + 
          '<input class=data type=text id=crx' + crx.ID + ' size=24 />' +
        "</td>" + 
        "<td><span class=label>Fees:</span> " + 
          '<input class=data type=text id=fees' + crx.ID + ' size=6 />' +
        "</td>" + 
        "<td>" +
          '<button class=databutton onclick="markSent(\'' + crx.ID +
            '\')")">Sent</button>' +
        '</td>' +
        "</tr>"
    } )

    content += "</table>"
    $( "#CRXDiv" ).html( content )

  } )
  .catch( err => { showError( err ) } )
}

async function markSent( orderid ) {
  let ref = $('#crx' + orderid).val()

  if (!ref || ref.length == 0) {
    alert( 'Reference to outgoing settlement is mandatory.' )
    return
  }

  let fees = $('#fees'+orderid).val()
  if (!fees || fees.length == 0) {
    alert( 'Include fees paid to make settlement.' )
    return
  }

  let mktxreq = {
    saleId : orderid,
    crxRef : ref,
    feesCAD : fees,
    xmrViewKey : ""
  }

  let rsp = await fetch( '/cgi-bin/mxcrxsent',
      { method: "POST", body: JSON.stringify(mktxreq) } )

  if (!rsp.ok) throw 'Invalid response to mxcrxreceived'
  let obj = await rsp.json()
  let ack = obj.result
  alert( 'Marked Sent at: ' + BLDate.toReadableDate(ack.Sent) )
}

function initPNLTab() {
  unshowError()

  let nowstr = BLDate.toHTMLInputDate( Date.now() )

  $( '#fromwidgetcell' ).html(
    '<input type="datetime-local" id="fromtime" value="' + nowstr + '" />'
  )

  $( '#towidgetcell' ).html(
    '<input type="datetime-local" id="totime" value="' + nowstr + '" />'
  )
}

async function doQuery() {

  unshowError()

  let fromunix = BLDate.fromFormattedLocal( $('#fromtime').val() )
  let tounix = BLDate.fromFormattedLocal( $('#totime').val() )

  let pnlreq = {
    channel : CHANNEL,
    currency : 'BTC',
    fromDatetime : fromunix,
    toDatetime : tounix
  }

  try {

    let rsp = await fetch( '/cgi-bin/mxcalcpnl',
      { method: "POST", body: JSON.stringify(pnlreq) } )

    if (!rsp.ok) throw 'Invalid response to mxcalcpnl'
    let obj = await rsp.json()
    if (!obj) throw 'Nothing returned by mxcalcpnl'
    let pnl = obj.result
    $( "#btcGains" ).html( pnl.gains )
    $( "#btcFeesCollected" ).html( pnl.ourFees )
    $( "#btcFeesPaid" ).html( pnl.feesPaid )

    let rsp2 = await fetch( '/cgi-bin/mxinventory',
      { method: "POST", body: JSON.stringify(CHANNEL) } )

    if (!rsp2.ok) throw 'Invalid response to mxinventory'
    let obj2 = await rsp2.json()
    let invt = obj2.result
    $( "#btcInventory" ).html( invt['BTC'] )
    $( "#cadInventory" ).html( invt['CAD'] )
  }
  catch( err ) {
    showError( err )
  }

}

function initNewPurchWidgets() {
  $( "#NewPurchAmt" ).val( '' )
  $( "#NewPurchCurrSelect" ).val( $( "#PurchCurrSelect" ).val() )
  $( "#NewPurchRate" ).val( '' )
  $( "#NewPurchFees" ).val( '' )
  $( "#NewPurchSource" ).val( '' )
  $( "#NewPurchRef" ).val( '' )
}

async function doNewPurchase() {

  let req = {
    toChan : CHANNEL,
    amount : $( "#NewPurchAmt" ).val(),
    currency : $( "#NewPurchCurrSelect" ).val(),
    rate : $( "#NewPurchRate" ).val(),
    fees : $( "#NewPurchFees" ).val(),
    source: $( "#NewPurchSource" ).val(),
    ref: $( "#NewPurchRef" ).val()
  }

  if (    !req.amount || parseFloat(req.amount) == 0.0
       || !req.currency || req.currency.length == 0
       || !req.rate || req.rate.length == 0
       || !req.fees || req.fees.length == 0
       || !req.source || req.source.length == 0
       || !req.ref || req.ref.length == 0 ) {
    alert( 'Purchase missing field(s)' )
    return
  }

  let rsp = await fetch( '/cgi-bin/mxaddpurchase',
    { method: "POST", body: JSON.stringify(req) } )

  try {
    if (!rsp.ok) throw 'Invalid response'
    let body = await rsp.json()
    let answer = body.result
    alert( 'Purchase Added: ' + BLDate.toReadableDate(answer.Added) )
    initPurchTab()
  }
  catch( err ) { showError( err ) }
}

function initPurchTab() {
  unshowError()
  initNewPurchWidgets()

  let nowstr = BLDate.toHTMLInputDate( Date.now() )

  $( '#purchfromwidgetcell' ).html(
    '<input type="datetime-local" id="purchfromtime" value="' + nowstr + '" />'
  )

  $( '#purchtowidgetcell' ).html(
    '<input type="datetime-local" id="purchtotime" value="' + nowstr + '" />'
  )
}

async function doPurchQuery() {
  $( '#PurchQueryResults' ).html( '' )

  let req = {
    fromtime : BLDate.fromFormattedLocal( $('#purchfromtime').val() ),
    totime : BLDate.fromFormattedLocal( $('#purchtotime').val() ),
    channel : CHANNEL,
    curr : $( '#PurchCurrSelect' ).val()
  }

  let rsp = await fetch( '/cgi-bin/mxgetpurchases',
    { method: "POST", body: JSON.stringify(req) } )

  try {
    if (!rsp.ok) throw 'fetch(/cgi-bin/mxgetpurchases) failed'

    let html = 
      '<table>' +
      '<tr class=tableheaderrow>' +
        '<th>Currency</th>' +
        '<th>Added</th>' +
        '<th>Amount</th>' +
        '<th>Rate</th>' +
        '<th>Fees CAD</th>' +
        '<th>Source</th>' +
        '<th>Reference</th>' +
      '</tr>'

    let body = await rsp.json()
    let purchases = body.result

    if ( Array.isArray(purchases) ) {
      if (purchases.length == 0) {
        html += '<tr bgcolor=lightyellow>' +
          '<td class=data colspan=7>No results</td>' +
        '</tr>'
      }

      purchases.forEach( purch => {
        html += '<tr>' +
          '<td class=label>' + purch.Curr + '</td>' +
          '<td class=data>' + BLDate.toReadableDate(purch.Added) + '</td>' +
          '<td class=data>' + purch.Amount + '</td>' +
          '<td class=data>' + purch.Rate + '</td>' +
          '<td class=data>' + purch.Fees + '</td>' +
          '<td class=data>' + purch.Source + '</td>' +
          '<td class=data>' + purch.Ref + '</td>' +
        '</tr>'
      } )
    }

    html += '</table>'
    $( '#PurchQueryResults' ).html( html )
  }
  catch( err ) { showError( err ) }
}

function initNewLossWidgets() {
  $( '#NewLossAmt' ).val( '' )
  $( '#NewLossCurrSelect' ).val( $('#LossesCurrSelect' ).val() )
  $( '#NewLossRate' ).val( '' )
  $( '#NewLossRef' ).val( '' )
}

async function doNewLoss() {
  let req = {
    channel : CHANNEL,
    amount : $( "#NewLossAmt" ).val(),
    currency : $( "#NewLossCurrSelect" ).val(),
    rate : $( "#NewLossRate" ).val(),
    ref: $( "#NewLossRef" ).val()
  }

  if (    !req.amount || parseFloat(req.amount) == 0.0
       || !req.currency || req.currency.length == 0
       || !req.rate || req.rate.length == 0
       || !req.ref || req.ref.length == 0 ) {
    alert( 'Loss missing field(s)' )
    return
  }

  let rsp = await fetch( '/cgi-bin/mxaddloss',
    { method: "POST", body: JSON.stringify(req) } )

  try {
    if (!rsp.ok) throw 'Response to mxaddloss not ok'
    let body = await rsp.json()
    let answer = body.result
    alert( 'Loss Added: ' + BLDate.toReadableDate(answer.When) )
    initLossesTab()
  }
  catch( err ) { showError( err ) }
}

function initLossesTab() {
  unshowError()
  initNewLossWidgets()

  let nowstr = BLDate.toHTMLInputDate( Date.now() )

  $( '#lossesfromwidgetcell' ).html(
    '<input type="datetime-local" id="lossesfromtime" value="' + nowstr + '" />'
  )

  $( '#lossestowidgetcell' ).html(
    '<input type="datetime-local" id="lossestotime" value="' + nowstr + '" />'
  )
}

async function doLossesQuery() {
  $( '#LossesQueryResults' ).html( '' )

  let req = {
    fromDatetime : BLDate.fromFormattedLocal( $('#lossesfromtime').val() ),
    toDatetime : BLDate.fromFormattedLocal( $('#lossestotime').val() ),
    channel : CHANNEL,
    currency : $( '#LossesCurrSelect' ).val()
  }

  let html = 
    '<table>' +
    '<tr class=tableheaderrow>' +
      '<th>When</th>' +
      '<th>Amount</th>' +
      '<th>Currency</th>' +
      '<th>Rate</th>' +
      '<th>Reference</th>' +
    '</tr>'

  try {

    let rsp = await fetch( '/cgi-bin/mxgetlosses',
      { method: "POST", body: JSON.stringify(req) } )
    .catch( err => { showError(err) } )

    if (!rsp || !rsp.ok) throw 'fetch(mxgetlosses) failed'

    let body = await rsp.json()
    let losses = body.result

    if ( Array.isArray(losses) ) {
      if (losses.length == 0) {
        html += '<tr bgcolor=lightyellow>' +
          '<td class=data colspan=7>No losses returned</td>' +
        '</tr>'
      }

      losses.forEach( loss => {
        html += '<tr>' +
          '<td class=data>' + BLDate.toReadableDate(loss.When) + '</td>' +
          '<td class=data>' + loss.Amount + '</td>' +
          '<td class=data>' + loss.Curr + '</td>' +
          '<td class=data>' + loss.Rate + '</td>' +
          '<td class=data>' + loss.Ref + '</td>' +
        '</tr>'
      } )
    }

    html += '</table>'
    $( '#LossesQueryResults' ).html( html )
  }
  catch( err ) {
    showError( err )
  }
}

function initNotesTab() {
  unshowError()
  $( "#NotesQueryResultsDiv" ).html('')
  initNewNoteWidgets()
}

function doNotesQuery() {
  unshowError()
  $( "#NotesQueryResultsDiv" ).html('')
  initNewNoteWidgets()

  fetch( '/cgi-bin/mxgetnotes',
    {
      method: "POST",
      body: JSON.stringify($('#NoteOrderRefField').val())
    }
  )
  .then( async rsp => {
    if (!rsp.ok) throw 'invalid mxgetnotes result'
    let obj = await rsp.json()
    let rsparr = obj.result
    console.log(JSON.stringify(rsparr))

    let htmld =
      '<table>' +
      '<tr class=tableheaderrow>' +
      '<th>Order</th>' +
      '<th>Note Created</th>' +
      '<th>Message</th>' +
      '<th>Source</th>' +
      '<th>Client Visible</th>' +
      '</tr>'

    rsparr.forEach( note => {
      console.log( 'note: ' + JSON.stringify(note))

      htmld +=
        '<tr>' +
        '<td class=data>' + note.SaleID + '</td>' +
        '<td class=data>' + BLDate.toReadableDate(note.Created) + '</td>' +
        '<td class=data>' + note.Message + '</td>' +
        '<td class=data>' + note.Source + '</td>' +
        '<td class=data valign=top>' +
          ((note.ClientVisible)
            ? '<span style="font-size:1.5em; color:green;">☑</span>'
            : '<span style="font-size:1.5em; color:red;">☒</span>') +
        '</td>' +
        '</tr>'
    } )
    htmld += '</table>'

    $( '#NotesQueryResultsDiv' ).html( htmld )
  } )
  .catch( err => { showError( err ) } )
}

function initNewNoteWidgets() {
  $( '#NewNoteSaleId' ).html( $('#NoteOrderRefField').val() )
  $( '#NewNoteMessage' ).val( '' )
  $( '#NewNoteSource' ).val( '' )
  $( '#NoteCliVisYes' ).prop( 'checked', true )
  $( '#NoteCliVisNo' ).prop( 'checked', false )
}

function doNewNote() {
  let req = {
    saleId : $( '#NewNoteSaleId' ).html(),
    message : $( '#NewNoteMessage' ).val(),
    source : $( '#NewNoteSource' ).val(),
    isclientvisible : $( '#NoteCliVisYes' ).prop( 'checked' )
  }

  if (    !req.saleId || req.saleId.length == 0
       || !req.message || req.message.length == 0
       || !req.source || req.source.length == 0 ) {
    alert( 'Note missing field(s)' )
    return
  }

  fetch( '/cgi-bin/mxaddnote',
    { method: "POST", body: JSON.stringify(req) } )
  .then( async rsp => {
    if (!rsp.ok) throw 'invalid mxaddnote response'
    let obj = await rsp.json()
    alert( 'Note Added: ' + BLDate.toReadableDate(obj.result.Created) )
    initNoteTab()
  } )
  .catch( err => { showError( err ) } )
}

function initNewSARWidgets() {
  $( '#NewSARSaleId' ).html( $( '#SAROrderRefField' ).val() )
  $( '#NewSARReason' ).val( '' )
  $( '#NewSAROurRef' ).val( '' )
  $( '#NewSARFINTRACRef' ).val( '' )
}

function initSARsTab() {
  unshowError()
  $( "#SARsQueryResultsDiv" ).html('')
  initNewSARWidgets()
}

function doSARsQuery() {
  unshowError()
  $( "#SARsQueryResultsDiv" ).html('')
  initNewSARWidgets()

  let htmld =
    '<table>' +
    '<tr class=tableheaderrow>' +
    '<th>Order Ref</th>' +
    '<th>SAR Logged</th>' +
    '<th>Reason</th>' +
    '<th>Our Ref</th>' +
    '<th>FINTRAC Ref</th>' +
    '</tr>'

  fetch( '/cgi-bin/mxgetsars',
    { method: "POST", body: JSON.stringify($('#SAROrderRefField').val()) } )
  .then( async rsp => {
    if (!rsp.ok) throw 'invalid mxgetsars response'
    let obj = await rsp.json()
    let rsparr = obj.result
    rsparr.forEach( sar => {
      htmld +=
        '<tr>' +
        '<td class=data>' + sar.SaleID + '</td>' +
        '<td class=data>' + BLDate.toReadableDate(sar.Logged) + '</td>' +
        '<td class=data>' + sar.Reason + '</td>' +
        '<td class=data>' + sar.OurRef + '</td>' +
        '<td class=data>' + sar.FINTRACRef + '</td>' +
        '</tr>'
    } )
    htmld += '</table>'

    $( '#SARsQueryResultsDiv' ).html( htmld )
  } )
  .catch( err => { showError( err ) } )
}

function doNewSAR() {
  let req = {
    saleId : $( '#SAROrderRefField' ).val(),
    reason : $( '#NewSARReason' ).val(),
    ourref : $( '#NewSAROurRef' ).val(),
    fintracref : $( '#NewSARFINTRACRef' ).val()
  }

  if (    !req.saleId || req.saleId.length == 0
       || !req.reason || req.reason.length == 0
       || !req.ourref || req.ourref.length == 0
       || !req.fintracref || req.fintracref.length == 0 ) {
    alert( 'SAR missing field(s)' )
    return
  }

  fetch( '/cgi-bin/mxaddsar',
    { method: "POST", body: JSON.stringify(req) } )
  .then( async rsp => {
    if (!rsp.ok) throw 'invalid mxaddsar response'
    let obj = await rsp.json()
    alert( 'SAR Logged: ' + BLDate.toReadableDate(obj.result.Logged) )
    initSARsTab()
  } )
  .catch( err => { showError( err ) } )
}

