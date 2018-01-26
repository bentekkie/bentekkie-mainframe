var help = require('../help')
var jade = require('jade');
var dbutils = require('../dbutils')
var request = require('request')
module.exports = {
	''	: function (args,socket) 
	{
		socket.emit('send empty');
    },
	'ls': function (args,socket) 
	{
		function createTable(folder) {
			resp = "</br>B:"+folder.path
			resp += "</br><table><tr><th>Name</th><th>Type</th></tr>"
			for(i in folder.files){
				resp += "<tr><td>" + folder.files[i].split("/")[0] + "</td><td>File</td></tr>"
			}
			for(i in folder.folders){
				resp += "<tr><td>" + folder.folders[i].split("/")[0] + "</td><td>Folder</td></tr>"
			}
			resp += "</table><br/>"
			return resp
		}
		cdir = socket.cdir
		if(args != null && args.length > 0){
			if(args[0][0] !== "/") path = cdir.path+args[0]; else path = args[0]
			patharr = path.split("/")
			for (var i = patharr.length - 1; i >= 0; i--) {
				if(patharr[i] == ".."){
					patharr.splice(i-1,2)
					i--
				}
			}
			path = patharr.join("/")
			console.log(path)
			if(path === "") path = "/"
			if(path[path.length-1] !== "/") path += "/"
			dbutils.getFolderByPath(path, (err,folder) => {
				if(!err){
					socket.emit('send api', createTable(folder))
				}else{
					socket.emit('send api',"<br/>Folder '"+path+"' does not exist. Usage of ls is: ls [folder-name:optional].<br/>");
				}
			})
		}else{
			socket.emit('send api', createTable(cdir))
		}
	},
	'cat': function (args,socket)
	{
		cdir = socket.cdir
		if(args != null && args.length > 0){
			fuuid = "";
			if(args[0][0] !== "/") path = cdir.path+args[0]; else path = args[0]
			patharr = path.split("/")
			console.log(patharr)
			for (var i = patharr.length - 1; i >= 0; i--) {
				if(patharr[i] == ".."){
					patharr.splice(i-1,2)
					i--
				}
			}
			path = patharr.join("/")
			console.log(path)
			if(path !== ""){
				dbutils.getFileByPath(path, (err,file) => {
					if(!err){
						socket.emit('send api',"<br/>"+file.content+"<br/>")
					}else{
						socket.emit('send api',"<br/>File '"+path+"' does not exits. Usage of cat is: cat [file-name].<br/>");
						console.log(err)
					}
				})
			}else{
				socket.emit('send api',"<br/>Path not valid. Usage of cat is: cat [file-name].<br/>");
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
		var theme = require("jsonresume-theme-spartan");
		request({url:"http://registry.jsonresume.org/bentekkie.json",json:true}, (err,resp,body) => {
			var html = theme.render(body);
			socket.emit('send resume', html);
		})
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