#!/usr/bin/env node
import { Command } from 'commander';
import { setupCommand } from './commands/setup.js';
import { syncCommand } from './commands/sync.js';
import { registerCommand } from './commands/register.js';

const program = new Command();

program
  .name('apidocgen')
  .description(
    'ApiDocGen CLI — sync your OpenAPI spec and generate AI-powered API documentation',
  )
  .version('0.1.0');

program
  .command('setup')
  .description(
    'Set up ApiDocGen from scratch — register, configure, and sync in one flow',
  )
  .action(async () => {
    try {
      await setupCommand();
    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        console.log('\n  Cancelled.\n');
        process.exit(0);
      }
      throw error;
    }
  });

program
  .command('sync')
  .description('Sync your OpenAPI spec with ApiDocGen')
  .action(async () => {
    try {
      await syncCommand();
    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        console.log('\n  Cancelled.\n');
        process.exit(0);
      }
      throw error;
    }
  });

program
  .command('register')
  .description('Create a new ApiDocGen account and get your API key')
  .action(async () => {
    try {
      await registerCommand();
    } catch (error: any) {
      if (error.name === 'ExitPromptError') {
        console.log('\n  Cancelled.\n');
        process.exit(0);
      }
      throw error;
    }
  });

program.parseAsync().catch((error) => {
  console.error(error);
  process.exit(1);
});
