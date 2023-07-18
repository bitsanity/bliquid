module.exports.RESET = '\x1b[0m'
module.exports.BOLD = '\x1b[1m'
module.exports.RED = '\x1b[31m'
module.exports.GREEN = '\x1b[32m'
module.exports.YELLOW = '\x1b[33m'

module.exports.norm = function( tag, value ) {
  console.log( '\x1b[1m%s\x1b[0m: \x1b[33m%s\x1b[0m', tag, value )
}

module.exports.alarm = function( tag, value ) {
  console.log( '\x1b[1m%s\x1b[0m: \x1b[31m%s\x1b[0m', tag, value )
}

module.exports.toColour = function( str, colour ) {
  return colour + str + module.exports.RESET
}
