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



const PROD = false;
const lex = require('greenlock-express').create({
  server: PROD ? 'https://acme-v01.api.letsencrypt.org/directory' : 'staging',

  approveDomains: (opts, certs, cb) => {
    if (certs) {
      // change domain list here
      opts.domains = ['bentekkiemainframe-env.aizyyr2mr9.us-west-2.elasticbeanstalk.com', 'bentekkie.com']
    } else {
      // change default email to accept agreement
      opts.email = 'bentekkie@gmail.com';
      opts.agreeTos = true;
    }
    cb(null, { options: opts, certs: certs });
  }
});
const middlewareWrapper = lex.middleware;

var https = require('https').createServer(
  lex.httpsOptions,
  middlewareWrapper(app)
);


var io = require('socket.io')(https);
var a = require('./sockets')(io);
const redirectHttps = require('redirect-https');
require('http').createServer(lex.middleware(redirectHttps())).listen(app.get('port'));
https.listen(parseInt(app.get('port'))+1);
