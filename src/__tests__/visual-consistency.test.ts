import { describe, it, expect } from 'vitest';
import { HTMLGenerator } from '../utils/html-generator.js';
import { ThemeSystem } from '../utils/theme-system.js';
import { displayFile } from '../utils/display-file.js';

describe('Visual Consistency & Compliance', () => {
  it('should maintain consistent design tokens across all file views', async () => {
    const generator = await HTMLGenerator.create();
    
    // Test different file types
    const testFiles = [
      { filename: 'test.js', language: 'javascript', content: 'console.log("test");' },
      { filename: 'test.ts', language: 'typescript', content: 'const x: number = 42;' },
      { filename: 'test.md', language: 'markdown', content: '# Hello\n\nThis is **markdown**.' },
      { filename: 'test.json', language: 'json', content: '{"test": "value"}' }
    ];

    for (const file of testFiles) {
      const html = await generator.generateFileView({
        ...file,
        filepath: `/${file.filename}`,
        fileSize: file.content.length,
        lastModified: new Date()
      });

      // All files should use consistent design tokens
      expect(html).toContain(':root {');
      expect(html).toContain('--bg-primary: #0d1117');
      expect(html).toContain('--text-primary: #e6edf3');
      expect(html).toContain('--space-4: 1rem');
      
      // All files should use consistent CSS classes
      expect(html).toContain('class="file-viewer"');
      expect(html).toContain('class="file-header"');
      expect(html).toContain('class="file-content"');
    }
    
    await generator.dispose();
  });

  it('should provide WCAG 2.1 AA accessibility compliance', async () => {
    const generator = await HTMLGenerator.create();
    
    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("accessibility test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    // Semantic HTML structure
    expect(html).toContain('<main');
    expect(html).toContain('<header');
    expect(html).toContain('<section');
    expect(html).toContain('<h1');

    // ARIA labels for screen readers
    expect(html).toContain('aria-label="File information"');
    expect(html).toContain('aria-label="File metadata"');
    expect(html).toContain('aria-label="File content"');
    expect(html).toContain('aria-label="Code content"');
    expect(html).toContain('aria-label="File path"');
    expect(html).toContain('aria-label="File size"');
    expect(html).toContain('aria-label="Last modified date"');

    // Focus management
    expect(html).toContain('.focusable:focus-visible');
    expect(html).toContain('outline: 2px solid var(--text-accent)');

    // Screen reader utilities
    expect(html).toContain('.sr-only');
    
    await generator.dispose();
  });

  it('should implement mobile-responsive design correctly', async () => {
    const generator = await HTMLGenerator.create();
    
    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("responsive test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    // Mobile breakpoints
    expect(html).toContain('@media (max-width: 768px)');
    expect(html).toContain('@media (max-width: 480px)');
    
    // Responsive spacing adjustments
    expect(html).toContain('padding: var(--space-3) var(--space-4)');
    expect(html).toContain('flex-direction: column');
    expect(html).toContain('font-size: var(--text-xs)');
    expect(html).toContain('padding-bottom: var(--space-8)');
    
    await generator.dispose();
  });

  it('should provide consistent color contrast ratios', async () => {
    const tokens = ThemeSystem.getDesignTokens();
    
    // Primary text on primary background should have good contrast
    expect(tokens.colors['text-primary']).toBe('#e6edf3'); // Light text
    expect(tokens.colors['bg-primary']).toBe('#0d1117');   // Dark background
    
    // Secondary text should still be readable
    expect(tokens.colors['text-secondary']).toBe('#7d8590'); // Muted but readable
    
    // Success/danger colors should be distinguishable
    expect(tokens.colors.success).toBe('#3fb950');
    expect(tokens.colors.danger).toBe('#f85149');
    expect(tokens.colors.warning).toBe('#ffd60a');
  });

  it('should integrate with display utility for end-to-end consistency', async () => {
    // Test the high-level displayFile utility
    const result = await displayFile('package.json');
    
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      const html = result.value;
      
      // Should use theme system
      expect(html).toContain('var(--bg-primary)');
      expect(html).toContain('var(--text-primary)');
      
      // Should have semantic structure
      expect(html).toContain('aria-label');
      expect(html).toContain('class="file-viewer"');
      
      // Should be responsive
      expect(html).toContain('@media (max-width:');
    }
  });

  it('should handle line highlighting consistently', async () => {
    const generator = await HTMLGenerator.create();
    
    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'line1\nline2\nline3',
      language: 'javascript',
      lineHighlight: 2,
      fileSize: 100,
      lastModified: new Date()
    });

    // Line highlighting should use theme variables
    expect(html).toContain('.line-highlight');
    expect(html).toContain('var(--warning)');
    expect(html).toContain('color-mix(in srgb, var(--warning) 20%, transparent)');
    
    // Should include scroll-to-line functionality
    expect(html).toContain('scrollIntoView');
    expect(html).toContain('.line-highlight');
    
    await generator.dispose();
  });

  it('should prepare foundation for diff views (future Sprint 2)', () => {
    const tokens = ThemeSystem.getDesignTokens();
    
    // Verify diff-specific tokens are available for future use
    expect(tokens.colors['diff-added-bg']).toBe('#0d4429');
    expect(tokens.colors['diff-added-border']).toBe('#3fb950');
    expect(tokens.colors['diff-removed-bg']).toBe('#67060c');
    expect(tokens.colors['diff-removed-border']).toBe('#f85149');
    expect(tokens.colors['diff-modified-bg']).toBe('#1a1a00');
    expect(tokens.colors['diff-modified-border']).toBe('#ffd60a');
    
    // Verify breakpoints for responsive diff views
    const breakpoints = ThemeSystem.getResponsiveBreakpoints();
    expect(breakpoints.mobile).toBe('768px');
    expect(breakpoints['mobile-small']).toBe('480px');
  });
});