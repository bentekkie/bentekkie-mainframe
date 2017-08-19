/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    file = require('./routes/file'),
    path = require('path'),
    favicon = require('serve-favicon');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var a = require('./sockets')(io);
// all environments
function ensureSecure(req, res, next) {
    if (req.secure) {
        // OK, continue
        return next();
    };
    res.redirect('https://' + req.host + req.url); // handle port numbers if non 443
};

app.all('*', ensureSecure);
app.set('port', process.env.PORT || 3000);
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

http.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});