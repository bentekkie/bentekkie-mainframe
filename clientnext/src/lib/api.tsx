import { CoreApi, IState, IAction, ActionType, IProps } from './AppContextTypes'
import { useCookies } from 'react-cookie'
import { create } from '@bufbuild/protobuf';
import { CommandType, SudoCommandType, CommandSchema, Folder, ResponseType, SudoCommandSchema, SudoResponse, Response } from '@gen/command_pb';
import { Dispatch, RefObject, useMemo, useRef } from 'react';
import { isValidEnum } from './utils';
import {
    formatPrompt,
    isAllowedDeepLinkCommand,
    parseDeepLinkParams,
    resolveVfsPath,
    syncBrowserUrl,
} from './urlRouting';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const JWT_COOKIE_KEY = 'jwt'
const DEFAULT_LANDING_URL = 'https://www.bentekkie.com'
const DEFAULT_RESUME_URL = 'https://docs.google.com/document/d/1Czpzbfjk5HsOYjFMAOYXI3GqX4QSqU9Knjtdf0Sr8XA/export?format=pdf'

export function useCommandNames(jwt : string | null) {
    return useMemo(() => [...Object.keys(CommandType),...(jwt ? Object.keys(SudoCommandType) : [])].map(cmd => cmd.toLowerCase()), [jwt])
}

function useCookie(key : string): [string | null, (v: string) => void, () => void]{
    const [cookies, setCookie, removeCookie] = useCookies([key])
    const setSecureCookie = (newJwt: string) => {
        setCookie(key, newJwt, {
            path: '/',
            sameSite: 'lax',
            secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
            maxAge: 60 * 60 * 24,
        })
    }
    return [cookies[key] || null, setSecureCookie, () => removeCookie(key, { path: '/' })]
}

