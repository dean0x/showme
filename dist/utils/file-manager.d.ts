import { type Result, PathValidationError } from './path-validator.js';
export interface FileContent {
    content: string;
    filepath: string;
    filename: string;
    fileSize: number;
    lastModified: Date;
    language: string;
}
export declare class FileManagerError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class FileManager {
    private pathValidator;
    constructor(workspaceRoot?: string);
    readFile(inputPath: string): Promise<Result<FileContent, FileManagerError | PathValidationError>>;
    private detectLanguage;
}
