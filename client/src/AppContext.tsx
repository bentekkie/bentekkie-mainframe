import React, {useReducer} from 'react'
import {shellClient} from "./generated/command_pb_service";
import {isValidCommand} from "./utils";
import {Command, CommandType, Folder, Response} from "./generated/command_pb";
import {Empty} from "google-protobuf/google/protobuf/empty_pb";

enum ActionType {
    AddSection,
    ClearSections,
    AutoComplete,
    ClearAutoComp,
    SetCurrentDir,
    NewCommand,
    ResetAutoComp,
    SetAutoComp,
    SetCommand,
    NextCommand,
    PrevCommand,
}

interface IState {
    sections: string[]
    prompt: string
    command_arr: string[]
    current_command: number,
    rawAutoComp: string[],
    currentDir?: Folder,
    command: string
    autoComp:{
        frag:string,
        comps:string[],
        cIndex:number
    }
}



interface AddSectionAction {
    type: ActionType.AddSection
    section: string
    currentDir ?: Folder
    prompt?: string
}
interface ClearSectionsAction {
    type: ActionType.ClearSections
}
interface ClearAutoCompAction {
    type: ActionType.ClearAutoComp
}
interface NextCommandAction {
    type: ActionType.NextCommand
}
interface PrevCommandAction {
    type: ActionType.PrevCommand
}
interface ResetAutoCompAction {
    type: ActionType.ResetAutoComp
}
interface SetAutoCompAction {
    type: ActionType.SetAutoComp
    payload: {
        autoComp : {
            frag:string,
            comps:string[],
            cIndex:number
        }
        command ?: string
    }
}
interface NewCommandAction {
    type: ActionType.NewCommand
    command: string
}
interface SetCommandAction {
    type: ActionType.SetCommand
    command: string
}
interface SetCurrentDirAction {
    type: ActionType.SetCurrentDir
    currentDir: Folder
}
interface AutoCompleteAction {
    type: ActionType.AutoComplete
    rawAutoComp: string []
}

type IAction =
    AddSectionAction | ClearSectionsAction |
    ClearAutoCompAction | NewCommandAction |
    AutoCompleteAction | SetCurrentDirAction |
    ResetAutoCompAction | SetCommandAction |
    SetAutoCompAction | NextCommandAction |
    PrevCommandAction

const initialState : IState = {
    sections: [],
    prompt:"B:/>",
    command_arr: [],
    current_command: 0,
    command: "",
    rawAutoComp: [],
    currentDir: undefined,
    autoComp:{
        frag:"",
        cIndex:0,
        comps:[]
    }
};

const reducer : React.Reducer<IState,IAction> = (state, action) => {
    switch (action.type) {
        case ActionType.AddSection:
            const currentDir = action.currentDir || state.currentDir;
            const prompt = action.prompt || state.prompt;
            return {...state,sections:[...state.sections,action.section],currentDir,prompt};
        case ActionType.ClearSections:
            return {...state,sections:[]};
        case ActionType.AutoComplete:
            const arrays_equal = (a : any[],b : any[]) => !!a && !!b && !(a<b || b<a);
            if(action.rawAutoComp.length > 0 && !arrays_equal(action.rawAutoComp,state.rawAutoComp)){
                let filteredArr = action.rawAutoComp.filter((s) =>{
                    return s.startsWith(state.command);
                });
                if(filteredArr.length > 0){
                    return {
                        ...state,
                        rawAutoComp:action.rawAutoComp,
                        command:filteredArr[0],
                        autoComp:{
                            frag:state.command,
                            cIndex:1 % filteredArr.length,
                            comps:filteredArr
                        }
                    };
                }else{
                    return {
                        ...state,
                        rawAutoComp:action.rawAutoComp,
                        autoComp:{
                            ...state.autoComp,
                            comps:filteredArr
                        }
                    };
                }
            }
            return {...state,rawAutoComp:action.rawAutoComp};
        case ActionType.ClearAutoComp:
            return {...state,rawAutoComp:[]};
        case ActionType.SetCurrentDir:
            return {...state,currentDir:action.currentDir};
        case ActionType.ResetAutoComp:
            return {...state,autoComp:{
                    frag:"",
                    cIndex:0,
                    comps:[]
                }};
        case ActionType.SetCommand:
            return {...state,command:action.command};
        case ActionType.SetAutoComp:
            return {...state,...action.payload};
        case ActionType.NewCommand:
            return {...state,
                command_arr: [...state.command_arr, action.command],
                current_command: state.command_arr.length + 1};
        case ActionType.NextCommand:
            if(state.current_command > 0){
                return {
                    ...state,
                    command:state.command_arr[state.current_command-1],
                    current_command:state.current_command-1
                }
            }
            return state;
        case ActionType.PrevCommand:
            if(state.current_command+1 < state.command_arr.length){
                return {...state,command:state.command_arr[state.current_command+1],current_command:state.current_command+1};
            }else{
                return{
                    ...state,
                    command:""
                }
            }
    }
};

interface CoreApi {
    sendCommand(command : string): void,
    autoComplete(): void
    bootstrap(): void
    setCommand(command: string): void
    setAutoComp(payload: {
        autoComp : {
            frag:string,
            comps:string[],
            cIndex:number
        }
        command ?: string
    }): void
    clearAutoComplete(): void
    nextCommand(): void
    prevCommand(): void
    cmdNames : string[]
}


