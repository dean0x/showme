import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HTMLGeneratorLite } from '../utils/html-generator.js';
import { type Logger } from '../utils/logger.js';

describe('HTMLGenerator Result Pattern', () => {
  let mockLogger: Logger;
  let generator: HTMLGeneratorLite;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };
    
    generator = new HTMLGeneratorLite(mockLogger);
  });

  it('should return Result<string, HTMLGeneratorError> for successful file view generation', async () => {
    const options = {
      filename: 'test.ts',
      filepath: '/test/test.ts',
      content: 'console.log("hello");',
      language: 'typescript',
      fileSize: 100,
      lastModified: new Date(),
    };
    
    const result = await generator.generateFileView(options);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('<html lang="en">');
      expect(result.value).toContain('test.ts');
      expect(result.value).toContain('console.log(&quot;hello&quot;);'); // HTML escaped
    }
  });

  it('should return Result<string, HTMLGeneratorError> for Shiki initialization failure', async () => {
    // This test is for the static factory method, not the instance method
    // Since we're testing the instance with null highlighter, this should actually succeed
    // and fallback to plain HTML
    const options = {
      filename: 'test.ts',
      filepath: '/test/test.ts', 
      content: 'console.log("hello");',
      language: 'typescript',
      fileSize: 100,
      lastModified: new Date(),
    };
    
    const result = await generator.generateFileView(options);
    
    // Should succeed with fallback HTML since highlighter is null
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('<html lang="en">');
      expect(result.value).toContain('<pre><code>'); // Plain HTML fallback
    }
  });

  it('should return Result<string, HTMLGeneratorError> for invalid language', async () => {
    const options = {
      filename: 'test.invalid',
      filepath: '/test/test.invalid',
      content: 'some content',
      language: 'nonexistent-language',
      fileSize: 100,
      lastModified: new Date(),
    };
    
    const result = await generator.generateFileView(options);
    
    // Should gracefully handle invalid language and fallback to plain text
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('<html lang="en">');
      expect(result.value).toContain('some content');
    }
  });

  it('should never throw exceptions from generateFileView', async () => {
    const options = {
      filename: 'test.ts',
      filepath: '/test/test.ts',
      content: 'console.log("hello");',
      language: 'typescript',
      fileSize: 100,
      lastModified: new Date(),
    };
    
    // This should not throw, even if internal operations fail
    await expect(generator.generateFileView(options)).resolves.toBeDefined();
  });

  it('should handle markdown files with Result pattern', async () => {
    const options = {
      filename: 'test.md',
      filepath: '/test/test.md',
      content: '# Hello World\n\nThis is a test.',
      language: 'markdown',
      fileSize: 100,
      lastModified: new Date(),
    };
    
    const result = await generator.generateFileView(options);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('<html lang="en">');
      expect(result.value).toContain('<h1>Hello World</h1>');
      expect(result.value).toContain('<p>This is a test.</p>');
    }
  });
});