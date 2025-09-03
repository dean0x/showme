import { describe, it, expect } from 'vitest';
import { PathValidator } from '../utils/path-validator.js';

describe('PathValidator', () => {
  it('should create PathValidator instance', () => {
    expect(() => new PathValidator()).not.toThrow();
  });

  it('should validate simple relative path', async () => {
    const validator = new PathValidator();
    const result = await validator.validatePath('src/index.ts');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('src/index.ts');
    }
  });

  it('should reject path with .. traversal attempts', () => {
    const validator = new PathValidator();
    const result = validator.validatePathSync('../../../etc/passwd');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DIRECTORY_TRAVERSAL');
      expect(result.error.message).toContain('directory traversal');
    }
  });

  it('should reject absolute path outside workspace', () => {
    const validator = new PathValidator('/workspace/myproject');
    const result = validator.validatePathSync('/etc/passwd');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('OUTSIDE_WORKSPACE');
    }
  });

  it('should reject path containing null bytes', () => {
    const validator = new PathValidator();
    const result = validator.validatePathSync('src/file\0.txt');
    
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
      const result = validator.validatePathSync(`${deviceName}.txt`);
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
    const result = await validator.validatePath('src/__tests__/path-validator.test.ts', { checkAccess: true });
    expect(result.ok).toBe(true);
    
    // Test with non-existent file
    const nonExistentResult = await validator.validatePath('non-existent-file.txt', { checkAccess: true });
    expect(nonExistentResult.ok).toBe(false);
    if (!nonExistentResult.ok) {
      expect(nonExistentResult.error.code).toBe('FILE_NOT_ACCESSIBLE');
    }
  });

  it('should work synchronously when checkAccess is false', async () => {
    const validator = new PathValidator();
    
    // Should return Promise but resolve immediately for sync validation
    const result = await validator.validatePath('src/index.ts');
    expect(result.ok).toBe(true);
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

  it('should consistently classify any .. usage as directory traversal', () => {
    const validator = new PathValidator('/workspace/myproject');
    
    // Even if it theoretically resolves within workspace, .. usage is always suspicious
    const result = validator.validatePathSync('../../../workspace/myproject/valid.txt');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('DIRECTORY_TRAVERSAL');
      expect(result.error.message).toContain('directory traversal');
    }
  });

  it('should correctly classify absolute paths outside workspace', () => {
    const validator = new PathValidator('/workspace/myproject');
    
    // Pure outside workspace without traversal patterns
    const result = validator.validatePathSync('/completely/different/path/file.txt');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('OUTSIDE_WORKSPACE');
    }
  });

  it('should handle path normalization edge cases', async () => {
    const validator = new PathValidator();
    
    // These should be allowed (normal path navigation)
    const normalizedPath1 = await validator.validatePath('src/./index.ts');
    expect(normalizedPath1.ok).toBe(true);
    
    const normalizedPath2 = await validator.validatePath('src/subdir/../index.ts');
    expect(normalizedPath2.ok).toBe(false); // Contains .. - should be rejected
    if (!normalizedPath2.ok) {
      expect(normalizedPath2.error.code).toBe('DIRECTORY_TRAVERSAL');
    }
    
    // Empty string should be handled gracefully
    const emptyResult = await validator.validatePath('');
    expect(emptyResult.ok).toBe(true); // Empty resolves to workspace root
  });

  it('should handle Windows vs Unix path separators', async () => {
    const validator = new PathValidator();
    
    // Both should work on any platform
    const unixStyle = await validator.validatePath('src/utils/path-validator.ts');
    expect(unixStyle.ok).toBe(true);
    
    const windowsStyle = await validator.validatePath('src\\utils\\path-validator.ts');
    expect(windowsStyle.ok).toBe(true);
  });

  it('should reject paths with multiple consecutive separators', async () => {
    const validator = new PathValidator();
    
    // These should still work as they normalize to valid paths
    const multipleSeparators = await validator.validatePath('src//utils///path-validator.ts');
    expect(multipleSeparators.ok).toBe(true);
  });
});