import React,{ Component } from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import './Terminal.css';
import Nano from './Nano';
import * as log from 'loglevel';

class Terminal extends Component {
	constructor(props) {
		super(props);
		this.state = {
			sections: [],
			currentDir: {},
			cmdNames: [],
			prompt: "B:/>",
			commandArr: [],
			currentCommand: 0,
			rawAutocomp: [],
			nanoOpen: false,
			nanoSaving: false,
			nanoFile: {},
			nanoFilePath: "",
			commandHistory: [],
			command: "",
			currCmd: 0
		};
		this.sendCommand = this.sendCommand.bind(this)
		this.updateCommand = this.updateCommand.bind(this)
		this.updateCurrCmd = this.updateCurrCmd.bind(this)
		this.socket = props.socket;
	}

	componentDidMount() {
		const socket = this.socket
		socket.once('connect', () => {
			socket.emit('get cmdlist')
			socket.on('send clear', () => {
				this.setState({ sections: [], rawAutocomp: [] })
				socket.emit('get api',{ cmd: 'cat',args: ['/files/start'] });
			})
			socket.on('send landing page', function() {
					window.location.href = 'http://www.bentekkie.com';
			})
			socket.on('send download resume', function() {
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
				this.setState((prevState) => ({ sections: prevState.sections.concat([data]) }))
			})
			socket.on('send resume', (src) => {
				var wnd = window.open("about:blank", "", "_blank");
				wnd.document.write(src);
			})
			socket.on('update cdir', (currentDir) => {
				if (this.state.currentDir.path === undefined) {
					socket.emit('get api',{ cmd: 'cat',args: ['start'] });
				}
				this.setState({ currentDir: currentDir })
				let tmp = currentDir.path
				if (1 < tmp.length) {
					tmp = tmp.slice(0, -1);
				}
				const tl = tmp.split("/")
				if (2 < tl.length) {
					tmp = "/../" + tl[tl.length-1]
				}
				this.setState({ prompt: "B:" + tmp + ">" })
			})
			socket.on('send cmdlist',(data) => {
				this.setState({ cmdNames: data });
			})
			socket.on('send autocomp', (pargs) => {
				this.setState({ rawAutocomp: pargs })
			})
			socket.on('save file done', () => {
				this.setState({ saving: false, nanoOpen: false })
			})
			socket.on('send file', (payload) => {
				if (payload.file) {
					this.setState({ nanoOpen: true })
					this.setState({
						nanoFilePath: payload.dir,
						nanoFile: payload.file
					})
				}
			})
			socket.on('server error', (err) => {
				this.setState((prevState) => ({ sections: prevState.sections.concat(["<br/> ERROR <br/> <div class='error'>" + err + "</div><br/>"]) }))
				log.error(err)
			})
			socket.emit('get motd');
		})
	}

	static cleanCommand(c) {
		if ("" === c) {
			return c
		}
		var split = c.match(/(?:[^\s"]+|"[^"]*")+/gu);
		if ("login" === split[0] && 1 < split.length) {
			split[2] = split[2].replace(/./g, '*');
		}

		return split.join(" ")
	}

	sendCommand(c) {
		this.setState((prevState) => ({
					sections: prevState.sections.concat([this.state.prompt+Terminal.cleanCommand(c)+"<br />	"]),
					rawAutocomp: [],
					commandHistory: [c,...prevState.commandHistory]
				}))
		if ("" !== c) {
			this.setState((prevState) => ({
				commandArr: [...prevState.commandArr,c],
				currentCommand: prevState.commandArr.length+1
			}))
			var split = c.match(/(?:[^\s"]+|"[^"]*")+/gu);
			for (var i = 0; i < split.length; i += 1) {
				split[i] = split[i].replace(/"/gu,"");
			}
			const cmd = split[0];
			let args = null;
			if (0 < split.length) {
				args = split.slice(1);
			}
			this.socket.emit('get api',{ cmd: cmd, args: args })
		}
		
	}

	updateCommand(command) {
		this.setState({ command: command })
	}

	updateCurrCmd(currCmd) {
		this.setState({ currCmd: currCmd })
	}

	render() {
		return (
			<div className = "App_container" style={this.state.nanoOpen?{ height: "100%" }:{}}>
				
				{this.state.nanoOpen ? <Nano
					saving = {this.state.nanoSaving}
					openedFile = {this.state.nanoFile}
					onClose = {() => {
						this.setState({ saving: false, nanoOpen: false })
					}}
					saveFile = {(content) => {
						this.socket.emit('save file',{ path: this.state.nanoFilePath,text: content })
						this.setState({ nanoSaving: true })
					}}
				/> 
				: [
					<Window sections = {this.state.sections}/>,
					<CommandBar 
						prompt = {this.state.prompt} 
						commandHandler={this.sendCommand} 
						cmdNames = {this.state.cmdNames}
						getNewAutoComp = {(payload) => this.socket.emit('get autocomp',payload)}
						rawAutocomp = {this.state.rawAutocomp}
						commandHistory = {this.state.commandHistory}
						command = {this.state.command}
						currCmd = {this.state.currCmd}
						updateCommand = {this.updateCommand}
						updateCurrCmd = {this.updateCurrCmd}/>
				]}
				
			</div>
		);
	}
}

export default Terminal;
