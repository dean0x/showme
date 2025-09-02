# ShowMe MCP Server - Utility Class Implementations

## HTMLGenerator Class

**File**: `src/utils/html-generator.ts`

```typescript
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

export interface FileViewOptions {
  filename: string;
  filepath: string;
  content: string;
  language: string;
  lineHighlight?: number;
  fileSize: number;
  lastModified: Date;
}

export class HTMLGenerator {
  private highlighter: Highlighter | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.highlighter = await createHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript', 'typescript', 'jsx', 'tsx',
        'python', 'java', 'cpp', 'c', 'html', 'css', 'scss',
        'json', 'yaml', 'toml', 'xml', 'markdown',
        'sql', 'bash', 'go', 'rust', 'php', 'ruby'
      ] as BundledLanguage[]
    });

    this.initialized = true;
  }

  async generateFileView(options: FileViewOptions): Promise<string> {
    await this.initialize();

    const {
      filename,
      filepath,
      content,
      language,
      lineHighlight,
      fileSize,
      lastModified
    } = options;

    // Handle markdown files specially
    if (language === 'markdown') {
      return this.generateMarkdownView(options);
    }

    // Generate syntax highlighted code
    const highlightedCode = this.highlighter!.codeToHtml(content, {
      lang: language as BundledLanguage,
      theme: 'github-dark',
      transformers: [
        {
          name: 'line-highlight',
          line(node, line) {
            if (lineHighlight && line === lineHighlight) {
              this.addClassToHast(node, 'line-highlight');
            }
          }
        }
      ]
    });

    return this.buildHTMLTemplate({
      title: `ShowMe: ${filename}`,
      filename,
      filepath,
      fileSize: this.formatFileSize(fileSize),
      lastModified: lastModified.toLocaleString(),
      content: highlightedCode,
      styles: this.getFileViewStyles(),
      scripts: lineHighlight ? this.getScrollScript(lineHighlight) : ''
    });
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<string> {
    const { marked } = await import('marked');
    
    // Configure marked for syntax highlighting
    marked.setOptions({
      highlight: (code, lang) => {
        if (!this.highlighter || !lang) return code;
        
        try {
          return this.highlighter.codeToHtml(code, {
            lang: lang as BundledLanguage,
            theme: 'github-dark'
          });
        } catch {
          return code;
        }
      }
    });

    const htmlContent = marked(options.content);

    return this.buildHTMLTemplate({
      title: `ShowMe: ${options.filename}`,
      filename: options.filename,
      filepath: options.filepath,
      fileSize: this.formatFileSize(options.fileSize),
      lastModified: options.lastModified.toLocaleString(),
      content: `<div class="markdown-content">${htmlContent}</div>`,
      styles: this.getMarkdownStyles(),
      scripts: options.lineHighlight ? this.getScrollScript(options.lineHighlight) : ''
    });
  }

  private buildHTMLTemplate(params: {
    title: string;
    filename: string;
    filepath: string;
    fileSize: string;
    lastModified: string;
    content: string;
    styles: string;
    scripts: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
    <style>${params.styles}</style>
</head>
<body>
    <div class="container">
        <header class="metadata">
            <h1>${params.filename}</h1>
            <div class="file-info">
                <span class="path">Path: ${params.filepath}</span>
                <span class="size">Size: ${params.fileSize}</span>
                <span class="modified">Modified: ${params.lastModified}</span>
            </div>
        </header>
        <main class="content">
            ${params.content}
        </main>
    </div>
    ${params.scripts}
</body>
</html>`;
  }

  private getFileViewStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        background-color: #0d1117;
        color: #e6edf3;
        line-height: 1.6;
      }
      
      .container {
        max-width: 100%;
        min-height: 100vh;
      }
      
      .metadata {
        background-color: #161b22;
        border-bottom: 1px solid #21262d;
        padding: 1rem 2rem;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .metadata h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f0f6fc;
        margin-bottom: 0.5rem;
      }
      
      .file-info {
        display: flex;
        gap: 2rem;
        font-size: 0.875rem;
        color: #7d8590;
      }
      
      .file-info span {
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }
      
      .content {
        padding: 1rem 2rem;
      }
      
      .content pre {
        margin: 0;
        background-color: transparent !important;
        border-radius: 8px;
        overflow-x: auto;
      }
      
      .line-highlight {
        background-color: #ffd60a33 !important;
        border-left: 3px solid #ffd60a;
        padding-left: 0.5rem !important;
      }
      
      /* Responsive design */
      @media (max-width: 768px) {
        .metadata {
          padding: 1rem;
        }
        
        .content {
          padding: 1rem;
        }
        
        .file-info {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    `;
  }

  private getMarkdownStyles(): string {
    return `
      ${this.getFileViewStyles()}
      
      .markdown-content {
        max-width: 80ch;
        margin: 0 auto;
      }
      
      .markdown-content h1,
      .markdown-content h2,
      .markdown-content h3,
      .markdown-content h4,
      .markdown-content h5,
      .markdown-content h6 {
        margin-top: 2rem;
        margin-bottom: 1rem;
        color: #f0f6fc;
      }
      
      .markdown-content h1 {
        font-size: 2rem;
        border-bottom: 1px solid #21262d;
        padding-bottom: 0.5rem;
      }
      
      .markdown-content h2 {
        font-size: 1.5rem;
        border-bottom: 1px solid #21262d;
        padding-bottom: 0.25rem;
      }
      
      .markdown-content p {
        margin-bottom: 1rem;
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin-bottom: 1rem;
        padding-left: 2rem;
      }
      
      .markdown-content blockquote {
        border-left: 4px solid #30363d;
        padding-left: 1rem;
        margin: 1rem 0;
        color: #7d8590;
      }
      
      .markdown-content code {
        background-color: #282c34;
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
        font-size: 0.875rem;
      }
      
      .markdown-content pre {
        background-color: #0d1117 !important;
        border: 1px solid #21262d;
        border-radius: 8px;
        padding: 1rem;
        overflow-x: auto;
        margin: 1rem 0;
      }
    `;
  }

  private getScrollScript(lineNumber: number): string {
    return `
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const targetLine = document.querySelector('.line-highlight');
          if (targetLine) {
            setTimeout(() => {
              targetLine.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
              });
            }, 500);
          }
        });
      </script>
    `;
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }
}
```

