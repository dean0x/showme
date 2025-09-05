import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShowDiffHandler } from '../handlers/show-diff-handler.js';
import { HTTPServer } from '../server/http-server.js';
import { type Logger } from '../utils/logger.js';
import { getAvailablePort } from './test-utils.js';

describe('ShowDiff Integration', () => {
  let mockLogger: Logger;
  let httpServer: HTTPServer;
  let handler: ShowDiffHandler;

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

    handler = ShowDiffHandler.create(httpServer, mockLogger);
  });

  afterEach(async () => {
    await httpServer?.dispose();
  });

  it('should handle showme.diff request for working directory changes', async () => {
    const args = {};
    
    const result = await handler.handleDiffRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/Git diff opened in browser/)
        })
      ]
    });
  });

  it('should handle showme.diff request with multi-file selection', async () => {
    const args = {
      files: ['src/utils/logger.ts', 'src/utils/file-manager.ts']
    };
    
    const result = await handler.handleDiffRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/Git diff opened in browser.*2 files/)
        })
      ]
    });
  });

  it('should handle showme.diff request with base and target commits', async () => {
    const args = {
      base: 'HEAD~1',
      target: 'HEAD'
    };
    
    const result = await handler.handleDiffRequest(args);
    
    expect(result).toEqual({
      content: [
        expect.objectContaining({
          type: 'text',
          text: expect.stringMatching(/Git diff opened in browser.*HEAD~1.*HEAD/)
        })
      ]
    });
  });

  it('should handle non-git repository errors', async () => {
    // Mock a non-git directory by changing to /tmp
    const originalCwd = process.cwd();
    process.chdir('/tmp');
    
    try {
      const args = {};
      const result = await handler.handleDiffRequest(args);
      
      expect(result).toEqual({
        content: [
          expect.objectContaining({
            type: 'text',
            text: expect.stringMatching(/Error.*Git repository detection failed.*Not a git repository/)
          })
        ]
      });
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('should use dependency injection pattern', () => {
    expect(handler.constructor.length).toBeGreaterThanOrEqual(1);
    expect(() => new ShowDiffHandler(httpServer)).not.toThrow();
  });
});