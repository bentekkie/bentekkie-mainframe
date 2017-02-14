'use strict';

const DIR_ROOT = __dirname + '/..';
const path = require('path');

const currify = require('currify/legacy');
const express = require('express');
const Router = express.Router;

const packer = require('./packer');

const salamFn = currify(_salamFn);

module.exports = (options = {}) => {
    const router = Router();
    const prefix = options.prefix || '/salam';
    
    router.route(prefix + '/*')
        .get(salamFn(options))
        .get(staticFn)
    
    return router;
};

module.exports.listen = (socket, options) => {
    if (!options)
        options = {};
    
    if (!options.prefix)
        options.prefix = 'salam';
    
    if (!options.root)
        options.root = '/';
    
    packer(socket, options);
};

function _salamFn(options, req, res, next) {
    const o = options || {};
    const prefix = o.prefix || '/salam';
    const url = req.url
    
    if (url.indexOf(prefix))
        return next();
    
    req.url = req.url.replace(prefix, '');
    
    if (/^\/salam\.js(\.map)?$/.test(req.url))
        req.url = '/dist' + req.url;
    
    next();
}

function staticFn(req, res) {
    const file = path.normalize(DIR_ROOT + req.url);
    res.sendFile(file);
}

