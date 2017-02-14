# Ashify

Get hash of stream.

## How to use?

```js
var fs      = require('fs'),
    ashify  = require('ashify');
    stream  = fs.createReadStream('README.md'),
    options = {
        algorithm: 'sha1',
        encoding: 'hex'
    };
    
ashify(stream, options, function(error, data) {
    if (error)
        console.error(error.message);
    else
        console.log(data);
});
```

## License

MIT
