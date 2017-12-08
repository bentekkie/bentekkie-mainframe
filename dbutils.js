var db = require('./db');

exports.createFolder = function (path,fName, cb) {

	db.Folder.scan()
			 .where("path")
			 .equals(path).exec((err, resp) => {
			 	if(!err){
			 		fid = resp.Items[0].attrs.fileID;
			 		fpath = resp.Items[0].attrs.path;
			 		//console.log(resp.Items[0].attrs.path+fName+"/")
			 		db.Folder.create({path:fpath+fName+"/",parent:fid}, (err,resp) => {
			 			if(err) {
			 				cb(err)
			 			}else {
			 				db.Folder.update({fileID:fid,path:fpath,folders:{$add:fName+"/"+resp.get().fileID}}, (err,resp) => {
				 				if (typeof cb === "function") cb(err)
				 			})
			 			}
			 		})
			 	}
			 })
}

exports.createFolderUUID = function (parentUUID,fpath,fName, cb) {
	db.Folder.create({path:fpath+fName+"/",parent:parentUUID}, (err,resp) => {
		if(err) {
			cb(err)
		}else {
			db.Folder.update({fileID:parentUUID,path:fpath,folders:{$add:fName+"/"+resp.get().fileID}}, (err,resp) => {
				if (typeof cb === "function") cb(err)
			})
		}
	})
}

exports.deleteFileByPath = function (path,cb) {
	db.File.scan()
		   .where("path")
		   .equals(path).exec((err,resp) => {
		   		if(!err){
		   			curr = resp.Items[0].attrs
		   			folderId = curr.parent
		   			db.File.destroy({fileID:curr.fileID,path:path}, (err, resp) => {
		   				if(!err){
			   				parr = path.split("/")
			   				fname = parr.pop() + "/" + curr.fileID
			   				db.Folder.update({fileID:folderId,path:parr.join("/")+"/",files:{$del:fname}},(err) => cb(err))
			   			}else{
			   				cb(err)
			   			}
		   			})
		   		}else{
		   			cb(err)
		   		}
		   })
}
exports.deleteFolderByPath = function (path,cb) {
	db.Folder.scan()
		   .where("path")
		   .equals(path).exec((err,resp) => {
		   		if(!err){
		   			curr = resp.Items[0].attrs
		   			parentId = curr.parent
		   			if(curr.folders || curr.files){
		   				cb(new Error("Folder not empty"))
		   			}else{
		   				db.Folder.destroy({fileID:curr.fileID,path:path}, (err, resp) => {
			   				if(!err){
				   				parr = path.split("/")
				   				parr.pop()
				   				fname = parr.pop() + "/" + curr.fileID
				   				db.Folder.update({fileID:parentId,path:parr.join("/")+"/",folders:{$del:fname}},(err) => cb(err))
				   			}else{
				   				cb(err)
				   			}
			   			})
		   			}
		   		}else{
		   			cb(err)
		   		}
		   })
}

exports.createFile = function (path,fName,content,cb) {
	db.Folder.scan()
			 .where("path")
			 .equals(path).exec((err, resp) => {
			 	if(!err){
			 		console.log(resp)
			 		fid = resp.Items[0].attrs.fileID;
			 		fpath = resp.Items[0].attrs.path;
			 		db.File.create({path:fpath+fName,content:content,parent:fid}, (err,resp) => {
			 			db.Folder.update({fileID:fid,path:fpath,files:{$add:fName+"/"+resp.get().fileID}}, (err,resp) => {
			 				if (typeof cb === "function"){
				 				cb(err)
				 			}
			 			})
			 		})
			 	}else{
			 		console.log(err)
			 	}
			 })
}

exports.updateFile = function (path,content,cb,createcb = function(){}) {
	db.File.scan()
			 .where("path")
			 .equals(path).exec((err, resp) => {
			 	if(!err){
			 		if(resp.Items[0]){
						fid = resp.Items[0].attrs.fileID;
				 		fpath = resp.Items[0].attrs.path;
				 		db.File.update({fileID:fid,content:content,path:fpath}, (err,resp) => {
				 			if (typeof cb === "function"){
				 				cb(err)
				 			}
				 		})
					} else {
						createcb()
					}
			 	}else{
					if (typeof cb === "function"){
		 				cb(err)
		 			}
			 	}
			 })
}

exports.getFile= function (uuid,path, cb) {
	db.File.get({fileID:uuid,path:path},(err, resp) => {
		if(!err) cb(resp.get())
		else console.log(err)
	})
}


exports.getFolder = function (uuid,path, cb) {
	db.Folder.get({fileID:uuid,path:path},(err, resp) => {
		cb(err,resp.get())
	})
}
exports.getFolderByPath = function (path, cb) {
	db.Folder.scan().where("path").equals(path).exec((err, resp) => {
		if(!err){
			console.log(resp)
			console.log(path)
			if(resp.Items[0]){
				cb(null,resp.Items[0].attrs)
			} else {
				cb(new Error('Folder not found'))
			}
		} else cb(err)
	})
}
exports.getFileByPath = function (path, cb) {
	db.File.scan().where("path").equals(path).exec((err, resp) => {
		if(!err){
			if(resp.Items[0]){
				cb(null,resp.Items[0].attrs)
			} else {
				cb(new Error('Folder not found'))
			}
		} else cb(err)
	})
}
exports.validateUser = function(username,password,cb){
	db.User.get(username,(err,resp) => {
		if(!err){
			console.log(resp)
			if(resp === null){
				cb(null,false)
			}else if(resp.get('password') === password){
				cb(null,username)
			}else{
				cb(null,false)
			}
		}else{
			cb(err)
		}
	})
}