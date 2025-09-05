import { execFile } from 'child_process';
import { promisify } from 'util';
import { type Result } from './path-validator.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { GitDetector, type GitRepository } from './git-detector.js';
import { GitOperationError } from './error-handling.js';

const execFileAsync = promisify(execFile);

declare const performance: { now(): number };

/**
 * Git diff generation errors
 */
export class GitDiffError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'GitDiffError';
  }
}

/**
 * Git diff types
 */
export type DiffType = 'staged' | 'unstaged' | 'commit' | 'commit-range' | 'branch';

/**
 * Diff options
 */
export interface DiffOptions {
  type: DiffType;
  base?: string; // base commit/branch for ranges
  target?: string; // target commit hash, branch name, etc.
  paths?: string[]; // specific files/paths to diff
  contextLines?: number; // number of context lines
  ignoreWhitespace?: boolean;
}

/**
 * File diff information
 */
export interface FileDiff {
  path: string;
  oldPath?: string; // for renames
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  chunks: DiffChunk[];
}

/**
 * Diff chunk (hunk)
 */
export interface DiffChunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  header: string;
}

/**
 * Complete diff result
 */
export interface DiffResult {
  repository: GitRepository;
  type: DiffType;
  target?: string;
  files: FileDiff[];
  stats: {
    filesChanged: number;
    additions: number;
    deletions: number;
  };
  raw: string; // raw git diff output
}

/**
 * Git diff generator following engineering principles
 * - Uses Result types for error handling
 * - Accepts Logger and GitDetector dependency injection
 * - Structured logging with context
 * - Performance monitoring
 */
