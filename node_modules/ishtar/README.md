# Ishtar [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL]

pack and extract .tar.gz archives middleware based on [socket.io](http://socket.io "Socket.io") and [jaguar](https://github.com/coderaiser/node-jaguar "Jaguar").

## Install

```
npm i ishtar --save
```

## Client

Could be loaded from url `/ishtar/ishtar.js`.

```js
var prefix = '/ishtar';

/* could be one argument: callback */
ishtar(prefix, function(packer) {
    var from        = '/',
        to          = '/tmp',
        names       = [
            'bin'
        ],
        progress    = function(value) {
            console.log('progress:', value);
        },
        
        end     = function() {
            console.log('end');
            packer.removeListener('progress', progress);
            packer.removeListener('end', end);
        };
    
    packer.pack(from, to, names);
    
    packer.on('progress', progress);
    packer.on('end', end);
    packer.on('error', function(error) {
        console.error(error.message);
    });
});

```

## Server

```js
var ishtar      = require('ishtar'),
    http        = require('http'),
    express     = require('express'),
    io          = require('socket.io'),
    app         = express(),
    port        = 1337,
    server      = http.createServer(app),
    socket      = io.listen(server);
    
server.listen(port);

app.use(ishtar({
    minify: true,
    online: true,
    authCheck: function(socket, success) {
    }
});

ishtar.listen(socket, {
    prefix: '/ishtar',   /* default              */
    root: '/',          /* string or function   */
});
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/ishtar.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-ishtar.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/ishtar "npm"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-ishtar "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

