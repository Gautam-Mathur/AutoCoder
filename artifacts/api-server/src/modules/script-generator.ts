type ScriptLanguage = 'python' | 'go' | 'rust' | 'node' | 'typescript';

interface ScriptDetectionResult {
  isScript: boolean;
  language: ScriptLanguage;
  taskDescription: string;
}

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

interface GeneratedScript {
  name: string;
  description: string;
  language: ScriptLanguage;
  files: GeneratedFile[];
  runCommands: string[];
}

const STRONG_WEB_KEYWORDS = [
  'website', 'web app', 'webapp', 'webpage', 'web page', 'landing page',
  'dashboard', 'frontend', 'front-end', 'react', 'vue', 'angular',
  'html', 'css', 'page', 'site', 'ecommerce', 'e-commerce',
  'store', 'shop', 'blog', 'portfolio', 'gallery',
  'fullstack', 'full-stack', 'full stack', 'component', 'ui',
  'layout', 'responsive', 'navbar', 'sidebar', 'modal',
  'saas', 'cms', 'admin panel', 'checkout', 'cart',
];

const SCRIPT_KEYWORDS = [
  'script', 'program', 'cli', 'command line', 'command-line',
  'tool', 'utility', 'automate', 'automation', 'batch',
  'scrape', 'scraper', 'scraping', 'crawl', 'crawler',
  'parse', 'parser', 'parsing', 'convert', 'converter',
  'process', 'processor', 'monitor', 'rename', 'transform',
  'extract', 'analyze', 'backup', 'sync',
  'download', 'upload', 'migrate', 'clean', 'format',
  'sort', 'filter', 'merge', 'split', 'compress',
  'encrypt', 'decrypt', 'hash', 'validate', 'lint',
  'benchmark', 'profile', 'daemon',
  'cron', 'scheduler', 'watcher', 'notifier',
  'print', 'hello world', 'hello-world',
];

const LANGUAGE_PATTERNS: Record<ScriptLanguage, RegExp[]> = {
  python: [
    /\bpython\b/i,
    /\bpy\b/i,
    /\bpip\b/i,
    /\bpython3?\s/i,
  ],
  go: [
    /\bgo\s+(?:program|script|tool|cli|utility|code|app)\b/i,
    /\bgolang\b/i,
    /\bgo\s+(?:that|to|for|which)\b/i,
    /\bin\s+go\b/i,
    /\busing\s+go\b/i,
    /\bwith\s+go\b/i,
  ],
  rust: [
    /\brust\b/i,
    /\bcargo\b/i,
  ],
  typescript: [
    /\btypescript\b/i,
    /\bts\s+(?:script|program|tool|cli)\b/i,
  ],
  node: [
    /\bnode\.?js?\b/i,
    /\bnode\s+script\b/i,
    /\bnpm\b/i,
    /\bdeno\b/i,
  ],
};

const PYTHON_IMPORTS: Record<string, string[]> = {
  csv: ['import csv', 'import os'],
  json: ['import json', 'import os'],
  scrape: ['import requests', 'from bs4 import BeautifulSoup'],
  http: ['import requests'],
  file: ['import os', 'import shutil', 'from pathlib import Path'],
  image: ['from PIL import Image', 'import os'],
  pdf: ['import PyPDF2', 'import os'],
  email: ['import smtplib', 'from email.mime.text import MIMEText'],
  database: ['import sqlite3'],
  regex: ['import re'],
  date: ['from datetime import datetime, timedelta'],
  api: ['import requests', 'import json'],
  xml: ['import xml.etree.ElementTree as ET'],
  yaml: ['import yaml'],
  log: ['import logging'],
  arg: ['import argparse'],
  math: ['import math'],
  random: ['import random'],
  zip: ['import zipfile', 'import os'],
  encrypt: ['from cryptography.fernet import Fernet'],
  hash: ['import hashlib'],
  path: ['from pathlib import Path', 'import os'],
  process: ['import subprocess'],
  thread: ['import threading'],
  async: ['import asyncio'],
  socket: ['import socket'],
  sys: ['import sys'],
  disk: ['import shutil', 'import os', 'import psutil'],
  monitor: ['import psutil', 'import time'],
  rename: ['import os', 'from pathlib import Path'],
  backup: ['import shutil', 'import os', 'from datetime import datetime'],
};

