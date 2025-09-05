/**
 * Template engine wrapper for clean HTML generation
 * Eliminates dynamic JavaScript generation and injection vulnerabilities
 */
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleLogger } from './logger.js';
import { ErrorFactory } from './error-handling.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * Clean template-based HTML generator
 * Separates data from presentation completely
 */
export class TemplateEngine {
    logger;
    templates = new Map();
    templatesDir;
    constructor(logger = new ConsoleLogger(), templatesDir = path.join(__dirname, '../templates')) {
        this.logger = logger;
        this.templatesDir = templatesDir;
    }
    /**
     * Initialize template engine by loading all templates
     */
    async initialize() {
        try {
            this.logger.debug('Initializing template engine', { templatesDir: this.templatesDir });
            // Load the file viewer template
            await this.loadTemplate('file-viewer');
            this.logger.info('Template engine initialized successfully');
            return { ok: true, value: undefined };
        }
        catch (error) {
            const htmlError = ErrorFactory.htmlGeneration('Failed to initialize template engine', 'TEMPLATE_INIT_ERROR', { templatesDir: this.templatesDir }, error instanceof Error ? error : new Error(String(error)));
            return { ok: false, error: htmlError };
        }
    }
    /**
     * Load a specific template from disk
     */
    async loadTemplate(templateName) {
        const templatePath = path.join(this.templatesDir, `${templateName}.html`);
        try {
            const templateSource = await fs.readFile(templatePath, 'utf8');
            const compiledTemplate = Handlebars.compile(templateSource);
            this.templates.set(templateName, compiledTemplate);
            this.logger.debug('Template loaded successfully', {
                templateName,
                templatePath
            });
        }
        catch (error) {
            throw new Error(`Failed to load template ${templateName}: ${error}`);
        }
    }
    /**
     * Render a template with data
     */
    render(templateName, data) {
        try {
            const template = this.templates.get(templateName);
            if (!template) {
                return {
                    ok: false,
                    error: ErrorFactory.htmlGeneration(`Template not found: ${templateName}`, 'TEMPLATE_NOT_FOUND', { templateName, availableTemplates: Array.from(this.templates.keys()) })
                };
            }
            // Safely serialize raw content for JavaScript
            const safeData = {
                ...data,
                rawContentJson: JSON.stringify(data.rawContent),
                lineHighlight: data.lineHighlight ?? 'null'
            };
            const html = template(safeData);
            this.logger.debug('Template rendered successfully', {
                templateName,
                contentLength: html.length
            });
            return { ok: true, value: html };
        }
        catch (error) {
            return {
                ok: false,
                error: ErrorFactory.htmlGeneration(`Failed to render template ${templateName}`, 'TEMPLATE_RENDER_ERROR', { templateName }, error instanceof Error ? error : new Error(String(error)))
            };
        }
    }
    /**
     * Check if template engine is ready
     */
    isReady() {
        return this.templates.has('file-viewer');
    }
}
