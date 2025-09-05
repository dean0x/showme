import { HTTPServer } from '../server/http-server.js';
import { GitDetector } from '../utils/git-detector.js';
import { GitDiffGenerator } from '../utils/git-diff-generator.js';
import { GitDiffVisualizer } from '../utils/git-diff-visualizer.js';
import { type Logger } from '../utils/logger.js';
/**
 * Show diff handler errors
 */
export declare class ShowDiffError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Show diff request arguments
 */
export interface ShowDiffRequest {
    base?: string;
    target?: string;
    files?: string[];
}
/**
 * MCP response format
 */
export interface MCPResponse {
    [key: string]: unknown;
    content: Array<{
        type: 'text';
        text: string;
    }>;
}
/**
 * Handler for showme.diff MCP tool with multi-file selection support
 * Following engineering principles: DI, pipe composition, Result types
 */
export declare class ShowDiffHandler {
    private readonly httpServer;
    private readonly gitDetector;
    private readonly gitDiffGenerator;
    private readonly gitDiffVisualizer;
    private readonly logger;
    constructor(httpServer: HTTPServer, gitDetector: GitDetector, gitDiffGenerator: GitDiffGenerator, gitDiffVisualizer: GitDiffVisualizer, logger?: Logger);
    /**
     * Factory method that creates handler with default dependencies
     * Provides backward compatibility
     */
    static create(httpServer: HTTPServer, logger?: Logger): ShowDiffHandler;
    /**
     * Handle showme.diff request using pipe composition
     */
    handleDiffRequest(args: ShowDiffRequest): Promise<MCPResponse>;
    /**
     * Detect git repository
     */
    private detectRepository;
    /**
     * Generate git diff based on parameters
     */
    private generateDiff;
    /**
     * Visualize diff as HTML
     */
    private visualizeDiff;
    /**
     * Serve HTML via HTTP server
     */
    private serveHTML;
    /**
     * Format success response with statistics
     */
    private formatSuccessResponse;
    /**
     * Format error response
     */
    private formatErrorResponse;
}