const PYTHON_PACKAGES: Record<string, string> = {
  requests: 'requests==2.31.0',
  bs4: 'beautifulsoup4==4.12.2',
  PIL: 'Pillow==10.2.0',
  PyPDF2: 'PyPDF2==3.0.1',
  yaml: 'PyYAML==6.0.1',
  psutil: 'psutil==5.9.7',
  cryptography: 'cryptography==41.0.7',
};

function sanitizeWords(description: string): string[] {
  return description
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .slice(0, 4);
}

function ensureValidIdentifier(name: string, fallback: string): string {
  if (!name || /^\d/.test(name)) return fallback;
  return name;
}

function toSnakeCase(description: string): string {
  const words = sanitizeWords(description);
  if (words.length === 0) return 'run_task';
  const raw = words.map(w => w.toLowerCase()).join('_');
  return ensureValidIdentifier(raw, 'run_task');
}

function toFunctionName(description: string): string {
  const words = sanitizeWords(description);
  if (words.length === 0) return 'runTask';
  const raw = words
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
  return ensureValidIdentifier(raw, 'runTask');
}

function toProjectName(description: string): string {
  const words = sanitizeWords(description);
  if (words.length === 0) return 'my-script';
  const raw = words.map(w => w.toLowerCase()).join('-');
  if (!raw || /^\d/.test(raw)) return 'my-script';
  return raw;
}

function extractTaskDescription(input: string): string {
  const lower = input.toLowerCase();

  const taskPatterns = [
    /(?:to|that|which|for)\s+(.+?)(?:\s+in\s+(?:python|go|golang|rust|node|typescript|javascript)|\s*$)/i,
    /(?:script|program|tool|cli|utility)\s+(?:to|that|which|for)\s+(.+?)$/i,
    /(?:create|build|make|write|generate|code)\s+(?:a\s+)?(?:\w+\s+)?(?:script|program|tool|cli|utility)\s+(?:to|that|which|for)\s+(.+?)$/i,
    /(?:python|go|golang|rust|node|typescript)\s+(?:script|program|tool|cli|utility)?\s*(?:to|that|which|for)\s+(.+?)$/i,
  ];

  for (const pattern of taskPatterns) {
    const match = lower.match(pattern);
    if (match && match[1].trim().length > 3) return match[1].trim();
  }

  const stripped = lower
    .replace(/(?:create|build|make|write|generate|code)\s+(?:a\s+)?/i, '')
    .replace(/(?:python|go|golang|rust|node\.?js?|typescript|javascript)\s*/i, '')
    .replace(/(?:script|program|tool|cli|utility)\s*/i, '')
    .trim();

  return stripped || 'general purpose utility';
}

function detectRelevantImports(description: string): { imports: string[]; packages: string[] } {
  const lower = description.toLowerCase();
  const imports = new Set<string>();
  const packages = new Set<string>();

  imports.add('import sys');
  imports.add('import os');

  for (const [keyword, importLines] of Object.entries(PYTHON_IMPORTS)) {
    if (lower.includes(keyword)) {
      for (const imp of importLines) {
        imports.add(imp);
        const mod = imp.replace(/^(?:from\s+|import\s+)/, '').split(/[\s.]/)[0];
        if (PYTHON_PACKAGES[mod]) {
          packages.add(PYTHON_PACKAGES[mod]);
        }
      }
    }
  }

  return { imports: Array.from(imports), packages: Array.from(packages) };
}

