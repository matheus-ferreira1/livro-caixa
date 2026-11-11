import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableCopyButtons } from './copy-button';

function renderBlock() {
  document.body.innerHTML = `
    <pre id="commands"><code># a comment
cp .env.example .env
docker compose up --build</code></pre>
    <button type="button" data-copy="commands" hidden>Copy commands</button>
    <span data-copy-status="commands" role="status"></span>`;
  return {
    button: document.querySelector('button') as HTMLButtonElement,
    status: document.querySelector('[role="status"]') as HTMLElement,
  };
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('enableCopyButtons', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('keeps the buttons hidden when the browser has no clipboard API', () => {
    vi.stubGlobal('navigator', {});
    const { button } = renderBlock();
    enableCopyButtons(document);
    expect(button.hidden).toBe(true);
  });

  it('shows the button and copies the block’s text', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    const { button, status } = renderBlock();
    enableCopyButtons(document);
    expect(button.hidden).toBe(false);

    button.click();
    await vi.waitFor(() => expect(status.textContent).toBe('Copied'));
    expect(writeText).toHaveBeenCalledWith('# a comment\ncp .env.example .env\ndocker compose up --build');
  });

  it('says so when copying fails', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    const { button, status } = renderBlock();
    enableCopyButtons(document);

    button.click();
    await vi.waitFor(() => expect(status.textContent).toBe('Could not copy. Select the text and copy it.'));
  });
});
