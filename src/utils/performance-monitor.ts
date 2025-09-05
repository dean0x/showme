/**
 * Centralized performance monitoring system for ShowMe MCP
 * Following engineering principles:
 * - Always use Result types (never throw)
 * - Inject dependencies (Logger)
 * - Type everything
 * - Structured logging
 * - Performance matters - measure, benchmark, optimize
 */

import { type Logger, ConsoleLogger } from './logger.js';

declare const performance: {
  now(): number;
};

/**
 * Performance metric data
 */
export interface PerformanceMetric {
  readonly operation: string;
  readonly category: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Performance benchmark result
 */
export interface BenchmarkResult {
  readonly operation: string;
  readonly runs: number;
  readonly totalTime: number;
  readonly averageTime: number;
  readonly minTime: number;
  readonly maxTime: number;
  readonly standardDeviation: number;
  readonly throughputPerSecond: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  readonly operation: string;
  readonly warningThreshold: number; // milliseconds
  readonly errorThreshold: number; // milliseconds
}

/**
 * Centralized performance monitoring system
 */
export class PerformanceMonitor {
  private readonly metrics: PerformanceMetric[] = [];
  private readonly thresholds = new Map<string, PerformanceThreshold>();
  private readonly activeOperations = new Map<string, number>();

  constructor(private readonly logger: Logger = new ConsoleLogger()) {}

  /**
   * Start timing an operation
   */
  startTimer(operationId: string, operation: string, category: string): void {
    const startTime = performance.now();
    this.activeOperations.set(operationId, startTime);
    
    this.logger.debug('Performance timer started', {
      operationId,
      operation,
      category,
      startTime
    });
  }

  /**
   * End timing and record metric
   */
  endTimer(
    operationId: string, 
    operation: string, 
    category: string, 
    metadata?: Record<string, unknown>
  ): PerformanceMetric {
    const endTime = performance.now();
    const startTime = this.activeOperations.get(operationId);
    
    if (startTime === undefined) {
      this.logger.warn('Performance timer not found for operation', {
        operationId,
        operation
      });
      // Return synthetic metric
      return {
        operation,
        category,
        startTime: endTime,
        endTime,
        duration: 0,
        metadata
      };
    }

    this.activeOperations.delete(operationId);
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      operation,
      category,
      startTime,
      endTime,
      duration,
      metadata
    };

    this.metrics.push(metric);
    this.checkThresholds(metric);

    this.logger.info('Performance metric recorded', {
      operation,
      category,
      duration,
      metadata
    });

    return metric;
  }

  /**
   * Time a synchronous operation
   */
  time<T>(
    operation: string,
    category: string,
    fn: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const operationId = `${operation}-${Date.now()}-${Math.random()}`;
    this.startTimer(operationId, operation, category);
    
    try {
      const result = fn();
      this.endTimer(operationId, operation, category, metadata);
      return result;
    } catch (error) {
      this.endTimer(operationId, operation, category, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Time an asynchronous operation
   */
  async timeAsync<T>(
    operation: string,
    category: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const operationId = `${operation}-${Date.now()}-${Math.random()}`;
    this.startTimer(operationId, operation, category);
    
    try {
      const result = await fn();
      this.endTimer(operationId, operation, category, metadata);
      return result;
    } catch (error) {
      this.endTimer(operationId, operation, category, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Run benchmark on an operation
   */
  async benchmark<T>(
    operation: string,
    fn: () => Promise<T> | T,
    options: {
      runs?: number;
      warmupRuns?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<BenchmarkResult> {
    const { runs = 100, warmupRuns = 10, metadata } = options;
    const times: number[] = [];

    this.logger.info('Starting benchmark', {
      operation,
      runs,
      warmupRuns
    });

    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      await fn();
    }

    // Actual benchmark runs
    for (let i = 0; i < runs; i++) {
      const startTime = performance.now();
      await fn();
      const duration = performance.now() - startTime;
      times.push(duration);
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / runs;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    // Calculate standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / runs;
    const standardDeviation = Math.sqrt(variance);
    
    const throughputPerSecond = 1000 / averageTime;

    const result: BenchmarkResult = {
      operation,
      runs,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      throughputPerSecond
    };

    this.logger.info('Benchmark completed', {
      ...result,
      metadata
    });

    return result;
  }

  /**
   * Set performance threshold for an operation
   */
  setThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.operation, threshold);
    
    this.logger.debug('Performance threshold set', threshold as unknown as Record<string, unknown>);
  }

  /**
   * Get all metrics for an operation
   */
  getMetrics(operation?: string, category?: string): PerformanceMetric[] {
    return this.metrics.filter(metric => 
      (!operation || metric.operation === operation) &&
      (!category || metric.category === category)
    );
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation: string): {
    count: number;
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const metrics = this.getMetrics(operation);
    
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const totalTime = durations.reduce((sum, d) => sum + d, 0);
    const averageTime = totalTime / count;
    const minTime = durations[0];
    const maxTime = durations[count - 1];
    
    const p50Index = Math.floor(count * 0.5);
    const p95Index = Math.floor(count * 0.95);
    const p99Index = Math.floor(count * 0.99);
    
    return {
      count,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      p50: durations[p50Index],
      p95: durations[p95Index],
      p99: durations[p99Index]
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.length = 0;
    this.logger.debug('Performance metrics cleared');
  }

  /**
   * Check if metric exceeds thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    const threshold = this.thresholds.get(metric.operation);
    
    if (!threshold) {
      return;
    }

    if (metric.duration >= threshold.errorThreshold) {
      this.logger.error('Performance threshold exceeded (error)', {
        operation: metric.operation,
        duration: metric.duration,
        threshold: threshold.errorThreshold
      });
    } else if (metric.duration >= threshold.warningThreshold) {
      this.logger.warn('Performance threshold exceeded (warning)', {
        operation: metric.operation,
        duration: metric.duration,
        threshold: threshold.warningThreshold
      });
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Simple timing wrapper functions (decorators not working in current TS setup)
 */
export function withTiming<T extends (...args: unknown[]) => unknown>(
  operation: string,
  category: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    return performanceMonitor.time(operation, category, () => fn(...args));
  }) as T;
}

export function withAsyncTiming<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: string,
  category: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    return performanceMonitor.timeAsync(operation, category, () => fn(...args));
  }) as T;
}