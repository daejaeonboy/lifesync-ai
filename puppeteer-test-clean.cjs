const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('TEST_LOG')) console.log(msg.text());
    });

    const hashUrl = 'http://localhost:3001/?view=chat#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6ImExMjM0NTY3LTg5YWItY2RlZi0wMTIzLTQ1Njc4OWFiY2RlZiIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjI1MjQ2MDgwMDAsImlhdCI6MTY3MjUzMTIwMH0.XbH2mPZ-fR81_qF0-b_B9O8Wb-8Zk-3s2WzM8Kk3u-g&expires_in=3600&refresh_token=mock-refresh-token&token_type=bearer';

    await page.goto(hashUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('TEST_LOG --- REFRESHING PAGE WITHOUT HASH ---');
    await page.goto('http://localhost:3001/?view=chat', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    const content2 = await page.content();
    console.log('TEST_LOG AFTER REFRESH:', content2.includes('AuthView') ? 'NO (AuthView)' : 'YES (App)');

    await browser.close();
})();
