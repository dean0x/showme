/**
 * Functional composition utilities following engineering principle #3
 * "Compose with pipes - Readable, maintainable chains"
 */
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export type PipeFunction<TInput, TOutput, TError = Error> = (input: TInput) => Promise<Result<TOutput, TError>> | Result<TOutput, TError>;
/**
 * Composes multiple pipe functions into a single pipeline
 * Each function receives the output of the previous function
 */
type AnyPipeFunction = PipeFunction<any, any, any>;
export declare function pipe(...fns: AnyPipeFunction[]): AnyPipeFunction;
/**
 * Identity function for pipe composition
 */
export declare const identity: <T>(value: T) => Result<T, never>;
/**
 * Tap function for side effects in pipes (logging, debugging)
 */
export declare const tap: <T>(sideEffect: (value: T) => void) => (value: T) => Result<T, never>;
/**
 * Map function for transforming values in pipes
 */
export declare const map: <T, U>(transform: (value: T) => U) => (value: T) => Result<U, Error>;
export {};
