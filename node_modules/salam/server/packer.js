'use strict';

const onezip = require('onezip/legacy');
const mellow = require('mellow');

module.exports = function(socket, options) {
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
    return Error('Could not pack from/to root on windows!');
}

function check(authCheck) {
    if (authCheck && typeof authCheck !== 'function')
        throw Error('authCheck should be function!');
}

function listen(socket, options) {
    const authCheck = options.authCheck;
    const prefix = options.prefix || 'salam';
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
    socket.on('pack', (from, to, files) => {
        preprocess('pack', root, socket, from, to, files);
    });
    
    socket.on('extract', (from, to) => {
        preprocess('extract', root, socket, from, to);
    });
}

function preprocess(op, root, socket, from, to, files) {
    const value = getRoot(root);
    
    from = mellow.pathToWin(from, value);
    to = mellow.pathToWin(to, value);
    
    const isRoot = (item) => {
        return isRootWin32(item, value);
    };
    
    if (![from, to].some(isRoot)) {
        operate(socket, op, from, to, files);
    } else {
        socket.emit('err',  getWin32RootMsg());
        socket.emit('end');
    }
}

function getOperation(op) {
    if (op === 'pack')
        return onezip.pack;
    
    if (op === 'extract')
        return onezip.extract;
  
    throw Error('op could be pack/extract only!');
}

function operate(socket, op, from, to, files) {
    const fn = getOperation(op);
    const packer = fn(from, to, files);
    
    packer.on('file', (name) => {
        socket.emit('file', name);
    });
    
    packer.on('progress', (percent) => {
        socket.emit('progress', percent);
    });
    
    packer.on('error', (error) => {
        const message = error.message;
        const onAbort = () => {
            packer.abort();
            socket.removeListener('abort', onAbort);
        };
        
        socket.emit('err', message);
        socket.on('abort',  onAbort);
    });
    
    packer.on('end', () => {
        socket.emit('end');
    });
}

