/**
 * Show diff handler - VS Code integration
 * Following engineering principles: DI, pipe composition, Result types
 */

import { GitDetector, type GitRepository } from '../utils/git-detector.js';
import { GitDiffGenerator, type DiffResult, GitDiffError } from '../utils/git-diff-generator.js';
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
  base?: string;
  target?: string;
  files?: string[];
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
 * Handler for ShowMeTheDiff MCP tool
 * Opens git diffs directly in VS Code instead of browser
 */
export class ShowDiffHandler {
  constructor(
    private readonly gitDetector: GitDetector,
    private readonly gitDiffGenerator: GitDiffGenerator,
    private readonly vsCodeExecutor: VSCodeExecutor,
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
   * Handle ShowMeTheDiff request using pipe composition
   */
  async ShowMeTheDiff(args: ShowDiffRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    const result = await pipe(
      this.detectRepository.bind(this),
      this.generateDiff.bind(this),
      this.openDiffInVSCode.bind(this)
    )({ ...args, workingPath: process.cwd() });

    const duration = performance.now() - startTime;
    this.logger.info('ShowMeTheDiff request completed', { 
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
    base?: string;
    target?: string;
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

    const result: {
      workingPath: string;
      base?: string;
      target?: string;
      files?: string[];
      repository: GitRepository;
    } = {
      workingPath: args.workingPath,
      repository: detectionResult.value
    };
    
    if (args.base !== undefined) result.base = args.base;
    if (args.target !== undefined) result.target = args.target;
    if (args.files !== undefined) result.files = args.files;

    return {
      ok: true,
      value: result
    };
  }

  /**
   * Generate git diff based on parameters
   */
  private async generateDiff(data: {
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    repository: GitRepository;
  }): Promise<Result<{
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    repository: GitRepository;
    diffResult: DiffResult;
    diffType: string;
  }, ShowDiffError>> {
    try {
      let diffResult: Result<DiffResult, GitDiffError>;
      let diffType: string;

      if (data.base && data.target) {
        // Commit range diff
        diffResult = await this.gitDiffGenerator.generateDiff(
          data.workingPath,
          {
            type: 'commit-range',
            base: data.base,
            target: data.target,
            paths: data.files
          }
        );
        diffType = `${data.base}..${data.target}`;
      } else if (data.base) {
        // Base to working directory
        diffResult = await this.gitDiffGenerator.getBranchDiff(
          data.workingPath,
          data.base,
          data.files
        );
        diffType = `${data.base}..working`;
      } else {
        // Working directory changes (staged + unstaged)
        diffResult = await this.gitDiffGenerator.getUnstagedDiff(
          data.workingPath,
          data.files
        );
        diffType = 'working changes';
      }

      if (!diffResult.ok) {
        return {
          ok: false,
          error: new ShowDiffError(
            `Git diff generation failed: ${diffResult.error.message}`,
            diffResult.error.code,
            { diffType, files: data.files }
          )
        };
      }

      return {
        ok: true,
        value: {
          ...data,
          diffResult: diffResult.value,
          diffType
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        error: new ShowDiffError(
          `Diff generation error: ${err.message}`,
          'DIFF_GENERATION_ERROR',
          { base: data.base, target: data.target, files: data.files }
        )
      };
    }
  }

  /**
   * Open diff in VS Code using temp files for git content
   */
  private async openDiffInVSCode(data: {
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    repository: GitRepository;
    diffResult: DiffResult;
    diffType: string;
  }): Promise<Result<{
    workingPath: string;
    base?: string;
    target?: string;
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

      // For single file diffs, create temp files and use VS Code diff
      if (data.files && data.files.length === 1) {
        const filepath = data.files[0];
        
        // Create temp file for old version
        const oldRef = data.target || data.base || 'HEAD';
        const oldTempResult = await this.tempManager.createGitTempFile(oldRef, filepath);
        
        if (!oldTempResult.ok) {
          return {
            ok: false,
            error: new ShowDiffError(
              `Failed to create temp file for old version: ${oldTempResult.error.message}`,
              oldTempResult.error.code,
              { filepath, oldRef }
            )
          };
        }
        
        tempFiles.push(oldTempResult.value);
        
        // Use current working version as new file
        const currentPath = `${data.workingPath}/${filepath}`;
        
        vsCodeResult = await this.vsCodeExecutor.openDiff(
          oldTempResult.value.filepath,
          currentPath,
          `${filepath} (${data.diffType})`
        );
      } else {
        // For multiple files or complex diffs, show the raw diff in a temp file
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
        base?: string;
        target?: string;
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
        tempFiles
      };
      
      if (data.base !== undefined) result.base = data.base;
      if (data.target !== undefined) result.target = data.target;
      if (data.files !== undefined) result.files = data.files;

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
    base?: string;
    target?: string;
    files?: string[];
    diffType: string;
    statistics: DiffResult['stats'];
    command: string;
    success: boolean;
    tempFiles: TempFile[];
  }): MCPResponse {
    const stats = data.statistics;
    const filesText = data.files && data.files.length > 0 
      ? ` (${data.files.length} files)` 
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
          text: `Git diff opened in VS Code: ${data.diffType}${filesText}${changesText}`
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