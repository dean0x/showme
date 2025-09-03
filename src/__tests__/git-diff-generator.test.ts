import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import { GitDiffGenerator, GitDiffError, type DiffOptions } from '../utils/git-diff-generator.js';
import { GitDetector, type GitRepository, GitDetectionError } from '../utils/git-detector.js';
import type { Logger } from '../utils/logger.js';

describe('GitDiffGenerator', () => {
  let mockGitDetector: MockedObject<GitDetector>;
  let mockLogger: MockedObject<Logger>;
  let gitDiffGenerator: GitDiffGenerator;
  let mockRepository: GitRepository;

  beforeEach(() => {
    mockGitDetector = {
      detectRepository: vi.fn(),
      isGitRepository: vi.fn()
    } as MockedObject<GitDetector>;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockRepository = {
      gitRoot: '/workspace/showme-mcp',
      currentBranch: 'main',
      hasRemote: true,
      remoteName: 'origin',
      remoteUrl: 'https://github.com/user/repo.git',
      workingDirectory: '/workspace/showme-mcp'
    };

    gitDiffGenerator = new GitDiffGenerator(mockGitDetector, mockLogger);
  });

  describe('factory method', () => {
    it('should create GitDiffGenerator with default logger', () => {
      const generator = GitDiffGenerator.create();
      expect(generator).toBeInstanceOf(GitDiffGenerator);
    });

    it('should create GitDiffGenerator with custom logger', () => {
      const generator = GitDiffGenerator.create(mockLogger);
      expect(generator).toBeInstanceOf(GitDiffGenerator);
    });
  });

  describe('generateDiff', () => {
    it('should handle repository detection failure', async () => {
      mockGitDetector.detectRepository.mockResolvedValue({
        ok: false,
        error: new GitDetectionError('Not a git repository', 'NOT_GIT_REPOSITORY')
      });

      const options: DiffOptions = { type: 'unstaged' };
      const result = await gitDiffGenerator.generateDiff('/tmp/not-git', options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('Not a git repository');
      }
    });

    it('should log debug information when starting diff generation', async () => {
      mockGitDetector.detectRepository.mockResolvedValue({
        ok: false,
        error: new GitDetectionError('Test error', 'TEST_ERROR')
      });

      const options: DiffOptions = { 
        type: 'commit', 
        target: 'abc123',
        paths: ['src/file.ts']
      };
      await gitDiffGenerator.generateDiff('/workspace/showme-mcp', options);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting git diff generation',
        expect.objectContaining({
          workingPath: '/workspace/showme-mcp',
          diffType: 'commit',
          target: 'abc123',
          paths: ['src/file.ts']
        })
      );
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockGitDetector.detectRepository.mockResolvedValue({
        ok: true,
        value: mockRepository
      });
    });

    it('should call generateDiff with staged options for getStagedDiff', async () => {
      const spy = vi.spyOn(gitDiffGenerator, 'generateDiff').mockResolvedValue({
        ok: false,
        error: new GitDiffError('Mock error', 'MOCK_ERROR')
      });

      await gitDiffGenerator.getStagedDiff('/workspace/showme-mcp', ['file1.ts']);

      expect(spy).toHaveBeenCalledWith('/workspace/showme-mcp', {
        type: 'staged',
        paths: ['file1.ts']
      });
    });

    it('should call generateDiff with unstaged options for getUnstagedDiff', async () => {
      const spy = vi.spyOn(gitDiffGenerator, 'generateDiff').mockResolvedValue({
        ok: false,
        error: new GitDiffError('Mock error', 'MOCK_ERROR')
      });

      await gitDiffGenerator.getUnstagedDiff('/workspace/showme-mcp');

      expect(spy).toHaveBeenCalledWith('/workspace/showme-mcp', {
        type: 'unstaged',
        paths: undefined
      });
    });

    it('should call generateDiff with commit options for getCommitDiff', async () => {
      const spy = vi.spyOn(gitDiffGenerator, 'generateDiff').mockResolvedValue({
        ok: false,
        error: new GitDiffError('Mock error', 'MOCK_ERROR')
      });

      await gitDiffGenerator.getCommitDiff('/workspace/showme-mcp', 'abc123');

      expect(spy).toHaveBeenCalledWith('/workspace/showme-mcp', {
        type: 'commit',
        target: 'abc123',
        paths: undefined
      });
    });

    it('should call generateDiff with branch options for getBranchDiff', async () => {
      const spy = vi.spyOn(gitDiffGenerator, 'generateDiff').mockResolvedValue({
        ok: false,
        error: new GitDiffError('Mock error', 'MOCK_ERROR')
      });

      await gitDiffGenerator.getBranchDiff('/workspace/showme-mcp', 'feature-branch');

      expect(spy).toHaveBeenCalledWith('/workspace/showme-mcp', {
        type: 'branch',
        target: 'feature-branch',
        paths: undefined
      });
    });
  });

  describe('GitDiffError', () => {
    it('should create error with code and message', () => {
      const error = new GitDiffError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('GitDiffError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('integration test with real git repository', () => {
    it('should detect and handle empty diff result', async () => {
      // This is an integration test with the real git repository
      const realGenerator = GitDiffGenerator.create(mockLogger);
      
      // Test with current repository - may have no staged changes
      const result = await realGenerator.getStagedDiff('/workspace/showme-mcp');
      
      // Should succeed even if there are no staged changes
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        expect(result.value.repository.gitRoot).toBe('/workspace/showme-mcp');
        expect(result.value.type).toBe('staged');
        expect(result.value.stats).toBeDefined();
        expect(typeof result.value.stats.filesChanged).toBe('number');
        expect(typeof result.value.stats.additions).toBe('number');
        expect(typeof result.value.stats.deletions).toBe('number');
        expect(Array.isArray(result.value.files)).toBe(true);
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Git diff generated successfully',
        expect.objectContaining({
          gitRoot: '/workspace/showme-mcp',
          diffType: 'staged',
          filesChanged: expect.any(Number),
          additions: expect.any(Number),
          deletions: expect.any(Number),
          duration: expect.any(Number)
        })
      );
    });

    it('should handle invalid commit hash', async () => {
      const realGenerator = GitDiffGenerator.create(mockLogger);
      
      const result = await realGenerator.getCommitDiff('/workspace/showme-mcp', 'invalid-hash-123');
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(GitDiffError);
        expect(['INVALID_TARGET', 'AMBIGUOUS_TARGET', 'DIFF_COMMAND_ERROR', 'DIFF_GENERATION_FAILED']).toContain(result.error.code);
      }
    });

    it('should handle non-git directory gracefully', async () => {
      const realGenerator = GitDiffGenerator.create(mockLogger);
      
      const result = await realGenerator.getUnstagedDiff('/tmp');
      
      expect(result.ok).toBe(false);
      // Should propagate GitDetectionError
    });
  });
});