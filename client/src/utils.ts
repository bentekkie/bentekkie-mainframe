import { Reducer } from "react";

type KeyType = string | number | symbol

export function isValidEnum<T>(str: KeyType, map: T): str is keyof T {
    return str in map
}

export const arrays_equal = (a: any[], b: any[]) => !!a && !!b && !(a < b || b < a);

export interface DeltaReducer<S,A> {
    (prevState: S, action: A): Partial<S>
}

export function deltaReducer<S, A>(reducer: DeltaReducer<S,A>): Reducer<S, A> {
    return (state, action) => ({...state,...reducer(state,action)})
}