import React, { Component } from 'react';
import './CommandBar.css';


class CommandBar extends Component {
	constructor(props) {
		super(props)
		this.state = {
			autocomp: {
						frag: "",
						comps: [],
						cindex: 0
					}
			}
		this.handleChange = this.handleChange.bind(this)
		this.handleSubmit = this.handleSubmit.bind(this)
		this.handleKeyDown = this.handleKeyDown.bind(this)
		this.socket = this.props.socket
	}

	handleChange(event) {
		this.props.updateCommand(event.target.value)
	}

	handleSubmit(event) {
		this.props.commandHandler(this.props.command)
		this.props.updateCommand("")
		this.props.updateCurrCmd(0)
		this.setState((prevState) => ({
			autocomp: {
					frag: "",
					cindex: 0,
					comps: []
				}
		}))
		event.preventDefault()
	}

	componentWillReceiveProps(nextProps) {
		const arraysEqual = (a,b) => Boolean(a) && Boolean(b) && !(a<b || b<a); 

		if (0 < nextProps.rawAutocomp.length && !arraysEqual(nextProps.rawAutocomp,this.props.rawAutocomp)) {
			const filteredArr = nextProps.rawAutocomp.filter((s) => s.startsWith(this.props.command))
			if (0 < filteredArr.length) { 
				this.props.updateCommand(filteredArr[0])
				this.setState((prevState) => ({
					autocomp: {
						frag: this.props.command,
						cindex: 1 % filteredArr.length,
						comps: filteredArr
					}
				}))
			} else {
				this.setState((prevState) => ({
					autocomp: {
						...prevState.autocomp,
						comps: filteredArr
					}
				}))
			}
		}
	}

	handleKeyDown(event) {
		switch (event.keyCode) {
			case 38:
				if (this.props.currCmd < this.props.commandHistory.length) {
					this.props.updateCommand(this.props.commandHistory[this.props.currCmd])
					this.props.updateCurrCmd(this.props.currCmd+1)
				}
				event.preventDefault();
				break;
			case 40:
				if (1 < this.props.currCmd) {
					this.props.updateCommand(this.props.commandHistory[this.props.currCmd-2])
					this.props.updateCurrCmd(this.props.currCmd-1)
				} else if (1 === this.props.currCmd) {
					this.props.updateCommand("")
					this.props.updateCurrCmd(0)
				}
				event.preventDefault();
				break;
			case 9:
				if ("" === this.state.autocomp.frag || !this.props.command.startsWith(this.state.autocomp.frag)) {
					var split = this.props.command.match(/(?:[^\s"]+|"[^"]*")+/gu);
					if (!split) {
						split = []
					}
					for (var i = 0; i < split.length; i += 1) {
						split[i] = split[i].replace(/"/gu,"");
					}
					if (0 <= this.props.cmdNames.indexOf(split[0]) && split[1] !== undefined) {
						this.props.getNewAutoComp({ cmd: split[0],params: split.slice(1) })
					} else {
						const filteredArr = this.props.cmdNames.filter((s) => s.startsWith(this.props.command))
						if (0 < filteredArr.length) { 
							this.props.updateCommand(filteredArr[0])
							this.setState((prevState) => ({
								autocomp: {
									frag: this.props.command,
									cindex: 1 % filteredArr.length,
									comps: filteredArr
								}
							}))
						} else {
							this.setState((prevState) => ({
								autocomp: {
									...prevState.autocomp,
									comps: filteredArr
								}
							}))
						}
					}
					
				} else if (0 < this.state.autocomp.comps.length) {
					this.props.updateCommand(this.state.autocomp.comps[this.state.autocomp.cindex])
					this.setState((prevState) => ({
						autocomp: {
							...prevState.autocomp,
							cindex: (prevState.autocomp.cindex+1) % prevState.autocomp.comps.length
						}
					}))
				}
				event.preventDefault();
				break;
			default:
				this.setState(() => ({
					autocomp: {
						frag: "",
						cindex: 0,
						comps: []
					}
				}))
				break;
		}
	}

	render() {
		return (
			<form className= "CommandBar_form" onSubmit={this.handleSubmit}>
				<div>
					<div className="CommandBar_submitText">{this.props.prompt}</div>
					<input 
						className= "CommandBar_input" 
						style={{ width: "calc(100% - " + (this.props.prompt.length+6) + "ch)" }} 
						type="text" 
						value={this.props.command} 
						onChange={this.handleChange} 
						placeholder="Enter command"
						autoFocus
						autoCorrect="off"
						autoComplete="off"
						autoCapitalize="none"
						onKeyDown={this.handleKeyDown} 
					/>
				</div>
				<input className= "CommandBar_submit" type="submit" tabIndex="-1"/>
			</form>
		);
	}
}

export default CommandBar
