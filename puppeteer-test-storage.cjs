const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));

    // Simulate logging in via URL Hash
    const hashUrl = 'http://localhost:3001/?view=chat#access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInN1YiI6ImExMjM0NTY3LTg5YWItY2RlZi0wMTIzLTQ1Njc4OWFiY2RlZiIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjI1MjQ2MDgwMDAsImlhdCI6MTY3MjUzMTIwMH0.XbH2mPZ-fR81_qF0-b_B9O8Wb-8Zk-3s2WzM8Kk3u-g&expires_in=3600&refresh_token=mock-refresh-token&token_type=bearer';

    await page.goto(hashUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    const content1 = await page.content();
    console.log('AFTER HASH LOAD (Should be Logged In):', content1.includes('AuthView') || content1.includes('로그인') ? 'NO (AuthView)' : 'YES (App)');

    // Print localStorage keys to see if Supabase saved the token
    const storageKeys = await page.evaluate(() => Object.keys(window.localStorage));
    console.log('LOCAL STORAGE KEYS:', storageKeys);

    const tokenVal = await page.evaluate(() => window.localStorage.getItem('sb-mlpikaguvattuggzxqzve-auth-token'));
    console.log('HAS SUPABASE TOKEN?:', !!tokenVal);
    console.log('TOKEN LENGTH:', tokenVal ? tokenVal.length : 0);

    console.log('--- REFRESHING PAGE ---');
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    const content2 = await page.content();
    console.log('AFTER REFRESH (Should be Logged In):', content2.includes('AuthView') || content2.includes('로그인') ? 'NO (AuthView)' : 'YES (App)');

    await browser.close();
})();
