var dbutils = require('./dbutils')

dbutils.deleteFolderByPath('/files/inner2/',(err) => console.log(err))