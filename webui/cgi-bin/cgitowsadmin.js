//
// The cgitows for admin-only functions. The only difference is we have an
// admin key for the service instead of the one used by the web interface
// for the gen public.
//

const cgitows = require( './cgitows.js' )

cgitows.setPrivateKey( "8a48f71c386c7dca2e2ba0af433ef3c1bc26f1dfaa6b8071ec9952b950a4bccf" )
// pub: 0226197fbe11d59cba58088883610c941886d8784701b04cda5def05255305d861

module.exports.doit = function( meth ) {
  return cgitows.doit( meth )
}
