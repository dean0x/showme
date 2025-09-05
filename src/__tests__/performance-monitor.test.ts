import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PerformanceMonitor, performanceMonitor, withTiming, withAsyncTiming } from '../utils/performance-monitor.js';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockLogger: { debug: () => void; info: () => void; warn: () => void; error: () => void };

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };
    monitor = new PerformanceMonitor(mockLogger);
  });

  describe('Timer operations', () => {
    it('should start and end timer correctly', () => {
      const operationId = 'test-op-1';
      const operation = 'test-operation';
      const category = 'testing';

      monitor.startTimer(operationId, operation, category);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Performance timer started',
        expect.objectContaining({
          operationId,
          operation,
          category,
          startTime: expect.any(Number)
        })
      );

      const metric = monitor.endTimer(operationId, operation, category, { test: true });
      
      expect(metric.operation).toBe(operation);
      expect(metric.category).toBe(category);
      expect(metric.duration).toBeGreaterThan(0);
      expect(metric.metadata).toEqual({ test: true });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          operation,
          category,
          duration: expect.any(Number),
          metadata: { test: true }
        })
      );
    });

    it('should handle missing timer gracefully', () => {
      const metric = monitor.endTimer('missing-timer', 'test-op', 'test-category');
      
      expect(metric.duration).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Performance timer not found for operation',
        expect.objectContaining({
          operationId: 'missing-timer',
          operation: 'test-op'
        })
      );
    });
  });

  describe('Synchronous timing', () => {
    it('should time synchronous operations', () => {
      const testFn = vi.fn(() => 'result');
      
      const result = monitor.time('sync-op', 'sync-category', testFn, { sync: true });
      
      expect(result).toBe('result');
      expect(testFn).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          operation: 'sync-op',
          category: 'sync-category',
          metadata: { sync: true }
        })
      );
    });

    it('should handle synchronous operation errors', () => {
      const error = new Error('Sync operation failed');
      const testFn = vi.fn(() => {
        throw error;
      });

      expect(() => {
        monitor.time('sync-error-op', 'error-category', testFn);
      }).toThrow(error);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          operation: 'sync-error-op',
          category: 'error-category',
          metadata: expect.objectContaining({
            error: 'Sync operation failed'
          })
        })
      );
    });
  });

  describe('Asynchronous timing', () => {
    it('should time asynchronous operations', async () => {
      const testFn = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async-result';
      });

      const result = await monitor.timeAsync('async-op', 'async-category', testFn, { async: true });

      expect(result).toBe('async-result');
      expect(testFn).toHaveBeenCalledOnce();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          operation: 'async-op',
          category: 'async-category',
          metadata: { async: true }
        })
      );
    });

    it('should handle asynchronous operation errors', async () => {
      const error = new Error('Async operation failed');
      const testFn = vi.fn(async () => {
        throw error;
      });

      await expect(
        monitor.timeAsync('async-error-op', 'error-category', testFn)
      ).rejects.toThrow(error);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Performance metric recorded',
        expect.objectContaining({
          operation: 'async-error-op',
          category: 'error-category',
          metadata: expect.objectContaining({
            error: 'Async operation failed'
          })
        })
      );
    });
  });

  describe('Benchmarking', () => {
    it('should run benchmarks correctly', async () => {
      let counter = 0;
      const benchmarkFn = (): number => {
        counter++;
        return counter;
      };

      const result = await monitor.benchmark('benchmark-op', benchmarkFn, {
        runs: 10,
        warmupRuns: 2,
        metadata: { test: 'benchmark' }
      });

      expect(result.operation).toBe('benchmark-op');
      expect(result.runs).toBe(10);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeGreaterThanOrEqual(0);
      expect(result.maxTime).toBeGreaterThanOrEqual(result.minTime);
      expect(result.throughputPerSecond).toBeGreaterThan(0);
      expect(counter).toBe(12); // 10 runs + 2 warmup runs

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting benchmark',
        expect.objectContaining({
          operation: 'benchmark-op',
          runs: 10,
          warmupRuns: 2
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Benchmark completed',
        expect.objectContaining({
          operation: 'benchmark-op',
          runs: 10,
          metadata: { test: 'benchmark' }
        })
      );
    });

    it('should benchmark async operations', async () => {
      const asyncFn = async (): Promise<string> => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return 'done';
      };

      const result = await monitor.benchmark('async-benchmark', asyncFn, { runs: 5, warmupRuns: 1 });

      expect(result.operation).toBe('async-benchmark');
      expect(result.runs).toBe(5);
      expect(result.averageTime).toBeGreaterThan(0);
    });
  });

  describe('Performance thresholds', () => {
    it('should set and check thresholds', () => {
      const threshold = {
        operation: 'slow-op',
        warningThreshold: 100,
        errorThreshold: 200
      };

      monitor.setThreshold(threshold);
      expect(mockLogger.debug).toHaveBeenCalledWith('Performance threshold set', threshold);

      // Test thresholds by directly creating a slow metric
      const slowOperation = (): void => {
        // Simulate work that takes time
        const start = Date.now();
        while (Date.now() - start < 150) {
          // Busy wait to create actual delay
        }
      };

      monitor.time('slow-op', 'test', slowOperation);

      // Check that warning was logged (timing will vary, but should exceed 100ms)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Performance threshold exceeded (warning)',
        expect.objectContaining({
          operation: 'slow-op',
          threshold: 100
        })
      );
    });

    it('should trigger error threshold', () => {
      const threshold = {
        operation: 'very-slow-op',
        warningThreshold: 100,
        errorThreshold: 200
      };

      monitor.setThreshold(threshold);

      // Test error thresholds with actual slow operation
      const verySlowOperation = (): void => {
        const start = Date.now();
        while (Date.now() - start < 250) {
          // Busy wait to exceed error threshold
        }
      };

      monitor.time('very-slow-op', 'test', verySlowOperation);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Performance threshold exceeded (error)',
        expect.objectContaining({
          operation: 'very-slow-op',
          threshold: 200
        })
      );
    });
  });

  describe('Metrics retrieval', () => {
    beforeEach(() => {
      // Add some test metrics
      monitor.time('op1', 'category1', () => 'result1');
      monitor.time('op2', 'category1', () => 'result2');
      monitor.time('op1', 'category2', () => 'result3');
    });

    it('should get all metrics when no filters provided', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(3);
    });

    it('should filter metrics by operation', () => {
      const metrics = monitor.getMetrics('op1');
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.operation === 'op1')).toBe(true);
    });

    it('should filter metrics by category', () => {
      const metrics = monitor.getMetrics(undefined, 'category1');
      expect(metrics).toHaveLength(2);
      expect(metrics.every(m => m.category === 'category1')).toBe(true);
    });

    it('should filter metrics by both operation and category', () => {
      const metrics = monitor.getMetrics('op1', 'category2');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('op1');
      expect(metrics[0].category).toBe('category2');
    });
  });

  describe('Statistics calculation', () => {
    it('should calculate statistics correctly', () => {
      // Add multiple metrics with known durations
      vi.spyOn(performance, 'now')
        .mockReturnValueOnce(1000).mockReturnValueOnce(1010) // 10ms
        .mockReturnValueOnce(2000).mockReturnValueOnce(2020) // 20ms
        .mockReturnValueOnce(3000).mockReturnValueOnce(3005) // 5ms
        .mockReturnValueOnce(4000).mockReturnValueOnce(4030) // 30ms
        .mockReturnValueOnce(5000).mockReturnValueOnce(5015); // 15ms

      monitor.time('test-stats', 'test', () => 'r1');
      monitor.time('test-stats', 'test', () => 'r2');
      monitor.time('test-stats', 'test', () => 'r3');
      monitor.time('test-stats', 'test', () => 'r4');
      monitor.time('test-stats', 'test', () => 'r5');

      const stats = monitor.getStats('test-stats');
      
      expect(stats).toBeTruthy();
      expect(stats!.count).toBe(5);
      expect(stats!.totalTime).toBe(80); // 10+20+5+30+15
      expect(stats!.averageTime).toBe(16); // 80/5
      expect(stats!.minTime).toBe(5);
      expect(stats!.maxTime).toBe(30);
      expect(stats!.p50).toBe(15); // median of [5,10,15,20,30]
    });

    it('should return null for unknown operation', () => {
      const stats = monitor.getStats('unknown-operation');
      expect(stats).toBeNull();
    });
  });

  describe('Clear metrics', () => {
    it('should clear all metrics', () => {
      monitor.time('test-clear', 'test', () => 'result');
      expect(monitor.getMetrics()).toHaveLength(1);

      monitor.clearMetrics();
      expect(monitor.getMetrics()).toHaveLength(0);
      expect(mockLogger.debug).toHaveBeenCalledWith('Performance metrics cleared');
    });
  });
});

describe('Global performance monitor', () => {
  it('should provide global instance', () => {
    expect(performanceMonitor).toBeInstanceOf(PerformanceMonitor);
  });
});

describe('Performance wrappers', () => {
  it('should time sync methods with wrapper', () => {
    const originalMethod = (value: string): string => `processed: ${value}`;
    const timedMethod = withTiming('sync-method', 'test-category', originalMethod);
    
    const result = timedMethod('test');
    
    expect(result).toBe('processed: test');
    
    // Check that metrics were recorded
    const metrics = performanceMonitor.getMetrics('sync-method');
    expect(metrics.length).toBeGreaterThan(0);
  });

  it('should time async methods with wrapper', async () => {
    const originalMethod = async (value: string): Promise<string> => {
      await new Promise(resolve => global.setTimeout(resolve, 1));
      return `async-processed: ${value}`;
    };
    const timedMethod = withAsyncTiming('async-method', 'test-category', originalMethod);
    
    const result = await timedMethod('test');
    
    expect(result).toBe('async-processed: test');
    
    // Check that metrics were recorded
    const metrics = performanceMonitor.getMetrics('async-method');
    expect(metrics.length).toBeGreaterThan(0);
  });
});