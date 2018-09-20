/**
 * Module dependencies.
*/

import express, { favicon as _favicon, logger as expressLogger, bodyParser, methodOverride, static as _static, errorHandler } from 'express';
import { download } from './routes/file';
import { join } from 'path';
import favicon from 'serve-favicon';
import { createServer } from 'http';
import { create } from 'greenlock-express';
import { createServer as _createServer } from 'https';
import socketIo from 'socket.io';
import redirectHttps from 'redirect-https';
import sockets from './sockets';
import logger from './logger';

var app = express();


// all environments

app.set('port', process.env.PORT || 2000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/client/build/favicon.ico'));
app.use(_favicon());
app.use(expressLogger('dev'));
app.use(bodyParser());
app.use(methodOverride());
app.use(app.router);

app.use("/static",_static(join(__dirname, 'client', 'build', 'static')));
app.use('/static', _static(join(__dirname, 'editor', 'build', 'static')));
app.get('/file/:fname', download);
// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}
app.get("/",function(req, res) {
    res.sendfile(join(__dirname ,'client' ,'build'+'/index.html'));
})
app.get('/file/:fname', download);
if ("dev" === process.argv[2]) {
    const server = createServer(app)
    const io = socketIo(server);
    sockets(io);
    server.listen(app.get('port'),() => logger.log("info","Dev server running on port" + app.get('port')))
} else {
    const PROD = true;
    const lex = create({
      version: 'v02',
      server: PROD ? 'https://acme-v02.api.letsencrypt.org/directory' : 'staging',
      approveDomains: (opts, certs, cb) => {
        if (certs) {
          // change domain list here
          opts.domains = ['bentekkie.com','www.bentekkie.com']
        } else {
          // change default email to accept agreement
          opts.email = 'bentekkie@gmail.com';
          opts.agreeTos = true;
        }
        cb(null, { options: opts, certs: certs });
      }
    });
    const middlewareWrapper = lex.middleware;
    
    var https = _createServer(
      lex.httpsOptions,
      middlewareWrapper(app)
    );
    
    
    const io = socketIo(https);
    sockets(io);
    createServer(lex.middleware(redirectHttps())).listen(app.get('port'));
    https.listen(parseInt(app.get('port'))+1);
}


