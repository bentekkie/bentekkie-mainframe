import { CoreApi, IState, IAction, ActionType, IProps } from './AppContextTypes'
import { useCookies } from 'react-cookie'
import { CommandType, SudoCommandType, Command, Folder, ResponseType, SudoCommand, SudoResponse, Response } from './generated/command_pb';
import React, { useState, useEffect, Dispatch, RefObject } from 'react';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { isValidEnum } from './utils';
import ReactMarkdown from 'react-markdown'

const JWT_COOKIE_KEY = 'jwt'

export function useCommandNames(jwt : string | null) {
    const [names, setNames] = useState<string[]>([])

    useEffect(() => setNames([...Object.keys(CommandType),...(jwt ? Object.keys(SudoCommandType) : [])].map(cmd => cmd.toLowerCase())), [jwt])

    return names
}

export function useApi(state: IState, dispatch: Dispatch<IAction>, props: IProps, inputOpenFileRef: RefObject<HTMLInputElement>): CoreApi {
    const [cookies, setCookie, removeCookie] = useCookies([JWT_COOKIE_KEY])
    const jwt : string | null= cookies[JWT_COOKIE_KEY] || null
    const cmdNames = useCommandNames(jwt);

    const parseCommand = (command: string) => {
        const split = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (split) {
            let [cmd, ...args] = split.map(part => part.replace(/"/g, ""))
            cmd = cmd.toUpperCase();
            return { cmd, args }
        }
        return null
    }

    const runCommands = (commands: string[], currentDir?: Folder) => {
        return commands
            .map(cmd => (cdir?: Folder) => sendCommand(cmd, false, cdir))
            .reduce((prev, next) => prev.then(next), Promise.resolve(currentDir))
    }

    const sendCommand = (command: string, interactive: boolean, currentDir?: Folder) => {
        currentDir = currentDir || state.currentDir
        return new Promise<typeof currentDir>(resolve => {
            if (interactive) {
                dispatch({
                    type: ActionType.AddSection,
                    section: <div>{state.prompt + command}<br /></div>
                });
                dispatch({ type: ActionType.ClearAutoComp });
            }
            if (command !== "") {
                if (interactive) {
                    dispatch({ type: ActionType.NewCommand, payload: { command } });
                }
                const split = parseCommand(command)
                if (split) {
                    const { cmd, args } = split
                    if (isValidEnum(cmd, CommandType)) {
                        switch (CommandType[cmd]) {
                            case CommandType.CLEAR: {
                                dispatch({ type: ActionType.ClearAutoComp });
                                dispatch({ type: ActionType.ClearSections });
                                resolve(currentDir)
                                break;
                            }
                            case CommandType.LANDING: {
                                window.location.href = 'http://www.bentekkie.com';
                                resolve(currentDir)
                                break;
                            }
                            case CommandType.DOWNLOAD_RESUME: {
                                const link = document.createElement('a');
                                link.download = "Benjamin Segall's Resume.pdf";
                                link.href = 'https://docs.google.com/document/d/1Czpzbfjk5HsOYjFMAOYXI3GqX4QSqU9Knjtdf0Sr8XA/export?format=pdf';
                                const clickEvent = document.createEvent("MouseEvent");
                                clickEvent.initEvent("click", true, true);

                                link.dispatchEvent(clickEvent);
                                const element = document.getElementById("content");
                                if (element) {
                                    element.scrollTop = element.scrollHeight;
                                }
                                resolve(currentDir)
                                break;
                            }
                            case CommandType.LOGIN: {
                                if (args.length === 0) {
                                    dispatch({
                                        type: ActionType.LoginFlow,
                                        payload : { loggingIn : true }
                                    })
                                }
                                resolve(currentDir)
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
                                            if (resp.getType() === ResponseType.MARKDOWN) {
                                                const rawCommands = resp.getResp().split('\n')
                                                resolve(runCommands(rawCommands, currentDir))
                                            } else {
                                                receiveResponse(resp);
                                                resolve(resp.getCurrentdir())
                                            }
                                        } else {
                                            console.error(err)
                                            resolve(currentDir)
                                        }
                                    })
                                    break;
                                } else {
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
                                        resolve(resp.getCurrentdir())
                                    } else {
                                        console.error(err)
                                        resolve(currentDir)
                                    }
                                })
                            }
                        }
                    } else if (isValidEnum(cmd, SudoCommandType) && jwt !== null) {
                        switch (SudoCommandType[cmd]) {
                            case SudoCommandType.SEED: {
                                if (inputOpenFileRef.current) {
                                    inputOpenFileRef.current.click()
                                }
                                resolve(currentDir)
                                break;
                            }
                            case SudoCommandType.LOGOUT: {
                                removeCookie(JWT_COOKIE_KEY)
                                resolve(currentDir)
                                break;

                            }
                            case SudoCommandType.ADDUSER:
                                if (args.length === 0) {
                                    dispatch({
                                        type: ActionType.RegisterFlow,
                                        payload: {
                                            registering: true
                                        }
                                    })
                                    resolve(currentDir)
                                    break;
                                }
                            // fall through
                            default: {
                                let command = new SudoCommand();
                                command.setCurrentdir(currentDir);
                                command.setArgsList(args);
                                command.setCommand(SudoCommandType[cmd]);
                                command.setJwt(jwt);
                                props.client.runSudoCommand(command, (err, resp) => {
                                    if (resp) {
                                        receiveSudoResponse(resp);
                                        resolve(resp.getCurrentdir())
                                    } else {
                                        console.error(err)
                                        resolve(currentDir)
                                    }
                                })
                            }
                        }
                    } else {
                        console.error(`Invalid command "${command}"`)
                        if (interactive) {
                            dispatch({
                                type: ActionType.AddSection,
                                section: <div>Invalid command "{command}"<br /></div>
                            });
                        }
                        resolve(currentDir)
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
/*                 console.log({
                    type: ActionType.StartEditing,
                    payload: {
                        editorFile: {
                            path: command.getArgsList()[0],
                            contents: resp.getResp()
                        }
                    }
                }) */
                dispatch({
                    type: ActionType.StartEditing,
                    payload: {
                        editorFile: {
                            path: command.getArgsList()[0],
                            contents: resp.getResp()
                        }
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
                return <ReactMarkdown source={resp.getResp()} linkTarget={"_blank"} />
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
                setCookie(JWT_COOKIE_KEY, jwt)
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

    return {
        sendCommand,
        autoComplete: () => {
            if (state.autoComp.frag === "" || !state.command.startsWith(state.autoComp.frag)) {
                let split = state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
                if (!split) split = [];
                for (let i = 0; i < split.length; i++) {
                    split[i] = split[i].replace(/"/g, "");
                }
                if (cmdNames.indexOf(split[0]) >= 0 && split[1] !== undefined) {
                    const command = split[0].toUpperCase();
                    if (isValidEnum(command, CommandType)) {
                        let c = new Command();
                        c.setCommand(CommandType[command]);
                        c.setCurrentdir(state.currentDir);
                        c.setArgsList(split.slice(1));
                        props.client.autoComplete(c, (err, resp) => {
                            if (resp) {
                                dispatch({ type: ActionType.AutoComplete, payload: { rawAutoComp: resp.getCompletionsList() } });
                            } else {
                                console.error(err)
                            }
                        });
                    } else if (isValidEnum(command, SudoCommandType) && jwt != null) {
                        let c = new SudoCommand();
                        c.setCommand(SudoCommandType[command]);
                        c.setCurrentdir(state.currentDir);
                        c.setArgsList(split.slice(1));
                        c.setJwt(jwt);
                        props.client.sudoAutoComplete(c, (err, resp) => {
                            if (resp) {
                                dispatch({ type: ActionType.AutoComplete, payload: { rawAutoComp: resp.getCompletionsList() } });
                            } else {
                                console.error(err)
                            }
                        });
                    }
                } else {
                    let filteredArr = cmdNames.filter((s) => {
                        return s.startsWith(state.command);
                    });
                    dispatch({
                        type: ActionType.SetAutoComp,
                        payload: (filteredArr.length > 0) ? {
                            command: filteredArr[0],
                            autoComp: {
                                frag: state.command,
                                cIndex: 1 % filteredArr.length,
                                comps: filteredArr
                            }
                        } : {
                                autoComp: {
                                    ...state.autoComp,
                                    comps: filteredArr
                                }
                            }
                    });
                }

            } else if (state.autoComp.comps.length > 0) {
                dispatch({
                    type: ActionType.SetAutoComp,
                    payload: {
                        command: state.autoComp.comps[state.autoComp.cIndex],
                        autoComp: {
                            ...state.autoComp,
                            cIndex: (state.autoComp.cIndex + 1) % state.autoComp.comps.length
                        }
                    }
                })
            }

        },
        bootstrap: () => {
            props.client.getRoot(new Empty(), (_, rootFolder) => {
                if (rootFolder) {
                    dispatch({ type: ActionType.SetCurrentDir, payload: { currentDir: rootFolder } });
                    sendCommand("exec init", false, rootFolder)
                }
            });
        },
        setCommand: (command: string) => dispatch({ type: ActionType.SetCommand, payload: { command } }),
        clearAutoComplete: () => dispatch({ type: ActionType.ClearAutoComp }),
        nextCommand: () => dispatch({ type: ActionType.NextCommand }),
        prevCommand: () => dispatch({ type: ActionType.PrevCommand }),
        login: (username: string, password: string) => {
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
                type: ActionType.LoginFlow,
                payload : { loggingIn : false }
            });
        },
        register: (username: string, password: string) => {
            if (jwt) {
                let command = new SudoCommand();
                command.setCurrentdir(state.currentDir)
                command.setArgsList([username, password])
                command.setCommand(SudoCommandType.ADDUSER)
                command.setJwt(jwt)
                props.client.runSudoCommand(command, (err, resp) => {
                    if (resp) {
                        receiveSudoResponse(resp);
                    } else {
                        console.error(err)
                    }
                });
            }
            dispatch({
                type: ActionType.RegisterFlow,
                payload: { registering: false }
            });
        },
        updateFile: (newContents: string) => {
            dispatch({ type: ActionType.EndEditing });
            if (jwt != null) {
                const command = new SudoCommand();
                command.setJwt(jwt);
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
        },
        seedDb: (filelist: FileList | null) => {
            if (filelist && filelist.length === 1) {
                const item = filelist.item(0)
                if (item) {
                    console.log(item)
                    const reader = new FileReader()
                    reader.addEventListener("load", event => {
                        if (event.target instanceof FileReader && event.target.result && !(event.target.result instanceof ArrayBuffer)) {
                            if (jwt != null) {
                                const wipeDB = prompt("Wipe db?", "false") === "true"
                                const command = new SudoCommand();
                                command.setJwt(jwt);
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
        },
        loggedIn: () => jwt !== null
    }
}