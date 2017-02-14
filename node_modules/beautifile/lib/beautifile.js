(function() {
    'use strict';
    
    var fs              = require('fs'),
        path            = require('path'),
        
        tryCatch        = require('try-catch'),
        readjson        = require('readjson'),
        beautify        = require('js-beautify'),
        
        DIR             = __dirname + '/../',
        HOME            = require('os-homedir')(),
        
        EXT             = ['js', 'css', 'html'],
        
        name            = 'beautify.json',
        
        ConfigPath      = path.join(DIR, 'json/' + name),
        ConfigHome      = path.join(HOME, '.' + name),
        
        config          =
            readjson.sync.try(ConfigHome) ||
            readjson.sync.try(ConfigPath) || {};
    
    module.exports  = function(name, callback) {
        var is, ext;
        
        if (/(rc|\.json)$/.test(name))
            ext = 'js';
        else
            ext     = path
                .extname(name)
                .slice(1);
        
        is      = ~EXT.indexOf(ext);
        
        if (!is)
            callback(erorMsg(ext));
        else
            fs.readFile(name, 'utf8', function(error, data) {
                var result;
                
                if (!error)
                    error = tryCatch(function() {
                        result = beautify[ext](data, config);
                    });
                    
                
                callback(error, result);
            });
    };
    
    function erorMsg(ext) {
        var error = Error('File type "' + ext + '" not supported.');
        
        return error;
    }
    
})();
