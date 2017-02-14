# itchy [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL] [![Coverage Status][CoverageIMGURL]][CoverageURL]

Drop-in replacement of [async.eachSeries][eachSeries].

## Install

`npm i itchy --save`

## API

### itchy(array, iterator, done)

```js
const itchy = require('itchy');

const iterator = (n, fn) => {
    console.log(n);
    fn();
};

itchy([1, 2, 3], iterator, (error) => {
    console.log(error || 'done');
});
```

## Environments

In old `node.js` environments that not fully supports `es2015`, `itchy` could be used with:

```js
var itchy = require('itchy/legacy');
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/itchy.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/itchy/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/itchy.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/itchy "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/itchy  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/itchy "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"

[CoverageURL]:              https://coveralls.io/github/coderaiser/itchy?branch=master
[CoverageIMGURL]:           https://coveralls.io/repos/coderaiser/itchy/badge.svg?branch=master&service=github

[eachSeries]:               http://caolan.github.io/async/docs.html#eachSeries

