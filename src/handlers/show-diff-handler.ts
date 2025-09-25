/**
 * Show diff handler - VS Code integration
 * Following engineering principles: DI, pipe composition, Result types
 */

import { GitDetector, type GitRepository } from '../utils/git-detector.js';
import { GitDiffGenerator, type DiffResult } from '../utils/git-diff-generator.js';
import { VSCodeExecutor, createVSCodeExecutor, type VSCodeResult } from '../utils/vscode-executor.js';
import { GitTempManager, type TempFile } from '../utils/git-temp-manager.js';
import { pipe } from '../utils/pipe.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';
import { ShowDiffError, VSCodeExecutorError } from '../utils/error-handling.js';

declare const performance: { now(): number };

/**
 * Show diff request arguments
 */
export interface ShowDiffRequest {
  files?: string[];  // Optional list of files to show diff for
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
 * Handler for ShowDiff MCP tool
 * Opens git diffs directly in VS Code instead of browser
 */
export class ShowDiffHandler {
  constructor(
    private readonly gitDetector: GitDetector,
    private readonly gitDiffGenerator: GitDiffGenerator,
    private vsCodeExecutor: VSCodeExecutor,
    private readonly tempManager: GitTempManager,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method that creates handler with default dependencies
   */
  static create(logger: Logger = new ConsoleLogger()): ShowDiffHandler {
    const gitDetector = new GitDetector(logger);
    const gitDiffGenerator = new GitDiffGenerator(gitDetector, logger);
    const vsCodeExecutor = createVSCodeExecutor(undefined, logger);
    const tempManager = new GitTempManager(logger);
    
    return new ShowDiffHandler(
      gitDetector,
      gitDiffGenerator,
      vsCodeExecutor,
      tempManager,
      logger
    );
  }

  /**
   * Handle ShowDiff request using pipe composition
   */
  async handleDiffRequest(args: ShowDiffRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    // Always open new window for diffs
    this.vsCodeExecutor = createVSCodeExecutor({
      reuseWindow: false
    }, this.logger);

    const result = await pipe(
      this.detectRepository.bind(this),
      this.generateDiff.bind(this),
      this.openDiffInVSCode.bind(this)
    )({ ...args, workingPath: process.cwd() });

    const duration = performance.now() - startTime;
    this.logger.info('ShowDiff request completed', { 
      success: result.ok,
      filesCount: args.files?.length || 0,
      duration: Math.round(duration)
    });

    if (result.ok) {
      return this.formatSuccessResponse(result.value);
    } else {
      return this.formatErrorResponse(result.error);
    }
  }

  /**
   * Detect git repository
   */
  private async detectRepository(args: ShowDiffRequest & { workingPath: string }): Promise<Result<{
    workingPath: string;
    files?: string[];
    repository: GitRepository;
  }, ShowDiffError>> {
    const detectionResult = await this.gitDetector.detectRepository(args.workingPath);

    if (!detectionResult.ok) {
      return {
        ok: false,
        error: new ShowDiffError(
          `Git repository detection failed: ${detectionResult.error.message}`,
          detectionResult.error.code,
          { workingPath: args.workingPath }
        )
      };
    }

    return {
      ok: true,
      value: {
        workingPath: args.workingPath,
        repository: detectionResult.value,
        ...(args.files && { files: args.files })
      }
    };
  }

  /**
   * Generate git diff comparing HEAD to working directory
   */
  private async generateDiff(data: {
    workingPath: string;
    files?: string[];
    repository: GitRepository;
  }): Promise<Result<{
    workingPath: string;
    files?: string[];
    repository: GitRepository;
    diffResult: DiffResult;
    diffType: string;
  }, ShowDiffError>> {
    try {
      // Always compare HEAD to working directory (shows all changes)
      const diffResult = await this.gitDiffGenerator.generateDiff(
        data.workingPath,
        {
          type: 'branch',
          target: 'HEAD',
          paths: data.files
        }
      );

      if (!diffResult.ok) {
        return {
          ok: false,
          error: new ShowDiffError(
            `Git diff generation failed: ${diffResult.error.message}`,
            diffResult.error.code,
            { diffType: 'HEAD vs working', files: data.files }
          )
        };
      }

      return {
        ok: true,
        value: {
          ...data,
          diffResult: diffResult.value,
          diffType: 'HEAD vs working'
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        error: new ShowDiffError(
          `Diff generation error: ${err.message}`,
          'DIFF_GENERATION_ERROR',
          { files: data.files }
        )
      };
    }
  }

  /**
   * Open diff in VS Code using temp files for git content
   */
  private async openDiffInVSCode(data: {
    workingPath: string;
    files?: string[];
    repository: GitRepository;
    diffResult: DiffResult;
    diffType: string;
  }): Promise<Result<{
    workingPath: string;
    files?: string[];
    diffType: string;
    statistics: DiffResult['stats'];
    command: string;
    success: boolean;
    tempFiles: TempFile[];
  }, ShowDiffError>> {
    try {
      const tempFiles: TempFile[] = [];
      let vsCodeResult: Result<VSCodeResult, VSCodeExecutorError>;

      // Get the list of files to diff - either from user input or from diff result
      const filesToDiff = data.files && data.files.length > 0 
        ? data.files 
        : data.diffResult.files.map(f => f.path);
      
      // For specific files or files from diff result, open each as a separate diff tab
      if (filesToDiff.length > 0) {
        // Open each file as a separate diff tab
        let lastCommand = '';
        let allSuccess = true;
        
        for (let i = 0; i < filesToDiff.length; i++) {
          const filepath = filesToDiff[i];
          const isFirstOperation = i === 0;

          // Always compare HEAD version to working copy
          const headTempResult = await this.tempManager.createGitTempFile('HEAD', filepath);

          if (!headTempResult.ok) {
            this.logger.warn(`Skipping diff for ${filepath}: ${headTempResult.error.message}`);
            continue;
          }

          tempFiles.push(headTempResult.value);

          // Use current working version as new file
          const currentPath = `${data.workingPath}/${filepath}`;

          const diffResult = await this.vsCodeExecutor.openDiff(
            headTempResult.value.filepath,
            currentPath,
            `${filepath} (changes since last commit)`,
            isFirstOperation
          );

          if (diffResult.ok) {
            lastCommand = diffResult.value.command;
          } else {
            allSuccess = false;
            this.logger.warn(`Failed to open diff for ${filepath}: ${diffResult.error.message}`);
          }
        }
        
        // Return success if at least one diff was opened
        vsCodeResult = {
          ok: tempFiles.length > 0,
          value: {
            command: lastCommand,
            args: [],
            success: allSuccess && tempFiles.length > 0,
            message: `Opened ${tempFiles.length} diff tabs in VS Code`
          }
        } as Result<VSCodeResult, VSCodeExecutorError>;
        
        if (!vsCodeResult.ok) {
          return {
            ok: false,
            error: new ShowDiffError(
              'Failed to open any diff tabs',
              'NO_DIFFS_OPENED',
              { files: filesToDiff }
            )
          };
        }
      } else {
        // For general diffs without specific files, show the raw diff in a temp file
        const diffContent = data.diffResult.raw;
        const diffTempResult = await this.tempManager.createTempFile(
          diffContent,
          'diff.patch',
          'diff'
        );
        
        if (!diffTempResult.ok) {
          return {
            ok: false,
            error: new ShowDiffError(
              `Failed to create diff temp file: ${diffTempResult.error.message}`,
              diffTempResult.error.code,
              { diffType: data.diffType }
            )
          };
        }
        
        tempFiles.push(diffTempResult.value);
        
        vsCodeResult = await this.vsCodeExecutor.openFile(
          diffTempResult.value.filepath
        );
      }

      if (!vsCodeResult.ok) {
        return {
          ok: false,
          error: new ShowDiffError(
            `Failed to open diff in VS Code: ${vsCodeResult.error.message}`,
            vsCodeResult.error.code,
            { diffType: data.diffType, files: data.files }
          )
        };
      }

      const result: {
        workingPath: string;
        files?: string[];
        diffType: string;
        statistics: DiffResult['stats'];
        command: string;
        success: boolean;
        tempFiles: TempFile[];
      } = {
        workingPath: data.workingPath,
        diffType: data.diffType,
        statistics: data.diffResult.stats,
        command: vsCodeResult.value.command,
        success: vsCodeResult.value.success,
        tempFiles,
        ...(data.files && { files: data.files })
      };

      // No cleanup needed - temp files use deterministic names and get overwritten

      return {
        ok: true,
        value: result
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        error: new ShowDiffError(
          `VS Code diff error: ${err.message}`,
          'VSCODE_DIFF_ERROR',
          { diffType: data.diffType, files: data.files }
        )
      };
    }
  }

  /**
   * Format success response with statistics
   */
  private formatSuccessResponse(data: {
    workingPath: string;
    files?: string[];
    diffType: string;
    statistics: DiffResult['stats'];
    command: string;
    success: boolean;
    tempFiles: TempFile[];
  }): MCPResponse {
    const stats = data.statistics;
    
    // Special message for multiple file tabs
    if (data.files && data.files.length > 1) {
      const changesText = stats.additions + stats.deletions > 0
        ? ` with +${stats.additions}/-${stats.deletions} changes`
        : '';
      return {
        content: [
          {
            type: 'text',
            text: `Opened ${data.files.length} diff tabs in VS Code (changes since last commit)${changesText}`
          }
        ]
      };
    }
    
    const filesText = data.files && data.files.length > 0 
      ? ` (${data.files.length} file)` 
      : stats.filesChanged > 0 
        ? ` (${stats.filesChanged} files)`
        : '';
    
    const changesText = stats.additions + stats.deletions > 0
      ? ` +${stats.additions}/-${stats.deletions}`
      : '';

    return {
      content: [
        {
          type: 'text',
          text: `Git diff opened in VS Code (changes since last commit)${filesText}${changesText}`
        }
      ]
    };
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: ShowDiffError): MCPResponse {
    return {
      content: [
        {
          type: 'text',
          text: `Error opening diff: ${error.message}`
        }
      ]
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.tempManager.cleanup();
  }
}