var dynamo = require('dynamodb');
var Joi = require('joi');
dynamo.AWS.config.loadFromPath('aws-config.json');

module.exports = {
	File: dynamo.define('Event', {
		hashKey:"fileID",
		rangeKey:"path",
		schema:{
			fileID:dynamo.types.uuid(),
			parent:Joi.string(),
			path:Joi.string(),
			type:Joi.string().default("file"),
			content:Joi.string()
		},
        tableName: 'bentekkie-mainframe-store'
	}),
	Folder: dynamo.define('Event', {
		hashKey:"fileID",
		rangeKey:"path",
		schema:{
			fileID:dynamo.types.uuid(),
			parent:Joi.string(),
			path:Joi.string(),
			type:Joi.string().default("folder"),
			files:dynamo.types.stringSet(),
			folders:dynamo.types.stringSet()
		},
        tableName: 'bentekkie-mainframe-store'
	})
}