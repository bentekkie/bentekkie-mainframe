var socket = io();
var editor;
$(document).ready( function(){
	var node = document.getElementById('editor')
	var content = document.getElementById('editor-inside').innerHTML
	editor = new SquireUI( node )
	editor.setHTML(content);
	$("#submitBtn").click(function () {
		socket.emit("save",{text:editor.getHTML(),path:window.location.pathname})
	})
});

