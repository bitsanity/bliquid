var UIUTILS = (function() {

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
    else if (curr == 'DAI')
      result = Number.parseFloat(amt) * Number.parseFloat(Rates.DAICAD)
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
    } else if (curr === 'GBP') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.GBPCAD)
      result = Math.floor( result * 100.0 ) / 100.0
    } else if (curr === 'EUR') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.EURCAD)
      result = Math.floor( result * 100.0 ) / 100.0
    } else if (curr == 'BTC') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.BTCCAD)
      result = Math.floor( result * 100000000.0 ) / 100000000.0
    } else if (curr == 'ETH') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.ETHCAD)
      result = Math.floor( result * 1000000.0 ) / 1000000.0
    } else if (curr == 'XMR') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.XMRCAD)
      result = Math.floor( result * 1000000.0 ) / 1000000.0
    } else if (curr == 'USDC') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.USDCCAD)
      result = Math.floor( result * 10000.0 ) / 10000.0
    } else if (curr == 'DAI') {
      result = Number.parseFloat(amt) / Number.parseFloat(Rates.DAICAD)
      result = Math.floor( result * 10000.0 ) / 10000.0
    }

    return result
  }

  return {
    toCAD : toCAD,
    cadToCurr : cadToCurr
  }

})();
