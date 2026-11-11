import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SITE_URL = 'https://matheus-ferreira1.github.io/livro-caixa/';
const REPO_URL = 'https://github.com/matheus-ferreira1/livro-caixa';
const ALLOWED_EXTERNAL_LINKS = [REPO_URL, 'https://brapi.dev'];

const SITE_ROOT = resolve(import.meta.dirname, '..');
const fromSite = (path: string) => resolve(SITE_ROOT, path);
const read = (path: string) => readFileSync(fromSite(path), 'utf8');

const html = read('index.html');
const page = new DOMParser().parseFromString(html, 'text/html');
const all = (selector: string) => Array.from(page.querySelectorAll(selector));
const attribute = (selector: string, name: string) => page.querySelector(selector)?.getAttribute(name);

/** Where a root-relative path in index.html lives on disk: Vite serves `public/` at the base. */
function publicFile(path: string): string {
  return fromSite(`public/${path.replace(/^\//, '')}`);
}

/** Commands that wait for input or never return, so nothing pasted after them in one go would run as intended. */
const BLOCKING_COMMANDS = [/\bcli create-user\b/, /^bun run dev\b/, /^docker compose up\b/];

/** The text a copy button would put on the clipboard: no `data-comment` spans, no blank lines. */
function commandsIn(block: Element): string[] {
  const copy = block.cloneNode(true) as Element;
  for (const comment of copy.querySelectorAll('[data-comment]')) comment.remove();
  return (copy.textContent ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function copyTarget(button: Element): Element {
  const target = page.getElementById(button.getAttribute('data-copy') ?? '');
  if (!target) throw new Error(`No copy target for ${button.outerHTML}`);
  return target;
}

function readmeCommands(): string[] {
  const readme = read('../../README.md');
  const block = /```bash\n([\s\S]*?)```/.exec(readme)?.[1] ?? '';
  return block.split('\n').filter(Boolean);
}

describe('project site', () => {
  it('has one h1, the landmarks and a skip link to the main content', () => {
    expect(all('h1')).toHaveLength(1);
    expect(all('header')).not.toHaveLength(0);
    expect(all('main')).toHaveLength(1);
    expect(all('footer')).not.toHaveLength(0);
    const skipLink = all('a')[0];
    expect(skipLink?.getAttribute('href')).toBe(`#${page.querySelector('main')?.id}`);
  });

  it('points every in-page anchor at an element that exists', () => {
    const targets = all('a[href^="#"]').map((link) => link.getAttribute('href')?.slice(1) ?? '');
    expect(targets).not.toHaveLength(0);
    for (const target of targets) expect(page.getElementById(target), `#${target}`).not.toBeNull();
  });

  it('links the header anchors to Features, Self-host and Contribute', () => {
    const anchors = all('header nav a').map((link) => link.getAttribute('href'));
    expect(anchors).toEqual(['#features', '#self-host', '#contribute']);
  });

  it('sends external links only to the repository or brapi', () => {
    const external = all('a[href^="http"]').map((link) => link.getAttribute('href') ?? '');
    for (const href of external) {
      expect(
        ALLOWED_EXTERNAL_LINKS.some((allowed) => href === allowed || href.startsWith(`${allowed}/`)),
        href,
      ).toBe(true);
    }
  });

  it('links to the repository, its license, the contributing guide, the open work and the issues', () => {
    const hrefs = all('a').map((link) => link.getAttribute('href'));
    expect(hrefs).toContain(REPO_URL);
    expect(hrefs).toContain(`${REPO_URL}/blob/main/LICENSE`);
    expect(hrefs).toContain(`${REPO_URL}/blob/main/CONTRIBUTING.md`);
    expect(hrefs).toContain(`${REPO_URL}/blob/main/docs/status.md#what-comes-next`);
    expect(hrefs).toContain(`${REPO_URL}/issues`);
  });

  it('shows the quick-start commands exactly as the README has them, across its steps in order', () => {
    const blocks = all('#quick-start pre code').map((block) => commandsIn(block));
    expect(blocks.flat()).toEqual(readmeCommands());
  });

  it('gives every copy button a name that says what it copies, and a status next to it', () => {
    const buttons = all('button[data-copy]');
    expect(buttons.length).toBeGreaterThan(1);
    for (const button of buttons) {
      const id = button.getAttribute('data-copy') ?? '';
      expect(button.hasAttribute('hidden'), id).toBe(true);
      expect(page.getElementById(id), id).not.toBeNull();
      expect(button.getAttribute('aria-label'), id).toContain(commandsIn(copyTarget(button))[0]);
      expect(page.querySelector(`[role="status"][data-copy-status="${id}"]`), id).not.toBeNull();
    }
  });

  it('never puts a command that prompts or keeps running before another one in a copy target', () => {
    const targets = all('button[data-copy]').map((button) => commandsIn(copyTarget(button)));
    for (const commands of targets) {
      for (const blocking of BLOCKING_COMMANDS) {
        const index = commands.findIndex((command) => blocking.test(command));
        if (index !== -1) expect(index, commands.join(' / ')).toBe(commands.length - 1);
      }
    }
    const sharesBlock = targets.some(
      (commands) =>
        commands.includes('cp .env.example .env') && commands.includes('docker compose up --build'),
    );
    expect(sharesBlock, 'the password must be set between cp and docker compose').toBe(false);
  });

  it('gives every image explicit dimensions and a file that exists', () => {
    const images = all('img');
    expect(images).not.toHaveLength(0);
    for (const image of images) {
      const src = image.getAttribute('src') ?? '';
      expect(image.hasAttribute('alt'), src).toBe(true);
      expect(Number(image.getAttribute('width')), src).toBeGreaterThan(0);
      expect(Number(image.getAttribute('height')), src).toBeGreaterThan(0);
      expect(existsSync(publicFile(src)), src).toBe(true);
    }
  });

  it('serves the hero a phone-sized dashboard on narrow screens, sized to avoid layout shift', () => {
    const source = page.querySelector('picture source');
    expect(source?.getAttribute('media')).toMatch(/max-width/);
    const srcset = source?.getAttribute('srcset') ?? '';
    expect(existsSync(publicFile(srcset)), srcset).toBe(true);
    expect(Number(source?.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(source?.getAttribute('height'))).toBeGreaterThan(0);
    expect(source?.parentElement?.querySelector('img')?.getAttribute('loading')).not.toBe('lazy');
  });

  it('describes every screenshot and lazy-loads all but the hero one', () => {
    const [hero, ...rest] = all('img[src^="/screenshots/"]');
    expect(hero?.getAttribute('loading')).not.toBe('lazy');
    for (const screenshot of [hero, ...rest]) {
      expect(
        screenshot?.getAttribute('alt')?.trim().length,
        screenshot?.getAttribute('src') ?? '',
      ).toBeGreaterThan(40);
    }
    for (const screenshot of rest)
      expect(screenshot.getAttribute('loading'), screenshot.getAttribute('src') ?? '').toBe('lazy');
  });

  it('loads no script, style, font or image from another origin', () => {
    const sources = [
      ...all('script[src]').map((element) => element.getAttribute('src')),
      ...all('link[rel="stylesheet"], link[rel="preload"], link[rel="icon"]').map((element) =>
        element.getAttribute('href'),
      ),
      ...all('img, source').map((element) => element.getAttribute('src') ?? element.getAttribute('srcset')),
    ];
    for (const source of sources) expect(source, String(source)).not.toMatch(/^(https?:)?\/\//);
    expect(read('src/styles.css')).not.toMatch(/url\(\s*['"]?(https?:)?\/\//);
    expect(read('src/styles.css')).not.toMatch(/@import\s+['"]?(url\()?['"]?(https?:)?\/\//);
  });

  it('describes itself for search engines and link previews', () => {
    expect(page.title).toContain('Livro-caixa');
    expect(attribute('meta[name="description"]', 'content')).toBeTruthy();
    expect(attribute('link[rel="canonical"]', 'href')).toBe(SITE_URL);
    expect(attribute('meta[property="og:url"]', 'content')).toBe(SITE_URL);
    expect(attribute('meta[name="theme-color"]', 'content')).toBe('#17201C');
    expect(attribute('meta[name="twitter:card"]', 'content')).toBe('summary_large_image');
  });

  it('uses an absolute Open Graph image that exists', () => {
    const image = attribute('meta[property="og:image"]', 'content') ?? '';
    expect(image.startsWith(SITE_URL)).toBe(true);
    expect(existsSync(publicFile(image.slice(SITE_URL.length)))).toBe(true);
    expect(attribute('meta[name="twitter:image"]', 'content')).toBe(image);
  });

  it('reuses the app favicon unchanged', () => {
    expect(attribute('link[rel="icon"]', 'href')).toBe('/favicon.svg');
    expect(read('public/favicon.svg')).toBe(read('../web/public/favicon.svg'));
  });

  it('writes negative money with the minus sign, never a hyphen', () => {
    // The whole source, so alt text and meta descriptions are covered too.
    expect(html).not.toMatch(/-\s?R\$/);
  });
});
