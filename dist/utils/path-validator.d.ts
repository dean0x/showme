import { ValidationError } from './error-handling.js';
export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare class PathValidator {
    private workspaceRoot;
    private static readonly WINDOWS_DEVICE_NAMES;
    constructor(workspaceRoot?: string);
    validatePathSync(inputPath: string): Result<string, ValidationError>;
    validatePath(inputPath: string, options?: {
        checkAccess?: boolean;
    }): Promise<Result<string, ValidationError>>;
    validateMultiplePaths(inputPaths: string[]): Result<string[], ValidationError>;
}
