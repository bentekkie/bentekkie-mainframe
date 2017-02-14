'use strict';

let tail = list => slice(list, 1);

module.exports = apart;

function apart(fn) {
    check(fn);
    
    let first = tail(arguments);
    
    return function() {
        let args = [...first, ...arguments];
        
        return fn(...args);
    };
}

function slice(list, from, to) {
    return [].slice.call(list, from, to);
}

function check(fn) {
    if (typeof fn !== 'function')
        throw Error('fn should be function!');
}
