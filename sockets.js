var commands = require('./commands')
var cmdautos = require('./autocomp')
var help = require('./help')
var jade = require("jade");
var dbutils = require('./dbutils')
module.exports = function (io) {

	io.on('get motd', function(socket){
		commands['cat'](['/files/start'],socket);
	})
	io.on('connection', function(socket){
		socket.on('save file',(payload) => {
			dbutils.updateFile(payload.path,payload.text,(err) => {
				if(!err){
					socket.emit('save file done',true)
				}else{
					socket.emit('save file done',false)
					console.log(err)
				}
			})
		})
		socket.on('new item',(payload) => {
				if(payload.type === "file"){
					dbutils.createFile(payload.path,payload.name," ",(err,parent) => {
						if(!err){
							socket.emit('change item done',parent)
						}else{
							console.log(err)
						}
					})
				}else{
					dbutils.createFolder(payload.path,payload.name, (err,parent) => {
						if(!err){
							socket.emit('change item done',parent)
						}else{
							console.log(err)
						}
					})
				}
		})
		socket.on('delete item',(payload) => {
			if(payload.type === "file"){
				dbutils.deleteFileByPath(payload.path+payload.name,(err,parent) => {
					if(!err){
						socket.emit('change item done',parent)
					}else{
						console.log(err)
					}
				})
			}else{
				dbutils.deleteFolderByPath(payload.path+payload.name+"/",(err,parent) => {
					if(!err){
						socket.emit('change item done',parent)
					}else{
						socket.emit('server error', err.message)
					}
				})
			}
		})
		socket.on('get folder', (dir) => {
			dbutils.getFolderByPath(dir, (err,resp) => {
				files = []
				folders = []
				if(!err){
					socket.emit('send folder', {
						dir:dir,
						files:(resp.files)?resp.files:[],
						folders:(resp.folders)?resp.folders:[]
					})
				}
			})
		})
		socket.on('get file', (dir) => {
			dbutils.getFileByPath(dir, (err,resp) => {
				if(!err){
					socket.emit('send file', {
						dir:dir,
						file:resp
					})
				}
			})
		})
		socket.on('get cmdlist', function () {
			socket.emit('send cmdlist', Object.keys(commands))
		})
		dbutils.getFolderByPath("/files/",(err,cdir) => {
			socket.cdir = cdir
			socket.on('disconnect', function(){
			});
			socket.on('get api', function (payload) {
				var cmd = payload.cmd;
				var args = payload.args;
				if ( cmd in commands){
					commands[cmd](args,socket)
				}else{
					socket.emit('send api', "<br/> Invalid command. <br/>")
				}
			})
			socket.on('get autocomp', function(payload){
				var cmd = payload.cmd;
				if ( cmd in cmdautos){
				socket.emit('send autocomp', cmdautos[cmd](payload.params,socket.cdir))
				}else{
				socket.emit('send autocomp', [])
				}
			})
			socket.emit('update cdir',socket.cdir);
			//commands['cat'](['start'],socket);
		})
	  
	});
}