import { createServer } from 'http';
import { randomBytes } from 'crypto';
import { URL } from 'url';
import { setInterval, clearInterval } from 'timers';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleLogger } from '../utils/logger.js';
import { ErrorFactory } from '../utils/error-handling.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
                this.server = createServer((req, res) => {
                    this.handleRequest(req, res).catch(error => {
                        this.logger.error('Async request handling failed', {
                            error: error instanceof Error ? error.message : String(error)
                        });
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Internal Server Error');
                    });
                });
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
    async handleRequest(req, res) {
        const url = new URL(req.url || '/', `http://localhost:${this.actualPort}`);
        try {
            if (url.pathname.startsWith('/file/')) {
                await this.handleFileRequest(url, res);
            }
            else if (url.pathname.startsWith('/assets/')) {
                await this.handleAssetRequest(url, res);
            }
            else if (url.pathname === '/health') {
                this.handleHealthRequest(res);
            }
            else {
                this.handleNotFound(res);
            }
        }
        catch (error) {
            this.logger.error('Request handling failed', {
                url: req.url,
                error: error instanceof Error ? error.message : String(error)
            });
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
        }
    }
    handleFileRequest(url, res) {
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
    async handleAssetRequest(url, res) {
        const assetPath = url.pathname.replace('/assets/', '');
        // Security: only allow specific files
        if (!['file-viewer.js', 'file-viewer.css'].includes(assetPath)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Asset not found');
            return;
        }
        const filePath = path.join(__dirname, '../assets', assetPath);
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const contentType = assetPath.endsWith('.js') ? 'application/javascript' : 'text/css';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
            });
            res.end(content);
            this.logger.debug('Served static asset', { asset: assetPath });
        }
        catch (error) {
            this.logger.warn('Failed to serve asset', {
                asset: assetPath,
                error: error instanceof Error ? error.message : String(error)
            });
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Asset not found');
        }
    }
    handleHealthRequest(res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            tempFiles: this.tempFiles.size
        }));
    }
    handleNotFound(res) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
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
