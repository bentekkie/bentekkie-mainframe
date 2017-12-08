/**
 * Module dependencies.
 */

var passport = require('passport');
var Strategy = require('passport-http').BasicStrategy;
var express = require('express'),
    editor = require('./routes/editor'),
    dbutils = require('./dbutils'),
    routes = require('./routes'),
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
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}



app.get('/', routes.index);
app.get('/file/:fname', file.download);
app.get(/\/edit\/.*/,passport.authenticate('basic', { session: false }), editor.index);
app.get(/\/ls\/.*/,passport.authenticate('basic', { session: false }), editor.lsdir);
app.get(/\/mkdir\/.*/,passport.authenticate('basic', { session: false }), editor.mkdir);
app.get(/\/rmdir\/.*/,passport.authenticate('basic', { session: false }), editor.rmdir);
http.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});