/**
 * VS Code command executor service
 * Following engineering principles: dependency injection, Result types, structured logging
 */

import { spawn } from 'child_process';
import { type Result } from './path-validator.js';
import { type Logger, ConsoleLogger } from './logger.js';
import { ErrorFactory, VSCodeExecutorError } from './error-handling.js';

/**
 * Configuration for VS Code executor
 */
export interface VSCodeConfig {
  /** Command to execute (code, cursor, vim, etc.) */
  command: string;
  /** Whether to wait for editor to close */
  wait: boolean;
}

/**
 * Result of VS Code command execution
 */
export interface VSCodeResult {
  command: string;
  args: string[];
  success: boolean;
  message: string;
}


/**
 * Service for executing VS Code commands safely
 * Follows engineering principle #2: Dependency injection for testability
 */
export class VSCodeExecutor {
  constructor(
    private readonly config: VSCodeConfig,
    private readonly logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * Open a file in VS Code
   */
  async openFile(
    filepath: string, 
    lineNumber?: number
  ): Promise<Result<VSCodeResult, VSCodeExecutorError>> {
    try {
      const args = this.buildFileArgs(filepath, lineNumber);
      const command = this.config.command;

      this.logger.info('Opening file in VS Code', { 
        command, 
        args, 
        filepath, 
        lineNumber 
      });

      const result = await this.executeCommand(command, args);
      
      return {
        ok: true,
        value: {
          command,
          args,
          success: result,
          message: result 
            ? `Opened ${filepath}${lineNumber ? `:${lineNumber}` : ''} in ${command}` 
            : `Failed to open ${filepath} in ${command}`
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to open file in VS Code', { 
        filepath, 
        lineNumber, 
        error: err.message 
      });
      
      return {
        ok: false,
        error: ErrorFactory.vsCodeExecutor(
          `Failed to open file: ${err.message}`,
          'FILE_OPEN_ERROR',
          { filepath, lineNumber }
        )
      };
    }
  }

  /**
   * Open multiple files in VS Code as tabs
   */
  async openFiles(
    filepaths: string[]
  ): Promise<Result<VSCodeResult, VSCodeExecutorError>> {
    try {
      if (filepaths.length === 0) {
        return {
          ok: false,
          error: ErrorFactory.vsCodeExecutor(
            'No files provided to open',
            'NO_FILES_ERROR',
            { filepaths }
          )
        };
      }

      const args = this.buildMultiFileArgs(filepaths);
      const command = this.config.command;

      this.logger.info('Opening multiple files in VS Code', { 
        command, 
        args, 
        fileCount: filepaths.length
      });

      const result = await this.executeCommand(command, args);
      
      return {
        ok: true,
        value: {
          command,
          args,
          success: result,
          message: result 
            ? `Opened ${filepaths.length} files in ${command}` 
            : `Failed to open files in ${command}`
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to open files in VS Code', { 
        filepaths, 
        error: err.message 
      });
      
      return {
        ok: false,
        error: ErrorFactory.vsCodeExecutor(
          `Failed to open files: ${err.message}`,
          'MULTI_FILE_OPEN_ERROR',
          { filepaths }
        )
      };
    }
  }

  /**
   * Open a diff comparison in VS Code
   */
  async openDiff(
    oldFile: string,
    newFile: string,
    _title?: string
  ): Promise<Result<VSCodeResult, VSCodeExecutorError>> {
    try {
      const args = this.buildDiffArgs(oldFile, newFile);
      const command = this.config.command;

      this.logger.info('Opening diff in VS Code', { 
        command, 
        args, 
        oldFile, 
        newFile, 
        title: _title 
      });

      const result = await this.executeCommand(command, args);
      
      return {
        ok: true,
        value: {
          command,
          args,
          success: result,
          message: result 
            ? `Opened diff comparison in ${command}` 
            : `Failed to open diff comparison in ${command}`
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to open diff in VS Code', { 
        oldFile, 
        newFile, 
        title: _title, 
        error: err.message 
      });
      
      return {
        ok: false,
        error: ErrorFactory.vsCodeExecutor(
          `Failed to open diff: ${err.message}`,
          'DIFF_OPEN_ERROR',
          { oldFile, newFile, title: _title }
        )
      };
    }
  }

  /**
   * Build arguments for opening a file
   */
  private buildFileArgs(filepath: string, lineNumber?: number): string[] {
    const args: string[] = [];
    
    // Always reuse window to keep files in tabs
    args.push('--reuse-window');
    
    if (this.config.wait) {
      args.push('--wait');
    }
    
    // Add goto flag for line number
    if (lineNumber && lineNumber > 0) {
      args.push('--goto', `${filepath}:${lineNumber}`);
    } else {
      args.push(filepath);
    }
    
    return args;
  }

  /**
   * Build arguments for opening multiple files
   */
  private buildMultiFileArgs(filepaths: string[]): string[] {
    const args: string[] = [];
    
    // Always reuse window to keep files in tabs
    args.push('--reuse-window');
    
    if (this.config.wait) {
      args.push('--wait');
    }
    
    // Add all file paths
    args.push(...filepaths);
    
    return args;
  }

  /**
   * Build arguments for opening a diff
   */
  private buildDiffArgs(oldFile: string, newFile: string): string[] {
    const args: string[] = [];
    
    // Always reuse window for diffs to keep them in tabs
    args.push('--reuse-window');
    
    if (this.config.wait) {
      args.push('--wait');
    }
    
    args.push('--diff', oldFile, newFile);
    
    return args;
  }

  /**
   * Dynamically find the active VS Code socket
   */
  private async findActiveVSCodeSocket(): Promise<string | null> {
    try {
      const { readdir, stat } = await import('fs/promises');
      const tmpFiles = await readdir('/tmp');
      
      // First check for remote containers IPC (devcontainer environment)
      let vscodeSockets = tmpFiles.filter(f => f.startsWith('vscode-remote-containers-ipc-') && f.endsWith('.sock'));
      
      // If no remote containers sockets, fall back to regular IPC sockets
      if (vscodeSockets.length === 0) {
        vscodeSockets = tmpFiles.filter(f => f.startsWith('vscode-ipc-') && f.endsWith('.sock'));
      }
      
      if (vscodeSockets.length > 0) {
        // Sort by modification time to get the most recent socket
        const socketStats = await Promise.all(
          vscodeSockets.map(async (socket) => {
            const fullPath = `/tmp/${socket}`;
            const stats = await stat(fullPath);
            return { path: fullPath, mtime: stats.mtime };
          })
        );
        
        const mostRecentSocket = socketStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0];
        this.logger.debug('Found active VS Code socket', { 
          socket: mostRecentSocket.path,
          type: mostRecentSocket.path.includes('remote-containers-ipc') ? 'remote-containers' : 'regular'
        });
        
        return mostRecentSocket.path;
      }
    } catch (error) {
      this.logger.warn('Failed to find VS Code socket', { error });
    }
    
    return null;
  }

