/**
 * Design system implementation following GitHub Dark theme
 * Based on visual-design-requirements.md specifications
 */
export interface DesignTokens {
    colors: Record<string, string>;
    typography: {
        families: Record<string, string>;
        sizes: Record<string, string>;
        lineHeights: Record<string, string>;
    };
    spacing: Record<string, string>;
    breakpoints: Record<string, string>;
}
export declare class ThemeSystem {
    private static readonly DESIGN_TOKENS;
    /**
     * Get all design tokens
     */
    static getDesignTokens(): DesignTokens;
    /**
     * Generate CSS custom properties string for use in stylesheets
     */
    static generateCSSCustomProperties(): string;
    /**
     * Get semantic color value
     */
    static getSemanticColor(type: 'success' | 'danger' | 'warning' | 'info'): string;
    /**
     * Get responsive breakpoints
     */
    static getResponsiveBreakpoints(): Record<string, string>;
    /**
     * Generate complete base styles for HTML documents
     */
    static generateBaseStyles(): string;
    /**
     * Generate file viewer specific styles
     */
    static generateFileViewerStyles(): string;
}
