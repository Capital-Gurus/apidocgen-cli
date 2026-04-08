import axios from 'axios';
import { input, password } from '@inquirer/prompts';
import {
  printBanner,
  printSuccess,
  printError,
  printKeyBox,
  printNextStep,
  spinner,
} from '../helpers/cli-ui.js';

const DEFAULT_API_URL = 'https://api-doc-gen.fly.dev';

export async function registerCommand(): Promise<void> {
  printBanner('ApiDocGen — Account Registration');

  const email = await input({
    message: 'Email:',
    validate: (v: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
  });

  const name = await input({
    message: 'Name:',
    validate: (v: string) => v.length >= 2 || 'Name too short',
  });

  const pwd = await password({
    message: 'Password (min 8 chars):',
    validate: (v: string) => v.length >= 8 || 'Password too short',
  });

  const spin = spinner('Creating your account...');
  spin.start();

  try {
    const response = await axios.post(`${DEFAULT_API_URL}/auth/register`, {
      email,
      name,
      password: pwd,
    });

    spin.stop();
    const { apiKey } = response.data;

    printSuccess('Account created successfully');
    printKeyBox(apiKey);
    printNextStep(
      'apidocgen init',
      'Initialize ApiDocGen in your project directory',
    );
  } catch (error: any) {
    spin.stop();
    const msg = error.response?.data?.message || error.message;
    printError(`Registration failed: ${msg}`);
    process.exit(1);
  }
}
