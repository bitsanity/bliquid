const bitcoin = require('./bitcoin.js')

let addr = process.argv[2]
let reqid = 'hello'

bitcoin.balance( addr, reqid, resobj => {
  console.log( resobj )
} )

