const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const rows = await page.$$eval('#history-tbody tr', els => els.map(e => e.innerText));
  console.log('Total table rows rendered in UI:', rows.length);
  rows.slice(0, 5).forEach(r => console.log('  -> ' + r.replace(/\t/g, ' | ')));
  await browser.close();
})();
