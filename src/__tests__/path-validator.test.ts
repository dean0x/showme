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
});