import { describe, it, expect } from 'vitest';
import { FileManager } from '../utils/file-manager.js';

describe('FileManager', () => {
  it('should create FileManager instance', () => {
    expect(() => FileManager.create()).not.toThrow();
  });

  it('should read file content with path validation', async () => {
    const fileManager = FileManager.create();
    
    // Use this test file as it exists
    const result = await fileManager.readFile('src/__tests__/file-manager.test.ts');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toContain('FileManager');
      expect(result.value.filepath).toContain('file-manager.test.ts');
      expect(result.value.filename).toBe('file-manager.test.ts');
      expect(result.value.language).toBe('typescript');
      expect(result.value.fileSize).toBeGreaterThan(0);
      expect(result.value.lastModified).toBeInstanceOf(Date);
    }
  });

  it('should handle file read errors gracefully', async () => {
    const fileManager = FileManager.create();
    
    const result = await fileManager.readFile('non-existent-file.txt');
    
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_NOT_ACCESSIBLE');
    }
  });

  it('should detect languages correctly', async () => {
    const fileManager = FileManager.create();
    
    // Test package.json (should detect as json)
    const result = await fileManager.readFile('package.json');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.language).toBe('json');
    }
  });
});