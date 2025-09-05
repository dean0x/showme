import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';
import { ThemeSystem } from './theme-system.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { type Result } from './path-validator.js';
import { HTMLGenerationError, ErrorFactory } from './error-handling.js';
import { performanceMonitor } from './performance-monitor.js';
import { TemplateEngine, type TemplateData } from './template-engine.js';

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
      const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShowMe: ${filename}</title>
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
            <h1 class="file-title">${filename}</h1>
            <div class="file-meta" aria-label="File metadata">
                <span class="file-path" aria-label="File path">${filepath}</span>
                <span class="file-size" aria-label="File size">${this.formatFileSize(fileSize)}</span>
                <span class="file-modified" aria-label="Last modified date">${lastModified.toLocaleString()}</span>
            </div>
        </header>
        <section class="file-content" aria-label="File content">
            <div class="code-container" aria-label="Code content">
                <pre><code>${this.escapeHtml(content)}</code></pre>
            </div>
        </section>
    </main>
</body>
</html>`;

      this.logger.info('Generated basic file view', {
        filename,
        language,
        type: 'basic'
      });

      return { ok: true, value: basicHtml };
    } catch (error) {
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          `Failed to generate basic HTML: ${error instanceof Error ? error.message : String(error)}`,
          'BASIC_GENERATION_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    try {
      const { marked } = await import('marked');
      const htmlContent = marked(options.content);

      const basicHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ShowMe: ${options.filename}</title>
    <style>
        ${ThemeSystem.generateBaseStyles()}
    </style>
</head>
<body>
    <main class="file-viewer">
        <header class="file-header">
            <h1 class="file-title">${options.filename}</h1>
            <div class="file-meta">
                <span class="file-path">${options.filepath}</span>
                <span class="file-size">${this.formatFileSize(options.fileSize)}</span>
                <span class="file-modified">${options.lastModified.toLocaleString()}</span>
            </div>
        </header>
        <section class="file-content">
            <div class="markdown-content">${htmlContent}</div>
        </section>
    </main>
</body>
</html>`;

      return { ok: true, value: basicHtml };
    } catch (error) {
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          `Markdown processing failed: ${error instanceof Error ? error.message : String(error)}`,
          'MARKDOWN_ERROR',
          { filename: options.filename },
          error instanceof Error ? error : new Error(String(error))
        )
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

  async dispose(): Promise<void> {
    // No resources to dispose in lite version
  }
}

/**
 * Full-featured HTML generator with syntax highlighting and template engine
 * Clean separation between data and presentation
 */
export class HTMLGenerator {
  private constructor(
    private readonly highlighter: Highlighter,
    private readonly templateEngine: TemplateEngine,
    private readonly logger: Logger
  ) {}

