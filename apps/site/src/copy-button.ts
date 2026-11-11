const COPIED = 'Copied';
const COPY_FAILED = 'Could not copy. Select the text and copy it.';
const STATUS_RESET_MS = 3_000;

/**
 * Turns on the copy buttons next to code blocks. They ship hidden, so a page without JavaScript
 * or without the clipboard API shows plain, selectable text and no button that does nothing.
 */
export function enableCopyButtons(root: Document): void {
  if (!navigator.clipboard) return;
  for (const button of root.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
    const targetId = button.dataset.copy ?? '';
    const source = root.getElementById(targetId);
    const status = root.querySelector<HTMLElement>(`[data-copy-status="${targetId}"]`);
    if (!source) continue;
    button.hidden = false;
    button.addEventListener('click', () => void copy(commandsOf(source), status));
  }
}

/**
 * The block's text without its `data-comment` spans or blank lines. Pasted into a shell such as zsh,
 * which by default does not treat `#` as a comment, a comment line would run as a command.
 */
function commandsOf(block: HTMLElement): string {
  const copy = block.cloneNode(true) as HTMLElement;
  for (const comment of copy.querySelectorAll('[data-comment]')) comment.remove();
  return (copy.textContent ?? '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .join('\n');
}

async function copy(text: string, status: HTMLElement | null): Promise<void> {
  let message = COPIED;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    message = COPY_FAILED;
  }
  if (!status) return;
  status.textContent = message;
  setTimeout(() => {
    if (status.textContent === message) status.textContent = '';
  }, STATUS_RESET_MS);
}
