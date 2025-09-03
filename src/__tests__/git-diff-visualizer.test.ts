import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import { 
  GitDiffVisualizer, 
  GitDiffVisualizationError,
  type VisualizationOptions,
  type DiffVisualizationResult
} from '../utils/git-diff-visualizer.js';
import { GitDiffGenerator, type DiffResult, GitDiffError } from '../utils/git-diff-generator.js';
import { GitDetectionError } from '../utils/git-detector.js';
import type { Logger } from '../utils/logger.js';

// Mock diff2html
vi.mock('diff2html', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  html: vi.fn((_diffText: string, _options?: unknown) => {
    // Mock HTML output that resembles diff2html structure
    return `<div class="d2h-wrapper">
      <div class="d2h-file-header">Mock File</div>
      <div class="d2h-code-line">Mock diff content</div>
    </div>`;
  })
}));

describe('GitDiffVisualizer', () => {
  let mockDiffGenerator: MockedObject<GitDiffGenerator>;
  let mockLogger: MockedObject<Logger>;
  let gitDiffVisualizer: GitDiffVisualizer;
  let mockDiffResult: DiffResult;

  beforeEach(() => {
    mockDiffGenerator = {
      generateDiff: vi.fn(),
      getStagedDiff: vi.fn(),
      getUnstagedDiff: vi.fn(),
      getCommitDiff: vi.fn(),
      getBranchDiff: vi.fn()
    } as MockedObject<GitDiffGenerator>;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockDiffResult = {
      repository: {
        gitRoot: '/workspace/showme-mcp',
        currentBranch: 'main',
        hasRemote: true,
        remoteName: 'origin',
        remoteUrl: 'https://github.com/user/repo.git',
        workingDirectory: '/workspace/showme-mcp'
      },
      type: 'unstaged',
      files: [
        {
          path: 'src/test.ts',
          status: 'modified',
          additions: 5,
          deletions: 2,
          chunks: [
            {
              oldStart: 10,
              oldLines: 3,
              newStart: 10,
              newLines: 6,
              content: '+    added line\n     unchanged line\n-    removed line',
              header: 'test function'
            }
          ]
        }
      ],
      stats: {
        filesChanged: 1,
        additions: 5,
        deletions: 2
      },
      raw: 'diff --git a/src/test.ts b/src/test.ts\nindex 123..456\n+added line\n-removed line'
    };

    gitDiffVisualizer = new GitDiffVisualizer(mockDiffGenerator, mockLogger);
  });

  describe('factory method', () => {
    it('should create GitDiffVisualizer with default logger', () => {
      const visualizer = GitDiffVisualizer.create();
      expect(visualizer).toBeInstanceOf(GitDiffVisualizer);
    });

    it('should create GitDiffVisualizer with custom logger', () => {
      const visualizer = GitDiffVisualizer.create(mockLogger);
      expect(visualizer).toBeInstanceOf(GitDiffVisualizer);
    });
  });

  describe('visualizeDiff', () => {
    it('should successfully visualize a diff', async () => {
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: true,
        value: mockDiffResult
      });

      const options = { type: 'unstaged' as const };
      const visualizationOptions: VisualizationOptions = {
        outputFormat: 'side-by-side',
        colorScheme: 'dark'
      };

      const result = await gitDiffVisualizer.visualizeDiff(
        '/workspace/showme-mcp',
        options,
        visualizationOptions
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.diffResult).toEqual(mockDiffResult);
        expect(result.value.html).toContain('Git Diff: unstaged');
        expect(result.value.html).toContain('Repository: /workspace/showme-mcp');
        expect(result.value.html).toContain('Branch: main');
        expect(result.value.html).toContain('Files: 1');
        expect(result.value.html).toContain('+5');
        expect(result.value.html).toContain('-2');
        expect(result.value.stats.htmlLength).toBeGreaterThan(0);
        expect(result.value.stats.renderTime).toBeGreaterThanOrEqual(0);
      }

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Diff visualization completed',
        expect.objectContaining({
          gitRoot: '/workspace/showme-mcp',
          diffType: 'unstaged',
          filesChanged: 1,
          htmlLength: expect.any(Number),
          renderTime: expect.any(Number),
          totalDuration: expect.any(Number)
        })
      );
    });

    it('should handle diff generation failure', async () => {
      const diffError = new GitDiffError('No changes found', 'NO_CHANGES');
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: false,
        error: diffError
      });

      const options = { type: 'staged' as const };
      const result = await gitDiffVisualizer.visualizeDiff('/workspace/showme-mcp', options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(diffError);
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting diff visualization',
        expect.objectContaining({
          workingPath: '/workspace/showme-mcp',
          diffType: 'staged'
        })
      );
    });

    it('should handle git detection errors', async () => {
      const gitError = new GitDetectionError('Not a git repository', 'NOT_GIT_REPOSITORY');
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: false,
        error: gitError
      });

      const options = { type: 'commit' as const, target: 'abc123' };
      const result = await gitDiffVisualizer.visualizeDiff('/tmp/not-git', options);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(gitError);
      }
    });

    it('should log debug information with visualization options', async () => {
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: false,
        error: new GitDiffError('Test error', 'TEST_ERROR')
      });

      const options = { type: 'branch' as const, target: 'feature-branch' };
      const visualizationOptions: VisualizationOptions = {
        outputFormat: 'line-by-line',
        colorScheme: 'light'
      };

      await gitDiffVisualizer.visualizeDiff('/workspace/showme-mcp', options, visualizationOptions);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting diff visualization',
        expect.objectContaining({
          workingPath: '/workspace/showme-mcp',
          diffType: 'branch',
          target: 'feature-branch',
          visualizationFormat: 'line-by-line'
        })
      );
    });

    it('should use default visualization options when none provided', async () => {
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: true,
        value: mockDiffResult
      });

      const options = { type: 'unstaged' as const };
      const result = await gitDiffVisualizer.visualizeDiff('/workspace/showme-mcp', options);

      expect(result.ok).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting diff visualization',
        expect.objectContaining({
          visualizationFormat: 'line-by-line'
        })
      );
    });
  });

  describe('convenience methods', () => {
    beforeEach(() => {
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: true,
        value: mockDiffResult
      });
    });

    it('should visualize staged diff', async () => {
      const spy = vi.spyOn(gitDiffVisualizer, 'visualizeDiff').mockResolvedValue({
        ok: true,
        value: {} as DiffVisualizationResult
      });

      const visualizationOptions: VisualizationOptions = { outputFormat: 'side-by-side' };
      await gitDiffVisualizer.visualizeStagedDiff(
        '/workspace/showme-mcp',
        ['file1.ts'],
        visualizationOptions
      );

      expect(spy).toHaveBeenCalledWith(
        '/workspace/showme-mcp',
        { type: 'staged', paths: ['file1.ts'] },
        visualizationOptions
      );
    });

    it('should visualize unstaged diff', async () => {
      const spy = vi.spyOn(gitDiffVisualizer, 'visualizeDiff').mockResolvedValue({
        ok: true,
        value: {} as DiffVisualizationResult
      });

      await gitDiffVisualizer.visualizeUnstagedDiff('/workspace/showme-mcp');

      expect(spy).toHaveBeenCalledWith(
        '/workspace/showme-mcp',
        { type: 'unstaged' },
        undefined
      );
    });

    it('should visualize commit diff', async () => {
      const spy = vi.spyOn(gitDiffVisualizer, 'visualizeDiff').mockResolvedValue({
        ok: true,
        value: {} as DiffVisualizationResult
      });

      await gitDiffVisualizer.visualizeCommitDiff('/workspace/showme-mcp', 'abc123');

      expect(spy).toHaveBeenCalledWith(
        '/workspace/showme-mcp',
        { type: 'commit', target: 'abc123' },
        undefined
      );
    });

    it('should visualize branch diff', async () => {
      const spy = vi.spyOn(gitDiffVisualizer, 'visualizeDiff').mockResolvedValue({
        ok: true,
        value: {} as DiffVisualizationResult
      });

      const visualizationOptions: VisualizationOptions = { 
        outputFormat: 'line-by-line',
        drawFileList: false
      };
      
      await gitDiffVisualizer.visualizeBranchDiff(
        '/workspace/showme-mcp',
        'main',
        ['src/'],
        visualizationOptions
      );

      expect(spy).toHaveBeenCalledWith(
        '/workspace/showme-mcp',
        { type: 'branch', target: 'main', paths: ['src/'] },
        visualizationOptions
      );
    });
  });

  describe('HTML document generation', () => {
    it('should generate complete HTML document with proper structure', async () => {
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: true,
        value: mockDiffResult
      });

      const result = await gitDiffVisualizer.visualizeDiff('/workspace/showme-mcp', { type: 'unstaged' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const html = result.value.html;
        
        // Check HTML structure
        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('<html lang="en">');
        expect(html).toContain('<head>');
        expect(html).toContain('<body>');
        expect(html).toContain('</html>');
        
        // Check title
        expect(html).toContain('<title>Git Diff: unstaged</title>');
        
        // Check metadata
        expect(html).toContain('Repository: /workspace/showme-mcp');
        expect(html).toContain('Branch: main');
        expect(html).toContain('Files: 1');
        expect(html).toContain('+5');
        expect(html).toContain('-2');
        
        // Check styles are included
        expect(html).toContain('<style>');
        expect(html).toContain('font-family:');
        expect(html).toContain('@media (prefers-color-scheme: dark)');
        expect(html).toContain('@media (max-width: 768px)');
        
        // Check JavaScript is included
        expect(html).toContain('<script>');
        expect(html).toContain('keydown');
        
        // Check diff2html content is included
        expect(html).toContain('d2h-wrapper');
        expect(html).toContain('Mock diff content');
      }
    });

    it('should include target in title when provided', async () => {
      const diffResultWithTarget = {
        ...mockDiffResult,
        type: 'commit' as const,
        target: 'abc123'
      };
      
      mockDiffGenerator.generateDiff.mockResolvedValue({
        ok: true,
        value: diffResultWithTarget
      });

      const result = await gitDiffVisualizer.visualizeDiff(
        '/workspace/showme-mcp',
        { type: 'commit', target: 'abc123' }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.html).toContain('<title>Git Diff: commit (abc123)</title>');
      }
    });
  });

  describe('GitDiffVisualizationError', () => {
    it('should create error with code and message', () => {
      const error = new GitDiffVisualizationError('Test error', 'TEST_ERROR');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('GitDiffVisualizationError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('integration test with real diff', () => {
    it('should handle real diff visualization', async () => {
      // This is an integration test - use real GitDiffGenerator
      const realVisualizer = GitDiffVisualizer.create(mockLogger);
      
      const result = await realVisualizer.visualizeUnstagedDiff('/workspace/showme-mcp');
      
      // Should succeed even if there are no unstaged changes
      expect(result.ok).toBe(true);
      
      if (result.ok) {
        expect(result.value.diffResult.repository.gitRoot).toBe('/workspace/showme-mcp');
        expect(result.value.html).toContain('<!DOCTYPE html>');
        expect(result.value.html).toContain('Git Diff: unstaged');
        expect(result.value.stats.htmlLength).toBeGreaterThan(0);
        expect(result.value.stats.renderTime).toBeGreaterThanOrEqual(0);
      }
    });
  });
});