var ACL = {

  // CGI public functions

  "036d084b5cf6649bc0711f0073af0f43b46e54b08e8b455652149eaad909074930" :
      { isEnabled : true, isAdmin : true },

  "046d084b5cf6649bc0711f0073af0f43b46e54b08e8b455652149eaad909074930b9902c0f076d31d40c0dce538bc181aa5de351ec2600db9425329101ae1d1181" :
      { isEnabled : true, isAdmin : true }

  // CGI admin functions

  "tbd1" : { isEnabled : true, isAdmin : true },

  "tbd2" : { isEnabled : true, isAdmin : true }

}

exports.isEnabled = function( pubkeyhex ) {
  return ACL[pubkeyhex].isEnabled
}

exports.isAdmin = function( pubkeyhex ) {
  return ACL[pubkeyhex].isEnabled
}

exports.smokeTest = function() {
}

