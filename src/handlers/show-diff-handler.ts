import { HTTPServer } from '../server/http-server.js';
import { GitDetector, type GitRepository } from '../utils/git-detector.js';
import { GitDiffGenerator, type DiffResult, GitDiffError } from '../utils/git-diff-generator.js';
import { GitDiffVisualizer, type DiffVisualizationResult, GitDiffVisualizationError } from '../utils/git-diff-visualizer.js';
import { GitDetectionError } from '../utils/git-detector.js';
import { pipe, map } from '../utils/pipe.js';
import { type Logger, ConsoleLogger } from '../utils/logger.js';
import { type Result } from '../utils/path-validator.js';

declare const performance: { now(): number };

/**
 * Show diff handler errors
 */
export class ShowDiffError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'ShowDiffError';
  }
}

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
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Handler for showme.diff MCP tool with multi-file selection support
 * Following engineering principles: DI, pipe composition, Result types
 */
export class ShowDiffHandler {
  private readonly gitDetector: GitDetector;
  private readonly gitDiffGenerator: GitDiffGenerator;
  private readonly gitDiffVisualizer: GitDiffVisualizer;

  constructor(
    private readonly httpServer: HTTPServer,
    private readonly logger: Logger = new ConsoleLogger()
  ) {
    this.gitDetector = new GitDetector(this.logger);
    this.gitDiffGenerator = new GitDiffGenerator(this.gitDetector, this.logger);
    this.gitDiffVisualizer = new GitDiffVisualizer(this.gitDiffGenerator, this.logger);
  }

  /**
   * Handle showme.diff request using pipe composition
   */
  async handleDiffRequest(args: ShowDiffRequest): Promise<MCPResponse> {
    const startTime = performance.now();

    const result = await pipe(
      this.detectRepository.bind(this),
      this.generateDiff.bind(this),
      this.visualizeDiff.bind(this),
      this.serveHTML.bind(this),
      map(this.formatSuccessResponse.bind(this))
    )({ ...args, workingPath: process.cwd() });

    const duration = performance.now() - startTime;
    this.logger.info('ShowDiff request completed', { 
      success: result.ok,
      filesCount: args.files?.length || 0,
      duration: Math.round(duration)
    });

    if (result.ok) {
      return result.value;
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
          detectionResult.error.code
        )
      };
    }

    return {
      ok: true,
      value: {
        workingPath: args.workingPath,
        base: args.base,
        target: args.target,
        files: args.files,
        repository: detectionResult.value
      }
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
  }, ShowDiffError>> {
    let diffResult: Result<DiffResult, GitDiffError | GitDetectionError>;

    try {
      if (data.base && data.target) {
        // Commit to commit diff
        diffResult = await this.gitDiffGenerator.getCommitDiff(
          data.workingPath,
          data.base,
          data.files
        );
      } else if (data.base) {
        // Base to working directory
        diffResult = await this.gitDiffGenerator.getBranchDiff(
          data.workingPath,
          data.base,
          data.files
        );
      } else {
        // Working directory changes (staged + unstaged)
        diffResult = await this.gitDiffGenerator.getUnstagedDiff(
          data.workingPath,
          data.files
        );
      }

      if (!diffResult.ok) {
        return {
          ok: false,
          error: new ShowDiffError(
            `Git diff generation failed: ${diffResult.error.message}`,
            diffResult.error.code
          )
        };
      }

      return {
        ok: true,
        value: {
          ...data,
          diffResult: diffResult.value
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: new ShowDiffError(
          `Diff generation error: ${error instanceof Error ? error.message : String(error)}`,
          'DIFF_GENERATION_ERROR'
        )
      };
    }
  }

  /**
   * Visualize diff as HTML
   */
  private async visualizeDiff(data: {
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    repository: GitRepository;
    diffResult: DiffResult;
  }): Promise<Result<{
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    htmlContent: string;
    statistics: DiffResult['stats'];
  }, ShowDiffError>> {
    let visualizationResult: Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>;

    try {
      if (data.base && data.target) {
        visualizationResult = await this.gitDiffVisualizer.visualizeCommitDiff(
          data.workingPath,
          data.base,
          data.files
        );
      } else if (data.base) {
        visualizationResult = await this.gitDiffVisualizer.visualizeBranchDiff(
          data.workingPath,
          data.base,
          data.files
        );
      } else {
        visualizationResult = await this.gitDiffVisualizer.visualizeUnstagedDiff(
          data.workingPath,
          data.files
        );
      }

      if (!visualizationResult.ok) {
        return {
          ok: false,
          error: new ShowDiffError(
            `Diff visualization failed: ${visualizationResult.error.message}`,
            visualizationResult.error.code
          )
        };
      }

      return {
        ok: true,
        value: {
          workingPath: data.workingPath,
          base: data.base,
          target: data.target,
          files: data.files,
          htmlContent: visualizationResult.value.html,
          statistics: visualizationResult.value.diffResult.stats
        }
      };
    } catch (error) {
      return {
        ok: false,
        error: new ShowDiffError(
          `Visualization error: ${error instanceof Error ? error.message : String(error)}`,
          'VISUALIZATION_ERROR'
        )
      };
    }
  }

  /**
   * Serve HTML via HTTP server
   */
  private async serveHTML(data: {
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    htmlContent: string;
    statistics: DiffResult['stats'];
  }): Promise<Result<{
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    url: string;
    statistics: DiffResult['stats'];
  }, ShowDiffError>> {
    const filename = 'diff.html';
    const serveResult = await this.httpServer.serveHTML(data.htmlContent, filename);

    if (!serveResult.ok) {
      return {
        ok: false,
        error: new ShowDiffError(
          `Failed to serve diff HTML: ${serveResult.error.message}`,
          serveResult.error.code
        )
      };
    }

    return {
      ok: true,
      value: {
        workingPath: data.workingPath,
        base: data.base,
        target: data.target,
        files: data.files,
        url: serveResult.value.url,
        statistics: data.statistics
      }
    };
  }

  /**
   * Format success response with statistics
   */
  private formatSuccessResponse(data: {
    workingPath: string;
    base?: string;
    target?: string;
    files?: string[];
    url: string;
    statistics: DiffResult['stats'];
  }): MCPResponse {
    const stats = data.statistics;
    const filesText = data.files && data.files.length > 0 
      ? ` (${data.files.length} files)` 
      : stats.filesChanged > 0 
        ? ` (${stats.filesChanged} files)`
        : '';
    
    const changesText = stats.insertions + stats.deletions > 0
      ? ` +${stats.insertions}/-${stats.deletions}`
      : '';

    const compareText = data.base && data.target 
      ? ` ${data.base}..${data.target}`
      : data.base
        ? ` ${data.base}..working`
        : '';

    return {
      content: [
        {
          type: 'text',
          text: `Git diff opened in browser${compareText}${filesText}${changesText}`
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
          text: `Error: ${error.message}`
        }
      ]
    };
  }
}