const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/library');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());
  const element = await page.$('[data-testid="user-menu"]');
  console.log('User menu exists:', !!element);
  await browser.close();
})();
