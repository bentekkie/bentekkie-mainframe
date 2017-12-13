import React, { Component } from 'react';
import './CommandBar.css';


class CommandBar extends Component {
	constructor(props){
		super(props)
		this.state = {
			command : "",
			command_history: [],
			curr_cmd:0,
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
		this.setState({command: event.target.value});
	}

	handleSubmit(event) {
		if(this.state.command === "")console.log("empty")
		this.props.commandHandler(this.state.command)
		this.setState((prevState) => ({
			command:"",
			command_history:[prevState.command,...prevState.command_history],
			curr_cmd:0,
			autocomp:{
					frag:"",
					cindex:0,
					comps:[]
				}
		}))
		event.preventDefault()
	}
	componentWillReceiveProps(nextProps) {
		function arrays_equal(a,b) { return !!a && !!b && !(a<b || b<a); }
		if(nextProps.rawAutocomp.length > 0 && !arrays_equal(nextProps.rawAutocomp,this.props.rawAutocomp)){
			let filteredArr = nextProps.rawAutocomp.filter((s) =>{
								return s.startsWith(this.state.command);
							})
			if(filteredArr.length > 0){ 
				this.setState((prevState) => ({
					command:filteredArr[0],
					autocomp:{
						frag:prevState.command,
						cindex:1 % filteredArr.length,
						comps:filteredArr
					}
				}))
			}else{
				this.setState((prevState) => ({
					autocomp:{
						...prevState.autocomp,
						comps:filteredArr
					}
				}))
			}
		}
	}
	handleKeyDown(event){
		if (event.keyCode === 38){
			if(this.state.curr_cmd < this.state.command_history.length){
    			this.setState((prevState) => ({
    				command:prevState.command_history[prevState.curr_cmd],
    				curr_cmd:prevState.curr_cmd+1
    			}))
    		}
			event.preventDefault();
    	}else if(event.keyCode === 40){
    		if(this.state.curr_cmd > 1){
    			this.setState((prevState) => ({
    				command:prevState.command_history[prevState.curr_cmd-2],
    				curr_cmd:prevState.curr_cmd-1
    			}))
    		}else if(this.state.curr_cmd === 1){
				this.setState({
    				command:"",
    				curr_cmd:0
    			})
    		}
        	event.preventDefault();
    	}else if(event.keyCode === 9){
    		if(this.state.autocomp.frag === "" || !this.state.command.startsWith(this.state.autocomp.frag)){
	    		var split = this.state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
				for(var i = 0; i < split.length; i++) {
					split[i] = split[i].replace(/"/g,"");
				}
	    		if(this.props.cmdNames.indexOf(split[0]) >= 0 && split[1] !== undefined){
	    			this.props.getNewAutoComp({cmd:split[0],params:split.slice(1)})
	    		}else {
		    		let filteredArr = this.props.cmdNames.filter((s) => {
						    			return s.startsWith(this.state.command);
						    		})
		    		if(filteredArr.length > 0){ 
						this.setState((prevState) => ({
							command:filteredArr[0],
							autocomp:{
								frag:prevState.command,
								cindex:1 % filteredArr.length,
								comps:filteredArr
							}
						}))
					}else{
						this.setState((prevState) => ({
							autocomp:{
								...prevState.autocomp,
								comps:filteredArr
							}
						}))
					}
	    		}
	    		
	    	}else if(this.state.autocomp.comps.length > 0){
	    		this.setState((prevState) => ({
					command:prevState.autocomp.comps[prevState.autocomp.cindex],
					autocomp:{
						...prevState.autocomp,
						cindex:(prevState.autocomp.cindex+1) % prevState.autocomp.comps.length
					}
				}))
	    	}
    	
    		event.preventDefault();
    	}else{
    		this.setState((prevState) => ({
				autocomp:{
					frag:"",
					cindex:0,
					comps:[]
				}
			}))
    	}
	}

	render() {
		return (
			<form className= "CommandBar_form" onSubmit={this.handleSubmit}>
				<div>
					<div className="CommandBar_submitText">{this.props.prompt}</div>
					<input 
						className= "CommandBar_input" 
						style={{width:"calc(100% - " + (this.props.prompt.length+6) + "ch)"}} 
						type="text" 
						value={this.state.command} 
						onChange={this.handleChange} 
						placeholder="Enter command"
						autoFocus
						autoCorrect="off"
						autoComplete="off"
						autoCapitalize="none"
						onKeyDown={this.handleKeyDown} 
					/>
				</div>
				<input className= "CommandBar_submit" type="submit" tabIndex='-1'/>
			</form>
		);
	}
}

export default CommandBar;