import { type Highlighter } from 'shiki';
import { type Logger } from './logger.js';
export interface FileViewOptions {
    filename: string;
    filepath: string;
    content: string;
    language: string;
    lineHighlight?: number;
    fileSize: number;
    lastModified: Date;
}
export declare class HTMLGenerator {
    private readonly highlighter;
    private readonly logger;
    constructor(highlighter?: Highlighter | null, logger?: Logger);
    static create(logger?: Logger): Promise<HTMLGenerator>;
    dispose(): Promise<void>;
    generateFileView(options: FileViewOptions): Promise<string>;
    private generateMarkdownView;
    private escapeHtml;
    private buildHTMLTemplate;
    private getFileViewStyles;
    private getMarkdownStyles;
    private getScrollScript;
    private formatFileSize;
}
