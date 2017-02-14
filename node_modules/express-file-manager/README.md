# express-file-manager

This is an Express middleware that provides a nice UI for editing files on the web.

Text files are opened/edited using [Ace](http://ace.c9.io/).  The directory browser and image preview pages can accept drag-and-drop, and will upload files.

This is intended for use as an "admin interface".  There is no security in this module - if you don't want the entire internet to be able to modify your folder, you should put in access control for the relevant subpaths;

## Usage

```javascript
var fileManager = require('express-file-manager');

app.use('/filemanager', fileManager(directory, options));
```

### Options

* `options.textExtensions` - a list of file extensions to be considered "text"
* `options.textTypes` - a list of MIME types (string match or RegExp) to be considered "text".

By default, `.gitignore` files, and anything with a mime types like `*/json`, `*/*+json`, `*/xml`, `*/*+xml` and `*/javascript` are considered text.  MIME types that start with `text/*` are always considered text.

## License

This project is MIT-licensed.

This package includes MIT-licensed content from [open-iconic](https://useiconic.com/open/) and [Ace](http://ace.c9.io/).