## DiffRenderer Class

**File**: `src/utils/diff-renderer.ts`

```typescript
import { html } from 'diff2html';
import { parse } from 'diff2html/lib/diff-parser.js';

export interface DiffRenderOptions {
  base: string;
  target: string;
  files: string[];
}

export class DiffRenderer {
  async renderDiff(diffOutput: string, options: DiffRenderOptions): Promise<string> {
    try {
      // Parse the diff output
      const parsedDiff = parse(diffOutput);
      
      // Generate HTML with diff2html
      const diffHtml = html(parsedDiff, {
        drawFileList: true,
        fileListToggle: true,
        fileListStartVisible: true,
        fileContentToggle: true,
        matching: 'lines',
        outputFormat: 'side-by-side',
        synchronisedScroll: true,
        highlight: true,
        renderNothingWhenEmpty: false
      });

      // Calculate statistics
      const stats = this.calculateDiffStats(parsedDiff);

      return this.buildDiffHTMLTemplate({
        title: `Git Diff: ${options.base}..${options.target}`,
        diffHtml,
        stats,
        options,
        styles: this.getDiffStyles(),
        scripts: this.getDiffScripts()
      });

    } catch (error) {
      throw new Error(`Failed to render diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private calculateDiffStats(parsedDiff: any[]): {
    files: number;
    insertions: number;
    deletions: number;
    modifications: number;
  } {
    let files = 0;
    let insertions = 0;
    let deletions = 0;
    let modifications = 0;

    for (const file of parsedDiff) {
      files++;
      
      for (const block of file.blocks) {
        for (const line of block.lines) {
          switch (line.type) {
            case 'insert':
              insertions++;
              break;
            case 'delete':
              deletions++;
              break;
            case 'context':
              // Context lines don't count as changes
              break;
          }
        }
      }

      if (file.isNew) {
        // New file
      } else if (file.isDeleted) {
        // Deleted file  
      } else {
        modifications++;
      }
    }

    return { files, insertions, deletions, modifications };
  }

  private buildDiffHTMLTemplate(params: {
    title: string;
    diffHtml: string;
    stats: any;
    options: DiffRenderOptions;
    styles: string;
    scripts: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${params.title}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html/bundles/css/diff2html.min.css">
    <style>${params.styles}</style>
</head>
<body>
    <div class="container">
        <header class="diff-header">
            <h1>Git Diff</h1>
            <div class="diff-meta">
                <div class="comparison">
                    <span class="base">${params.options.base}</span>
                    <span class="separator">⟷</span>
                    <span class="target">${params.options.target}</span>
                </div>
                <div class="stats">
                    <span class="files">${params.stats.files} files</span>
                    <span class="insertions">+${params.stats.insertions}</span>
                    <span class="deletions">-${params.stats.deletions}</span>
                </div>
            </div>
        </header>
        
        <main class="diff-content">
            ${params.diffHtml}
        </main>
        
        <div class="toolbar">
            <button id="toggle-view" class="toolbar-btn">Switch to Unified View</button>
            <button id="toggle-whitespace" class="toolbar-btn">Toggle Whitespace</button>
            <button id="collapse-all" class="toolbar-btn">Collapse All</button>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/diff2html/bundles/js/diff2html-ui.min.js"></script>
    <script>${params.scripts}</script>
</body>
</html>`;
  }

  private getDiffStyles(): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        background-color: #0d1117;
        color: #e6edf3;
        line-height: 1.6;
      }
      
      .container {
        max-width: 100%;
        min-height: 100vh;
      }
      
      .diff-header {
        background-color: #161b22;
        border-bottom: 1px solid #21262d;
        padding: 1rem 2rem;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .diff-header h1 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #f0f6fc;
        margin-bottom: 0.5rem;
      }
      
      .diff-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
      }
      
      .comparison {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
        font-size: 0.875rem;
      }
      
      .base, .target {
        background-color: #21262d;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        color: #79c0ff;
      }
      
      .separator {
        color: #7d8590;
      }
      
      .stats {
        display: flex;
        gap: 1rem;
        font-size: 0.875rem;
      }
      
      .files {
        color: #f0f6fc;
      }
      
      .insertions {
        color: #3fb950;
        font-weight: 600;
      }
      
      .deletions {
        color: #f85149;
        font-weight: 600;
      }
      
      .diff-content {
        padding: 1rem;
        background-color: #0d1117;
      }
      
      .toolbar {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        gap: 0.5rem;
        background-color: #21262d;
        padding: 0.5rem;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }
      
      .toolbar-btn {
        background-color: #238636;
        color: #fff;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .toolbar-btn:hover {
        background-color: #2ea043;
      }
      
      /* Override diff2html styles for dark theme */
      .d2h-wrapper {
        background-color: transparent !important;
      }
      
      .d2h-file-header {
        background-color: #21262d !important;
        border-color: #30363d !important;
        color: #f0f6fc !important;
      }
      
      .d2h-file-name {
        color: #79c0ff !important;
      }
      
      .d2h-code-side-line {
        background-color: #0d1117 !important;
        border-color: #21262d !important;
        color: #e6edf3 !important;
      }
      
      .d2h-ins {
        background-color: #0d4429 !important;
        border-color: #3fb950 !important;
      }
      
      .d2h-del {
        background-color: #67060c !important;
        border-color: #f85149 !important;
      }
      
      .d2h-info {
        background-color: #1f2937 !important;
        color: #7d8590 !important;
      }
      
      @media (max-width: 768px) {
        .diff-header {
          padding: 1rem;
        }
        
        .diff-meta {
          flex-direction: column;
          align-items: flex-start;
        }
        
        .toolbar {
          bottom: 1rem;
          right: 1rem;
          flex-direction: column;
        }
      }
    `;
  }

  private getDiffScripts(): string {
    return `
      document.addEventListener('DOMContentLoaded', function() {
        const targetElement = document.getElementById('d2h-675094');
        const configuration = {
          colorScheme: 'dark',
          drawFileList: true,
          fileListToggle: false,
          fileContentToggle: false,
          matching: 'lines',
          outputFormat: 'side-by-side',
          synchronisedScroll: true,
          highlight: true
        };
        
        if (targetElement) {
          const diff2htmlUi = new Diff2HtmlUI(targetElement, [], configuration);
        }
        
        // Toolbar functionality
        let currentView = 'side-by-side';
        const toggleViewBtn = document.getElementById('toggle-view');
        
        toggleViewBtn?.addEventListener('click', function() {
          currentView = currentView === 'side-by-side' ? 'line-by-line' : 'side-by-side';
          this.textContent = currentView === 'side-by-side' ? 
            'Switch to Unified View' : 'Switch to Side-by-side View';
          location.reload(); // Simplified - in production, you'd update dynamically
        });
        
        // Collapse/expand functionality
        document.getElementById('collapse-all')?.addEventListener('click', function() {
          const fileHeaders = document.querySelectorAll('.d2h-file-header');
          fileHeaders.forEach(header => {
            header.click();
          });
        });
        
        // Whitespace toggle
        document.getElementById('toggle-whitespace')?.addEventListener('click', function() {
          document.body.classList.toggle('hide-whitespace');
        });
      });
    `;
  }
}
```

## PathValidator Class Updates

**File**: `src/utils/path-validator.ts` (Enhanced version)

```typescript
import path from 'path';
import fs from 'fs/promises';

