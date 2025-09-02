# ShowMe MCP Server - API Reference

## MCP Tool Definitions

### `showme.file`

Display a file in browser with syntax highlighting and rich formatting.

#### Input Schema

```json
{
  "type": "object",
  "properties": {
    "path": {
      "type": "string",
      "description": "File path relative to workspace root",
      "examples": [
        "src/main.ts",
        "README.md", 
        "docs/api.json",
        "./components/Button.jsx"
      ]
    },
    "line_highlight": {
      "type": "number",
      "description": "Optional line number to highlight and scroll to",
      "minimum": 1,
      "examples": [42, 100, 250]
    }
  },
  "required": ["path"]
}
```

#### Response Format

**Success Response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "File opened in browser: src/main.ts"
    }
  ]
}
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Failed to display file: Path outside workspace: ../../../etc/passwd"
    }
  ]
}
```

#### Behavior

1. **Path Validation**: Ensures file path is within workspace boundaries
2. **File Reading**: Reads file content with size limits (10MB for text files)
3. **Language Detection**: Auto-detects programming language from file extension
4. **HTML Generation**: Creates syntax-highlighted HTML using Shiki
5. **Browser Integration**: Opens generated HTML in system default browser
6. **Cleanup**: Automatically removes temporary HTML files after 1 hour

#### Supported File Types

| Category | Extensions | Features |
|----------|------------|----------|
| **JavaScript/TypeScript** | `.js`, `.ts`, `.jsx`, `.tsx` | Full syntax highlighting, JSX support |
| **Python** | `.py`, `.pyi` | Syntax highlighting, docstring recognition |
| **Web Technologies** | `.html`, `.css`, `.scss`, `.less` | Markup and style highlighting |
| **Data Formats** | `.json`, `.yaml`, `.yml`, `.toml`, `.xml` | Structure highlighting, validation |
| **Documentation** | `.md`, `.rst`, `.txt` | Markdown rendering for `.md` files |
| **Systems Languages** | `.c`, `.cpp`, `.h`, `.java`, `.go`, `.rs` | Language-specific highlighting |
| **Scripting** | `.sh`, `.bash`, `.ps1`, `.sql` | Shell and query language support |
| **Configuration** | `.config`, `.ini`, `.env`, `.dockerfile` | Config file highlighting |

#### Error Conditions

| Error | Cause | Solution |
|-------|-------|----------|
| `Path outside workspace` | File path contains `..` or resolves outside workspace | Use relative paths within project |
| `File not accessible` | Permission denied or file doesn't exist | Check file permissions and existence |
| `File too large` | File exceeds 10MB limit | Use external viewer for large files |
| `Invalid file path` | Malformed or empty path | Provide valid relative file path |

---

### `showme.diff`

Display git diff in browser with rich visualization and side-by-side comparison.

#### Input Schema

```json
{
  "type": "object", 
  "properties": {
    "base": {
      "type": "string",
      "description": "Base commit, branch, or tag for comparison",
      "default": "HEAD",
      "examples": [
        "HEAD",
        "main", 
        "feature/auth",
        "v1.2.0",
        "abc123f"
      ]
    },
    "target": {
      "type": "string",
      "description": "Target commit, branch, or working directory",
      "default": "working directory",
      "examples": [
        "HEAD~1",
        "develop",
        "feature/new-ui", 
        "v1.1.0"
      ]
    },
    "files": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Specific files to include in diff (optional)",
      "examples": [
        ["src/main.ts", "README.md"],
        ["components/"],
        ["*.json"]
      ]
    }
  }
}
```

#### Response Format

**Success Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Git diff opened in browser. Changed files: 5, +127/-43"
    }
  ]
}
```

**No Changes Response:**
```json
{
  "content": [
    {
      "type": "text", 
      "text": "No differences found"
    }
  ]
}
```