export class GitDiffGenerator {
  constructor(
    private readonly gitDetector: GitDetector,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method for creating GitDiffGenerator instances
   */
  static create(logger?: Logger): GitDiffGenerator {
    const actualLogger = logger || new ConsoleLogger();
    const gitDetector = GitDetector.create(actualLogger);
    return new GitDiffGenerator(gitDetector, actualLogger);
  }

  /**
   * Generate diff from a working directory
   */
  async generateDiff(
    workingPath: string,
    options: DiffOptions
  ): Promise<Result<DiffResult, GitDiffError | GitOperationError>> {
    const startTime = performance.now();
    
    this.logger.debug('Starting git diff generation', {
      workingPath,
      diffType: options.type,
      target: options.target,
      paths: options.paths,
      timestamp: new Date().toISOString()
    });

    // First, detect the git repository
    const repoResult = await this.gitDetector.detectRepository(workingPath);
    if (!repoResult.ok) {
      return { ok: false, error: repoResult.error };
    }

    const repository = repoResult.value;

    // Generate the unified diff for diff2html
    const unifiedDiffResult = await this.executeDiff(repository.gitRoot, options);
    if (!unifiedDiffResult.ok) {
      return unifiedDiffResult;
    }

    // Generate statistics separately
    const statsResult = await this.executeStats(repository.gitRoot, options);
    if (!statsResult.ok) {
      return { ok: false, error: statsResult.error };
    }

    // Parse the statistics
    const parsedResult = await this.parseStats(statsResult.value, unifiedDiffResult.value, repository, options);
    if (!parsedResult.ok) {
      return parsedResult;
    }

    const duration = performance.now() - startTime;
    this.logger.info('Git diff generated successfully', {
      gitRoot: repository.gitRoot,
      diffType: options.type,
      filesChanged: parsedResult.value.stats.filesChanged,
      additions: parsedResult.value.stats.additions,
      deletions: parsedResult.value.stats.deletions,
      duration
    });

    return parsedResult;
  }

  /**
   * Execute git diff command
   */
  private async executeDiff(
    gitRoot: string,
    options: DiffOptions
  ): Promise<Result<string, GitDiffError>> {
    try {
      const argsResult = this.buildDiffCommand(options);
      if (!argsResult.ok) {
        return argsResult;
      }
      
      const { stdout } = await execFileAsync('git', argsResult.value, {
        cwd: gitRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large diffs
        timeout: 30000 // 30 second timeout
      });

      return { ok: true, value: stdout };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for common git diff errors
      if (errorMessage.includes('bad revision')) {
        return {
          ok: false,
          error: new GitDiffError(`Invalid commit or branch: ${options.target}`, 'INVALID_TARGET')
        };
      }

      if (errorMessage.includes('ambiguous argument')) {
        return {
          ok: false,
          error: new GitDiffError(`Ambiguous target: ${options.target}`, 'AMBIGUOUS_TARGET')
        };
      }

      // Check for timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        return {
          ok: false,
          error: new GitDiffError('Git operation timed out', 'TIMEOUT')
        };
      }

      return {
        ok: false,
        error: new GitDiffError(
          `Git diff command failed: ${errorMessage}`,
          'DIFF_COMMAND_ERROR'
        )
      };
    }
  }

  /**
   * Validate and sanitize file paths for git operations
   */
  private validatePaths(paths: string[]): Result<string[], GitDiffError> {
    const validatedPaths: string[] = [];
    
    for (const path of paths) {
      // Check for dangerous characters and patterns
      if (path.includes('\0') || path.includes('..') || path.startsWith('-')) {
        return {
          ok: false,
          error: new GitDiffError(`Unsafe path detected: ${path}`, 'UNSAFE_PATH')
        };
      }
      
      // Normalize path separators and remove leading/trailing whitespace
      const cleanPath = path.trim().replace(/\\/g, '/');
      
      // Reject empty paths
      if (!cleanPath) {
        return {
          ok: false,
          error: new GitDiffError('Empty path provided', 'EMPTY_PATH')
        };
      }
      
      validatedPaths.push(cleanPath);
    }
    
    return { ok: true, value: validatedPaths };
  }

  /**
   * Build git diff command arguments
   */
  private buildDiffCommand(options: DiffOptions): Result<string[], GitDiffError> {
    const args = ['diff'];

    // Add diff type specific arguments
    switch (options.type) {
      case 'staged':
        args.push('--cached');
        break;
      case 'unstaged':
        // Default behavior, no additional args needed
        break;
      case 'commit':
        if (options.target) {
          args.push(`${options.target}~1`, options.target);
        } else {
          args.push('HEAD~1', 'HEAD');
        }
        break;
      case 'commit-range':
        if (options.base && options.target) {
          args.push(`${options.base}..${options.target}`);
        } else if (options.target) {
          args.push(`HEAD~1..${options.target}`);
        } else {
          args.push('HEAD~1..HEAD');
        }
        break;
      case 'branch':
        if (options.target) {
          args.push(`${options.target}...HEAD`);
        } else {
          args.push('main...HEAD');
        }
        break;
    }

    // Add context lines
    if (options.contextLines !== undefined) {
      args.push(`-U${options.contextLines}`);
    }

    // Add whitespace options
    if (options.ignoreWhitespace) {
      args.push('--ignore-all-space');
    }

    // Add unified diff format for diff2html compatibility
    args.push('--no-prefix'); // Remove a/ b/ prefixes for cleaner output

    // Add specific paths if provided
    if (options.paths && options.paths.length > 0) {
      const pathValidationResult = this.validatePaths(options.paths);
      if (!pathValidationResult.ok) {
        return pathValidationResult;
      }
      
      args.push('--');
      args.push(...pathValidationResult.value);
    }

    return { ok: true, value: args };
  }

  /**
   * Execute git diff command for statistics only
   */
  private async executeStats(
    gitRoot: string,
    options: DiffOptions
  ): Promise<Result<string, GitDiffError>> {
    try {
      const argsResult = this.buildStatsCommand(options);
      if (!argsResult.ok) {
        return argsResult;
      }
      
      const { stdout } = await execFileAsync('git', argsResult.value, {
        cwd: gitRoot,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000
      });

      return { ok: true, value: stdout };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        error: new GitDiffError(`Stats generation failed: ${errorMessage}`, 'STATS_ERROR')
      };
    }
  }

  /**
   * Build git diff command for statistics only
   */
  private buildStatsCommand(options: DiffOptions): Result<string[], GitDiffError> {
    const args = ['diff'];

    // Add diff type specific arguments (same as before)
    switch (options.type) {
      case 'staged':
        args.push('--cached');
        break;
      case 'unstaged':
        break;
      case 'commit':
        if (options.target) {
          args.push(`${options.target}~1`, options.target);
        } else {
          args.push('HEAD~1', 'HEAD');
        }
        break;
      case 'commit-range':
        if (options.base && options.target) {
          args.push(`${options.base}..${options.target}`);
        } else if (options.target) {
          args.push(`HEAD~1..${options.target}`);
        } else {
          args.push('HEAD~1..HEAD');
        }
        break;
      case 'branch':
        if (options.target) {
          args.push(`${options.target}...HEAD`);
        } else {
          args.push('main...HEAD');
        }
        break;
    }

    // Add stats only
    args.push('--numstat');
    args.push('--summary');

    // Add specific paths if provided
    if (options.paths && options.paths.length > 0) {
      const pathValidationResult = this.validatePaths(options.paths);
      if (!pathValidationResult.ok) {
        return pathValidationResult;
      }
      
      args.push('--');
      args.push(...pathValidationResult.value);
    }

    return { ok: true, value: args };
  }

  /**
   * Parse git diff statistics into structured format
   */
  private async parseStats(
    statsOutput: string,
    unifiedDiff: string,
    repository: GitRepository,
    options: DiffOptions
  ): Promise<Result<DiffResult, GitDiffError>> {
    try {
      const files: FileDiff[] = [];
      const lines = statsOutput.split('\n');
      
      let totalAdditions = 0;
      let totalDeletions = 0;

      // Parse numstat output for statistics
      for (const line of lines) {
        if (/^\d+\t\d+\t/.test(line)) {
          const [additions, deletions, path] = line.split('\t');
          const addCount = additions === '-' ? 0 : parseInt(additions, 10);
          const delCount = deletions === '-' ? 0 : parseInt(deletions, 10);
          
          totalAdditions += addCount;
          totalDeletions += delCount;
          
          files.push({
            path,
            status: 'modified', // Simplified - diff2html will handle detailed status
            additions: addCount,
            deletions: delCount,
            chunks: [] // Empty - diff2html handles the actual diff parsing
          });
        }
      }

      const result: DiffResult = {
        repository,
        type: options.type,
        files,
        stats: {
          filesChanged: files.length,
          additions: totalAdditions,
          deletions: totalDeletions
        },
        raw: unifiedDiff, // Use the unified diff for diff2html
        ...(options.target ? { target: options.target } : {})
      };

      return { ok: true, value: result };

    } catch (error) {
      return {
        ok: false,
        error: new GitDiffError(
          `Failed to parse stats: ${error instanceof Error ? error.message : String(error)}`,
          'STATS_PARSE_ERROR'
        )
      };
    }
  }

  /**
   * Get staged diff (files added to index)
   */
  async getStagedDiff(workingPath: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitOperationError>> {
    return this.generateDiff(workingPath, {
      type: 'staged',
      ...(paths ? { paths } : {})
    });
  }

  /**
   * Get unstaged diff (working directory changes)
   */
  async getUnstagedDiff(workingPath: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitOperationError>> {
    return this.generateDiff(workingPath, {
      type: 'unstaged',
      ...(paths ? { paths } : {})
    });
  }

  /**
   * Get commit diff
   */
  async getCommitDiff(
    workingPath: string,
    commitHash?: string,
    paths?: string[]
  ): Promise<Result<DiffResult, GitDiffError | GitOperationError>> {
    return this.generateDiff(workingPath, {
      type: 'commit',
      ...(commitHash ? { target: commitHash } : {}),
      ...(paths ? { paths } : {})
    });
  }

  /**
   * Get branch diff
   */
  async getBranchDiff(
    workingPath: string,
    baseBranch?: string,
    paths?: string[]
  ): Promise<Result<DiffResult, GitDiffError | GitOperationError>> {
    return this.generateDiff(workingPath, {
      type: 'branch',
      ...(baseBranch ? { target: baseBranch } : {}),
      ...(paths ? { paths } : {})
    });
  }
}