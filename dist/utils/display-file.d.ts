import { FileManager, FileManagerError } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
import { type PathValidationError, type Result } from './path-validator.js';
/**
 * High-level utility function for displaying files in the browser
 * Combines FileManager and HTMLGenerator for a simple API
 */
export declare function displayFile(filePath: string, options?: {
    lineHighlight?: number;
}): Promise<Result<string, FileManagerError | PathValidationError>>;
/**
 * Export the main classes for advanced usage
 */
export { FileManager, HTMLGenerator };
export type { FileContent } from './file-manager.js';
export type { FileViewOptions } from './html-generator.js';
