var commands = require('./commands')
var cmdautos = require('./autocomp')
var help = require('./help')
var jade = require("jade");
module.exports = function (io) {
	io.on('connection', function(socket){
	  socket.cdir = "/files"
	  socket.on('disconnect', function(){
	  });
	  socket.on('get api', function (payload) {
	  	console.log("get api")
	  	console.log(payload)
	  	var cmd = payload.cmd;
		var args = payload.args;
		if ( cmd in commands){
			commands[cmd](args,socket)
		}else{
			socket.emit('send api', "<br/> Invalid command. <br/>")
		}
	  })
	  socket.on('get cmdlist', function () {
	  	console.log("get cmdlist")
	  	socket.emit('send cmdlist', Object.keys(commands))
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
	});
}