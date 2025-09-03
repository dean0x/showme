import { type Result } from './path-validator.js';
import { type Logger } from './logger.js';
import { GitDetector, type GitRepository, GitDetectionError } from './git-detector.js';
/**
 * Git diff generation errors
 */
export declare class GitDiffError extends Error {
    code: string;
    constructor(message: string, code: string);
}
/**
 * Git diff types
 */
export type DiffType = 'staged' | 'unstaged' | 'commit' | 'branch';
/**
 * Diff options
 */
export interface DiffOptions {
    type: DiffType;
    target?: string;
    paths?: string[];
    contextLines?: number;
    ignoreWhitespace?: boolean;
}
/**
 * File diff information
 */
export interface FileDiff {
    path: string;
    oldPath?: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied';
    additions: number;
    deletions: number;
    chunks: DiffChunk[];
}
/**
 * Diff chunk (hunk)
 */
export interface DiffChunk {
    oldStart: number;
    oldLines: number;
    newStart: number;
    newLines: number;
    content: string;
    header: string;
}
/**
 * Complete diff result
 */
export interface DiffResult {
    repository: GitRepository;
    type: DiffType;
    target?: string;
    files: FileDiff[];
    stats: {
        filesChanged: number;
        additions: number;
        deletions: number;
    };
    raw: string;
}
/**
 * Git diff generator following engineering principles
 * - Uses Result types for error handling
 * - Accepts Logger and GitDetector dependency injection
 * - Structured logging with context
 * - Performance monitoring
 */
export declare class GitDiffGenerator {
    private readonly gitDetector;
    private readonly logger;
    constructor(gitDetector: GitDetector, logger?: Logger);
    /**
     * Factory method for creating GitDiffGenerator instances
     */
    static create(logger?: Logger): GitDiffGenerator;
    /**
     * Generate diff from a working directory
     */
    generateDiff(workingPath: string, options: DiffOptions): Promise<Result<DiffResult, GitDiffError | GitDetectionError>>;
    /**
     * Execute git diff command
     */
    private executeDiff;
    /**
     * Validate and sanitize file paths for git operations
     */
    private validatePaths;
    /**
     * Build git diff command arguments
     */
    private buildDiffCommand;
    /**
     * Parse git diff output into structured format
     */
    private parseDiff;
    /**
     * Get staged diff (files added to index)
     */
    getStagedDiff(workingPath: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitDetectionError>>;
    /**
     * Get unstaged diff (working directory changes)
     */
    getUnstagedDiff(workingPath: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitDetectionError>>;
    /**
     * Get commit diff
     */
    getCommitDiff(workingPath: string, commitHash?: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitDetectionError>>;
    /**
     * Get branch diff
     */
    getBranchDiff(workingPath: string, baseBranch?: string, paths?: string[]): Promise<Result<DiffResult, GitDiffError | GitDetectionError>>;
}
