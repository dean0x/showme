/**
 * Git temporary file manager - simplified approach
 * Uses deterministic filenames in /tmp/ - no cleanup needed, just overwrite
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { type Result } from './path-validator.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { ErrorFactory, FileSystemError } from './error-handling.js';

/**
 * Temporary file reference - no cleanup needed
 */
export interface TempFile {
  filepath: string;
  content: string;
  cleanup: () => Promise<void>; // No-op for compatibility
}

/**
 * Simple manager for temporary files - uses fixed filenames that get overwritten
 */
export class GitTempManager {
  private readonly tempDir = '/tmp';

  constructor(
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Create temporary file with deterministic naming
   * Always overwrites same files - no cleanup needed
   */
  async createTempFile(
    content: string,
    originalPath: string,
    suffix = 'temp'
  ): Promise<Result<TempFile, FileSystemError>> {
    try {
      // Create deterministic filename based on original path and suffix
      const basename = path.basename(originalPath);
      const ext = path.extname(basename);
      const name = path.basename(basename, ext);
      const tempName = `showme-${name}-${suffix}${ext}`;
      const tempPath = path.join(this.tempDir, tempName);

      // Write content to temp file (overwrites if exists)
      await fs.writeFile(tempPath, content, 'utf8');
      
      this.logger.debug('Created/updated temp file', { 
        tempPath, 
        originalPath, 
        size: content.length 
      });

      return {
        ok: true,
        value: {
          filepath: tempPath,
          content,
          cleanup: async (): Promise<void> => {
            // No-op - we just overwrite files, no need to clean up
          }
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create temp file', { 
        originalPath, 
        error: err.message 
      });
      
      return {
        ok: false,
        error: ErrorFactory.fileSystem(
          `Failed to create temp file: ${err.message}`,
          'TEMP_FILE_CREATE_ERROR',
          { originalPath, suffix }
        )
      };
    }
  }

  /**
   * Create temp file from git show command
   */
  async createGitTempFile(
    gitRef: string,
    filepath: string
  ): Promise<Result<TempFile, FileSystemError>> {
    try {
      const { spawn } = await import('child_process');
      
      return new Promise<Result<TempFile, FileSystemError>>((resolve) => {
        const gitShow = spawn('git', ['show', `${gitRef}:${filepath}`]);
        let content = '';
        let error = '';

        gitShow.stdout.on('data', (data) => {
          content += data.toString();
        });

        gitShow.stderr.on('data', (data) => {
          error += data.toString();
        });

        gitShow.on('close', async (code): Promise<void> => {
          if (code !== 0) {
            resolve({
              ok: false,
              error: ErrorFactory.fileSystem(
                `Git show failed: ${error.trim()}`,
                'GIT_SHOW_ERROR',
                { gitRef, filepath, exitCode: code }
              )
            });
            return;
          }

          // Use gitRef in filename for deterministic naming
          const safeSuffix = gitRef.replace(/[^a-zA-Z0-9]/g, '_');
          const tempResult = await this.createTempFile(content, filepath, safeSuffix);
          resolve(tempResult);
        });
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        ok: false,
        error: ErrorFactory.fileSystem(
          `Failed to create git temp file: ${err.message}`,
          'GIT_TEMP_ERROR',
          { gitRef, filepath }
        )
      };
    }
  }

  /**
   * No-op cleanup for compatibility - we don't track files anymore
   */
  async cleanup(): Promise<void> {
    this.logger.debug('GitTempManager cleanup called (no-op)');
  }

  /**
   * Get temp directory
   */
  getTempDir(): string {
    return this.tempDir;
  }
}