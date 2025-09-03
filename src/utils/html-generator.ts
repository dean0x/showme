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

  private async generateMarkdownView(options: FileViewOptions): Promise<string> {
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