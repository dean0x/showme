/**
 * Design system implementation following GitHub Dark theme
 * Based on visual-design-requirements.md specifications
 */
export class ThemeSystem {
    static DESIGN_TOKENS = {
        colors: {
            // Background Colors
            'bg-primary': '#0d1117',
            'bg-secondary': '#161b22',
            'bg-tertiary': '#21262d',
            'bg-overlay': '#30363d',
            // Text Colors
            'text-primary': '#e6edf3',
            'text-secondary': '#7d8590',
            'text-muted': '#656d76',
            'text-accent': '#79c0ff',
            // Semantic Colors
            'success': '#3fb950',
            'danger': '#f85149',
            'warning': '#ffd60a',
            'info': '#58a6ff',
            // Diff-specific Colors
            'diff-added-bg': '#0d4429',
            'diff-added-border': '#3fb950',
            'diff-removed-bg': '#67060c',
            'diff-removed-border': '#f85149',
            'diff-modified-bg': '#1a1a00',
            'diff-modified-border': '#ffd60a'
        },
        typography: {
            families: {
                'font-ui': '-apple-system, BlinkMacSystemFont, \'Segoe UI\', \'Roboto\', \'Oxygen\', \'Ubuntu\', \'Cantarell\', sans-serif',
                'font-mono': '\'SFMono-Regular\', \'Consolas\', \'Liberation Mono\', \'Menlo\', monospace'
            },
            sizes: {
                'text-xs': '0.75rem',
                'text-sm': '0.875rem',
                'text-base': '1rem',
                'text-lg': '1.125rem',
                'text-xl': '1.25rem',
                'text-2xl': '1.5rem'
            },
            lineHeights: {
                'leading-tight': '1.25',
                'leading-normal': '1.5',
                'leading-relaxed': '1.6'
            }
        },
        spacing: {
            'space-1': '0.25rem',
            'space-2': '0.5rem',
            'space-3': '0.75rem',
            'space-4': '1rem',
            'space-6': '1.5rem',
            'space-8': '2rem',
            'space-12': '3rem',
            'space-16': '4rem'
        },
        breakpoints: {
            'mobile': '768px',
            'mobile-small': '480px'
        }
    };
    /**
     * Get all design tokens
     */
    static getDesignTokens() {
        return this.DESIGN_TOKENS;
    }
    /**
     * Generate CSS custom properties string for use in stylesheets
     */
    static generateCSSCustomProperties() {
        const tokens = this.DESIGN_TOKENS;
        const properties = [];
        // Add color properties
        for (const [key, value] of Object.entries(tokens.colors)) {
            properties.push(`  --${key}: ${value};`);
        }
        // Add typography properties
        for (const [key, value] of Object.entries(tokens.typography.families)) {
            properties.push(`  --${key}: ${value};`);
        }
        for (const [key, value] of Object.entries(tokens.typography.sizes)) {
            properties.push(`  --${key}: ${value};`);
        }
        for (const [key, value] of Object.entries(tokens.typography.lineHeights)) {
            properties.push(`  --${key}: ${value};`);
        }
        // Add spacing properties
        for (const [key, value] of Object.entries(tokens.spacing)) {
            properties.push(`  --${key}: ${value};`);
        }
        return `:root {\n${properties.join('\n')}\n}`;
    }
    /**
     * Get semantic color value
     */
    static getSemanticColor(type) {
        return this.DESIGN_TOKENS.colors[type];
    }
    /**
     * Get responsive breakpoints
     */
    static getResponsiveBreakpoints() {
        return this.DESIGN_TOKENS.breakpoints;
    }
    /**
     * Generate complete base styles for HTML documents
     */
    static generateBaseStyles() {
        return `
      ${this.generateCSSCustomProperties()}

      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: var(--font-ui);
        background-color: var(--bg-primary);
        color: var(--text-primary);
        line-height: var(--leading-normal);
      }

      /* Focus states for accessibility */
      .focusable:focus-visible {
        outline: 2px solid var(--text-accent);
        outline-offset: 2px;
        border-radius: 4px;
      }

      /* Screen reader only utility class */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
    `;
    }
    /**
     * Generate file viewer specific styles
     */
    static generateFileViewerStyles() {
        return `
      .file-viewer {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--bg-primary);
        color: var(--text-primary);
      }

      .file-header {
        background-color: var(--bg-secondary);
        border-bottom: 1px solid var(--bg-tertiary);
        padding: var(--space-4) var(--space-8);
        position: sticky;
        top: 0;
        z-index: 100;
      }

      .file-title {
        font-size: var(--text-xl);
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: var(--space-2);
      }

      .file-meta {
        display: flex;
        gap: var(--space-6);
        font-size: var(--text-sm);
        color: var(--text-secondary);
      }

      .file-meta span {
        display: flex;
        align-items: center;
        gap: var(--space-1);
      }

      .file-content {
        flex: 1;
        padding: var(--space-4) var(--space-8);
        overflow-x: auto;
      }

      .file-content pre {
        margin: 0;
        background-color: transparent !important;
        border-radius: 8px;
        overflow-x: auto;
      }

      .code-block {
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        line-height: var(--leading-relaxed);
        border-radius: 8px;
        overflow: hidden;
      }

      .line-highlight {
        background-color: color-mix(in srgb, var(--warning) 20%, transparent) !important;
        border-left: 3px solid var(--warning);
        padding-left: var(--space-2) !important;
      }

      /* Markdown content styles */
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
        margin-top: var(--space-8);
        margin-bottom: var(--space-4);
        color: var(--text-primary);
      }
      
      .markdown-content h1 {
        font-size: var(--text-2xl);
        border-bottom: 1px solid var(--bg-tertiary);
        padding-bottom: var(--space-2);
      }
      
      .markdown-content h2 {
        font-size: var(--text-xl);
        border-bottom: 1px solid var(--bg-tertiary);
        padding-bottom: var(--space-1);
      }
      
      .markdown-content p {
        margin-bottom: var(--space-4);
      }
      
      .markdown-content ul,
      .markdown-content ol {
        margin-bottom: var(--space-4);
        padding-left: var(--space-8);
      }
      
      .markdown-content blockquote {
        border-left: 4px solid var(--bg-overlay);
        padding-left: var(--space-4);
        margin: var(--space-4) 0;
        color: var(--text-secondary);
      }
      
      .markdown-content code {
        background-color: var(--bg-secondary);
        padding: var(--space-1) var(--space-2);
        border-radius: 4px;
        font-size: var(--text-sm);
        font-family: var(--font-mono);
      }
      
      .markdown-content pre {
        background-color: var(--bg-primary) !important;
        border: 1px solid var(--bg-tertiary);
        border-radius: 8px;
        padding: var(--space-4);
        overflow-x: auto;
        margin: var(--space-4) 0;
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .file-header {
          padding: var(--space-3) var(--space-4);
        }
        
        .file-content {
          padding: var(--space-3) var(--space-4);
        }
        
        .file-meta {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-2);
        }
      }

      @media (max-width: 480px) {
        .file-title {
          font-size: var(--text-lg);
        }
        
        .file-meta {
          font-size: var(--text-xs);
        }
        
        .code-block {
          font-size: var(--text-xs);
        }
        
        .file-content {
          padding-bottom: var(--space-8);
        }
      }

      /* Copy button styles */
      .copy-button {
        position: fixed;
        top: var(--space-4);
        right: var(--space-4);
        background-color: var(--bg-overlay);
        color: var(--text-primary);
        border: 1px solid var(--bg-tertiary);
        border-radius: 6px;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        font-family: var(--font-ui);
        cursor: pointer;
        transition: all 0.2s ease;
        z-index: 1000;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .copy-button:hover {
        background-color: var(--bg-tertiary);
        border-color: var(--text-accent);
        transform: translateY(-1px);
      }

      .copy-button:active {
        transform: translateY(0);
      }

      .copy-button.copy-success {
        background-color: var(--success);
        border-color: var(--success);
        color: var(--bg-primary);
      }

      /* Search overlay styles */
      #search-overlay {
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        display: none;
        justify-content: center;
        align-items: flex-start;
        padding-top: var(--space-16);
      }

      .search-box {
        background-color: var(--bg-secondary);
        border: 1px solid var(--bg-tertiary);
        border-radius: 8px;
        padding: var(--space-3);
        display: flex;
        align-items: center;
        gap: var(--space-2);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        min-width: 400px;
      }

      #search-input {
        flex: 1;
        background-color: var(--bg-primary);
        border: 1px solid var(--bg-overlay);
        border-radius: 4px;
        padding: var(--space-2);
        color: var(--text-primary);
        font-size: var(--text-sm);
        font-family: var(--font-ui);
      }

      #search-input:focus {
        outline: none;
        border-color: var(--text-accent);
        box-shadow: 0 0 0 2px rgba(121, 192, 255, 0.2);
      }

      #search-count {
        color: var(--text-secondary);
        font-size: var(--text-sm);
        white-space: nowrap;
        min-width: 40px;
        text-align: center;
      }

      .search-box button {
        background-color: var(--bg-overlay);
        border: 1px solid var(--bg-tertiary);
        border-radius: 4px;
        color: var(--text-primary);
        padding: var(--space-1) var(--space-2);
        font-size: var(--text-sm);
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .search-box button:hover {
        background-color: var(--bg-tertiary);
      }

      .search-box button:active {
        background-color: var(--bg-primary);
      }

      #search-close {
        font-weight: bold;
        font-size: var(--text-base);
      }

      /* Simplified approach - let JavaScript handle line numbers */
      .code-with-lines {
        position: relative;
        font-family: var(--font-mono);
      }

      .code-with-lines pre {
        margin: 0;
        padding: var(--space-4);
        background-color: transparent !important;
        border-radius: 8px;
        overflow-x: auto;
      }

      .line-highlight {
        background-color: color-mix(in srgb, var(--warning) 20%, transparent) !important;
        border-left: 3px solid var(--warning);
        padding-left: var(--space-2) !important;
      }

      /* Search highlight styles */
      .search-highlight {
        background-color: var(--warning);
        color: var(--bg-primary);
        border-radius: 2px;
        padding: 1px 2px;
      }

      .search-highlight.current-match {
        background-color: var(--text-accent);
        box-shadow: 0 0 4px var(--text-accent);
      }

      /* Mobile responsive adjustments */
      @media (max-width: 480px) {
        .copy-button {
          top: var(--space-2);
          right: var(--space-2);
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-xs);
        }

        .search-box {
          min-width: 300px;
          margin: 0 var(--space-4);
        }

        #search-input {
          font-size: var(--text-xs);
        }
      }
    `;
    }
}
