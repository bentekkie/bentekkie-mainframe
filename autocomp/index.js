var commands = require('../commands')

module.exports = {
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
		
		resp = []
		for(i in cdir.files){
			resp.push('cat ' + cdir.files[i].split("/")[0]);	
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
		for(key in commands){
			resp.push('help '+key);
		}
		return resp;
	},
	'download-resume': function (args,cdir)
	{
		return [];
	},
	'cd': function (args,cdir) {
		resp = []
		for(i in cdir.folders){
			resp.push('cd ' + cdir.folders[i].split("/")[0]);	
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