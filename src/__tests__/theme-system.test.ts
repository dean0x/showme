import { describe, it, expect } from 'vitest';
import { ThemeSystem } from '../utils/theme-system.js';

describe('ThemeSystem', () => {
  it('should export all required design tokens', () => {
    const tokens = ThemeSystem.getDesignTokens();
    
    // Color palette tokens
    expect(tokens.colors['bg-primary']).toBe('#0d1117');
    expect(tokens.colors['bg-secondary']).toBe('#161b22');
    expect(tokens.colors['text-primary']).toBe('#e6edf3');
    expect(tokens.colors['text-secondary']).toBe('#7d8590');
    expect(tokens.colors.success).toBe('#3fb950');
    expect(tokens.colors.danger).toBe('#f85149');
    expect(tokens.colors.warning).toBe('#ffd60a');
  });

  it('should generate CSS custom properties string', () => {
    const css = ThemeSystem.generateCSSCustomProperties();
    
    expect(css).toContain('--bg-primary: #0d1117;');
    expect(css).toContain('--text-primary: #e6edf3;');
    expect(css).toContain('--font-mono: \'SFMono-Regular\'');
    expect(css).toContain('--space-4: 1rem;');
  });

  it('should provide semantic color functions', () => {
    expect(ThemeSystem.getSemanticColor('success')).toBe('#3fb950');
    expect(ThemeSystem.getSemanticColor('danger')).toBe('#f85149');
    expect(ThemeSystem.getSemanticColor('warning')).toBe('#ffd60a');
  });

  it('should generate responsive breakpoints', () => {
    const breakpoints = ThemeSystem.getResponsiveBreakpoints();
    
    expect(breakpoints.mobile).toBe('768px');
    expect(breakpoints['mobile-small']).toBe('480px');
  });
});