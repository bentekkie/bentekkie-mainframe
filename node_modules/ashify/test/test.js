(function() {
    'use strict';
    
    /*global describe, it */
    
    var should  = require('should'),
        ashify  = require('..'),
        fs      = require('fs');
    
    describe('ashify', function() {
        describe('with no parameters', function() {
            it('no parameters', function() {
                should(function() {
                    ashify();
                }).throw();
            });
            
            it('only stream', function() {
                should(function() {
                    var stream = fs.createReadStream('README.md');
                    ashify(stream);
                }).throw();
            });
            
            it('stream and callback', function() {
                should(function() {
                    var stream = fs.createReadStream('README.md');
                    ashify(stream, console.log);
                }).throw();
            });
        });
        
        describe('with parameters', function() {
            it('file do not exist', function() {
                var stream  = fs.createReadStream('not-such-file'),
                    options = {
                        algorithm: 'sha1',
                        encoding: 'hex'
                    };
                
                ashify(stream, options, function(error) {
                    error.should.be.an.instanceof(Error);
                });
            });
            
            it('should return hash in callback', function() {
                var stream  = fs.createReadStream('README.md'),
                    options = {
                        algorithm: 'sha1',
                        encoding: 'hex'
                    };
                    
                ashify(stream, options, function(error, hash) {
                    hash.should.be.type('string');
                });
            });
        });
    });
    
})();
