import { describe, it, expect } from 'vitest';
import { createServer, startServer } from '../index.js';

describe('MCP Server Structure', () => {
  it('should create server instance without throwing', () => {
    expect(() => createServer()).not.toThrow();
  });

  it('should declare tools capability', () => {
    const server = createServer();
    expect(server).toBeDefined();
    // Access server capabilities - this will fail initially
    expect(server.capabilities?.tools).toBeDefined();
  });

  it('should connect to stdio transport without throwing', async () => {
    // This will fail initially since startServer doesn't exist
    expect(() => startServer()).not.toThrow();
  });

  it('should expose empty tools capability initially', () => {
    const server = createServer();
    
    // Verify capabilities structure includes tools capability
    expect(server.capabilities.tools).toEqual({});
  });
});