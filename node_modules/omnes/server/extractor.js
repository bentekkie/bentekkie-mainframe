'use strict';

const inly = require('inly/legacy');
const mellow = require('mellow');

module.exports = (socket, options) => {
    if (!options)
        options = {};
    
    listen(socket, options);
};

function getRoot(root) {
    if (typeof root === 'function')
        return root();
    
    return root;
}

function isRootWin32(path, root) {
    const isRoot = path === '/';
    const isWin32 = process.platform === 'win32';
    const isConfig = root === '/';
    
    return isWin32 && isRoot && isConfig;
}

function getWin32RootMsg() {
    return Error('Could not extract from/to root on windows!');
}

function check(authCheck) {
    if (authCheck && typeof authCheck !== 'function')
        throw Error('authCheck should be function!');
}

function listen(socket, options) {
    const authCheck = options.authCheck;
    const prefix = options.prefix || 'omnes';
    const root = options.root || '/';
    
    check(authCheck);
    
    socket.of(prefix)
        .on('connection', (socket) => {
            if (!authCheck)
                return connection(root, socket);
            
            authCheck(socket, () => {
                connection(root, socket);
            });
        });
}

function connection(root, socket) {
    socket.on('extract', (from, to) => {
        preprocess('extract', root, socket, from, to);
    });
}

function preprocess(op, root, socket, from, to) {
    const value = getRoot(root);
    
    from = mellow.pathToWin(from, value);
    to = mellow.pathToWin(to, value);
    
    const isRoot = (item) => {
        return isRootWin32(item, value);
    };
    
    if (![from, to].some(isRoot)) {
        operate(socket, op, from, to);
    } else {
        socket.emit('err',  getWin32RootMsg());
        socket.emit('end');
    }
}

function operate(socket, op, from, to) {
    const extractor = inly(from, to);
    
    extractor.on('file', (name) => {
        socket.emit('file', name);
    });
    
    extractor.on('progress', (percent) => {
        socket.emit('progress', percent);
    });
    
    extractor.on('error', (error) => {
        const message = error.message;
        socket.emit('err', message);
    });
    
    extractor.on('end', () => {
        socket.emit('end');
    });
}

