import commands from './commands';
import cmdautos from './autocomp';
import { updateFile, createFile, createFolder, deleteFileByPath, deleteFolderByPath, getFolderByPath, getFileByPath } from './dbutils';

/**
 * @param {Socket} io SocketIo Object
 * @returns {void}
 */
export default function (io) {
	io.on('get motd', function(socket) {
		commands.cat(['/files/start'],socket);
	})
	io.on('connection', function(socket) {
		socket.on('save file',(payload) => {
			updateFile(payload.path,payload.text,(err) => {
				if (!err) {
					socket.emit('save file done',true)
				} else {
					socket.emit('save file done',false)
				}
			})
		})
		socket.on('new item',(payload) => {
				if ("file" === payload.type) {
					createFile(payload.path,payload.name," ",(err,parent) => {
						if (!err) {
							socket.emit('change item done',parent)
						} else {
							socket.emit('server error', err.message)
						}
					})
				} else {
					createFolder(payload.path,payload.name, (err,parent) => {
						if (!err) {
							socket.emit('change item done',parent)
						} else {
							socket.emit('server error', err.message)
						}
					})
				}
		})
		socket.on('delete item',(payload) => {
			if ("file" === payload.type) {
				deleteFileByPath(payload.path+payload.name,(err,parent) => {
					if (!err) {
						socket.emit('change item done',parent)
					} else {
						socket.emit('server error', err.message)
					}
				})
			} else {
				deleteFolderByPath(payload.path+payload.name+"/",(err,parent) => {
					if (!err) {
						socket.emit('change item done',parent)
					} else {
						socket.emit('server error', err.message)
					}
				})	
			}
		})
		socket.on('get folder', (dir) => {
			getFolderByPath(dir, (err,resp) => {
				if (!err) {
					socket.emit('send folder', {
						dir: dir,
						files: resp.files?resp.files:[],
						folders: resp.folders?resp.folders:[]
					})
				} else {
					socket.emit('server error', err.message)
				}
			})
		})
		socket.on('get file', (dir) => {
			getFileByPath(dir, (err,resp) => {
				if (!err) {
					socket.emit('send file', {
						dir: dir,
						file: resp
					})
				} else {
					socket.emit('server error', err.message)
				}
			})
		})
		socket.on('get cmdlist', function () {
			socket.emit('send cmdlist', Object.keys(commands))
		})
		getFolderByPath("/files/", (err,cdir) => {
			if (err) {
				socket.emit('server error', err.message)
			} else {
				socket.cdir = cdir
				// socket.on('disconnect', () => { });
				socket.on('get api', function (payload) {
					var cmd = payload.cmd;
					var args = payload.args;
					if (cmd in commands) {
						commands[cmd](args,socket)
					} else {
						socket.emit('send api', "<br/> Invalid command. <br/>")
					}
				})
				socket.on('get autocomp', function(payload) {
					var cmd = payload.cmd;
					if (cmd in cmdautos) {
						socket.emit('send autocomp', cmdautos[cmd](payload.params,socket.cdir))
					} else {
						socket.emit('send autocomp', [])
					}
				})
				socket.emit('update cdir',socket.cdir);
				// commands['cat'](['start'],socket);
			}
		})
	});
}
