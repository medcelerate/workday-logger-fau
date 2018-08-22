require('dotenv').config()
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
           user: process.env.EMAIL_HOST,
           pass: process.env.EMAIL_PW
       }
   });

(async() => {
    let mailoptions = {
        from:`WorkDay Cron <${process.env.EMAIL_HOST}>`,
        to:`${process.env.RECIPIENT}`,
        subject:'Hour entry has failed',
        html:'null'
    }
    try {
    const browser = await puppeteer.launch({
        headless:true,
    });
    const page = await browser.newPage();
    await page.setViewport({
        width: 1100,
        height: 850
    });
    await page.goto('https://workday.fau.edu');
    await page.waitForSelector('form[name="login-form"]');
    await page.type('input[id="username"]', process.env.USER);
    await page.type('input[id="password"]', process.env.PASSWORD);
    await page.click('button[name="_eventId_proceed"]');
    await page.waitForSelector('iframe[id="duo_iframe"]');
    const frame = page.mainFrame().childFrames()[0];
    await frame.waitForSelector('#login-form');
    await frame.waitFor(5000);
    console.log('Logged In')
    
    const sqbutton = await frame.$('div.row-label.push-label > button');
    await sqbutton.click();
    await page.waitFor(2000);
    await page.waitForSelector('div[title="Time"]')
    await page.click('div[title="Time"]');
    await page.waitFor(2000);
    try {
        await page.click('button[title="This Week (0 Hours)"]'); //switch to 0 once it works
    }
    catch (result) {
        console.log(result)
        mailoptions.html = String(result)
        mailoptions.subject ='Your hours are already done or something is wrong'
        try {
            await transporter.sendMail(mailoptions)
        }
        catch (err) {
            console.log(err)
            await browser.close();
            process.exit()
        }
        await browser.close();
        process.exit()
    }
    await page.waitForSelector('table[class="multiDayBody"]')

    for (let i = 2; i < 7; i++) {
        console.log(i)
        await page.click(`div[data-automation-id="timedDaySeparator_${i}"]`)
        //await page.click(`div[automationdid="TimedDaySeparator_${i}"]`)
        await page.waitFor(4000)
        await page.type('input[data-automation-id="searchBox"]', 'Hourly Time')
        await page.keyboard.press('Enter');
        await page.waitFor(6000)
//New stuff
        const inputsel = await page.$$('input[class="gwt-TextBox WNP1 WEQ1"')
        await inputsel[0].type('9:00')
        await inputsel[1].type('2:00')

        await page.click('button[title="OK"]')
       // await page.click('button[class="WFWM WBCO WEWM WDJN WDVM WJWM"]')
        await page.waitFor(3000)
        //await page.click('button[title="Discard"]')
        await page.reload()
        await page.waitFor(7000)
        continue
    }
	await page.click('button[title="Submit"]')
	await page.waitFor(3000)
    await page.click('button[title="Submit"]')
    await page.waitFor(3000)
    await browser.close();
    console.log('done')
	process.exit();
}
catch (err) {
    console.log(err)
    try {
    await page.reload()
    await page.click('button[title="Submit"]')
    await page.waitFor(3000)
    await page.click('button[title="Submit"]')
    await page.waitFor(3000)
    await browser.close();
    mailoptions.html = String(err)
    await transporter.sendMail(mailoptions)
    }
    catch (err) {
        console.log(err)
    }
}
})();