**Error Response:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Failed to generate diff: Not in a git repository"
    }
  ]
}
```

#### Behavior

1. **Git Validation**: Confirms current directory is within a git repository
2. **Diff Generation**: Executes appropriate `git diff` command with specified parameters
3. **HTML Rendering**: Uses diff2html library for rich side-by-side visualization
4. **Statistics**: Calculates and reports file count, insertions, and deletions
5. **Browser Display**: Opens formatted diff in browser with navigation
6. **File Filtering**: Supports limiting diff to specific files or directories

#### Diff Visualization Features

- **Side-by-Side View**: Compare old and new versions line by line
- **Unified View**: Traditional diff format with context
- **Syntax Highlighting**: Code changes highlighted within diff context  
- **File Tree**: Navigate between multiple changed files
- **Line Numbers**: Original and new line numbers displayed
- **Change Statistics**: Visual indicators for additions/deletions/modifications
- **Collapsible Sections**: Expand/collapse unchanged code blocks

#### Git Command Examples

| Input | Generated Command | Description |
|-------|------------------|-------------|
| `{}` | `git diff HEAD` | Compare HEAD with working directory |
| `{"base": "main"}` | `git diff main` | Compare main branch with working directory |
| `{"base": "HEAD~1", "target": "HEAD"}` | `git diff HEAD~1..HEAD` | Compare last two commits |
| `{"files": ["src/"]}` | `git diff HEAD -- src/` | Only show changes in src directory |

#### Error Conditions

| Error | Cause | Solution |
|-------|-------|----------|
| `Not in a git repository` | Working directory lacks `.git` folder | Navigate to git repository root |
| `Invalid commit reference` | Base/target commit doesn't exist | Use valid commit hash, branch, or tag |
| `No differences found` | No changes between specified references | Check if files have been modified |
| `Path outside workspace` | Files parameter contains invalid paths | Use paths relative to repository root |

---

## HTTP Server Endpoints

The ShowMe MCP server runs an internal HTTP server to serve generated HTML files.

### `GET /file/:id`

Serves a temporary HTML file for browser display.

#### Parameters

- `id` (path): Unique identifier for the temporary file

#### Response

- **200 OK**: Returns HTML content for browser display
- **404 Not Found**: File ID not found or expired
- **500 Internal Server Error**: Error reading temporary file

### `GET /health`

Health check endpoint for monitoring server status.

#### Response

```json
{
  "status": "ok",
  "tempFiles": 3
}
```

## TypeScript Interfaces

### Tool Request Types

```typescript
interface ShowFileRequest {
  path: string;
  line_highlight?: number;
}

interface ShowDiffRequest {
  base?: string;
  target?: string;
  files?: string[];
}
```

### Response Types

```typescript
interface MCPResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

interface DiffStats {
  files: number;
  insertions: number;
  deletions: number;
}
```

### Configuration Types

```typescript
interface FileViewOptions {
  filename: string;
  filepath: string;
  content: string;
  language: string;
  lineHighlight?: number;
  fileSize: number;
  lastModified: Date;
}

interface DiffRenderOptions {
  base: string;
  target: string;
  files: string[];
}
```

## Error Handling Reference

### Error Categories

#### **Path Security Errors**
- `Path outside workspace: {path}` - Directory traversal attempt
- `Invalid path containing '..': {path}` - Path contains parent directory references
- `File not accessible: {path}` - Permission denied or file doesn't exist

#### **Git Repository Errors**  
- `Not in a git repository` - Working directory is not a git repo
- `Invalid commit reference: {ref}` - Commit/branch/tag doesn't exist
- `Git command failed: {command}` - Git operation returned non-zero exit code

#### **File System Errors**
- `File too large: {size}MB (max 10MB)` - File exceeds size limit
- `Path is not a file: {path}` - Path points to directory or special file
- `Error reading file: {path}` - I/O error during file read

#### **Server Errors**
- `HTTP server failed to start` - Port already in use or permission denied
- `Failed to open browser: {error}` - System browser launch failed
- `Template generation failed: {error}` - HTML generation error

### Error Response Format

All errors follow consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: {category}: {specific_message}"
    }
  ]
}
```

## Performance Specifications

### File Size Limits

- **Text Files**: 10MB maximum for syntax highlighting
- **Binary Files**: 50MB maximum for basic display
- **Git Diffs**: 1000 files maximum per diff request

### Timeout Values

- **File Read Operations**: 5 seconds
- **Git Commands**: 30 seconds  
- **Browser Launch**: 10 seconds
- **HTTP Server Response**: 30 seconds

### Resource Management

- **Temporary Files**: Auto-cleanup after 1 hour
- **Memory Usage**: Streaming for files >1MB
- **Concurrent Requests**: 10 simultaneous file operations
- **HTTP Connections**: Keep-alive enabled, 2 minute timeout

## Security Considerations

### Path Validation

- All file paths resolved relative to workspace root
- Directory traversal (`../`) explicitly blocked
- Symbolic links followed but validated within workspace
- Hidden files (`.`) accessible if explicitly requested

### Content Security

- No code execution from displayed files
- HTML content sanitized before serving
- XSS protection through Content Security Policy
- No persistent storage of sensitive data

### Network Security

- HTTP server bound to localhost only
- Temporary URLs use cryptographically secure random IDs
- No external network requests from server
- Automatic cleanup prevents URL enumeration attacks