'use strict';

var querystring = require('querystring');
var readStream = require('fs').createReadStream;
var check = require('checkup');
var minify = require('minify');
var flop = require('flop/legacy');
var ashify = require('ashify');
var beautify = require('beautifile');

module.exports = function (query, name, callback) {
    check.type('name', name, 'string').type('callback', callback, 'function').check({ query: query });

    if (/^(sort|order)/.test(query)) {
        var parsed = querystring.parse(query);
        var sort = parsed.sort;
        var order = parsed.order || 'asc';

        return flop.read(name, { sort: sort, order: order }, callback);
    }

    switch (query) {
        default:
            flop.read(name, callback);
            break;

        case 'raw':
            flop.read(name, 'raw', callback);
            break;

        case 'size':
            flop.read(name, 'size', callback);
            break;

        case 'time':
            flop.read(name, 'time raw', callback);
            break;

        case 'beautify':
            beautify(name, callback);
            break;

        case 'minify':
            minify(name, callback);
            break;

        case 'hash':
            ashify(readStream(name), { algorithm: 'sha1', encoding: 'hex' }, callback);
            break;
    }
};