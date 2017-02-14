'use strict';

module.exports = (array, iterator, done) => {
    check(array, iterator, done);
    
    let i = -1;
    const n = array.length;
    
    const loop = (e) => {
       ++i;
       
       if (e || i === n)
           return done(e);
       
       iterator(array[i], loop);
    };
    
    loop();
}

function check(array, iterator, done) {
    if (!Array.isArray(array))
        throw Error('array should be an array!');
    
    if (typeof iterator !== 'function')
        throw Error('iterator should be a function!');
    
    if (typeof done !== 'function')
        throw Error('done should be a function!');
}

