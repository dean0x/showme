import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { type Result } from './path-validator.js';
import { type Logger, ConsoleLogger } from './logger.js';

const execFileAsync = promisify(execFile);

declare const performance: { now(): number };

/**
 * Git repository detection errors
 */
export class GitDetectionError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'GitDetectionError';
  }
}

/**
 * Git repository information
 */
export interface GitRepository {
  gitRoot: string;
  currentBranch: string;
  hasRemote: boolean;
  remoteName?: string;
  remoteUrl?: string;
  workingDirectory: string;
}

/**
 * Git repository detector following engineering principles
 * - Uses Result types for error handling
 * - Accepts Logger dependency injection
 * - Structured logging with context
 */
export class GitDetector {
  constructor(
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method for creating GitDetector instances
   */
  static create(logger?: Logger): GitDetector {
    return new GitDetector(logger || new ConsoleLogger());
  }

  /**
   * Detect git repository information from a given path
   */
  async detectRepository(workingPath: string): Promise<Result<GitRepository, GitDetectionError>> {
    const startTime = performance.now();
    const absolutePath = path.resolve(workingPath);
    
    this.logger.debug('Starting git repository detection', {
      workingPath: absolutePath,
      timestamp: new Date().toISOString()
    });

    // Check if we're in a git repository
    const gitRootResult = await this.getGitRoot(absolutePath);
    if (!gitRootResult.ok) {
      return gitRootResult;
    }

    const gitRoot = gitRootResult.value;

    // Get current branch
    const branchResult = await this.getCurrentBranch(gitRoot);
    if (!branchResult.ok) {
      return { ok: false, error: branchResult.error };
    }

    // Check for remote information
    const remoteResult = await this.getRemoteInfo(gitRoot);
    
    const duration = performance.now() - startTime;
    const repository: GitRepository = {
      gitRoot,
      currentBranch: branchResult.value,
      hasRemote: remoteResult.ok,
      workingDirectory: absolutePath,
      ...(remoteResult.ok ? {
        remoteName: remoteResult.value.name,
        remoteUrl: remoteResult.value.url
      } : {})
    };

    this.logger.info('Git repository detected successfully', {
      gitRoot,
      currentBranch: branchResult.value,
      hasRemote: remoteResult.ok,
      duration
    });

    return { ok: true, value: repository };
  }

  /**
   * Get the git repository root directory
   */
  private async getGitRoot(workingPath: string): Promise<Result<string, GitDetectionError>> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--show-toplevel'], {
        cwd: workingPath,
        encoding: 'utf8',
        timeout: 10000 // 10 second timeout
      });

      const gitRoot = stdout.trim();
      if (!gitRoot) {
        return {
          ok: false,
          error: new GitDetectionError('No git root found', 'NO_GIT_ROOT')
        };
      }

      return { ok: true, value: gitRoot };

    } catch (error) {
      // Check if it's a "not a git repository" error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not a git repository') || errorMessage.includes('not a git repo')) {
        return {
          ok: false,
          error: new GitDetectionError('Not a git repository', 'NOT_GIT_REPOSITORY')
        };
      }

      // Check for ENOENT (directory doesn't exist)
      if (errorMessage.includes('ENOENT') || errorMessage.includes('no such file or directory')) {
        return {
          ok: false,
          error: new GitDetectionError(`Directory does not exist: ${workingPath}`, 'DIRECTORY_NOT_FOUND')
        };
      }

      return {
        ok: false,
        error: new GitDetectionError(
          `Failed to get git root: ${errorMessage}`,
          'GIT_ROOT_ERROR'
        )
      };
    }
  }

  /**
   * Get the current branch name
   */
  private async getCurrentBranch(gitRoot: string): Promise<Result<string, GitDetectionError>> {
    try {
      const { stdout } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: gitRoot,
        encoding: 'utf8',
        timeout: 5000 // 5 second timeout
      });

      const branch = stdout.trim();
      if (!branch || branch === 'HEAD') {
        // Detached HEAD state - get commit hash instead
        const { stdout: commitHash } = await execFileAsync('git', ['rev-parse', '--short', 'HEAD'], {
          cwd: gitRoot,
          encoding: 'utf8',
          timeout: 5000 // 5 second timeout
        });
        return { ok: true, value: `detached-${commitHash.trim()}` };
      }

      return { ok: true, value: branch };

    } catch (error) {
      return {
        ok: false,
        error: new GitDetectionError(
          `Failed to get current branch: ${error instanceof Error ? error.message : String(error)}`,
          'BRANCH_ERROR'
        )
      };
    }
  }

  /**
   * Get remote repository information
   */
  private async getRemoteInfo(gitRoot: string): Promise<Result<{ name: string; url: string }, GitDetectionError>> {
    try {
      // Get default remote name (usually 'origin')
      const { stdout: remoteNames } = await execFileAsync('git', ['remote'], {
        cwd: gitRoot,
        encoding: 'utf8',
        timeout: 5000 // 5 second timeout
      });

      const remotes = remoteNames.trim().split('\n').filter(Boolean);
      if (remotes.length === 0) {
        return {
          ok: false,
          error: new GitDetectionError('No remotes configured', 'NO_REMOTES')
        };
      }

      // Use the first remote (typically 'origin')
      const remoteName = remotes[0];

      // Get remote URL
      const { stdout: remoteUrl } = await execFileAsync('git', ['remote', 'get-url', remoteName], {
        cwd: gitRoot,
        encoding: 'utf8',
        timeout: 5000 // 5 second timeout
      });

      return {
        ok: true,
        value: {
          name: remoteName,
          url: remoteUrl.trim()
        }
      };

    } catch (error) {
      return {
        ok: false,
        error: new GitDetectionError(
          `Failed to get remote info: ${error instanceof Error ? error.message : String(error)}`,
          'REMOTE_ERROR'
        )
      };
    }
  }

  /**
   * Check if a path is within a git repository
   */
  async isGitRepository(workingPath: string): Promise<boolean> {
    const result = await this.detectRepository(workingPath);
    return result.ok;
  }
}