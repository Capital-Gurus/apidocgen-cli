import axios from 'axios';
import { readFileSync } from 'fs';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import {
  printSuccess,
  printError,
  printTable,
  printInfo,
  printWarning,
  spinner,
} from './cli-ui.js';

interface SyncOptions {
  apiUrl: string;
  apiKey: string;
  slug: string;
  specPath: string;
}

interface SyncStatus {
  version: number;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  endpointsTotal: number;
  endpointsReady: number;
  currentEndpoint: string | null;
  endpointCount: number;
}

/**
 * Check if there's a pending/failed sync and offer to resume or retry.
 */
export async function checkPendingSync(
  apiUrl: string,
  apiKey: string,
  slug: string,
): Promise<'resume' | 'retry' | 'skip'> {
  const headers = { 'x-api-key': apiKey };

  try {
    const res = await axios.get(`${apiUrl}/projects/${slug}/sync/status`, {
      headers,
      timeout: 10000,
    });
    const status: SyncStatus = res.data;

    if (status.status === 'PROCESSING') {
      printWarning(
        `Sync in progress (v${status.version}): ${status.endpointsReady}/${status.endpointsTotal} endpoints ready.`,
      );
      const resume = await confirm({
        message: 'A sync is still processing. Wait for it to complete?',
        default: true,
      });
      return resume ? 'resume' : 'skip';
    }

    if (status.status === 'FAILED') {
      printWarning(
        `Previous sync (v${status.version}) failed. ${status.endpointsReady}/${status.endpointsTotal} endpoints were processed.`,
      );
      const retry = await confirm({
        message: 'Would you like to re-sync?',
        default: true,
      });
      return retry ? 'retry' : 'skip';
    }

    if (status.status === 'COMPLETED') {
      return 'skip';
    }
  } catch {
    // No sync found — proceed normally
  }

  return 'retry';
}

/**
 * Wait for an ongoing sync to complete by polling.
 */
export async function waitForSync(
  apiUrl: string,
  apiKey: string,
  slug: string,
): Promise<boolean> {
  return await pollUntilDone(apiUrl, apiKey, slug);
}

/**
 * Start a new sync and poll for completion.
 */
export async function syncWithPolling(options: SyncOptions): Promise<boolean> {
  const { apiUrl, apiKey, slug, specPath } = options;
  const headers = { 'x-api-key': apiKey };

  // Read and parse spec
  let spec: Record<string, any>;
  try {
    const specRaw = readFileSync(specPath, 'utf-8');
    spec = JSON.parse(specRaw);
  } catch {
    printError(
      'Could not parse spec file.',
      'Make sure the file contains valid JSON.',
    );
    return false;
  }

  // Start sync
  const spin = spinner('Sending spec to ApiDocGen...');
  spin.start();

  let syncResult: any;
  try {
    const response = await axios.post(
      `${apiUrl}/projects/${slug}/sync`,
      { spec },
      { headers, timeout: 30000 },
    );
    syncResult = response.data;
    spin.stop();
  } catch (error: any) {
    spin.stop();
    const msg = error.response?.data?.message || error.message;
    printError(`Sync failed: ${msg}`, 'Check your API key and spec file.');
    return false;
  }

  if (syncResult.status === 'SKIPPED') {
    printSuccess(
      `No changes detected (version ${syncResult.version}). Documentation is up to date.`,
    );
    return true;
  }

  printSuccess(
    `Spec accepted — ${syncResult.endpointsTotal} endpoints found. Processing with AI...`,
  );
  console.log('');

  return await pollUntilDone(apiUrl, apiKey, slug);
}

async function pollUntilDone(
  apiUrl: string,
  apiKey: string,
  slug: string,
): Promise<boolean> {
  const headers = { 'x-api-key': apiKey };
  const startTime = Date.now();
  let lastReady = 0;

  while (true) {
    await sleep(3000);

    try {
      const statusRes = await axios.get(
        `${apiUrl}/projects/${slug}/sync/status`,
        { headers, timeout: 10000 },
      );
      const status: SyncStatus = statusRes.data;

      if (status.endpointsReady > lastReady) {
        process.stdout.write('\r' + ' '.repeat(70) + '\r');
        const diff = status.endpointsReady - lastReady;
        for (let i = 0; i < diff; i++) {
          const num = lastReady + i + 1;
          console.log(
            chalk.green('  ✓ ') +
              chalk.dim(`[${num}/${status.endpointsTotal}]`) +
              ' Endpoint ready',
          );
        }
        lastReady = status.endpointsReady;
      }

      if (status.currentEndpoint && status.status === 'PROCESSING') {
        process.stdout.write(
          chalk.dim(`\r  ⠋ Processing ${status.currentEndpoint}...`) +
            ' '.repeat(20),
        );
      }

      if (status.status === 'COMPLETED') {
        process.stdout.write('\r' + ' '.repeat(70) + '\r');
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        printSuccess(`Documentation generated in ${elapsed}s`);
        console.log('');
        printTable([
          { label: 'Version', value: `${status.version}` },
          { label: 'Endpoints', value: `${status.endpointCount}` },
        ]);
        return true;
      }

      if (status.status === 'FAILED') {
        process.stdout.write('\r' + ' '.repeat(70) + '\r');
        if (lastReady > 0) {
          printWarning(
            `${lastReady}/${status.endpointsTotal} endpoints were processed before the failure.`,
          );
        }
        const retry = await confirm({
          message: 'Processing failed. Would you like to retry?',
          default: true,
        });
        if (retry) {
          printInfo('Tip', 'Run `apidocgen sync` to retry.');
        }
        return false;
      }

      if (Date.now() - startTime > 600000) {
        process.stdout.write('\r' + ' '.repeat(70) + '\r');
        printWarning(
          `${lastReady}/${status.endpointsTotal} endpoints processed so far.`,
        );
        const keepWaiting = await confirm({
          message: 'Still processing. Keep waiting?',
          default: true,
        });
        if (!keepWaiting) {
          printInfo(
            'Tip',
            'Processing continues in the background. Run `apidocgen sync` later to check.',
          );
          return false;
        }
      }
    } catch {
      // Status check failed, keep polling
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
