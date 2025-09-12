/**
 * Show file handler - VS Code integration
 * Following engineering principles: DI, pipe composition, Result types
 */

import { PathValidator } from '../utils/path-validator.js';
import { VSCodeExecutor, createVSCodeExecutor } from '../utils/vscode-executor.js';
import { pipe } from '../utils/pipe.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';
import { ShowFileError } from '../utils/error-handling.js';

declare const performance: { now(): number };

/**
 * Show file request arguments
 */
export interface ShowFileRequest {
  path?: string;  // Single file path
  paths?: string[];  // Multiple file paths
  line_highlight?: number;  // Only works with single path
  reuseWindow?: boolean;  // Open in current window instead of new window
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
 * Handler for ShowFile MCP tool
 * Opens files directly in VS Code instead of browser
 */
export class ShowFileHandler {
  constructor(
    private readonly pathValidator: PathValidator,
    private readonly vsCodeExecutor: VSCodeExecutor,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method that creates handler with default dependencies
   */
  static create(logger: Logger = new ConsoleLogger()): ShowFileHandler {
    const pathValidator = new PathValidator();
    const vsCodeExecutor = createVSCodeExecutor(undefined, logger);
    
    return new ShowFileHandler(
      pathValidator,
      vsCodeExecutor,
      logger
    );
  }

  /**
   * Handle ShowFile request using pipe composition
   */
  async handleFileRequest(args: ShowFileRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    // Create executor with appropriate config for this request
    const executor = createVSCodeExecutor({ 
      reuseWindow: args.reuseWindow || false 
    }, this.logger);
    
    // Create a new handler instance with the configured executor
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- Using prototype chain to override executor
    const handler = Object.create(this);
    handler.vsCodeExecutor = executor;

    // Determine if handling single or multiple files
    const isMultiple = !!args.paths && args.paths.length > 0;
    
    const result = isMultiple 
      ? await handler.handleMultipleFiles(args)
      : await handler.handleSingleFile(args);

    const duration = performance.now() - startTime;
    this.logger.info('ShowFile request completed', { 
      path: args.path,
      paths: args.paths,
      fileCount: args.paths?.length || 1,
      success: result.ok,
      duration: Math.round(duration)
    });

    if (result.ok) {
      return this.formatSuccessResponse(result.value);
    } else {
      return this.formatErrorResponse(result.error);
    }
  }

  /**
   * Handle single file request
   */
  private async handleSingleFile(args: ShowFileRequest): Promise<Result<{
    path?: string;
    paths?: string[];
    validatedPaths?: string[];
    command: string;
    line_highlight?: number;
    success: boolean;
  }, ShowFileError>> {
    if (!args.path) {
      return {
        ok: false,
        error: new ShowFileError(
          'No file path provided',
          'MISSING_PATH',
          {}
        )
      };
    }

    return pipe(
      this.validatePath.bind(this),
      this.openInVSCode.bind(this)
    )(args);
  }

  /**
   * Handle multiple files request
   */
  private async handleMultipleFiles(args: ShowFileRequest): Promise<Result<{
    path?: string;
    paths?: string[];
    validatedPaths?: string[];
    command: string;
    line_highlight?: number;
    success: boolean;
  }, ShowFileError>> {
    if (!args.paths || args.paths.length === 0) {
      return {
        ok: false,
        error: new ShowFileError(
          'No file paths provided',
          'MISSING_PATHS',
          {}
        )
      };
    }

    // Validate all paths
    const validatedPaths: string[] = [];
    for (const path of args.paths) {
      const validationResult = await this.pathValidator.validatePath(path, { checkAccess: true });
      if (!validationResult.ok) {
        return {
          ok: false,
          error: new ShowFileError(
            `Path validation failed for ${path}: ${validationResult.error.message}`,
            validationResult.error.code,
            { path, paths: args.paths }
          )
        };
      }
      validatedPaths.push(validationResult.value);
    }

    // Open all files in VS Code
    const vsCodeResult = await this.vsCodeExecutor.openFiles(validatedPaths);

    if (!vsCodeResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Failed to open files in VS Code: ${vsCodeResult.error.message}`,
          vsCodeResult.error.code,
          { paths: args.paths, validatedPaths }
        )
      };
    }

    return {
      ok: true,
      value: {
        paths: args.paths,
        validatedPaths,
        command: vsCodeResult.value.command,
        success: vsCodeResult.value.success
      }
    };
  }

  /**
   * Validate file path
   */
  private async validatePath(args: ShowFileRequest): Promise<Result<{
    path?: string;
    validatedPath?: string;
    line_highlight?: number;
  }, ShowFileError>> {
    if (!args.path) {
      return {
        ok: false,
        error: new ShowFileError(
          'No file path provided',
          'MISSING_PATH',
          {}
        )
      };
    }

    const validationResult = await this.pathValidator.validatePath(args.path, { checkAccess: true });

    if (!validationResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Path validation failed: ${validationResult.error.message}`,
          validationResult.error.code,
          { path: args.path }
        )
      };
    }

    const result: { path?: string; validatedPath?: string; line_highlight?: number } = {
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
   * Open file in VS Code
   */
  private async openInVSCode(data: {
    path?: string;
    validatedPath?: string;
    line_highlight?: number;
  }): Promise<Result<{
    path?: string;
    paths?: string[];
    validatedPaths?: string[];
    command: string;
    line_highlight?: number;
    success: boolean;
  }, ShowFileError>> {
    if (!data.validatedPath) {
      return {
        ok: false,
        error: new ShowFileError(
          'No validated path available',
          'MISSING_VALIDATED_PATH',
          { path: data.path }
        )
      };
    }

    const vsCodeResult = await this.vsCodeExecutor.openFile(
      data.validatedPath,
      data.line_highlight
    );

    if (!vsCodeResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Failed to open file in VS Code: ${vsCodeResult.error.message}`,
          vsCodeResult.error.code,
          { path: data.path, validatedPath: data.validatedPath, line_highlight: data.line_highlight }
        )
      };
    }

    const result: {
      path?: string;
      paths?: string[];
      validatedPaths?: string[];
      command: string;
      line_highlight?: number;
      success: boolean;
    } = {
      path: data.path,
      command: vsCodeResult.value.command,
      success: vsCodeResult.value.success
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
  private formatSuccessResponse(data: {
    path?: string;
    paths?: string[];
    validatedPaths?: string[];
    command: string;
    line_highlight?: number;
    success: boolean;
  }): MCPResponse {
    if (data.paths && data.paths.length > 0) {
      return {
        content: [
          {
            type: 'text',
            text: `${data.paths.length} files opened in VS Code as tabs`
          }
        ]
      };
    } else if (data.path) {
      const lineText = data.line_highlight ? ` at line ${data.line_highlight}` : '';
      return {
        content: [
          {
            type: 'text',
            text: `File opened in VS Code: ${data.path}${lineText}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: 'Files opened in VS Code'
          }
        ]
      };
    }
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: ShowFileError): MCPResponse {
    return {
      content: [
        {
          type: 'text',
          text: `Error opening file: ${error.message}`
        }
      ]
    };
  }
}