import { HTTPServer } from '../server/http-server.js';
import { PathValidator } from '../utils/path-validator.js';
import { FileManager, type FileContent } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import { BrowserOpener } from '../utils/browser-opener.js';
import { pipe } from '../utils/pipe.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';

declare const performance: { now(): number };

/**
 * Show file handler errors
 */
export class ShowFileError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ShowFileError';
  }
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
export class ShowFileHandler {
  constructor(
    private readonly httpServer: HTTPServer,
    private readonly pathValidator: PathValidator,
    private readonly fileManager: FileManager,
    private readonly htmlGenerator: HTMLGenerator,
    private readonly browserOpener: BrowserOpener,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method that creates handler with default dependencies
   * Provides backward compatibility
   */
  static async create(
    httpServer: HTTPServer,
    logger: Logger = new ConsoleLogger()
  ): Promise<Result<ShowFileHandler, Error>> {
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
      value: new ShowFileHandler(
        httpServer,
        pathValidator,
        fileManager,
        htmlGeneratorResult.value,
        browserOpener,
        logger
      )
    };
  }

  /**
   * Handle showme.file request using pipe composition
   */
  async handleFileRequest(args: ShowFileRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    const result = await pipe(
      this.validatePath.bind(this),
      this.readFile.bind(this),
      this.generateHTML.bind(this),
      this.serveHTML.bind(this)
    )(args);

    const duration = performance.now() - startTime;
    this.logger.info('ShowFile request completed', { 
      path: args.path, 
      success: result.ok,
      duration: Math.round(duration)
    });

    if (result.ok) {
      // Format success response with browser opening
      return await this.formatSuccessResponse(result.value);
    } else {
      return this.formatErrorResponse(result.error);
    }
  }

  /**
   * Validate file path
   */
  private async validatePath(args: ShowFileRequest): Promise<Result<{ path: string; validatedPath: string; line_highlight?: number }, ShowFileError>> {
    const validationResult = await this.pathValidator.validatePath(args.path, { checkAccess: true });

    if (!validationResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Path validation failed: ${validationResult.error.message}`,
          validationResult.error.code
        )
      };
    }

    const result: { path: string; validatedPath: string; line_highlight?: number } = {
      path: args.path,
      validatedPath: validationResult.value
    };
    
    if (args.line_highlight !== undefined) result.line_highlight = args.line_highlight;

    return {
      ok: true,
      value: result
    };
  }

  /**
   * Read file content
   */
  private async readFile(data: { path: string; validatedPath: string; line_highlight?: number }): Promise<Result<{
    path: string;
    validatedPath: string;
    content: string;
    fileContent: FileContent;
    line_highlight?: number;
  }, ShowFileError>> {
    const readResult = await this.fileManager.readFile(data.validatedPath);

    if (!readResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Failed to read file: ${readResult.error.message}`,
          readResult.error.code
        )
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
  private async generateHTML(data: {
    path: string;
    validatedPath: string;
    content: string;
    fileContent: FileContent;
    line_highlight?: number;
  }): Promise<Result<{
    path: string;
    htmlContent: string;
    line_highlight?: number;
  }, ShowFileError>> {
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
        error: new ShowFileError(
          `HTML generation failed: ${htmlResult.error.message}`,
          htmlResult.error.code
        )
      };
    }

    const result: { path: string; htmlContent: string; line_highlight?: number } = {
      path: data.path,
      htmlContent: htmlResult.value
    };
    
    if (data.line_highlight !== undefined) result.line_highlight = data.line_highlight;

    return {
      ok: true,
      value: result
    };
  }

  /**
   * Serve HTML via HTTP server
   */
  private async serveHTML(data: {
    path: string;
    htmlContent: string;
    line_highlight?: number;
  }): Promise<Result<{
    path: string;
    url: string;
    line_highlight?: number;
  }, ShowFileError>> {
    const filename = data.path.split('/').pop() || 'file.html';
    const serveResult = await this.httpServer.serveHTML(data.htmlContent, filename);

    if (!serveResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Failed to serve HTML: ${serveResult.error.message}`,
          serveResult.error.code
        )
      };
    }

    const result: { path: string; url: string; line_highlight?: number } = {
      path: data.path,
      url: serveResult.value.url
    };
    
    if (data.line_highlight !== undefined) result.line_highlight = data.line_highlight;

    return {
      ok: true,
      value: result
    };
  }

  /**
   * Format success response
   */
  private async formatSuccessResponse(data: {
    path: string;
    url: string;
    line_highlight?: number;
  }): Promise<MCPResponse> {
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
  private formatErrorResponse(error: ShowFileError): MCPResponse {
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