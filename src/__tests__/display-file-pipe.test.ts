import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import { pipe, tap, type Result } from '../utils/pipe.js';
import { FileManager } from '../utils/file-manager.js';
import { HTMLGenerator } from '../utils/html-generator.js';
import type { FileContent } from '../utils/file-manager.js';
import type { Logger } from '../utils/logger.js';

describe('Display File with Pipe Composition', () => {
  let mockFileManager: MockedObject<FileManager>;
  let mockHTMLGenerator: MockedObject<HTMLGenerator>;
  let mockLogger: MockedObject<Logger>;

  beforeEach(() => {
    mockFileManager = {
      readFile: vi.fn()
    } as MockedObject<FileManager>;

    mockHTMLGenerator = {
      generateFileView: vi.fn(),
      dispose: vi.fn()
    } as MockedObject<HTMLGenerator>;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };
  });

  it('should compose file processing pipeline using pipes', async () => {
    // Mock successful responses
    const mockFileContent: FileContent = {
      content: 'console.log("test");',
      filepath: '/workspace/test.js',
      filename: 'test.js',
      fileSize: 100,
      lastModified: new Date(),
      language: 'javascript'
    };

    mockFileManager.readFile.mockResolvedValue({
      ok: true,
      value: mockFileContent
    });

    mockHTMLGenerator.generateFileView.mockResolvedValue('<html>test</html>');

    // Define pipe functions
    const readFile = (filePath: string): ReturnType<typeof mockFileManager.readFile> => mockFileManager.readFile(filePath);
    const logFileRead = tap<FileContent>((content) => 
      mockLogger.info('File read in pipeline', { filename: content.filename })
    );
    const generateHTML = async (content: FileContent): Promise<Result<string, Error>> => {
      try {
        const html = await mockHTMLGenerator.generateFileView(content);
        return { ok: true, value: html };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    };

    // Compose pipeline
    const displayFilePipeline = pipe(
      readFile,
      logFileRead,
      generateHTML
    );

    // Execute pipeline
    const result = await displayFilePipeline('test.js');

    // Verify execution
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('<html>test</html>');
    }

    expect(mockFileManager.readFile).toHaveBeenCalledWith('test.js');
    expect(mockLogger.info).toHaveBeenCalledWith('File read in pipeline', { filename: 'test.js' });
    expect(mockHTMLGenerator.generateFileView).toHaveBeenCalledWith(mockFileContent);
  });

  it('should stop pipeline on file read error', async () => {
    const fileError = new Error('File not found');
    mockFileManager.readFile.mockResolvedValue({
      ok: false,
      error: fileError
    });

    const readFile = (filePath: string): ReturnType<typeof mockFileManager.readFile> => mockFileManager.readFile(filePath);
    const generateHTML = vi.fn();

    const displayFilePipeline = pipe(readFile, generateHTML);
    const result = await displayFilePipeline('nonexistent.js');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(fileError);
    }
    expect(generateHTML).not.toHaveBeenCalled();
  });

  it('should handle HTML generation errors in pipeline', async () => {
    const mockFileContent: FileContent = {
      content: 'test',
      filepath: '/test.js',
      filename: 'test.js',
      fileSize: 4,
      lastModified: new Date(),
      language: 'javascript'
    };

    mockFileManager.readFile.mockResolvedValue({
      ok: true,
      value: mockFileContent
    });

    const htmlError = new Error('HTML generation failed');
    mockHTMLGenerator.generateFileView.mockRejectedValue(htmlError);

    const readFile = (filePath: string): ReturnType<typeof mockFileManager.readFile> => mockFileManager.readFile(filePath);
    const generateHTML = async (content: FileContent): Promise<Result<string, Error>> => {
      try {
        const html = await mockHTMLGenerator.generateFileView(content);
        return { ok: true, value: html };
      } catch (error) {
        return { 
          ok: false, 
          error: error instanceof Error ? error : new Error(String(error))
        };
      }
    };

    const displayFilePipeline = pipe(readFile, generateHTML);
    const result = await displayFilePipeline('test.js');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('HTML generation failed');
    }
  });
});