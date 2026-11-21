/**
 * Renders the Mindset Approved mark to every app/web icon size.
 *   NODE_PATH=$(npm root -g) node scripts/brand/render-icons.cjs
 * Source of truth is the SVG below: a white check on brand green (#2D5A3D).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const GREEN = '#2D5A3D';
const CHECK = 'M27 51.5 L42 66.5 L73 35.5'; // on a 100x100 grid

const svg = ({ size, bg, stroke = '#FFFFFF', scale = 1, radius = 0 }) => {
  const s = 100 * scale;
  const o = (100 - s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  ${bg ? `<rect width="100" height="100" rx="${radius}" fill="${bg}"/>` : ''}
  <g transform="translate(${o} ${o}) scale(${scale})">
    <path d="${CHECK}" fill="none" stroke="${stroke}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
};

const OUT = [
  // iOS/universal icon: full-bleed square (the OS applies the mask)
  ['apps/mobile/assets/images/icon.png', svg({ size: 1024, bg: GREEN, scale: 0.9 })],
  // Android adaptive icon: foreground kept inside the 66% safe zone, solid background, monochrome for themed icons
  ['apps/mobile/assets/images/android-icon-foreground.png', svg({ size: 512, scale: 0.6 })],
  ['apps/mobile/assets/images/android-icon-background.png', svg({ size: 512, bg: GREEN, stroke: 'none' })],
  ['apps/mobile/assets/images/android-icon-monochrome.png', svg({ size: 432, scale: 0.6 })],
  // Splash: white mark on the green splash background set in app.json
  ['apps/mobile/assets/images/splash-icon.png', svg({ size: 512 })],
  ['apps/mobile/assets/images/favicon.png', svg({ size: 48, bg: GREEN, radius: 22 })],
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [rel, markup] of OUT) {
    const size = Number(/width="(\d+)"/.exec(markup)[1]);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await page.screenshot({ path: path.join(ROOT, rel), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    console.log('wrote', rel, size);
  }
  await browser.close();
  // Web favicon for the site and the iOS Icon Composer symbol
  fs.writeFileSync(path.join(ROOT, 'apps/admin/app/icon.svg'), svg({ size: 32, bg: GREEN, radius: 22 }));
  fs.mkdirSync(path.join(ROOT, 'apps/mobile/assets/expo.icon/Assets'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'apps/mobile/assets/expo.icon/Assets/mark.svg'), svg({ size: 1024, scale: 0.9 }));
})();
