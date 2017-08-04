var currentDir = "/files";
var command_arr = [];
var current_command = 0;
var autocomp = {
	frag: "",
	comps: [],
	cindex: 0
};
var cmdnames = []
var socket = io();
var c = ""
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
    	c = document.getElementById("command").value;
    	if(autocomp.frag == "" || !c.startsWith(autocomp.frag)){
    		var split = c.match(/(?:[^\s"]+|"[^"]*")+/g);
			for(var i = 0; i < split.length; i++) {
				split[i] = split[i].replace(/"/g,"");
			}
    		if(cmdnames.indexOf(split[0]) >= 0 && split[1] !== undefined){
    			socket.emit('get autocomp',{cmd:split[0],params:split.slice(1)})
    		}else {
    			autocomp.frag = c;
	    		autocomp.cindex = 0;
	    		autocomp.comps = cmdnames.filter(function(s){
					    			return s.startsWith(c);
					    		}) 
    		}
    		
    	}
    	if(autocomp.comps.length > 0){
    		document.getElementById("command").value = autocomp.comps[autocomp.cindex];
    		autocomp.cindex = (autocomp.cindex+1) % autocomp.comps.length;
    	}
    	
    	e.preventDefault();
    }else{
    	autocomp = {
			frag: "",
			comps: [],
			cindex: 0
		};
    }
};




$(document).ready( function(){
	socket.emit('get cmdlist')
    document.getElementById("command").addEventListener("keydown",function(e) {
	    // space and arrow keys
	    if([38, 40].indexOf(e.keyCode) > -1) {
	        e.preventDefault();
	    }
    }, false);
    if( window.outerWidth < 598){
        $("#content").empty();
        $.get('/client/tooSmall.html', function(data){
    		$("#content").append(data);
    		gotoBottom("content");
    	});
    	$("#content").append(data);
    	gotoBottom("content");
        document.getElementById("command").disabled = true;
        document.getElementById("command").placeholder = "";
    }else{
    	socket.emit('get api',{cmd:'cat',args:['start']});
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

function run(){
	var c = document.getElementById("command").value;
	if( c != ""){
		command_arr.push(c);
		current_command = command_arr.length;
	}
	$("#content").append("<br \> "+$("#submittext").html()+c+"<br />	");
	var split = c.match(/(?:[^\s"]+|"[^"]*")+/g);
	for(var i = 0; i < split.length; i++) {
		split[i] = split[i].replace(/"/g,"");
	}
	var cmd = split[0];
	var args = null;
	if(split.length > 0) var args = split.slice(1);
	socket.emit('get api',{cmd:cmd,args:args})
	gotoBottom("content");
	
}
socket.on('connect', function () {
	socket.on('send clear', function(){
		$("#content").empty();
		socket.emit('get api',{cmd:'cat',args:['start']});
	})
	socket.on('send landing page', function(){
		window.location.href = 'http://www.bentekkie.com';
	})
	socket.on('send download resume', function(){
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
	})
	socket.on('send api', function(data){
		$("#content").append(data);
		gotoBottom("content");
	})
	socket.on('update cdir', function (currentDir) {
		tl = currentDir.split("/")
		tmp = currentDir
		if(tl.length > 2){
			tmp = "/../" + tl[tl.length-1]
		}
		$("#submittext").html("B:" + tmp + ">");
		$("#command").css("width","calc(100% - " + (tmp.length+6) + "ch)")
		gotoBottom("content");

	})
	socket.on('send cmdlist',function(data){
		cmdnames = data;
	})
	socket.on('send autocomp', function(pargs){
		autocomp.comps = pargs.filter(function(s){
		    			return s.startsWith(c);
		    		})
		if(autocomp.comps.length > 0){ 
			autocomp.frag = c;
			autocomp.cindex = 0;
			document.getElementById("command").value = autocomp.comps[autocomp.cindex];
			autocomp.cindex = (autocomp.cindex+1) % autocomp.comps.length;
		}
	})
})

