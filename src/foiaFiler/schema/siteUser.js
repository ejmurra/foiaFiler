var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    bcrypt = require('bcrypt-nodejs');

var siteUser = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    myPhone : { type: String, required: false },
    myOrg : { type: String, required: false },
    myPosition : { type: String, required: false },
    myAddress : { type: String, required: false },
    myAddressTwo : String,
    myTown : { type: String, required: false },
    myState : { type: String, required: false },
    myZip : { type: String, required: false },
    firstName : {type: String, required: false},
    lastName : {type: String, required: false}
});

// Schema shit -------


// Hash on model save
siteUser.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 10;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

// Password verification
siteUser.methods.comparePassword = function(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
        if(err) return cb(err);
        cb(null, isMatch);
    });
};



module.exports = mongoose.model('User', siteUser);

