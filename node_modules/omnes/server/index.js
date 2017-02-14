'use strict';

const DIR_ROOT = __dirname + '/..';
const path = require('path');

const currify = require('currify/legacy');
const express = require('express');
const Router = express.Router;

const extractor = require('./extractor');

const omnesFn = currify(_omnesFn);

module.exports = (options = {}) => {
    const router = Router();
    const prefix = options.prefix || '/omnes';
    
    router.route(prefix + '/*')
        .get(omnesFn(options))
        .get(staticFn)
    
    return router;
};

module.exports.listen = (socket, options) => {
    if (!options)
        options = {};
    
    if (!options.prefix)
        options.prefix = 'omnes';
    
    if (!options.root)
        options.root = '/';
    
    extractor(socket, options);
};

function _omnesFn(options, req, res, next) {
    const o = options || {};
    const prefix = o.prefix || '/omnes';
    const url = req.url
    
    if (url.indexOf(prefix))
        return next();
    
    req.url = req.url.replace(prefix, '');
    
    if (/^\/omnes\.js(\.map)?$/.test(req.url))
        req.url = '/dist' + req.url;
    
    next();
}

function staticFn(req, res) {
    const file = path.normalize(DIR_ROOT + req.url);
    res.sendFile(file);
}

