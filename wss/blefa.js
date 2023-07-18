//
// B-LIQUID ENCRYPTING BASIC FILE ADAPTER
//
const fs = require( 'fs' )
const b64codec = require( 'base64-js' )
const aes = require( 'aes-js' )

const DBREPO = './bldb/'
const DBFILE = DBREPO + 'bliquid.black.b64'

var AESKeyBytes

module.exports.setAESKey = function( aeskeybytes ) {
  AESKeyBytes = aeskeybytes
}

module.exports.loadDatabase = function( dbname, callback ) {
  if (!fs.existsSync(DBREPO)) {
    return callback( new Error( DBREPO + " does not exist.") )
  }

  console.log( 'loading database ' + dbname + ' from ' + DBFILE )

  try {
    let strRed = ""
    let strBlkDbB64 = fs.readFileSync( DBFILE, 'utf8' )
    let blkBytes = b64codec.toByteArray( strBlkDbB64 )
    let aesCtr = new aes.ModeOfOperation.ctr( AESKeyBytes )
    let redBytes = aesCtr.decrypt( blkBytes )
    strRed = Buffer.from( redBytes ).toString( 'UTF-8' )

    if (callback) callback( strRed )
  }
  catch( e ) {
    console.log( e )
    if (callback) callback( new Error("Problem loading " + dbname) )
  }
}

module.exports.saveDatabase = function( dbname, dbstring, callback ) {
  if (!fs.existsSync(DBREPO)) {
    return callback( new Error( DBREPO + " does not exist.") )
  }

  console.log( 'saving database ' + dbname + ' to ' + DBFILE )

  try {
    let redBytes = Buffer.from( dbstring )
    let aesCtr = new aes.ModeOfOperation.ctr( AESKeyBytes )
    let blkBytes = aesCtr.encrypt( redBytes )
    let strBlk = b64codec.fromByteArray( blkBytes )
    fs.writeFileSync( DBFILE, strBlk ) // utf8 is default encoding

    if (callback) callback( null )
  }
  catch( e ) {
    console.log( e )
    if (callback) callback( new Error("Problem saving " + dbname) )
  }
}

