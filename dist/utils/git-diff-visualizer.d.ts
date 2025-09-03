import { type Result } from './path-validator.js';
import { type Logger } from './logger.js';
import { GitDiffGenerator, type DiffResult, type DiffOptions, GitDiffError } from './git-diff-generator.js';
import { GitDetectionError } from './git-detector.js';
/**
 * Git diff visualization errors
 */
export declare class GitDiffVisualizationError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Visualization options for diff2html
 */
export interface VisualizationOptions {
    outputFormat?: 'line-by-line' | 'side-by-side';
    colorScheme?: 'dark' | 'light';
    matching?: 'lines' | 'words' | 'none';
    maxLineLengthHighlight?: number;
    drawFileList?: boolean;
    fileListToggle?: boolean;
    fileListStartVisible?: boolean;
    fileContentToggle?: boolean;
    highlight?: boolean;
    synchronisedScroll?: boolean;
    compiledTemplates?: object;
}
/**
 * Complete diff visualization result
 */
export interface DiffVisualizationResult {
    diffResult: DiffResult;
    html: string;
    stats: {
        renderTime: number;
        htmlLength: number;
    };
}
/**
 * Git diff visualizer using diff2html
 * Follows engineering principles:
 * - Uses Result types for error handling
 * - Accepts Logger and GitDiffGenerator dependency injection
 * - Structured logging with context
 * - Performance monitoring
 */
export declare class GitDiffVisualizer {
    private readonly diffGenerator;
    private readonly logger;
    constructor(diffGenerator: GitDiffGenerator, logger?: Logger);
    /**
     * Factory method for creating GitDiffVisualizer instances
     */
    static create(logger?: Logger): GitDiffVisualizer;
    /**
     * Visualize git diff with HTML output
     */
    visualizeDiff(workingPath: string, options: DiffOptions, visualizationOptions?: VisualizationOptions): Promise<Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>>;
    /**
     * Render diff result to HTML using diff2html
     */
    private renderDiffToHtml;
    /**
     * Escape HTML to prevent XSS injection
     */
    private escapeHtml;
    /**
     * Build complete HTML document for diff visualization
     */
    private buildDiffHtmlDocument;
    /**
     * Visualize staged changes
     */
    visualizeStagedDiff(workingPath: string, paths?: string[], visualizationOptions?: VisualizationOptions): Promise<Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>>;
    /**
     * Visualize unstaged changes
     */
    visualizeUnstagedDiff(workingPath: string, paths?: string[], visualizationOptions?: VisualizationOptions): Promise<Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>>;
    /**
     * Visualize commit diff
     */
    visualizeCommitDiff(workingPath: string, commitHash?: string, paths?: string[], visualizationOptions?: VisualizationOptions): Promise<Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>>;
    /**
     * Visualize branch diff
     */
    visualizeBranchDiff(workingPath: string, baseBranch?: string, paths?: string[], visualizationOptions?: VisualizationOptions): Promise<Result<DiffVisualizationResult, GitDiffError | GitDetectionError | GitDiffVisualizationError>>;
}
