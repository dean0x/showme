import { type Logger } from './logger.js';
import { type Result } from './path-validator.js';
/**
 * Browser opening error
 */
export declare class BrowserOpenError extends Error {
    code: string;
    constructor(message: string, code: string, cause?: Error);
}
/**
 * Environment detection and browser opening utility
 * Following engineering principle #2: Dependency injection for testing
 */
export declare class BrowserOpener {
    private readonly logger;
    constructor(logger: Logger);
    /**
     * Detect if we're running in a container environment
     */
    private isContainerEnvironment;
    /**
     * Check if browser auto-opening is disabled
     */
    private isAutoOpenDisabled;
    /**
     * Attempt to open URL in browser with graceful degradation
     */
    openInBrowser(url: string): Promise<Result<{
        opened: boolean;
        method: string;
    }, BrowserOpenError>>;
    /**
     * Generate user-friendly message based on opening result
     */
    generateOpenMessage(url: string, result: {
        opened: boolean;
        method: string;
    }): string;
}
