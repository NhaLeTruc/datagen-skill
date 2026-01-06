#!/usr/bin/env node

import { Command } from 'commander';
import { createGenerateCommand } from './commands/generate';
import { createIntrospectCommand } from './commands/introspect';
import { createInteractiveCommand } from './commands/interactive';

const program = new Command();

program
  .name('testdatagen')
  .description('Production-grade test data generation tool with constraint satisfaction')
  .version('1.0.0');

program.addCommand(createGenerateCommand());
program.addCommand(createIntrospectCommand());
program.addCommand(createInteractiveCommand());

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
