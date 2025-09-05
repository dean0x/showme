import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { ThemeSystem } from './theme-system.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { type Result } from './path-validator.js';
import { HTMLGenerationError, ErrorFactory } from './error-handling.js';
import { performanceMonitor } from './performance-monitor.js';


export interface FileViewOptions {
  filename: string;
  filepath: string;
  content: string;
  language: string;
  lineHighlight?: number;
  fileSize: number;
  lastModified: Date;
}

/**
 * Lightweight HTML generator without syntax highlighting
 * For cases that need basic HTML generation without Shiki initialization
 */
export class HTMLGeneratorLite {
  constructor(private readonly logger: Logger = new ConsoleLogger()) {}

  async generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    const {
      filename,
      filepath,
      content,
      language,
      fileSize,
      lastModified,
      lineHighlight
    } = options;

    try {
      this.logger.debug('Starting basic HTML generation', {
        filename,
        language,
        size: content.length,
        hasLineHighlight: !!lineHighlight
      });

      // Handle markdown files specially
      if (language === 'markdown') {
        return await this.generateMarkdownView(options);
      }

      // For other files, generate without syntax highlighting
      const html = this.buildHTMLTemplate({
        filename,
        filepath,
        content: `<pre><code>${this.escapeHtml(content)}</code></pre>`,
        fileSize,
        lastModified,
        lineHighlight
      });

      this.logger.info('Generated basic file view', {
        filename,
        language,
        contentLength: html.length
      });

      return { ok: true, value: html };
    } catch (error) {
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          error instanceof Error ? error.message : String(error),
          'HTML_GENERATION_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    // Basic markdown rendering without syntax highlighting
    const { content, filename, filepath, fileSize, lastModified, lineHighlight } = options;
    
    // Simple markdown to HTML conversion (basic implementation)
    let html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/```[\s\S]*?```/gim, (match) => {
        const code = match.replace(/```(\w+)?\n?/, '').replace(/```$/, '');
        return `<pre><code>${this.escapeHtml(code)}</code></pre>`;
      });

