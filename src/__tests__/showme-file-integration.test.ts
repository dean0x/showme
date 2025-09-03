import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShowFileHandler } from '../handlers/show-file-handler.js';
import { HTTPServer } from '../server/http-server.js';
import { type Logger } from '../utils/logger.js';
import { getAvailablePort } from './test-utils.js';

describe('ShowFile Integration', () => {
  let mockLogger: Logger;
  let httpServer: HTTPServer;
  let handler: ShowFileHandler;

  beforeEach(async () => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(), 
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const port = await getAvailablePort();
    httpServer = new HTTPServer(port, mockLogger);
    const startResult = await httpServer.start();
    expect(startResult.ok).toBe(true);

    handler = new ShowFileHandler(httpServer, mockLogger);
  });

  afterEach(async () => {
    await httpServer?.dispose();
  });

  it('should handle showme.file request for TypeScript file', async () => {
    const args = {
      path: 'src/utils/logger.ts'
    };
    
    const result = await handler.handleFileRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/File opened in browser.*logger\.ts/)
        })
      ]
    });
  });

  it('should handle showme.file request with line highlighting', async () => {
    const args = {
      path: 'src/utils/logger.ts',
      line_highlight: 10
    };
    
    const result = await handler.handleFileRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/File opened in browser.*line 10/)
        })
      ]
    });
  });

  it('should handle path validation errors', async () => {
    const args = {
      path: '../../../etc/passwd'
    };
    
    const result = await handler.handleFileRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text', 
          text: expect.stringMatching(/Error.*Path validation failed.*directory traversal/)
        })
      ]
    });
  });

  it('should handle non-existent files', async () => {
    const args = {
      path: 'non-existent-file.txt'
    };
    
    const result = await handler.handleFileRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/Error.*File not accessible/)
        })
      ]
    });
  });

  it('should use dependency injection pattern', () => {
    expect(handler.constructor.length).toBeGreaterThanOrEqual(1);
    expect(() => new ShowFileHandler(httpServer)).not.toThrow();
  });
});