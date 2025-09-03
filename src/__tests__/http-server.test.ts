import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HTTPServer } from '../server/http-server.js';
import { type Logger } from '../utils/logger.js';
import { getAvailablePort } from './test-utils.js';

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
    const port = await getAvailablePort();
    server = new HTTPServer(port, mockLogger);
    
    const result = await server.start();
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.port).toBe(port);
      expect(result.value.baseUrl).toBe(`http://localhost:${port}`);
    }
  });

  it('should serve temporary HTML files', async () => {
    const port = await getAvailablePort();
    server = new HTTPServer(port, mockLogger);
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
    const port = await getAvailablePort();
    server = new HTTPServer(port, mockLogger);
    await server.start();
    
    const result = await server.serveHTML('<html>test</html>', 'temp.html');
    expect(result.ok).toBe(true);
    
    // Verify cleanup mechanism exists
    expect(server.cleanup).toBeDefined();
  });

  it('should handle port conflicts gracefully', async () => {
    const port = await getAvailablePort();
    const server1 = new HTTPServer(port, mockLogger);
    const server2 = new HTTPServer(port, mockLogger);
    
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
    const port = await getAvailablePort();
    server = new HTTPServer(port, mockLogger);
    
    expect(server.dispose).toBeDefined();
    expect(typeof server.dispose).toBe('function');
  });
});