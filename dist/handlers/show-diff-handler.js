import { GitDetector } from '../utils/git-detector.js';
import { GitDiffGenerator } from '../utils/git-diff-generator.js';
import { GitDiffVisualizer } from '../utils/git-diff-visualizer.js';
import { BrowserOpener } from '../utils/browser-opener.js';
import { pipe } from '../utils/pipe.js';
import { ConsoleLogger } from '../utils/logger.js';
/**
 * Show diff handler errors
 */
export class ShowDiffError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'ShowDiffError';
    }
}
/**
 * Handler for showme.diff MCP tool with multi-file selection support
 * Following engineering principles: DI, pipe composition, Result types
 */
export class ShowDiffHandler {
    httpServer;
    gitDetector;
    gitDiffGenerator;
    gitDiffVisualizer;
    browserOpener;
    logger;
    constructor(httpServer, gitDetector, gitDiffGenerator, gitDiffVisualizer, browserOpener, logger = new ConsoleLogger()) {
        this.httpServer = httpServer;
        this.gitDetector = gitDetector;
        this.gitDiffGenerator = gitDiffGenerator;
        this.gitDiffVisualizer = gitDiffVisualizer;
        this.browserOpener = browserOpener;
        this.logger = logger;
    }
    /**
     * Factory method that creates handler with default dependencies
     * Provides backward compatibility
     */
    static create(httpServer, logger = new ConsoleLogger()) {
        const gitDetector = new GitDetector(logger);
        const gitDiffGenerator = new GitDiffGenerator(gitDetector, logger);
        const gitDiffVisualizer = new GitDiffVisualizer(gitDiffGenerator, logger);
        const browserOpener = new BrowserOpener(logger);
        return new ShowDiffHandler(httpServer, gitDetector, gitDiffGenerator, gitDiffVisualizer, browserOpener, logger);
    }
    /**
     * Handle showme.diff request using pipe composition
     */
    async handleDiffRequest(args) {
        const startTime = performance.now();
        const result = await pipe(this.detectRepository.bind(this), this.generateDiff.bind(this), this.visualizeDiff.bind(this), this.serveHTML.bind(this))({ ...args, workingPath: process.cwd() });
        const duration = performance.now() - startTime;
        this.logger.info('ShowDiff request completed', {
            success: result.ok,
            filesCount: args.files?.length || 0,
            duration: Math.round(duration)
        });
        if (result.ok) {
            // Format success response with browser opening
            return await this.formatSuccessResponse(result.value);
        }
        else {
            return this.formatErrorResponse(result.error);
        }
    }
    /**
     * Detect git repository
     */
    async detectRepository(args) {
        const detectionResult = await this.gitDetector.detectRepository(args.workingPath);
        if (!detectionResult.ok) {
            return {
                ok: false,
                error: new ShowDiffError(`Git repository detection failed: ${detectionResult.error.message}`, detectionResult.error.code)
            };
        }
        const result = {
            workingPath: args.workingPath,
            repository: detectionResult.value
        };
        if (args.base !== undefined)
            result.base = args.base;
        if (args.target !== undefined)
            result.target = args.target;
        if (args.files !== undefined)
            result.files = args.files;
        return {
            ok: true,
            value: result
        };
    }
    /**
     * Generate git diff based on parameters
     */
    async generateDiff(data) {
        let diffResult;
        try {
            if (data.base && data.target) {
                // Commit range diff
                diffResult = await this.gitDiffGenerator.generateDiff(data.workingPath, {
                    type: 'commit-range',
                    base: data.base,
                    target: data.target,
                    paths: data.files
                });
            }
            else if (data.base) {
                // Base to working directory
                diffResult = await this.gitDiffGenerator.getBranchDiff(data.workingPath, data.base, data.files);
            }
            else {
                // Working directory changes (staged + unstaged)
                diffResult = await this.gitDiffGenerator.getUnstagedDiff(data.workingPath, data.files);
            }
            if (!diffResult.ok) {
                return {
                    ok: false,
                    error: new ShowDiffError(`Git diff generation failed: ${diffResult.error.message}`, diffResult.error.code)
                };
            }
            return {
                ok: true,
                value: {
                    ...data,
                    diffResult: diffResult.value
                }
            };
        }
        catch (error) {
            return {
                ok: false,
                error: new ShowDiffError(`Diff generation error: ${error instanceof Error ? error.message : String(error)}`, 'DIFF_GENERATION_ERROR')
            };
        }
    }
    /**
     * Visualize diff as HTML
     */
    async visualizeDiff(data) {
        let visualizationResult;
        try {
            if (data.base && data.target) {
                visualizationResult = await this.gitDiffVisualizer.visualizeCommitDiff(data.workingPath, data.base, data.files);
            }
            else if (data.base) {
                visualizationResult = await this.gitDiffVisualizer.visualizeBranchDiff(data.workingPath, data.base, data.files);
            }
            else {
                visualizationResult = await this.gitDiffVisualizer.visualizeUnstagedDiff(data.workingPath, data.files);
            }
            if (!visualizationResult.ok) {
                return {
                    ok: false,
                    error: new ShowDiffError(`Diff visualization failed: ${visualizationResult.error.message}`, visualizationResult.error.code)
                };
            }
            const result = {
                workingPath: data.workingPath,
                htmlContent: visualizationResult.value.html,
                statistics: visualizationResult.value.diffResult.stats
            };
            if (data.base !== undefined)
                result.base = data.base;
            if (data.target !== undefined)
                result.target = data.target;
            if (data.files !== undefined)
                result.files = data.files;
            return {
                ok: true,
                value: result
            };
        }
        catch (error) {
            return {
                ok: false,
                error: new ShowDiffError(`Visualization error: ${error instanceof Error ? error.message : String(error)}`, 'VISUALIZATION_ERROR')
            };
        }
    }
    /**
     * Serve HTML via HTTP server
     */
    async serveHTML(data) {
        const filename = 'diff.html';
        const serveResult = await this.httpServer.serveHTML(data.htmlContent, filename);
        if (!serveResult.ok) {
            return {
                ok: false,
                error: new ShowDiffError(`Failed to serve diff HTML: ${serveResult.error.message}`, serveResult.error.code)
            };
        }
        const result = {
            workingPath: data.workingPath,
            url: serveResult.value.url,
            statistics: data.statistics
        };
        if (data.base !== undefined)
            result.base = data.base;
        if (data.target !== undefined)
            result.target = data.target;
        if (data.files !== undefined)
            result.files = data.files;
        return {
            ok: true,
            value: result
        };
    }
    /**
     * Format success response with statistics
     */
    async formatSuccessResponse(data) {
        const stats = data.statistics;
        const filesText = data.files && data.files.length > 0
            ? ` (${data.files.length} files)`
            : stats.filesChanged > 0
                ? ` (${stats.filesChanged} files)`
                : '';
        const changesText = stats.additions + stats.deletions > 0
            ? ` +${stats.additions}/-${stats.deletions}`
            : '';
        const compareText = data.base && data.target
            ? ` ${data.base}..${data.target}`
            : data.base
                ? ` ${data.base}..working`
                : '';
        // Attempt to open in browser
        const openResult = await this.browserOpener.openInBrowser(data.url);
        if (!openResult.ok) {
            this.logger.warn('Browser opening failed, continuing with manual URL', {
                error: openResult.error.message
            });
        }
        const browserMessage = openResult.ok
            ? this.browserOpener.generateOpenMessage(data.url, openResult.value)
            : `🔗 **URL:** ${data.url}\n\n*Note: Please copy and paste this URL into your browser to view the diff.*`;
        return {
            content: [
                {
                    type: 'text',
                    text: `Git diff opened in browser${compareText}${filesText}${changesText}\n\n${browserMessage}`
                }
            ]
        };
    }
    /**
     * Format error response
     */
    formatErrorResponse(error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`
                }
            ]
        };
    }
}
