// Puts the build's script and styles into one page for claude.ai: dist-web/engine-log.html
import { readFileSync, writeFileSync } from 'node:fs';

const js = readFileSync('dist-web/app.js', 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync('dist-web/app.css', 'utf8').replace(/<\/style/gi, '<\\/style');
const cdn = 'https://cdnjs.cloudflare.com/ajax/libs';

const page = `<title>Daily Engine Maintenance</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@500;600;700&display=swap">
<style>${css}</style>
<div id="root"></div>
<script src="${cdn}/react/18.3.1/umd/react.production.min.js"></script>
<script src="${cdn}/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
<script src="${cdn}/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="${cdn}/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<script>${js}</script>
`;
writeFileSync('dist-web/engine-log.html', page);
console.log(`dist-web/engine-log.html  ${(page.length / 1024).toFixed(1)} kB`);
