import { renderFile } from 'jade';
import { getFolderByPath, getFileByPath, getFile, validateUser, createFile, createFolder, deleteFileByPath, deleteFolderByPath } from '../dbutils';
import request from 'request';
import { render } from "jsonresume-theme-spartanbentekkie";
import logger from "../logger"
import { SocketServer } from './SocketServer';

const createTable = (folder) => {
	let resp = "</br>B:"+folder.path
	resp += "</br><table><tr><th>Name</th><th>Type</th></tr>"
	if (folder.files) {
		for (const file of folder.files) {
			resp += "<tr><td>" + file.split("/")[0] + "</td><td>File</td></tr>"
		}
	}
	if (folder.folders) {
		for (const inner of folder.folders) {
			resp += "<tr><td>" + inner.split("/")[0] + "</td><td>Folder</td></tr>"
		}
	}
	resp += "</table><br/>"

	return resp
}

export default {

/**
 * @param {string[]} args - command args
 * @param {any} socket - socket
 * @returns {void}
 */
'': function (args,socket) {
	socket.emit('send empty');
},
'ls': function (args,socket) {
		if (null !== args && 0 < args.length) {
			let path = "/" === args[0][0] ? args[0] : socket.cdir.path+args[0];
			const patharr = path.split("/")
			for (var i = patharr.length - 1; 0 <= i; i -= 1) {
				if (".." == patharr[i]) {
					patharr.splice(i-1,2)
					i -= 1
				}
			}
			path = patharr.join("/")
			if ("" === path) {
				path = "/"
			}
			if ("/" !== path[path.length-1]) {
				path += "/"
			}
			getFolderByPath(path, (err,folder) => {
				if (!err) {
					socket.emit('send api', createTable(folder))
				} else {
					socket.emit('send api',"<br/>Folder '"+path+"' does not exist. Usage of ls is: ls [folder-name:optional].<br/>");
				}
			})
		} else {
			socket.emit('send api', createTable(socket.cdir))
		}
	},
	'cat': function (args,socket) {
		if (null !== args && 0 < args.length) {
			let path = "/" === args[0][0] ? args[0] : socket.cdir.path+args[0];
			const patharr = path.split("/")
			for (var i = patharr.length - 1; 0 <= i; i -= 1) {
				if (".." == patharr[i]) {
					patharr.splice(i-1,2)
					i -= 1
				}
			}
			path = patharr.join("/")
			if ("" !== path) {
				getFileByPath(path, (err,file) => {
					if (!err) {
						socket.emit('send api',"<br/>"+file.content+"<br/>")
					} else {
						socket.emit('send api',"<br/>File '"+path+"' does not exits. Usage of cat is: cat [file-name].<br/>");
					}
				})
			} else {
				socket.emit('send api',"<br/>Path not valid. Usage of cat is: cat [file-name].<br/>");
			}
		} else {
			socket.emit('send api',"<br/>No file name was specified. Usage of cat is: cat [file-name].<br/>");
		}

	},
	'clear': function (args,socket) {
		socket.emit('send clear');
	},
	'help': function (args,socket) {
		if (null !== args && 1 > args.length) {
			socket.emit('send api',renderFile('./views/help-info.jade',{ cmds: Object.keys(module.exports.default) }))
		} else if (args[0] in module.exports) {
				getFile("-1","help", (err,helpfile) => {
					if (!err) {
						socket.emit('send api',renderFile('./views/help.jade',{ cmd: args[0],data: helpfile.content[args[0]] }))
					}
				})
		} else {
			socket.emit('send api','<br/>Help file not found.<br/>')
		}
	},
	'open-resume': function (args,socket) {
		
		request({ url: "http://registry.jsonresume.org/bentekkie.json",json: true }, (err,resp,body) => {
			if (!err) {
				var html = render(body);
				socket.emit('send resume', html);
			}
		})
	},
	'cd': function (args,socket) {
		const cdir = socket.cdir.path
		if (null !== args && 0 <args.length) {
			let ndir = cdir+ args[0];
			if ("/" === args[0][0]) {
				ndir = args[0]
			}
			if (!ndir.endsWith("/")) {
				ndir += "/"
			}
			if (ndir.includes("..")) {
				const ndirL = ndir.split("/")
				while (-1 < ndirL.indexOf("..")) {
					const i = ndirL.indexOf("..")
					if (1 < i) {
						ndirL.splice(i-1,2)
					} else {
						ndirL.splice(i,1)
					}
				}
				ndir = ndirL.join("/")
				if (1 >ndir.length) {
					ndir = "/"
				}

			}
			getFolderByPath(ndir,(err,folder) => {
				if (!err) {
					socket.cdir = folder
					socket.emit('update cdir',folder);
				} else {
					socket.emit('send api',"<br/>Invalid directory<br/>");
				}
			})
		} else {
			socket.emit('send api','<br/>No directory given, usage for cd is: cd [directory] <br/>');
		}
	},
	'landing-page': function (args,socket) {
		socket.emit('send landing page');
	},
	'login': function (args,socket) {
		if (1 < args.length) {
			validateUser(args[0],args[1],(err,username) => {
				if (!err && username) {
					socket.loggedInUsername = username
					socket.isLoggedIn = true
					socket.emit('send api','<br/> Logged in as '+username+'.<br/>')
				} else {
					socket.emit('send api','<br/> Wrong password <br/>')
				}
			})
		} else {
			socket.emit('send api','<br/> Username and password not given <br/>')
		}
	},
	'nano': function (args,socket) {
		const cdir = socket.cdir.path
		if (!socket.isLoggedIn) {
			socket.emit('send api','<br/> Not Logged In <br/>')
		} else if (1 === args.length) {
			const dir = cdir + args[0]
			getFileByPath(dir, (err,resp) => {
				if (!err) {
					socket.emit('send file', {
						dir: dir,
						file: resp
					})
				} else {
					logger.log('error',err.message)
					socket.emit('server error', err.message)
				}
			})
		} else {
			socket.emit('send api','<br/> No File Given <br/>')
		}
	},
	'mktxt': function (args,socket) {
		const cdir = socket.cdir.path
		if (!socket.isLoggedIn) {
			socket.emit('send api','<br/> Not Logged In <br/>')
		} else if (1 === args.length) {
			createFile(cdir,args[0]," ",(err,parent) => {
				if (!err) {
					socket.emit('send api','<br/> Created file "'+args[0]+'" <br/>')
					socket.cdir = parent
				} else {
					logger.log('error',err.message)
					socket.emit('server error', err.message)
				}
			})
		} else {
			socket.emit('send api','<br/> No File Given <br/>')
		}
	},
	'mkdir': function (args,socket) {
		const cdir = socket.cdir.path
		if (!socket.isLoggedIn) {
			socket.emit('send api','<br/> Not Logged In <br/>')
		} else if (1 === args.length) {
			createFolder(cdir,args[0], (err,parent) => {
				if (!err) {
					socket.emit('send api','<br/> Created folder "'+args[0]+'" <br/>')
					socket.cdir = parent
				} else {
					logger.log('error',err.message)
					socket.emit('server error', err.message)
				}
			})
		} else {
			socket.emit('send api','<br/> No Folder Given <br/>')
		}
	},
	'rm': function (args,socket) {
		const cdir = socket.cdir.path
		if (!socket.isLoggedIn) {
			socket.emit('send api','<br/> Not Logged In <br/>')
		} else if (1 === args.length) {
			deleteFileByPath(cdir+args[0],(err,parent) => {
				if (!err) {
					socket.emit('send api','<br/> Deleted file "'+args[0]+'" <br/>')
					socket.cdir = parent
				} else {
					logger.log('error',err.message)
					socket.emit('server error', err.message)
				}
			})
		} else {
			socket.emit('send api','<br/> No File Given <br/>')
		}
	},
	'rmdir': function (args,socket) {
		const cdir = socket.cdir.path
		if (!socket.isLoggedIn) {
			socket.emit('send api','<br/> Not Logged In <br/>')
		} else if (1 === args.length) {
			deleteFolderByPath(cdir+args[0]+"/",(err,parent) => {
				if (!err) {
					socket.emit('send api','<br/> Deleted folder "'+args[0]+'" <br/>')
					socket.cdir = parent
				} else {
					logger.log('error',err.message)
					socket.emit('server error', err.message)
				}
			})
		} else {
			socket.emit('send api','<br/> No Folder Given <br/>')
		}
	}
};
