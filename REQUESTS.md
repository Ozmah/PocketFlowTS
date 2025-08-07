# API Request Examples

This document provides practical examples for using the PocketFlowTS API with different types of projects and configurations.

## Local Directory Analysis

### TypeScript Projects (Main Use Case)

The following request template works for most TypeScript-based projects including Angular, React, Vue, Svelte, SolidJS, TanStack, Next.js, Express, Hono, and Elysia applications.

```bash
curl -X POST http://localhost:3000/generate-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "source": "/path/to/your/typescript-project",
    "language": "english",
    "maxAbstractions": 8,
    "includeTests": true,
    "includePatterns": [
      "src/**/*.ts",
      "src/**/*.tsx",
      "src/**/*.js",
      "src/**/*.jsx",
      "app/**/*.ts",
      "app/**/*.tsx",
      "pages/**/*.ts",
      "pages/**/*.tsx",
      "components/**/*.ts",
      "components/**/*.tsx",
      "lib/**/*.ts",
      "utils/**/*.ts",
      "services/**/*.ts",
      "hooks/**/*.ts",
      "stores/**/*.ts",
      "*.config.ts",
      "*.config.js"
    ],
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "**/*.d.ts",
      "**/package-lock.json",
      "**/yarn.lock",
      "**/pnpm-lock.yaml"
    ],
    "maxFileSize": 1048576,
    "maxFiles": 100,
    "respectGitignore": true,
    "followSymlinks": false
  }'
```

### Framework-Specific Adjustments

For different TypeScript frameworks, you may want to adjust the `includePatterns`:

#### Angular Projects
```json
"includePatterns": [
  "src/**/*.ts",
  "src/**/*.html",
  "src/**/*.scss",
  "src/**/*.css",
  "*.config.ts"
]
```

#### React/Next.js Projects
```json
"includePatterns": [
  "src/**/*.ts",
  "src/**/*.tsx",
  "components/**/*.ts",
  "components/**/*.tsx",
  "pages/**/*.ts",
  "pages/**/*.tsx",
  "app/**/*.ts",
  "app/**/*.tsx",
  "*.config.ts",
  "*.config.js"
]
```

#### Vue Projects
```json
"includePatterns": [
  "src/**/*.ts",
  "src/**/*.vue",
  "components/**/*.vue",
  "composables/**/*.ts",
  "*.config.ts"
]
```

#### Svelte/SvelteKit Projects
```json
"includePatterns": [
  "src/**/*.ts",
  "src/**/*.svelte",
  "src/**/*.js",
  "*.config.ts",
  "*.config.js"
]
```

#### Node.js Backend Projects (Express, Hono, Elysia)
```json
"includePatterns": [
  "src/**/*.ts",
  "src/**/*.js",
  "routes/**/*.ts",
  "middleware/**/*.ts",
  "services/**/*.ts",
  "controllers/**/*.ts",
  "models/**/*.ts",
  "utils/**/*.ts",
  "*.config.ts"
]
```

### PHP Laravel Projects

```bash
curl -X POST http://localhost:3000/generate-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "source": "/path/to/your/laravel-project",
    "language": "english",
    "maxAbstractions": 8,
    "includeTests": true,
    "includePatterns": [
      "app/**/*.php",
      "routes/**/*.php",
      "config/**/*.php",
      "database/**/*.php",
      "database/migrations/*.php",
      "database/seeders/*.php",
      "database/factories/*.php",
      "resources/views/**/*.blade.php",
      "resources/lang/**/*.php",
      "bootstrap/**/*.php",
      "artisan",
      "composer.json",
      "composer.lock",
      ".env.example"
    ],
    "excludePatterns": [
      "**/vendor/**",
      "**/storage/**",
      "**/public/build/**",
      "**/public/hot",
      "**/node_modules/**",
      "**/*.log",
      "**/cache/**",
      "**/.phpunit.cache/**",
      "**/coverage/**",
      "**/*.env",
      "**/.env.local",
      "**/.env.production"
    ],
    "maxFileSize": 1048576,
    "maxFiles": 100,
    "respectGitignore": true,
    "followSymlinks": false
  }'
```

## Adapting for Other Programming Languages

To analyze projects in other languages, modify the `includePatterns` and `excludePatterns` accordingly:

### Rust Projects
```json
{
  "source": "/path/to/your/rust-project",
  "includePatterns": [
    "src/**/*.rs",
    "tests/**/*.rs",
    "examples/**/*.rs",
    "Cargo.toml",
    "Cargo.lock"
  ],
  "excludePatterns": [
    "**/target/**",
    "**/*.rlib"
  ]
}
```

### Go Projects
```json
{
  "source": "/path/to/your/go-project",
  "includePatterns": [
    "**/*.go",
    "go.mod",
    "go.sum"
  ],
  "excludePatterns": [
    "**/vendor/**",
    "**/*_test.go"
  ]
}
```

### Assembly Projects
```json
{
  "source": "/path/to/your/assembly-project",
  "includePatterns": [
    "**/*.asm",
    "**/*.s",
    "**/*.S",
    "**/*.inc",
    "Makefile",
    "**/*.ld"
  ],
  "excludePatterns": [
    "**/*.o",
    "**/*.bin",
    "**/*.elf"
  ]
}
```

## Quick Language Switch Guide

To quickly adapt the TypeScript template for other languages:

