import { HTTPServer } from '../server/http-server.js';
import { PathValidator } from '../utils/path-validator.js';
import { FileManager } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import { BrowserOpener } from '../utils/browser-opener.js';
import { type Logger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';
/**
 * Show file handler errors
 */
export declare class ShowFileError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Show file request arguments
 */
export interface ShowFileRequest {
    path: string;
    line_highlight?: number;
}
/**
 * MCP response format
 */
export interface MCPResponse {
    [key: string]: unknown;
    content: Array<{
        type: 'text';
        text: string;
    }>;
}
/**
 * Handler for showme.file MCP tool
 * Following engineering principles: DI, pipe composition, Result types
 */
export declare class ShowFileHandler {
    private readonly httpServer;
    private readonly pathValidator;
    private readonly fileManager;
    private readonly htmlGenerator;
    private readonly browserOpener;
    private readonly logger;
    constructor(httpServer: HTTPServer, pathValidator: PathValidator, fileManager: FileManager, htmlGenerator: HTMLGenerator, browserOpener: BrowserOpener, logger?: Logger);
    /**
     * Factory method that creates handler with default dependencies
     * Provides backward compatibility
     */
    static create(httpServer: HTTPServer, logger?: Logger): Promise<Result<ShowFileHandler, Error>>;
    /**
     * Handle showme.file request using pipe composition
     */
    handleFileRequest(args: ShowFileRequest): Promise<MCPResponse>;
    /**
     * Validate file path
     */
    private validatePath;
    /**
     * Read file content
     */
    private readFile;
    /**
     * Generate HTML with syntax highlighting
     */
    private generateHTML;
    /**
     * Serve HTML via HTTP server
     */
    private serveHTML;
    /**
     * Format success response
     */
    private formatSuccessResponse;
    /**
     * Format error response
     */
    private formatErrorResponse;
}
