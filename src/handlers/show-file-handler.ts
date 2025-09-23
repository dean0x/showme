/**
 * Show file handler - VS Code integration
 * Following engineering principles: DI, pipe composition, Result types
 */

import { PathValidator } from '../utils/path-validator.js';
import { VSCodeExecutor, createVSCodeExecutor } from '../utils/vscode-executor.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';
import { ShowFileError } from '../utils/error-handling.js';

declare const performance: { now(): number };

/**
 * Show file request arguments
 */
export interface ShowFileRequest {
  files?: string[];  // List of files to open
  line?: number;  // Line number to jump to (only applies to first file)
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
    private vsCodeExecutor: VSCodeExecutor,
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
   * Handle ShowFile request
   */
  async handleFileRequest(args: ShowFileRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    // Always reuse window for files
    this.vsCodeExecutor = createVSCodeExecutor({
      reuseWindow: true
    }, this.logger);

    // Validate we have files to open
    if (!args.files || args.files.length === 0) {
      return this.formatErrorResponse(
        new ShowFileError('No files specified', 'MISSING_FILES', {})
      );
    }

    const result = await this.handleFiles(args);

    const duration = performance.now() - startTime;
    this.logger.info('ShowFile request completed', {
      files: args.files,
      fileCount: args.files.length,
      line: args.line,
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
   * Handle files request
   */
  private async handleFiles(args: ShowFileRequest): Promise<Result<{
    files: string[];
    validatedPaths: string[];
    command: string;
    line?: number;
    success: boolean;
  }, ShowFileError>> {
    if (!args.files || args.files.length === 0) {
      return {
        ok: false,
        error: new ShowFileError(
          'No files provided',
          'MISSING_FILES',
          {}
        )
      };
    }

    // Validate all paths
    const validatedPaths: string[] = [];
    for (const file of args.files) {
      const validationResult = await this.pathValidator.validatePath(file, { checkAccess: true });
      if (!validationResult.ok) {
        return {
          ok: false,
          error: new ShowFileError(
            `Path validation failed for ${file}: ${validationResult.error.message}`,
            validationResult.error.code,
            { file, files: args.files }
          )
        };
      }
      validatedPaths.push(validationResult.value);
    }

    // Handle single file with line number
    if (args.files.length === 1 && args.line) {
      const vsCodeResult = await this.vsCodeExecutor.openFile(
        validatedPaths[0],
        args.line
      );

      if (!vsCodeResult.ok) {
        return {
          ok: false,
          error: new ShowFileError(
            `Failed to open file in VS Code: ${vsCodeResult.error.message}`,
            vsCodeResult.error.code,
            { files: args.files, line: args.line }
          )
        };
      }

      return {
        ok: true,
        value: {
          files: args.files,
          validatedPaths,
          command: vsCodeResult.value.command,
          line: args.line,
          success: vsCodeResult.value.success
        }
      };
    }

    // Handle multiple files (or single file without line number)
    const vsCodeResult = await this.vsCodeExecutor.openFiles(validatedPaths);

    if (!vsCodeResult.ok) {
      return {
        ok: false,
        error: new ShowFileError(
          `Failed to open files in VS Code: ${vsCodeResult.error.message}`,
          vsCodeResult.error.code,
          { files: args.files, validatedPaths }
        )
      };
    }

    return {
      ok: true,
      value: {
        files: args.files,
        validatedPaths,
        command: vsCodeResult.value.command,
        success: vsCodeResult.value.success
      }
    };
  }


  /**
   * Format success response
   */
  private formatSuccessResponse(data: {
    files: string[];
    validatedPaths: string[];
    command: string;
    line?: number;
    success: boolean;
  }): MCPResponse {
    if (data.files.length === 1) {
      const lineText = data.line ? ` at line ${data.line}` : '';
      return {
        content: [
          {
            type: 'text',
            text: `File opened in VS Code: ${data.files[0]}${lineText}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `${data.files.length} files opened in VS Code as tabs`
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