import { type Logger } from './logger.js';
/**
 * Resource lifecycle management following Engineering Principle #7
 */
export interface Disposable {
    dispose(): Promise<void>;
}
/**
 * Centralized resource manager for tracking and cleaning up disposable resources
 * Following dispose pattern for proper resource cleanup
 */
export declare class ResourceManager {
    private readonly logger;
    private resources;
    constructor(logger?: Logger);
    /**
     * Register a disposable resource for automatic cleanup
     */
    register<T extends Disposable>(resource: T): T;
    /**
     * Get count of active (registered) resources
     */
    getActiveResources(): number;
    /**
     * Dispose all registered resources in reverse order (LIFO)
     * Continue cleanup even if individual resources fail
     */
    disposeAll(): Promise<void>;
}
