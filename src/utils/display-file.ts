import { FileManager, FileManagerError, type FileContent } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
import { type PathValidationError, type Result } from './path-validator.js';
import { pipe, tap } from './pipe.js';
import { ConsoleLogger, type Logger } from './logger.js';

/**
 * High-level utility function for displaying files in the browser
 * Uses pipe composition for readable, maintainable processing chain
 */
export async function displayFile(filePath: string, options?: {
  lineHighlight?: number;
}): Promise<Result<string, FileManagerError | PathValidationError>> {
  const logger = new ConsoleLogger();
  const fileManager = FileManager.create();
  const htmlGenerator = await HTMLGenerator.create(logger);
  
  // Define pipeline steps
  const readFile = (path: string): ReturnType<typeof fileManager.readFile> => fileManager.readFile(path);
  
  const logFileRead = tap<FileContent>((content) =>
    logger.debug('File read in display pipeline', {
      filename: content.filename,
      size: content.fileSize,
      language: content.language
    })
  );
  
  const generateHTML = async (content: FileContent): Promise<Result<string, Error>> => {
    try {
      const viewOptions = {
        ...content,
        ...(options?.lineHighlight ? { lineHighlight: options.lineHighlight } : {})
      };
      const html = await htmlGenerator.generateFileView(viewOptions);
      return { ok: true, value: html };
    } catch (error) {
      return {
        ok: false,
        error: new FileManagerError(
          `Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`,
          'HTML_GENERATION_ERROR'
        )
      };
    }
  };
  
  const logHTMLGenerated = tap<string>((html) =>
    logger.debug('HTML generated in display pipeline', {
      contentLength: html.length
    })
  );
  
  // Compose and execute pipeline
  const displayPipeline = pipe(
    readFile,
    logFileRead,
    generateHTML,
    logHTMLGenerated
  );
  
  const result = await displayPipeline(filePath);
  
  // Cleanup resources
  await htmlGenerator.dispose();
  
  return result;
}

/**
 * Legacy compatibility - create instances manually for advanced usage
 */
export async function createDisplayComponents(): Promise<{
  fileManager: FileManager;
  htmlGenerator: HTMLGenerator;
  logger: Logger;
}> {
  const logger = new ConsoleLogger();
  const fileManager = FileManager.create();
  const htmlGenerator = await HTMLGenerator.create(logger);
  
  return { fileManager, htmlGenerator, logger };
}

/**
 * Export the main classes for advanced usage
 */
export { FileManager, HTMLGenerator };
export type { FileContent } from './file-manager.js';
export type { FileViewOptions } from './html-generator.js';