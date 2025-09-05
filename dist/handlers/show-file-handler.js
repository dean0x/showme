import { PathValidator } from '../utils/path-validator.js';
import { FileManager } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import { BrowserOpener } from '../utils/browser-opener.js';
import { pipe } from '../utils/pipe.js';
import { ConsoleLogger } from '../utils/logger.js';
/**
 * Show file handler errors
 */
export class ShowFileError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ShowFileError';
    }
}
/**
 * Handler for showme.file MCP tool
 * Following engineering principles: DI, pipe composition, Result types
 */
export class ShowFileHandler {
    httpServer;
    pathValidator;
    fileManager;
    htmlGenerator;
    browserOpener;
    logger;
    constructor(httpServer, pathValidator, fileManager, htmlGenerator, browserOpener, logger = new ConsoleLogger()) {
        this.httpServer = httpServer;
        this.pathValidator = pathValidator;
        this.fileManager = fileManager;
        this.htmlGenerator = htmlGenerator;
        this.browserOpener = browserOpener;
        this.logger = logger;
    }
    /**
     * Factory method that creates handler with default dependencies
     * Provides backward compatibility
     */
    static async create(httpServer, logger = new ConsoleLogger()) {
        const pathValidator = new PathValidator();
        const fileManager = new FileManager(pathValidator, logger);
        const browserOpener = new BrowserOpener(logger);
        const htmlGeneratorResult = await HTMLGenerator.create(logger);
        if (!htmlGeneratorResult.ok) {
            return {
                ok: false,
                error: new Error(`Failed to create HTMLGenerator: ${htmlGeneratorResult.error.message}`)
            };
        }
        return {
            ok: true,
            value: new ShowFileHandler(httpServer, pathValidator, fileManager, htmlGeneratorResult.value, browserOpener, logger)
        };
    }
    /**
     * Handle showme.file request using pipe composition
     */
    async handleFileRequest(args) {
        const startTime = performance.now();
        const result = await pipe(this.validatePath.bind(this), this.readFile.bind(this), this.generateHTML.bind(this), this.serveHTML.bind(this))(args);
        const duration = performance.now() - startTime;
        this.logger.info('ShowFile request completed', {
            path: args.path,
            success: result.ok,
            duration: Math.round(duration)
        });
        if (result.ok) {
            // Format success response with browser opening
            return await this.formatSuccessResponse(result.value);
        }
        else {
            return this.formatErrorResponse(result.error);
        }
    }
    /**
     * Validate file path
     */
    async validatePath(args) {
        const validationResult = await this.pathValidator.validatePath(args.path, { checkAccess: true });
        if (!validationResult.ok) {
            return {
                ok: false,
                error: new ShowFileError(`Path validation failed: ${validationResult.error.message}`, validationResult.error.code)
            };
        }
        const result = {
            path: args.path,
            validatedPath: validationResult.value
        };
        if (args.line_highlight !== undefined)
            result.line_highlight = args.line_highlight;
        return {
            ok: true,
            value: result
        };
    }
    /**
     * Read file content
     */
    async readFile(data) {
        const readResult = await this.fileManager.readFile(data.validatedPath);
        if (!readResult.ok) {
            return {
                ok: false,
                error: new ShowFileError(`Failed to read file: ${readResult.error.message}`, readResult.error.code)
            };
        }
        return {
            ok: true,
            value: {
                ...data,
                content: readResult.value.content,
                fileContent: readResult.value
            }
        };
    }
    /**
     * Generate HTML with syntax highlighting
     */
    async generateHTML(data) {
        const options = {
            filename: data.fileContent.filename,
            filepath: data.fileContent.filepath,
            content: data.fileContent.content,
            language: data.fileContent.language,
            fileSize: data.fileContent.fileSize,
            lastModified: data.fileContent.lastModified,
            ...(data.line_highlight && { lineHighlight: data.line_highlight })
        };
        const htmlResult = await this.htmlGenerator.generateFileView(options);
        if (!htmlResult.ok) {
            return {
                ok: false,
                error: new ShowFileError(`HTML generation failed: ${htmlResult.error.message}`, htmlResult.error.code)
            };
        }
        const result = {
            path: data.path,
            htmlContent: htmlResult.value
        };
        if (data.line_highlight !== undefined)
            result.line_highlight = data.line_highlight;
        return {
            ok: true,
            value: result
        };
    }
    /**
     * Serve HTML via HTTP server
     */
    async serveHTML(data) {
        const filename = data.path.split('/').pop() || 'file.html';
        const serveResult = await this.httpServer.serveHTML(data.htmlContent, filename);
        if (!serveResult.ok) {
            return {
                ok: false,
                error: new ShowFileError(`Failed to serve HTML: ${serveResult.error.message}`, serveResult.error.code)
            };
        }
        const result = {
            path: data.path,
            url: serveResult.value.url
        };
        if (data.line_highlight !== undefined)
            result.line_highlight = data.line_highlight;
        return {
            ok: true,
            value: result
        };
    }
    /**
     * Format success response
     */
    async formatSuccessResponse(data) {
        const lineText = data.line_highlight ? ` (line ${data.line_highlight})` : '';
        // Attempt to open in browser
        const openResult = await this.browserOpener.openInBrowser(data.url);
        if (!openResult.ok) {
            this.logger.warn('Browser opening failed, continuing with manual URL', {
                error: openResult.error.message
            });
        }
        const browserMessage = openResult.ok
            ? this.browserOpener.generateOpenMessage(data.url, openResult.value)
            : `🔗 **URL:** ${data.url}\n\n*Note: Please copy and paste this URL into your browser to view the file.*`;
        return {
            content: [
                {
                    type: 'text',
                    text: `File opened in browser: ${data.path}${lineText}\n\n${browserMessage}`
                }
            ]
        };
    }
    /**
     * Format error response
     */
    formatErrorResponse(error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`
                }
            ]
        };
    }
}
