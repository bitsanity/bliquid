const STATUSURL = "ws://localhost:8443"
const STATUSREQ = {
  jsonrpc: "2.0",
  method: "status",
  params: [],
  id: 0
}

function fetchStatus( orderref ) {
  let socket = new WebSocket( STATUSURL )
  let req = JSON.parse( JSON.stringify(STATUSREQ) )
  req.params = [orderref]

  socket.addEventListener( 'open', (e) => {
    socket.send( JSON.stringify(req) )
  } )

  socket.addEventListener( 'message', (msg) => {
    let rsp
    try {
      rsp = JSON.parse( msg.data )
      if (rsp.error) $('#Status').html( rsp.error.message )
      if (rsp.result) {

        $('#SubmitStatus').html( BLDate.toReadableDate(rsp.result.Submitted) )

        let cancelled = rsp.result.Cancelled && rsp.result.Cancelled != 0
        $('#CancelStatus').html(
          (cancelled) ? BLDate.toReadableDate(rsp.result.Cancelled)
                      : 'false' )

        let payReceived = rsp.result.Cancelled && rsp.result.CtxReceived != 0
        if (payReceived)
          $('#CtxReceivedStatus').html(
            BLDate.toReadableDate(rsp.result.CtxReceived) )
        else {
          if (Date.now() > (rsp.result.Submitted + BLDate.FOURHOURSMS))
            $('#CtxReceivedStatus').html( '<font color=red>overdue</font>' )
          else
            $('#CtxReceivedStatus').html( 'pending' )
        }

        let settleSent = rsp.result.CrxSent && rsp.result.CrxSent != 0
        $('#CrxSentStatus').html(
          (settleSent) ? BLDate.toReadableDate(rsp.result.CrxSent)
                       : 'false' )
      }
    } catch( e ) {
      alert( 'invalid response: ' + e )
    }
  } )

  socket.addEventListener( 'error', (evt) => {
    $('#Status').html( '[FAIL] Get status - socket error' )
  } )
}

