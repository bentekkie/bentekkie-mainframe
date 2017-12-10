dbutils = require('../dbutils')

exports.index = function(req, res){
	parr = req.path.split("/").slice(2)
	path ="/"+parr.join("/")
	name = parr.pop()
	parent = "/"+parr.join("/")
	console.log(path)
	dbutils.getFileByPath(path,(err,rsp) => {
		data = ""
		if(!err){
			data = rsp.content
			console.log(data)
			res.render('editor', { title: "B:"+path, file:data, path: parent});
		}else{
			console.log(err)
			res.status(500).send('Something broke!')
		}
	})
};

exports.download = function(req, res){
	res.send("disabled")
}


exports.mkdir = function (req, res) {
	var patharr = req.path.split("/").slice(2);
	fname = patharr.pop()
	path = "/"+patharr.join("/")+"/"
	dbutils.createFolder(path,fname, (err) => {
		console.log(err)
		if(!err) res.send("success")
		else res.send("fail")
	})
}

exports.lsdir = function (req, res) {
	var path = "/"+req.path.split("/").slice(2).join("/")+ "/";
	if(path === "//") path = "/"
	dbutils.getFolderByPath(path, (err,resp) => {
		files = []
		folders = []
		if(!err){
				for (var i = 0;resp.files && i < resp.files.length; i++) {
					files.push(resp.files[i].split("/"))
				}
				for (var i = 0;resp.folders && i < resp.folders.length; i++) {
					folders.push(resp.folders[i].split("/"))
				}
				pathtmp = path.split("/").slice(0,-2).join("/")
				if(pathtmp == "") pathtmp = "/"
				res.render('folders',{folders:folders, files:files,path:path,title:"B:"+path,parent:pathtmp})
		}else{
			console.log(err)
			res.status(500).send('Something broke!')
		}
	})
}

exports.rmdir = function (req, res) {
	var patharr = req.path.split("/").slice(2);
	var path = "/"+req.path.split("/").slice(2).join("/") + "/";
	dbutils.deleteFolderByPath(path, (err) => {
		console.log(err)
		if(!err) res.send("success")
		else res.send("fail")
	})
}

exports.save = function(socket,payload) {
	var path = "/"+payload.path.split("/").slice(2).join("/");
	dbutils.updateFile(path,payload.text,(err) => {
		console.log(err)
		socket.emit('editor reload')
	}, () => {
		parr = path.split("/")
		fname = parr.pop()
		tmppath = parr.join("/")+"/"
		dbutils.createFile(tmppath,fname,payload.text,(err) =>{
			console.log(err)
			socket.emit('editor reload')
		})

	})
	payload.text
	console.log(payload)
}

exports.newItem = function(socket,payload) {
	if(payload.type === "file"){
		dbutils.createFile(payload.path,payload.name,(err) => {
			console.log(err)
			socket.emit('editor reload')
		})
	}else{
		dbutils.createFolder(payload.path,payload.name, (err) => {
			console.log(err)
			socket.emit('editor reload')
		})
	}
}

exports.deleteItem = function(socket,payload) {
	if(payload.type === "file"){
		dbutils.deleteFileByPath(payload.path+payload.name,(err) => {
			console.log(err)
			socket.emit('editor reload')
		})
	}else{
		dbutils.deleteFolderByPath(payload.path+payload.name+"/",(err) => {
			console.log(err)
			socket.emit('editor reload')
		})
	}
}