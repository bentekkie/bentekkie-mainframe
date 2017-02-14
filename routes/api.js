/**
 * New node file
 */
var fs = require('fs');

var commands = {
	''	: function (args,cdir) 
	{
		return "@empty";
    },
	'ls': function (args,cdir) 
	{
		testFolder = './'+cdir+'/';
		
		files = fs.readdirSync(testFolder);
		resp = ""
		for(file in files){
			  name = files[file];
			  name = name.split(".")[0];
			  if(name != "help") resp += "<br/>" + name ;
		}
		return resp;
	},
	'cat': function (args,cdir)
	{
		var resp = "<br/>"
		if(args != null && args.length > 0){
			try {
				resp += fs.readFileSync("./"+cdir+"/"+args[0]+".html", 'utf8');
			} catch (err) {
				console.log(err);
				resp = "<br/>File not found <br/>";
			}
		}else{
			resp = "No page name was specified. Usage of cat is: cat [page-name].";
			var element = document.getElementById("content");
    		element.scrollTop = element.scrollHeight;
		}
		return resp
	},
	'clear': function (args,cdir) 
	{
		return "@clear";
	},
	'help': function (args,cdir)
	{
		if(args != null && args.length < 1){
			return commands['cat'](["help"],cdir);
		}else{
			return commands.cat(["help/"+args[0]],cdir);
		}
	},
	'download-resume': function (args,cdir)
	{
		return "@dr";
	},
	'cd': function (args,cdir) {
		if(args !== null && args.length >0){
			if(args[0] == "files" || args[0] == "hidden"){
				return "@cd"+args[0];
			}else{
				return "<br/>Invalid directory<br/>";
			}
		}else {
			return '<br/>No directory given, usage for cd is: cd [directory] <br/>';
		}
	},
	'landing-page': function (args,cdir) {
		return "@lp";
		
	},
	'guest-book': function (args,cdir) {
		if(args != null && args.length >1){
			gbwrite(args[0],args[1]);
		}
		return "@gb";
	}
};

function gbwrite(wname,wmsg){
	var entry = {
			name: wname,
			msg: wmsg
			};
	var file = JSON.parse(fs.readFileSync('./raw/guestbook.json'));
	file.push(entry);
	fs.writeFileSync('./raw/guestbook.json', JSON.stringify(file));
}

exports.api = function(req, res){
	var cmd = req.params.cmd;
	var p = req.query.p;
	var cdir = req.query.cdir;
	var args = JSON.parse(p);
	if ( cmd in commands){
		res.send(commands[cmd](args,cdir));
	}else{
		res.send("<br/> Invalid command. <br/>");
	}
  
};

exports.cmdlst = function(req, res){
	res.send(JSON.stringify(Object.keys(commands)));
};