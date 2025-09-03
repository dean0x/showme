import { describe, it, expect } from 'vitest';
import { PathValidator } from '../utils/path-validator.js';

describe('PathValidator', () => {
  it('should create PathValidator instance', () => {
    expect(() => new PathValidator()).not.toThrow();
  });

  it('should validate simple relative path', () => {
    const validator = new PathValidator();
    const result = validator.validatePath('src/index.ts');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('src/index.ts');
    }
  });

  it('should reject path with .. traversal attempts', () => {
    const validator = new PathValidator();
    const result = validator.validatePath('../../../etc/passwd');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DIRECTORY_TRAVERSAL');
      expect(result.error.message).toContain('directory traversal');
    }
  });

  it('should reject absolute path outside workspace', () => {
    const validator = new PathValidator('/workspace/myproject');
    const result = validator.validatePath('/etc/passwd');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('OUTSIDE_WORKSPACE');
    }
  });
});