    // Convert remaining lines to paragraphs (basic implementation)
    html = html
      .split('\n\n')
      .map(paragraph => {
        const trimmed = paragraph.trim();
        if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<pre>')) {
          return `<p>${trimmed}</p>`;
        }
        return trimmed;
      })
      .join('\n\n');

    const finalHtml = this.buildHTMLTemplate({
      filename,
      filepath,
      content: html,
      fileSize,
      lastModified,
      lineHighlight
    });

    this.logger.info('Generated markdown view', {
      filename,
      language: 'markdown',
      type: 'markdown'
    });

    return { ok: true, value: finalHtml };
  }

  private buildHTMLTemplate(data: {
    filename: string;
    filepath: string;
    content: string;
    fileSize: number;
    lastModified: Date;
    lineHighlight?: number;
  }): string {
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShowMe: ${data.filename}</title>
    <style>
        ${ThemeSystem.generateBaseStyles()}
        
        .file-content pre {
            margin: 0;
            padding: var(--space-4);
            overflow: auto;
            font-family: var(--font-mono);
            font-size: var(--text-sm);
            line-height: 1.5;
            background: var(--bg-secondary);
            border-radius: var(--space-1);
        }
    </style>
</head>
<body>
    <main class="file-viewer" aria-label="File viewer">
        <header class="file-header" aria-label="File information">
            <h1 class="file-title">${data.filename}</h1>
            <div class="file-meta" aria-label="File metadata">
                <span class="file-path" aria-label="File path">${data.filepath}</span>
                <span class="file-size" aria-label="File size">${this.formatFileSize(data.fileSize)}</span>
                <span class="file-modified" aria-label="Last modified date">${data.lastModified.toLocaleString()}</span>
            </div>
        </header>
        <section class="file-content" aria-label="File content">
            <div class="code-container" aria-label="Code content">
                ${data.content}
            </div>
        </section>
    </main>
</body>
</html>`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  async dispose(): Promise<void> {
    // No resources to dispose in lite version
  }
}

export class HTMLGenerator {
  private constructor(
    private readonly highlighter: Highlighter,
    private readonly logger: Logger
  ) {}

  static async create(logger?: Logger): Promise<Result<HTMLGenerator, HTMLGenerationError>> {
    const actualLogger = logger || new ConsoleLogger();
    
    actualLogger.info('Initializing Shiki highlighter');
    
    try {
      const highlighter = await performanceMonitor.timeAsync(
        'shiki-highlighter-init',
        'html-generation',
        async () => {
          return await createHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: [
              'javascript', 'typescript', 'jsx', 'tsx',
              'python', 'java', 'cpp', 'c', 'html', 'css', 'scss',
              'json', 'yaml', 'toml', 'xml', 'markdown',
              'sql', 'bash', 'go', 'rust', 'php', 'ruby'
            ] as BundledLanguage[]
          });
        },
        {
          languages: 23,
          themes: 2
        }
      );

      actualLogger.info('Shiki highlighter initialized successfully', { 
        languages: highlighter.getLoadedLanguages().length,
        themes: highlighter.getLoadedThemes().length
      });

      // Set performance thresholds
      performanceMonitor.setThreshold({
        operation: 'shiki-highlighter-init',
        warningThreshold: 2000, // 2 seconds
        errorThreshold: 5000    // 5 seconds
      });

      return {
        ok: true,
        value: new HTMLGenerator(highlighter, actualLogger)
      };
    } catch (error) {
      actualLogger.error('Failed to initialize Shiki highlighter', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          `Failed to initialize Shiki highlighter: ${error instanceof Error ? error.message : String(error)}`,
          'HIGHLIGHTER_INIT_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  async dispose(): Promise<void> {
    if (this.highlighter) {
      try {
        await this.highlighter.dispose();
        this.logger.info('HTMLGenerator resources disposed successfully');
      } catch (error) {
        this.logger.error('Error disposing HTMLGenerator resources', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  async generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    const {
      filename,
      content,
      language,
      lineHighlight
    } = options;

    return await performanceMonitor.timeAsync(
      'html-file-view-generation',
      'html-generation',
      async () => {
        this.logger.debug('Starting file view generation', {
          filename,
          language,
          size: content.length,
          hasLineHighlight: !!lineHighlight
        });

        // Handle markdown files specially
        if (language === 'markdown') {
          const result = await this.generateMarkdownView(options);
          
          if (!result.ok) {
            return result;
          }
          
          this.logger.info('Generated file view', {
            filename,
            language,
            type: 'markdown'
          });
          
          return result;
        }

        return await this.generateCodeView(options);
      },
      {
        filename,
        language,
        contentSize: content.length,
        hasLineHighlight: !!lineHighlight
      }
    );
  }

  private async generateCodeView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    const {
      filename,
      filepath,
      content,
      language,
      lineHighlight,
      fileSize,
      lastModified
    } = options;

    try {

      // Generate syntax highlighted code with error handling and performance monitoring
      const highlightedCode = await performanceMonitor.timeAsync(
        'syntax-highlighting',
        'html-generation',
        async () => {
          if (!this.highlighter) {
            this.logger.warn('No highlighter available, generating plain HTML', { filename, language });
            return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
          } else {
            try {
              return this.highlighter.codeToHtml(content, {
                lang: language as BundledLanguage,
                theme: 'github-dark',
                transformers: lineHighlight ? [
                  {
                    name: 'line-highlight',
                    line(node: {properties?: Record<string, unknown>}, line: number): void {
                      if (line === lineHighlight) {
                        node.properties = { 
                          ...node.properties, 
                          class: `${node.properties?.class || ''} line-highlight`.trim() 
                        };
                      }
                    }
                  }
                ] : []
              });
            } catch (highlightError) {
              this.logger.error('Syntax highlighting failed', {
                filename,
                language,
                error: highlightError instanceof Error ? highlightError.message : String(highlightError)
              });
              
              // Fallback to plain HTML
              return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
            }
          }
        },
        {
          filename,
          language,
          contentSize: content.length,
          hasHighlighter: !!this.highlighter
        }
      );

      const result = performanceMonitor.time(
        'html-template-build',
        'html-generation',
        () => {
          return this.buildHTMLTemplate({
            title: `ShowMe: ${filename}`,
            filename,
            filepath,
            fileSize: this.formatFileSize(fileSize),
            lastModified: lastModified.toLocaleString(),
            content: highlightedCode,
            styles: this.getFileViewStyles(),
            scripts: lineHighlight ? this.getScrollScript() : ''
          });
        },
        {
          filename,
          hasLineHighlight: !!lineHighlight,
          contentLength: highlightedCode.length
        }
      );

      this.logger.info('Generated file view', {
        filename,
        language,
        contentLength: result.length
      });

      return {
        ok: true,
        value: result
      };
    } catch (error) {
      this.logger.error('Failed to generate file view', {
        filename,
        language,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          `Failed to generate file view: ${error instanceof Error ? error.message : String(error)}`,
          'GENERATION_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    try {
      const { marked } = await import('marked');
      
      // Simple markdown processing without complex syntax highlighting for now
      // This avoids API compatibility issues with marked
      const htmlContent = marked(options.content);

      const result = this.buildHTMLTemplate({
        title: `ShowMe: ${options.filename}`,
        filename: options.filename,
        filepath: options.filepath,
        fileSize: this.formatFileSize(options.fileSize),
        lastModified: options.lastModified.toLocaleString(),
        content: `<div class="markdown-content">${htmlContent}</div>`,
        styles: this.getMarkdownStyles(),
        scripts: options.lineHighlight ? this.getScrollScript() : ''
      });

      return {
        ok: true,
        value: result
      };
    } catch (error) {
      this.logger.error('Markdown processing failed', {
        filename: options.filename,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to plain text
      const fallbackResult = this.buildHTMLTemplate({
        title: `ShowMe: ${options.filename}`,
        filename: options.filename,
        filepath: options.filepath,
        fileSize: this.formatFileSize(options.fileSize),
        lastModified: options.lastModified.toLocaleString(),
        content: `<div class="markdown-content"><pre>${this.escapeHtml(options.content)}</pre></div>`,
        styles: this.getMarkdownStyles(),
        scripts: options.lineHighlight ? this.getScrollScript() : ''
      });

      return {
        ok: true,
        value: fallbackResult
      };
    }
  }

  private escapeHtml(content: string): string {
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    <div class="file-viewer">
        <header class="file-header" aria-label="File information">
            <h1 class="file-title">${params.filename}</h1>
            <div class="file-meta" aria-label="File metadata">
                <span aria-label="File path">Path: ${params.filepath}</span>
                <span aria-label="File size">Size: ${params.fileSize}</span>
                <span aria-label="Last modified date">Modified: ${params.lastModified}</span>
            </div>
        </header>
        <main class="file-content" aria-label="File content">
            <section aria-label="Code content">
                ${params.content}
            </section>
        </main>
    </div>
    ${params.scripts}
</body>
</html>`;
  }

  private getFileViewStyles(): string {
    return `
      ${ThemeSystem.generateBaseStyles()}
      ${ThemeSystem.generateFileViewerStyles()}
    `;
  }

  private getMarkdownStyles(): string {
    return `
      ${this.getFileViewStyles()}
    `;
  }

  private getScrollScript(): string {
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