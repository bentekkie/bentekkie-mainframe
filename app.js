
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  ,	api = require('./routes/api')
  , file = require('./routes/file')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , favicon = require('serve-favicon')
  , gb = require('./routes/gb')
  , help = require('./routes/help')
  , autocomp = require('./routes/autocomp');
var app = express();

// all environments
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

function ensureSecure(req, res, next){
  if(req.secure){
    // OK, continue
    return next();
  };
  res.redirect('https://'+req.host+req.url); // handle port numbers if non 443
};

app.all('*', ensureSecure);

app.get('/', routes.index);
app.get('/users', user.list);
app.get('/api/:cmd', api.api);
app.get('/cmdlst', api.cmdlst);
app.get('/file/:fname',file.download);
app.get('/gb/read',gb.read);
app.get('/help/:cmd',help.cmd);
app.get('/autocomp/:cmd',autocomp.getautos);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
