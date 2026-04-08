import axios from 'axios';
import { input, password, select, checkbox, confirm } from '@inquirer/prompts';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import {
  printBanner,
  printStep,
  printSuccess,
  printError,
  printKeyBox,
  printNextStep,
  printDivider,
  printInfo,
  spinner,
} from '../helpers/cli-ui.js';

const DEFAULT_API_URL = 'https://api-doc-gen.fly.dev';
const CONFIG_FILE = '.apidocgen.yml';

export async function setupCommand(): Promise<void> {
  printBanner('ApiDocGen Setup');

  const apiUrl = DEFAULT_API_URL;

  // ─── Step 1: Account ────────────────────────────────────────────────
  printStep(1, 4, 'Account');

  const hasAccount = await confirm({
    message: 'Do you already have an ApiDocGen account?',
    default: false,
  });

  let apiKey: string;

  if (hasAccount) {
    apiKey = await input({
      message: 'Paste your API key:',
      validate: (v: string) =>
        /^adg_[a-f0-9]{48}$/.test(v) ||
        'Invalid format. API keys start with adg_ followed by 48 hex characters.',
    });
    printSuccess('API key accepted');
  } else {
    const email = await input({
      message: 'Email:',
      validate: (v: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Enter a valid email address',
    });

    const name = await input({
      message: 'Your name:',
      validate: (v: string) =>
        v.length >= 2 || 'Name must be at least 2 characters',
    });

    const pwd = await password({
      message: 'Password (min 8 characters):',
      validate: (v: string) =>
        v.length >= 8 || 'Password must be at least 8 characters',
    });

    const spin = spinner('Creating your account...');
    spin.start();

    try {
      const response = await axios.post(`${apiUrl}/auth/register`, {
        email,
        name,
        password: pwd,
      });

      spin.stop();
      printSuccess('Account created');
      apiKey = response.data.apiKey;
      printKeyBox(apiKey);

      const saved = await confirm({
        message: 'Have you copied and saved your API key?',
        default: false,
      });

      if (!saved) {
        printKeyBox(apiKey);
        await confirm({
          message: 'Please copy it now. Ready to continue?',
          default: true,
        });
      }
    } catch (error: any) {
      spin.stop();
      const msg = error.response?.data?.message || error.message;
      if (msg.includes('already exists')) {
        printError(
          'An account with this email already exists.',
          'Use your existing API key, or choose "yes" when asked if you have an account.',
        );
      } else {
        printError(
          `Registration failed: ${msg}`,
          'Check your internet connection and try again.',
        );
      }
      process.exit(1);
    }
  }

  console.log('');

  // ─── Step 2: Project ────────────────────────────────────────────────
  printStep(2, 4, 'Project');

  const projectName = await input({
    message: 'Project name:',
    validate: (v: string) =>
      v.length >= 2 || 'Name must be at least 2 characters',
  });

  const slug = await input({
    message: 'Project slug (URL-friendly ID):',
    default: projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''),
    validate: (v: string) =>
      /^[a-z0-9-]+$/.test(v) ||
      'Only lowercase letters, numbers, and hyphens allowed',
  });

  const framework = await select({
    message: 'Framework:',
    choices: [
      { name: 'NestJS', value: 'nestjs' },
      { name: 'Express', value: 'express' },
      { name: 'FastAPI', value: 'fastapi' },
      { name: 'Spring', value: 'spring' },
      { name: 'Laravel', value: 'laravel' },
      { name: 'Rails', value: 'rails' },
      { name: 'Other', value: 'other' },
    ],
  });

  const baseUrl = await input({
    message: 'Your API base URL:',
    default: 'https://api.example.com',
    validate: (v: string) =>
      v.startsWith('http') || 'Must start with http:// or https://',
  });

  const authMethod = await select({
    message: 'How does your API authenticate?',
    choices: [
      { name: 'API Key (header)', value: 'api-key' },
      { name: 'Bearer Token', value: 'bearer' },
      { name: 'Basic Auth', value: 'basic' },
      { name: 'No authentication', value: 'none' },
    ],
  });

  let authHeader: string | undefined;
  if (authMethod !== 'none') {
    authHeader = await input({
      message: 'Auth header name:',
      default: authMethod === 'api-key' ? 'x-api-key' : 'Authorization',
    });
  }

  const snippetLangs = await checkbox({
    message: 'Languages for code examples:',
    choices: [
      { name: 'JavaScript', value: 'javascript', checked: true },
      { name: 'Python', value: 'python', checked: true },
      { name: 'cURL', value: 'curl', checked: true },
      { name: 'PHP', value: 'php' },
      { name: 'Go', value: 'go' },
      { name: 'Java', value: 'java' },
      { name: 'C#', value: 'csharp' },
      { name: 'Ruby', value: 'ruby' },
      { name: 'Rust', value: 'rust' },
    ],
  });

  const spin2 = spinner('Creating project...');
  spin2.start();

  try {
    await axios.post(
      `${apiUrl}/projects`,
      {
        name: projectName,
        slug,
        framework,
        baseUrl,
        authMethod: authMethod !== 'none' ? authMethod : undefined,
        authHeader,
        snippetLangs,
        outputFormat: 'json',
      },
      { headers: { 'x-api-key': apiKey } },
    );
    spin2.stop();
    printSuccess(`Project "${projectName}" created`);
  } catch (error: any) {
    spin2.stop();
    const msg = error.response?.data?.message || error.message;
    if (msg.includes('already exists') || error.response?.status === 409) {
      printSuccess(`Project "${slug}" already exists — continuing`);
    } else {
      printError(
        `Failed to create project: ${msg}`,
        'Check your API key and try again.',
      );
      process.exit(1);
    }
  }

  console.log('');

  // ─── Step 3: OpenAPI Spec ───────────────────────────────────────────
  printStep(3, 4, 'OpenAPI Spec');

  const specFile = await input({
    message: 'Path to your OpenAPI spec file:',
    default: './openapi.json',
    validate: (v: string) => {
      if (!v.endsWith('.json') && !v.endsWith('.yaml') && !v.endsWith('.yml')) {
        return 'File must be .json, .yaml, or .yml';
      }
      return true;
    },
  });

  const specPath = join(process.cwd(), specFile);

  if (!existsSync(specPath)) {
    printError(
      `File not found: ${specFile}`,
      `Generate your OpenAPI spec first. For NestJS: curl http://localhost:8000/api-docs-json > ${specFile}`,
    );
    saveConfig(apiUrl, apiKey, slug, specFile);
    printSuccess(`Config saved to ${CONFIG_FILE}`);
    printNextStep(
      'apidocgen sync',
      'Generate your spec file, then run sync to complete setup',
    );
    return;
  }

  printSuccess(`Found ${specFile}`);
  console.log('');

  // ─── Step 4: Sync ───────────────────────────────────────────────────
  printStep(4, 4, 'Sync & Generate Documentation');

  const { syncWithPolling } = await import('../helpers/sync-with-polling.js');
  const success = await syncWithPolling({
    apiUrl,
    apiKey,
    slug,
    specPath,
  });

  // Save config
  saveConfig(apiUrl, apiKey, slug, specFile);

  if (!success) {
    return;
  }

  // ─── Done ───────────────────────────────────────────────────────────
  console.log('');
  printDivider();
  printSuccess('Setup complete!');
  console.log('');
  printInfo('Docs (JSON)', `${apiUrl}/docs/${slug}?format=json`);
  printInfo('Docs (HTML)', `${apiUrl}/docs/${slug}?format=html&fullPage=true`);
  printInfo('Config file', CONFIG_FILE);
  console.log('');
  printNextStep(
    'apidocgen sync',
    'Run this anytime your API changes to update the documentation',
  );
}

function saveConfig(
  apiUrl: string,
  apiKey: string,
  slug: string,
  specFile: string,
): void {
  const configPath = join(process.cwd(), CONFIG_FILE);
  const config = {
    api_url: apiUrl,
    api_key: apiKey,
    project_slug: slug,
    spec_file: specFile,
  };
  writeFileSync(configPath, YAML.stringify(config), 'utf-8');
}
