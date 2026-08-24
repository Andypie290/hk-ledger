const fs = require('fs');
const js = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

const idRefs = [...js.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g)].map((m) => m[1]);
const missingIds = [...new Set(idRefs)].filter((id) => !html.includes('id="' + id + '"'));

const classRefs = [...js.matchAll(/class="([^"]+)"/g)]
  .flatMap((m) => m[1].split(/\s+/))
  .filter((c) => /^[a-z][a-z0-9-]*$/.test(c));
const missingClasses = [...new Set(classRefs)].filter((c) => !css.includes('.' + c) && !html.includes('class="' + c));

const htmlIds = [...html.matchAll(/id="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]);
const unusedIds = [...new Set(htmlIds)].filter((id) => !idRefs.includes(id) && !css.includes('#' + id));

console.log('id references:', new Set(idRefs).size);
console.log('missing ids:', missingIds.length ? missingIds.join(', ') : 'none');
console.log('missing classes (style-only risk):', missingClasses.length ? missingClasses.join(', ') : 'none');
console.log('html ids never referenced in js:', unusedIds.length ? unusedIds.join(', ') : 'none');
