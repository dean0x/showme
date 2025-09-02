# ShowMe MCP Server - Deployment & Publishing Guide

## NPM Publishing Strategy

### Package Configuration

**File**: `package.json` (Complete version)

```json
{
  "name": "showme-mcp",
  "version": "1.0.0",
  "description": "MCP server for ephemeral file viewing in browser with syntax highlighting",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "showme-mcp": "./dist/index.js"
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=22.18.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "file-viewer",
    "syntax-highlighting",
    "git-diff",
    "claude-code",
    "development-tools"
  ],
  "author": "Your Name <your.email@company.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/showme-mcp.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/showme-mcp/issues"
  },
  "homepage": "https://github.com/your-org/showme-mcp#readme",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist coverage .showme-temp .test-temp",
    "prebuild": "npm run clean && npm run lint && npm run type-check",
    "prepublishOnly": "npm run build && npm run test:run",
    "release": "npm run prepublishOnly && npm publish",
    "release:beta": "npm run prepublishOnly && npm publish --tag beta"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^5.1.0",
    "shiki": "^1.24.0",
    "diff2html": "^3.4.52",
    "marked": "^14.2.0",
    "mime-types": "^2.1.35"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "@types/node": "^22.18.0",
    "@typescript-eslint/eslint-plugin": "^8.15.0",
    "@typescript-eslint/parser": "^8.15.0",
    "eslint": "^9.17.0",
    "eslint-plugin-import": "^2.31.0",
    "prettier": "^3.4.2",
    "tsx": "^4.20.0",
    "typescript": "^5.8.0",
    "vitest": "^2.2.0",
    "@vitest/coverage-v8": "^2.2.0",
    "husky": "^9.1.7"
  }
}
```

### Publishing Steps

1. **Prepare Release**
   ```bash
   # Ensure clean working directory
   git status
   
   # Run full test suite
   npm run test:coverage
   
   # Build and verify
   npm run build
   npm pack --dry-run
   ```

2. **Version Management**
   ```bash
   # Patch version (1.0.0 -> 1.0.1)
   npm version patch
   
   # Minor version (1.0.1 -> 1.1.0)
   npm version minor
   
   # Major version (1.1.0 -> 2.0.0)
   npm version major
   
   # Pre-release versions
   npm version prerelease --preid=beta
   ```

3. **Publish to NPM**
   ```bash
   # Production release
   npm run release
   
   # Beta release
   npm run release:beta
   
   # Manual publish
   npm publish
   ```

4. **Post-Release**
   ```bash
   # Push tags to GitHub
   git push origin main --tags
   
   # Create GitHub release
   gh release create v1.0.0 --title "v1.0.0" --notes "Initial release"
   ```

## Claude Code Integration

### Installation Methods

#### Method 1: NPM Global Install
```bash
npm install -g showme-mcp
```

#### Method 2: Direct NPX Usage
```bash
npx showme-mcp
```

#### Method 3: Local Development
```bash
git clone https://github.com/your-org/showme-mcp.git
cd showme-mcp
npm install
npm run build
```

### Claude Code Configuration

**File**: `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "showme": {
      "command": "npx",
      "args": ["showme-mcp"]
    }
  }
}
```

**Alternative configurations**:

```json
{
  "mcpServers": {
    "showme": {
      "command": "node",
      "args": ["/absolute/path/to/showme-mcp/dist/index.js"]
    }
  }
}
```

```json
{
  "mcpServers": {
    "showme-dev": {
      "command": "tsx",
      "args": ["/absolute/path/to/showme-mcp/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Integration Testing

1. **Basic Functionality Test**
   ```bash
   # Test file display
   echo "console.log('Hello World');" > test.js
   
   # In Claude Code terminal, test:
   # "Show me test.js"
   ```

2. **Git Diff Test**
   ```bash
   # Make a change and test diff
   git add test.js
   git commit -m "Add test file"
   echo "console.log('Modified');" > test.js
   
   # In Claude Code terminal, test:
   # "Show me the git diff"
   ```

3. **Error Handling Test**
   ```bash
   # In Claude Code terminal, test:
   # "Show me /etc/passwd"
   # Should fail with security error
   ```

## Production Deployment

### Environment Variables

**Production `.env`**:
```bash
NODE_ENV=production
HTTP_PORT=3847
LOG_LEVEL=info
MAX_FILE_SIZE_MB=10
MAX_DIFF_FILES=1000
CLEANUP_INTERVAL_MINUTES=30
BROWSER_TIMEOUT_SECONDS=10
AUTO_OPEN_BROWSER=true
```

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t showme-mcp:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name showme-mcp \
     -p 3847:3847 \
     -e NODE_ENV=production \
     showme-mcp:latest
   ```

