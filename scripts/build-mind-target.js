import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const EDGE_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const executablePath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;

async function compileTarget() {
  console.log(`[MindAR Compiler] Launching headless browser from: ${executablePath}`);
  
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--ignore-certificate-errors', '--allow-insecure-localhost', '--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Connect to running Vite development server
    const targetUrl = 'https://127.0.0.1:5173/compiler.html';
    console.log(`[MindAR Compiler] Navigating to ${targetUrl}...`);
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('[MindAR Compiler] Executing compiler engine on 1.jpg...');
    const base64Data = await page.evaluate(async () => {
      // Wait for module script to bind window.compileTarget
      let retries = 20;
      while (!window.compileTarget && retries-- > 0) {
        await new Promise(r => setTimeout(r, 100));
      }
      if (!window.compileTarget) {
        throw new Error('window.compileTarget not initialized.');
      }
      return await window.compileTarget('/1.jpg');
    });

    console.log('[MindAR Compiler] Target feature matrix compiled successfully!');
    
    // Convert base64 to binary buffer and write to public/targets.mind
    const buffer = Buffer.from(base64Data, 'base64');
    const destPath = path.join(__dirname, '../public/targets.mind');
    
    fs.writeFileSync(destPath, buffer);
    const sizeKB = (buffer.byteLength / 1024).toFixed(2);
    console.log(`[MindAR Compiler] 100% SUCCESS! Wrote ${sizeKB} KB to public/targets.mind`);
    
  } catch (err) {
    console.error('[MindAR Compiler] Error:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

compileTarget();
