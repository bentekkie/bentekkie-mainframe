disk = require('../disk')
dbutils = require('../dbutils')

exports.index = function(req, res){
	var path = "/"+req.path.split("/").slice(2).join("/");
	console.log(path)
	dbutils.getFileByPath(path,(err,rsp) => {
		data = ""
		if(!err){
			data = rsp.content
		}
		console.log(data)
		res.render('editor', { title: path, file:data });
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

exports.rmdir = function (req, res) {
	var patharr = req.path.split("/").slice(2);
	var path = "/"+req.path.split("/").slice(2).join("/") + "/";
	dbutils.deleteFolderByPath(path, (err) => {
		console.log(err)
		if(!err) res.send("success")
		else res.send("fail")
	})
}

exports.save = function(payload) {
	var path = "/"+payload.path.split("/").slice(2).join("/");
	dbutils.updateFile(path,payload.text,(err) => {
		console.log(err)
	}, () => {
		parr = path.split("/")
		fname = parr.pop()
		tmppath = parr.join("/")+"/"
		dbutils.createFile(tmppath,fname,payload.text,(err) => console.log(err))
	})
	payload.text
	console.log(payload)
}