3. **Docker Compose**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     showme-mcp:
       build: .
       ports:
         - "3847:3847"
       environment:
         - NODE_ENV=production
         - LOG_LEVEL=info
       volumes:
         - ./workspace:/workspace:ro
       restart: unless-stopped
   ```

### Monitoring & Observability

1. **Health Checks**
   ```bash
   # Health endpoint
   curl http://localhost:3847/health
   
   # Should return: {"status":"ok","tempFiles":0}
   ```

2. **Log Monitoring**
   ```bash
   # Application logs
   tail -f logs/showme-mcp.log
   
   # Error logs
   grep "ERROR" logs/showme-mcp.log
   ```

3. **Metrics Collection**
   - HTTP response times
   - File processing times  
   - Memory usage
   - Temporary file count
   - Error rates

## Troubleshooting Guide

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 3847
lsof -i :3847

# Kill process if needed
sudo kill -9 <PID>

# Or change port in configuration
export HTTP_PORT=3848
```

#### 2. Browser Won't Open
```bash
# Test browser command manually
open "http://localhost:3847/health"        # macOS
start "http://localhost:3847/health"       # Windows  
xdg-open "http://localhost:3847/health"    # Linux

# Check browser environment
echo $BROWSER
which google-chrome
```

#### 3. File Access Permissions
```bash
# Check file permissions
ls -la /path/to/file

# Fix permissions if needed
chmod 644 /path/to/file
```

#### 4. Git Repository Issues
```bash
# Verify git repository
git rev-parse --git-dir

# Check git installation
git --version
which git
```

#### 5. Syntax Highlighting Not Working
```bash
# Check Shiki installation
npm ls shiki

# Verify language support
node -e "import('shiki').then(({getHighlighter}) => console.log('Shiki OK'))"
```

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
export NODE_ENV=development
npm run dev
```

Debug output includes:
- File path validation
- HTTP server requests
- Git command execution
- Browser launch attempts
- Cleanup operations

### Performance Tuning

1. **File Size Limits**
   ```bash
   # Increase limits for large files
   export MAX_FILE_SIZE_MB=50
   export MAX_DIFF_FILES=5000
   ```

2. **Memory Optimization**
   ```bash
   # Node.js memory limits
   node --max-old-space-size=4096 dist/index.js
   ```

3. **Cleanup Frequency**
   ```bash
   # More aggressive cleanup
   export CLEANUP_INTERVAL_MINUTES=10
   ```

## Security Considerations

### Production Security Checklist

- [ ] **Path Validation**: Ensure all file paths are within workspace
- [ ] **HTTP Server**: Bind only to localhost, never 0.0.0.0
- [ ] **Temporary Files**: Auto-cleanup enabled with reasonable timeouts  
- [ ] **File Size Limits**: Enforce limits to prevent DoS
- [ ] **Error Messages**: Don't expose sensitive system information
- [ ] **Dependencies**: Keep all dependencies updated
- [ ] **Access Logs**: Monitor for suspicious access patterns

### Security Headers

Add to HTTP server responses:
```typescript
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'",
    'Referrer-Policy': 'no-referrer'
  });
  next();
});
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Check for dependency updates
   - Review error logs
   - Monitor disk space usage

2. **Monthly**  
   - Update dependencies
   - Review security advisories
   - Performance benchmarking

3. **Quarterly**
   - Major dependency updates
   - Security audit
   - Load testing

### Update Process

1. **Dependencies**
   ```bash
   # Check for updates
   npm outdated
   
   # Update patch versions
   npm update
   
   # Update major versions (carefully)
   npm install package@latest
   ```

2. **Security Updates**
   ```bash
   # Security audit
   npm audit
   
   # Fix vulnerabilities
   npm audit fix
   
   # Manual fixes
   npm audit fix --force
   ```

This deployment guide ensures reliable production deployment and operation of the ShowMe MCP server.