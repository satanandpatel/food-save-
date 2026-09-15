const puppeteer = require('puppeteer-core');
const pool = require('../src/db/connection');
const path = require('path');
const fs = require('fs');

async function runBrowserE2E() {
  console.log('🌐 Starting End-to-End Browser Flow Verification...\n');

  const artifactDir = 'C:\\Users\\satan\\.gemini\\antigravity\\brain\\c0b7e199-7da5-41a3-8e5a-1ec37bbadffc';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 900 });

  // 1. Navigate to FoodSave
  console.log('1. Loading http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);
  if (!title.includes('FoodSave')) throw new Error('Incorrect page title');

  // Screenshot initial page
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_step1_form.png'), fullPage: false });
  console.log('   ✓ Step 1 form loaded.');

  // 2. Fill out donation form in Step 1
  console.log('\n2. Selecting food category and entering donation details...');
  // Click "Cooked meal" button
  await page.click('button[data-cat="Cooked meal"]');

  // Select City "Bhopal"
  await page.select('#city-select', 'Bhopal');

  // Type Donor Name
  await page.$eval('#donor-name', el => el.value = '');
  await page.type('#donor-name', 'Jehan Numa Palace');

  // Enter quantity 45 servings
  await page.type('#qty', '45');

  // Check button state
  const isEnabled = await page.$eval('#to-step-2', el => !el.disabled);
  console.log(`   "Estimate & match" button enabled: ${isEnabled}`);
  if (!isEnabled) throw new Error('Estimate & match button should be enabled');

  // 3. Click Estimate & Match
  console.log('\n3. Clicking "Estimate & match" to query backend API & MySQL...');
  await page.click('#to-step-2');

  // Wait for Step 2 to render
  await page.waitForFunction(() => {
    const el = document.getElementById('step-2');
    return el && el.style.display !== 'none' && el.querySelector('.diag-result');
  }, { timeout: 10000 });

  // Verify Step 2 details
  const step2Text = await page.$eval('#step-2', el => el.innerText);
  console.log('   Step 2 Output Snippet:\n   ' + step2Text.split('\n').slice(0, 5).join('\n   '));

  if (!step2Text.includes('URGENT')) throw new Error('Cooked meal must indicate URGENT');
  if (!step2Text.includes('45 servings')) throw new Error('Servings count missing in step 2');
  if (!step2Text.includes('Anna Sewa Samiti')) throw new Error('Anna Sewa Samiti should be matched for Bhopal (capacity 45)');

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_step2_matched.png') });
  console.log('   ✓ Real MySQL NGOs matched and rendered in Step 2.');

  // 4. Confirm Pickup with top matched NGO
  console.log('\n4. Confirming pickup with matched NGO...');
  const bookBtn = await page.$('#book-btn');
  if (!bookBtn) throw new Error('Confirm pickup button not found');
  await bookBtn.click();

  // Wait for Step 3 confirmation
  await page.waitForFunction(() => {
    const el = document.getElementById('step-3');
    return el && el.style.display !== 'none' && el.querySelector('.confirm-box');
  }, { timeout: 10000 });

  const step3Text = await page.$eval('#step-3', el => el.innerText);
  console.log('   Step 3 Confirmation:\n   ' + step3Text.split('\n').slice(0, 4).join('\n   '));
  if (!step3Text.includes('Pickup Confirmed')) throw new Error('Pickup confirmation message missing');

  await page.screenshot({ path: path.join(artifactDir, 'screenshot_step3_confirmed.png') });
  console.log('   ✓ Pickup confirmed screen verified.');

  // 5. Verify Database Status directly in MySQL
  console.log('\n5. Querying MySQL database directly to verify status updates...');
  const [dbListings] = await pool.query(`
    SELECT l.id, l.category, l.quantity, l.urgency, l.shelf_life_hours, l.status,
           d.name AS donor_name, d.city AS donor_city,
           n.name AS ngo_name, n.capacity_per_day
    FROM listings l
    JOIN donors d ON l.donor_id = d.id
    JOIN ngos n ON l.matched_ngo_id = n.id
    WHERE d.name = 'Jehan Numa Palace' AND l.category = 'Cooked meal'
    ORDER BY l.id DESC
    LIMIT 1
  `);

  if (dbListings.length === 0) throw new Error('No confirmed listing found in MySQL for Jehan Numa Palace');
  const latest = dbListings[0];
  console.log(`   MySQL Record ID: #FS-${latest.id}`);
  console.log(`   Donor: ${latest.donor_name} (${latest.donor_city})`);
  console.log(`   Category: ${latest.category} (${latest.quantity} servings)`);
  console.log(`   Shelf Safe Window: ${latest.shelf_life_hours} hrs | Urgency: ${latest.urgency}`);
  console.log(`   Matched NGO: ${latest.ngo_name} (Capacity: ${latest.capacity_per_day}/day)`);
  console.log(`   Database Status: "${latest.status}"`);

  if (latest.status !== 'confirmed') throw new Error(`Expected status 'confirmed', got '${latest.status}'`);
  console.log('   ✓ Database verification: Status is confirmed and foreign key matched_ngo_id is set.');

  // 6. Verify Live Database Activity Table on page
  console.log('\n6. Verifying Live Database Activity Table on page...');
  await page.click('#refresh-history-btn');
  await new Promise(r => setTimeout(r, 1000));
  const historyText = await page.$eval('#history-tbody', el => el.innerText);
  console.log('   Latest entry in table: ' + historyText.split('\n')[0]);
  if (!historyText.includes('Jehan Numa Palace')) throw new Error('Listing missing in Live Activity table');

  // Scroll to history table and take screenshot
  await page.evaluate(() => {
    document.getElementById('history').scrollIntoView();
  });
  await page.screenshot({ path: path.join(artifactDir, 'screenshot_step4_history_table.png') });
  console.log('   ✓ Live activity table matches MySQL database records.');

  await browser.close();
  console.log('\n🎉 FULL END-TO-END BROWSER FLOW VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}

runBrowserE2E().catch(err => {
  console.error('❌ Browser E2E verification failed:', err);
  process.exit(1);
});
