import fs from 'fs/promises';
import path from 'path';
import { PathValidator } from './path-validator.js';
import { ConsoleLogger } from './logger.js';
export class FileManagerError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'FileManagerError';
    }
}
export class FileManager {
    pathValidator;
    logger;
    constructor(pathValidator, logger = new ConsoleLogger()) {
        this.pathValidator = pathValidator;
        this.logger = logger;
    }
    static create(workspaceRoot, logger) {
        const pathValidator = new PathValidator(workspaceRoot);
        return new FileManager(pathValidator, logger || new ConsoleLogger());
    }
    async readFile(inputPath) {
        const startTime = performance.now();
        this.logger.debug('Starting file read operation', {
            inputPath,
            timestamp: new Date().toISOString()
        });
        try {
            // Validate path first
            const pathResult = await this.pathValidator.validatePath(inputPath, { checkAccess: true });
            if (!pathResult.ok) {
                this.logger.error('Path validation failed', {
                    inputPath,
                    error: pathResult.error.message,
                    code: pathResult.error.code
                });
                return { ok: false, error: pathResult.error };
            }
            const resolvedPath = pathResult.value;
            try {
                // Read file stats and content
                const [content, stats] = await Promise.all([
                    fs.readFile(resolvedPath, 'utf-8'),
                    fs.stat(resolvedPath)
                ]);
                const duration = performance.now() - startTime;
                const result = {
                    content,
                    filepath: resolvedPath,
                    filename: path.basename(resolvedPath),
                    fileSize: stats.size,
                    lastModified: stats.mtime,
                    language: this.detectLanguage(resolvedPath)
                };
                this.logger.info('File read successfully', {
                    filepath: resolvedPath,
                    fileSize: stats.size,
                    language: result.language,
                    duration
                });
                return { ok: true, value: result };
            }
            catch (fsError) {
                const duration = performance.now() - startTime;
                const error = new FileManagerError(`Failed to read file: ${fsError instanceof Error ? fsError.message : String(fsError)}`, 'FILE_READ_ERROR');
                this.logger.error('File system operation failed', {
                    filepath: resolvedPath,
                    operation: 'read',
                    duration,
                    error: fsError instanceof Error ? fsError.message : String(fsError)
                });
                return { ok: false, error };
            }
        }
        catch (error) {
            const duration = performance.now() - startTime;
            this.logger.error('Unexpected error during file read', {
                inputPath,
                duration,
                error: error instanceof Error ? error.message : String(error)
            });
            return {
                ok: false,
                error: new FileManagerError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`, 'UNEXPECTED_ERROR')
            };
        }
    }
    detectLanguage(filepath) {
        const ext = path.extname(filepath).toLowerCase();
        const languageMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'jsx',
            '.tsx': 'tsx',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.toml': 'toml',
            '.xml': 'xml',
            '.md': 'markdown',
            '.sql': 'sql',
            '.sh': 'bash',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby'
        };
        return languageMap[ext] || 'text';
    }
}
