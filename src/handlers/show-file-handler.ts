import { HTTPServer, type HTMLServeResult } from '../server/http-server.js';
import { PathValidator } from '../utils/path-validator.js';
import { FileManager } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import { pipe, map } from '../utils/pipe.js';
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
  private readonly pathValidator: PathValidator;
  private readonly fileManager: FileManager; 
  private readonly htmlGenerator: HTMLGenerator;

  constructor(
    private readonly httpServer: HTTPServer,
    private readonly logger: Logger = new ConsoleLogger()
  ) {
    this.pathValidator = new PathValidator();
    this.fileManager = new FileManager(this.pathValidator, this.logger);
    this.htmlGenerator = new HTMLGenerator(this.logger);
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
      this.serveHTML.bind(this),
      map(this.formatSuccessResponse.bind(this))
    )(args);

    const duration = performance.now() - startTime;
    this.logger.info('ShowFile request completed', { 
      path: args.path, 
      success: result.ok,
      duration: Math.round(duration)
    });

    if (result.ok) {
      return result.value;
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

    return {
      ok: true,
      value: {
        path: args.path,
        validatedPath: validationResult.value,
        line_highlight: args.line_highlight
      }
    };
  }

  /**
   * Read file content
   */
  private async readFile(data: { path: string; validatedPath: string; line_highlight?: number }): Promise<Result<{
    path: string;
    validatedPath: string;
    content: string;
    fileContent: any;
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
    fileContent: any;
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

    try {
      const htmlContent = await this.htmlGenerator.generateFileView(options);

      return {
        ok: true,
        value: {
          path: data.path,
          htmlContent,
          line_highlight: data.line_highlight
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: new ShowFileError(
          `HTML generation failed: ${error instanceof Error ? error.message : String(error)}`,
          'HTML_GENERATION_ERROR'
        )
      };
    }
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

    return {
      ok: true,
      value: {
        path: data.path,
        url: serveResult.value.url,
        line_highlight: data.line_highlight
      }
    };
  }

  /**
   * Format success response
   */
  private formatSuccessResponse(data: {
    path: string;
    url: string;
    line_highlight?: number;
  }): MCPResponse {
    const lineText = data.line_highlight ? ` (line ${data.line_highlight})` : '';
    return {
      content: [
        {
          type: 'text',
          text: `File opened in browser: ${data.path}${lineText}`
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