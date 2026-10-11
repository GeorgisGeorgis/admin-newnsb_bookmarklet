// Builds the two bookmarklets from the files in this folder and writes them to the
// folder above. Each is one javascript: URL:
//   bookmarklet-modal.js  opens the tool in a dialog over the current page
//   bookmarklet-page.js   replaces the current page with the tool as a page of its own
// Usage: node src/build.js
const fs = require('fs');
const path = require('path');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const fill = (text, placeholder, value) => {
  if (!text.includes(placeholder)) throw new Error('src no longer contains ' + placeholder);
  return text.replace(placeholder, () => value);
};

const build = (file, mode) => {
  const code = fill(fill(read('bookmarklet.js'), "'__CSS__'", JSON.stringify(read('style.css'))), "'__MODE__'", JSON.stringify(mode));
  // Newlines survive as %0A, so the source needs no minifying to work as a URL.
  const bookmarklet = 'javascript:' + encodeURIComponent(code);
  fs.writeFileSync(path.join(__dirname, '..', file), bookmarklet + '\n');
  console.log(file + ' written, ' + bookmarklet.length + ' characters');
};

build('bookmarklet-modal.js', 'modal');
build('bookmarklet-page.js', 'page');
