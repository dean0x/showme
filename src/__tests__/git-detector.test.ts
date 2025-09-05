import { describe, it, expect, vi, beforeEach, afterEach, type MockedObject } from 'vitest';
import { GitDetector } from '../utils/git-detector.js';
import { GitOperationError } from '../utils/error-handling.js';
import type { Logger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

describe('GitDetector', () => {
  let mockLogger: MockedObject<Logger>;
  let gitDetector: GitDetector;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    gitDetector = new GitDetector(mockLogger);
  });

  describe('detectRepository - Integration Tests', () => {
    it('should detect the current git repository', async () => {
      // This is an integration test using the actual git repository
      const result = await gitDetector.detectRepository('/workspace/showme-mcp');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.gitRoot).toBe('/workspace/showme-mcp');
        expect(result.value.currentBranch).toBeDefined();
        expect(result.value.workingDirectory).toBe('/workspace/showme-mcp');
        // We might or might not have remotes configured
        expect(typeof result.value.hasRemote).toBe('boolean');
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Git repository detected successfully',
        expect.objectContaining({
          gitRoot: '/workspace/showme-mcp',
          currentBranch: expect.any(String),
          hasRemote: expect.any(Boolean),
          duration: expect.any(Number)
        })
      );
    });

    it('should detect repository from subdirectory', async () => {
      const result = await gitDetector.detectRepository('/workspace/showme-mcp/src');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.gitRoot).toBe('/workspace/showme-mcp');
        expect(result.value.workingDirectory).toBe('/workspace/showme-mcp/src');
      }
    });

    it('should handle non-existent directory', async () => {
      const result = await gitDetector.detectRepository('/non/existent/path');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GitOperationError);
        expect(['GIT_ROOT_ERROR', 'DIRECTORY_NOT_FOUND', 'GIT_DETECTION_FAILED']).toContain(result.error.code);
      }

      // Note: Error logging only happens for unexpected exceptions,
      // not for expected Result<T,E> error paths
    });
  });

  describe('detectRepository - Unit Tests with Temp Directory', () => {
    let tempDir: string;

    beforeEach(async () => {
      // Create a temporary directory for testing non-git scenarios
      tempDir = path.join('/tmp', `git-detector-test-${Date.now()}`);
      await fs.mkdir(tempDir, { recursive: true });
    });

    afterEach(async () => {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });

    it('should handle non-git directory', async () => {
      const result = await gitDetector.detectRepository(tempDir);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GitOperationError);
        expect(result.error.code).toBe('NOT_GIT_REPOSITORY');
        expect(result.error.message).toBe('Not a git repository');
      }
    });
  });

  describe('isGitRepository', () => {
    it('should return true for current git repository', async () => {
      const isGit = await gitDetector.isGitRepository('/workspace/showme-mcp');
      expect(isGit).toBe(true);
    });

    it('should return false for non-git directory', async () => {
      const isGit = await gitDetector.isGitRepository('/tmp');
      expect(isGit).toBe(false);
    });
  });

  describe('factory method', () => {
    it('should create GitDetector with default logger', () => {
      const detector = GitDetector.create();
      expect(detector).toBeInstanceOf(GitDetector);
    });

    it('should create GitDetector with custom logger', () => {
      const detector = GitDetector.create(mockLogger);
      expect(detector).toBeInstanceOf(GitDetector);
    });
  });

  describe('GitOperationError', () => {
    it('should create error with code and message', () => {
      const error = new GitOperationError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('GitOperationError');
      expect(error).toBeInstanceOf(Error);
    });
  });
});