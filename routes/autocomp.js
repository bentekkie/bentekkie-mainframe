var fs = require('fs');
var commands = require('./api').commands
var disk = require('./disk.js')

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
		testFolder = disk.dir_struct;
		if(cdir != "/"){
			cdir = cdir.split("/")
			cdir.shift();
			for (var i = 0; i < cdir.length && testFolder.type === 'folder'; i++) {
				testFolder = testFolder.content[cdir[i]];
			}
		}
		resp = []
		if(testFolder && testFolder.type == 'folder'){
			files = testFolder.content

			for(file in files){
				if(files[file].type === 'file'){
					resp.push('cat ' + file);
				}	
			}
		}
		return resp;
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
		testFolder = disk.dir_struct;
		if(cdir != "/"){
			cdir = cdir.split("/")
			cdir.shift();
			for (var i = 0; i < cdir.length && testFolder.type === 'folder'; i++) {
				testFolder = testFolder.content[cdir[i]];
			}
		}
		resp = []
		if(testFolder && testFolder.type == 'folder'){
			files = testFolder.content

			for(file in files){
				if(files[file].type === 'folder'){
					resp.push('cd ' + file);
				}	
			}
		}
		return resp;
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