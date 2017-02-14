# Salam [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Pack and extract `zip` archives middleware based on [socket.io](http://socket.io "Socket.io") and [onezip](https://github.com/coderaiser/node-onezip "OneZip").

## Install

```
npm i salam --save
```

## Client

Could be loaded from url `/salam/salam.js`.

```js
const prefix = '/salam';

salam(prefix, function(packer) {
    const from = '/';
    const to = '/tmp';
    const names = [
        'bin'
    ];
    
    const progress = (value) => {
        console.log('progress:', value);
    };
    
    const end = () => {
        console.log('end');
        packer.removeListener('progress', progress);
        packer.removeListener('end', end);
    };
    
    packer.pack(from, to, names);
    
    packer.on('progress', progress);
    packer.on('end', end);
    packer.on('error', (error) => {
        console.error(error.message);
    });
});

```

## Server

```js
var salam = require('salam');
const http = require('http');
const express = require('express');
const io = require('socket.io');
const app = express();
const server = http.createServer(app);
const socket = io.listen(server);

server.listen(1337);

app.use(salam({
    authCheck: (socket, success) => {
        success();
    }
});

salam.listen(socket, {
    prefix: '/salam',   /* default              */
    root: '/',          /* string or function   */
});
```

## Environments

In old `node.js` environments that not fully supports `es2015`, `salam` could be used with:

```js
var salam = require('salam/legacy');
```

## Related

- [Ishtar](https://github.com/coderaiser/node-ishtar "Ishtar") - Pack and extract .tar.gz archives middleware.

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/salam.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-salam.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/salam "npm"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-salam "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-salam  "Build Status"
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-salam/master.svg?style=flat

