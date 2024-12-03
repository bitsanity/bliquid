var UIUTILS = (function() {

  function ctxInterval( method ) {
    if (method === 'BTCMAINNET')
      return BLDate.FOURHOURSMS

    if (method === 'BTCLIGHTNING')
      return BLDate.FOURHOURSMS

    if (method === 'INTERAC')
      return BLDate.TWENTYFOURHOURSMS

    if (method === 'CANADAPOST')
      return BLDate.TWENTYFOURHOURSMS * 10 // ten days

    return 0
  }

  function crxInterval( method ) {
    return BLDate.TWENTYFOURHOURSMS
  }

  function toCAD( amt, curr ) {
    let result

    if (curr === 'CAD') {
      result = amt
    }
    else if (curr === 'USD') {
      let usdcad =   Number.parseFloat( Rates['bitcoin']['cad'] )
                   / Number.parseFloat( Rates['bitcoin']['usd'] )
      result = Number.parseFloat(amt) * usdcad
    }
    else if (curr == 'BTC')
      result =   Number.parseFloat(amt)
               * Number.parseFloat(Rates['bitcoin']['cad'])
    else if (curr == 'ETH')
      result =   Number.parseFloat(amt)
               * Number.parseFloat(Rates['ethereum']['cad'])
    else
      throw 'uiutils.toCAD unsupported currency: ' + curr

    result = Math.floor(result * 100.0) / 100.0
    return result
  }

  function cadToCurr( amt, curr ) {
    let result = amt

    if (curr === 'CAD') {
      result = Math.floor( result * 100.0 ) / 100.0
    } else if (curr === 'USD') {
      let usdcad =   Number.parseFloat( Rates['bitcoin']['cad'] )
                   / Number.parseFloat( Rates['bitcoin']['usd'] )
      result = Number.parseFloat(amt) / usdcad
      result = Math.floor( result * 100.0 ) / 100.0
    } else if (curr == 'BTC') {
      result =   Number.parseFloat(amt)
               / Number.parseFloat( Rates['bitcoin']['cad'] )
      result = Math.floor( result * 100000000.0 ) / 100000000.0
    } else if (curr == 'ETH') {
      result =   Number.parseFloat(amt)
               / Number.parseFloat(Rates['ethereum']['cad'])
      result = Math.floor( result * 100000000.0 ) / 100000000.0
    } else
      throw 'uiutils.cadToCurr unrecognized curr: ' + curr

    return result
  }

  return {
    ctxInterval : ctxInterval,
    crxInterval : crxInterval,
    toCAD : toCAD,
    cadToCurr : cadToCurr
  }

})();
