const ACL = {
  // CGI public functions
  "036d084b5cf6649bc0711f0073af0f43b46e54b08e8b455652149eaad909074930" :
      { isEnabled : true, isAdmin : false },

  // CGI admin functions
  "0226197fbe11d59cba58088883610c941886d8784701b04cda5def05255305d861" :
      { isEnabled : true, isAdmin : true },
}

exports.isEnabled = function( pubkeyhex ) {
  if (ACL[pubkeyhex])
    return ACL[pubkeyhex].isEnabled

  console.log( 'we dont know ' + pubkeyhex )
  return false
}

exports.isAdmin = function( pubkeyhex ) {
  if (ACL[pubkeyhex])
    return ACL[pubkeyhex].isAdmin

  return false
}

exports.smokeTest = function() {
  let userkey = Object.keys(ACL)[0]
  let adminkey = Object.keys(ACL)[1]

  console.log( '0 isEnabled: ' + exports.isEnabled(userkey) )
  console.log( '0 isAdmin: ' + exports.isAdmin(userkey) )
  console.log( '1 isEnabled: ' + exports.isEnabled(adminkey) )
  console.log( '1 isAdmin: ' + exports.isAdmin(adminkey) )
}

