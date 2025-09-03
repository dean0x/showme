import { describe, it, expect } from 'vitest';
import { FileManager } from '../utils/file-manager.js';

describe('FileManager', () => {
  it('should create FileManager instance', () => {
    expect(() => new FileManager()).not.toThrow();
  });

  it('should read file content with path validation', async () => {
    const fileManager = new FileManager();
    
    // Use this test file as it exists
    const result = await fileManager.readFile('src/__tests__/file-manager.test.ts');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toContain('FileManager');
      expect(result.value.filepath).toContain('file-manager.test.ts');
      expect(result.value.filename).toBe('file-manager.test.ts');
    }
  });
});