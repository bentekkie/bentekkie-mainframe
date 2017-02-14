'use strict';

var check = require('checkup');
var pullout = require('pullout/legacy');
var patch = require('patchfile');

module.exports = function (name, readStream, options, callback) {
    if (!callback) callback = options;

    check.type('name', name, 'string').type('readStream', readStream, 'object').type('callback', callback, 'function');

    pullout(readStream, 'string', function (error, data) {
        if (error) return callback(error);

        patch(name, data, options, callback);
    });
};