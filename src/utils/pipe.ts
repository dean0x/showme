/**
 * Functional composition utilities following engineering principle #3
 * "Compose with pipes - Readable, maintainable chains"
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

export type PipeFunction<TInput, TOutput, TError = Error> = (
  input: TInput
) => Promise<Result<TOutput, TError>> | Result<TOutput, TError>;

/**
 * Composes multiple pipe functions into a single pipeline
 * Each function receives the output of the previous function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeFunction = PipeFunction<any, any, any>;

export function pipe(...fns: AnyPipeFunction[]): AnyPipeFunction {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (input: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: Result<any, any> = { ok: true, value: input };
    
    for (const fn of fns) {
      if (!result.ok) {
        break;
      }
      
      try {
        const nextResult = await fn(result.value);
        result = nextResult;
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    }
    
    return result;
  };
}

/**
 * Identity function for pipe composition
 */
export const identity = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Tap function for side effects in pipes (logging, debugging)
 */
export const tap = <T>(sideEffect: (value: T) => void) => (
  value: T
): Result<T, never> => {
  sideEffect(value);
  return { ok: true, value };
};

/**
 * Map function for transforming values in pipes
 */
export const map = <T, U>(transform: (value: T) => U) => (
  value: T
): Result<U, Error> => {
  try {
    return { ok: true, value: transform(value) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};