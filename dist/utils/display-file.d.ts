import { FileManager, FileManagerError } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
import { type PathValidationError, type Result } from './path-validator.js';
import { type Logger } from './logger.js';
/**
 * High-level utility function for displaying files in the browser
 * Uses pipe composition for readable, maintainable processing chain
 */
export declare function displayFile(filePath: string, options?: {
    lineHighlight?: number;
}): Promise<Result<string, FileManagerError | PathValidationError>>;
/**
 * Legacy compatibility - create instances manually for advanced usage
 */
export declare function createDisplayComponents(): Promise<{
    fileManager: FileManager;
    htmlGenerator: HTMLGenerator;
    logger: Logger;
}>;
/**
 * Export the main classes for advanced usage
 */
export { FileManager, HTMLGenerator };
export type { FileContent } from './file-manager.js';
export type { FileViewOptions } from './html-generator.js';