export function detectStandaloneScript(input: string): ScriptDetectionResult {
  const lower = input.toLowerCase();

  let detectedLanguage: ScriptLanguage | null = null;
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    if (patterns.some(p => p.test(input))) {
      detectedLanguage = lang as ScriptLanguage;
      break;
    }
  }

  if (!detectedLanguage) {
    return { isScript: false, language: 'node', taskDescription: '' };
  }

  const hasStrongWebKeyword = STRONG_WEB_KEYWORDS.some(k => lower.includes(k));
  const hasScriptKeyword = SCRIPT_KEYWORDS.some(k => lower.includes(k));

  const explicitScriptPatterns = [
    /(?:python|go|golang|rust|node|typescript|ts)\s+(?:script|program|cli|tool|utility)/i,
    /(?:write|create|build|make)\s+(?:a\s+)?(?:python|go|golang|rust|node|typescript|ts)\s+(?:script|program|cli|tool|utility)/i,
  ];
  const hasExplicitScriptType = explicitScriptPatterns.some(p => p.test(input));

  if (hasExplicitScriptType && hasScriptKeyword) {
    return {
      isScript: true,
      language: detectedLanguage,
      taskDescription: extractTaskDescription(input),
    };
  }

  if (hasStrongWebKeyword) {
    return { isScript: false, language: 'node', taskDescription: '' };
  }

  const actionPatterns = [
    /(?:write|create|build|make|generate|code)\s+(?:a\s+)?(?:python|go|golang|rust|node|typescript)/i,
    /(?:python|go|golang|rust|node|typescript)\s+(?:script|program|tool|cli|utility|code)/i,
    /(?:in|using|with)\s+(?:python|go|golang|rust|node|typescript)/i,
  ];
  const hasActionPattern = actionPatterns.some(p => p.test(input));

  if (hasScriptKeyword || hasActionPattern) {
    return {
      isScript: true,
      language: detectedLanguage,
      taskDescription: extractTaskDescription(input),
    };
  }

  const languageAsSubject = [
    /^(?:python|go|golang|rust|node\.?js?|typescript)\s+\w+$/i,
    /^(?:a\s+)?(?:python|go|golang|rust|node\.?js?|typescript)\s+(?:project|code)\s*$/i,
  ];
  if (languageAsSubject.some(p => p.test(input.trim()))) {
    return {
      isScript: true,
      language: detectedLanguage,
      taskDescription: extractTaskDescription(input),
    };
  }

  return { isScript: false, language: 'node', taskDescription: '' };
}