export class PathValidator {
  private workspaceRoot: string;

  constructor(workspaceRoot?: string) {
    this.workspaceRoot = path.resolve(workspaceRoot || process.cwd());
  }

  /**
   * Validates and resolves a file path, ensuring it's within workspace bounds
   */
  validateAndResolve(inputPath: string, mustExist: boolean = true): string {
    // Normalize and resolve path
    const absolutePath = path.resolve(this.workspaceRoot, inputPath);
    
    // Security: Ensure path is within workspace (prevent directory traversal)
    if (!absolutePath.startsWith(this.workspaceRoot)) {
      throw new Error(`Path outside workspace: ${inputPath}`);
    }

    // Security: Additional checks for suspicious patterns
    if (inputPath.includes('..') || inputPath.includes('\0')) {
      throw new Error(`Invalid path containing suspicious characters: ${inputPath}`);
    }

    // Check for absolute paths being passed inappropriately
    if (path.isAbsolute(inputPath) && !inputPath.startsWith(this.workspaceRoot)) {
      throw new Error(`Absolute path not within workspace: ${inputPath}`);
    }

    return absolutePath;
  }

  /**
   * Check if a file exists and is accessible
   */
  async validateFileAccess(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch {
      throw new Error(`File not accessible: ${filePath}`);
    }
  }

  /**
   * Validate multiple file paths at once
   */
  validateMultiplePaths(paths: string[]): string[] {
    return paths.map(p => this.validateAndResolve(p));
  }

  /**
   * Check if path is a git-related file that should be accessible
   */
  isGitPath(filePath: string): boolean {
    const relativePath = path.relative(this.workspaceRoot, filePath);
    return relativePath.startsWith('.git/') || 
           relativePath === '.git' || 
           relativePath.includes('/.git/');
  }

  /**
   * Get relative path from workspace root
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.workspaceRoot, absolutePath);
  }
}
```