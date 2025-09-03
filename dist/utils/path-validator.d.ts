export type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare class PathValidationError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class PathValidator {
    private workspaceRoot;
    private static readonly WINDOWS_DEVICE_NAMES;
    constructor(workspaceRoot?: string);
    validatePathSync(inputPath: string): Result<string, PathValidationError>;
    validatePath(inputPath: string, options?: {
        checkAccess?: boolean;
    }): Promise<Result<string, PathValidationError>>;
    validateMultiplePaths(inputPaths: string[]): Result<string[], PathValidationError>;
}
