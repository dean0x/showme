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
      // Server instance has setRequestHandler for tools
      expect(typeof result.value.setRequestHandler).toBe('function');
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
      // Verify server has request handler for tools
      expect(typeof server.setRequestHandler).toBe('function');
      expect(typeof server.connect).toBe('function');
    }
  });
});