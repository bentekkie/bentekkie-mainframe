import commands from '../commands';

export default {
	'': function () {
		return [];
    },
	'ls': function (args,cdir) {
		const resp = []
		for (const i in cdir.folders) {
			resp.push('ls ' + cdir.folders[i].split("/")[0]);	
		}

		return resp;
	},
	'cat': function (args,cdir) {
		const resp = []
		for (const i in cdir.files) {
			resp.push('cat ' + cdir.files[i].split("/")[0]);	
		}

		return resp;
	},
	'nano': function (args,cdir) {
		const resp = []
		for (const i in cdir.files) {
			resp.push('nano ' + cdir.files[i].split("/")[0]);	
		}

		return resp;
	},
	'clear': function () {
		return [];
	},
	'help': function () {	
		const resp = [];
		for (const key in commands) {
			resp.push('help '+key);
		}

		return resp;
	},
	'download-resume': function () {
		return [];
	},
	'cd': function (args,cdir) {
		const resp = []
		for (const i in cdir.folders) {
			resp.push('cd ' + cdir.folders[i].split("/")[0]);	
		}

		return resp;
	},
	'landing-page': function () {
		return [];	
	},
	'rm': function (args,cdir) {
		const resp = []
		for (const i in cdir.files) {
			resp.push('rm ' + cdir.files[i].split("/")[0]);	
		}

		return resp;
	},
	'rmdir': function (args,cdir) {
		const resp = []
		for (const i in cdir.folders) {
			resp.push('rmdir ' + cdir.folders[i].split("/")[0]);	
		}

		return resp;
	}
}
