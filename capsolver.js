import puppeteer from "puppeteer-core";
import fetch from "node-fetch";

const CAP_KEY = "CAP-DDCBE2B36F1B6D78500CD82F4406CB1EF05A9655BD981EF006820737FB18558A";


const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function solveRecaptchaV2(url, sitekey) {

    console.log("🧠 Membuat task Capsolver...");

    // CREATE TASK
    const createTaskRes = await fetch("https://api.capsolver.com/createTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            clientKey: CAP_KEY,
            task: {
                type: "ReCaptchaV2TaskProxyLess",
                websiteURL: url,
                websiteKey: sitekey
            }
        })
    }).then(r => r.json());

    // 🔥 CETAK RESPONSE API SEBENAR-BENARNYA
    console.log("🔍 RESPONSE CREATE TASK:", createTaskRes);

    if (!createTaskRes.taskId) {
        console.log("❌ GAGAL MEMBUAT TASK. Lihat error di atas.");
        process.exit(1);  // hentikan script biar kamu bisa lihat error
    }

    const taskId = createTaskRes.taskId;
    console.log("📌 Task ID:", taskId);

    // GET RESULT LOOP
    while (true) {
        const result = await fetch("https://api.capsolver.com/getTaskResult", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                clientKey: CAP_KEY,
                taskId: taskId
            })
        }).then(r => r.json());

        console.log("🔎 RESULT:", result); // <-- TAMBAH DEBUG

        if (result.status === "ready") {
            console.log("🎉 Token berhasil diambil!");
            return result.solution.gRecaptchaResponse;
        }

        console.log("⏳ Menunggu token...");
        await sleep(2000);
    }
}

async function main() {

    // connect ke chrome debug
    const debugUrl = "http://127.0.0.1:9222/json/version";
    const res = await fetch(debugUrl);
    const data = await res.json();
    const wsUrl = data.webSocketDebuggerUrl;

    const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();

    const loginUrl = "https://logammulia.com/id/login";
    await page.goto(loginUrl, { waitUntil: "networkidle2" });

    console.log("🌐 Halaman login terbuka");

    await page.type("input[name=email]", "onbid143@mbox.re");
    await page.type("input[name=password]", "Sgb12311");

    const sitekey = await page.$eval(".g-recaptcha", el => el.getAttribute("data-sitekey"));

    const token = await solveRecaptchaV2(loginUrl, sitekey);

    // SET TOKEN
    await page.evaluate((token) => {
        document.getElementById("g-recaptcha-response").value = token;
    }, token);

    console.log("🧩 Token recaptcha terisi!");

    await page.click("#login-btn");
    console.log("🚀 Login dikirim...");

    // tunggu sampai halaman selesai loading
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    const currentUrl = page.url();
    console.log("📌 Redirect ke:", currentUrl);    
}

main();
