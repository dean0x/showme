/**
 * Template engine wrapper for clean HTML generation
 * Eliminates dynamic JavaScript generation and injection vulnerabilities
 */
import { type Logger } from './logger.js';
import { type Result } from './path-validator.js';
import { HTMLGenerationError } from './error-handling.js';
export interface TemplateData {
    title: string;
    filepath: string;
    fileSize: string;
    lastModified: string;
    highlightedContent: string;
    language: string;
    lineHighlight: number | null;
    rawContent: string;
    rawContentJson: string;
}
/**
 * Clean template-based HTML generator
 * Separates data from presentation completely
 */
export declare class TemplateEngine {
    private readonly logger;
    private templates;
    private templatesDir;
    constructor(logger?: Logger, templatesDir?: string);
    /**
     * Initialize template engine by loading all templates
     */
    initialize(): Promise<Result<void, HTMLGenerationError>>;
    /**
     * Load a specific template from disk
     */
    private loadTemplate;
    /**
     * Render a template with data
     */
    render(templateName: string, data: TemplateData): Result<string, HTMLGenerationError>;
    /**
     * Check if template engine is ready
     */
    isReady(): boolean;
}
