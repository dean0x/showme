import fs from 'fs/promises';
import path from 'path';
import { PathValidator } from './path-validator.js';
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
    constructor(workspaceRoot) {
        this.pathValidator = new PathValidator(workspaceRoot);
    }
    async readFile(inputPath) {
        // Validate path first
        const pathResult = await this.pathValidator.validatePath(inputPath, { checkAccess: true });
        if (!pathResult.ok) {
            return { ok: false, error: pathResult.error };
        }
        try {
            const resolvedPath = pathResult.value;
            const content = await fs.readFile(resolvedPath, 'utf-8');
            const stats = await fs.stat(resolvedPath);
            return {
                ok: true,
                value: {
                    content,
                    filepath: resolvedPath,
                    filename: path.basename(resolvedPath),
                    fileSize: stats.size,
                    lastModified: stats.mtime,
                    language: this.detectLanguage(resolvedPath)
                }
            };
        }
        catch (error) {
            return {
                ok: false,
                error: new FileManagerError(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`, 'FILE_READ_ERROR')
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
