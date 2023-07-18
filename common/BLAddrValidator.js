var BLAddrValidator = (function() {

  // should accept Bech32 and Legacy address formats
  const BITCOINREGEX= /\b(bc(0([ac-hj-np-z02-9]{39}|[ac-hj-np-z02-9]{59})|1[ac-hj-np-z02-9]{8,87})|[13][a-km-zA-HJ-NP-Z1-9]{25,35})\b/

  const VALIDEMAILREGEX = /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,5})$/

  const RAWMONEROREGEX = 
   /[48][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{94}/

  const INTGMONEROREGEX =
   /[48][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{105}/

  function isValidBTCAddr( strAddr ) {
    return BITCOINREGEX.test( strAddr )
  }

  function bitcoinRules() {
    return `
- A BTC address begins with 1 (P2PKH), 3 (P2SH), or bc1 (Bech32).
- It contains digits in the range of 0 to 9.
- It allows uppercase and lowercase characters.
- It does not contain whitespace and other special characters.
- Uppercase O and I, and lowercase l are not used in Legacy Addresses.
- Legacy Addresses contain 26-35 alphanumeric characters.
- Bech32 addresses are 14-74 alphanumeric characters.
`
  }

  function lightningRules() {
    return 'A Lightning address should resemble an email address.'
  }

  function isValidEmail( strEmail ) {
    return VALIDEMAILREGEX.test( strEmail )
  }

  function interacRules() {
    return 'INTERAC receive address should be an email address.'
  }

  function isValidEth( val ) {
    return /^0[xX][0-9a-fA-F]{40}$/.test(val)
  }

  function ethRules() {
    return 'Ethereum address should be "0x" and 40 hexadecimal characters'
  }

  function isValidPolygon( val ) {
    return /^0[xX][0-9a-fA-F]{40}$/.test(val)
  }

  function polygonRules() {
    return 'Polygon address should be "0x" and 40 hexadecimal characters'
  }

  function isValidMonero( val ) {
    return RAWMONEROREGEX.test( val ) || INTGMONEROREGEX.test( val )
  }

  function moneroRules() {
    return `
- A Monero standard address is 95 characters in Monero-specific Base58 format.
- An integrated address is 106 characters of the Monero Base58 format.
- Monero addresses begin with a 4 or an 8.
`
  }

  function wiseRules() {
    return 'WISE address should be an email address.'
  }

  function zelleRules() {
    return 'ZELLE address should be an email address.'
  }

  function isValidIBAN( val ) {
    val.replace( ' ', '' ) // strip spaces
    return /[A-Z]{2}\d{2}[0-9A-Z]{,30}/.test( val )
  }

  function ibanRules() {
    return `
IBAN consists of up to 34 alphanumeric characters comprising a country code;
two check digits; and a number that includes the domestic bank account number,
branch identifier and potential routing information.
`
  }

  return {
    isValidBTCAddr : isValidBTCAddr,
    bitcoinRules : bitcoinRules,
    lightningRules : lightningRules,
    isValidEmail : isValidEmail,
    interacRules : interacRules,
    isValidEth : isValidEth,
    ethRules : ethRules,
    isValidPolygon : isValidPolygon,
    polygonRules : polygonRules,
    isValidMonero : isValidMonero,
    moneroRules : moneroRules,
    wiseRules : wiseRules,
    zelleRules : zelleRules,
    isValidIBAN : isValidIBAN,
    ibanRules : ibanRules
  }

})();
