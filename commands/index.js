var disk = require('../disk')
var fs = require('fs');
var help = require('../help')
var jade = require('jade');
module.exports = {
	''	: function (args,socket) 
	{
		socket.emit('send empty');
    },
	'ls': function (args,socket) 
	{
		cdir = socket.cdir
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
		socket.emit('send api', resp)
	},
	'cat': function (args,socket)
	{
		cdir = socket.cdir
		console.log(args)
		var resp = "<br/>"
		if(args != null && args.length > 0){
			testFolder = disk.dir_struct;
			if(cdir != "/"){
				cdir = cdir.split("/")
				console.log(cdir)
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
		}
		socket.emit('send api',resp)
	},
	'clear': function (args,socket) 
	{
		socket.emit('send clear');
	},
	'help': function (args,socket)
	{
		if(args != null && args.length < 1){
			socket.emit('send api',jade.renderFile('./views/help-info.jade',{cmds:Object.keys(help)}))
		}else{
			if(args[0] in module.exports){
		  		socket.emit('send api',jade.renderFile('./views/help.jade',{cmd:args[0],data:help[args[0]]}))
			}else{
				socket.emit('send api','<br/>Help file not found.<br/>')
			}
		}
	},
	'download-resume': function (args,socket)
	{
		socket.emit('send download resume');
	},
	'cd': function (args,socket) {
		cdir = socket.cdir
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
				socket.cdir = ndir
				socket.emit('update cdir',ndir);
			}else{
				socket.emit('send api',"<br/>Invalid directory<br/>");
			}
		}else {
			socket.emit('send api','<br/>No directory given, usage for cd is: cd [directory] <br/>');
		}
	},
	'landing-page': function (args,socket) {
		socket.emit('send landing page');
	}
};