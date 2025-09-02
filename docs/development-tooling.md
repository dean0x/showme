# ShowMe MCP Server - Development Tooling Configuration

## Vitest Configuration

**File**: `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '**/*.d.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*'],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/__tests__/**',
        'src/types/**',
        'dist/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./src/__tests__/setup.ts']
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
});
```

## Test Setup File

**File**: `src/__tests__/setup.ts`

```typescript
import { beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock console.error to avoid cluttering test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

// Test utilities
export const TEST_PORT = 3848;
export const TEST_TIMEOUT = 10000;

export async function createTempFile(content: string, filename: string): Promise<string> {
  const tempDir = path.join(process.cwd(), '.test-temp');
  await fs.mkdir(tempDir, { recursive: true });
  
  const filePath = path.join(tempDir, filename);
  await fs.writeFile(filePath, content);
  
  return filePath;
}

export async function cleanupTempFiles(): Promise<void> {
  const tempDir = path.join(process.cwd(), '.test-temp');
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
```

## ESLint Configuration

**File**: `.eslintrc.json`

```json
{
  "root": true,
  "env": {
    "es2024": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": [
    "@typescript-eslint",
    "import"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-non-null-assertion": "warn",
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }
    ],
    "prefer-const": "error",
    "no-var": "error",
    "no-console": ["warn", { "allow": ["error"] }],
    "eqeqeq": "error",
    "curly": "error"
  },
  "overrides": [
    {
      "files": ["**/*.test.ts", "**/*.spec.ts"],
      "env": {
        "jest": true
      },
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off"
      }
    }
  ],
  "ignorePatterns": [
    "dist/",
    "node_modules/",
    "coverage/",
    "*.js"
  ]
}
```

## Prettier Configuration

**File**: `.prettierrc.json`

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "quoteProps": "as-needed",
  "jsxSingleQuote": true,
  "overrides": [
    {
      "files": "*.md",
      "options": {
        "printWidth": 80,
        "proseWrap": "always"
      }
    },
    {
      "files": "*.json",
      "options": {
        "printWidth": 200
      }
    }
  ]
}
```

## Prettier Ignore

**File**: `.prettierignore`

```
# Dependencies
node_modules/

# Build outputs
dist/
build/
coverage/

# Temp files
.showme-temp/
.test-temp/

# Logs
*.log
npm-debug.log*
yarn-debug.log*

# Lock files
package-lock.json
yarn.lock
pnpm-lock.yaml

# Generated files
*.min.js
*.min.css
```

## Additional Development Dependencies

Update `package.json` with development tooling:

```json
{
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
    "@vitest/coverage-v8": "^2.2.0"
  }
}
```

## Updated Package Scripts

**File**: `package.json` scripts section:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,json,md}\"",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist coverage .showme-temp .test-temp",
    "prebuild": "npm run clean && npm run lint && npm run type-check",
    "prepublishOnly": "npm run build && npm run test:run"
  }
}
```

## GitHub Actions CI/CD

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [22.x, 24.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run linting
        run: npm run lint
        
      - name: Run type checking
        run: npm run type-check
        
      - name: Run tests
        run: npm run test:coverage
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/coverage-final.json
          fail_ci_if_error: false

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build package
        run: npm run build
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

## Pre-commit Hook Setup

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run type-check
npm run test:run
```

Add husky to development dependencies:

```json
{
  "devDependencies": {
    "husky": "^9.1.7"
  },
  "scripts": {
    "prepare": "husky install"
  }
}
```

## VS Code Configuration

**File**: `.vscode/settings.json`

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true,
    "**/.showme-temp": true,
    "**/.test-temp": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/coverage": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "jest.jestCommandLine": "npm run test",
  "vitest.enable": true
}
```

**File**: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "vitest.explorer"
  ]
}
```

## Environment Configuration

**File**: `.env.example`

```bash
# Development environment settings
NODE_ENV=development
HTTP_PORT=3847
LOG_LEVEL=debug

# File processing limits
MAX_FILE_SIZE_MB=10
MAX_DIFF_FILES=1000
CLEANUP_INTERVAL_MINUTES=30

# Browser settings
BROWSER_TIMEOUT_SECONDS=10
AUTO_OPEN_BROWSER=true
```

## Docker Support (Optional)

**File**: `Dockerfile`

```dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3847

USER node

CMD ["npm", "start"]
```

**File**: `.dockerignore`

```
node_modules/
npm-debug.log
dist/
coverage/
.git/
.gitignore
README.md
.env
.nyc_output
.test-temp/
.showme-temp/
```

This tooling setup provides comprehensive development support with testing, linting, formatting, and CI/CD automation.