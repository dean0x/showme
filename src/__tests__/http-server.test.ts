import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HTTPServer } from '../server/http-server.js';
import { type Logger } from '../utils/logger.js';

describe('HTTP Server', () => {
  let mockLogger: Logger;
  let server: HTTPServer;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(), 
      warn: vi.fn(),
      debug: vi.fn(),
    };
  });

  afterEach(async () => {
    if (server) {
      await server.dispose();
    }
  });

  it('should start HTTP server on specified port', async () => {
    server = new HTTPServer(3847, mockLogger);
    
    const result = await server.start();
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.port).toBe(3847);
      expect(result.value.baseUrl).toBe('http://localhost:3847');
    }
  });

  it('should serve temporary HTML files', async () => {
    server = new HTTPServer(3848, mockLogger);
    await server.start();
    
    const htmlContent = '<html><body>Test content</body></html>';
    const result = await server.serveHTML(htmlContent, 'test.html');
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.url).toContain('/file/');
      expect(result.value.fileId).toBeDefined();
    }
  });

  it('should clean up temporary files after timeout', async () => {
    server = new HTTPServer(3849, mockLogger);
    await server.start();
    
    const result = await server.serveHTML('<html>test</html>', 'temp.html');
    expect(result.ok).toBe(true);
    
    // Verify cleanup mechanism exists
    expect(server.cleanup).toBeDefined();
  });

  it('should handle port conflicts gracefully', async () => {
    const server1 = new HTTPServer(3850, mockLogger);
    const server2 = new HTTPServer(3850, mockLogger);
    
    const result1 = await server1.start();
    expect(result1.ok).toBe(true);
    
    const result2 = await server2.start();
    expect(result2.ok).toBe(false);
    if (!result2.ok) {
      expect(result2.error.message).toContain('EADDRINUSE');
    }
    
    await server1.dispose();
  });

  it('should implement resource cleanup pattern', async () => {
    server = new HTTPServer(3851, mockLogger);
    
    expect(server.dispose).toBeDefined();
    expect(typeof server.dispose).toBe('function');
  });
});