export function useApi(
    state: IState,
    dispatch: Dispatch<IAction>,
    props: IProps,
    inputOpenFileRef: RefObject<HTMLInputElement | null>,
    bootstrappedRef: RefObject<boolean>,
): CoreApi {
    const [jwt, setJwt, removeJwt] = useCookie(JWT_COOKIE_KEY)
    const cmdNames = useCommandNames(jwt);
    const runtimeConfigRef = useRef({
        landingUrl: DEFAULT_LANDING_URL,
        resumeUrl: DEFAULT_RESUME_URL,
    });

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

    const sendCommand = async (
        command: string,
        interactive: boolean,
        currentDir?: Folder,
        promptOverride?: string,
    ): Promise<Folder | undefined> => {
        currentDir = currentDir || state.currentDir
        if (interactive) {
            const activePrompt = promptOverride ?? state.prompt
            dispatch({
                type: ActionType.AddSection,
                section: <div>{activePrompt + command}<br /></div>
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
                            if (interactive) {
                                syncBrowserUrl(currentDir?.path || '/');
                            }
                            return currentDir
                        }
                        case CommandType.landing: {
                            window.location.href = runtimeConfigRef.current.landingUrl;
                            return currentDir
                        }
                        case CommandType.download_resume: {
                            const link = document.createElement('a');
                            link.download = "Benjamin Segall's Resume.pdf";
                            link.href = runtimeConfigRef.current.resumeUrl;
                            link.click();
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
                                let command = create(CommandSchema,
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
                            let command = create(CommandSchema, {
                                currentDir,
                                args,
                                command:CommandType[cmd]
                            });
                            return props.client.runCommand(command).then(resp => {
                                receiveResponse(resp, interactive);
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
                    let command = create(SudoCommandSchema, {
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
                            section: <div>Invalid command &quot;{command}&quot;<br /></div>
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
            dispatch({
                type: ActionType.AddSection,
                section: parseResponse(resp),
                currentDir,
                prompt: formatPrompt(currentDir.path)
            });
        }
    };

    const parseResponse = (resp: Response | SudoResponse) => {
        switch (resp.type) {
            case ResponseType.text:
                return <p>{resp.resp}</p>;
            case ResponseType.html:
                return <p>{resp.resp}</p>;
            case ResponseType.markdown:
                return <ReactMarkdown components={{
                    a({ node, children, ...props }) {
                        let url = new URL(props.href ?? "", location.href);
                        if (url.origin !== location.origin) {
                          props.target = "_blank";
                          props.rel = "noopener noreferrer";
                        }
                  
                        return <a {...props}>{children}</a>;
                      },
                  }} remarkPlugins={[remarkGfm]} >{resp.resp}</ReactMarkdown>
            case ResponseType.json: {
                const blob = new Blob([resp.resp], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const element = document.createElement('a');
                element.setAttribute('href', url);
                element.setAttribute('download', "dump.json");
                element.style.display = 'none';
                document.body.appendChild(element);
                element.click();
                document.body.removeChild(element);
                URL.revokeObjectURL(url);
                return <p>Downloaded dump.json</p>;
            }
        }
    };

    const receiveResponse = (resp: Response, syncUrl = false) => {
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
            if (syncUrl && command) {
                if (command.command === CommandType.cd && resp.resp === "") {
                    syncBrowserUrl(currentDir.path);
                } else if (
                    command.command === CommandType.cat &&
                    resp.type === ResponseType.markdown &&
                    command.args.length > 0
                ) {
                    const resolved = resolveVfsPath(currentDir.path, command.args[0]);
                    syncBrowserUrl(currentDir.path, `cat ${resolved}`);
                }
            }
            dispatch({
                type: ActionType.AddSection,
                section: parseResponse(resp),
                currentDir,
                prompt: formatPrompt(currentDir.path)
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
                        let c = create(CommandSchema, {
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
                        let c = create(SudoCommandSchema, {
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
            if (!bootstrappedRef.current && !state.bootstrapped) {
                bootstrappedRef.current = true
                dispatch({ type: ActionType.Bootstrap })
                fetch('/api/config')
                    .then(res => res.ok ? res.json() : null)
                    .then(cfg => {
                        if (cfg && typeof cfg.landingUrl === 'string' && cfg.landingUrl) {
                            runtimeConfigRef.current.landingUrl = cfg.landingUrl;
                        }
                        if (cfg && typeof cfg.resumeUrl === 'string' && cfg.resumeUrl) {
                            runtimeConfigRef.current.resumeUrl = cfg.resumeUrl;
                        }
                    })
                    .catch(() => {})
                props.client.getRoot({}).then(async resp => {
                    dispatch({ type: ActionType.SetCurrentDir, payload: { currentDir: resp } });
                    const deepLink = typeof window !== 'undefined'
                        ? parseDeepLinkParams(window.location.search)
                        : { path: null, cmd: null, quiet: false };

                    let activeDir: Folder = resp;
                    if (!deepLink.quiet) {
                        for (const candidate of ["init", ".init"]) {
                            const catCmd = create(CommandSchema, {
                                args: [candidate],
                                command: CommandType.cat,
                                currentDir: resp,
                            });
                            try {
                                const initResp = await props.client.runCommand(catCmd);
                                if (initResp && initResp.type === ResponseType.markdown) {
                                    const rawCommands = initResp.resp.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                    activeDir = (await runCommands(rawCommands, resp)) || resp;
                                    break;
                                }
                            } catch (err) {
                                console.error(err);
                            }
                        }
                    }

                    if (deepLink.path && deepLink.path !== activeDir.path) {
                        const cdArg = deepLink.path.includes(' ') ? `"${deepLink.path}"` : deepLink.path;
                        activeDir = (await sendCommand(
                            `cd ${cdArg}`,
                            true,
                            activeDir,
                            formatPrompt(activeDir.path),
                        )) || activeDir;
                    }

                    if (deepLink.cmd) {
                        if (isAllowedDeepLinkCommand(deepLink.cmd)) {
                            await sendCommand(
                                deepLink.cmd,
                                true,
                                activeDir,
                                formatPrompt(activeDir.path),
                            );
                        } else {
                            dispatch({
                                type: ActionType.AddSection,
                                section: <p>Blocked URL command (only read-only commands are allowed via ?cmd=): {deepLink.cmd}</p>,
                            });
                        }
                    }
                }).catch(console.error)
            }
        },
        setCommand: (command: string) => dispatch({ type: ActionType.SetCommand, payload: { command } }),
        clearAutoComplete: () => dispatch({ type: ActionType.ClearAutoComp }),
        nextCommand: () => dispatch({ type: ActionType.NextCommand }),
        prevCommand: () => dispatch({ type: ActionType.PrevCommand }),
        login: (username: string, password: string) => {
            let command = create(CommandSchema, {
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
        cancelLogin: () => dispatch({
            type: ActionType.LoginFlow,
            payload: { loggingIn: false }
        }),
        register: (username: string, password: string) => {
            if (jwt) {
                let command = create(SudoCommandSchema, {
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
        cancelRegister: () => dispatch({
            type: ActionType.RegisterFlow,
            payload: { registering: false }
        }),
        updateFile: (newContents: string) => {
            dispatch({ type: ActionType.EndEditing });
            if (jwt != null) {
                const command = create(SudoCommandSchema, {
                    jwt,
                    currentDir: state.currentDir,
                    command: SudoCommandType.edit,
                    args: [state.editorFile.path, newContents],
                });
                props.client.runSudoCommand(command).then(receiveSudoResponse).catch(console.error)
            }
        },
        cancelEdit: () => dispatch({ type: ActionType.EndEditing }),
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
                                const command = create(SudoCommandSchema, {
                                    jwt,
                                    currentDir: state.currentDir,
                                    command: SudoCommandType.seed,
                                    args: [event.target.result, wipeDB.toString()]
                                });
                                props.client.runSudoCommand(command).then(receiveSudoResponse).catch(console.error)
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