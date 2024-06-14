'use strict';

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
const fs = require('fs');

console.log("Script grafana_pdf.js started...");

const url = process.argv[2];
const auth_string = process.argv[3];
let outfile = process.argv[4];

const width_px = 1200;
const auth_header = 'Basic ' + Buffer.from(auth_string).toString('base64');

(async () => {
    try {
        console.log("Checking URL accessibility...");
        const response = await fetch(url, {
            method: 'GET',
            headers: {'Authorization': auth_header}
        });

        if (!response.ok) {
            throw new Error(`Unable to access URL. HTTP status: ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
            throw new Error("The URL provided is not a valid Grafana instance.");
        }

        let finalUrl = url;
        if(process.env.FORCE_KIOSK_MODE === 'true') {
            console.log("Checking if kiosk mode is enabled.")
            if (!finalUrl.includes('&kiosk')) {
                console.log("Kiosk mode not enabled. Enabling it.")
                finalUrl += '&kiosk=true';
            }
            console.log("Kiosk mode enabled.")
        }


        console.log("Starting browser...");
        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });

        const page = await browser.newPage();
        console.log("Browser started...");

        await page.setExtraHTTPHeaders({'Authorization': auth_header});
        await page.setDefaultNavigationTimeout(120000);

        await page.setViewport({
            width: width_px,
            height: 800,
            deviceScaleFactor: 2,
            isMobile: false
        });

        console.log("Navigating to URL...");
        await page.goto(finalUrl, {waitUntil: 'networkidle0'});
        console.log("Page loaded...");

        await page.evaluate(() => {
            let infoCorners = document.getElementsByClassName('panel-info-corner');
            for (let el of infoCorners) {
                el.hidden = true;
            }
            let resizeHandles = document.getElementsByClassName('react-resizable-handle');
            for (let el of resizeHandles) {
                el.hidden = true;
            }
        });

        let dashboardName = 'output_grafana';
        let date = new Date().toISOString().split('T')[0];

        if (process.env.EXTRACT_DATE_AND_DASHBOARD_NAME_FROM_HTML_PANEL_ELEMENTS === 'true') {
            console.log("Extracting dashboard name and date from the HTML page...");
            dashboardName = await page.evaluate(() => {
                const dashboardElement = document.getElementById('display_actual_dashboard_title');
                return dashboardElement ? dashboardElement.innerText.trim() : null;
            }) || dashboardName;

            date = await page.evaluate(() => {
                const dateElement = document.getElementById('display_actual_date');
                return dateElement ? dateElement.innerText.trim() : null;
            }) || date;

            if (!dashboardName) {
                console.log("Dashboard name not found. Using default value.");
            } else {
                console.log("Dashboard name fetched:", dashboardName);
            }

            if (!date) {
                console.log("Date not found. Using default value.");
            } else {
                console.log("Date fetched:", date);
            }
        } else {
            console.log("Extracting dashboard name and date from the URL...");
            const urlParts = new URL(url);
            const pathSegments = urlParts.pathname.split('/');
            dashboardName = pathSegments[pathSegments.length - 1] || dashboardName;
            const from = urlParts.searchParams.get('from');
            const to = urlParts.searchParams.get('to');
            if (from && to) {
                date = `${new Date(parseInt(from)).toISOString().split('T')[0]}_to_${new Date(parseInt(to)).toISOString().split('T')[0]}`;
            }
            console.log("Dashboard name fetched from URL:", dashboardName);
            console.log("Date fetched from URL:", date);
        }

        outfile = `./output/${dashboardName.replace(/\s+/g, '_')}_${date.replace(/\s+/g, '_')}.pdf`;

        const totalHeight = await page.evaluate(() => {
            const scrollableSection = document.querySelector('.scrollbar-view');
            return scrollableSection ? scrollableSection.firstElementChild.scrollHeight : null;
        });

        if (!totalHeight) {
            throw new Error("Unable to determine the page height. The selector '.scrollbar-view' might be incorrect or missing.");
        } else {
            console.log("Page height adjusted to:", totalHeight);
        }

        await page.evaluate(async () => {
            const scrollableSection = document.querySelector('.scrollbar-view');
            if (scrollableSection) {
                const childElement = scrollableSection.firstElementChild;
                let scrollPosition = 0;
                let viewportHeight = window.innerHeight;

                while (scrollPosition < childElement.scrollHeight) {
                    scrollableSection.scrollBy(0, viewportHeight);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    scrollPosition += viewportHeight;
                }
            }
        });

        await page.setViewport({
            width: width_px,
            height: totalHeight,
            deviceScaleFactor: 2,
            isMobile: false
        });

        console.log("Generating PDF...");
        await page.pdf({
            path: outfile,
            width: width_px + 'px',
            height: totalHeight + 'px',
            scale: 1,
            displayHeaderFooter: false,
            margin: {top: 0, right: 0, bottom: 0, left: 0}
        });
        console.log(`PDF generated: ${outfile}`);

        await browser.close();
        console.log("Browser closed.");

        process.send({ success: true, path: outfile });
    } catch (error) {
        console.error("Error during PDF generation:", error.message);
        process.send({ success: false, error: error.message });
        process.exit(1);
    }
})();
