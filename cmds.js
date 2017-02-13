exports.cmds = {
	''	: function (args) 
	{
		var element = document.getElementById("content");
    	element.scrollTop = element.scrollHeight;
    },
	'ls': function (args) 
	{
		load("server.php?dir="+currentDir);
	},
	'cat': function (args)
	{
		if(args != null && args.length > 0){
			fileName = args[0];
			load(currentDir+"/"+fileName+".html");
			var element = document.getElementById("content");
    		element.scrollTop = element.scrollHeight;
		}else{
			$("#content").append("No page name was specified. Usage of cat is: cat [page-name].");
			var element = document.getElementById("content");
    		element.scrollTop = element.scrollHeight;
		}
	},
	'clear': function (args) 
	{
		$("#content").empty();
		load("files/start.html");
	},
	'help': function (args)
	{
		if(args != null && args.length < 1){
			load("files/help.html");
		}else{
			topic = args[0];
			load("help/"+topic+".html");
			var element = document.getElementById("content");
    		element.scrollTop = element.scrollHeight;
		}
	},
	'download-resume': function (args)
	{
		var link = document.createElement('a');
		link.download = "Benjamin Segall's Resume.pdf";
		link.href = '/file/benjaminSegallsResume.pdf';
		
		// Because firefox not executing the .click() well
		// We need to create mouse event initialization.
		var clickEvent = document.createEvent("MouseEvent");
		clickEvent.initEvent("click", true, true);
		
		link.dispatchEvent(clickEvent);
		var element = document.getElementById("content");
    	element.scrollTop = element.scrollHeight;
	},
	'cd': function (args) {
		if(args != null && args.length >0){
			if(args[0] == "/hidden"){ // Easter-eggs here, there may be. - Yoda (Totally made up this quote lol :P)
				$("#content").append('Changed directory from "B:/'+currentDir+'" to "B:/hidden"');
				currentDir = "hidden";
			}else if(args[0] == "/files"){
				$("#content").append('Changed directory from "B:/'+currentDir+'" to "B:/files"');
				currentDir = "files";
			}else{
				$("#content").append('Invalid directory name');
			}
			var element = document.getElementById("content");
	    	element.scrollTop = element.scrollHeight;	
		}else {
			$("#content").append('No directory given, usage for cd is: cd [directory]');
			var element = document.getElementById("content");
	    	element.scrollTop = element.scrollHeight;
		}
	},
	'landing-page': function (args) 
	{
		window.location.href = 'http://www.bentekkie.com';
	}
};