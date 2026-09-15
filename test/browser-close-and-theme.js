const puppeteer = require('puppeteer-core');
const path = require('path');
const pool = require('../src/db/connection');

async function testBrowserCloseAndTheme() {
  console.log('🌐 Testing Browser Theme Toggle & Listing Close Action...\n');

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

  // 1. Test Theme Toggle
  console.log('1. Testing Theme Toggle...');
  const initialTheme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`   Initial data-theme: "${initialTheme || 'light (default)'}"`);

  // Click Dark mode button
  await page.click('#theme-toggle');
  await new Promise(r => setTimeout(r, 400));
  const darkTheme = await page.$eval('html', el => el.getAttribute('data-theme'));
  console.log(`   After clicking toggle: data-theme="${darkTheme}"`);
  if (darkTheme !== 'dark') throw new Error('Expected data-theme="dark"');

  const toggleText = await page.$eval('#theme-toggle', el => el.innerText);
  console.log(`   Toggle button text now: "${toggleText}"`);

  // Capture screenshot of Dark Theme
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_dark_theme.png') });
  console.log('   ✓ Dark theme screenshot saved.');

  // Switch back to light or keep dark for testing
  // 2. Test Listing Close Flow
  console.log('\n2. Testing Listing Close flow ("Food no longer available")...');
  await page.click('button[data-cat="Cooked meal"]');
  await page.select('#city-select', 'Indore');
  await page.type('#qty', '35');
  await page.click('#to-step-2');

  // Wait for Step 2
  await page.waitForFunction(() => {
    const el = document.getElementById('step-2');
    return el && el.style.display !== 'none' && el.querySelector('.diag-result');
  });

  // Verify "Food no longer available" button exists
  const closeBtn = await page.$('#close-btn');
  if (!closeBtn) throw new Error('"Food no longer available" button not found in Step 2');
  console.log('   ✓ "Food no longer available" button present in Step 2.');

  // Click "Food no longer available"
  await page.click('#close-btn');

  // Wait for closure screen
  await page.waitForFunction(() => {
    const el = document.getElementById('step-3');
    return el && el.style.display !== 'none' && el.innerText.includes('Listing closed — thanks for updating us');
  }, { timeout: 8000 });

  const closeMessage = await page.$eval('#step-3', el => el.innerText);
  console.log('   Closure confirmation output snippet:\n   ' + closeMessage.split('\n').slice(0, 4).join('\n   '));

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_listing_closed.png') });
  console.log('   ✓ Listing closed screen captured.');

  // 3. Verify in Live Database Activity Table
  console.log('\n3. Verifying status in Live Database Activity Table...');
  await new Promise(r => setTimeout(r, 600));
  const topTableRow = await page.$eval('#history-tbody tr', el => el.innerText);
  console.log(`   Top record in table: ${topTableRow}`);
  if (!topTableRow.includes('CLOSED')) throw new Error('Top table row does not show CLOSED badge');

  await page.evaluate(() => {
    document.getElementById('history').scrollIntoView();
  });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_history_closed_tag.png') });
  console.log('   ✓ Table screenshot with CLOSED badge captured.');

  await browser.close();
  console.log('\n🎉 THEME AND CLOSE LISTING BROWSER E2E TESTS PASSED!\n');
  process.exit(0);
}

testBrowserCloseAndTheme().catch(e => {
  console.error('❌ Browser test failed:', e);
  process.exit(1);
});
