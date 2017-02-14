
var commands = {
	'ls':
	{
		usage:'ls',
		purpose:'To list all pages on the site'
	},
	'cat':
	{
		usage:'cat [page-name]',
		purpose:'To diplay the contents of a page with name page-name.'
	},
	'clear':
	{
		usage:'clear',
		purpose:'Clears console'
	},
	'help':
	{
		usage:'help or help [command]',
		purpose:'If no command is given, then all possible commands are displayed. Otherwise the helpdoc for the given command is displayed.'
	},
	'download-resume':
	{
		usage:'download-resume',
		purpose:'Downloads a full PDF of my resume.'
	},
	'cd':
	{
		usage:'',
		purpose:''
	},
	'landing-page':
	{
		usage:'landing-page',
		purpose:'Navigate back to the landing page of bentekkie.com'
	},/*
	'guest-book':
	{
		usage:'guest-book or guest-book [name] [message]',
		purpose:'Displays the guestbook, if name and message are provided then they are added to the guestbook'
	}*/
};

exports.cmd = function(req, res){
	cmd = req.params.cmd;
	if(cmd in commands){
		res.render('help',{data:commands[req.params.cmd]});
	}else{
		res.send('<br/>Help file not found.<br/>')
	}
	
};