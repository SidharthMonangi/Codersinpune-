// Renders baton-round1.html -> Baton_Round1_Plan.pdf
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, 'baton-round1.html'), { waitUntil: 'networkidle' });
  await p.pdf({ path: path.resolve(__dirname, 'Baton_Round1_Plan.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Inter,sans-serif;font-size:7px;color:#94A3B8;padding:0 15mm;display:flex;justify-content:space-between"><span>Baton · Round 1 Plan · Knowledge Handover Challenge</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>' });
  await b.close();
  console.log('PDF written');
})();
