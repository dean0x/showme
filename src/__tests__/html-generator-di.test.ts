import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import { HTMLGenerator } from '../utils/html-generator.js';
import type { Highlighter } from 'shiki';

// Mock interfaces for dependency injection
interface MockHighlighter extends Highlighter {
  codeToHtml: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

interface Logger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

describe('HTMLGenerator - Dependency Injection', () => {
  let mockHighlighter: MockedObject<MockHighlighter>;
  let mockLogger: MockedObject<Logger>;
  let generator: HTMLGenerator;

  beforeEach(() => {
    mockHighlighter = {
      codeToHtml: vi.fn(),
      dispose: vi.fn(),
      getLoadedLanguages: vi.fn(() => []),
      getLoadedThemes: vi.fn(() => []),
      loadLanguage: vi.fn(),
      loadTheme: vi.fn()
    } as MockedObject<MockHighlighter>;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // This should work with dependency injection
    generator = new HTMLGenerator(mockHighlighter, mockLogger);
  });

  it('should accept highlighter and logger dependencies in constructor', () => {
    expect(() => new HTMLGenerator(mockHighlighter, mockLogger)).not.toThrow();
  });

  it('should use injected highlighter for code highlighting', async () => {
    mockHighlighter.codeToHtml.mockReturnValue('<pre>highlighted code</pre>');

    const html = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    expect(mockHighlighter.codeToHtml).toHaveBeenCalledWith(
      'console.log("test");',
      expect.objectContaining({
        lang: 'javascript',
        theme: 'github-dark'
      })
    );
    expect(html).toContain('<pre>highlighted code</pre>');
  });

  it('should log performance metrics when generating views', async () => {
    mockHighlighter.codeToHtml.mockReturnValue('<pre>test</pre>');

    await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js', 
      content: 'test',
      language: 'javascript',
      fileSize: 4,
      lastModified: new Date()
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Generated file view',
      expect.objectContaining({
        filename: 'test.js',
        language: 'javascript',
        duration: expect.any(Number)
      })
    );
  });

  it('should properly dispose resources', async () => {
    await generator.dispose();
    expect(mockHighlighter.dispose).toHaveBeenCalled();
  });

  it('should handle highlighter errors gracefully with structured logging', async () => {
    const error = new Error('Highlighter failed');
    mockHighlighter.codeToHtml.mockImplementation(() => {
      throw error;
    });

    const result = await generator.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'test',
      language: 'javascript', 
      fileSize: 4,
      lastModified: new Date()
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Syntax highlighting failed',
      expect.objectContaining({
        filename: 'test.js',
        language: 'javascript',
        error: error.message
      })
    );

    // Should still return valid HTML without highlighting
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('test.js');
  });
});