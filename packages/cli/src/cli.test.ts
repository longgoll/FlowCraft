import { describe, it, expect, vi } from 'vitest';
import { analyzeProject, runCli } from './cli.js';

describe('TraceLens Developer CLI', () => {
  it('correctly analyzes workspace root', () => {
    const analysis = analyzeProject(process.cwd());
    expect(analysis).toBeDefined();
    expect(analysis.packageManager).toBe('pnpm');
  });

  it('runs doctor command without error', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    runCli(['doctor']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[TraceLens Doctor]'));
    consoleSpy.mockRestore();
  });

  it('runs init command and prints setup guide', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    runCli(['init']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('TraceLens Observability Hub'));
    consoleSpy.mockRestore();
  });
});
