import { createServer, type Server } from 'http';
import { randomBytes } from 'crypto';
import { type Result } from '../utils/path-validator.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';

declare const performance: { now(): number };

/**
 * HTTP server errors
 */
export class HTTPServerError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'HTTPServerError';
  }
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
 * Temporary file storage
 */
interface TempFile {
  content: string;
  filename: string;
  createdAt: number;
}

/**
 * HTTP server for serving temporary HTML files to browser
 * Following engineering principle #7: Resource cleanup with dispose pattern
 */
export class HTTPServer {
  private server?: Server;
  private tempFiles = new Map<string, TempFile>();
  private cleanupInterval?: NodeJS.Timeout;
  
  constructor(
    private readonly port: number,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Start HTTP server
   */
  async start(): Promise<Result<ServerStartResult, HTTPServerError>> {
    try {
      return new Promise((resolve) => {
        this.server = createServer(this.handleRequest.bind(this));
        
        this.server.on('error', (error: Error & { code?: string }) => {
          resolve({
            ok: false,
            error: new HTTPServerError(
              `Failed to start server: ${error.message}`,
              error.code || 'SERVER_ERROR'
            )
          });
        });

        this.server.listen(this.port, 'localhost', () => {
          const baseUrl = `http://localhost:${this.port}`;
          this.logger.info('HTTP server started', { port: this.port, baseUrl });
          
          // Start cleanup interval
          this.startCleanup();
          
          resolve({
            ok: true,
            value: {
              port: this.port,
              baseUrl,
              server: this.server!
            }
          });
        });
      });
    } catch (error) {
      return {
        ok: false,
        error: new HTTPServerError(
          error instanceof Error ? error.message : String(error),
          'SERVER_START_ERROR'
        )
      };
    }
  }

  /**
   * Serve HTML content as temporary file
   */
  async serveHTML(content: string, filename: string): Promise<Result<HTMLServeResult, HTTPServerError>> {
    if (!this.server) {
      return {
        ok: false,
        error: new HTTPServerError('Server not started', 'SERVER_NOT_STARTED')
      };
    }

    try {
      const fileId = randomBytes(16).toString('hex');
      const url = `http://localhost:${this.port}/file/${fileId}`;
      
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
    } catch (error) {
      return {
        ok: false,
        error: new HTTPServerError(
          error instanceof Error ? error.message : String(error),
          'SERVE_ERROR'
        )
      };
    }
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: any, res: any): void {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    
    if (url.pathname.startsWith('/file/')) {
      const fileId = url.pathname.split('/file/')[1];
      const tempFile = this.tempFiles.get(fileId);
      
      if (tempFile) {
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache'
        });
        res.end(tempFile.content);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      }
    } else if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        tempFiles: this.tempFiles.size 
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
  }

  /**
   * Start cleanup process for old temp files
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30 * 60 * 1000); // Every 30 minutes
  }

  /**
   * Clean up expired temporary files
   */
  cleanup(): void {
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
  async dispose(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.logger.info('HTTP server stopped');
          resolve();
        });
      });
    }

    this.tempFiles.clear();
  }
}