import React, { ReactNode, useReducer, useRef } from 'react'
import { shellClient } from "./generated/command_pb_service";
import { isValidCommand, isValidSudoCommand } from "./utils";
import {
    Command,
    CommandType,
    Folder,
    Response,
    ResponseType,
    SudoCommand,
    SudoCommandType,
    SudoResponse
} from "./generated/command_pb";
import { Empty } from "google-protobuf/google/protobuf/empty_pb";
import ReactMarkdown from 'react-markdown'

enum ActionType {
    AddSection,
    ClearSections,
    AutoComplete,
    ClearAutoComp,
    SetCurrentDir,
    NewCommand,
    SetAutoComp,
    SetCommand,
    NextCommand,
    PrevCommand,
    StartLoginFlow,
    CompleteLoginFlow,
    StartRegisterFlow,
    CompleteRegisterFlow,
    SetJWT,
    ClearJWT,
    StartEditing,
    EndEditing
}

interface IState {
    sections: ReactNode[]
    prompt: string
    command_arr: string[]
    current_command: number,
    rawAutoComp: string[],
    currentDir?: Folder,
    command: string
    autoComp: {
        frag: string,
        comps: string[],
        cIndex: number
    },
    jwt: string | null
    loggingIn: boolean
    registering: boolean
    editing: boolean,
    editorFile: {
        path: string,
        contents: string
    }
}


interface AddSectionAction {
    type: ActionType.AddSection
    section: ReactNode
    currentDir?: Folder
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

interface SetAutoCompAction {
    type: ActionType.SetAutoComp
    payload: {
        autoComp: {
            frag: string,
            comps: string[],
            cIndex: number
        }
        command?: string
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
    rawAutoComp: string[]
}

interface SetJWTAction {
    type: ActionType.SetJWT,
    jwt: string
}

interface ClearJWTAction {
    type: ActionType.ClearJWT
}

interface StartLoginFlowAction {
    type: ActionType.StartLoginFlow
}

interface CompleteLoginFlowAction {
    type: ActionType.CompleteLoginFlow
}

interface StartRegisterFlowAction {
    type: ActionType.StartRegisterFlow
}

interface CompleteRegisterFlowAction {
    type: ActionType.CompleteRegisterFlow
}

interface StartEditingAction {
    type: ActionType.StartEditing,
    editorFile: {
        path: string,
        contents: string
    }
}

interface EndEditingAction {
    type: ActionType.EndEditing
}

type IAction =
    AddSectionAction | ClearSectionsAction |
    ClearAutoCompAction | NewCommandAction |
    AutoCompleteAction | SetCurrentDirAction |
    SetCommandAction | SetAutoCompAction |
    NextCommandAction | PrevCommandAction |
    SetJWTAction | ClearJWTAction |
    StartLoginFlowAction | CompleteLoginFlowAction |
    StartEditingAction | EndEditingAction |
    StartRegisterFlowAction | CompleteRegisterFlowAction

const initialState: IState = {
    sections: [],
    prompt: "B:/>",
    command_arr: [],
    current_command: 0,
    command: "",
    rawAutoComp: [],
    currentDir: undefined,
    autoComp: {
        frag: "",
        cIndex: 0,
        comps: []
    },
    jwt: null,
    loggingIn: false,
    registering: false,
    editing: false,
    editorFile: {
        path: "",
        contents: ""
    }
};

const reducer: React.Reducer<IState, IAction> = (state, action) => {
    switch (action.type) {
        case ActionType.AddSection:
            const currentDir = action.currentDir || state.currentDir;
            const prompt = action.prompt || state.prompt;
            return { ...state, sections: [...state.sections, action.section], currentDir, prompt };
        case ActionType.ClearSections:
            return { ...state, sections: [] };
        case ActionType.AutoComplete:
            const arrays_equal = (a: any[], b: any[]) => !!a && !!b && !(a < b || b < a);
            if (action.rawAutoComp.length > 0 && !arrays_equal(action.rawAutoComp, state.rawAutoComp)) {
                let filteredArr = action.rawAutoComp.filter((s) => {
                    return s.startsWith(state.command);
                });
                if (filteredArr.length > 0) {
                    return {
                        ...state,
                        rawAutoComp: action.rawAutoComp,
                        command: filteredArr[0],
                        autoComp: {
                            frag: state.command,
                            cIndex: 1 % filteredArr.length,
                            comps: filteredArr
                        }
                    };
                } else {
                    return {
                        ...state,
                        rawAutoComp: action.rawAutoComp,
                        autoComp: {
                            ...state.autoComp,
                            comps: filteredArr
                        }
                    };
                }
            }
            return { ...state, rawAutoComp: action.rawAutoComp };
        case ActionType.ClearAutoComp:
            return {
                ...state, rawAutoComp: [], autoComp: {
                    frag: "",
                    cIndex: 0,
                    comps: []
                }
            };
        case ActionType.SetCurrentDir:
            return { ...state, currentDir: action.currentDir };
        case ActionType.SetCommand:
            return { ...state, command: action.command };
        case ActionType.SetAutoComp:
            return { ...state, ...action.payload };
        case ActionType.NewCommand:
            return {
                ...state,
                command_arr: [...state.command_arr, action.command],
                current_command: state.command_arr.length + 1
            };
        case ActionType.NextCommand:
            if (state.current_command > 0) {
                return {
                    ...state,
                    command: state.command_arr[state.current_command - 1],
                    current_command: state.current_command - 1
                }
            }
            return state;
        case ActionType.PrevCommand:
            if (state.current_command + 1 < state.command_arr.length) {
                return {
                    ...state,
                    command: state.command_arr[state.current_command + 1],
                    current_command: state.current_command + 1
                };
            } else {
                return {
                    ...state,
                    command: ""
                }
            }
        case ActionType.SetJWT:
            return {
                ...state,
                jwt: action.jwt
            };
        case ActionType.ClearJWT:
            return {
                ...state,
                jwt: null
            };
        case ActionType.StartLoginFlow:
            return {
                ...state,
                loggingIn: true
            };
        case ActionType.CompleteLoginFlow:
            return {
                ...state,
                loggingIn: false
            };
        case ActionType.StartRegisterFlow:
            return {
                ...state,
                registering: true
            };
        case ActionType.CompleteRegisterFlow:
            return {
                ...state,
                registering: false
            };
        case ActionType.StartEditing:
            return {
                ...state,
                editing: true,
                editorFile: action.editorFile
            };
        case ActionType.EndEditing:
            return {
                ...state,
                editing: false,
                editorFile: {
                    path: "",
                    contents: ""
                }
            }
    }
};

interface CoreApi {
    sendCommand(command: string, interactive: boolean): Promise<void>,

