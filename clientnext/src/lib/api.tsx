import { CoreApi, IState, IAction, ActionType, IProps } from './AppContextTypes'
import { useCookies } from 'react-cookie'
import { CommandType, SudoCommandType, Command, Folder, ResponseType, SudoCommand, SudoResponse, Response } from '@/generated/messages/command_pb';
import React, { Dispatch, RefObject, useMemo } from 'react';
import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { isValidEnum } from './utils';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const JWT_COOKIE_KEY = 'jwt'

export function useCommandNames(jwt : string | null) {
    return useMemo(() => [...Object.keys(CommandType),...(jwt ? Object.keys(SudoCommandType) : [])].map(cmd => cmd.toLowerCase()), [jwt])
}

function useCookie(key : string): [string | null, (v: string) => void, () => void]{
    const [cookies, setCookie, removeCookie] = useCookies([key])
    return [cookies[key] || null, (newJwt : string) => setCookie(key, newJwt), () => removeCookie(key)]
}

export function useApi(state: IState, dispatch: Dispatch<IAction>, props: IProps, inputOpenFileRef: RefObject<HTMLInputElement>): CoreApi {
    const [jwt, setJwt, removeJwt] = useCookie(JWT_COOKIE_KEY)
    const cmdNames = useCommandNames(jwt);

    const parseCommand = (command: string) => {
        const split = command.match(/(?:[^\s"]+|"[^"]*")+/g);
        if (split) {
            let [cmd, ...args] = split.map(part => part.replace(/"/g, ""))
            cmd = cmd.toLowerCase();
            return { cmd, args }
        }
        return null
    }

    const runCommands = async (commands: string[], currentDir?: Folder) => {
        for(const command of commands) {
            currentDir = await sendCommand(command, false, currentDir)
        }
        return currentDir
    }

    const sendCommand = async (command: string, interactive: boolean, currentDir?: Folder): Promise<Folder | undefined> => {
        currentDir = currentDir || state.currentDir
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
                        case CommandType.clear: {
                            dispatch({ type: ActionType.ClearAutoComp });
                            dispatch({ type: ActionType.ClearSections });
                            return currentDir
                        }
                        case CommandType.landing: {
                            window.location.href = 'http://www.bentekkie.com';
                            return currentDir
                        }
                        case CommandType.download_resume: {
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
                            return currentDir
                        }
                        case CommandType.login: {
                            if (args.length === 0) {
                                dispatch({
                                    type: ActionType.LoginFlow,
                                    payload : { loggingIn : true }
                                })
                            }
                            return currentDir
                        }
                        case CommandType.exec: {
                            if (args.length === 1) {
                                let command = new Command(
                                    {
                                        args: args,
                                        command: CommandType.cat,
                                        currentDir: currentDir
                                    }
                                );
                                return props.client.runCommand(command).then(resp => {
                                    if (resp) {
                                        if (resp.type === ResponseType.markdown) {
                                            const rawCommands = resp.resp.split('\n')
                                            return runCommands(rawCommands, currentDir)
                                        } else {
                                            receiveResponse(resp);
                                            return resp.currentDir
                                        }
                                    } else {
                                        console.error("Null Response")
                                        return currentDir
                                    }
                                }).catch(err => {
                                    console.error(err)
                                    return currentDir
                                })
                            } else {
                                return currentDir
                            }
                        }
                        default: {
                            let command = new Command({
                                currentDir,
                                args,
                                command:CommandType[cmd]
                            });
                            return props.client.runCommand(command).then(resp => {
                                receiveResponse(resp);
                                return resp.currentDir
                            }).catch(err => {
                                console.error(err)
                                return currentDir
                            })
                        }
                    }
                } else if (isValidEnum(cmd, SudoCommandType) && jwt !== null) {
                    switch (SudoCommandType[cmd]) {
                        case SudoCommandType.seed: {
                            if (inputOpenFileRef.current) {
                                inputOpenFileRef.current.click()
                            }
                            return currentDir
                        }
                        case SudoCommandType.logout: {
                            removeJwt()
                            return currentDir
                        }
                        case SudoCommandType.adduser:
                            if (args.length === 0) {
                                dispatch({
                                    type: ActionType.RegisterFlow,
                                    payload: {
                                        registering: true
                                    }
                                })
                                return currentDir
                            }
                        default: {
                            break
                        }
                    }
                    let command = new SudoCommand({
                        currentDir,
                        args,
                        command: SudoCommandType[cmd],
                        jwt,
                    });
                    return props.client.runSudoCommand(command).then(resp => {
                        receiveSudoResponse(resp);
                        return resp.currentDir
                    }).catch(err => {
                        console.error(err)
                        return currentDir
                    })
                } else {
                    console.error(`Invalid command "${command}"`)
                    if (interactive) {
                        dispatch({
                            type: ActionType.AddSection,
                            section: <div>Invalid command `&quot;`{command}`&quot;`<br /></div>
                        });
                    }
                    return currentDir
                }
            }
        }
    
    };


    const receiveSudoResponse = (resp: SudoResponse) => {
        const currentDir = resp.currentDir;
        if (currentDir) {
            const command = resp.command;
            if (command && command.command === SudoCommandType.edit && !state.editing && resp.type === ResponseType.markdown) {
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
                            path: command.args[0],
                            contents: resp.resp
                        }
                    }
                });
                return
            }
            let tmp = currentDir.path;
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

    const parseResponse = (resp: Response | SudoResponse) => {
        switch (resp.type) {
            case ResponseType.text:
                return <p>{resp.resp}</p>;
            case ResponseType.html:
                return <p dangerouslySetInnerHTML={{ __html: resp.resp }} />;
            case ResponseType.markdown:
                return <ReactMarkdown linkTarget={"_blank"} remarkPlugins={[remarkGfm]} >{resp.resp}</ReactMarkdown>
            case ResponseType.json:
                var element = document.createElement('a');
                element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(resp.resp));
                element.setAttribute('download', "dump.json");
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
        }
    };

    const receiveResponse = (resp: Response) => {
        const command = resp.command;
        if (command && command.command === CommandType.login) {
            const text = resp.resp;
            if (text && text.startsWith("JWT:")) {
                const jwt = text.substring(4);
                setJwt(jwt)
                return
            }
        }
        const currentDir = resp.currentDir;
        if (currentDir) {
            let tmp = currentDir.path;
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
                let split : string[] | null = state.command.match(/(?:[^\s"]+|"[^"]*")+/g);
                if (!split) split = [];
                for (let i = 0; i < split.length; i++) {
                    split[i] = split[i].replace(/"/g, "");
                }
                if (cmdNames.indexOf(split[0]) >= 0 && split[1] !== undefined) {
                    const command = split[0].toLowerCase();
                    if (isValidEnum(command, CommandType)) {
                        let c = new Command({
                            command: CommandType[command],
                            currentDir: state.currentDir,
                            args: split.slice(1)
                        });
                        props.client.autoComplete(c).then(resp => {
                            dispatch({ type: ActionType.AutoComplete, payload: { rawAutoComp: resp.completions } });
                        }).catch(err => {
                            console.error(err)
                        })
                    } else if (isValidEnum(command, SudoCommandType) && jwt != null) {
                        let c = new SudoCommand({
                            command: SudoCommandType[command],
                            currentDir:state.currentDir,
                            args: split.slice(1),
                            jwt,
                        });
                        props.client.sudoAutoComplete(c).then(resp => {
                            dispatch({ type: ActionType.AutoComplete, payload: { rawAutoComp: resp.completions } });
                        }).catch(err => {
                            console.error(err)
                        })
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
            if(!state.bootstrapped) {
                console.log("Bootstrap")
                dispatch({ type: ActionType.Bootstrap })
                props.client.getRoot(new Empty()).then(resp => {
                    dispatch({ type: ActionType.SetCurrentDir, payload: { currentDir: resp } });
                    sendCommand("exec init", false, resp)
                })
            }
        },
        setCommand: (command: string) => dispatch({ type: ActionType.SetCommand, payload: { command } }),
        clearAutoComplete: () => dispatch({ type: ActionType.ClearAutoComp }),
        nextCommand: () => dispatch({ type: ActionType.NextCommand }),
        prevCommand: () => dispatch({ type: ActionType.PrevCommand }),
        login: (username: string, password: string) => {
            let command = new Command({
                currentDir: state.currentDir,
                args: [username, password],
                command: CommandType.login
            });
            props.client.runCommand(command).then(receiveResponse).catch(console.error)
            dispatch({
                type: ActionType.LoginFlow,
                payload : { loggingIn : false }
            });
        },
        register: (username: string, password: string) => {
            if (jwt) {
                let command = new SudoCommand({
                    currentDir: state.currentDir,
                    args: [username, password],
                    command: SudoCommandType.adduser,
                    jwt,
                });
                props.client.runSudoCommand(command).then(receiveSudoResponse).catch(console.error)
            }
            dispatch({
                type: ActionType.RegisterFlow,
                payload: { registering: false }
            });
        },
        updateFile: (newContents: string) => {
            dispatch({ type: ActionType.EndEditing });
            if (jwt != null) {
                const command = new SudoCommand({
                    jwt,
                    currentDir: state.currentDir,
                    command: SudoCommandType.edit,
                    args: [state.editorFile.path, newContents],
                });
                props.client.runSudoCommand(command).then(receiveSudoResponse).then(console.error)
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
                                const command = new SudoCommand({
                                    jwt,
                                    currentDir: state.currentDir,
                                    command: SudoCommandType.seed,
                                    args: [event.target.result, wipeDB.toString()]
                                });
                                props.client.runSudoCommand(command).then(receiveSudoResponse).then(console.error)
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