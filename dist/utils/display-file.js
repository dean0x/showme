import { FileManager, FileManagerError } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
import { pipe, tap } from './pipe.js';
import { ConsoleLogger } from './logger.js';
/**
 * High-level utility function for displaying files in the browser
 * Uses pipe composition for readable, maintainable processing chain
 */
export async function displayFile(filePath, options) {
    const logger = new ConsoleLogger();
    const fileManager = FileManager.create();
    const htmlGeneratorResult = await HTMLGenerator.create(logger);
    if (!htmlGeneratorResult.ok) {
        return {
            ok: false,
            error: new FileManagerError(`HTML generator initialization failed: ${htmlGeneratorResult.error.message}`, htmlGeneratorResult.error.code)
        };
    }
    const htmlGenerator = htmlGeneratorResult.value;
    // Define pipeline steps
    const readFile = (path) => fileManager.readFile(path);
    const logFileRead = tap((content) => logger.debug('File read in display pipeline', {
        filename: content.filename,
        size: content.fileSize,
        language: content.language
    }));
    const generateHTML = async (content) => {
        const viewOptions = {
            ...content,
            ...(options?.lineHighlight ? { lineHighlight: options.lineHighlight } : {})
        };
        const htmlResult = await htmlGenerator.generateFileView(viewOptions);
        if (!htmlResult.ok) {
            return {
                ok: false,
                error: new FileManagerError(`Failed to generate HTML: ${htmlResult.error.message}`, htmlResult.error.code)
            };
        }
        return { ok: true, value: htmlResult.value };
    };
    const logHTMLGenerated = tap((html) => logger.debug('HTML generated in display pipeline', {
        contentLength: html.length
    }));
    // Compose and execute pipeline
    const displayPipeline = pipe(readFile, logFileRead, generateHTML, logHTMLGenerated);
    const result = await displayPipeline(filePath);
    // Cleanup resources
    await htmlGenerator.dispose();
    return result;
}
/**
 * Legacy compatibility - create instances manually for advanced usage
 */
export async function createDisplayComponents() {
    const logger = new ConsoleLogger();
    const fileManager = FileManager.create();
    const htmlGeneratorResult = await HTMLGenerator.create(logger);
    if (!htmlGeneratorResult.ok) {
        return {
            ok: false,
            error: new FileManagerError(`HTML generator initialization failed: ${htmlGeneratorResult.error.message}`, htmlGeneratorResult.error.code)
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
