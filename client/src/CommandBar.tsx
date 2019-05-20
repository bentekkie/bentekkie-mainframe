import React, {ChangeEvent, Component, FormEvent, KeyboardEvent} from 'react';
import './CommandBar.css';

interface IProps {
    commandHandler(c : string):void
    getNewAutoComp(command: string, args: string[]):void
    autoComp: string[]
    prompt: string
    cmdNames: string[]
}

interface IState {
    command:string,
    command_history:string[],
    curr_cmd:number,
    autoComp:{
        frag:string,
        comps:string[],
        cIndex:number
    }
}

class CommandBar extends Component<IProps,IState> {
    constructor(props: Readonly<IProps>){
        super(props);
        this.state = {
            command : "",
            command_history: [],
            curr_cmd:0,
            autoComp: {
                frag: "",
                comps: [],
                cIndex: 0
            }
        };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    handleChange(event : ChangeEvent<HTMLInputElement>) {
        this.setState({command: event.target.value});
    }

    handleSubmit(event : FormEvent<HTMLFormElement>) {
        if(this.state.command === "")console.log("empty");
        this.props.commandHandler(this.state.command);
        this.setState((prevState) => ({
            command:"",
            command_history:[prevState.command,...prevState.command_history],
            curr_cmd:0,
            autoComp:{
                frag:"",
                cIndex:0,
                comps:[]
            }
        }));
        event.preventDefault()
    }
    componentWillReceiveProps(nextProps : IProps) {
        function arrays_equal(a : any[],b : any[]) { return !!a && !!b && !(a<b || b<a); }
        if(nextProps.autoComp.length > 0 && !arrays_equal(nextProps.autoComp,this.props.autoComp)){
            let filteredArr = nextProps.autoComp.filter((s) =>{
                return s.startsWith(this.state.command);
            });
            if(filteredArr.length > 0){
                this.setState((prevState) => ({
                    command:filteredArr[0],
                    autoComp:{
                        frag:prevState.command,
                        cIndex:1 % filteredArr.length,
                        comps:filteredArr
                    }
                }))
            }else{
                this.setState((prevState) => ({
                    autoComp:{
                        ...prevState.autoComp,
                        comps:filteredArr
                    }
                }))
            }
        }
    }
    handleKeyDown(event : KeyboardEvent<HTMLInputElement>){
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
            if(this.state.autoComp.frag === "" || !this.state.command.startsWith(this.state.autoComp.frag)){
                let split = this.state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
                if(!split) split = [];
                for(let i = 0; i < split.length; i++) {
                    split[i] = split[i].replace(/"/g,"");
                }
                if(this.props.cmdNames.indexOf(split[0]) >= 0 && split[1] !== undefined){
                    this.props.getNewAutoComp(split[0],split.slice(1))
                }else {
                    let filteredArr = this.props.cmdNames.filter((s) => {
                        return s.startsWith(this.state.command);
                    });
                    if(filteredArr.length > 0){
                        this.setState((prevState) => ({
                            command:filteredArr[0],
                            autoComp:{
                                frag:prevState.command,
                                cIndex:1 % filteredArr.length,
                                comps:filteredArr
                            }
                        }))
                    }else{
                        this.setState((prevState) => ({
                            autoComp:{
                                ...prevState.autoComp,
                                comps:filteredArr
                            }
                        }))
                    }
                }

            }else if(this.state.autoComp.comps.length > 0){
                this.setState((prevState) => ({
                    command:prevState.autoComp.comps[prevState.autoComp.cIndex],
                    autoComp:{
                        ...prevState.autoComp,
                        cIndex:(prevState.autoComp.cIndex+1) % prevState.autoComp.comps.length
                    }
                }))
            }

            event.preventDefault();
        }else{
            this.setState({
                autoComp:{
                    frag:"",
                    cIndex:0,
                    comps:[]
                }
            })
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
                <input className= "CommandBar_submit" type="submit" tabIndex={-1}/>
            </form>
        );
    }
}

export default CommandBar;