import { Reducer } from "react";

type KeyType = string | number | symbol

export function isValidEnum<T extends object>(str: KeyType, map: T): str is keyof T {
    return str in map
}

export const arrays_equal = (a: unknown[], b: unknown[]) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]);

export interface DeltaReducer<S, A> {
    (prevState: S, action: A): Partial<S>
}

export function deltaReducer<S, A>(reducer: DeltaReducer<S, A>): Reducer<S, A> {
    return (state, action) => ({ ...state, ...reducer(state, action) })
}
