import type { authPtBR } from '../pt-BR/auth';

export const authEn: typeof authPtBR = {
  'auth.title': 'Sign in',
  'auth.subtitle': 'Use the account created on your instance.',
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.hidePassword': 'Hide password',
  'auth.showPassword': 'Show password',
  'auth.remember': 'Keep me signed in on this device',
  'auth.forgot': 'Forgot your password?',
  'auth.forgotHelp':
    'Since you host each instance yourself, the password is reset by the server administrator, with the container’s reset command.',
  'auth.submit': 'Sign in',
  'auth.submitting': 'Signing in…',
  'auth.noAccount':
    'No account yet? The first account is created by the administrator when setting up the instance.',

  'auth.brandLabel': 'About Livro-caixa',
  'auth.brandHeadline': 'Your finances, on your server.',
  'auth.brandPitch':
    'Entries, split bills and the month’s settlement in an app you host yourself. Your data stays only on your instance.',
  'auth.brandFeatureDocker': 'Runs on Docker, locally or on any server',
  'auth.brandFeatureOpen': 'Open source, no account with any third-party service',
  'auth.brandFeatureLogin': 'Access protected by a login on each instance',
  'auth.brandFooter': 'Livro-caixa · self-hosted',
};
