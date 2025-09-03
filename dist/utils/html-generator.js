import { createHighlighter } from 'shiki';
import { ThemeSystem } from './theme-system.js';
export class HTMLGenerator {
    highlighter = null;
    initialized = false;
    async initialize() {
        if (this.initialized)
            return;
        this.highlighter = await createHighlighter({
            themes: ['github-dark', 'github-light'],
            langs: [
                'javascript', 'typescript', 'jsx', 'tsx',
                'python', 'java', 'cpp', 'c', 'html', 'css', 'scss',
                'json', 'yaml', 'toml', 'xml', 'markdown',
                'sql', 'bash', 'go', 'rust', 'php', 'ruby'
            ]
        });
        this.initialized = true;
    }
    async generateFileView(options) {
        await this.initialize();
        const { filename, filepath, content, language, lineHighlight, fileSize, lastModified } = options;
        // Handle markdown files specially
        if (language === 'markdown') {
            return this.generateMarkdownView(options);
        }
        // Generate syntax highlighted code
        const highlightedCode = this.highlighter.codeToHtml(content, {
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
    }
    async generateMarkdownView(options) {
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
