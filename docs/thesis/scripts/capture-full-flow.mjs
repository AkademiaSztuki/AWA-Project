/**
 * Capture IDA Full Experience screenshots for thesis (ch07-flow-full-*.png).
 * Usage: node scripts/capture-full-flow.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'figures', 'ida', 'flow-full');
const INVENTORY_PATH = path.join(__dirname, '..', 'notes', 'flow-inventory-full.md');
const FIXTURE_PNG = path.join(__dirname, 'fixtures', 'doc-inspiration.png');
const BASE = 'https://www.project-ida.com';

/** @type {{ n: number, file: string, slug: string, url: string, visible: string, why: string, next: string }[]} */
const inventory = [];
let shotCounter = 0;
const blockers = [];

async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function skipAwaDialogue(page) {
  const skip = page.getByRole('button', { name: /Pomiń dialog/i });
  if (await skip.isVisible({ timeout: 2500 }).catch(() => false)) {
    await skip.click();
    await page.waitForTimeout(400);
  }
}

async function dismissLoginModal(page) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const later = page
      .getByRole('button', { name: /Kontynuuj bez konta|bez konta|Maybe later|Później/i })
      .first();
    if (await later.isVisible({ timeout: 2500 }).catch(() => false)) {
      await shotDialog(page, 'login-nudge');
      await later.click();
      await settle(page, 600);
    } else {
      break;
    }
  }
}

async function shotDialog(page, slugSuffix) {
  const slug = `${slugSuffix}-dialog`;
  const name = nextFilename(slug);
  const file = path.join(OUT_DIR, name);
  await settle(page, 500);
  await page.screenshot({ path: file, fullPage: false });
  console.log('dialog', file);
  return name;
}

function nextFilename(slug) {
  shotCounter += 1;
  const nn = String(shotCounter).padStart(2, '0');
  return `ch07-flow-full-${nn}-${slug}.png`;
}

async function capture(
  page,
  slug,
  { visible, why, next, dialog = false } = {},
) {
  await skipAwaDialogue(page);
  const name = dialog ? `${slug}-dialog` : slug;
  const fileName = nextFilename(name.replace(/-dialog$/, '') + (dialog ? '-dialog' : ''));
  const file = path.join(OUT_DIR, fileName);
  await settle(page);
  await page.screenshot({ path: file, fullPage: false });
  const url = page.url();
  inventory.push({
    n: shotCounter,
    file: fileName,
    slug,
    url,
    visible: visible || '(do uzupełnienia po przeglądzie kadru)',
    why: why || '',
    next: next || '',
  });
  console.log('saved', fileName, url);
  return fileName;
}

