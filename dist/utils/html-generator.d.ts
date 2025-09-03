import { type Highlighter } from 'shiki';
import { type Logger } from './logger.js';
import { type Result } from './path-validator.js';
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
 * HTML Generator errors
 */
export declare class HTMLGeneratorError extends Error {
    code: string;
    constructor(message: string, code: string);
}
export declare class HTMLGenerator {
    private readonly highlighter;
    private readonly logger;
    constructor(highlighter?: Highlighter | null, logger?: Logger);
    static create(logger?: Logger): Promise<Result<HTMLGenerator, HTMLGeneratorError>>;
    dispose(): Promise<void>;
    generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGeneratorError>>;
    private generateMarkdownView;
    private escapeHtml;
    private buildHTMLTemplate;
    private getFileViewStyles;
    private getMarkdownStyles;
    private getScrollScript;
    private formatFileSize;
}
