/**
 * Centralized performance monitoring system for ShowMe MCP
 * Following engineering principles:
 * - Always use Result types (never throw)
 * - Inject dependencies (Logger)
 * - Type everything
 * - Structured logging
 * - Performance matters - measure, benchmark, optimize
 */
import { type Logger } from './logger.js';
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
    readonly warningThreshold: number;
    readonly errorThreshold: number;
}
/**
 * Centralized performance monitoring system
 */
export declare class PerformanceMonitor {
    private readonly logger;
    private readonly metrics;
    private readonly thresholds;
    private readonly activeOperations;
    constructor(logger?: Logger);
    /**
     * Start timing an operation
     */
    startTimer(operationId: string, operation: string, category: string): void;
    /**
     * End timing and record metric
     */
    endTimer(operationId: string, operation: string, category: string, metadata?: Record<string, unknown>): PerformanceMetric;
    /**
     * Time a synchronous operation
     */
    time<T>(operation: string, category: string, fn: () => T, metadata?: Record<string, unknown>): T;
    /**
     * Time an asynchronous operation
     */
    timeAsync<T>(operation: string, category: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T>;
    /**
     * Run benchmark on an operation
     */
    benchmark<T>(operation: string, fn: () => Promise<T> | T, options?: {
        runs?: number;
        warmupRuns?: number;
        metadata?: Record<string, unknown>;
    }): Promise<BenchmarkResult>;
    /**
     * Set performance threshold for an operation
     */
    setThreshold(threshold: PerformanceThreshold): void;
    /**
     * Get all metrics for an operation
     */
    getMetrics(operation?: string, category?: string): PerformanceMetric[];
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
    } | null;
    /**
     * Clear all metrics
     */
    clearMetrics(): void;
    /**
     * Check if metric exceeds thresholds
     */
    private checkThresholds;
}
/**
 * Global performance monitor instance
 */
export declare const performanceMonitor: PerformanceMonitor;
/**
 * Simple timing wrapper functions (decorators not working in current TS setup)
 */
export declare function withTiming<T extends (...args: unknown[]) => unknown>(operation: string, category: string, fn: T): T;
export declare function withAsyncTiming<T extends (...args: unknown[]) => Promise<unknown>>(operation: string, category: string, fn: T): T;
