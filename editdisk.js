var disk = require('./disk')
var express = require('express'),
    routes = require('./routes'),
    editor = require('./routes/editor'),
    dbutils = require('./dbutils'),
    path = require('path'),
    favicon = require('serve-favicon');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

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

app.get('/save',editor.download)
app.get(/\/edit\/.*/, editor.index);
app.get(/\/mkdir\/.*/, editor.mkdir);
app.get(/\/rmdir\/.*/, editor.rmdir);
io.on('connection', function(socket){
	console.log("connected")
	socket.on('save',editor.save)
})
http.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});