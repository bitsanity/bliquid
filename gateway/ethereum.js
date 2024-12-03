const { Web3 } = require( 'web3' )
const web3 = new Web3( 'ws://10.0.0.113:8546' )
const EPKSCA = "0xadd556918186b073eb51fea466e742f53f3defe5"
const EPKABI = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes","name":"pubkey","type":"bytes"}],"name":"Registered","type":"event"},{"stateMutability":"payable","type":"fallback"},{"inputs":[{"internalType":"address payable","name":"newown","type":"address"}],"name":"chown","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"pubkey","type":"bytes"}],"name":"register","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"sweep","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]

const EPKCon = new web3.eth.Contract( EPKABI, EPKSCA );


// Contract.getPastEvents can take over a minute to complete and there's no
// way users will wait, so we cache

var epkCache = []
var blockHWM = 19208957 // block our Pubkey Registry was launched
const deploystamp = 1707704735 // unix time when launched

function toCache( tstamp, blknum, pkhex ) {

  let obj = {
    timestamp: tstamp,
    blocknum: blknum,
    pubkeyhex: pkhex
  }

  if (epkCache.length == 0) {
    epkCache.push( obj )
    return
  }

  let ix

  for( ix = 0; ix < epkCache.length; ix++ ) {
    if (tstamp < epkCache[ix].timestamp)
      break;
  }

  if (ix == epkCache.length) {
    epkCache.push( obj )
  }
  else {
    epkCache = epkCache.toSpliced( ix, 0, obj )
  }
}

// Populate cache with events since HWM

exports.syncEpks = function() {

  EPKCon.getPastEvents( 'Registered',
    { fromBlock: blockHWM, toBlock: 'latest' } )
  .then( events => {
    events.forEach( async evt => {
      let block = await web3.eth.getBlock( evt.blockNumber )
      toCache( block.timestamp, evt.blockNumber, evt.returnValues.pubkey )
      blockHWM = evt.blockNumber + BigInt(1)
    } )
  } )
  .catch( e => {
    console.log( 'error: ' + e )
  } )
}

//
// Retrieve any number of balances for the array of addresses provided.
// Each element of the array is a string expected to be an ethereum
// address with or without "0x" preamble
//

exports.ethBalances = async function( addrs ) {
  let result = []

  for (let ii = 0; ii < addrs.length; ii++) {

    let bal = '' + await web3.eth.getBalance(
      (/^0x/.test(addrs[ii])) ? addrs[ii]
                              : ('0x' + addrs[ii])
    ) 
  
    result.push( {
      address:addrs[ii],
      balance:bal
    } )
  }

  return result
}

// return all the pubkeys registered after the given timestamp

exports.ethEpkScan = async function( sincetimestamp ) {

  let result = []
  for( let ii = 0; ii < epkCache.length; ii++ ) {
    if (epkCache[ii].timestamp >= sincetimestamp)
      result.push( epkCache[ii].pubkeyhex )
  }

  return result
}

//
// TEST - expect the final order to be pubkey1, pubkey3, pubkey2
//

exports.smokeTest = function() {
  toCache( deploystamp + 10, blockHWM + 10, "pubkey1" )
  console.log( JSON.stringify(epkCache) + '\n' )

  toCache( deploystamp + 20, blockHWM + 20, "pubkey2" )
  console.log( JSON.stringify(epkCache) + '\n' )

  toCache( deploystamp + 15, blockHWM + 15, "pubkey3" )
  console.log( JSON.stringify(epkCache) + '\n' )
}