export const AppContext = React.createContext<[IState, CoreApi]>(undefined as any);


interface IProps {
    client: shellClient
}

export const AppContextProvider : React.FunctionComponent<IProps> = (props) => {
    const [state, dispatch] = useReducer<React.Reducer<IState, IAction>>(reducer, initialState);
    const cmdNames : string[] = [];
    for(const cmd in CommandType){
        cmdNames.push(cmd.toLowerCase());
    }

    const nextCommand = () => dispatch({type:ActionType.NextCommand});
    const prevCommand = () => dispatch({type:ActionType.PrevCommand});

    const setAutoComp = (payload: {
        autoComp : {
            frag:string,
            comps:string[],
            cIndex:number
        }
        command ?: string
    }) => dispatch({type:ActionType.SetAutoComp,payload});

    const clearAutoComplete = () => dispatch({type:ActionType.ResetAutoComp});

    const setCommand = (command : string) => dispatch({type:ActionType.SetCommand,command});


    const bootstrap = () => {
        props.client.getRoot(new Empty(), (err, rootFolder) => {
            if (rootFolder) {
                dispatch({type: ActionType.SetCurrentDir, currentDir: rootFolder});
                let command = new Command();
                command.setCommand(CommandType.CAT);
                command.addArgs('/files/start');
                command.setCurrentdir(rootFolder);
                props.client.runCommand(command, (err, resp) => resp ? receiveResponse(resp) : console.error(err));
            }
        });
    };


    const autoComplete = () => {
        if(state.autoComp.frag === "" || !state.command.startsWith(state.autoComp.frag)){
            let split = state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
            if(!split) split = [];
            for(let i = 0; i < split.length; i++) {
                split[i] = split[i].replace(/"/g,"");
            }
            if(cmdNames.indexOf(split[0]) >= 0 && split[1] !== undefined){
                const command = split[0].toUpperCase();
                if(isValidCommand(command)){
                    let c = new Command();
                    c.setCommand(CommandType[command]);
                    c.setCurrentdir(state.currentDir);
                    c.setArgsList(split.slice(1));
                    props.client.autoComplete(c,(err,resp) => {
                        if(resp){
                            dispatch({type:ActionType.AutoComplete,rawAutoComp:resp.getCompletionsList()});
                        }else{
                            console.error(err)
                        }
                    });
                }
            }else {
                let filteredArr = cmdNames.filter((s) => {
                    return s.startsWith(state.command);
                });
                if(filteredArr.length > 0){
                    setAutoComp({
                        command:filteredArr[0],
                        autoComp:{
                            frag:state.command,
                            cIndex:1 % filteredArr.length,
                            comps:filteredArr
                        }
                    })
                }else{
                    setAutoComp({
                        autoComp:{
                            ...state.autoComp,
                            comps:filteredArr
                        }
                    });
                }
            }

        }else if(state.autoComp.comps.length > 0){
            setAutoComp({
                command:state.autoComp.comps[state.autoComp.cIndex],
                autoComp:{
                    ...state.autoComp,
                    cIndex:(state.autoComp.cIndex+1) % state.autoComp.comps.length
                }
            })
        }

    };

    const sendCommand = (command : string) => {
        dispatch({
            type:ActionType.AddSection,
            section:state.prompt+command+"<br /> "
        });
        dispatch({type:ActionType.ClearAutoComp});
        dispatch({type:ActionType.ResetAutoComp});
        if( command !== ""){
            dispatch({type:ActionType.NewCommand,command});
            let split = command.match(/(?:[^\s"]+|"[^"]*")+/g);
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
                            dispatch({type:ActionType.ClearAutoComp});
                            dispatch({type:ActionType.ClearSections});
                            let command = new Command();
                            command.setCurrentdir(state.currentDir);
                            command.setArgsList(["/files/start"]);
                            command.setCommand(CommandType.CAT);
                            props.client.runCommand(command, (err, resp) => {
                                if (resp) {
                                    receiveResponse(resp);
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
                            command.setCurrentdir(state.currentDir);
                            command.setArgsList(args);
                            command.setCommand(CommandType[cmd]);
                            props.client.runCommand(command, (err, resp) => {
                                if (resp) {
                                    receiveResponse(resp);
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
    };

    const receiveResponse = (resp: Response) => {
        const currentDir = resp.getCurrentdir();
        if(currentDir){
            let tmp = currentDir.getPath();
            if(tmp.length > 1) tmp = tmp.slice(0, -1);
            let tl = tmp.split("/");
            if(tl.length > 2){
                tmp = "/../" + tl[tl.length-1]
            }
            dispatch({
                type:ActionType.AddSection,
                section:resp.getResp(),
                currentDir,
                prompt:"B:" + tmp + ">"});
        }
    };

    return <AppContext.Provider value={[
        state,
        {sendCommand, autoComplete, bootstrap, setCommand, clearAutoComplete, setAutoComp, cmdNames, nextCommand, prevCommand}]}>
        {props.children}
    </AppContext.Provider>
};