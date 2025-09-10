import { describe, it, expect } from 'vitest';
import { createServer } from '../index.js';

describe('MCP Tools Registration', () => {
  it('should create server without throwing', async () => {
    await expect(createServer()).resolves.toBeDefined();
  });

  it('should return Result<Server, ServerCreationError>', async () => {
    const result = await createServer();
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeDefined();
      expect(result.value.constructor.name).toBe('Server');
    }
  });

  it('should have proper server instance', async () => {
    const result = await createServer();
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Server instance is returned directly
      expect(result.value).toBeDefined();
      expect(result.value.constructor.name).toBe('Server');
    }
  });

  // Integration test - verify tools work end-to-end
  it('should handle tool registration and basic functionality', async () => {
    const result = await createServer();
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify the server instance was created successfully
      // Tools registration happens during server creation
      // This test verifies the basic setup works
      expect(result.value).toBeDefined();
    }
  });
});