function clearStatus() {
  $( '#OrderID' ).html('')
  $( '#CtxAmount' ).html('')
  $( '#CtxMethod' ).html('')
  $( '#CrxPmtAddr' ).html('')
  $( '#CrxAmount' ).html('')
  $( '#CrxMethod' ).html('')
  $( '#CrxAddr' ).html('')
  $( '#OrderSubmittedAt' ).html('')
  $( '#CtxDueBy' ).html('')
  $( '#CtxReceivedAt' ).html('')
  $( '#CrxDueBy' ).html('')
  $( '#CrxSentAt' ).html('')
  $( '#CrxReference' ).html('')
}

async function fetchStatus( orderref ) {

  clearStatus()
  let req = { orderId : orderref }

  if (!orderref || orderref.length == 0) throw 'invalid orderref'

  let rsp = await fetch(
    '/cgi-bin/orderstatus', { method: "POST", body: JSON.stringify(req) } )

  try {
    let orderjson = await rsp.json()
    let order = orderjson.result

    $( '#OrderID' ).html( orderref )
    $( '#CtxAmount' ).html( order.CtxAmount + ' ' + order.CtxCurr )
    $( '#CtxMethod' ).html( order.CtxMethod )

    if (order.CtxMethod === 'BTCMAINNET') {
      let pmtreq = 'bitcoin:' + order.OurRxAddr +
                   '?amount=' + order.CtxAmount

      let qrcode = new QRCode( "CtxPmtAddrQR", {
        text: pmtreq,
        width: 250,
        height: 250,
        colorDark: "#006900",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      } )
      $( '#CtxPmtAddrText' ).html(
        '<a class=fineprint ' +
        'href=https://www.blockchain.com/explorer/addresses/btc/' +
        order.OurRxAddr + '>' + order.OurRxAddr + '</a>' )
    }
    else
      $( '#CtxPmtAddr' ).html( order.OurRxAddr )

    $( '#CrxAmount' ).html( order.CrxAmount + ' ' + order.CrxCurr )
    $( '#CrxAddr' ).html( order.CrxCoords.CrxAddress )
    $( '#CrxMethod' ).html( order.CrxCoords.CrxMethod )

    let submitted = order.Submitted
    $( '#OrderSubmittedAt' ).html( BLDate.toReadableDate(submitted) )

    if (order.CtxReceived == 0) {
      let dueby = submitted + UIUTILS.ctxInterval( order.CtxMethod )
      $( '#CtxDueBy' ).html( BLDate.toReadableDate(dueby) )
      $( '#CtxReceivedAt' ).html( '<b>Awaiting Client</b>' )
      $( '#CtxReceivedAt' ).css( 'background-color', 'lightblue' )
    }
    else {
      $( '#CtxDueBy' ).html( 'Received' )
      $( '#CtxReceivedAt' ).html( BLDate.toReadableDate(order.CtxReceived) )
    }

    if (order.CtxReceived != 0) {
      let dueclient = order.CtxReceived  + UIUTILS.crxInterval(order.CrxMethod)
      $( '#CrxDueBy' ).html( BLDate.toReadableDate(dueclient) )
    }

    if (order.CrxSent) {
      $( '#CrxSentAt' ).html( BLDate.toReadableDate(order.CrxSent) )
      $( '#CrxReference' ).html( order.CrxRef )
    }

  }
  catch (err) {
    $( '#OrderID' ).html(
       "<span style='background-color:yellow;'>" +
       "<b>" +
       err.toString() +
       "</b>" +
       "</span>" )
  }
}
