import { ConsoleLogger } from './logger.js';
/**
 * Centralized resource manager for tracking and cleaning up disposable resources
 * Following dispose pattern for proper resource cleanup
 */
export class ResourceManager {
    logger;
    resources = new Set();
    constructor(logger = new ConsoleLogger()) {
        this.logger = logger;
    }
    /**
     * Register a disposable resource for automatic cleanup
     */
    register(resource) {
        this.resources.add(resource);
        return resource;
    }
    /**
     * Get count of active (registered) resources
     */
    getActiveResources() {
        return this.resources.size;
    }
    /**
     * Dispose all registered resources in reverse order (LIFO)
     * Continue cleanup even if individual resources fail
     */
    async disposeAll() {
        const resourceArray = Array.from(this.resources).reverse();
        this.logger.debug('Starting resource disposal', { count: resourceArray.length });
        for (const resource of resourceArray) {
            try {
                await resource.dispose();
                this.logger.debug('Resource disposed successfully');
            }
            catch (error) {
                // Log error but continue cleanup
                this.logger.error('Resource disposal failed', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        this.resources.clear();
        this.logger.debug('All resources disposed');
    }
}
