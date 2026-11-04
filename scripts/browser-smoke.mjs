import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173'], { stdio: 'pipe' });
const base = 'http://127.0.0.1:4173/';
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(base);
      if (response.ok) { ready = true; break; }
    } catch { /* server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  assert.ok(ready, 'Vite preview did not start');
  browser = await chromium.launch({ headless: true });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'أنشئ المشهد' }).waitFor({ timeout: 12000 });
    await page.getByRole('button', { name: 'أنشئ المشهد' }).click();
    await page.locator('.preview canvas').waitFor();
    await page.getByRole('button', { name: 'احترافي' }).click();
    await page.getByRole('button', { name: '❔ دليل' }).click();
    await page.getByRole('button', { name: 'التالي' }).click();
    await page.getByRole('button', { name: 'إغلاق الدليل' }).click();
    await page.getByRole('button', { name: 'مشاريعي' }).click();
    await page.getByRole('button', { name: '＋ احفظ نسخة من المشروع الحالي' }).click();
    await page.getByRole('dialog', { name: 'مشاريعي المحفوظة' }).getByRole('button', { name: 'افتح' }).first().waitFor();
    await page.getByRole('button', { name: 'إغلاق' }).click();
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= viewport.width + 8, 'Horizontal overflow at ' + viewport.width + 'px: ' + width);
    assert.deepEqual(errors, [], 'Page JavaScript errors at ' + viewport.width + 'px');
    await page.screenshot({ path: 'studio-' + viewport.width + '.png', fullPage: true });
    await page.close();
  }
  console.log('Chromium desktop and mobile-width UI smoke tests passed.');
} finally {
  await browser?.close();
  server.kill();
}
