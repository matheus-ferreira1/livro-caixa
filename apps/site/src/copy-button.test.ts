import { afterEach, describe, expect, it, vi } from 'vitest';
import { enableCopyButtons } from './copy-button';

function renderBlock() {
  document.body.innerHTML = `
    <pre><code id="commands"><span data-comment># a comment</span>
cp .env.example .env
bun run test   <span data-comment># a trailing comment</span>
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

  it('shows the button and copies the commands without their comments', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    const { button, status } = renderBlock();
    enableCopyButtons(document);
    expect(button.hidden).toBe(false);

    button.click();
    await vi.waitFor(() => expect(status.textContent).toBe('Copied'));
    // Pasted into a shell, a comment line would be run as a command and a trailing one passed as arguments.
    expect(writeText).toHaveBeenCalledWith('cp .env.example .env\nbun run test\ndocker compose up --build');
  });

  it('says so when copying fails', async () => {
    stubClipboard(() => Promise.reject(new Error('denied')));
    const { button, status } = renderBlock();
    enableCopyButtons(document);

    button.click();
    await vi.waitFor(() => expect(status.textContent).toBe('Could not copy. Select the text and copy it.'));
  });
});