  static async create(logger?: Logger): Promise<Result<HTMLGenerator, HTMLGenerationError>> {
    const actualLogger = logger || new ConsoleLogger();
    
    actualLogger.info('Initializing HTMLGenerator with Shiki and template engine');
    
    try {
      // Initialize template engine first
      const templateEngine = new TemplateEngine(actualLogger);
      const templateResult = await templateEngine.initialize();
      if (!templateResult.ok) {
        return { ok: false, error: templateResult.error };
      }
      
      // Initialize Shiki highlighter
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

      actualLogger.info('HTMLGenerator initialized successfully', { 
        languages: highlighter.getLoadedLanguages().length,
        themes: highlighter.getLoadedThemes().length,
        templateEngineReady: templateEngine.isReady()
      });

      // Set performance thresholds
      performanceMonitor.setThreshold({
        operation: 'shiki-highlighter-init',
        warningThreshold: 2000, // 2 seconds
        errorThreshold: 5000    // 5 seconds
      });

      return {
        ok: true,
        value: new HTMLGenerator(highlighter, templateEngine, actualLogger)
      };
    } catch (error) {
      actualLogger.error('Failed to initialize HTMLGenerator', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        ok: false,
        error: ErrorFactory.htmlGeneration(
          `Failed to initialize HTMLGenerator: ${error instanceof Error ? error.message : String(error)}`,
          'GENERATOR_INIT_ERROR',
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
      // Generate syntax highlighted code with performance monitoring
      const highlightedContent = await performanceMonitor.timeAsync(
        'syntax-highlighting',
        'html-generation',
        async () => {
          if (!this.highlighter) {
            this.logger.warn('No highlighter available, generating plain HTML', { filename, language });
            return this.escapeHtml(content);
          }
          
          try {
            // Get just the highlighted code content without wrapping HTML
            const html = this.highlighter.codeToHtml(content, {
              lang: language as BundledLanguage,
              theme: 'github-dark'
            });
            
            // Extract just the content from the <code> tags
            const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
            return match ? match[1] : this.escapeHtml(content);
            
          } catch (highlightError) {
            this.logger.error('Syntax highlighting failed', {
              filename,
              language,
              error: highlightError instanceof Error ? highlightError.message : String(highlightError)
            });
            return this.escapeHtml(content);
          }
        },
        { filename, language, contentSize: content.length }
      );

      // Prepare template data
      const templateData: TemplateData = {
        title: `ShowMe: ${filename}`,
        filepath,
        fileSize: this.formatFileSize(fileSize),
        lastModified: lastModified.toLocaleString(),
        highlightedContent,
        language,
        lineHighlight: lineHighlight || null,
        rawContent: content,
        rawContentJson: JSON.stringify(content)
      };

      // Render using template engine
      const templateResult = performanceMonitor.time(
        'template-render',
        'html-generation',
        () => this.templateEngine.render('file-viewer', templateData),
        { filename, templateSize: JSON.stringify(templateData).length }
      );

      if (!templateResult.ok) {
        return templateResult;
      }

      this.logger.info('Generated file view using template system', {
        filename,
        language,
        contentLength: templateResult.value.length
      });

      return templateResult;
      
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
          { filename, language },
          error instanceof Error ? error : new Error(String(error))
        )
      };
    }
  }

  private async generateMarkdownView(options: FileViewOptions): Promise<Result<string, HTMLGenerationError>> {
    try {
      const { marked } = await import('marked');
      
      // Process markdown content
      const processedContent = marked(options.content);

      // Prepare template data for markdown
      const templateData: TemplateData = {
        title: `ShowMe: ${options.filename}`,
        filepath: options.filepath,
        fileSize: this.formatFileSize(options.fileSize),
        lastModified: options.lastModified.toLocaleString(),
        highlightedContent: `<div class="markdown-content">${processedContent}</div>`,
        language: 'markdown',
        lineHighlight: options.lineHighlight || null,
        rawContent: options.content,
        rawContentJson: JSON.stringify(options.content)
      };

      // Render using template engine
      const templateResult = this.templateEngine.render('file-viewer', templateData);
      if (!templateResult.ok) {
        return templateResult;
      }

      this.logger.info('Generated markdown view using template system', {
        filename: options.filename,
        contentLength: templateResult.value.length
      });

      return templateResult;
      
    } catch (error) {
      this.logger.error('Markdown processing failed, falling back to plain text', {
        filename: options.filename,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to plain text using template system
      const templateData: TemplateData = {
        title: `ShowMe: ${options.filename}`,
        filepath: options.filepath,
        fileSize: this.formatFileSize(options.fileSize),
        lastModified: options.lastModified.toLocaleString(),
        highlightedContent: `<div class="markdown-content"><pre>${this.escapeHtml(options.content)}</pre></div>`,
        language: 'markdown',
        lineHighlight: options.lineHighlight || null,
        rawContent: options.content,
        rawContentJson: JSON.stringify(options.content)
      };

      const fallbackResult = this.templateEngine.render('file-viewer', templateData);
      return fallbackResult;
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