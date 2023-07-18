const bitcoind = require('./bitcoind.js')


bitcoind.balance( process.argv[2], 'hello', resobj => {
  console.log( resobj )
} )

