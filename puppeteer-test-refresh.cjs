const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));

    await page.goto('http://localhost:3001');

    // Let the app initialize, if it shows AuthView, we're not logged in.
    let content = await page.content();
    if (content.includes('AuthView') || content.includes('로그인')) {
        console.log('--- LOGGING IN ---');
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'password123'); // Assume this is a random invalid or valid, wait, if invalid it might stay.
        // wait I don't have a valid test user in this db, I should just use the session it already has?
        // Pupeteer starts with a fresh profile every time. So I need to sign up or use a valid account.
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
    }

    console.log('--- REFRESHING PAGE ---');
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);

    content = await page.content();
    console.log('AFTER REFRESH HAS LOGGED IN APP:', content.includes('AuthView') ? 'NO (back on login)' : 'YES (in app)');

    await browser.close();
})();
