/**
 * Module dependencies.
*/

var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;
var express = require('express'),
    dbutils = require('./dbutils'),
    file = require('./routes/file'),
    path = require('path'),
    favicon = require('serve-favicon');
var app = express();

function approveDomains(opts, certs, cb) {
  // This is where you check your database and associated
  // email addresses with domains and agreements and such


  // The domains being approved for the first time are listed in opts.domains
  // Certs being renewed are listed in certs.altnames
  if (certs) {
    opts.domains = certs.altnames;
  }
  else {
    opts.email = 'john.doe@example.com';
    opts.agreeTos = true;
  }

  // NOTE: you can also change other options such as `challengeType` and `challenge`
  // opts.challengeType = 'http-01';
  // opts.challenge = require('le-challenge-fs').create({});

  cb(null, { options: opts, certs: certs });
}


var lex = require('greenlock-express').create({
  // set to https://acme-v01.api.letsencrypt.org/directory in production
  server: 'staging'

// If you wish to replace the default plugins, you may do so here
//
, challenges: { 'http-01': require('le-challenge-fs').create({ webrootPath: '/tmp/acme-challenges' }) }

,  store: require('le-store-certbot').create({ webrootPath: '/tmp/acme-challenges' }),
// You probably wouldn't need to replace the default sni handler
// See https://git.coolaj86.com/coolaj86/le-sni-auto if you think you do
//, sni: require('le-sni-auto').create({})

, approveDomains: [ 'bentekkiemainframe-env.aizyyr2mr9.us-west-2.elasticbeanstalk.com', 'www.bentekkiemainframe-env.aizyyr2mr9.us-west-2.elasticbeanstalk.com' ]
});



// all environments

/*
if(process.env.PORT){
  app.get('*', function(req, res, next) {
    //http://docs.aws.amazon.com/ElasticLoadBalancing/latest/DeveloperGuide/TerminologyandKeyConcepts.html#x-forwarded-proto
    if (req.get('x-forwarded-proto') != "https") {
        res.set('x-forwarded-proto', 'https');
        res.redirect('https://' + req.get('host') + req.url);
    } else {
        next();
    }
});
}
*/

passport.use(new Strategy(dbutils.validateUser));

app.set('port', process.env.PORT || 2000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/client/build/favicon.ico'));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);

app.use("/static",express.static(path.join(__dirname, 'client', 'build', 'static')));
app.use('/static', express.static(path.join(__dirname, 'editor', 'build', 'static')));
app.get('/file/:fname', file.download);
// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}
app.get("/editor",passport.authenticate('basic', { session: false }),function(req, res) {
    res.sendfile(path.join(__dirname ,'editor', 'build'+'/index.html'));
})
app.get("/",function(req, res) {
    res.sendfile(path.join(__dirname ,'client' ,'build'+'/index.html'));
})
app.get('/file/:fname', file.download);
// handles acme-challenge and redirects to https
var http = require('http').createServer(lex.middleware(require('redirect-https')())).listen(parseInt(app.get('port')), function () {
  console.log("Listening for ACME http-01 challenges on", this.address());
});
// handles your app
var https = require('https').createServer(lex.httpsOptions, lex.middleware(app)).listen(parseInt(app.get('port'))+1, function () {
  console.log("Listening for ACME tls-sni-01 challenges and serve app on", this.address());
});

var io = require('socket.io')(https);
var a = require('./sockets')(io);
