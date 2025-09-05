import { type Result } from './path-validator.js';
import { type Logger } from './logger.js';
import { GitOperationError } from './error-handling.js';
/**
 * Git repository information
 */
export interface GitRepository {
    gitRoot: string;
    currentBranch: string;
    hasRemote: boolean;
    remoteName?: string;
    remoteUrl?: string;
    workingDirectory: string;
}
/**
 * Git repository detector following engineering principles
 * - Uses Result types for error handling
 * - Accepts Logger dependency injection
 * - Structured logging with context
 */
export declare class GitDetector {
    private readonly logger;
    constructor(logger?: Logger);
    /**
     * Factory method for creating GitDetector instances
     */
    static create(logger?: Logger): GitDetector;
    /**
     * Detect git repository information from a given path
     */
    detectRepository(workingPath: string): Promise<Result<GitRepository, GitOperationError>>;
    /**
     * Get the git repository root directory
     */
    private getGitRoot;
    /**
     * Get the current branch name
     */
    private getCurrentBranch;
    /**
     * Get remote repository information
     */
    private getRemoteInfo;
    /**
     * Check if a path is within a git repository
     */
    isGitRepository(workingPath: string): Promise<boolean>;
}
