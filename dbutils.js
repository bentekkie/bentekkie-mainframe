import { Folder, File, User } from './db';

/**
 * @export
 * @param {string} path path of folder
 * @param {string} fName folder name
 * @param {Function} cb Callback
 * @returns {void}
 */
export const createFolder = function (path,fName, cb) {
	Folder.scan().where("path").equals(path).exec((err, resp) => {
		if (!err) {
			const fid = resp.Items[0].attrs.fileID;
			const fpath = resp.Items[0].attrs.path;
			
			return Folder.create({ path: fpath+fName+"/",parent: fid, files: [], folders: [] }, (err2,resp2) => {
				if (err2) {
					return cb(err2)
				}

				return Folder.update({ fileID: fid,path: fpath,folders: { $add: fName+"/"+resp2.get().fileID } }, (err3,resp3) => {
					if ("function" === typeof cb) {
						return cb(err3,resp3.get())
					}
					
					return cb(new Error());
				})
			})
		} 
			
		return cb(err)
	})
}

/**
 * @export
 * @param {string} parentUUID UUID of parent folder
 * @param {string} fpath folder path
 * @param {string} fName folder name
 * @param {*} cb Callback
 * @returns {void}
 */
export const createFolderUUID = function (parentUUID,fpath,fName, cb) {
	Folder.create({ path: fpath+fName+"/",parent: parentUUID }, (err,resp) => {
		if (err) {
			return cb(err)
		}

		return Folder.update({ fileID: parentUUID,path: fpath,folders: { $add: fName+"/"+resp.get().fileID } }, (err2,) => {
			if ("function" === typeof cb) {
				return cb(err2)
			}
			
			return cb(new Error());
		})

	})
}

/**
 * @export
 * @param {string} path Path of file
 * @param {*} cb Callback
 * @returns {void}
 */
export const deleteFileByPath = function (path,cb) {
	File.scan().where("path").equals(path).exec((err,resp) => {
		if (!err) {
			if (!resp.Items[0]) {
				return cb(new Error("File not found"))
			}
			const curr = resp.Items[0].attrs
			const folderId = curr.parent
			
			return File.destroy({ fileID: curr.fileID,path: path }, (err2,) => {
				if (!err2) {
					const parr = path.split("/")
					const fname = parr.pop() + "/" + curr.fileID
					
					return Folder.update({ fileID: folderId,path: parr.join("/")+"/",files: { $del: fname } },(err3,resp3) => {
						if (err3) {
							return cb(err3)
						}

						return cb(err3,resp3.get())
					})
				} 
					
				return cb(err2)

			})
		} 
			
		return cb(err)
	})
}

/**
 * @export
 * @param {string} path Path of folder
 * @param {*} cb Callback
 * @returns {void}
 */
export const deleteFolderByPath = function (path,cb) {
	Folder.scan().where("path").equals(path).exec((err,resp) => {
		if (!err) {
			const curr = resp.Items[0].attrs
			const parentId = curr.parent
			if (curr.folders || curr.files) {
				return cb(new Error("Folder not empty"))
			}

			return Folder.destroy({ fileID: curr.fileID,path: path }, (err2,) => {
				if (!err2) {
					const parr = path.split("/")
					parr.pop()
					const fname = parr.pop() + "/" + curr.fileID

					return Folder.update({ fileID: parentId,path: parr.join("/")+"/",folders: { $del: fname } },(err3,resp3) => {
						if (err3) {
							return cb(err3)
						}

						return cb(err3,resp3.get())
					})
				}

				return cb(err2)
			})
		}

		return cb(err)
	})
}

/**
 * @export
 * @param {string} path Path of file
 * @param {string} fName File name
 * @param {string} content New conten
 * @param {*} cb Callback
 * @returns {void}
 */
export const createFile = function (path,fName,content,cb) {
	Folder.scan().where("path").equals(path).exec((err, resp) => {
		if (!err) {
			const fid = resp.Items[0].attrs.fileID;
			const fpath = resp.Items[0].attrs.path;

			return File.create({ path: fpath+fName,content: content,parent: fid }, (err2,resp2) => {
				if (!err2) {
					return Folder.update({ fileID: fid,path: fpath,files: { $add: fName+"/"+resp2.get().fileID } }, (err3,resp3) => {
						if ("function" === typeof cb) {
							return cb(err3,resp3.get())
						}
						
						return cb(new Error())
					})
				} 

				return cb(err2)
			})
		}
		
		return cb(err)
	})
}

/**
 * @export
 * @param {string} path Path of file
 * @param {string} content New Content
 * @param {*} cb Callback
 * @param {*} [createcb=function() {}] callback if file doesnt exists
 * @returns {void}
 */
export const updateFile = function (path,content,cb,createcb = function() {}) {
	File.scan().where("path").equals(path).exec((err, resp) => {
		if (!err) {
			if (resp.Items[0]) {
				const fid = resp.Items[0].attrs.fileID;
				const fpath = resp.Items[0].attrs.path;
				File.update({ fileID: fid,content: content,path: fpath }, (err2) => {
					if ("function" === typeof cb) {
						return cb(err2)
					}
					
					return cb(new Error())
				})
			} else {
				return createcb()
			}
		} else if ("function" === typeof cb) {
				return cb(err)
		}

		return cb(new Error())
	})
}

/**
 * @export
 * @param {string} uuid UUID
 * @param {string} path Path of file
 * @param {*} cb Callback
 * @returns {void}
 */
export const getFile = function (uuid,path, cb) {
	File.get({ fileID: uuid,path: path },(err, resp) => {
		if (!err) { 
			return cb(err,resp.get()) 
		}  

		return cb(err,null) 
	})
}


/**
 * @export
 * @param {string} uuid UUID
 * @param {string} path Path of folder
 * @param {*} cb Callback
 * @returns {void}
 */
export const getFolder = function (uuid,path, cb) {
	Folder.get({ fileID: uuid,path: path },(err, resp) => {
		cb(err,resp.get())
	})
}

/**
 * @export
 * @param {string} path Path of folder
 * @param {*} cb Callback
 * @returns {void}
 */
export const getFolderByPath = function (path, cb) {
	Folder.scan().where("path").equals(path).exec((err, resp) => {
		if (!err) {
			if (resp.Items[0]) {
				return cb(null,resp.Items[0].attrs)
			} 
			
			return cb(new Error('Folder not found'))
		} 
		
		return cb(err)
	})
}

/**
 * @export
 * @param {*} path Path of file
 * @param {*} cb Callback
 * @returns {void}
 */
export const getFileByPath = function (path, cb) {
	File.scan().where("path").equals(path).exec((err, resp) => {
		if (!err) {
			if (resp.Items[0]) {
				return cb(null,resp.Items[0].attrs)
			} 
				
			return cb(new Error('Folder not found'))
		} 

		return cb(err)	
	})
}

/**
 * @export
 * @param {string} username Username
 * @param {string} password Password
 * @param {*} cb Callback
 * @returns {void}
 */
export const validateUser = function (username,password,cb) {
	User.get(username,(err,resp) => {
		if (!err) {
			if (null === resp) {
				return cb(null,false)
			} else if (resp.get('password') === password) {
				return cb(null,username)
			} 
				
			return cb(null,false)
		} 

		return cb(err)
	})
}
