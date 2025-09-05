import { PathValidator, type Result } from './path-validator.js';
import { ValidationError } from './error-handling.js';
import { type Logger } from './logger.js';
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
    private readonly pathValidator;
    private readonly logger;
    constructor(pathValidator: PathValidator, logger?: Logger);
    static create(workspaceRoot?: string, logger?: Logger): FileManager;
    readFile(inputPath: string): Promise<Result<FileContent, FileManagerError | ValidationError>>;
    private detectLanguage;
}
