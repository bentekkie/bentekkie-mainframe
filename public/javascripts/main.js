var currentDir = "files";
var command_arr = [];
var current_command = 0;
var autocomp = {
		frag: "",
		comps: [],
		cindex: 0
};
var cmdnames = []


var handler = function(e)
{
    if (e.keyCode == 38){
    	if(current_command > 0){
    		current_command -= 1;
    		document.getElementById("command").value = command_arr[current_command];
    		
    	}
    }else if(e.keyCode == 40) 
    {
        if(current_command < (command_arr.length-1)){
        	current_command += 1;
        	document.getElementById("command").value = command_arr[current_command];
        }else if( current_command == (command_arr.length-1)){
        	current_command += 1;
        	document.getElementById("command").value = "";
        }
    }else if(e.keyCode == 9){
    	var c = document.getElementById("command").value;
    	if(autocomp.frag == "" || !c.startsWith(autocomp.frag)){
    		autocomp.frag = c;
    		autocomp.cindex = 0;
    		autocomp.comps = cmdnames.filter(function(s){
				    			return s.startsWith(c);
				    		}) 
    	}
    	if(autocomp.comps.length > 0){
    		document.getElementById("command").value = autocomp.comps[autocomp.cindex];
    		autocomp.cindex = (autocomp.cindex+1) % autocomp.comps.length;
    	}
    	
    	e.preventDefault();
    }
};


$(document).ready( function(){
	$.get('/cmdlst',{}, function(data){
		cmdnames = JSON.parse(data);
	});
    document.getElementById("command").addEventListener("keydown",function(e) {
	    // space and arrow keys
	    if([38, 40].indexOf(e.keyCode) > -1) {
	        e.preventDefault();
	    }
    }, false);
    if( window.outerWidth < 598){
        $("#content").empty();
        $.get('/api/cat',{p:JSON.stringify(["help/tooSmall"]),cdir:'files'}, function(data){
    		$("#content").append(data);
    		gotoBottom("content");
    	});
        document.getElementById("command").disabled = true;
        document.getElementById("command").placeholder = "";
    }else{
    	$.get('/api/cat',{p:JSON.stringify(["start"]),cdir:'files'}, function(data){
    		$("#content").append(data);
    		gotoBottom("content");
    	});
        $('input').bind('keydown',handler);
        $('input').bind('keypress',handler);
    }
    $('#submitform').submit(function() { 
    	run();
    document.getElementById("command").value = "";
    return false; // cancel original event to prevent form submitting
    });
});


function gotoBottom(id){
   var div = document.getElementById(id);
   div.scrollTop = div.scrollHeight - div.clientHeight;
}

localcmds = {
		"@clear": function(){
			$("#content").empty();
			$.get('/api/cat',{p:JSON.stringify(["start"]),cdir:'files'}, function(data){
	    		$("#content").append(data);
	    		gotoBottom("content");
	    	});
		},
		"@lp": function(){
			window.location.href = 'http://www.bentekkie.com';
		},
		"@dr": function(){
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
		"@cdfiles": function(){
			$("#content").append('Changed directory from "B:/'+currentDir+'" to "B:/files"');
			currentDir = "files";
		},
		"@cdhidden": function(){
			$("#content").append('Changed directory from "B:/'+currentDir+'" to "B:/hidden"');
			currentDir = "hidden";
		},
		"@gb": function(){
			$.get('/gb/read',{}, function(data){
	    		$("#content").append(data);
	    		gotoBottom("content");
	    	});
		}
		
}


function run(){
	var c = document.getElementById("command").value;
	if( c != ""){
		command_arr.push(c);
		current_command = command_arr.length;
	}
	$("#content").append("<br \> B:/"+currentDir+">"+c+"<br />	");
	var split = c.match(/(?:[^\s"]+|"[^"]*")+/g);
	for(var i = 0; i < split.length; i++) {
		split[i] = split[i].replace(/"/g,"");
	}
	var cmd = split[0];
	var args = null;
	if(split.length > 0) var args = split.slice(1);
	params = {p: JSON.stringify(args),cdir:currentDir};
	if(cmd == "help" && args.length > 0){
		$.get('/help/' + args[0],{}, function(data){
			$("#content").append(data);
			
			gotoBottom("content");
		});
	}else{
		$.get('/api/' + cmd,params, function(data){
			if(data[0] == "@"){
				localcmds[data]();
			}else{
				$("#content").append(data);
			}
			
			gotoBottom("content");
		});
	}
	
}