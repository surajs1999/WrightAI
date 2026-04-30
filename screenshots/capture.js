const { chromium } = require("playwright");
const path = require("path");

const URL = "https://wrightai-web.fly.dev";
const OUT = path.join(__dirname, "publicity");

const SECTIONS = [
  { name: "01-hero",             selector: "section:nth-of-type(1)" },
  { name: "02-problem-strip",    selector: "section:nth-of-type(2)" },
  { name: "03-feature-scroll",   selector: "section:nth-of-type(3)" },
  { name: "04-install-grid",     selector: "section:nth-of-type(4)" },
  { name: "05-dashboard-preview",selector: "section:nth-of-type(5)" },
  { name: "06-feedback",         selector: "section:nth-of-type(6)" },
  { name: "07-final-cta",        selector: "section:nth-of-type(7)" },
  { name: "08-footer",           selector: "footer" },
];

const VIEWPORTS = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "laptop-1440",  width: 1440, height: 900  },
  { name: "laptop-1280",  width: 1280, height: 800  },
  { name: "mobile-390",   width: 390,  height: 844  },
];

async function run() {
  const fs = require("fs");
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n── ${vp.name} (${vp.width}×${vp.height}) ──`);
    const page = await browser.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for animations to settle
    await page.waitForTimeout(2000);

    // Full-page screenshot
    const fullPath = path.join(OUT, `${vp.name}-00-fullpage.png`);
    await page.screenshot({ path: fullPath, fullPage: true });
    console.log(`  ✓ full page → ${path.basename(fullPath)}`);

    // Per-section screenshots
    for (const section of SECTIONS) {
      try {
        const el = page.locator(section.selector).first();
        await el.waitFor({ timeout: 5000 });
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);

        const filePath = path.join(OUT, `${vp.name}-${section.name}.png`);
        await el.screenshot({ path: filePath });
        console.log(`  ✓ ${section.name}`);
      } catch (e) {
        console.warn(`  ✗ ${section.name}: ${e.message}`);
      }
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone. Screenshots saved to: ${OUT}`);
}

run().catch(err => { console.error(err); process.exit(1); });
