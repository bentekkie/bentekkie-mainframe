import { useReducer, useRef, useContext, Reducer, createContext } from 'react'
import { IState, IAction, ActionType, CoreApi, IProps } from './AppContextTypes'
import { useApi } from './api'
import { arrays_equal, deltaReducer } from './utils';

const initialState: IState = {
    bootstrapped: false,
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
    loggingIn: false,
    registering: false,
    editing: false,
    editorFile: {
        path: "",
        contents: ""
    }
};


const reducer: React.Reducer<IState, IAction> = deltaReducer((state, action) : Partial<IState> => {
    switch (action.type) {
        case ActionType.AddSection:
            return {
                sections: [...state.sections, action.section],
                currentDir: action.currentDir || state.currentDir,
                prompt: action.prompt || state.prompt
            };
        case ActionType.ClearSections:
            return { sections: [] };
        case ActionType.AutoComplete:
            const rawAutoComp = action.payload.rawAutoComp
            if (rawAutoComp.length > 0 && !arrays_equal(rawAutoComp, state.rawAutoComp)) {
                const filteredArr = rawAutoComp.filter((s) => s.startsWith(state.command));
                if (filteredArr.length > 0) {
                    return {
                        rawAutoComp: rawAutoComp,
                        command: filteredArr[0],
                        autoComp: {
                            frag: state.command,
                            cIndex: 1 % filteredArr.length,
                            comps: filteredArr
                        }
                    };
                } else {
                    return {
                        rawAutoComp: rawAutoComp,
                        autoComp: {
                            ...state.autoComp,
                            comps: filteredArr
                        }
                    };
                }
            }
            return { rawAutoComp };
        case ActionType.ClearAutoComp:
            return {
                rawAutoComp: [],
                autoComp: {
                    frag: "",
                    cIndex: 0,
                    comps: []
                }
            };
        case ActionType.NewCommand:
            return {
                command_arr: [...state.command_arr, action.payload.command],
                current_command: state.command_arr.length + 1
            };
        case ActionType.NextCommand:
            return (state.current_command > 0) ? {
                command: state.command_arr[state.current_command - 1],
                current_command: state.current_command - 1
            } : {};
        case ActionType.PrevCommand:
            return (state.current_command + 1 < state.command_arr.length) ? {
                command: state.command_arr[state.current_command + 1],
                current_command: state.current_command + 1
            } : { command: "" };
        case ActionType.StartEditing:
            return {
                ...action.payload,
                editing: true
            };
        case ActionType.EndEditing:
            return {
                editing: false,
                editorFile: {
                    path: "",
                    contents: ""
                }
            }
        case ActionType.Bootstrap:
            return {
                bootstrapped: true
            }
        case ActionType.RegisterFlow:
        case ActionType.LoginFlow:
        case ActionType.SetCurrentDir:
        case ActionType.SetCommand:
        case ActionType.SetAutoComp:
            return action.payload;
    }
});



const AppContext = createContext<[IState, CoreApi]>(undefined as any);

export const AppContextProvider: React.FunctionComponent<IProps> = (props) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const inputOpenFileRef = useRef<HTMLInputElement>(null);
    const api = useApi(state, dispatch, props, inputOpenFileRef)
    return <AppContext.Provider value={[state, api]}>
        {props.children}
        <input ref={inputOpenFileRef} type="file" style={{ display: "none" }} onChange={e => api.seedDb(e.target.files)} />
    </AppContext.Provider>
};

export function useAppContext() {
    return useContext(AppContext)
}