import {CommandType, SudoCommandType} from "./generated/command_pb";

export function isValidCommand(cmd: string ): cmd is keyof typeof CommandType{
    return cmd in CommandType;
}
export function isValidSudoCommand(cmd: string ): cmd is keyof typeof SudoCommandType{
    return cmd in SudoCommandType;
}


export function promisify<T,U,V,R>(func: (param : T,param2: R,cb:(err : U|null,data: V|null) => void) => void) {
    return (param : T,param2: R) =>
        new Promise<V>((resolve, reject) => {
            const callback = (err: U | null, data: V | null) => err ? reject(err) : data ? resolve(data) : reject(Error("internal error"));

            func.apply(func, [param, param2,callback])
        })
}
