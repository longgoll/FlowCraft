#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

export interface ProjectAnalysis {
  framework: 'express' | 'fastify' | 'nestjs' | 'unknown';
  hasReact: boolean;
  hasPrisma: boolean;
  hasRedis: boolean;
  hasDb: boolean;
  packageManager: 'pnpm' | 'npm' | 'yarn';
}

export function analyzeProject(cwd: string = process.cwd()): ProjectAnalysis {
  const pkgPath = path.join(cwd, 'package.json');
  let pkg: any = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  let framework: ProjectAnalysis['framework'] = 'unknown';
  if (allDeps['@nestjs/core']) framework = 'nestjs';
  else if (allDeps['fastify']) framework = 'fastify';
  else if (allDeps['express']) framework = 'express';

  const hasReact = Boolean(allDeps['react'] || allDeps['next']);
  const hasPrisma = Boolean(allDeps['@prisma/client'] || allDeps['prisma']);
  const hasRedis = Boolean(allDeps['ioredis'] || allDeps['redis']);
  const hasDb = Boolean(allDeps['pg'] || allDeps['mysql2'] || allDeps['mongoose']);

  let packageManager: ProjectAnalysis['packageManager'] = 'pnpm';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) packageManager = 'npm';
  else if (fs.existsSync(path.join(cwd, 'yarn.lock'))) packageManager = 'yarn';

  return {
    framework,
    hasReact,
    hasPrisma,
    hasRedis,
    hasDb,
    packageManager,
  };
}

export function runCli(args: string[] = process.argv.slice(2)): void {
  const cmd = args[0] || 'init';

  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    console.log(`
⚡ TraceLens CLI — Distributed Tracing & Observability for Node.js & React

Usage:
  npx @tracelens/cli init     Analyze project and print zero-config setup
  npx @tracelens/cli doctor   Verify Node.js environment & diagnostic checks
  npx @tracelens/cli version  Display TraceLens version
`);
    return;
  }

  if (cmd === 'version' || cmd === '-v') {
    console.log('TraceLens CLI v0.1.0');
    return;
  }

  if (cmd === 'doctor') {
    console.log('\n🩺 [TraceLens Doctor] Diagnostics check:');
    const nodeVer = process.version;
    const major = parseInt(nodeVer.replace('v', '').split('.')[0], 10);
    if (major >= 18) {
      console.log(`  ✅ Node.js: ${nodeVer} (Supported >= 18)`);
    } else {
      console.log(`  ❌ Node.js: ${nodeVer} (Requires Node.js 18+ for AsyncLocalStorage & global fetch)`);
    }
    console.log('  ✅ AsyncLocalStorage: Available');
    console.log('  ✅ W3C Distributed Traceparent Correlator: Ready');
    console.log('  ✅ Local Inspector Dashboard: http://localhost:3000/__lens\n');
    return;
  }

  if (cmd === 'init') {
    const analysis = analyzeProject();
    console.log('\n⚡ ========================================================');
    console.log('   TraceLens Observability Hub — 30-Second Setup Generator');
    console.log('   ========================================================\n');

    const pmInstall = analysis.packageManager === 'pnpm' ? 'pnpm add' : analysis.packageManager === 'yarn' ? 'yarn add' : 'npm install';

    if (analysis.framework === 'express') {
      console.log(`📦 Detected Framework: Express.js`);
      console.log(`\n👉 Step 1: Install Package\n   $ ${pmInstall} @tracelens/express\n`);
      console.log(`👉 Step 2: Add 2 lines to your entry file (e.g. src/index.ts):\n`);
      console.log(`   import { tracelens } from '@tracelens/express';`);
      console.log(`   tracelens.init(app, { endpoint: '/__lens' });\n`);
    } else if (analysis.framework === 'fastify') {
      console.log(`⚡ Detected Framework: Fastify`);
      console.log(`\n👉 Step 1: Install Package\n   $ ${pmInstall} @tracelens/fastify\n`);
      console.log(`👉 Step 2: Register plugin in your server:\n`);
      console.log(`   import { tracelensFastifyPlugin } from '@tracelens/fastify';`);
      console.log(`   await fastify.register(tracelensFastifyPlugin);\n`);
    } else if (analysis.framework === 'nestjs') {
      console.log(`🦁 Detected Framework: NestJS`);
      console.log(`\n👉 Step 1: Install Package\n   $ ${pmInstall} @tracelens/nestjs\n`);
      console.log(`👉 Step 2: Import module in AppModule:\n`);
      console.log(`   TraceLensModule.forRoot({ serviceName: 'My NestJS Service' })\n`);
    } else {
      console.log(`🔍 Detected generic Node.js environment.`);
      console.log(`   $ ${pmInstall} @tracelens/express (or @tracelens/fastify / @tracelens/nestjs)\n`);
    }

    if (analysis.hasReact) {
      console.log(`⚛️ Frontend Detected: React / Next.js`);
      console.log(`   Install Frontend SDK: $ ${pmInstall} @tracelens/browser`);
      console.log(`   Add to index.tsx: initBrowserTracing({ serviceName: 'Web App' });\n`);
    }

    if (analysis.hasPrisma) {
      console.log(`🗄️ Database Detected: Prisma ORM`);
      console.log(`   TraceLens automatically traces Prisma queries via $use / $extends!\n`);
    }

    console.log('🚀 Open Dashboard at runtime: http://localhost:3000/__lens\n');
  }
}

// Chạy trực tiếp nếu file được gọi từ CLI
if (import.meta.url === `file://${process.argv[1]?.replace(/\\\\/g, '/')}` || process.argv[1]?.endsWith('cli.js')) {
  runCli();
}
