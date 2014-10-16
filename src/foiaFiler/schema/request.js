var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var request = new mongoose.Schema({
    subject : String,
    toName : String,
    toEmail : String,
    resolved : { type: Boolean, default: false},
    date : { type: Date, default: Date.now },
    request : String,
    siteUser_id : String
});

request.virtual('requestId').get(function() {
    return this._id;
});

module.exports = mongoose.model('Request', request);
