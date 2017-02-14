(function() {
    'use strict';
    
    let apart    = require('../src/apart'),
        test    = require('tape');
    
    test('return function', t => {
        let fn = () => {};
        let result = apart(fn);
        
        t.equal(typeof result, 'function', 'shold return function');
        t.end();
    });
    
    test('call returned function', t => {
        let sum = (a, b) => a + b;
        
        let inc = apart(sum, 1);
        
        t.equal(inc(1), 2, 'shold apply rest arguments');
        t.end();
    });
    
    test('no arguments', t => {
        t.throws(apart, /fn should be function!/, 'should throw when no fn');
        t.end();
    });
    
    test('arguments: wrong type', t => {
        let fn  = () => apart(1);
       
        t.throws(fn, /fn should be function/, 'shoud throw when wrong type');
        t.end();
    });
})();
