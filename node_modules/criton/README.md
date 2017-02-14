# Criton [![License][LicenseIMGURL]][LicenseURL] [![NPM version][NPMIMGURL]][NPMURL] [![Dependency Status][DependencyStatusIMGURL]][DependencyStatusURL] [![Build Status][BuildStatusIMGURL]][BuildStatusURL]

Crypt password.

## Install

```
npm i criton --save
```

## How to use?

```js
let criton = require('criton');

cryton('hello');
// returns
'9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043';

criton('hello', 'MD5');
// returns
'5d41402abc4b2a76b9719d911017c592'
```

## License

MIT

[NPMIMGURL]:                https://img.shields.io/npm/v/criton.svg?style=flat
[BuildStatusIMGURL]:        https://img.shields.io/travis/coderaiser/criton/master.svg?style=flat
[DependencyStatusIMGURL]:   https://img.shields.io/gemnasium/coderaiser/criton.svg?style=flat
[LicenseIMGURL]:            https://img.shields.io/badge/license-MIT-317BF9.svg?style=flat
[NPMURL]:                   https://npmjs.org/package/criton "npm"
[BuildStatusURL]:           https://travis-ci.org/coderaiser/criton  "Build Status"
[DependencyStatusURL]:      https://gemnasium.com/coderaiser/criton "Dependency Status"
[LicenseURL]:               https://tldrlegal.com/license/mit-license "MIT License"
[CoverageURL]:              https://coveralls.io/github/coderaiser/criton?branch=master
[CoverageIMGURL]:           https://coveralls.io/repos/coderaiser/criton/badge.svg?branch=master&service=github
