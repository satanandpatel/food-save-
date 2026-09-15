const puppeteer = require('puppeteer-core');
const path = require('path');

async function capturePanelScreenshots() {
  const artifactDir = 'C:\\Users\\satan\\.gemini\\antigravity\\brain\\c0b7e199-7da5-41a3-8e5a-1ec37bbadffc';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 950 });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  // 1. Capture Hero with live ticket
  const heroElement = await page.$('.hero');
  if (heroElement) {
    await heroElement.screenshot({ path: path.join(artifactDir, 'panel_hero.png') });
  }

  // 2. Capture Step 1 Panel
  const panelElement = await page.$('.panel');
  if (panelElement) {
    await panelElement.screenshot({ path: path.join(artifactDir, 'panel_step1.png') });
  }

  // 3. Fill form for Indore (Asha Night Shelter)
  await page.click('button[data-cat="Cooked meal"]');
  await page.select('#city-select', 'Indore');
  await page.type('#qty', '42');
  await page.click('#to-step-2');

  await page.waitForFunction(() => {
    const el = document.getElementById('step-2');
    return el && el.style.display !== 'none' && el.querySelector('.diag-result');
  });

  if (panelElement) {
    await panelElement.screenshot({ path: path.join(artifactDir, 'panel_step2.png') });
  }

  // 4. Confirm with top Indore NGO (Asha Night Shelter)
  await page.click('#book-btn');

  await page.waitForFunction(() => {
    const el = document.getElementById('step-3');
    return el && el.style.display !== 'none' && el.querySelector('.confirm-box');
  });

  if (panelElement) {
    await panelElement.screenshot({ path: path.join(artifactDir, 'panel_step3.png') });
  }

  await browser.close();
  console.log('Panel screenshots captured!');
}

capturePanelScreenshots().catch(console.error);
