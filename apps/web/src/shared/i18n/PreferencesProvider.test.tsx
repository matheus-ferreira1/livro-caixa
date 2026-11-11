import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { usePreferences } from '@/shared/i18n/PreferencesProvider';
import { mockApi, renderWithRoute } from '@/test/render';

const LOAD_TIMEOUT_MS = 4000;

function Amount() {
  const { money } = usePreferences();
  return <p>{money.format(123_456)}</p>;
}

describe('PreferencesProvider', () => {
  test('renders nothing of the app until the preferences have loaded', async () => {
    mockApi((url) =>
      url === '/api/preferences' ? { status: 200, body: { language: 'en', currency: 'USD' } } : undefined,
    );
    renderWithRoute(<Amount />, '/', { preferences: null });
    expect(screen.queryByText(/\d/)).not.toBeInTheDocument();
    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();
  });

  test('shows a bilingual error with a retry instead of the app when they cannot be loaded', async () => {
    let attempts = 0;
    mockApi((url) => {
      if (url !== '/api/preferences') return undefined;
      attempts += 1;
      return attempts <= 2
        ? { status: 500, body: { error: { code: 'internal', message: 'x' } } }
        : { status: 200, body: { language: 'en', currency: 'USD' } };
    });
    const { user } = renderWithRoute(<Amount />, '/', { preferences: null });

    const alert = await screen.findByRole('alert', {}, { timeout: LOAD_TIMEOUT_MS });
    expect(alert).toHaveTextContent('Não foi possível carregar as preferências.');
    expect(alert).toHaveTextContent('Could not load the preferences.');
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente / Try again' }));
    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
