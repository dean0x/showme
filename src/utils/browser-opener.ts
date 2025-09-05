import open from 'open';
import { type Logger } from './logger.js';
import { type Result } from './path-validator.js';

/**
 * Browser opening error
 */
export class BrowserOpenError extends Error {
  code: string;
  
  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = 'BrowserOpenError';
    this.code = code;
    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Environment detection and browser opening utility
 * Following engineering principle #2: Dependency injection for testing
 */
export class BrowserOpener {
  constructor(private readonly logger: Logger) {}

  /**
   * Detect if we're running in a container environment
   */
  private isContainerEnvironment(): boolean {
    // Check for common container indicators
    const indicators = [
      process.env.CONTAINER,
      process.env.DOCKER_HOST,
      process.env.KUBERNETES_SERVICE_HOST,
      process.env.CODESPACES,
      // DevContainer indicators
      process.env.REMOTE_CONTAINERS,
      process.env.VSCODE_REMOTE_CONTAINERS_SESSION,
      // GitPod indicator
      process.env.GITPOD_WORKSPACE_ID
    ];

    return indicators.some(indicator => !!indicator);
  }

  /**
   * Check if browser auto-opening is disabled
   */
  private isAutoOpenDisabled(): boolean {
    return process.env.SHOWME_DISABLE_AUTO_OPEN === 'true' ||
           process.env.NODE_ENV === 'test';
  }

  /**
   * Attempt to open URL in browser with graceful degradation
   */
  async openInBrowser(url: string): Promise<Result<{ opened: boolean; method: string }, BrowserOpenError>> {
    this.logger.debug('Attempting to open URL in browser', { 
      url, 
      isContainer: this.isContainerEnvironment(),
      autoOpenDisabled: this.isAutoOpenDisabled()
    });

    // Skip auto-open in containers or when disabled
    if (this.isContainerEnvironment() || this.isAutoOpenDisabled()) {
      this.logger.debug('Skipping browser auto-open', {
        reason: this.isContainerEnvironment() ? 'container-environment' : 'disabled'
      });
      
      return {
        ok: true,
        value: { opened: false, method: 'manual' }
      };
    }

    // Attempt to open in browser
    try {
      this.logger.debug('Opening URL in default browser');
      await open(url);
      
      this.logger.info('Successfully opened URL in browser', { url });
      return {
        ok: true,
        value: { opened: true, method: 'auto' }
      };
    } catch (error) {
      this.logger.warn('Failed to auto-open browser, falling back to manual', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        ok: true,
        value: { opened: false, method: 'fallback' }
      };
    }
  }

  /**
   * Generate user-friendly message based on opening result
   */
  generateOpenMessage(url: string, result: { opened: boolean; method: string }): string {
    const baseMessage = `🔗 **URL:** ${url}`;
    
    switch (result.method) {
      case 'auto':
        return `${baseMessage}\n\n✨ *Opened automatically in your default browser*`;
      
      case 'manual':
        return `${baseMessage}\n\n*Note: In devcontainer environments, copy and paste this URL into your host browser to view.*`;
      
      case 'fallback':
        return `${baseMessage}\n\n*Note: Could not auto-open browser. Please copy and paste this URL into your browser to view.*`;
      
      default:
        return baseMessage;
    }
  }
}