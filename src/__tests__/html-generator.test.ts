import { describe, it, expect } from 'vitest';
import { HTMLGenerator } from '../utils/html-generator.js';

describe('HTMLGenerator', () => {
  it('should create HTMLGenerator instance', () => {
    expect(() => new HTMLGenerator()).not.toThrow();
  });

  it('should initialize Shiki highlighter', async () => {
    const generator = new HTMLGenerator();
    
    // Initialize should not throw
    await expect(generator.initialize()).resolves.not.toThrow();
  });

  it('should generate highlighted HTML for TypeScript', async () => {
    const generator = new HTMLGenerator();
    
    const html = await generator.generateFileView({
      filename: 'test.ts',
      filepath: '/workspace/test.ts',
      content: 'const x: number = 42;',
      language: 'typescript',
      fileSize: 21,
      lastModified: new Date()
    });
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('ShowMe: test.ts');
    expect(html).toContain('const');
    expect(html).toContain('number');
  });

  it('should handle markdown with syntax highlighting', async () => {
    const generator = new HTMLGenerator();
    
    const markdownContent = `# Test
\`\`\`typescript
const hello = "world";
\`\`\``;
    
    const html = await generator.generateFileView({
      filename: 'test.md',
      filepath: '/workspace/test.md',
      content: markdownContent,
      language: 'markdown',
      fileSize: markdownContent.length,
      lastModified: new Date()
    });
    
    expect(html).toContain('<h1>Test</h1>');
    expect(html).toContain('const hello');
  });

  it('should include file metadata in output', async () => {
    const generator = new HTMLGenerator();
    const testDate = new Date('2025-01-01');
    
    const html = await generator.generateFileView({
      filename: 'example.js',
      filepath: '/workspace/example.js',
      content: 'console.log("hello");',
      language: 'javascript',
      fileSize: 1024,
      lastModified: testDate
    });
    
    expect(html).toContain('Path: /workspace/example.js');
    expect(html).toContain('Size: 1.0 KB');
    expect(html).toContain(testDate.toLocaleString());
  });

  it('should use theme system instead of hardcoded styles', async () => {
    const generator = new HTMLGenerator();
    
    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    // Should use CSS custom properties in style rules
    expect(html).toContain('var(--bg-primary)');
    expect(html).toContain('var(--text-primary)');
    expect(html).toContain('var(--space-4)');
    // Should contain design token definitions
    expect(html).toContain('--bg-primary: #0d1117');
    expect(html).toContain('--text-primary: #e6edf3');
    // Should use semantic class names from theme system
    expect(html).toContain('file-viewer');
    expect(html).toContain('file-header');
    expect(html).toContain('file-content');
  });

  it('should generate semantic HTML with ARIA labels', async () => {
    const generator = new HTMLGenerator();
    
    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    // Should have semantic HTML structure
    expect(html).toContain('<main');
    expect(html).toContain('aria-label');
    expect(html).toContain('<header');
    expect(html).toContain('<section');
  });
});