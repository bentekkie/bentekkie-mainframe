var disk = require('../disk')
var fs = require('fs');
var help = require('../help')
var jade = require('jade');
var dbutils = require('../dbutils')
module.exports = {
	''	: function (args,socket) 
	{
		socket.emit('send empty');
    },
	'ls': function (args,socket) 
	{
		cdir = socket.cdir
		resp = ""
		resp = "</br><table><tr><th>Name</th><th>Type</th></tr>"
		for(i in cdir.files){
			resp += "<tr><td>" + cdir.files[i].split("/")[0] + "</td><td>File</td></tr>"
		}
		for(i in cdir.folders){
			resp += "<tr><td>" + cdir.folders[i].split("/")[0] + "</td><td>Folder</td></tr>"
		}
		resp += "</table><br/>"
		socket.emit('send api', resp)
	},
	'cat': function (args,socket)
	{
		cdir = socket.cdir
		if(args != null && args.length > 0){
			fuuid = "";
			path = cdir.path+args[0]
			for(i in cdir.files){
				tmp = cdir.files[i].split("/")
				if(tmp[0] == args[0]) {
					fuuid = tmp.slice(1).join();
					
				}
			}
			if(fuuid !== ""){
				dbutils.getFile(fuuid,path, (file) => {
					socket.emit('send api',"<br/>"+file.content)
				})
			}else{
				socket.emit('send api',"<br/>File not found in current directory. Usage of cat is: cat [file-name].<br/>");
			}
		}else{
			socket.emit('send api',"<br/>No file name was specified. Usage of cat is: cat [file-name].<br/>");
		}
		
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
		cdir = socket.cdir.path
		if(args !== null && args.length >0){
			ndir = cdir+ args[0];
			if(args[0][0] === "/"){
				ndir = args[0]
			}
			if(!ndir.endsWith("/")) ndir += "/"
			if(ndir.includes("..")){
				ndir_l = ndir.split("/")
				while(ndir_l.indexOf("..") > -1){
					i = ndir_l.indexOf("..")
					if(i > 1)ndir_l.splice(i-1,2)
					else ndir_l.splice(i,1)
				}
				ndir = ndir_l.join("/")
				if(ndir.length <1){
					ndir = "/"
				}
				
			}
			dbutils.getFolderByPath(ndir,(err,folder) => {
				if(!err){
					socket.cdir = folder
					socket.emit('update cdir',folder);
				}else{
					socket.emit('send api',"<br/>Invalid directory<br/>");
				}
			})
		}else {
			socket.emit('send api','<br/>No directory given, usage for cd is: cd [directory] <br/>');
		}
	},
	'landing-page': function (args,socket) {
		socket.emit('send landing page');
	}
};