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
var http = require('http').Server(app);
var io = require('socket.io')(http);
var a = require('./sockets')(io);
// all environments
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
http.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});