# ShowMe MCP Server - Visual Design Requirements

## Design System Specifications

### Color Palette (GitHub Dark Theme)

```css
:root {
  /* Background Colors */
  --bg-primary: #0d1117;        /* Main background */
  --bg-secondary: #161b22;      /* Secondary panels */
  --bg-tertiary: #21262d;       /* Borders, dividers */
  --bg-overlay: #30363d;        /* Hover states */
  
  /* Text Colors */
  --text-primary: #e6edf3;      /* Main text */
  --text-secondary: #7d8590;    /* Secondary text */
  --text-muted: #656d76;        /* Muted text */
  --text-accent: #79c0ff;       /* Links, accents */
  
  /* Semantic Colors */
  --success: #3fb950;           /* Added lines, success */
  --danger: #f85149;            /* Deleted lines, errors */
  --warning: #ffd60a;           /* Modified, warnings */
  --info: #58a6ff;              /* Information */
  
  /* Diff-specific Colors */
  --diff-added-bg: #0d4429;     /* Added line background */
  --diff-added-border: #3fb950; /* Added line border */
  --diff-removed-bg: #67060c;   /* Removed line background */
  --diff-removed-border: #f85149; /* Removed line border */
  --diff-modified-bg: #1a1a00;  /* Modified line background */
  --diff-modified-border: #ffd60a; /* Modified line border */
}
```

### Typography Scale

```css
:root {
  /* Font Families */
  --font-ui: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
  --font-mono: 'SFMono-Regular', 'Consolas', 'Liberation Mono', 'Menlo', monospace;
  
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  
  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.6;
}
```

### Spacing System

```css
:root {
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
}
```

## Component Design Specifications

### File Viewer Layout

```css
.file-viewer {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.file-header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
  padding: var(--space-4) var(--space-8);
  position: sticky;
  top: 0;
  z-index: 100;
}

.file-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.file-meta {
  display: flex;
  gap: var(--space-6);
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.file-content {
  flex: 1;
  padding: var(--space-4) var(--space-8);
  overflow-x: auto;
}

.code-block {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  border-radius: 8px;
  overflow: hidden;
}

.line-highlight {
  background-color: var(--warning);
  background-color: color-mix(in srgb, var(--warning) 20%, transparent);
  border-left: 3px solid var(--warning);
  padding-left: var(--space-2);
}
```

### Diff Viewer Layout

```css
.diff-viewer {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.diff-header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
  padding: var(--space-4) var(--space-8);
  position: sticky;
  top: 0;
  z-index: 100;
}

.diff-comparison {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.commit-ref {
  background-color: var(--bg-tertiary);
  padding: var(--space-1) var(--space-2);
  border-radius: 4px;
  color: var(--text-accent);
}

.diff-stats {
  display: flex;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.stat-files {
  color: var(--text-primary);
}

.stat-additions {
  color: var(--success);
  font-weight: 600;
}

.stat-deletions {
  color: var(--danger);
  font-weight: 600;
}

.diff-content {
  flex: 1;
  padding: var(--space-4);
}

/* Custom diff2html theme */
.d2h-wrapper {
  background-color: transparent;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.d2h-file-header {
  background-color: var(--bg-secondary);
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px 8px 0 0;
  padding: var(--space-3) var(--space-4);
}

.d2h-file-name {
  color: var(--text-accent);
  font-weight: 600;
}

.d2h-code-side-line {
  background-color: var(--bg-primary);
  border-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.d2h-ins {
  background-color: var(--diff-added-bg);
  border-left: 3px solid var(--diff-added-border);
}

.d2h-del {
  background-color: var(--diff-removed-bg);
  border-left: 3px solid var(--diff-removed-border);
}

.d2h-info {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--bg-tertiary);
}
```

### Mobile Responsiveness

```css
/* Mobile-first responsive design */
@media (max-width: 768px) {
  .file-header,
  .diff-header {
    padding: var(--space-3) var(--space-4);
  }
  
  .file-meta,
  .diff-comparison {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }
  
  .diff-stats {
    flex-wrap: wrap;
    gap: var(--space-2);
  }
  
  .file-content,
  .diff-content {
    padding: var(--space-3) var(--space-4);
  }
  
  /* Switch to unified view on mobile */
  .d2h-wrapper {
    --d2h-output-format: 'line-by-line';
  }
  
  /* Adjust code font size for mobile */
  .code-block,
  .d2h-code-side-line {
    font-size: var(--text-xs);
  }
}

@media (max-width: 480px) {
  .file-title {
    font-size: var(--text-lg);
  }
  
  .file-meta,
  .diff-stats {
    font-size: var(--text-xs);
  }
  
  /* Make horizontal scrolling more touch-friendly */
  .file-content,
  .diff-content {
    padding-bottom: var(--space-8);
  }
}
```

## Visual Hierarchy Guidelines

### 1. **Information Architecture**
```
Header (Fixed)
├── Primary Title (Large, Bold)
├── Secondary Metadata (Medium, Muted)
└── Action Stats (Small, Semantic Colors)

Content (Scrollable)
├── Code/Diff Content (Monospace)
├── Line Numbers (Small, Muted)
└── Syntax Highlighting (Semantic)

Footer/Toolbar (Optional)
└── Action Buttons (Prominent)
```

### 2. **Color Usage Hierarchy**
- **Primary Text**: Main content, headings
- **Secondary Text**: Metadata, descriptions
- **Accent Text**: Links, interactive elements
- **Semantic Colors**: Success/error/warning states only

### 3. **Spacing Consistency**
- **Large gaps**: Between major sections (32px)
- **Medium gaps**: Between related groups (16px)
- **Small gaps**: Between closely related items (8px)
- **Micro gaps**: Within composite elements (4px)

## Accessibility Requirements

### Color Contrast Ratios
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **Interactive elements**: Minimum 3:1 contrast ratio

### Focus States
```css
.focusable:focus-visible {
  outline: 2px solid var(--text-accent);
  outline-offset: 2px;
  border-radius: 4px;
}
```

### Screen Reader Support
```html
<!-- Semantic HTML structure -->
<main aria-label="File content">
  <header aria-label="File information">
    <h1>Filename</h1>
    <div aria-label="File metadata">
      <span aria-label="File size">...</span>
      <span aria-label="Last modified">...</span>
    </div>
  </header>
  
  <section aria-label="Code content">
    <pre><code>...</code></pre>
  </section>
</main>
```

## Implementation Checklist

### Sprint 1: File Viewer Polish
- [ ] Implement design token system (CSS custom properties)
- [ ] Create consistent file header component
- [ ] Design responsive layout breakpoints
- [ ] Test line highlighting visual treatment
- [ ] Verify accessibility compliance

### Sprint 2: Diff Viewer Consistency
- [ ] Create custom diff2html theme configuration
- [ ] Implement unified color scheme across views
- [ ] Design mobile-specific diff layout
- [ ] Add visual hierarchy improvements
- [ ] Test cross-browser compatibility

### Visual Quality Acceptance Criteria
- [ ] **Consistency**: File and diff views use identical color palette
- [ ] **Responsiveness**: Works on screens 320px to 4K
- [ ] **Accessibility**: WCAG 2.1 AA compliant
- [ ] **Performance**: CSS loads in <100ms
- [ ] **Polish**: No visual glitches or layout shifts