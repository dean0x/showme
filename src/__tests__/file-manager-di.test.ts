import { describe, it, expect, vi, beforeEach, type MockedObject } from 'vitest';
import { FileManager } from '../utils/file-manager.js';
import { PathValidator } from '../utils/path-validator.js';
import type { Logger } from '../utils/logger.js';
import fs from 'fs/promises';

// Mock fs module
vi.mock('fs/promises');

describe('FileManager - Dependency Injection', () => {
  let mockPathValidator: MockedObject<PathValidator>;
  let mockLogger: MockedObject<Logger>;
  let fileManager: FileManager;

  beforeEach(() => {
    mockPathValidator = {
      validatePath: vi.fn(),
      validatePathSync: vi.fn(),
      validateMultiplePaths: vi.fn()
    } as MockedObject<PathValidator>;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    // Mock fs functions
    vi.mocked(fs.readFile).mockImplementation(() => Promise.resolve('test content'));
    vi.mocked(fs.stat).mockImplementation(() => Promise.resolve({
      isFile: () => true,
      size: 100,
      mtime: new Date('2025-01-01')
    } as fs.Stats));

    fileManager = new FileManager(mockPathValidator, mockLogger);
  });

  it('should accept pathValidator and logger dependencies in constructor', () => {
    expect(() => new FileManager(mockPathValidator, mockLogger)).not.toThrow();
  });

  it('should use injected pathValidator for file validation', async () => {
    mockPathValidator.validatePath.mockResolvedValue({
      ok: true,
      value: '/workspace/test.js'
    });

    await fileManager.readFile('test.js');

    expect(mockPathValidator.validatePath).toHaveBeenCalledWith('test.js', { checkAccess: true });
  });

  it('should log performance metrics when reading files', async () => {
    mockPathValidator.validatePath.mockResolvedValue({
      ok: true,
      value: '/workspace/test.js'
    });

    await fileManager.readFile('test.js');

    expect(mockLogger.info).toHaveBeenCalledWith(
      'File read successfully',
      expect.objectContaining({
        filepath: expect.any(String),
        fileSize: expect.any(Number),
        duration: expect.any(Number)
      })
    );
  });

  it('should handle validation errors with structured logging', async () => {
    const validationError: { ok: false; error: Error } = { ok: false, error: new Error('Path validation failed') };
    mockPathValidator.validatePath.mockResolvedValue(validationError as ReturnType<typeof mockPathValidator.validatePath>);

    const result = await fileManager.readFile('invalid/path.js');

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Path validation failed',
      expect.objectContaining({
        inputPath: 'invalid/path.js',
        error: 'Path validation failed'
      })
    );
  });

  it('should handle file system errors with structured logging', async () => {
    mockPathValidator.validatePath.mockResolvedValue({
      ok: true,
      value: '/workspace/nonexistent.js'
    });

    const fsError = new Error('ENOENT: no such file or directory');
    vi.mocked(fs.readFile).mockRejectedValue(fsError);

    const result = await fileManager.readFile('nonexistent.js');

    expect(result.ok).toBe(false);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'File system operation failed',
      expect.objectContaining({
        filepath: '/workspace/nonexistent.js',
        operation: 'read',
        error: fsError.message
      })
    );
  });
});