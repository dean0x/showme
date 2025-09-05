import { html } from 'diff2html';
import { type Result } from './path-validator.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { GitDiffGenerator, type DiffResult, type DiffOptions, GitDiffError } from './git-diff-generator.js';
import { GitOperationError } from './error-handling.js';

declare const performance: { now(): number };

/**
 * Git diff visualization errors
 */
export class GitDiffVisualizationError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'GitDiffVisualizationError';
  }
}

/**
 * Visualization options for diff2html
 */
export interface VisualizationOptions {
  outputFormat?: 'line-by-line' | 'side-by-side';
  colorScheme?: 'dark' | 'light';
  matching?: 'lines' | 'words' | 'none';
  maxLineLengthHighlight?: number;
  drawFileList?: boolean;
  fileListToggle?: boolean;
  fileListStartVisible?: boolean;
  fileContentToggle?: boolean;
  highlight?: boolean;
  synchronisedScroll?: boolean;
  compiledTemplates?: object;
}

/**
 * Complete diff visualization result
 */
export interface DiffVisualizationResult {
  diffResult: DiffResult;
  html: string;
  stats: {
    renderTime: number;
    htmlLength: number;
  };
}

/**
 * Git diff visualizer using diff2html
 * Follows engineering principles:
 * - Uses Result types for error handling
 * - Accepts Logger and GitDiffGenerator dependency injection
 * - Structured logging with context
 * - Performance monitoring
 */
