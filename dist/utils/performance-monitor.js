/**
 * Centralized performance monitoring system for ShowMe MCP
 * Following engineering principles:
 * - Always use Result types (never throw)
 * - Inject dependencies (Logger)
 * - Type everything
 * - Structured logging
 * - Performance matters - measure, benchmark, optimize
 */
import { ConsoleLogger } from './logger.js';
/**
 * Centralized performance monitoring system
 */
export class PerformanceMonitor {
    logger;
    metrics = [];
    thresholds = new Map();
    activeOperations = new Map();
    constructor(logger = new ConsoleLogger()) {
        this.logger = logger;
    }
    /**
     * Start timing an operation
     */
    startTimer(operationId, operation, category) {
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
    endTimer(operationId, operation, category, metadata) {
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
        const metric = {
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
    time(operation, category, fn, metadata) {
        const operationId = `${operation}-${Date.now()}-${Math.random()}`;
        this.startTimer(operationId, operation, category);
        try {
            const result = fn();
            this.endTimer(operationId, operation, category, metadata);
            return result;
        }
        catch (error) {
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
    async timeAsync(operation, category, fn, metadata) {
        const operationId = `${operation}-${Date.now()}-${Math.random()}`;
        this.startTimer(operationId, operation, category);
        try {
            const result = await fn();
            this.endTimer(operationId, operation, category, metadata);
            return result;
        }
        catch (error) {
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
    async benchmark(operation, fn, options = {}) {
        const { runs = 100, warmupRuns = 10, metadata } = options;
        const times = [];
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
        const result = {
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
    setThreshold(threshold) {
        this.thresholds.set(threshold.operation, threshold);
        this.logger.debug('Performance threshold set', threshold);
    }
    /**
     * Get all metrics for an operation
     */
    getMetrics(operation, category) {
        return this.metrics.filter(metric => (!operation || metric.operation === operation) &&
            (!category || metric.category === category));
    }
    /**
     * Get performance statistics for an operation
     */
    getStats(operation) {
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
    clearMetrics() {
        this.metrics.length = 0;
        this.logger.debug('Performance metrics cleared');
    }
    /**
     * Check if metric exceeds thresholds
     */
    checkThresholds(metric) {
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
        }
        else if (metric.duration >= threshold.warningThreshold) {
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
export function withTiming(operation, category, fn) {
    return ((...args) => {
        return performanceMonitor.time(operation, category, () => fn(...args));
    });
}
export function withAsyncTiming(operation, category, fn) {
    return ((...args) => {
        return performanceMonitor.timeAsync(operation, category, () => fn(...args));
    });
}
