# Omnes [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Extract `zip`, `tar`, `gz`, `tar.gz`, `tgz` archives middleware based on [socket.io](http://socket.io "Socket.io") and [inly](https://github.com/coderaiser/node-inly "Inly").

## Install

```
npm i omnes --save
```

## Client

Could be loaded from url `/omnes/omnes.js`.

```js
const prefix = '/omnes';

omnes(prefix, function(packer) {
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
const omnes = require('omnes');
const http = require('http');
const express = require('express');
const io = require('socket.io');
const app = express();
const server = http.createServer(app);
const socket = io.listen(server);

server.listen(1337);

app.use(omnes({
    authCheck: (socket, success) => {
        success();
    }
});

omnes.listen(socket, {
    prefix: '/omnes',   /* default              */
    root: '/',          /* string or function   */
});
```

## Environments

In old `node.js` environments that not fully supports `es2015`, `omnes` could be used with:

```js
var omnes = require('omnes/legacy');
```

## Related

- [Ishtar](https://github.com/coderaiser/node-ishtar "Ishtar") - Pack and extract .tar.gz archives middleware.
- [Salam](https://github.com/coderaiser/node-salam "Salam") Pack and extract `zip` archives middleware.

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/omnes.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/node-omnes.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/omnes "npm"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/node-omnes "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

[BuildStatusURL]:           https://travis-ci.org/coderaiser/node-omnes  "Build Status"
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/node-omnes/master.svg?style=flat

