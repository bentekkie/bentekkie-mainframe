import { Folder } from "@/generated/messages/command_pb";
import { ReactNode } from "react";
import {shell as shell} from "@/generated/messages/command_connect"
import { PromiseClient } from "@bufbuild/connect";




export enum ActionType {
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
    LoginFlow,
    RegisterFlow,
    StartEditing,
    EndEditing,
    Bootstrap,
}

export interface IState {
    bootstrapped: boolean,
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
    payload: {
        command: string
    }
}

interface SetCommandAction {
    type: ActionType.SetCommand
    payload: {
        command: string
    }
}

interface SetCurrentDirAction {
    type: ActionType.SetCurrentDir
    payload: {
        currentDir: Folder
    }
}

interface AutoCompleteAction {
    type: ActionType.AutoComplete
    payload: {
        rawAutoComp: string[]
    }
}


interface LoginFlowAction {
    type: ActionType.LoginFlow,
    payload: {
        loggingIn: boolean
    }
}

interface RegisterFlowAction {
    type: ActionType.RegisterFlow
    payload: {
        registering: boolean
    }
}

interface StartEditingAction {
    type: ActionType.StartEditing,
    payload: {
        editorFile: {
            path: string,
            contents: string
        }
    }
}

interface EndEditingAction {
    type: ActionType.EndEditing
}

interface BootstrapAction {
    type: ActionType.Bootstrap
}

export type IAction =
    AddSectionAction | ClearSectionsAction |
    ClearAutoCompAction | NewCommandAction |
    AutoCompleteAction | SetCurrentDirAction |
    SetCommandAction | SetAutoCompAction |
    NextCommandAction | PrevCommandAction |
    LoginFlowAction |
    StartEditingAction | EndEditingAction |
    RegisterFlowAction | BootstrapAction



    export interface CoreApi {
        sendCommand(command: string, interactive: boolean): Promise<Folder | undefined>,
    
        autoComplete(): void
    
        bootstrap(): void
    
        setCommand(command: string): void
    
        clearAutoComplete(): void
    
        nextCommand(): void
    
        prevCommand(): void,
    
        login(username: string, password: string): void
        
        register(username: string, password: string): void
    
        updateFile(newContents: string): void

        seedDb(filelist : FileList | null):void,

        loggedIn():boolean
    }

    export interface IProps {
        client: PromiseClient<typeof shell>,
        children: any
    }