var fs = require('fs');
var commands = require('./api').commands

var cmdautos = {
	''	: function (args,cdir) 
	{
		return [];
    },
	'ls': function (args,cdir) 
	{
		return [];
	},
	'cat': function (args,cdir)
	{
		testFolder = './'+cdir+'/';
		
		files = fs.readdirSync(testFolder);
		resp = []
		for(file in files){
			  name = files[file];
			  name = name.split(".")[0];
			  resp.push('cat ' +name);
		}
		return resp
	},
	'clear': function (args,cdir) 
	{
		return [];
	},
	'help': function (args,cdir)
	{	
		resp = [];
		for(key in cmdautos){
			resp.push('help '+key);
		}
		return resp;
	},
	'download-resume': function (args,cdir)
	{
		return [];
	},
	'cd': function (args,cdir) {
		return ["cd files","cd hidden"];
	},
	'landing-page': function (args,cdir) {
		return [];
		
	},/*
	'guest-book': function (args,cdir) {
		if(args != null && args.length >1){
			gbwrite(args[0],args[1]);
		}
		return "@gb";
	}*/
};

var empty = JSON.stringify([]);

exports.getautos = function(req, res){
	var cmd = req.params.cmd;
	var p = req.query.p;
	var cdir = req.query.cdir;
	var args = JSON.parse(p);
	if ( cmd in cmdautos){
		res.send(JSON.stringify(cmdautos[cmd](args,cdir)));
	}else{
		res.send(empty);
	}
  
};