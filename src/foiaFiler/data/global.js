var mongoose = require('mongoose'),
    user 		  = mongoose.model('User', siteUser),
    requestInfo   = mongoose.model('Request', request),
    siteUser      = require('../schema/siteUser'),
    request       = require('../schema/request'),
    requestInfo   = mongoose.model('Request', request),

grabUser = function(user,query){
  var query = User.findOne({'username':user});
  return query.select('email myPhone myOrg myPosition myAddress myAddressTwo myTown myState myZip firstName lastName');
}

exports.grabRequest = function(user,requery){
  var requery = requestInfo.findOne({'siteUser_id':user});
  return requery.select('subject toName toEmail resolved date request');
}
