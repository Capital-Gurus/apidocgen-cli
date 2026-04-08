import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import {
  printBanner,
  printError,
  printInfo,
  printNextStep,
  printDivider,
} from '../helpers/cli-ui.js';

const CONFIG_FILE = '.apidocgen.yml';

interface CliConfig {
  api_url: string;
  api_key: string;
  project_slug: string;
  spec_file: string;
}

export async function syncCommand(): Promise<void> {
  printBanner('ApiDocGen Sync');

  const configPath = join(process.cwd(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    printError(
      `${CONFIG_FILE} not found in this directory.`,
      'Run `apidocgen setup` first to configure your project.',
    );
    process.exit(1);
  }

  const configRaw = readFileSync(configPath, 'utf-8');
  const config: CliConfig = YAML.parse(configRaw);

  if (!config.api_key || !config.project_slug || !config.spec_file) {
    printError(
      `Invalid ${CONFIG_FILE} — missing required fields.`,
      'Run `apidocgen setup` to reconfigure.',
    );
    process.exit(1);
  }

  const specPath = join(process.cwd(), config.spec_file);
  if (!existsSync(specPath)) {
    printError(
      `Spec file not found: ${config.spec_file}`,
      'Generate your OpenAPI spec first. For NestJS: curl http://localhost:8000/api-docs-json > openapi.json',
    );
    process.exit(1);
  }

  const apiUrl = config.api_url || 'https://api-doc-gen.fly.dev';

  printInfo('Project', config.project_slug);
  printInfo('Spec', config.spec_file);
  console.log('');

  const { checkPendingSync, waitForSync, syncWithPolling } = await import(
    '../helpers/sync-with-polling.js'
  );

  // Check for pending/failed syncs first
  const pending = await checkPendingSync(
    apiUrl,
    config.api_key,
    config.project_slug,
  );

  let success = false;

  if (pending === 'resume') {
    success = await waitForSync(apiUrl, config.api_key, config.project_slug);
  } else if (pending === 'retry' || pending === 'skip') {
    success = await syncWithPolling({
      apiUrl,
      apiKey: config.api_key,
      slug: config.project_slug,
      specPath,
    });
  }

  if (success) {
    printDivider();
    printNextStep(
      `curl -s "${apiUrl}/docs/${config.project_slug}?format=json" -H "x-api-key: ${config.api_key.substring(0, 12)}..."`,
      'View your generated documentation',
    );
  } else {
    process.exit(1);
  }
}
