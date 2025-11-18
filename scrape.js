// file: login-lm.js
import puppeteer from 'puppeteer-core';
import fetch from 'node-fetch';
import fs from 'fs';

// ======================
// Helper delay
// ======================
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ======================
// Solve Recaptcha Function
// ======================
async function solveRecaptcha(page) {
  console.log("🔍 Mencari iframe recaptcha...");

  await sleep(2000);

  const frames = page.frames();
  const anchorFrame = frames.find(f => f.url().includes("api2/anchor"));

  if (!anchorFrame) {
    console.log("❌ recaptcha anchor iframe tidak ditemukan");
    return;
  }

  console.log("☑️ Klik checkbox recaptcha");
  const checkbox = await anchorFrame.$("#recaptcha-anchor");
  await checkbox.click();

  await sleep(3000);

  // --- cek apakah muncul challenge ---
  const challengeFrame = page.frames().find(f => f.url().includes("api2/bframe"));
  if (!challengeFrame) {
    console.log("✔️ Tidak ada challenge, recaptcha aman");
    return;
  }

  console.log("🎧 Membuka audio challenge...");
  await challengeFrame.click("#recaptcha-audio-button");
  await sleep(2000);

  const audioUrl = await challengeFrame.$eval(
    ".rc-audiochallenge-tdownload-link",
    el => el.href
  );

  console.log("🎤 Audio URL:", audioUrl);

  const audioBuffer = await fetch(audioUrl).then(r => r.buffer());
  fs.writeFileSync("audio.mp3", audioBuffer);
  console.log("💾 audio.mp3 disimpan");

  // ================================
  // Transcribe (BUTUH API KEY BENER)
  // ================================
  console.log("🧠 Transcribe audio...");
  let transcript = "";

  try {
    const speechRes = await fetch(
      "https://speech.googleapis.com/v1/speech:recognize?key=AIzaSyC-EXAMPLE",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: { content: audioBuffer.toString("base64") },
          config: { languageCode: "en-US", encoding: "MP3" }
        })
      }
    ).then(r => r.json());

    transcript = speechRes.results?.[0]?.alternatives?.[0]?.transcript || "";
    
  } catch (err) {
    console.log("❌ Error API:", err);
  }

  console.log("📝 Transcript hasil:", transcript);

  if (!transcript) {
    console.log("❌ Transcript kosong → gagal solve captcha");
    return;
  }

  await challengeFrame.type("#audio-response", transcript);
  await sleep(800);

  await challengeFrame.click("#recaptcha-verify-button");
  console.log("🚀 Submit recaptcha");

  await sleep(3000);
}


// =========================================================
// ================ MAIN PROGRAM ===========================
// =========================================================
const debugUrl = "http://127.0.0.1:9222/json/version";
const res = await fetch(debugUrl);
const data = await res.json();
const wsUrl = data.webSocketDebuggerUrl;

console.log("✅ WebSocketDebuggerUrl:", wsUrl);

try {
  const browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });

  const page = await browser.newPage();
  await page.goto("https://logammulia.com/id/login", {
    waitUntil: "networkidle2",
    timeout: 0
  });

  console.log("🌐 Halaman login terbuka");

  // ============================
  // ISI FORM LOGIN
  // ============================
  await page.type("input[name=email]", "onbid143@mbox.re", { delay: 100 });
  await page.type("input[name=password]", "Sgb12311", { delay: 120 });

  console.log("✍️ Form login diisi");

  // ============================
  // SOLVE RECAPTCHA
  // ============================
  await solveRecaptcha(page);
  console.log("✔️ Recaptcha selesai");

  // ============================
  // SUBMIT FORM
  // ============================
  console.log("🚀 Klik tombol LOG IN");
  await page.click("#login-btn");

  await sleep(5000);

  console.log("🎉 DONE. Cek apakah redirect login sukses.");

} catch (err) {
  console.error("❌ Error:", err);
}
