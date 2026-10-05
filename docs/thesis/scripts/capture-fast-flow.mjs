/**
 * Capture IDA fast path screenshots for thesis figures (1440×900 viewport).
 * Usage: node scripts/capture-fast-flow.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'figures', 'ida', 'flow');
const BASE = 'https://www.project-ida.com';

const shots = [];

async function shot(page, name) {
  const file = path.join(OUT_DIR, name);
  await page.waitForTimeout(700);
  await page.screenshot({ path: file, fullPage: false });
  shots.push(name);
  console.log('saved', name);
}

async function skipAvatarDialogIfVisible(page) {
  const skip = page.getByRole('button', { name: /Pomiń dialog/i });
  if (await skip.isVisible({ timeout: 4000 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function acceptConsent(page) {
  await page
    .getByText('Akceptuję wszystkie warunki i wyrażam zgodę', { exact: true })
    .click({ timeout: 5000 })
    .catch(async () => {
      const cb = page.locator('input[type="checkbox"]').first();
      if (await cb.isVisible({ timeout: 2000 }).catch(() => false)) await cb.check({ force: true });
    });
}

async function clickEnabledPrimary(page) {
  const btn = page
    .locator('button:not([disabled])')
    .filter({ hasText: /Dalej|Kontynuuj|Continue|Next/i })
    .last();
  await btn.waitFor({ state: 'visible', timeout: 20000 });
  await btn.click();
  await page.waitForLoadState('networkidle');
}

async function fillDemographicsStep(page) {
  await page.getByRole('button', { name: /25-34/ }).first().click({ timeout: 3000 }).catch(() => {});
  await page.getByRole('button', { name: /Kobieta|Mężczyzna/i }).first().click({ timeout: 3000 }).catch(() => {});

  const eduToggle = page.getByRole('button', { name: /Wybierz wykształcenie/i });
  if (await eduToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
    await eduToggle.click();
    await page
      .getByRole('button', { name: /Licencjat lub inżynier/i })
      .first()
      .click({ timeout: 5000 });
  }

  await page.waitForTimeout(400);
}

async function fillLifestyleStep(page) {
  const picks = [/sam|Sam/i, /spokojny|Spokój/i, /relaks/i];
  for (const re of picks) {
    const chip = page.getByRole('button', { name: re }).first();
    if (await chip.isVisible({ timeout: 800 }).catch(() => false)) {
      await chip.click().catch(() => {});
      continue;
    }
    await page.getByText(re).first().click({ timeout: 800 }).catch(() => {});
  }
}

async function captureResultViews(page) {
  const accountHeading = page.getByRole('heading', { name: /Zapisz na koncie/i });
  if (await accountHeading.isVisible({ timeout: 20000 }).catch(() => false)) {
    await shot(page, 'ch07-flow-quick-08-result-dialog.png');
    const closeCandidates = [
      page.locator('button[aria-label*="Zamknij"]'),
      page.locator('button[aria-label*="Close"]'),
      page.locator('div[class*="fixed"] button').first(),
    ];
    for (const loc of closeCandidates) {
      if (await loc.isVisible({ timeout: 800 }).catch(() => false)) {
        await loc.click().catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(900);
  }

  await shot(page, 'ch07-flow-quick-08-result.png');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const ratingLabel = page.getByText(/Jak oceniasz|Oceń wynik|satysfakc|skala 1|1\s*-\s*5/i).first();
  if (await ratingLabel.isVisible({ timeout: 4000 }).catch(() => false)) {
    await shot(page, 'ch07-flow-quick-13-satisfaction-rating.png');
  } else {
    const scaleBtn = page.getByRole('button', { name: /^[1-5]$/ }).first();
    if (await scaleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shot(page, 'ch07-flow-quick-13-satisfaction-rating.png');
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function waitForGeneratedPreview(page) {
  await page
    .waitForFunction(
      () => {
        const t = document.body?.innerText ?? '';
        if (t.includes('Generuję obrazek') || t.includes('pozostało')) return false;
        const imgs = [...document.querySelectorAll('img')];
        return imgs.some((img) => {
          const alt = img.getAttribute('alt') ?? '';
          const src = img.currentSrc || img.src || '';
          if (!src || src.startsWith('data:image/svg')) return false;
          if (/logo|avatar|przykład|example|icon|ida/i.test(alt + src)) return false;
          return img.naturalWidth >= 320 && img.naturalHeight >= 200;
        });
      },
      { timeout: 300000 },
    )
    .catch(() => {});
  await page.waitForTimeout(2000);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pl-PL',
  });
  await context.clearCookies();
  const page = await context.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    const skipBtn = page.getByRole('button', { name: /Pomiń dialog/i });
    if (await skipBtn.isVisible({ timeout: 12000 }).catch(() => false)) {
      await shot(page, 'ch07-flow-quick-01-landing-dialog.png');
      await skipBtn.click();
      await page.waitForTimeout(500);
    }
    await shot(page, 'ch07-flow-quick-01-landing.png');

    await page.getByRole('link', { name: /Stwórz moje wnętrze/i }).click({ timeout: 20000 });
    await page.waitForLoadState('networkidle');
    await skipAvatarDialogIfVisible(page);
    await page.waitForURL(/path-selection|onboarding|flow/, { timeout: 30000 }).catch(() => {});
    await shot(page, 'ch07-flow-quick-02-path-selection.png');

    await page.getByRole('button', { name: /Szybka/i }).first().click({ timeout: 20000 });
    await page.waitForURL(/onboarding/, { timeout: 30000 });
    await shot(page, 'ch07-flow-quick-03-onboarding-consent.png');

    const learnMore = page.getByRole('button', { name: /Dowiedz się więcej/i });
    if (await learnMore.isVisible({ timeout: 3000 }).catch(() => false)) {
      await learnMore.click();
      await page.waitForTimeout(800);
      await shot(page, 'ch07-flow-quick-03-onboarding-consent-dialog.png');
    }

    await acceptConsent(page);
    await clickEnabledPrimary(page);
    await shot(page, 'ch07-flow-quick-04-demographics.png');

    await fillDemographicsStep(page);
    await clickEnabledPrimary(page);
    await page.waitForTimeout(800);

    const onLifestyle = await page
      .getByText(/styl życia|sam\/sama|status związku|Spokój i relaks/i)
      .first()
      .isVisible({ timeout: 2500 })
      .catch(() => false);
    if (onLifestyle && !page.url().includes('fast-track')) {
      await shot(page, 'ch07-flow-quick-10-lifestyle.png');
      await fillLifestyleStep(page);
      await clickEnabledPrimary(page);
    }

    await page.waitForURL(/fast-track/, { timeout: 30000 }).catch(async () => {
      await page.goto(`${BASE}/flow/fast-track`, { waitUntil: 'networkidle', timeout: 60000 });
    });

    const skipOnUpload = page.getByRole('button', { name: /Pomiń dialog/i });
    if (await skipOnUpload.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shot(page, 'ch07-flow-quick-01-landing-dialog.png');
      await skipOnUpload.click();
    }

    await shot(page, 'ch07-flow-quick-05-room-upload.png');

    const samplePhoto = page.getByRole('img', { name: /Przykład 1/i });
    if (await samplePhoto.isVisible({ timeout: 10000 }).catch(() => false)) {
      await samplePhoto.click({ force: true });
      await page.waitForTimeout(2000);
      await shot(page, 'ch07-flow-quick-11-room-sample-selected.png');
    }

    const nextRoom = page.getByRole('button', { name: /Dalej|Kontynuuj|Next/i }).first();
    if (await nextRoom.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextRoom.click();
      await page.waitForLoadState('networkidle');
    }

    await page.waitForURL(/style-selection/, { timeout: 30000 }).catch(async () => {
      await page.goto(`${BASE}/flow/style-selection`, { waitUntil: 'networkidle' });
    });
    await page.getByText(/^Skandynawski$/i).first().click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, 'ch07-flow-quick-06-style-selection.png');

    const genBtn = page.getByRole('button', { name: /Generuj|Dalej|Kontynuuj/i }).first();
    if (await genBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await genBtn.click();
      await page.waitForURL(/fast-generate/, { timeout: 30000 });
    } else {
      await page.goto(`${BASE}/flow/fast-generate`, { waitUntil: 'networkidle' });
    }

    await page.waitForTimeout(2000);
    await shot(page, 'ch07-flow-quick-07-generating.png');

    await page
      .waitForFunction(
        () => {
          const t = document.body?.innerText ?? '';
          return t.includes('Gotowe!') && !t.includes('Generuję obrazek');
        },
        { timeout: 180000 },
      )
      .catch(() => {});
    await shot(page, 'ch07-flow-quick-12-generation-ready.png');

    await waitForGeneratedPreview(page);
    await captureResultViews(page);

    const noAccount = page.getByRole('button', { name: /Kontynuuj bez konta|bez konta/i }).first();
    if (await noAccount.isVisible({ timeout: 8000 }).catch(() => false)) {
      await noAccount.click();
      await page.waitForLoadState('networkidle');
    }

    await page
      .waitForURL(/path-selection.*fast_completed=true/, { timeout: 30000 })
      .catch(async () => {
        await page.goto(`${BASE}/flow/path-selection?fast_completed=true`, { waitUntil: 'networkidle' });
      });
    await page.waitForTimeout(1200);
    await shot(page, 'ch07-flow-quick-09-completion.png');
  } finally {
    await browser.close();
  }

  console.log('---\n' + shots.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
