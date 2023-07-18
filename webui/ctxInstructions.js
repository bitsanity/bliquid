const PAYINSTRURL = "ws://localhost:8443"
const PAYINSTRREQ = {
  jsonrpc: "2.0",
  method: "ctxInstr",
  params: [],
  id: 0
}

function fetchInstructions( orderref ) {
  let socket = new WebSocket( PAYINSTRURL )

  let req = JSON.parse( JSON.stringify(PAYINSTRREQ) )
  req.params = [orderref]
  socket.addEventListener( 'open', (e) => {
    socket.send( JSON.stringify(req) )
  } )

  socket.addEventListener( 'message', (msg) => {
    let rsp
    try {
      rsp = JSON.parse( msg.data )
      if (rsp.error) $('#Instructions').html( rsp.error.message )
      if (rsp.result) {
        let deadline =
          (rsp.result.CrxCurr === 'USD' || rsp.result.CrxCurr === 'CAD')
          ? 'twelve (12) business hours'
          : 'four (4) hours'

        let text =
'<ol>' +
'<li>For the Order received and processed at ' +
BLDate.toReadableDate(rsp.result.Submitted) + '\n\n' +
'<li>CLIENT agrees to send <span style="font-weight:bold;background:yellow">' +
rsp.result.CtxAmount + ' ' + rsp.result.CtxCurr +
'</span> to B-LIQUID CRYPTOS LTD.\n\n'+
'<li>CLIENT agrees to send payment to our address (QR code shown at left):' +
'\n\n\t' +
'<span class=highlit>' + rsp.result.OurRxAddr + '</span>\n\n'

if (rsp.result.CtxCurr === 'CAD' || rsp.result.CtxCurr === 'USD')
  text += 'a. Please include the order reference <span class=highlit>' +
          orderref +
          '</span> in the memo/notes field.\n' +
          'b. Please set the answer to the security question as ' +
          '<span class=highlit>b-liquid</span>\n\n'

  let payby =
    BLDate.toReadableDate( rsp.result.Submitted + BLDate.FOURHOURSMS )

text += '<li>CLIENT agrees to ensure payment arrives by <span class=highlit>' +
payby +
'</span>\n\n' +
'<li>B-LIQUID CRYTPOS LTD. agrees to convert payment at an \n' +
'exchange rate of ' + rsp.result.Rate + '\n\n' +
'<li>B-LIQUID will deduct fees totaling ' +
rsp.result.Fees.total + ' ' + rsp.result.Fees.curr + '\n\n' +
'<li>B-LIQUID will settle this agreement by sending <b>' +
rsp.result.CrxAmount + ' ' + rsp.result.CrxCurr +
'</b>\nto CLIENT\'s <b>' + rsp.result.CrxCoords.CrxMethod +
'</b> address:\n\n\t<b>' + rsp.result.CrxCoords.CrxAddress +
'</b>\n\nwithin ' + deadline + ' of receipt of CLIENT\'s payment.\n\n' +
'</ol>\n' +
'    Please review this carefully and continue by sending payment.\n\n' +
'    View the status of this order any time '

let href = './saleStatus.html?id=' + orderref

  text += '<a href="' + href + '">here</a>.'

        let qrcode = new QRCode( "OurRxAddrQR", {
          text: rsp.result.OurRxAddr,
          width: 250,
          height: 250,
          colorDark: "#008080",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        } );

        $('#Instructions').html( text )
      }
    } catch( e ) {
      alert( 'invalid response: ' + e )
    }
  } )

  socket.addEventListener( 'error', (evt) => {
    $('#Instructions').html(
      '[FAIL] Get payment instructions - socket error'
    )
  } )
}

