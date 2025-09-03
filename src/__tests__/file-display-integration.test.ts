import { describe, it, expect } from 'vitest';
import { FileManager } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';

describe('File Display Integration', () => {
  it('should complete end-to-end file display pipeline', async () => {
    const fileManager = new FileManager();
    const htmlGenerator = new HTMLGenerator();
    
    // Read a real file
    const fileResult = await fileManager.readFile('package.json');
    expect(fileResult.ok).toBe(true);
    
    if (!fileResult.ok) return;
    
    // Generate HTML from file content
    const html = await htmlGenerator.generateFileView({
      filename: fileResult.value.filename,
      filepath: fileResult.value.filepath,
      content: fileResult.value.content,
      language: fileResult.value.language,
      fileSize: fileResult.value.fileSize,
      lastModified: fileResult.value.lastModified
    });
    
    // Verify complete HTML output
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('ShowMe: package.json');
    expect(html).toContain('showme-mcp'); // Content from package.json
    expect(html).toContain('Path: '); 
    expect(html).toContain('Size: ');
    expect(html).toContain('Modified: ');
    
    // Verify JSON syntax highlighting
    expect(html).toContain('"name"');
    expect(html).toContain('"version"');
  });

  it('should handle TypeScript files with syntax highlighting', async () => {
    const fileManager = new FileManager();
    const htmlGenerator = new HTMLGenerator();
    
    // Read TypeScript file
    const fileResult = await fileManager.readFile('src/utils/path-validator.ts');
    expect(fileResult.ok).toBe(true);
    
    if (!fileResult.ok) return;
    
    const html = await htmlGenerator.generateFileView(fileResult.value);
    
    expect(html).toContain('export'); // Should have TypeScript syntax
    expect(html).toContain('PathValidator'); // Should contain class name
    expect(html).toContain('style="color:#F97583"'); // Should have syntax highlighting colors
  });

  it('should provide a simple display helper function', async () => {
    const displayFile = async (filePath: string): Promise<{ok: boolean; error?: unknown; value?: string}> => {
      const fileManager = new FileManager();
      const htmlGenerator = new HTMLGenerator();
      
      const fileResult = await fileManager.readFile(filePath);
      if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
      }
      
      const html = await htmlGenerator.generateFileView(fileResult.value);
      return { ok: true, value: html };
    };
    
    const result = await displayFile('package.json');
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      expect(result.value).toContain('<!DOCTYPE html>');
    }
  });
});