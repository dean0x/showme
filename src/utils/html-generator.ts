import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { ThemeSystem } from './theme-system.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { type Result } from './path-validator.js';

declare const performance: {
  now(): number;
};

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
 * HTML Generator errors
 */
export class HTMLGeneratorError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'HTMLGeneratorError';
  }
}

export class HTMLGenerator {
  constructor(
    private readonly highlighter: Highlighter | null = null,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  static async create(logger?: Logger): Promise<Result<HTMLGenerator, HTMLGeneratorError>> {
    const actualLogger = logger || new ConsoleLogger();
    const startTime = performance.now();
    
    actualLogger.info('Initializing Shiki highlighter');
    
    try {
      const highlighter = await createHighlighter({
        themes: ['github-dark', 'github-light'],
        langs: [
          'javascript', 'typescript', 'jsx', 'tsx',
          'python', 'java', 'cpp', 'c', 'html', 'css', 'scss',
          'json', 'yaml', 'toml', 'xml', 'markdown',
          'sql', 'bash', 'go', 'rust', 'php', 'ruby'
        ] as BundledLanguage[]
      });

      const duration = performance.now() - startTime;
      actualLogger.info('Shiki highlighter initialized successfully', { 
        duration,
        languages: highlighter.getLoadedLanguages().length,
        themes: highlighter.getLoadedThemes().length
      });

      return {
        ok: true,
        value: new HTMLGenerator(highlighter, actualLogger)
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      actualLogger.error('Failed to initialize Shiki highlighter', {
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        ok: false,
        error: new HTMLGeneratorError(
          `Failed to initialize Shiki highlighter: ${error instanceof Error ? error.message : String(error)}`,
          'HIGHLIGHTER_INIT_ERROR'
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

  async generateFileView(options: FileViewOptions): Promise<Result<string, HTMLGeneratorError>> {
    const startTime = performance.now();
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
      this.logger.debug('Starting file view generation', {
        filename,
        language,
        size: content.length,
        hasLineHighlight: !!lineHighlight
      });

      // Handle markdown files specially
      if (language === 'markdown') {
        const result = await this.generateMarkdownView(options);
        const duration = performance.now() - startTime;
        
        if (!result.ok) {
          return result;
        }
        
        this.logger.info('Generated file view', {
          filename,
          language,
          type: 'markdown',
          duration
        });
        
        return result;
      }

      // Generate syntax highlighted code with error handling
      let highlightedCode: string;
      
      if (!this.highlighter) {
        this.logger.warn('No highlighter available, generating plain HTML', { filename, language });
        highlightedCode = `<pre><code>${this.escapeHtml(content)}</code></pre>`;
      } else {
        try {
          highlightedCode = this.highlighter.codeToHtml(content, {
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
          highlightedCode = `<pre><code>${this.escapeHtml(content)}</code></pre>`;
        }
      }

      const result = this.buildHTMLTemplate({
        title: `ShowMe: ${filename}`,
        filename,
        filepath,
        fileSize: this.formatFileSize(fileSize),
        lastModified: lastModified.toLocaleString(),
        content: highlightedCode,
        styles: this.getFileViewStyles(),
        scripts: lineHighlight ? this.getScrollScript() : ''
      });

      const duration = performance.now() - startTime;
      this.logger.info('Generated file view', {
        filename,
        language,
        duration,
        contentLength: result.length
      });

      return {
        ok: true,
        value: result
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      this.logger.error('Failed to generate file view', {
        filename,
        language,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        ok: false,
        error: new HTMLGeneratorError(
          `Failed to generate file view: ${error instanceof Error ? error.message : String(error)}`,
          'GENERATION_ERROR'
        )
      };
    }
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<Result<string, HTMLGeneratorError>> {
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