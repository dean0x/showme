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

  it('should reject path containing null bytes', () => {
    const validator = new PathValidator();
    const result = validator.validatePath('src/file\0.txt');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NULL_BYTE_ATTACK');
      expect(result.error.message).toContain('null byte');
    }
  });

  it('should reject Windows device names (CVE-2025-27210)', () => {
    const validator = new PathValidator();
    
    const deviceNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1'];
    
    deviceNames.forEach(deviceName => {
      const result = validator.validatePath(`${deviceName}.txt`);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('WINDOWS_DEVICE_NAME');
        expect(result.error.message).toContain('Windows device name');
      }
    });
  });

  it('should validate file access when checkAccess is true', async () => {
    const validator = new PathValidator();
    
    // Test with this test file which should exist
    const result = await validator.validatePathAsync('src/__tests__/path-validator.test.ts', { checkAccess: true });
    expect(result.ok).toBe(true);
    
    // Test with non-existent file
    const nonExistentResult = await validator.validatePathAsync('non-existent-file.txt', { checkAccess: true });
    expect(nonExistentResult.ok).toBe(false);
    if (!nonExistentResult.ok) {
      expect(nonExistentResult.error.code).toBe('FILE_NOT_ACCESSIBLE');
    }
  });

  it('should validate multiple paths atomically', () => {
    const validator = new PathValidator();
    
    const validPaths = ['src/index.ts', 'package.json'];
    const result = validator.validateMultiplePaths(validPaths);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }
  });

  it('should fail early on multiple paths with one invalid', () => {
    const validator = new PathValidator();
    
    const mixedPaths = ['src/index.ts', '../../../etc/passwd', 'package.json'];
    const result = validator.validateMultiplePaths(mixedPaths);
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DIRECTORY_TRAVERSAL');
    }
  });
});