import { describe, it, expect, vi } from 'vitest';
import { HTMLGenerator, HTMLGeneratorLite } from '../utils/html-generator.js';

describe('HTMLGenerator - Dependency Injection', () => {
  it('should use factory method for proper initialization', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    const result = await HTMLGenerator.create(mockLogger);
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      await result.value.dispose();
    }
  });

  it('should initialize with logger dependency', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    const result = await HTMLGenerator.create(mockLogger);
    expect(result.ok).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('Initializing Shiki highlighter');
    
    if (result.ok) {
      await result.value.dispose();
    }
  });

  it('should provide lightweight alternative without dependencies', () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // HTMLGeneratorLite can be instantiated directly for simple cases
    const lite = new HTMLGeneratorLite(mockLogger);
    expect(lite).toBeDefined();
  });

  it('should handle file generation with HTMLGeneratorLite', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    const lite = new HTMLGeneratorLite(mockLogger);
    
    const result = await lite.generateFileView({
      filename: 'test.js',
      filepath: '/test.js',
      content: 'console.log("test");',
      language: 'javascript',
      fileSize: 100,
      lastModified: new Date()
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('<!DOCTYPE html>');
      expect(result.value).toContain('test.js');
    }

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Generated basic file view',
      expect.objectContaining({
        filename: 'test.js',
        language: 'javascript',
        contentLength: expect.any(Number)
      })
    );
  });

  it('should properly dispose resources', async () => {
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    const result = await HTMLGenerator.create(mockLogger);
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      await result.value.dispose();
      expect(mockLogger.info).toHaveBeenCalledWith('HTMLGenerator resources disposed successfully');
    }
  });
});