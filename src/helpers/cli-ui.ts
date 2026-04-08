// CLI UI helpers — colors and formatting
import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function spinner(text: string): Ora {
  return ora({ text, spinner: 'dots' });
}

export function printBanner(title: string): void {
  console.log('');
  console.log(chalk.bold.cyan(`  ◆ ${title}`));
  console.log('');
}

export function printStep(step: number, total: number, label: string): void {
  console.log(chalk.dim(`  [${step}/${total}]`) + ` ${label}`);
}

export function printSuccess(message: string): void {
  console.log(chalk.green('  ✓ ') + message);
}

export function printError(message: string, hint?: string): void {
  console.log('');
  console.log(chalk.red('  ✗ ') + message);
  if (hint) {
    console.log(chalk.dim(`    → ${hint}`));
  }
  console.log('');
}

export function printWarning(message: string): void {
  console.log(chalk.yellow('  ⚠ ') + message);
}

export function printInfo(label: string, value: string): void {
  console.log(chalk.dim(`    ${label}: `) + chalk.white(value));
}

export function printKeyBox(apiKey: string): void {
  console.log('');
  console.log(chalk.bgYellow.black.bold(' ⚠  IMPORTANT — SAVE YOUR API KEY '));
  console.log('');
  console.log(
    chalk.dim('  ┌──────────────────────────────────────────────────────────┐'),
  );
  console.log(
    chalk.dim('  │ ') + chalk.green.bold(apiKey) + chalk.dim(' │'),
  );
  console.log(
    chalk.dim('  └──────────────────────────────────────────────────────────┘'),
  );
  console.log('');
  console.log(chalk.yellow('  This key will NOT be shown again. Copy it now.'));
  console.log('');
}

export function printNextStep(command: string, description: string): void {
  console.log('');
  console.log(chalk.dim('  Next step:'));
  console.log(`    ${chalk.cyan(command)} — ${description}`);
  console.log('');
}

export function printDivider(): void {
  console.log(chalk.dim('  ─────────────────────────────────────────'));
}

export function printTable(rows: { label: string; value: string }[]): void {
  const maxLabel = Math.max(...rows.map((r) => r.label.length));
  for (const row of rows) {
    const padding = ' '.repeat(maxLabel - row.label.length);
    console.log(
      chalk.dim(`    ${row.label}${padding}  `) + chalk.white(row.value),
    );
  }
}