export class GitDiffVisualizer {
  constructor(
    private readonly diffGenerator: GitDiffGenerator,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Factory method for creating GitDiffVisualizer instances
   */
  static create(logger?: Logger): GitDiffVisualizer {
    const actualLogger = logger || new ConsoleLogger();
    const diffGenerator = GitDiffGenerator.create(actualLogger);
    return new GitDiffVisualizer(diffGenerator, actualLogger);
  }

  /**
   * Visualize git diff with HTML output
   */
  async visualizeDiff(
    workingPath: string,
    options: DiffOptions,
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<DiffVisualizationResult, GitDiffError | GitOperationError | GitDiffVisualizationError>> {
    const startTime = performance.now();
    
    this.logger.debug('Starting diff visualization', {
      workingPath,
      diffType: options.type,
      target: options.target,
      visualizationFormat: visualizationOptions?.outputFormat || 'line-by-line',
      timestamp: new Date().toISOString()
    });

    // Generate the diff first
    const diffResult = await this.diffGenerator.generateDiff(workingPath, options);
    if (!diffResult.ok) {
      return { ok: false, error: diffResult.error };
    }

    // Render the diff to HTML
    const htmlResult = await this.renderDiffToHtml(diffResult.value, visualizationOptions);
    if (!htmlResult.ok) {
      return { ok: false, error: htmlResult.error };
    }

    const result: DiffVisualizationResult = {
      diffResult: diffResult.value,
      html: htmlResult.value.html,
      stats: htmlResult.value.stats
    };

    const duration = performance.now() - startTime;
    this.logger.info('Diff visualization completed', {
      gitRoot: diffResult.value.repository.gitRoot,
      diffType: options.type,
      filesChanged: diffResult.value.stats.filesChanged,
      htmlLength: htmlResult.value.stats.htmlLength,
      renderTime: htmlResult.value.stats.renderTime,
      totalDuration: duration
    });

    return { ok: true, value: result };
  }

  /**
   * Render diff result to HTML using diff2html
   */
  private async renderDiffToHtml(
    diffResult: DiffResult,
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<{ html: string; stats: { renderTime: number; htmlLength: number } }, GitDiffVisualizationError>> {
    const renderStart = performance.now();
    
    try {
      const options = {
        outputFormat: visualizationOptions?.outputFormat || 'line-by-line',
        colorScheme: visualizationOptions?.colorScheme || 'light',
        matching: visualizationOptions?.matching || 'lines',
        maxLineLengthHighlight: visualizationOptions?.maxLineLengthHighlight || 10000,
        drawFileList: visualizationOptions?.drawFileList ?? true,
        fileListToggle: visualizationOptions?.fileListToggle ?? true,
        fileListStartVisible: visualizationOptions?.fileListStartVisible ?? true,
        fileContentToggle: visualizationOptions?.fileContentToggle ?? true,
        highlight: visualizationOptions?.highlight ?? true,
        synchronisedScroll: visualizationOptions?.synchronisedScroll ?? true,
        compiledTemplates: visualizationOptions?.compiledTemplates || {}
      } as const;

      this.logger.debug('Rendering diff to HTML', {
        rawDiffLength: diffResult.raw.length,
        filesCount: diffResult.files.length,
        outputFormat: options.outputFormat
      });

      // Use diff2html to render the raw diff
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diffHtml = html(diffResult.raw, options as any);
      
      // Wrap in a complete HTML document with metadata
      const completeHtml = this.buildDiffHtmlDocument(diffResult, diffHtml);
      
      const renderTime = performance.now() - renderStart;
      
      return {
        ok: true,
        value: {
          html: completeHtml,
          stats: {
            renderTime,
            htmlLength: completeHtml.length
          }
        }
      };

    } catch (error) {
      const renderTime = performance.now() - renderStart;
      this.logger.error('Failed to render diff to HTML', {
        renderTime,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        ok: false,
        error: new GitDiffVisualizationError(
          `HTML rendering failed: ${error instanceof Error ? error.message : String(error)}`,
          'HTML_RENDER_ERROR'
        )
      };
    }
  }

  /**
   * Escape HTML to prevent XSS injection
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build complete HTML document for diff visualization
   */
  private buildDiffHtmlDocument(diffResult: DiffResult, diffHtml: string): string {
    const title = this.escapeHtml(`Git Diff: ${diffResult.type}${diffResult.target ? ` (${diffResult.target})` : ''}`);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* Custom styles for better diff visualization */
    body {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
      line-height: 1.5;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    
    .diff-header {
      background: #fff;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .diff-header h1 {
      margin: 0 0 15px 0;
      font-size: 24px;
      color: #2c3e50;
    }
    
    .diff-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #666;
    }
    
    .stat-item {
      background: #f1f3f4;
      padding: 5px 12px;
      border-radius: 4px;
    }
    
    .stat-additions {
      background: #d4edda;
      color: #155724;
    }
    
    .stat-deletions {
      background: #f8d7da;
      color: #721c24;
    }
    
    /* Enhance diff2html styles */
    .d2h-wrapper {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .d2h-file-header {
      background: #f6f8fa;
      border-bottom: 1px solid #e1e4e8;
      padding: 10px 15px;
      font-weight: 600;
    }
    
    .d2h-code-line {
      font-size: 13px;
      line-height: 1.4;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #1a1a1a;
        color: #e1e1e1;
      }
      
      .diff-header {
        background: #2d2d2d;
        color: #e1e1e1;
      }
      
      .diff-header h1 {
        color: #ffffff;
      }
      
      .d2h-wrapper {
        background: #2d2d2d;
      }
      
      .d2h-file-header {
        background: #404040;
        border-bottom-color: #555;
        color: #e1e1e1;
      }
    }
    
    /* Mobile responsive */
    @media (max-width: 768px) {
      body {
        padding: 10px;
      }
      
      .diff-header {
        padding: 15px;
      }
      
      .diff-stats {
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <div class="diff-header">
    <h1>${title}</h1>
    <div class="diff-stats">
      <div class="stat-item">Repository: ${this.escapeHtml(diffResult.repository.gitRoot)}</div>
      <div class="stat-item">Branch: ${this.escapeHtml(diffResult.repository.currentBranch)}</div>
      <div class="stat-item">Files: ${diffResult.stats.filesChanged}</div>
      <div class="stat-item stat-additions">+${diffResult.stats.additions}</div>
      <div class="stat-item stat-deletions">-${diffResult.stats.deletions}</div>
    </div>
  </div>
  
  <div class="diff-content">
    ${diffHtml}
  </div>
  
  <script>
    // Add keyboard shortcuts for navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'f' && e.ctrlKey) {
        e.preventDefault();
        // Toggle file list if available
        const fileList = document.querySelector('.d2h-file-list');
        if (fileList) {
          fileList.style.display = fileList.style.display === 'none' ? 'block' : 'none';
        }
      }
    });
    
    // Add smooth scrolling to file anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Visualize staged changes
   */
  async visualizeStagedDiff(
    workingPath: string,
    paths?: string[],
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<DiffVisualizationResult, GitDiffError | GitOperationError | GitDiffVisualizationError>> {
    return this.visualizeDiff(workingPath, { type: 'staged', ...(paths ? { paths } : {}) }, visualizationOptions);
  }

  /**
   * Visualize unstaged changes
   */
  async visualizeUnstagedDiff(
    workingPath: string,
    paths?: string[],
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<DiffVisualizationResult, GitDiffError | GitOperationError | GitDiffVisualizationError>> {
    return this.visualizeDiff(workingPath, { type: 'unstaged', ...(paths ? { paths } : {}) }, visualizationOptions);
  }

  /**
   * Visualize commit diff
   */
  async visualizeCommitDiff(
    workingPath: string,
    commitHash?: string,
    paths?: string[],
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<DiffVisualizationResult, GitDiffError | GitOperationError | GitDiffVisualizationError>> {
    return this.visualizeDiff(
      workingPath, 
      { 
        type: 'commit', 
        ...(commitHash ? { target: commitHash } : {}),
        ...(paths ? { paths } : {})
      }, 
      visualizationOptions
    );
  }

  /**
   * Visualize branch diff
   */
  async visualizeBranchDiff(
    workingPath: string,
    baseBranch?: string,
    paths?: string[],
    visualizationOptions?: VisualizationOptions
  ): Promise<Result<DiffVisualizationResult, GitDiffError | GitOperationError | GitDiffVisualizationError>> {
    return this.visualizeDiff(
      workingPath,
      {
        type: 'branch',
        ...(baseBranch ? { target: baseBranch } : {}),
        ...(paths ? { paths } : {})
      },
      visualizationOptions
    );
  }
}