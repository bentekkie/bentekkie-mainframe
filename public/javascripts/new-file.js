var socket = io();

$(document).ready( function(){
	$('#newForm').submit(function() { 
    	form = new FormData(document.getElementById("newForm"))
    	if(form.get("nameInput") !== ""){
    		path = "/"+window.location.pathname.split("/").slice(2)+"/"
    		if(path === "//") path = "/"
    		socket.emit('new item',{type:form.get('typeSelect'),name:form.get('nameInput'),path:path})
    	}
	    return false; // cancel original event to prevent form submitting
    })
})

function deleteItem(type,name) {
	sanityCheck = confirm("Do you actually want to delete the "+ type + ": "+name);
	if(sanityCheck){
		path = "/"+window.location.pathname.split("/").slice(2)+"/"
   		if(path === "//") path = "/"
		socket.emit('delete item',{type:type,name:name,path:path})
	}
}

socket.once('connect', function () {
	socket.on('editor reload',() => {
		location.reload(true)
	})
})