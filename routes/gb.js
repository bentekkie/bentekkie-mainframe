/**
 * New node file
 */
var fs = require('fs');


exports.read = function(req, res){
	var fs = require('fs');
	
	var file = JSON.parse(fs.readFileSync('./raw/guestbook.json', "utf8"));
	res.render('gb',{data: file})
};