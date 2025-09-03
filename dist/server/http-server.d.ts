import { type Server } from 'http';
import { type Result } from '../utils/path-validator.js';
import { type Logger } from '../utils/logger.js';
/**
 * HTTP server errors
 */
export declare class HTTPServerError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Server start result
 */
export interface ServerStartResult {
    port: number;
    baseUrl: string;
    server: Server;
}
/**
 * HTML serving result
 */
export interface HTMLServeResult {
    url: string;
    fileId: string;
}
/**
 * HTTP server for serving temporary HTML files to browser
 * Following engineering principle #7: Resource cleanup with dispose pattern
 */
export declare class HTTPServer {
    private readonly port;
    private readonly logger;
    private server?;
    private tempFiles;
    private cleanupInterval;
    constructor(port: number, logger?: Logger);
    /**
     * Start HTTP server
     */
    start(): Promise<Result<ServerStartResult, HTTPServerError>>;
    /**
     * Serve HTML content as temporary file
     */
    serveHTML(content: string, filename: string): Promise<Result<HTMLServeResult, HTTPServerError>>;
    /**
     * Handle HTTP requests
     */
    private handleRequest;
    /**
     * Start cleanup process for old temp files
     */
    private startCleanup;
    /**
     * Clean up expired temporary files
     */
    cleanup(): void;
    /**
     * Resource cleanup following engineering principle #7
     */
    dispose(): Promise<void>;
}
