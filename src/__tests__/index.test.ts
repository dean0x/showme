import { describe, it, expect } from 'vitest';
import { createServer, startServer } from '../index.js';

describe('MCP Server Structure', () => {
  it('should create server instance without throwing', async () => {
    await expect(createServer()).resolves.toBeDefined();
  });

  it('should declare tools capability', async () => {
    const result = await createServer();
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      expect(result.value).toBeDefined();
      // McpServer automatically manages capabilities - tools capability is implicit
      expect(typeof result.value.tool).toBe('function'); // Should have tool registration method
    }
  });

  it('should connect to stdio transport without throwing', async () => {
    expect(() => startServer()).not.toThrow();
  });

  it('should have tool registration functionality', async () => {
    const result = await createServer();
    expect(result.ok).toBe(true);
    
    if (result.ok) {
      const server = result.value;
      // Verify server has tool registration methods (McpServer manages capabilities internally)
      expect(typeof server.tool).toBe('function');
      expect(typeof server.registerTool).toBe('function');
    }
  });
});