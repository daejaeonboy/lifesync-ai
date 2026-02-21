const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.text().includes('TEST_LOG')) console.log(msg.text());
    });

    // This will login, then refresh, and capture exactly what is happening on the live app
    // Wait, I don't have a valid google session to test login on the live app via pupeteer!
    // I need to instruct the user if I can't check myself.
    console.log('Cannot easily test live google login from headless without cookies.');
    await browser.close();
})();