function generatePythonScript(taskDescription: string, input: string): GeneratedScript {
  const projectName = toProjectName(taskDescription);
  const funcName = toSnakeCase(taskDescription);
  const { imports, packages } = detectRelevantImports(taskDescription + ' ' + input);

  const mainPy = `#!/usr/bin/env python3
"""${projectName} - ${taskDescription}

Generated by AutoCoder
"""

${imports.join('\n')}


def ${funcName}():
    """${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}."""
    print(f"Starting: ${taskDescription}...")

    # TODO: Implement your ${taskDescription} logic here
    try:
        # Step 1: Setup / read input
        print("Setting up...")

        # Step 2: Process
        print("Processing...")

        # Step 3: Output results
        print("Done! ${taskDescription} completed successfully.")

    except FileNotFoundError as e:
        print(f"Error: File not found - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Entry point."""
    ${funcName}()


if __name__ == "__main__":
    main()
`;

  const requirementsTxt = packages.length > 0
    ? packages.join('\n') + '\n'
    : '# No external dependencies required\n';

  const fence = '```';
  const readmeMd = `# ${projectName}

${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}.

## Requirements

- Python 3.8+
${packages.length > 0 ? `\n## Installation\n\n${fence}bash\npip install -r requirements.txt\n${fence}\n` : ''}
## Usage

${fence}bash
python main.py
${fence}
`;

  return {
    name: projectName,
    description: `Python script to ${taskDescription}`,
    language: 'python',
    files: [
      { path: 'main.py', content: mainPy, language: 'python' },
      { path: 'requirements.txt', content: requirementsTxt, language: 'text' },
      { path: 'README.md', content: readmeMd, language: 'markdown' },
    ],
    runCommands: [
      'Install dependencies: `pip install -r requirements.txt`',
      'Run the script: `python main.py`',
    ],
  };
}

function generateGoScript(taskDescription: string): GeneratedScript {
  const projectName = toProjectName(taskDescription);
  const funcName = toFunctionName(taskDescription);

  const mainGo = `package main

import (
\t"fmt"
\t"log"
\t"os"
)

// ${funcName} performs the main task: ${taskDescription}
func ${funcName}() error {
\tfmt.Println("Starting: ${taskDescription}...")

\t// TODO: Implement your ${taskDescription} logic here

\t// Step 1: Setup / read input
\tfmt.Println("Setting up...")

\t// Step 2: Process
\tfmt.Println("Processing...")

\t// Step 3: Output results
\tfmt.Println("Done! ${taskDescription} completed successfully.")

\treturn nil
}

func main() {
\tif err := ${funcName}(); err != nil {
\t\tlog.Fatalf("Error: %v", err)
\t\tos.Exit(1)
\t}
}
`;

  const goMod = `module ${projectName}

go 1.21
`;

  const fence = '```';
  const readmeMd = `# ${projectName}

${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}.

## Requirements

- Go 1.21+

## Usage

${fence}bash
go run main.go

# Or build and run
go build -o ${projectName}
./${projectName}
${fence}
`;

  return {
    name: projectName,
    description: `Go program to ${taskDescription}`,
    language: 'go',
    files: [
      { path: 'main.go', content: mainGo, language: 'go' },
      { path: 'go.mod', content: goMod, language: 'text' },
      { path: 'README.md', content: readmeMd, language: 'markdown' },
    ],
    runCommands: [
      'Run directly: `go run main.go`',
      'Or build and run: `go build -o app && ./app`',
    ],
  };
}

function generateRustScript(taskDescription: string): GeneratedScript {
  const projectName = toProjectName(taskDescription);
  const crateName = projectName.replace(/-/g, '_');
  const funcName = toSnakeCase(taskDescription);

  const mainRs = `//! ${projectName} - ${taskDescription}
//!
//! Generated by AutoCoder

use std::process;

/// ${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}
fn ${funcName}() -> Result<(), Box<dyn std::error::Error>> {
    println!("Starting: ${taskDescription}...");

    // TODO: Implement your ${taskDescription} logic here

    // Step 1: Setup / read input
    println!("Setting up...");

    // Step 2: Process
    println!("Processing...");

    // Step 3: Output results
    println!("Done! ${taskDescription} completed successfully.");

    Ok(())
}

fn main() {
    if let Err(e) = ${funcName}() {
        eprintln!("Error: {}", e);
        process::exit(1);
    }
}
`;

  const cargoToml = `[package]
name = "${crateName}"
version = "0.1.0"
edition = "2021"

[dependencies]
`;

  const fence = '```';
  const readmeMd = `# ${projectName}

${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}.

## Requirements

- Rust (latest stable)

## Usage

${fence}bash
cargo run

# Build release binary
cargo build --release
./target/release/${crateName}
${fence}
`;

  return {
    name: projectName,
    description: `Rust CLI to ${taskDescription}`,
    language: 'rust',
    files: [
      { path: 'src/main.rs', content: mainRs, language: 'rust' },
      { path: 'Cargo.toml', content: cargoToml, language: 'toml' },
      { path: 'README.md', content: readmeMd, language: 'markdown' },
    ],
    runCommands: [
      'Build and run: `cargo run`',
      'Build release: `cargo build --release`',
    ],
  };
}

