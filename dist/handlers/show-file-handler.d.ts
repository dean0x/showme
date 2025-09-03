import { HTTPServer } from '../server/http-server.js';
import { type Logger } from '../utils/logger.js';
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
    private readonly logger;
    private readonly pathValidator;
    private readonly fileManager;
    private readonly htmlGenerator;
    constructor(httpServer: HTTPServer, logger?: Logger);
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
