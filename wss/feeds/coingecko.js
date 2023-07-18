// Sample response from coingecko:
//
// {
//   "bitcoin": {
//     "usd":23149,
//     "cad":30827
//   },
//
//   "ethereum": {
//     "usd":1590.49,
//     "cad":2118.03
//   },
//
//   "monero": {
//     "usd":176.17,
//     "cad":234.6
//   }
// }

const https = require('https');
const fs = require('fs');

const url = 'https://api.coingecko.com/api/v3/simple/price?' +
            'ids=ethereum%2Cmonero%2Cbitcoin&' +
            'vs_currencies=usd%2Ccad'

https.get( url, (res) => {

  let fullresponse = '';

  res.on('data', (chunk) => {
    fullresponse += chunk;
  });

  res.on( 'end', () => {
    let it = JSON.parse( fullresponse )

    let result = {
      BTCUSD: it["bitcoin"].usd,
      BTCCAD: it["bitcoin"].cad,
      ETHUSD: it["ethereum"].usd,
      ETHCAD: it["ethereum"].cad,
      XMRUSD: it["monero"].usd,
      XMRCAD: it["monero"].cad,
      timestamp: Date.now(),
      USDCAD: 0.0,
      USDCUSD: "1.00", // assume
      USDCCAD: 0.0
      DAIUSD: "1.00", // assume
      DAICAD: 0.0
    }

    result.USDCAD = Math.floor( Number.parseFloat( result.BTCCAD ) /
                                Number.parseFloat( result.BTCUSD ) *
                                100.0 ) / 100.0

    result.USDCCAD = result.USDCAD
    result.DAICAD = result.USDCAD

    fs.writeFileSync( './rates.json', JSON.stringify(result) )
  } );

}).on('error', (e) => {
  console.error(e);
});

