# squad [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Right-to-left function composition. The rightmost function may have any arity. The remaining functions must be unary.

## Install

```
npm i squad --save
bower i squad --save
```

## How to use?

```js
let squad   = require('squad');

let buzz    = str => str + '... zzz...';
let scream  = str => str.toUpperCase();
let noise   = squad(buzz, scream);

noise('hello');
// returns
'HELLO... zzz....'
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/squad.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/squad/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/squad.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/squad "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/squad  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/squad "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

