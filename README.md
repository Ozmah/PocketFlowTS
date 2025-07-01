# PocketFlowTS - AI Codebase Tutorial Generator (Elysia/TypeScript)

## Overview

This application generates chapter-based tutorials for software codebases using Large Language Models. It is a TypeScript API built with Elysia.js and Bun runtime that accepts GitHub repository URLs or local directory paths, then produces downloadable tutorial content in Markdown format.

This project is a TypeScript/Elysia port of the original Python-based "AI Codebase Knowledge Builder" (`https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge`), previously ported to Node.js/Express and now updated to use Elysia.js with Vercel AI SDK integration.

## Features

- **GitHub Repository Analysis**: Fetches and processes files from public GitHub repositories
- **Local Directory Analysis**: Processes local filesystem directories with security validation
- **Source Auto-Detection**: Automatically detects whether input is a GitHub URL or local path
- **Core Abstraction Identification**: Uses LLMs to identify key functions, classes, modules, and their relationships
- **Structured Tutorial Generation**: Creates organized, multi-chapter tutorials in Markdown format
- **Multi-Language Support**: Tutorial content can be generated in various languages
- **Multiple AI Providers**: Supports Google Gemini (OpenAI, and Anthropic Claude soon-ish) via Vercel AI SDK
- **Streaming Pipeline**: Real-time progress updates during tutorial generation
- **File Pattern Filtering**: Include/exclude patterns with glob support
- **Security Features**: Path validation, rate limiting, and input sanitization
- **Interactive API Documentation**: Auto-generated Swagger UI

## Prerequisites

- **Bun**: v1.0 or later (recommended runtime)
- **Node.js**: v18.x or later (alternative runtime)
- **AI API Key**: Google Gemini (OpenAI, and Anthropic Claude soon-ish) API key
- **GitHub Token**: Required for GitHub repository access

## Setup and Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pocketflowts
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   # Required
   GITHUB_TOKEN=your_github_personal_access_token

   # AI Provider Keys (at least one required)
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key
   OPENAI_API_KEY=your_openai_api_key
   CLAUDE_API_KEY=your_anthropic_claude_api_key

   # Optional
   PORT=3000
   NODE_ENV=development
   ```

## Running the Application

**Development Mode**:
```bash
bun dev
```

**Production Build**:
```bash
bun build
bun start
```

The server will start on `http://localhost:3000`

**API Documentation**: Available at `http://localhost:3000/swagger`

**Request Examples**: See [REQUESTS.md](./REQUESTS.md) for detailed examples of different request types for both local directories and remote repositories.

## API Endpoints

### Main Endpoints

#### `POST /generate-tutorial`

Generates a complete tutorial from a GitHub repository or local directory.

**Request Body**:
```json
{
  "source": "https://github.com/owner/repo",
  "language": "english",
  "maxAbstractions": 8,
  "includeTests": true,
  "includePatterns": ["src/**/*.ts", "**/*.js"],
  "excludePatterns": ["**/node_modules/**", "**/*.test.ts"],
  "maxFileSize": 1048576,
  "maxFiles": 100,
  "respectGitignore": true,
  "followSymlinks": false
}
```

**Field Descriptions**:
- `source` (string, required): GitHub repository URL or local directory path
- `language` (string, optional): Target language for tutorial content. Default: "english"
- `maxAbstractions` (number, optional): Maximum number of key abstractions to identify (1-15). Default: 8
- `includeTests` (boolean, optional): Whether to include test files in analysis. Default: true
- `includePatterns` (string[], optional): Glob patterns for files to include
- `excludePatterns` (string[], optional): Glob patterns for files to exclude
- `maxFileSize` (number, optional): Maximum file size in bytes (1KB-10MB). Default: 1MB
- `maxFiles` (number, optional): Maximum number of files to process (1-500). Default: 100
- `respectGitignore` (boolean, optional): Respect .gitignore files (local only). Default: true
- `followSymlinks` (boolean, optional): Follow symbolic links (local only). Default: false

**Success Response**:
```json
{
  "success": true,
  "sourceType": "github",
  "message": "Tutorial generated successfully from GitHub repository!",
  "repository": {
    "name": "example-repo",
    "language": "TypeScript",
    "fullName": "owner/example-repo",
    "defaultBranch": "main"
  },
  "statistics": {
    "totalFiles": 45,
    "totalSize": "2.3MB",
    "processingTime": "12.5s"
  },
  "tutorialFiles": [
    {
      "filename": "index.md",
      "content": "# Tutorial Index...",
      "type": "index"
    }
  ],
  "zipFile": {
    "size": 15420,
    "filename": "example-repo_tutorial.zip",
    "filesCount": 8
  }
}
```

### Testing Endpoints

#### `POST /test-ai`
Tests AI model integration with a simple prompt.

#### `POST /sandbox-unified-crawler`
Tests unified crawling with auto-detection for both GitHub repositories and local directories.

#### `POST /sandbox-flow`
Tests the complete tutorial generation pipeline with mock data.

### Health Endpoints

#### `GET /`
Basic health check endpoint.

## Project Structure

```
.
├── src/
│   ├── services/          # Core service layer
│   │   ├── github-crawler.ts    # GitHub API integration
│   │   ├── local-crawler.ts     # Local filesystem crawler
│   │   ├── pipeline.ts          # Tutorial generation pipeline
│   │   └── ai-service.ts        # AI provider abstraction
│   ├── types/             # TypeScript type definitions
│   │   └── tutorial.ts          # Core data structures
│   ├── utils/             # Utility functions
│   │   └── github-helpers.ts    # GitHub URL validation
│   └── index.ts           # Main application entry point
├── .env                   # Environment variables (create this)
├── bun.lockb             # Bun dependency lockfile
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # This file
└── CLAUDE.md             # Development guidance
```

## Development

**Type Checking**:
```bash
bun typecheck
```

**Linting**:
```bash
bun lint
```

**Linting Fix**:
```bash
bun lint:fix
```

**Testing**:
```bash
bun test
```

## Security Features

- **Path Validation**: Local directory access is restricted to safe paths
- **Input Sanitization**: All user inputs are validated and sanitized
- **Rate Limiting**: API endpoints include rate limiting protection
- **Environment Validation**: Required environment variables are validated at startup
- **Error Handling**: Structured error responses without sensitive information leakage

## Error Handling

The API uses structured error responses with specific HTTP status codes:

- **400**: Configuration errors, invalid input
- **401**: Authentication failures
- **404**: Resource not found
- **422**: Validation errors
- **429**: Rate limit exceeded
- **500**: Internal server errors

All errors include descriptive messages and relevant context for debugging.

## License

MIT License

Copyright (c) 2024 Gabriel Alegría

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

This project is based on the original Python implementation by The Pocket team. The evolution path has been:

1. **Original**: Python-based ([The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge](https://github.com/The-Pocket/PocketFlow-Tutorial-Codebase-Knowledge))
2. **First Port**: Node.js/Express/TypeScript
3. **Current**: Elysia.js/Bun/TypeScript with Vercel AI SDK integration

Special thanks to the original creators for the foundational concept and implementation.