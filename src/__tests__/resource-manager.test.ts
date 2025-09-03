import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceManager, type Disposable } from '../utils/resource-manager.js';

describe('ResourceManager', () => {
  let resourceManager: ResourceManager;
  let mockDisposable: Disposable;

  beforeEach(() => {
    resourceManager = new ResourceManager();
    mockDisposable = {
      dispose: vi.fn().mockResolvedValue(undefined)
    };
  });

  describe('resource registration', () => {
    it('should register disposable resources', () => {
      const registered = resourceManager.register(mockDisposable);
      
      expect(registered).toBe(mockDisposable);
      expect(resourceManager.getActiveResources()).toBe(1);
    });

    it('should track multiple registered resources', () => {
      const resource1 = { dispose: vi.fn().mockResolvedValue(undefined) };
      const resource2 = { dispose: vi.fn().mockResolvedValue(undefined) };
      
      resourceManager.register(resource1);
      resourceManager.register(resource2);
      
      expect(resourceManager.getActiveResources()).toBe(2);
    });

    it('should handle duplicate registrations', () => {
      resourceManager.register(mockDisposable);
      resourceManager.register(mockDisposable);
      
      // Should only register once
      expect(resourceManager.getActiveResources()).toBe(1);
    });
  });

  describe('resource cleanup', () => {
    it('should dispose all registered resources', async () => {
      const resource1 = { dispose: vi.fn().mockResolvedValue(undefined) };
      const resource2 = { dispose: vi.fn().mockResolvedValue(undefined) };
      
      resourceManager.register(resource1);
      resourceManager.register(resource2);
      
      await resourceManager.disposeAll();
      
      expect(resource1.dispose).toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalled();
      expect(resourceManager.getActiveResources()).toBe(0);
    });

    it('should dispose resources in reverse order (LIFO)', async () => {
      const disposeOrder: number[] = [];
      const resource1 = { dispose: vi.fn().mockImplementation(() => disposeOrder.push(1)) };
      const resource2 = { dispose: vi.fn().mockImplementation(() => disposeOrder.push(2)) };
      
      resourceManager.register(resource1);
      resourceManager.register(resource2);
      
      await resourceManager.disposeAll();
      
      expect(disposeOrder).toEqual([2, 1]); // Last registered, first disposed
    });

    it('should handle disposal errors gracefully', async () => {
      const resource1 = { dispose: vi.fn().mockRejectedValue(new Error('Dispose failed')) };
      const resource2 = { dispose: vi.fn().mockResolvedValue(undefined) };
      
      resourceManager.register(resource1);
      resourceManager.register(resource2);
      
      // Should not throw, should continue with other cleanups
      await expect(resourceManager.disposeAll()).resolves.not.toThrow();
      
      expect(resource1.dispose).toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalled();
      expect(resourceManager.getActiveResources()).toBe(0);
    });

    it('should be idempotent - multiple disposeAll calls safe', async () => {
      resourceManager.register(mockDisposable);
      
      await resourceManager.disposeAll();
      await resourceManager.disposeAll(); // Second call should be safe
      
      expect(mockDisposable.dispose).toHaveBeenCalledTimes(1);
      expect(resourceManager.getActiveResources()).toBe(0);
    });
  });

  describe('integration with existing components', () => {
    it('should integrate with HTTPServer lifecycle', async () => {
      const { HTTPServer } = await import('../server/http-server.js');
      const { getAvailablePort } = await import('./test-utils.js');
      
      const port = await getAvailablePort();
      const httpServer = new HTTPServer(port);
      
      // Register with resource manager
      const registeredServer = resourceManager.register(httpServer);
      
      // Start server
      const startResult = await registeredServer.start();
      expect(startResult.ok).toBe(true);
      expect(resourceManager.getActiveResources()).toBe(1);
      
      // Dispose through resource manager should clean up server
      await resourceManager.disposeAll();
      expect(resourceManager.getActiveResources()).toBe(0);
    });

    it('should integrate with HTMLGenerator lifecycle', async () => {
      const { HTMLGenerator } = await import('../utils/html-generator.js');
      
      const generatorResult = await HTMLGenerator.create();
      expect(generatorResult.ok).toBe(true);
      
      if (!generatorResult.ok) return;
      const generator = resourceManager.register(generatorResult.value);
      
      expect(resourceManager.getActiveResources()).toBe(1);
      
      // Dispose through resource manager
      await resourceManager.disposeAll();
      expect(resourceManager.getActiveResources()).toBe(0);
    });

    it('should handle mixed resource types', async () => {
      const { HTTPServer } = await import('../server/http-server.js');
      const { HTMLGenerator } = await import('../utils/html-generator.js');
      const { getAvailablePort } = await import('./test-utils.js');
      
      // Register multiple different resource types
      const port = await getAvailablePort();
      const httpServer = resourceManager.register(new HTTPServer(port));
      
      const generatorResult = await HTMLGenerator.create();
      expect(generatorResult.ok).toBe(true);
      if (!generatorResult.ok) return;
      
      const htmlGenerator = resourceManager.register(generatorResult.value);
      
      expect(resourceManager.getActiveResources()).toBe(2);
      
      // Start HTTP server
      const startResult = await httpServer.start();
      expect(startResult.ok).toBe(true);
      
      // Dispose all resources
      await resourceManager.disposeAll();
      expect(resourceManager.getActiveResources()).toBe(0);
    });
  });
});