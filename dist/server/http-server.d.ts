import { type Server } from 'http';
import { type Result } from '../utils/path-validator.js';
import { type Logger } from '../utils/logger.js';
import { HTTPServerError as HTTPServerErrorClass } from '../utils/error-handling.js';
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
    private actualPort;
    constructor(port: number, logger?: Logger);
    /**
     * Start HTTP server
     */
    start(): Promise<Result<ServerStartResult, HTTPServerErrorClass>>;
    /**
     * Serve HTML content as temporary file
     */
    serveHTML(content: string, filename: string): Promise<Result<HTMLServeResult, HTTPServerErrorClass>>;
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