    autoComplete(): void

    bootstrap(): void

    setCommand(command: string): void

    setAutoComp(payload: {
        autoComp: {
            frag: string,
            comps: string[],
            cIndex: number
        }
        command?: string
    }): void

    clearAutoComplete(): void

    nextCommand(): void

    prevCommand(): void,

    loggedIn: boolean,

    loggingIn: boolean,

    cmdNames(): string[],

    login(username: string, password: string): void
    register(username: string, password: string): void

    updateFile(newContents: string): void
}


export const AppContext = React.createContext<[IState, CoreApi]>(undefined as any);


interface IProps {
    client: shellClient
}

export const AppContextProvider: React.FunctionComponent<IProps> = (props) => {
    const [state, dispatch] = useReducer<React.Reducer<IState, IAction>>(reducer, initialState);
    const cmdNames = () => {
        const names: string[] = [];
        for (const cmd in CommandType) {
            names.push(cmd.toLowerCase());
        }
        if (state.jwt !== null) {
            for (const cmd in SudoCommandType) {
                names.push(cmd.toLowerCase());
            }
        }
        return names
    };

    const nextCommand = () => dispatch({ type: ActionType.NextCommand });
    const prevCommand = () => dispatch({ type: ActionType.PrevCommand });
    const inputOpenFileRef =  useRef<HTMLInputElement>(null);
    const setAutoComp = (payload: {
        autoComp: {
            frag: string,
            comps: string[],
            cIndex: number
        }
        command?: string
    }) => dispatch({ type: ActionType.SetAutoComp, payload });

    const clearAutoComplete = () => dispatch({ type: ActionType.ClearAutoComp });

    const setCommand = (command: string) => dispatch({ type: ActionType.SetCommand, command });


    const bootstrap = () => {
        props.client.getRoot(new Empty(), (err, rootFolder) => {
            if (rootFolder) {
                dispatch({ type: ActionType.SetCurrentDir, currentDir: rootFolder });
                sendCommand("exec .init", false, rootFolder)
                /* let command = new Command();
                command.setCommand(CommandType.EXEC);
                command.addArgs('/.init');
                command.setCurrentdir(rootFolder);
                props.client.runCommand(command, (err, resp) => resp ? receiveResponse(resp) : console.error(err)); */
            }
        });
    };


    const autoComplete = () => {
        if (state.autoComp.frag === "" || !state.command.startsWith(state.autoComp.frag)) {
            let split = state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
            if (!split) split = [];
            for (let i = 0; i < split.length; i++) {
                split[i] = split[i].replace(/"/g, "");
            }
            if (cmdNames().indexOf(split[0]) >= 0 && split[1] !== undefined) {
                const command = split[0].toUpperCase();
                if (isValidCommand(command)) {
                    let c = new Command();
                    c.setCommand(CommandType[command]);
                    c.setCurrentdir(state.currentDir);
                    c.setArgsList(split.slice(1));
                    props.client.autoComplete(c, (err, resp) => {
                        if (resp) {
                            dispatch({ type: ActionType.AutoComplete, rawAutoComp: resp.getCompletionsList() });
                        } else {
                            console.error(err)
                        }
                    });
                }
            } else {
                let filteredArr = cmdNames().filter((s) => {
                    return s.startsWith(state.command);
                });
                if (filteredArr.length > 0) {
                    setAutoComp({
                        command: filteredArr[0],
                        autoComp: {
                            frag: state.command,
                            cIndex: 1 % filteredArr.length,
                            comps: filteredArr
                        }
                    })
                } else {
                    setAutoComp({
                        autoComp: {
                            ...state.autoComp,
                            comps: filteredArr
                        }
                    });
                }
            }

        } else if (state.autoComp.comps.length > 0) {
            setAutoComp({
                command: state.autoComp.comps[state.autoComp.cIndex],
                autoComp: {
                    ...state.autoComp,
                    cIndex: (state.autoComp.cIndex + 1) % state.autoComp.comps.length
                }
            })
        }

    };

    const parseCommand = (command: string) => {
        let split = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        if(split){
            for (let i = 0; i < split.length; i++) {
                split[i] = split[i].replace(/"/g, "");
            }
            let cmd = split[0];
            let args: string[] = [];
            if (split.length > 0) args = split.slice(1);
            cmd = cmd.toUpperCase();
            return {cmd,args}
        }
        return null
    }

    const runCommands = async (commands: string[], currentDir: Folder | undefined): Promise<void> => {
        if(commands.length > 0) {
            return sendCommand(commands[0],false, currentDir).then(() => runCommands(commands.slice(1), currentDir))
        }
        return
    }

    const sendCommand = (command: string, interactive: boolean, currentDir : Folder | undefined = undefined) => {
        currentDir = state.currentDir || currentDir
        return new Promise<void>((resolve,reject) => {
            if(interactive){
                dispatch({
                    type: ActionType.AddSection,
                    section: <div>{state.prompt + command}<br /></div>
                });
                dispatch({ type: ActionType.ClearAutoComp });
            }
            if (command !== "") {
                if(interactive) {
                    dispatch({ type: ActionType.NewCommand, command });
                }
                const split = parseCommand(command)
                if (split) {
                    const {cmd,args} = split
                    if (isValidCommand(cmd)) {
                        switch (CommandType[cmd]) {
                            case CommandType.CLEAR: {
                                dispatch({ type: ActionType.ClearAutoComp });
                                dispatch({ type: ActionType.ClearSections });
                                break;
                            }
                            case CommandType.LANDING: {
                                window.location.href = 'http://www.bentekkie.com';
                                resolve()
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
                                if (element) {
                                    element.scrollTop = element.scrollHeight;
                                }
                                resolve()
                                break;
                            }
                            case CommandType.LOGIN: {
                                if (args.length === 0) {
                                    dispatch({
                                        type: ActionType.StartLoginFlow
                                    })
                                }
                                resolve()
                                break;
                            }
                            case CommandType.EXEC: {
                                if (args.length === 1) {
                                    let command = new Command();
                                    command.setCurrentdir(currentDir);
                                    command.setArgsList(args);
                                    command.setCommand(CommandType.CAT);
                                    props.client.runCommand(command, (err, resp) => {
                                        if (resp) {
                                            if(resp.getType() === ResponseType.MARKDOWN) {
                                                const rawCommands = resp.getResp().split('\n')
                                                resolve(runCommands(rawCommands,currentDir))
                                            } else {
                                                receiveResponse(resp);
                                                resolve()
                                            }
                                        } else {
                                            console.error(err)
                                            resolve()
                                        }
                                    })
                                    break;
                                }else {
                                    break;
                                }
                            }
                            default: {
                                let command = new Command();
                                command.setCurrentdir(currentDir);
                                command.setArgsList(args);
                                command.setCommand(CommandType[cmd]);
                                props.client.runCommand(command, (err, resp) => {
                                    if (resp) {
                                        receiveResponse(resp);
                                    } else {
                                        console.error(err)
                                    }
                                    resolve()
                                })
                            }
                        }
                    } else if (isValidSudoCommand(cmd) && state.jwt !== null) {
                        switch (SudoCommandType[cmd]) {
                            case SudoCommandType.SEED: {
                                if(inputOpenFileRef.current) {
                                    inputOpenFileRef.current.click()
                                }
                                resolve()
                                break;
                            }
                            case SudoCommandType.LOGOUT: {
                                dispatch({
                                    type: ActionType.ClearJWT
                                });
                                resolve()
                                break;
                                
                            }
                            case SudoCommandType.ADDUSER:
                                if(args.length === 0) {
                                    dispatch({
                                        type: ActionType.StartRegisterFlow
                                    })
                                    resolve()
                                    break;
                                }
                                // fall through
                            default: {
                                let command = new SudoCommand();
                                command.setCurrentdir(currentDir);
                                command.setArgsList(args);
                                command.setCommand(SudoCommandType[cmd]);
                                command.setJwt(state.jwt);
                                props.client.runSudoCommand(command, (err, resp) => {
                                    if (resp) {
                                        receiveSudoResponse(resp);
                                    } else {
                                        console.error(err)
                                    }
                                    resolve()
                                })
                            }
    
    
                        }
                    } else {
                        console.error("Invalid command")
                        resolve()
                    }
                }
            }
        })
    };


    const receiveSudoResponse = (resp: SudoResponse) => {
        const currentDir = resp.getCurrentdir();
        if (currentDir) {
            const command = resp.getCommand();
            if (command && command.getCommand() === SudoCommandType.EDIT && !state.editing && resp.getType() === ResponseType.MARKDOWN) {
                dispatch({
                    type: ActionType.StartEditing,
                    editorFile: {
                        path: command.getArgsList()[0],
                        contents: resp.getResp()
                    }
                });
                return
            }
            let tmp = currentDir.getPath();
            let tl = tmp.split("/");
            if (tl.length > 2) {
                tmp = "/../" + tl[tl.length - 1]
            }
            dispatch({
                type: ActionType.AddSection,
                section: parseResponse(resp),
                currentDir,
                prompt: "B:" + tmp + ">"
            });
        }
    };

    const parseResponse = (resp: Response) => {
        switch (resp.getType()) {
            case ResponseType.TEXT:
                return <p>{resp.getResp()}</p>;
            case ResponseType.HTML:
                return <p dangerouslySetInnerHTML={{ __html: resp.getResp() }} />;
            case ResponseType.MARKDOWN:
                return <ReactMarkdown source={resp.getResp()}  linkTarget={"_blank"} />
            case ResponseType.JSON:
                var element = document.createElement('a');
                element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(resp.getResp()));
                element.setAttribute('download', "dump.json");
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
        }
    };

    const receiveResponse = (resp: Response) => {
        const command = resp.getCommand();
        if (command && command.getCommand() === CommandType.LOGIN) {
            const text = resp.getResp();
            if (text && text.startsWith("JWT:")) {
                const jwt = text.substr(4);
                dispatch({
                    type: ActionType.SetJWT,
                    jwt
                });
                return
            }
        }
        const currentDir = resp.getCurrentdir();
        if (currentDir) {
            let tmp = currentDir.getPath();
            let tl = tmp.split("/");
            if (tl.length > 2) {
                tmp = "/../" + tl[tl.length - 1]
            }
            dispatch({
                type: ActionType.AddSection,
                section: parseResponse(resp),
                currentDir,
                prompt: "B:" + tmp + ">"
            });
        }
    };

    const login = (username: string, password: string) => {
        let command = new Command();
        command.setCurrentdir(state.currentDir);
        command.setArgsList([username, password]);
        command.setCommand(CommandType.LOGIN);
        props.client.runCommand(command, (err, resp) => {
            if (resp) {
                receiveResponse(resp);
            } else {
                console.error(err)
            }
        });
        dispatch({
            type: ActionType.CompleteLoginFlow,
        });
    };

    const register = (username: string, password: string) => {
        if(state.jwt) {
            let command = new SudoCommand();
            command.setCurrentdir(state.currentDir)
            command.setArgsList([username, password])
            command.setCommand(SudoCommandType.ADDUSER)
            command.setJwt(state.jwt)
            props.client.runSudoCommand(command, (err, resp) => {
                if (resp) {
                    receiveSudoResponse(resp);
                } else {
                    console.error(err)
                }
            });
        }
        dispatch({
            type: ActionType.CompleteRegisterFlow,
        });

    }

    const updateFile = (newContents: string) => {
        dispatch({ type: ActionType.EndEditing });
        if (state.jwt != null) {
            const command = new SudoCommand();
            command.setJwt(state.jwt);
            command.setCurrentdir(state.currentDir);
            command.setCommand(SudoCommandType.EDIT);
            command.setArgsList([state.editorFile.path, newContents]);
            props.client.runSudoCommand(command, (err, resp) => {
                if (resp) {
                    receiveSudoResponse(resp);
                } else {
                    console.error(err)
                }
            })
        }
    };

    const seedDb = (filelist : FileList | null) => {
        if(filelist && filelist.length === 1){
            const item = filelist.item(0)
            if(item){
                console.log(item)
                const reader = new FileReader()
                reader.addEventListener("load",event => {
                    if(event.target instanceof FileReader && event.target.result && ! (event.target.result instanceof ArrayBuffer)) {
                        if (state.jwt != null) {
                            const wipeDB = prompt("Wipe db?","false") === "true"
                            const command = new SudoCommand();
                            command.setJwt(state.jwt);
                            command.setCurrentdir(state.currentDir);
                            command.setCommand(SudoCommandType.SEED);
                            command.setArgsList([event.target.result, wipeDB.toString()]);
                            props.client.runSudoCommand(command, (err, resp) => {
                                if (resp) {
                                    receiveSudoResponse(resp);
                                } else {
                                    console.error(err)
                                }
                            })
                        }
                    }
                })
                reader.addEventListener("error", event => {
                    console.log(event)
                })
                reader.readAsText(item)
            }
        }
    }

    return <AppContext.Provider value={[
        state,
        {
            sendCommand,
            autoComplete,
            bootstrap,
            setCommand,
            clearAutoComplete,
            setAutoComp,
            cmdNames,
            nextCommand,
            prevCommand,
            loggedIn: state.jwt != null,
            loggingIn: state.loggingIn,
            login,
            register,
            updateFile
        }]}>
        {props.children}
        <input ref={inputOpenFileRef} type="file" style={{display:"none"}} onChange={e => seedDb(e.target.files)}/>
    </AppContext.Provider>
};