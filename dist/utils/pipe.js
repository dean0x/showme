/**
 * Functional composition utilities following engineering principle #3
 * "Compose with pipes - Readable, maintainable chains"
 */
export function pipe(...fns) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return async (input) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result = { ok: true, value: input };
        for (const fn of fns) {
            if (!result.ok) {
                break;
            }
            try {
                const nextResult = await fn(result.value);
                result = nextResult;
            }
            catch (error) {
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
export const identity = (value) => ({ ok: true, value });
/**
 * Tap function for side effects in pipes (logging, debugging)
 */
export const tap = (sideEffect) => (value) => {
    sideEffect(value);
    return { ok: true, value };
};
/**
 * Map function for transforming values in pipes
 */
export const map = (transform) => (value) => {
    try {
        return { ok: true, value: transform(value) };
    }
    catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error : new Error(String(error))
        };
    }
};
