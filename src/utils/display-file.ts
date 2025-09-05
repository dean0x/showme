import { FileManager, FileManagerError, type FileContent } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
import { type Result } from './path-validator.js';
import { ValidationError } from './error-handling.js';
import { pipe, tap } from './pipe.js';
import { ConsoleLogger, type Logger } from './logger.js';

/**
 * High-level utility function for displaying files in the browser
 * Uses pipe composition for readable, maintainable processing chain
 */
export async function displayFile(filePath: string, options?: {
  lineHighlight?: number;
}): Promise<Result<string, FileManagerError | ValidationError>> {
  const logger = new ConsoleLogger();
  const fileManager = FileManager.create();
  const htmlGeneratorResult = await HTMLGenerator.create(logger);
  
  if (!htmlGeneratorResult.ok) {
    return {
      ok: false,
      error: new FileManagerError(
        `HTML generator initialization failed: ${htmlGeneratorResult.error.message}`,
        htmlGeneratorResult.error.code
      )
    };
  }
  
  const htmlGenerator = htmlGeneratorResult.value;
  
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
    const viewOptions = {
      ...content,
      ...(options?.lineHighlight ? { lineHighlight: options.lineHighlight } : {})
    };
    
    const htmlResult = await htmlGenerator.generateFileView(viewOptions);
    
    if (!htmlResult.ok) {
      return {
        ok: false,
        error: new FileManagerError(
          `Failed to generate HTML: ${htmlResult.error.message}`,
          htmlResult.error.code
        )
      };
    }
    
    return { ok: true, value: htmlResult.value };
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
export async function createDisplayComponents(): Promise<Result<{
  fileManager: FileManager;
  htmlGenerator: HTMLGenerator;
  logger: Logger;
}, FileManagerError>> {
  const logger = new ConsoleLogger();
  const fileManager = FileManager.create();
  const htmlGeneratorResult = await HTMLGenerator.create(logger);
  
  if (!htmlGeneratorResult.ok) {
    return {
      ok: false,
      error: new FileManagerError(
        `HTML generator initialization failed: ${htmlGeneratorResult.error.message}`,
        htmlGeneratorResult.error.code
      )
    };
  }
  
  return {
    ok: true,
    value: {
      fileManager,
      htmlGenerator: htmlGeneratorResult.value,
      logger
    }
  };
}

/**
 * Export the main classes for advanced usage
 */
export { FileManager, HTMLGenerator };
export type { FileContent } from './file-manager.js';
export type { FileViewOptions } from './html-generator.js';