import { html } from 'diff2html';
import { ConsoleLogger } from './logger.js';
import { GitDiffGenerator } from './git-diff-generator.js';
/**
 * Git diff visualization errors
 */
export class GitDiffVisualizationError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'GitDiffVisualizationError';
    }
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
    diffGenerator;
    logger;
    constructor(diffGenerator, logger = new ConsoleLogger()) {
        this.diffGenerator = diffGenerator;
        this.logger = logger;
    }
    /**
     * Factory method for creating GitDiffVisualizer instances
     */
    static create(logger) {
        const actualLogger = logger || new ConsoleLogger();
        const diffGenerator = GitDiffGenerator.create(actualLogger);
        return new GitDiffVisualizer(diffGenerator, actualLogger);
    }
    /**
     * Visualize git diff with HTML output
     */
    async visualizeDiff(workingPath, options, visualizationOptions) {
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
        const result = {
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
    async renderDiffToHtml(diffResult, visualizationOptions) {
        const renderStart = performance.now();
        try {
            const options = {
                outputFormat: visualizationOptions?.outputFormat || 'side-by-side',
                colorScheme: visualizationOptions?.colorScheme || 'dark',
                matching: visualizationOptions?.matching || 'lines',
                maxLineLengthHighlight: visualizationOptions?.maxLineLengthHighlight || 10000,
                drawFileList: visualizationOptions?.drawFileList ?? true,
                fileListToggle: visualizationOptions?.fileListToggle ?? true,
                fileListStartVisible: visualizationOptions?.fileListStartVisible ?? true,
                fileContentToggle: visualizationOptions?.fileContentToggle ?? true,
                highlight: visualizationOptions?.highlight ?? true,
                synchronisedScroll: visualizationOptions?.synchronisedScroll ?? true,
                compiledTemplates: visualizationOptions?.compiledTemplates || {}
            };
            this.logger.debug('Rendering diff to HTML', {
                rawDiffLength: diffResult.raw.length,
                filesCount: diffResult.files.length,
                outputFormat: options.outputFormat
            });
            // Use diff2html to render the raw diff
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const diffHtml = html(diffResult.raw, options);
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
        }
        catch (error) {
            const renderTime = performance.now() - renderStart;
            this.logger.error('Failed to render diff to HTML', {
                renderTime,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                ok: false,
                error: new GitDiffVisualizationError(`HTML rendering failed: ${error instanceof Error ? error.message : String(error)}`, 'HTML_RENDER_ERROR')
            };
        }
    }
    /**
     * Escape HTML to prevent XSS injection
     */
    escapeHtml(text) {
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
    buildDiffHtmlDocument(diffResult, diffHtml) {
        const title = this.escapeHtml(`Git Diff: ${diffResult.type}${diffResult.target ? ` (${diffResult.target})` : ''}`);
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html@3.4.47/bundles/css/diff2html.min.css">
  <style>
    /* GitHub Dark theme for consistent styling */
    :root {
      --bg-primary: #0d1117;
      --bg-secondary: #161b22;
      --bg-overlay: #21262d;
      --bg-hover: #30363d;
      --text-primary: #f0f6fc;
      --text-secondary: #8b949e;
      --text-muted: #6e7681;
      --border-default: #30363d;
      --accent-green: #3fb950;
      --accent-red: #f85149;
      --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', 'Courier New', monospace;
    }

    body {
      font-family: var(--font-mono);
      line-height: 1.5;
      margin: 0;
      padding: 20px;
      background-color: var(--bg-primary);
      color: var(--text-primary);
    }
    
    .diff-header {
      background: var(--bg-secondary);
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      border: 1px solid var(--border-default);
    }
    
    .diff-header h1 {
      margin: 0 0 15px 0;
      font-size: 24px;
      color: var(--text-primary);
    }
    
    .diff-stats {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 14px;
      color: var(--text-secondary);
    }
    
    .stat-item {
      background: var(--bg-overlay);
      padding: 5px 12px;
      border-radius: 4px;
      color: var(--text-secondary);
    }
    
    .stat-additions {
      background: rgba(63, 185, 80, 0.15);
      color: var(--accent-green);
      border: 1px solid rgba(63, 185, 80, 0.3);
    }
    
    .stat-deletions {
      background: rgba(248, 81, 73, 0.15);
      color: var(--accent-red);
      border: 1px solid rgba(248, 81, 73, 0.3);
    }
    
    /* Override diff2html styles for GitHub Dark theme */
    .d2h-wrapper {
      background: var(--bg-secondary) !important;
      border-radius: 8px;
      border: 1px solid var(--border-default);
      overflow: hidden;
    }
    
    .d2h-file-header {
      background: var(--bg-overlay) !important;
      border-bottom: 1px solid var(--border-default) !important;
      padding: 12px 16px;
      font-weight: 600;
      color: var(--text-primary) !important;
      font-family: var(--font-mono);
    }
    
    .d2h-code-line {
      font-size: 13px;
      line-height: 1.4;
      background: var(--bg-secondary) !important;
      color: var(--text-primary) !important;
    }

    .d2h-code-side-line {
      background: var(--bg-secondary) !important;
      color: var(--text-primary) !important;
    }

    .d2h-ins {
      background: rgba(63, 185, 80, 0.15) !important;
      border-color: rgba(63, 185, 80, 0.3) !important;
    }

    .d2h-del {
      background: rgba(248, 81, 73, 0.15) !important;
      border-color: rgba(248, 81, 73, 0.3) !important;
    }

    .d2h-code-line-prefix {
      color: var(--text-secondary) !important;
    }

    .d2h-file-side-diff {
      border: 1px solid var(--border-default) !important;
    }

    .d2h-file-list-wrapper {
      background: var(--bg-secondary) !important;
      border: 1px solid var(--border-default) !important;
    }

    .d2h-file-list-header {
      background: var(--bg-overlay) !important;
      color: var(--text-primary) !important;
    }

    .d2h-file-list-line {
      color: var(--text-primary) !important;
    }

    .d2h-file-list-line:hover {
      background: var(--bg-hover) !important;
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
    async visualizeStagedDiff(workingPath, paths, visualizationOptions) {
        return this.visualizeDiff(workingPath, { type: 'staged', ...(paths ? { paths } : {}) }, visualizationOptions);
    }
    /**
     * Visualize unstaged changes
     */
    async visualizeUnstagedDiff(workingPath, paths, visualizationOptions) {
        return this.visualizeDiff(workingPath, { type: 'unstaged', ...(paths ? { paths } : {}) }, visualizationOptions);
    }
    /**
     * Visualize commit diff
     */
    async visualizeCommitDiff(workingPath, commitHash, paths, visualizationOptions) {
        return this.visualizeDiff(workingPath, {
            type: 'commit',
            ...(commitHash ? { target: commitHash } : {}),
            ...(paths ? { paths } : {})
        }, visualizationOptions);
    }
    /**
     * Visualize branch diff
     */
    async visualizeBranchDiff(workingPath, baseBranch, paths, visualizationOptions) {
        return this.visualizeDiff(workingPath, {
            type: 'branch',
            ...(baseBranch ? { target: baseBranch } : {}),
            ...(paths ? { paths } : {})
        }, visualizationOptions);
    }
}
