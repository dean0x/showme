import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { setInterval, clearInterval } from 'timers';
import { ConsoleLogger } from '../utils/logger.js';
import { ErrorFactory } from '../utils/error-handling.js';
/**
 * HTTP server for serving temporary HTML files to browser
 * Following engineering principle #7: Resource cleanup with dispose pattern
 */
export class HTTPServer {
    port;
    logger;
    server;
    tempFiles = new Map();
    cleanupInterval = undefined;
    actualPort = 0;
    constructor(port, logger = new ConsoleLogger()) {
        this.port = port;
        this.logger = logger;
    }
    /**
     * Start HTTP server
     */
    async start() {
        try {
            return new Promise((resolve) => {
                this.server = createServer(this.handleRequest.bind(this));
                this.server.on('error', (error) => {
                    resolve({
                        ok: false,
                        error: ErrorFactory.httpServer(`Failed to start server: ${error.message}`, error.code || 'SERVER_ERROR')
                    });
                });
                this.server.listen(this.port, 'localhost', () => {
                    const address = this.server.address();
                    this.actualPort = typeof address === 'object' && address ? address.port : this.port;
                    const baseUrl = `http://localhost:${this.actualPort}`;
                    this.logger.info('HTTP server started', { port: this.actualPort, baseUrl });
                    // Start cleanup interval
                    this.startCleanup();
                    resolve({
                        ok: true,
                        value: {
                            port: this.actualPort,
                            baseUrl,
                            server: this.server
                        }
                    });
                });
            });
        }
        catch (error) {
            return {
                ok: false,
                error: ErrorFactory.httpServer(error instanceof Error ? error.message : String(error), 'SERVER_START_ERROR', undefined, error instanceof Error ? error : new Error(String(error)))
            };
        }
    }
    /**
     * Serve HTML content as temporary file
     */
    async serveHTML(content, filename) {
        if (!this.server) {
            return {
                ok: false,
                error: ErrorFactory.httpServer('Server not started', 'SERVER_NOT_STARTED')
            };
        }
        try {
            const fileId = randomBytes(16).toString('hex');
            const url = `http://localhost:${this.actualPort}/file/${fileId}`;
            this.tempFiles.set(fileId, {
                content,
                filename,
                createdAt: performance.now()
            });
            this.logger.info('Serving HTML file', { fileId, filename, url });
            return {
                ok: true,
                value: {
                    url,
                    fileId
                }
            };
        }
        catch (error) {
            return {
                ok: false,
                error: ErrorFactory.httpServer(error instanceof Error ? error.message : String(error), 'SERVE_ERROR', undefined, error instanceof Error ? error : new Error(String(error)))
            };
        }
    }
    /**
     * Handle HTTP requests
     */
    handleRequest(req, res) {
        const url = new URL(req.url || '/', `http://localhost:${this.actualPort}`);
        if (url.pathname.startsWith('/file/')) {
            const fileId = url.pathname.split('/file/')[1];
            const tempFile = this.tempFiles.get(fileId);
            if (tempFile) {
                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Cache-Control': 'no-cache'
                });
                res.end(tempFile.content);
            }
            else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            }
        }
        else if (url.pathname === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'ok',
                tempFiles: this.tempFiles.size
            }));
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
        }
    }
    /**
     * Start cleanup process for old temp files
     */
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 30 * 60 * 1000); // Every 30 minutes
    }
    /**
     * Clean up expired temporary files
     */
    cleanup() {
        const now = performance.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        for (const [fileId, file] of this.tempFiles) {
            if (now - file.createdAt > oneHour) {
                this.tempFiles.delete(fileId);
                this.logger.debug('Cleaned up expired temp file', { fileId, filename: file.filename });
            }
        }
    }
    /**
     * Resource cleanup following engineering principle #7
     */
    async dispose() {
        if (this.cleanupInterval !== undefined) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.logger.info('HTTP server stopped');
                    resolve();
                });
            });
        }
        this.tempFiles.clear();
    }
}
