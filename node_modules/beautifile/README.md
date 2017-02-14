# Beautifile

Beautify js, html and css.

## Install

```
npm i beautifile --save
```

## Options

Options of `beautifile` can be find in [json/beautify.json](json/beautify.json "beautify.json"),
and could be overriden by `~/.beautify.json`.


## How to use?

```js
var beautifile  = require('beautifile');

beautife('ugly.js', function(error, data) {
    if (error)
        console.error(error.message);
    else
        console.log(data);
});
```

## License

MIT
