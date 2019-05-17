import React, {Component} from 'react';
import Window from './Window';
import CommandBar from './CommandBar';
import './Terminal.css';
import {shellClient} from "./generated/command_pb_service";
import {Command, CommandType, Folder, Response} from "./generated/command_pb";
import {isValidCommand} from "./utils";
import {Empty} from "google-protobuf/google/protobuf/empty_pb";

interface IProps {
    client:shellClient
}

interface IState {
    sections: string[],
    currentDir?: Folder,
    prompt:string,
    command_arr: string[],
    current_command:number,
    rawAutoComp: string[]
}

class Terminal extends Component<IProps,IState> {
    constructor(props: Readonly<IProps>) {
        super(props);
        this.state = {
            sections: [],
            currentDir: undefined,
            prompt:"B:/>",
            command_arr: [],
            current_command:0,
            rawAutoComp:[]
        };
        this.sendCommand = this.sendCommand.bind(this);
        this.receiveResponse = this.receiveResponse.bind(this);
    }

    receiveResponse(resp: Response){
        const currentDir = resp.getCurrentdir();
        if(currentDir){
            let tmp = currentDir.getPath();
            if(tmp.length > 1) tmp = tmp.slice(0, -1);
            let tl = tmp.split("/");
            if(tl.length > 2){
                tmp = "/../" + tl[tl.length-1]
            }
            this.setState((prevState) => ({
                sections: prevState.sections.concat([resp.getResp()]),
                currentDir,
                prompt:"B:" + tmp + ">"
            }))
        }
    }

    componentDidMount() {
        new Promise<Folder>((resolve, reject) => {
            this.props.client.getRoot(new Empty(), (err, folder) => (folder ? resolve(folder) : reject(err)))
        }).then(currentDir => {
            return new Promise((resolve => this.setState({currentDir},() => resolve())))
        }).then(() => {
            return new Promise<Response>((resolve, reject) => {
                let command = new Command();
                command.setCommand(CommandType.CAT);
                command.addArgs('/files/start');
                command.setCurrentdir(this.state.currentDir);
                this.props.client.runCommand(command,(err,resp) => resp ? resolve(resp) : reject(err));
            })
        }).then(resp => {
            this.receiveResponse(resp);
        }).catch(err => {
            console.error(err)
        });
    }

    sendCommand(c : string){
        this.setState((prevState) => ({
            sections: prevState.sections.concat([this.state.prompt+c+"<br />	"]),
            rawAutoComp: []
        }));
        if( c !== ""){
            this.setState((prevState) => ({
                command_arr:[...prevState.command_arr,c],
                current_command:prevState.command_arr.length+1
            }));
            let split = c.match(/(?:[^\s"]+|"[^"]*")+/g);
            if(split){
                for(let i = 0; i < split.length; i++) {
                    split[i] = split[i].replace(/"/g,"");
                }
                let cmd = split[0];
                let args : string[] = [];
                if(split.length > 0) args = split.slice(1);
                cmd = cmd.toUpperCase();
                if(isValidCommand(cmd)){
                    switch (CommandType[cmd]) {
                        case CommandType.CLEAR: {
                            this.setState({sections: [], rawAutoComp: []});
                            let command = new Command();
                            command.setCurrentdir(this.state.currentDir);
                            command.setArgsList(["/files/start"]);
                            command.setCommand(CommandType.CAT);
                            this.props.client.runCommand(command, (err, resp) => {
                                if (resp) {
                                    this.receiveResponse(resp);
                                } else {
                                    console.error(err)
                                }
                            });
                            break;
                        }
                        case CommandType.LANDING: {
                            window.location.href = 'http://www.bentekkie.com';
                            break;
                        }
                        case CommandType.DOWNLOAD_RESUME: {
                            const link = document.createElement('a');
                            link.download = "Benjamin Segall's Resume.pdf";
                            link.href = '/file/benjaminSegallsResume.pdf';
                            const clickEvent = document.createEvent("MouseEvent");
                            clickEvent.initEvent("click", true, true);

                            link.dispatchEvent(clickEvent);
                            const element = document.getElementById("content");
                            if(element){
                                element.scrollTop = element.scrollHeight;
                            }
                            break;
                        }
                        default: {
                            let command = new Command();
                            command.setCurrentdir(this.state.currentDir);
                            command.setArgsList(args);
                            command.setCommand(CommandType[cmd]);
                            this.props.client.runCommand(command, (err, resp) => {
                                if (resp) {
                                    this.receiveResponse(resp);
                                } else {
                                    console.error(err)
                                }
                            })
                        }
                    }


                } else{
                    console.error("Invalid command")
                }

            }
        }

    }



    render() {
        const cmdNames : string[] = [];
        for(const cmd in CommandType){
            cmdNames.push(cmd.toLowerCase());
        }
        return (
            <div className = "App_container">
                <Window>
                    {this.state.sections.map((sect,i) => <p key={i} dangerouslySetInnerHTML={{__html:sect}}/>)}
                </Window>
                <CommandBar
                    prompt = {this.state.prompt}
                    commandHandler={this.sendCommand}
                    cmdNames = {cmdNames}
                    getNewAutoComp = {(command,args) => {
                        command = command.toUpperCase();
                        if(isValidCommand(command)){
                            let c = new Command();
                            c.setCommand(CommandType[command]);
                            c.setCurrentdir(this.state.currentDir);
                            c.setArgsList(args);
                            this.props.client.autoComplete(c,(err,resp) => {
                                if(resp){
                                    this.setState({rawAutoComp:resp.getCompletionsList()})
                                }else{
                                    console.error(err)
                                }
                            })
                        }
                    }}
                    autoComp= {this.state.rawAutoComp}/>
            </div>
        );
    }
}

export default Terminal;
