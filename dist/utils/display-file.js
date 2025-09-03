import { FileManager, FileManagerError } from './file-manager.js';
import { HTMLGenerator } from './html-generator.js';
/**
 * High-level utility function for displaying files in the browser
 * Combines FileManager and HTMLGenerator for a simple API
 */
export async function displayFile(filePath, options) {
    const fileManager = new FileManager();
    const htmlGenerator = new HTMLGenerator();
    // Read file with secure path validation
    const fileResult = await fileManager.readFile(filePath);
    if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
    }
    // Generate HTML with syntax highlighting
    try {
        const viewOptions = {
            ...fileResult.value,
            ...(options?.lineHighlight ? { lineHighlight: options.lineHighlight } : {})
        };
        const html = await htmlGenerator.generateFileView(viewOptions);
        return { ok: true, value: html };
    }
    catch (error) {
        return {
            ok: false,
            error: new FileManagerError(`Failed to generate HTML: ${error instanceof Error ? error.message : String(error)}`, 'HTML_GENERATION_ERROR')
        };
    }
}
/**
 * Export the main classes for advanced usage
 */
export { FileManager, HTMLGenerator };