function generateNodeScript(taskDescription: string): GeneratedScript {
  const projectName = toProjectName(taskDescription);
  const funcName = toFunctionName(taskDescription);

  const indexJs = `#!/usr/bin/env node
/**
 * ${projectName} - ${taskDescription}
 *
 * Generated by AutoCoder
 */

const fs = require('fs');
const path = require('path');

/**
 * ${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}
 */
function ${funcName}() {
  console.log('Starting: ${taskDescription}...');

  // TODO: Implement your ${taskDescription} logic here
  try {
    // Step 1: Setup / read input
    console.log('Setting up...');

    // Step 2: Process
    console.log('Processing...');

    // Step 3: Output results
    console.log('Done! ${taskDescription} completed successfully.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run
${funcName}();
`;

  const packageJson = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "${taskDescription}",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": [],
  "license": "MIT"
}
`;

  const fence = '```';
  const readmeMd = `# ${projectName}

${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}.

## Requirements

- Node.js 18+

## Usage

${fence}bash
npm install
node index.js
${fence}
`;

  return {
    name: projectName,
    description: `Node.js script to ${taskDescription}`,
    language: 'node',
    files: [
      { path: 'index.js', content: indexJs, language: 'javascript' },
      { path: 'package.json', content: packageJson, language: 'json' },
      { path: 'README.md', content: readmeMd, language: 'markdown' },
    ],
    runCommands: [
      'Install dependencies: `npm install`',
      'Run the script: `node index.js`',
    ],
  };
}

function generateTypeScriptScript(taskDescription: string): GeneratedScript {
  const projectName = toProjectName(taskDescription);
  const funcName = toFunctionName(taskDescription);

  const indexTs = `#!/usr/bin/env npx ts-node
/**
 * ${projectName} - ${taskDescription}
 *
 * Generated by AutoCoder
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * ${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}
 */
function ${funcName}(): void {
  console.log('Starting: ${taskDescription}...');

  // TODO: Implement your ${taskDescription} logic here
  try {
    // Step 1: Setup / read input
    console.log('Setting up...');

    // Step 2: Process
    console.log('Processing...');

    // Step 3: Output results
    console.log('Done! ${taskDescription} completed successfully.');

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

// Run
${funcName}();
`;

  const packageJson = `{
  "name": "${projectName}",
  "version": "1.0.0",
  "description": "${taskDescription}",
  "main": "dist/index.js",
  "scripts": {
    "start": "ts-node index.ts",
    "build": "tsc",
    "run:built": "node dist/index.js"
  },
  "keywords": [],
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0"
  }
}
`;

  const tsconfig = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}
`;

  const fence = '```';
  const readmeMd = `# ${projectName}

${taskDescription.charAt(0).toUpperCase() + taskDescription.slice(1)}.

## Requirements

- Node.js 18+
- TypeScript

## Usage

${fence}bash
npm install
npm start
${fence}
`;

  return {
    name: projectName,
    description: `TypeScript script to ${taskDescription}`,
    language: 'typescript',
    files: [
      { path: 'index.ts', content: indexTs, language: 'typescript' },
      { path: 'tsconfig.json', content: tsconfig, language: 'json' },
      { path: 'package.json', content: packageJson, language: 'json' },
      { path: 'README.md', content: readmeMd, language: 'markdown' },
    ],
    runCommands: [
      'Install dependencies: `npm install`',
      'Run with ts-node: `npm start`',
    ],
  };
}

export function generateStandaloneScript(language: ScriptLanguage, taskDescription: string, input: string): GeneratedScript {
  switch (language) {
    case 'python':
      return generatePythonScript(taskDescription, input);
    case 'go':
      return generateGoScript(taskDescription);
    case 'rust':
      return generateRustScript(taskDescription);
    case 'typescript':
      return generateTypeScriptScript(taskDescription);
    case 'node':
      return generateNodeScript(taskDescription);
  }
}

export function formatScriptResponse(script: GeneratedScript): string {
  let response = `# ${script.name}\n\n${script.description}\n\n`;

  for (const file of script.files) {
    response += `### ${file.path}\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n`;
  }

  response += `---\n\n**How to run:**\n`;
  for (const cmd of script.runCommands) {
    response += `- ${cmd}\n`;
  }

  return response;
}
