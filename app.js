var express 	  = require("express"),
	app           = express(),
	http          = require('http'),
	server        = http.createServer(app),
	path          = require('path'),
	siteUser      = require('./src/foiaFiler/schema/siteUser'),
	request       = require('./src/foiaFiler/schema/request'),
	bodyParser    = require('body-parser'),
	crypto        = require('crypto'),
	path          = require('path'),
	logger        = require('morgan'),
	cookieParser  = require('cookie-parser'),
	mongoose      = require('mongoose'),
	session       = require('express-session'),
	mongoose      = require('mongoose'),
	passport      = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	bcrypt        = require('bcrypt-nodejs'),
	async         = require('async'),
	user 		  = mongoose.model('User', siteUser),
	flash 		  = require('express-flash'),
	requestInfo   = mongoose.model('Request', request),
	data = require('./src/foiaFiler/data/global.js'),
	sendgrid 			= require('sendgrid')('foiaFiler','illini706');


// Connect to Mongolab--------
//mongoose.connect('mongodb://ejmurra:Rs42dtryn@ds039020.mongolab.com:39020/testapi');
mongoose.connect('mongodb://localhost:27017/test');

// Middleware---------
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname + '/src/foiaFiler/views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({ secret: "It's a secret key, what did you expect?" }));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));



// Use passport authentification
passport.use(new LocalStrategy(function(username, password, done) {
  siteUser.findOne({ username: username }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

//Stay logged in while navigating pages
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  siteUser.findById(id, function(err, user) {
    done(err, user);
  });
});



// Routes
app.get('/', function(req, res) {
  res.render('index', { title: 'Foia Filer', user: req.user });
});

app.get('/login', function(req, res) {
	res.render('login', {
		user: req.user
	});
});

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) return next(err)
    if (!user) {
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) return next(err);
      return res.redirect('/');
    });
  })(req, res, next);
});

app.get('/signup', function(req, res) {
  res.render('signup', {
    user: req.user
  });
});

app.post('/signup', function(req, res) {
  var user = new siteUser({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      firstName : req.body.firstName,
      lastName : req.body.lastName,
      myPhone : req.body.myPhone,
      myOrg : req.body.myOrg,
      myPosition : req.body.myPosition,
      myAddress : req.body.myAddress,
      myAddressTwo : req.body.myAddressTwo,
      myTown : req.body.myTown,
      myState : req.body.myState,
      myZip : req.body.myZip
    });

  user.save(function(err) {
  	req.logIn(user, function(err){
  		res.redirect('/');
  	});
  });

});

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get('/forgot', function(req, res) {
  res.render('forgot', {
    user: req.user
  });
});

app.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      siteUser.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      sendgrid.send({
      to: user.email,
      from: 'passwordreset@foiaFiler.com',
      subject: 'FoiaFiler Password Reset',
      text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
        'http://' + req.headers.host + '/reset/' + token + '\n\n' +
        'If you did not request this, please ignore this email and your password will remain unchanged.\n'
    	},
			function(err, json) {
		  	if (err) { return console.error(err); }
				console.log(json);
				req.flash('info', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
				})
    	}
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

app.get('/reset/:token', function(req, res) {
  siteUser.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

app.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      siteUser.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      sendgrid.send({
			to: user.email,
			from: 'passwordreset@foiaFiler.com',
			subject: 'Your password has been changed',
			text: 'Hello,\n\n' +
					'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
		},
		function(err, json) {
			if (err) { return console.error(err); }
		console.log(json);
		req.flash('success', 'Success! Your password has been changed.');
		})
	}
  ], function(err) {
    res.redirect('/');
  });
});

app.set('username', {username : user.username});

app.get('/profile', function(req, res) {
  res.render('profile', {
    user: req.user,
    username: req.user.username,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    myOrg: req.user.myOrg,
    myPosition: req.user.myPosition,
    myPhone: req.user.myPhone,
    myAddress: req.user.myAddress,
    myAddressTwo: req.user.myAddressTwo,
    myTown: req.user.myTown,
    myState: req.user.myState,
    myZip: req.user.myZip,
    email: req.user.email
  });
});

app.get('/request', function(req, res) {
	res.render('request', {
		user: req.user
	});
});
var newestId = new String()
var requestArray = new Array(3)
app.post('/request', function(req, res){
  var request = new requestInfo({
  	subject: req.body.subject,
  	toName: req.body.toName,
  	toEmail: req.body.toEmail,
  	feeWaiver: req.body.feeWaiver,
  	request : req.body.request
  });
	newestId = request._id
	console.log(newestId)


  request.save(function(err) {
  	res.redirect('/review')
  });
});
var requestArray = new Array(3)
app.get('/review', function(req,res){
	var requery
	user = req.user

	requery = requestInfo.findById(newestId, "subject toEmail request", function(err,docs){
		if(err){
			console.log("error")
		}
		else {
				requestArray[0] = docs.subject
				requestArray[1] = docs.toEmail
				requestArray[2] = docs.request
				return requestArray
		}
	});
	//console.log(docs.subject)
	console.log(requestArray[1])
	console.log(newestId)
	res.render('review', {
			user: req.user,
	  	subject: requestArray[0],
      //toName: requestArray[],
      toEmail: requestArray[1],
      request : requestArray[2],
      firstName: user.firstName,
      lastName: user.lastName,
      myOrg: user.myOrg,
      myPosition: user.myPosition,
      myPhone: req.user.myPhone,
      myAddress: req.user.myAddress,
      myAddressTwo: req.user.myAddressTwo,
      myTown: req.user.myTown,
      myState: req.user.myState,
      myZip: req.user.myZip
	});
});

// app.post('/review', function(requestInfo, user, done) {
//       var Transport = nodemailer.createTransport({
//         service: 'Gmail',
//         auth: {
//           user: 'foiaFiler@gmail.com',
//           pass: 'illini706'
//         }
//       });
//       var mailOptions = {
//         to: requestInfo.toEmail,
//         from: 'foiaFiler@gmail.com',
//         subject: 'Foia request: ' + requestInfo.requestID,
//         text: "My name is " + user.firstName + " " + user.lastName + " and I am a " + user.position + " at " + user.myOrg + "." + "I am requesting the following information under the Illinois Freedom of Information Act: \n\n" +
//         requestInfo.request +
//
//       	"I ask that you waive any and all fees associated with the gathering of this information as I am collecting and reporting on this information in the public interest." +
//
//
//     	"I also ask that you cite reasons for any redactions pursuant to Illinois FOIA law." +
//     	"My contact info is as follows: \n" +
//     	user.firstName + " " + user.lastName + "\n" +
//     	user.myAddress + "\n" +
//     	user.myAddressTwo + "\n" +
//     	user.myTown + "," + user.myState + " " + user.myZip + "\n" +
//     	"Phone: " + user.myPhone + "\n\n" +
//     	"Much appreciated," +
//     	user.firstName + " " + user.lastName
//       };
//       Transport.sendMail(mailOptions, function(err) {
//         req.flash('success', 'Success! Your message has been sent.');
//         done(err);
//       });
//     })
