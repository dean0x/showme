import { createHighlighter } from 'shiki';
import { ThemeSystem } from './theme-system.js';
import { ConsoleLogger } from './logger.js';
import { ErrorFactory } from './error-handling.js';
import { performanceMonitor } from './performance-monitor.js';
/**
 * Lightweight HTML generator without syntax highlighting
 * For cases that need basic HTML generation without Shiki initialization
 */
export class HTMLGeneratorLite {
    logger;
    constructor(logger = new ConsoleLogger()) {
        this.logger = logger;
    }
    async generateFileView(options) {
        const { filename, filepath, content, language, fileSize, lastModified, lineHighlight } = options;
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
        }
        catch (error) {
            return {
                ok: false,
                error: ErrorFactory.htmlGeneration(error instanceof Error ? error.message : String(error), 'HTML_GENERATION_ERROR', undefined, error instanceof Error ? error : new Error(String(error)))
            };
        }
    }
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    async generateMarkdownView(options) {
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
    buildHTMLTemplate(data) {
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
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
    }
    async dispose() {
        // No resources to dispose in lite version
    }
}
export class HTMLGenerator {
    highlighter;
    logger;
    constructor(highlighter, logger) {
        this.highlighter = highlighter;
        this.logger = logger;
    }
    static async create(logger) {
        const actualLogger = logger || new ConsoleLogger();
        actualLogger.info('Initializing Shiki highlighter');
        try {
            const highlighter = await performanceMonitor.timeAsync('shiki-highlighter-init', 'html-generation', async () => {
                return await createHighlighter({
                    themes: ['github-dark', 'github-light'],
                    langs: [
                        'javascript', 'typescript', 'jsx', 'tsx',
                        'python', 'java', 'cpp', 'c', 'html', 'css', 'scss',
                        'json', 'yaml', 'toml', 'xml', 'markdown',
                        'sql', 'bash', 'go', 'rust', 'php', 'ruby'
                    ]
                });
            }, {
                languages: 23,
                themes: 2
            });
            actualLogger.info('Shiki highlighter initialized successfully', {
                languages: highlighter.getLoadedLanguages().length,
                themes: highlighter.getLoadedThemes().length
            });
            // Set performance thresholds
            performanceMonitor.setThreshold({
                operation: 'shiki-highlighter-init',
                warningThreshold: 2000, // 2 seconds
                errorThreshold: 5000 // 5 seconds
            });
            return {
                ok: true,
                value: new HTMLGenerator(highlighter, actualLogger)
            };
        }
        catch (error) {
            actualLogger.error('Failed to initialize Shiki highlighter', {
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                ok: false,
                error: ErrorFactory.htmlGeneration(`Failed to initialize Shiki highlighter: ${error instanceof Error ? error.message : String(error)}`, 'HIGHLIGHTER_INIT_ERROR', undefined, error instanceof Error ? error : new Error(String(error)))
            };
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
        const { filename, content, language, lineHighlight } = options;
        return await performanceMonitor.timeAsync('html-file-view-generation', 'html-generation', async () => {
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
        }, {
            filename,
            language,
            contentSize: content.length,
            hasLineHighlight: !!lineHighlight
        });
    }
    async generateCodeView(options) {
        const { filename, filepath, content, language, lineHighlight, fileSize, lastModified } = options;
        try {
            // Generate syntax highlighted code with error handling and performance monitoring
            const highlightedCode = await performanceMonitor.timeAsync('syntax-highlighting', 'html-generation', async () => {
                if (!this.highlighter) {
                    this.logger.warn('No highlighter available, generating plain HTML', { filename, language });
                    return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
                }
                else {
                    try {
                        return this.highlighter.codeToHtml(content, {
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
                        return `<pre><code>${this.escapeHtml(content)}</code></pre>`;
                    }
                }
            }, {
                filename,
                language,
                contentSize: content.length,
                hasHighlighter: !!this.highlighter
            });
            const result = performanceMonitor.time('html-template-build', 'html-generation', () => {
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
            }, {
                filename,
                hasLineHighlight: !!lineHighlight,
                contentLength: highlightedCode.length
            });
            this.logger.info('Generated file view', {
                filename,
                language,
                contentLength: result.length
            });
            return {
                ok: true,
                value: result
            };
        }
        catch (error) {
            this.logger.error('Failed to generate file view', {
                filename,
                language,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                ok: false,
                error: ErrorFactory.htmlGeneration(`Failed to generate file view: ${error instanceof Error ? error.message : String(error)}`, 'GENERATION_ERROR', undefined, error instanceof Error ? error : new Error(String(error)))
            };
        }
    }
    async generateMarkdownView(options) {
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
        }
        catch (error) {
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
