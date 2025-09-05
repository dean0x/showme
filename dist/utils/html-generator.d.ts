import { type Logger } from './logger.js';
import { type Result } from './path-validator.js';
import { HTMLGenerationError } from './error-handling.js';
export interface FileViewOptions {
    filename: string;
    filepath: string;
    content: string;
    language: string;
    lineHighlight?: number;
    fileSize: number;
    lastModified: Date;
}
/**
 * Lightweight HTML generator without syntax highlighting
 * For cases that need basic HTML generation without Shiki initialization
 */
export declare class HTMLGeneratorLite {
    private readonly logger;
    constructor(logger?: Logger);
    generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>>;
    private generateMarkdownView;
    private escapeHtml;
    private formatFileSize;
    dispose(): Promise<void>;
}
/**
 * Full-featured HTML generator with syntax highlighting and template engine
 * Clean separation between data and presentation
 */
export declare class HTMLGenerator {
    private readonly highlighter;
    private readonly templateEngine;
    private readonly logger;
    private constructor();
    static create(logger?: Logger): Promise<Result<HTMLGenerator, HTMLGenerationError>>;
    dispose(): Promise<void>;
    generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>>;
    private generateCodeView;
    private generateMarkdownView;
    private escapeHtml;
    private formatFileSize;
}
