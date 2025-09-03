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
    private highlighter;
    private initialized;
    initialize(): Promise<void>;
    generateFileView(options: FileViewOptions): Promise<string>;
    private generateMarkdownView;
    private buildHTMLTemplate;
    private getFileViewStyles;
    private getMarkdownStyles;
    private getScrollScript;
    private formatFileSize;
}