async function clickPrimary(page, pattern = /Dalej|Kontynuuj|Next|Zapisz/i) {
  const btn = page.locator('button:not([disabled])').filter({ hasText: pattern }).first();
  await btn.waitFor({ state: 'visible', timeout: 20000 });
  await btn.click();
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function acceptConsent(page) {
  const label = page.getByText(/Akceptuję wszystkie warunki/i);
  if (await label.isVisible({ timeout: 4000 }).catch(() => false)) {
    await label.click();
  } else {
    const cb = page.locator('input[type="checkbox"]').first();
    if (await cb.isVisible({ timeout: 2000 }).catch(() => false)) await cb.check({ force: true });
  }
}

async function fillDemographics(page) {
  await page.getByRole('button', { name: '25-34', exact: true }).click({ timeout: 8000 });
  await page.getByRole('button', { name: 'Kobieta' }).click();
  const eduTrigger = page.getByRole('button', { name: /Wybierz wykształcenie|Select education/i });
  if (await eduTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await eduTrigger.click();
    await page
      .getByRole('button', { name: /Średnie ogólnokształcące|Upper secondary general/i })
      .first()
      .click({ timeout: 8000 });
  }
}

async function pickLifestyleDefaults(page) {
  await page.getByRole('button', { name: /Sam\/Sama|Alone/i }).click({ timeout: 5000 }).catch(() => {});
  await page.getByRole('button', { name: /^Spokojny$|^Calm$/i }).click({ timeout: 3000 }).catch(() => {});
  await page
    .getByRole('button', { name: /Spokój i relaks|Peace and relaxation/i })
    .click({ timeout: 3000 })
    .catch(() => {});
}

async function pickDemographicDefaults(page) {
  await fillDemographics(page).catch(() => {});
  await pickLifestyleDefaults(page);
}

async function completeSensorySuite(page) {
  for (let round = 0; round < 12; round++) {
    if (page.url().includes('/flow/inspirations')) return;

    const tile = page
      .locator(
        'button.rounded-2xl:visible, button.rounded-xl:visible, [data-testid="sensory-option"]:visible',
      )
      .filter({ hasNotText: /Wstecz|Back|Rozpocznij/i })
      .first();
    if (await tile.isVisible({ timeout: 2500 }).catch(() => false)) {
      await tile.click({ force: true });
      await page.waitForTimeout(900);
      continue;
    }

    const scale = page.getByRole('button', { name: /^[1-5]$/, exact: true }).first();
    if (await scale.isVisible({ timeout: 1500 }).catch(() => false)) {
      await scale.click();
      await page.waitForTimeout(700);
      continue;
    }
    break;
  }
}

async function completeSemanticDiff(page) {
  for (let q = 0; q < 4; q++) {
    const choice = page.locator('button.aspect-\\[4\\/3\\]').first();
    if (await choice.isVisible({ timeout: 5000 }).catch(() => false)) {
      await choice.click();
      await page.waitForTimeout(450);
    } else break;
  }
}

async function swipeTinderRight(page, times = 1) {
  const like = page.getByRole('button', { name: /Podoba mi się|Like/i });
  for (let i = 0; i < times; i++) {
    if (!(await like.isVisible({ timeout: 8000 }).catch(() => false))) break;
    await like.click();
    await page.waitForTimeout(320);
  }
}

async function speedRunIPIP(page, startIndex = 0) {
  const total = 120;
  for (let i = startIndex; i < total; i++) {
    const neutral = page.getByRole('button', { name: /Neutralnie|Neutral/i }).first();
    const three = page.getByRole('button', { name: '3', exact: true }).first();
    if (await neutral.isVisible({ timeout: 5000 }).catch(() => false)) {
      await neutral.click();
    } else if (await three.isVisible({ timeout: 2000 }).catch(() => false)) {
      await three.click();
    } else {
      break;
    }
    await page.waitForTimeout(80);
  }
}


async function fillSUS(page) {
  const scales = page.locator('[role="slider"], button[aria-pressed]');
  const count = await scales.count();
  for (let i = 0; i < Math.min(count, 10); i++) {
    const mid = page.getByRole('button', { name: /^3$|Neutral/i }).nth(i);
    if (await mid.isVisible({ timeout: 500 }).catch(() => false)) await mid.click();
  }
  const pickers = page.locator('button').filter({ hasText: /^[1-5]$/ });
  const n = await pickers.count();
  for (let i = 0; i < n; i += 5) {
    await pickers.nth(i + 2).click().catch(() => {});
  }
}

function writeInventory() {
  const lines = [
    '# Inwentarz ekranów — ścieżka pełna (Full Experience)',
    '',
    `Wygenerowano: ${new Date().toISOString().slice(0, 10)} · produkcja \`${BASE}\` · viewport 1440×900.`,
    '',
    '## Sekwencja',
    '',
  ];
  for (const row of inventory) {
    lines.push(`### ${row.file}`);
    lines.push('');
    lines.push(`- **URL:** ${row.url}`);
    lines.push(`- **Widoczne:** ${row.visible}`);
    lines.push(`- **Cel (badanie/produkt):** ${row.why}`);
    lines.push(`- **Następny krok:** ${row.next}`);
    lines.push('');
  }
  if (blockers.length) {
    lines.push('## Luki / blokery');
    lines.push('');
    for (const b of blockers) lines.push(`- ${b}`);
    lines.push('');
  }
  fs.mkdirSync(path.dirname(INVENTORY_PATH), { recursive: true });
  fs.writeFileSync(INVENTORY_PATH, lines.join('\n'), 'utf8');
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
  }
  shotCounter = 0;
  inventory.length = 0;
  blockers.length = 0;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pl-PL',
  });
  const page = await context.newPage();

  try {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
    await capture(page, 'landing', {
      visible: 'Landing IDA, CTA „Stwórz moje wnętrze”, awatar AWA.',
      why: 'Wejście Product-First; użytkownik wybiera rytm Full vs Fast (RQ1, lejek).',
      next: '/flow/path-selection',
    });

    await page.getByRole('link', { name: /Stwórz moje wnętrze/i }).click({ timeout: 25000 });
    await page.waitForLoadState('networkidle');
    await skipAwaDialogue(page);

    await page.waitForURL(/path-selection/, { timeout: 45000 }).catch(() => {});
    await capture(page, 'path-selection', {
      visible: 'Karty Szybka ścieżka vs Pełne Doświadczenie (~15–20 min), copy badań i personalizacji.',
      why: 'Operacjonalizacja `path_type` full|fast — rozgałęzienie protokołu (macierz 6 źródeł tylko w Full).',
      next: 'Klik „Zacznij Pełne Doświadczenie” → `/setup/profile`',
    });

    const fullBtn = page.getByRole('button', { name: /Pełne|Full Experience|Zacznij Pełne/i }).first();
    await fullBtn.click({ timeout: 20000 });
    await page.waitForURL(/setup\/profile/, { timeout: 45000 });

    await capture(page, 'profile-consent', {
      visible: 'Wizard profilu (krok 1): zgoda badawcza, checkboxy RODO, pasek 12 kroków Full.',
      why: 'Etyka i zgoda przed zbieraniem danych psychometrycznych i behawioralnych.',
      next: 'Demografia / styl życia w `/setup/profile`',
    });

    await acceptConsent(page);
    await clickPrimary(page);
    await dismissLoginModal(page);

    await capture(page, 'profile-demographics', {
      visible: 'Demografia (przedział wieku, płeć, edukacja, kraj).',
      why: 'Zmienne kontrolne i kontekst próby (nie PII w polu wolnym).',
      next: 'Krok lifestyle',
    });
    await fillDemographics(page);
    await clickPrimary(page, /Kontynuuj|Continue/i);

    await capture(page, 'profile-lifestyle', {
      visible: 'Styl życia / gospodarstwo domowe (chipy wyboru).',
      why: 'Kontekst użytkowania przestrzeni pod Room Setup i syntezę promptów.',
      next: 'Tinder (preferencje ukryte)',
    });
    await pickLifestyleDefaults(page);
    await clickPrimary(page, /Kontynuuj|Dalej|Continue/i);

    await capture(page, 'tinder-intro', {
      visible: 'Ekran instrukcji Wnętrzarskiego Tindera (Nie/Tak, przycisk Rozpocznij).',
      why: 'Pomiar preferencji implicit (IAT-like), sygnały pod kanał `implicit` w macierzy RQ2–RQ3.',
      next: 'Rozpocznij → seria swipe',
    });
    await page.getByRole('button', { name: /Rozpocznij|Start/i }).click({ timeout: 15000 });

    await capture(page, 'tinder-swipe', {
      visible: 'Stan po pierwszym swipe (kolejna karta lub licznik postępu).',
      why: 'Dokumentacja gestu wyboru i czasu reakcji w UI.',
      next: 'Dalsze swipe do końca talii',
    });

    await swipeTinderRight(page, 1);
    await swipeTinderRight(page, 40);
    await page.waitForTimeout(1200);
    await capture(page, 'tinder-complete', {
      visible: 'Koniec talii Tindera lub ekran przejścia do kolejnego kroku profilu.',
      why: 'Domknięcie bloku implicit przed jawnością (semantic / sensory).',
      next: 'Klimat wnętrza (semantic differential)',
    }).catch(() => blockers.push('Nie udało się uchwycić końca Tindera — talia mogła się nie domknąć.'));

    await settle(page);

    await capture(page, 'semantic-mood', {
      visible: 'Suwaki semantic differential (ciepło, jasność, złożoność) / klimat.',
      why: 'Kanał explicit i mapowanie języka wizualnego na parametry generacji.',
      next: 'Test zmysłów',
    });
    await completeSemanticDiff(page);

    await capture(page, 'sensory', {
      visible: 'Pakiet testów zmysłowych (światło, faktura, dźwięk / metafora natury).',
      why: 'Dane sensoryczne uzupełniające profil gustu (biophilia, sensoryPreferences).',
      next: '/flow/inspirations',
    });
    await completeSensorySuite(page);
    await page.waitForTimeout(1500);
    await dismissLoginModal(page);
    await page
      .waitForURL(/inspirations/, { timeout: 90000 })
      .catch(async () => {
        await page.goto(`${BASE}/flow/inspirations`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      });
    if (!page.url().includes('inspirations')) {
      blockers.push('Nie osiągnięto /flow/inspirations po profilu — modal logowania lub niedokończony SensoryTestSuite.');
    }

    if (page.url().includes('inspirations')) {
      await capture(page, 'inspirations', {
        visible: 'Upload inspiracji (0–10 zdjęć), copy o estetycznym DNA.',
        why: 'Kanał `inspiration` w macierzy 6 źródeł; tagowanie VLM/Gamma.',
        next: '/flow/big-five po ≥1 inspiracji',
      });
      const input = page.locator('input[type="file"]').first();
      if (await input.count()) {
        await input.setInputFiles(FIXTURE_PNG);
        await page.waitForTimeout(4000);
      }
      await clickPrimary(page, /Dalej|Kontynuuj/i).catch(() => {});
      await page.waitForURL(/big-five/, { timeout: 60000 });
    }

    if (!page.url().includes('/flow/big-five')) {
      blockers.push('Pominięto IPIP — brak nawigacji na /flow/big-five.');
    } else {
    await capture(page, 'big-five-intro', {
      visible: 'Intro IPIP-NEO-120: tytuł, opis 120 pytań, pasek postępu 0%.',
      why: 'Psychometria osobowości (Big Five) pod kanał `personality` — RQ4/RQ5.',
      next: 'Pytania Likerta 1–5',
    });

    await page.getByRole('button', { name: /Neutralnie|Neutral/i }).first().click({ timeout: 10000 });
    await page.waitForTimeout(400);
    await capture(page, 'big-five-item', {
      visible: 'Przykładowa pozycja kwestionariusza (pytanie + skala 1–5).',
      why: 'Reprezentacja obciążenia uczestnika bez 120 osobnych rycin.',
      next: 'Ukończenie → wynik radarowy',
    });

    await speedRunIPIP(page, 0);
    await page.waitForFunction(
      () => document.body.innerText.includes('Kontynuuj') && document.body.innerText.includes('Big Five'),
      { timeout: 180000 },
    ).catch(() => {});
    await page.waitForTimeout(1500);
    await capture(page, 'big-five-results', {
      visible: 'Podsumowanie domen Big Five (wykres radarowy / opisy).',
      why: 'Feedback uczestnikowi; zapis `bigFive.scores` do GCP.',
      next: '/setup/room (zdjęcie przestrzeni)',
    });
    await clickPrimary(page, /Kontynuuj/i);
    await dismissLoginModal(page);
    await page
      .waitForURL(/setup\/room/, { timeout: 45000 })
      .catch(async () => {
        await page.goto(`${BASE}/setup/room?step=photo_upload`, {
          waitUntil: 'domcontentloaded',
          timeout: 90000,
        });
      });
    }

    if (!page.url().includes('setup/room')) {
      await page.goto(`${BASE}/setup/room?step=photo_upload`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
    }

    if (page.url().includes('setup/room')) {
    await capture(page, 'room-photo', {
      visible: 'Room Setup: upload zdjęcia pokoju lub przykładowe stocki.',
      why: 'Kotwica geometryczna dla inpaintingu / VLM analizy przestrzeni.',
      next: 'Preferencje pokoju, PRS, aktywności',
    });
    const sample = page.getByRole('img', { name: /Przykład/i }).first();
    if (await sample.isVisible({ timeout: 8000 }).catch(() => false)) {
      await sample.click({ force: true });
      await page.waitForTimeout(2000);
    }
    await clickPrimary(page).catch(() => {});

    const roomId = page.url().match(/setup\/room\/([^/?]+)/)?.[1];
    const roomStepDefs = [
      ['preference_source', 'room-preference-source', 'Źródło preferencji (profil vs uzupełnienie).'],
      ['preference_questions', 'room-preference-questions', 'Pytania jawne / sensory pokoju.'],
      ['prs_current', 'room-prs-current', 'Mood grid — PRS stan obecny.'],
      ['activities', 'room-activities', 'Aktywności w pokoju.'],
      ['prs_target', 'room-prs-target', 'PRS docelowy / biophilia.'],
      ['summary', 'room-summary', 'Podsumowanie Room Setup.'],
    ];
    if (roomId) {
      for (const [step, slug, visible] of roomStepDefs) {
        await page.goto(`${BASE}/setup/room/${roomId}?step=${step}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await capture(page, slug, {
          visible,
          why: 'Psychologia środowiskowa (PRS, funkcja pokoju) pod syntezę promptów i RQ1.',
          next: step === 'summary' ? '/flow/generate' : 'kolejny `?step=`',
        });
        pickDemographicDefaults(page);
        await page.locator('button').first().click({ timeout: 2000 }).catch(() => {});
        await clickPrimary(page).catch(() => {});
      }
    }
    } else {
      blockers.push('Pominięto Room Setup — brak /setup/room po IPIP.');
    }

    await page.waitForURL(/flow\/generate/, { timeout: 120000 }).catch(async () => {
      await page.goto(`${BASE}/flow/generate`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    });

    await capture(page, 'generate-matrix-loading', {
      visible: 'Ekran generacji / oczekiwanie na macierz 6 koncepcji.',
      why: 'Ślepa macierz źródeł promptów (RQ3) — użytkownik nie widzi etykiet kanałów.',
      next: 'Wybór jednej z 6 miniatur',
    });

    await page
      .waitForFunction(
        () => {
          const imgs = [...document.querySelectorAll('img')];
          return imgs.filter((img) => img.naturalWidth >= 200 && img.naturalHeight >= 150).length >= 4;
        },
        { timeout: 300000 },
      )
      .catch(() => blockers.push('Macierz 6 obrazów nie pojawiła się w 5 min — zapisano stan ładowania.'));

    await capture(page, 'generate-matrix', {
      visible: 'Siatka 6 wygenerowanych wnętrz (bez etykiet źródeł), wybór ślepy.',
      why: 'Kluczowy pomiar `selected_source` i jakości kanałów danych.',
      next: 'Wybór obrazu → ankiety końcowe',
    });

    const concept = page.locator('img').filter({ hasNotText: /logo|avatar|przykład/i });
    for (let i = 0; i < 12; i++) {
      const img = concept.nth(i);
      if (await img.isVisible({ timeout: 1000 }).catch(() => false)) {
        await img.click({ force: true }).catch(() => {});
        break;
      }
    }
    await page.waitForTimeout(2000);
    await dismissLoginModal(page);

    await page.goto(`${BASE}/flow/survey1`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    if (page.url().includes('survey1')) {
      await capture(page, 'survey-sus', {
        visible: 'Ankieta SUS (system usability) po generacji.',
        why: 'RQ1 — obciążenie UX i użyteczność po długim flow.',
        next: '/flow/survey2',
      });
      fillSUS(page);
      await clickPrimary(page, /Dalej|Kontynuuj|Wyślij/i).catch(() => {});
    }

    await clickPrimary(page, /Dalej|Kontynuuj|Wyślij/i).catch(() => {});
    await page.waitForURL(/survey2/, { timeout: 45000 }).catch(async () => {
      await page.goto(`${BASE}/flow/survey2`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });
    if (page.url().includes('survey2')) {
      await capture(page, 'survey-clarity', {
        visible: 'Druga ankieta końcowa (clarity / agency / satysfakcja).',
        why: 'Subiektywna ocena procesu i roli IDA.',
        next: '/flow/thanks',
      });
      fillSUS(page);
      await clickPrimary(page).catch(() => {});
    }

    await page.waitForURL(/thanks/, { timeout: 45000 }).catch(async () => {
      await page.goto(`${BASE}/flow/thanks`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    });
    if (page.url().includes('thanks')) {
      await capture(page, 'thanks', {
        visible: 'Domknięcie projektu / podziękowanie.',
        why: 'Zamknięcie rytuału Full; sygnał `currentStep=thanks` w sesji.',
        next: 'Dashboard lub ponowny wybór ścieżki',
      });
    }
  } catch (e) {
    blockers.push(`Błąd krytyczny: ${e.message}`);
    console.error(e);
  } finally {
    writeInventory();
    await browser.close();
  }

  console.log('---\nPliki:', inventory.map((i) => i.file).join('\n'));
  if (blockers.length) console.log('Blockers:\n', blockers.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
