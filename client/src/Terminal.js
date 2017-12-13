import React, { Component } from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import './Terminal.css';

class Terminal extends Component {
	constructor(props) {
		super(props);
		this.state = {
			sections: [],
			currentDir: {},
			cmdNames: [],
			prompt:"B:/>",
			command_arr: [],
			current_command:0,
			rawAutocomp:[]
		};
		this.sendCommand = this.sendCommand.bind(this)
		this.socket = props.socket;
	}
	componentDidMount() {
		const socket = this.socket
		socket.once('connect', () => {
			console.log("connected")
			socket.emit('get cmdlist')
			socket.on('send clear', () => {
				this.setState({sections: [], rawAutocomp: []})
				socket.emit('get api',{cmd:'cat',args:['start']});
			})
			socket.on('send landing page', function(){
					window.location.href = 'http://www.bentekkie.com';
			})
			socket.on('send download resume', function(){
				var link = document.createElement('a');
				link.download = "Benjamin Segall's Resume.pdf";
				link.href = '/file/benjaminSegallsResume.pdf';
				var clickEvent = document.createEvent("MouseEvent");
				clickEvent.initEvent("click", true, true);
				
				link.dispatchEvent(clickEvent);
				var element = document.getElementById("content");
					element.scrollTop = element.scrollHeight;
			})
			socket.on('send api', (data) => {
				this.setState((prevState) => ({
					sections: prevState.sections.concat([data])
				}))
			})
			socket.on('update cdir', (currentDir) => {
				if(this.state.currentDir.path === undefined){
					socket.emit('get api',{cmd:'cat',args:['start']});
				}
				this.setState({currentDir:currentDir})
				let tmp = currentDir.path
				if(tmp.length > 1) tmp = tmp.slice(0, -1);
				let tl = tmp.split("/")
				if(tl.length > 2){
					tmp = "/../" + tl[tl.length-1]
				}
				this.setState({prompt:"B:" + tmp + ">"})
			})
			socket.on('send cmdlist',(data) => {
				this.setState({cmdNames:data});
			})
			socket.on('send autocomp', (pargs) => {
				this.setState({rawAutocomp:pargs})
			})
			socket.emit('get motd');
		})
	}

	sendCommand(c){
		this.setState((prevState) => ({
					sections: prevState.sections.concat([this.state.prompt+c+"<br />	"]),
					rawAutocomp: []
				}))
		if( c !== ""){
			this.setState((prevState) => ({
				command_arr:[...prevState.command_arr,c],
				current_command:prevState.command_arr.length+1
			}))
			var split = c.match(/(?:[^\s"]+|"[^"]*")+/g);
			for(var i = 0; i < split.length; i++) {
				split[i] = split[i].replace(/"/g,"");
			}
			var cmd = split[0];
			var args = null;
			if(split.length > 0) args = split.slice(1);
			this.socket.emit('get api',{cmd:cmd,args:args})
		}
		
	}

	render() {
		return (
			<div className = "App_container">
				<Window  sections = {this.state.sections}/>
				<CommandBar 
					prompt = {this.state.prompt} 
					commandHandler={this.sendCommand} 
					cmdNames = {this.state.cmdNames}
					getNewAutoComp = {(payload) => this.socket.emit('get autocomp',payload)}
					rawAutocomp = {this.state.rawAutocomp}/>
			</div>
		);
	}
}

export default Terminal;
