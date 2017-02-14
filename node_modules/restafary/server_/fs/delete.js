'use strict';

var check = require('checkup');
var flop = require('flop/legacy');
var promisify = require('es6-promisify');
var pullout = promisify(require('pullout/legacy'));
var good = function good(fn) {
    return function (a) {
        return fn(null, a);
    };
};

module.exports = function (query, name, readStream, callback) {
    check.type('name', name, 'string').type('readStream', readStream, 'object').type('callback', callback, 'function').check({ query: query });

    if (query !== 'files') return flop.delete(name, callback);

    getBody(readStream, function (error, files) {
        if (error) return callback(error);

        flop.delete(name, files, callback);
    });
};

function getBody(readStream, callback) {
    pullout(readStream, 'string').then(JSON.parse).then(good(callback)).catch(callback);
}