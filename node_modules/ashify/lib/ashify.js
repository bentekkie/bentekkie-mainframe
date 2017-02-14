(function() {
    'use strict';
    
    var crypto      = require('crypto'),
        assert      = require('assert'),
        
        ERROR_EMPTY = 'could not be empty!';
    
    module.exports = function(stream, options, callback) {
        var shasum;
        
        assert(stream, 'stream '   + ERROR_EMPTY);
        assert(options, 'options '   + ERROR_EMPTY);
        assert(callback, 'callback '   + ERROR_EMPTY);
        
        shasum = crypto.createHash(options.algorithm);
        
        stream.on('data', function(d) {
            shasum.update(d);
        });
        
        stream.once('error', function(error) {
            callback(error);
        });
        
        stream.once('end', function() {
          var hex = shasum.digest(options.encoding);
          
          callback(null, hex);
        });
    };
    
})();
