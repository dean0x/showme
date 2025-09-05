/**
 * Get an available port for testing
 * Following engineering principle #7: Resource cleanup
 */
export declare function getAvailablePort(): Promise<number>;
/**
 * Create multiple unique ports for parallel testing
 */
export declare function getAvailablePorts(count: number): Promise<number[]>;
