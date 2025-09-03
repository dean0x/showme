import { createHighlighter } from 'shiki';
import { ThemeSystem } from './theme-system.js';
import { ConsoleLogger } from './logger.js';
export class HTMLGenerator {
    highlighter;
    logger;
    constructor(highlighter = null, logger = new ConsoleLogger()) {
        this.highlighter = highlighter;
        this.logger = logger;
    }
    static async create(logger) {
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
                ]
            });
            const duration = performance.now() - startTime;
            actualLogger.info('Shiki highlighter initialized successfully', {
                duration,
                languages: highlighter.getLoadedLanguages().length,
                themes: highlighter.getLoadedThemes().length
            });
            return new HTMLGenerator(highlighter, actualLogger);
        }
        catch (error) {
            const duration = performance.now() - startTime;
            actualLogger.error('Failed to initialize Shiki highlighter', {
                duration,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async dispose() {
        if (this.highlighter) {
            try {
                await this.highlighter.dispose();
                this.logger.info('HTMLGenerator resources disposed successfully');
            }
            catch (error) {
                this.logger.error('Error disposing HTMLGenerator resources', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }
    async generateFileView(options) {
        const startTime = performance.now();
        const { filename, filepath, content, language, lineHighlight, fileSize, lastModified } = options;
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
                this.logger.info('Generated file view', {
                    filename,
                    language,
                    type: 'markdown',
                    duration
                });
                return result;
            }
            // Generate syntax highlighted code with error handling
            let highlightedCode;
            if (!this.highlighter) {
                this.logger.warn('No highlighter available, generating plain HTML', { filename, language });
                highlightedCode = `<pre><code>${this.escapeHtml(content)}</code></pre>`;
            }
            else {
                try {
                    highlightedCode = this.highlighter.codeToHtml(content, {
                        lang: language,
                        theme: 'github-dark',
                        transformers: lineHighlight ? [
                            {
                                name: 'line-highlight',
                                line(node, line) {
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
                }
                catch (highlightError) {
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
            return result;
        }
        catch (error) {
            const duration = performance.now() - startTime;
            this.logger.error('Failed to generate file view', {
                filename,
                language,
                duration,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async generateMarkdownView(options) {
        try {
            const { marked } = await import('marked');
            // Simple markdown processing without complex syntax highlighting for now
            // This avoids API compatibility issues with marked
            const htmlContent = marked(options.content);
            return this.buildHTMLTemplate({
                title: `ShowMe: ${options.filename}`,
                filename: options.filename,
                filepath: options.filepath,
                fileSize: this.formatFileSize(options.fileSize),
                lastModified: options.lastModified.toLocaleString(),
                content: `<div class="markdown-content">${htmlContent}</div>`,
                styles: this.getMarkdownStyles(),
                scripts: options.lineHighlight ? this.getScrollScript() : ''
            });
        }
        catch (error) {
            this.logger.error('Markdown processing failed', {
                filename: options.filename,
                error: error instanceof Error ? error.message : String(error)
            });
            // Fallback to plain text
            return this.buildHTMLTemplate({
                title: `ShowMe: ${options.filename}`,
                filename: options.filename,
                filepath: options.filepath,
                fileSize: this.formatFileSize(options.fileSize),
                lastModified: options.lastModified.toLocaleString(),
                content: `<div class="markdown-content"><pre>${this.escapeHtml(options.content)}</pre></div>`,
                styles: this.getMarkdownStyles(),
                scripts: options.lineHighlight ? this.getScrollScript() : ''
            });
        }
    }
    escapeHtml(content) {
        return content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    buildHTMLTemplate(params) {
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
    getFileViewStyles() {
        return `
      ${ThemeSystem.generateBaseStyles()}
      ${ThemeSystem.generateFileViewerStyles()}
    `;
    }
    getMarkdownStyles() {
        return `
      ${this.getFileViewStyles()}
    `;
    }
    getScrollScript() {
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
    formatFileSize(bytes) {
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
