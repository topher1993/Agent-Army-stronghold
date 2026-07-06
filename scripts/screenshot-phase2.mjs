import fs from 'node:fs';
import path from 'node:path';

// Default browsers path so the script works without an env var (Playwright
// stores Chromium under node_modules/playwright-core/.local-browsers when
// installed locally; this is belt-and-braces for shared dev environments).
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), 'node_modules', 'playwright-core', '.local-browsers');
}

const viewports = [360, 768, 1024, 1440, 1920];
const surfaces = ['dashboard', 'work', 'missions', 'operations', 'approvals', 'cron', 'subagents', 'status-pill-gallery'];
const themes = ['light', 'dark'];

// Click the sidebar nav button whose visible text matches `target`. The sidebar
// uses <button> elements inside a navigation landmark; matching by text is
// resilient to React render timing.
async function navigateToSurface(page, target) {
  await page.evaluate((t) => {
    const nav = document.querySelector('nav[aria-label="Surfaces"]');
    if (!nav) return;
    const buttons = Array.from(nav.querySelectorAll('button'));
    const match = buttons.find(b => b.textContent && b.textContent.trim().toLowerCase() === String(t).toLowerCase());
    if (match) match.click();
  }, target);
  await page.waitForTimeout(250);
}

async function main() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    throw new Error('scripts/screenshot-phase2.mjs requires Playwright as a devDependency; run `npm install` to fetch it.');
  }
  const outRoot = path.join(process.cwd(), 'qc', 'phase2');
  const browser = await playwright.chromium.launch();
  try {
    const baseUrl = process.env.STRONGHOLD_URL || 'http://127.0.0.1:4174';
    for (const width of viewports) {
      const dir = path.join(outRoot, String(width));
      fs.mkdirSync(dir, { recursive: true });
      for (const theme of themes) {
        for (const surface of surfaces) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          await page.goto(baseUrl, { waitUntil: 'networkidle' });
          await page.evaluate((nextTheme) => { document.documentElement.dataset.theme = nextTheme; }, theme);
          if (surface === 'status-pill-gallery') {
            // Inject the pill gallery into the running app DOM so the actual
            // compiled CSS variables (--color-*-bg etc.) apply. Setting innerHTML
            // via setContent would lose the app's stylesheet.
            await navigateToSurface(page, 'dashboard');
            await page.evaluate((t) => {
              const host = document.createElement('div');
              host.id = 'pill-gallery-host';
              host.dataset.theme = t;
              host.style.cssText = 'position:fixed;inset:0;background:var(--color-canvas);padding:24px;display:grid;gap:12px;align-content:start;z-index:9999;';
              host.innerHTML = `
                <span class="statusPill statusPill--success statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>success</span></span>
                <span class="statusPill statusPill--warning statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>warning</span></span>
                <span class="statusPill statusPill--danger statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>danger</span></span>
                <span class="statusPill statusPill--info statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>info</span></span>
                <span class="statusPill statusPill--accent statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>accent</span></span>
                <span class="statusPill statusPill--neutral statusPill--sm"><span class="statusPillIcon statusPillIcon--dot" aria-hidden="true"></span><span>neutral</span></span>
              `;
              document.body.appendChild(host);
            }, theme);
          } else {
            await navigateToSurface(page, surface);
          }
          await page.waitForTimeout(400);
          await page.screenshot({ path: path.join(dir, `${surface}-${theme}.png`), fullPage: true });
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error.message); process.exit(1); });