1. **Change the path**: Update `"source"` to point to your project directory
2. **Update file extensions**: Replace TypeScript extensions in `includePatterns`:
   - `.ts/.tsx` → `.rs` (Rust), `.go` (Go), `.asm/.s` (Assembly)
3. **Add language-specific files**: Include build files, configs, and important language files
4. **Update exclusions**: Replace `node_modules`, `dist`, `build` with language-specific build artifacts:
   - `target` (Rust), `vendor` (Go), `*.o/*.bin` (Assembly)

## Common Parameters Explained

- **`source`**: Absolute path to your project directory
- **`language`**: Output language for tutorial content (english, spanish, french, etc.)
- **`maxAbstractions`**: Number of key concepts to identify (1-15, default: 8)
- **`includeTests`**: Whether to analyze test files (useful for understanding project structure)
- **`respectGitignore`**: Honor .gitignore rules (recommended: true)
- **`followSymlinks`**: Follow symbolic links (recommended: false for security)
- **`maxFileSize`**: Maximum file size to process in bytes (default: 1MB)
- **`maxFiles`**: Maximum number of files to analyze (default: 100)

## GitHub Repository Analysis

For analyzing remote repositories, the API automatically detects GitHub URLs and uses the GitHub API to fetch repository contents.

### Example Requests for Popular Repositories

#### Angular Framework (TypeScript/Frontend)
```bash
curl -X POST http://localhost:3000/generate-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://github.com/angular/angular",
    "language": "english",
    "maxAbstractions": 10,
    "includeTests": false,
    "includePatterns": [
      "packages/**/*.ts",
      "aio/**/*.ts",
      "*.config.ts",
      "*.json"
    ],
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/bazel-*/**",
      "**/*.d.ts",
      "**/integration/**",
      "**/e2e/**"
    ],
    "maxFileSize": 512000,
    "maxFiles": 80
  }'
```

#### Laravel Framework (PHP/Backend)
```bash
curl -X POST http://localhost:3000/generate-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://github.com/laravel/laravel",
    "language": "english",
    "maxAbstractions": 8,
    "includeTests": true,
    "includePatterns": [
      "app/**/*.php",
      "routes/**/*.php",
      "config/**/*.php",
      "database/**/*.php",
      "resources/**/*.php",
      "bootstrap/**/*.php",
      "*.php",
      "composer.json"
    ],
    "excludePatterns": [
      "**/vendor/**",
      "**/storage/**",
      "**/public/**",
      "**/node_modules/**",
      "**/*.log",
      "**/cache/**"
    ],
    "maxFileSize": 256000,
    "maxFiles": 60
  }'
```

#### Elysia.js Framework (TypeScript/Backend)
```bash
curl -X POST http://localhost:3000/generate-tutorial \
  -H "Content-Type: application/json" \
  -d '{
    "source": "https://github.com/elysiajs/elysia",
    "language": "english",
    "maxAbstractions": 8,
    "includeTests": false,
    "includePatterns": [
      "src/**/*.ts",
      "example/**/*.ts",
      "*.config.ts",
      "*.config.js",
      "package.json",
      "README.md"
    ],
    "excludePatterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.d.ts",
      "**/coverage/**"
    ],
    "maxFileSize": 256000,
    "maxFiles": 70
  }'
```

### GitHub Repository Analysis Guidelines

#### Key Differences from Local Analysis

1. **No path validation**: GitHub URLs are automatically validated and processed
2. **API rate limits**: Requests are subject to GitHub API rate limits
3. **Public repositories only**: Private repositories require authentication tokens
4. **Remote file access**: Files are fetched via GitHub API, not filesystem

#### Optimizing GitHub Repository Analysis

**For Large Frameworks (Angular, React, Vue)**:
```json
{
  "maxFiles": 80,
  "maxFileSize": 512000,
  "includeTests": false,
  "includePatterns": ["src/**", "packages/**", "lib/**"]
}
```

**For Application Templates (Laravel, Next.js starters)**:
```json
{
  "maxFiles": 60,
  "maxFileSize": 256000,
  "includeTests": true,
  "includePatterns": ["app/**", "src/**", "routes/**"]
}
```

**For Libraries/Tools (Utilities, CLI tools)**:
```json
{
  "maxFiles": 50,
  "maxFileSize": 128000,
  "includeTests": false,
  "includePatterns": ["src/**", "lib/**", "index.*"]
}
```

#### Language-Specific GitHub Patterns

**TypeScript/JavaScript Projects**:
- Focus on `src/`, `lib/`, `packages/` directories
- Exclude `node_modules`, `dist`, `build`
- Include config files (`*.config.ts`, `package.json`)

**PHP Projects**:
- Focus on `app/`, `src/`, `routes/`, `config/` directories  
- Exclude `vendor/`, `storage/`, `public/assets/`
- Include `composer.json`, `*.php` files

**Python Projects**:
- Focus on package directories, `src/` folder
- Exclude `__pycache__/`, `.pyc` files, `venv/`
- Include `requirements.txt`, `setup.py`, `pyproject.toml`

## Tips for Better Results

1. **Start small**: Use `maxFiles: 50` for initial analysis of large projects
2. **Focus on core logic**: Exclude test files and generated code for cleaner tutorials
3. **Include configuration**: Add `*.config.*` files to understand project setup
4. **Language-specific**: Adjust `language` parameter to generate tutorials in your preferred language
5. **Incremental analysis**: For large codebases, analyze specific directories first
6. **GitHub rate limits**: For multiple requests, space them out to avoid hitting API limits