var commands = require('./commands')
var cmdautos = require('./autocomp')
    ,editor = require('./routes/editor');
var help = require('./help')
var jade = require("jade");
var dbutils = require('./dbutils')
module.exports = function (io) {

	io.on('get motd', function(socket){
		console.log("motd")
		commands['cat'](['start'],socket);
	})
	io.on('connection', function(socket){
		socket.on('save',(payload) => editor.save(socket,payload))
		socket.on('new item',(payload) => editor.newItem(socket,payload))
		socket.on('delete item',(payload) => editor.deleteItem(socket,payload))
		socket.on('get cmdlist', function () {
			console.log("get cmdlist")
			socket.emit('send cmdlist', Object.keys(commands))
		})
		dbutils.getFolderByPath("/files/",(err,cdir) => {
			socket.cdir = cdir
			socket.on('disconnect', function(){
			});
			socket.on('get api', function (payload) {
				console.log("get api")
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