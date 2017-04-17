/**
 * New node file
 */
var fs = require('fs');
var disk = require('./disk.js')

var commands = {
	''	: function (args,cdir) 
	{
		return "@empty";
    },
	'ls': function (args,cdir) 
	{
		testFolder = disk.dir_struct;
		if(cdir != "/"){
			cdir = cdir.split("/")
			cdir.shift();
			for (var i = 0; i < cdir.length && testFolder.type === 'folder'; i++) {
				testFolder = testFolder.content[cdir[i]];
			}
		}
		resp = ""
		if(testFolder && testFolder.type == 'folder'){
			files = testFolder.content
			resp = "</br><table><tr><th>Name</th><th>Type</th></tr>"
			for(file in files){
				resp += "<tr><td>" + file + "</td><td>" + files[file].type + "</td></tr>"
			}
			resp += "</table><br/>"
		}else{
			resp = "<br/>Folder not found <br/>";
		}
		return resp;
	},
	'cat': function (args,cdir)
	{
		var resp = "<br/>"
		if(args != null && args.length > 0){
			testFolder = disk.dir_struct;
			if(cdir != "/"){
				cdir = cdir.split("/")
				console.log(cdir);
				cdir.shift();
				for (var i = 0; i < cdir.length && testFolder.type === 'folder'; i++) {
					if(testFolder.type = 'folder'){
						testFolder = testFolder.content[cdir[i]];
					}
				}
			}
			file = testFolder.content[args[0]];
			if(testFolder && testFolder.type == 'folder' && testFolder.content[args[0]] && testFolder.content[args[0]].type == 'file'){
				resp += testFolder.content[args[0]].content;
			} else{
				resp = "<br/>File not found <br/>";
			}
		}else{
			resp = "<br/>No file name was specified. Usage of cat is: cat [file-name].<br/>";
			return resp
		}
		return resp
	},
	'clear': function (args,cdir) 
	{
		return "@clear";
	},
	'help': function (args,cdir)
	{
		if(args != null && args.length < 1){
			return commands['cat'](["help"],cdir);
		}else{
			return '@help';
		}
	},
	'download-resume': function (args,cdir)
	{
		return "@dr";
	},
	'cd': function (args,cdir) {
		if(args !== null && args.length >0){
			testFolder = disk.dir_struct;
			ndir = cdir+"/" + args[0];
			if(args[0][0] === "/"){
				ndir = args[0]
			}else if(cdir === "/"){
				ndir = "/" + args[0];
			}
			if(ndir.includes("..")){
				ndir_l = ndir.split("/")
				console.log(ndir_l);
				while(ndir_l.indexOf("..") > -1){
					i = ndir_l.indexOf("..")
					ndir_l.splice(i-1,2)
				}
				ndir = ndir_l.join("/")
				if(ndir.length <1){
					ndir = "/"
				}
				console.log(ndir);
			}
			valid = true
			if(ndir !== "/"){
				ndir_l = ndir.split("/")
				ndir_l.shift();
				while(valid && ndir_l.length > 0){
					curr = ndir_l.shift()
					if(testFolder && testFolder.type === 'folder'){
						testFolder = testFolder.content[curr]
					}else{
						valid = false;
					}
				}
			}
			
			if(valid && testFolder && testFolder.type == 'folder'){
				return ndir;
			}else{
				return 'invalid';
			}
		}else {
			return 'error';
		}
	},
	'landing-page': function (args,cdir) {
		return "@lp";
		
	},/*
	'guest-book': function (args,cdir) {
		if(args != null && args.length >1){
			gbwrite(args[0],args[1]);
		}
		return "@gb";
	}*/
};

function gbwrite(wname,wmsg){
	var entry = {
			name: wname,
			msg: wmsg
			};
	var file = JSON.parse(fs.readFileSync('./raw/guestbook.json'));
	file.push(entry);
	fs.writeFileSync('./raw/guestbook.json', JSON.stringify(file));
}

exports.api = function(req, res){
	var cmd = req.params.cmd;
	var p = req.query.p;
	var cdir = req.query.cdir;
	var args = JSON.parse(p);
	if ( cmd in commands){
		res.send(commands[cmd](args,cdir));
	}else{
		res.send("<br/> Invalid command. <br/>");
	}
  
};

exports.cmdlst = function(req, res){
	res.send(JSON.stringify(Object.keys(commands)));
};

exports.commands = commands;