  /**
   * Execute VS Code command safely
   */
  private async executeCommand(command: string, args: string[]): Promise<boolean> {
    try {
      // Find the active VS Code socket dynamically
      const activeSocket = await this.findActiveVSCodeSocket();
      const env = { ...process.env };
      
      if (activeSocket) {
        // Set the appropriate environment variable based on socket type
        if (activeSocket.includes('remote-containers-ipc')) {
          env.REMOTE_CONTAINERS_IPC = activeSocket;
          this.logger.info('Using remote containers socket', { socket: activeSocket });
        } else {
          env.VSCODE_IPC_HOOK_CLI = activeSocket;
          this.logger.info('Using regular IPC socket', { socket: activeSocket });
        }
      } else {
        this.logger.warn('No active VS Code socket found - using default environment');
      }
      
      return new Promise((resolve, reject) => {
        
        const fullCommand = `${command} ${args.map(arg => `"${arg}"`).join(' ')}`;
        
        this.logger.debug('Executing VS Code command through shell', { fullCommand });
        
        const childProcess = spawn('bash', ['-c', fullCommand], {
          stdio: 'pipe',  // Use pipe to capture output
          env,  // Use environment with dynamically detected socket
          cwd: process.cwd() // Ensure same working directory
        });

        let stdout = '';
        let stderr = '';

        childProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        childProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        childProcess.on('error', (error) => {
          if (error.message.includes('ENOENT')) {
            reject(new Error(`Command '${command}' not found. Please install VS Code or configure a different editor.`));
          } else {
            reject(error);
          }
        });

        childProcess.on('close', (code) => {
          if (code === 0) {
            this.logger.debug('VS Code command completed successfully', { stdout, stderr });
            resolve(true);
          } else {
            this.logger.error('VS Code command failed', { code, stdout, stderr });
            reject(new Error(`VS Code command failed with exit code ${code}: ${stderr}`));
          }
        });
      });
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}

/**
 * Create VS Code executor with default configuration
 */
export function createVSCodeExecutor(
  config?: Partial<VSCodeConfig>,
  logger?: Logger
): VSCodeExecutor {
  const defaultConfig: VSCodeConfig = {
    command: 'code',
    wait: false
  };

  return new VSCodeExecutor(
    { ...defaultConfig, ...config },
    logger || new ConsoleLogger()
  );
}