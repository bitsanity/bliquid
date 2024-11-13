const https = require('https');

// sample response from coingecko
// {
//   "bitcoin":{"usd":66616,"cad":92191},
//   "ethereum":{"usd":2519.24,"cad":3486.43}
// }

const CGURL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum%2Cbitcoin&vs_currencies=usd,cad';

var cached = {}

exports.getRates = function() {
  return cached
}

exports.fetchRates = function() {
  https.get( CGURL, (res) => {

    let fullresponse = '';

    res.on('data', (chunk) => {
      fullresponse += chunk;
    });

    res.on( 'end', () => {
      cached = JSON.parse( fullresponse )
    } );
  }).on('error', (e) => {
    console.error(e);
  });
}

exports.toCAD = function( amt, curr ) {
  let result = amt

  if (curr === 'USD')
    result = Number.parseFloat(amt) / Number.parseFloat(cached.USDCAD)
  else if (curr == 'BTC')
    result = Number.parseFloat(amt) * Number.parseFloat(cached.BTCCAD)
  else if (curr == 'ETH')
    result = Number.parseFloat(amt) * Number.parseFloat(cached.ETHCAD)
  else if (curr == 'XMR')
    result = Number.parseFloat(amt) * Number.parseFloat(cached.XMRCAD)
  else if (curr == 'USDC')
    result = Number.parseFloat(amt) * Number.parseFloat(cached.USDCCAD)

  result = Math.floor(result * 100.0) / 100.0
  return result
}

exports.toCurrency = function(number) {
  let it = Number.parseFloat(number)
  return it.toLocaleString( 'en-US', { style: 'currency', currency: 'USD' } );
}

exports.cadToCurr = function( amt, curr ) {
  let result = amt

  if (curr === 'CAD') {
    result = Math.floor( result * 100.0 ) / 100.0
  } else if (curr === 'USD') {
    result = Number.parseFloat(amt) / Number.parseFloat(cached.USDCAD)
    result = Math.floor( result * 100.0 ) / 100.0
  }
  else if (curr == 'BTC') {
    result = Number.parseFloat(amt) / Number.parseFloat(cached.BTCCAD)
    result = Math.floor( result * 100000000.0 ) / 100000000.0
  }
  else if (curr == 'ETH') {
    result = Number.parseFloat(amt) / Number.parseFloat(cached.ETHCAD)
    result = Math.floor( result * 1000000.0 ) / 1000000.0
  }
  else if (curr == 'XMR') {
    result = Number.parseFloat(amt) / Number.parseFloat(cached.XMRCAD)
    result = Math.floor( result * 1000000.0 ) / 1000000.0
  }
  else if (curr == 'USDC') {
    result = Number.parseFloat(amt) / Number.parseFloat(cached.USDCCAD)
    result = Math.floor( result * 100.0 ) / 100.0
  }

  return result
}

exports.smokeTest = function() {
  exports.fetchRates()
}

