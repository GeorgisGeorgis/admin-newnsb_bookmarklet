// Source of the bookmarklet. Edit this file (and style.css), then run
// `node src/build.js` to regenerate the two bookmarklet files, the strings that go into a bookmark.
(() => {
  const API = 'https://d-nsbc-p.admin.ch/v1';
  const SITE = 'https://www.admin.ch';
  const HOST_ID = 'newnsb-bookmarklet';
  const PAGE_SIZE = 50; // the API never returns more than 50 items per request
  const MAX_REQUESTS = 10;
  const CSS = '__CSS__'; // replaced by build.js with the contents of style.css
  // Also set by build.js, which writes one bookmarklet per mode: 'modal' opens a dialog
  // over the current page, 'page' replaces the current page with a page of its own.
  const PAGE = '__MODE__' === 'page';
  const TITLE = 'Press releases, day by day';
  const EMOJI = '\u{1F4F0}'; // newspaper

  const LANGUAGES = ['de', 'fr', 'it', 'en'];

  // Local date parts, not toISOString(): that one is UTC and a day off around midnight.
  const pad = n => String(n).padStart(2, '0');
  const isoDay = date => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  const dateOf = iso => {
    const [year, month, dayOfMonth] = iso.split('-').map(Number);
    return new Date(year, month - 1, dayOfMonth);
  };
  const shiftDay = (iso, days) => {
    const date = dateOf(iso);
    date.setDate(date.getDate() + days);
    return isoDay(date);
  };
  const labelDay = iso =>
    dateOf(iso).toLocaleDateString('en-GB', { weekday: 'short' }) + ' ' + iso.split('-').reverse().join('.');
  const today = isoDay(new Date());
  const yesterday = shiftDay(today, -1);

  // Children are appended as text or nodes, never parsed as HTML.
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
    node.append(...children);
    return node;
  };

  // The API does not keep items with the same timestamp in a fixed order between requests,
  // so pages can overlap and leave gaps. Collect by id and go round again until every
  // result has turned up.
  const fetchDay = async (day, language) => {
    const byId = new Map();
    let total = 0;
    let offset = 0;
    let step = PAGE_SIZE;
    for (let request = 0; request < MAX_REQUESTS; request++) {
      const params = new URLSearchParams({
        languages: language,
        start_date: day + 'T00:00:00.000Z',
        end_date: day + 'T23:59:59.999Z',
        offset,
        limit: PAGE_SIZE,
        sort: 'DESC',
      });
      params.append('newsKinds', 'CONTENT_HUB');
      params.append('newsKinds', 'ONSB');
      const response = await fetch(API + '/search?' + params);
      if (!response.ok) throw new Error('the news service answered with HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.items) || typeof data.pageResults !== 'number') {
        throw new Error('the news service sent an unexpected answer');
      }
      data.items.forEach(item => byId.set(item.id, item));
      total = data.pageResults;
      if (byId.size >= total) break;
      // Sweep the pages forward, then backward (0, 50, 50, 0, …). The service seems to
      // alternate between two orders; a plain 0, 50, 0, 50 could ask each for the same page forever.
      if (offset + step < 0 || offset + step >= total) step = -step;
      else offset += step;
    }
    // Newest first, then by title, so the list looks the same on every run.
    const items = [...byId.values()].sort((a, b) =>
      Date.parse(b.publishDate) - Date.parse(a.publishDate) || (a.title || '').localeCompare(b.title || ''));
    return { items, total };
  };

  // Items name their publisher by id only. The offices behind the ids (acronym, full name)
  // come as a tree from a second endpoint, loaded once per language. If that fails, the
  // results are shown without tags and the next search tries again.
  const officeLists = {};
  const loadOffices = language => {
    if (!officeLists[language]) {
      officeLists[language] = fetch(API + '/organisations?language=' + language + '&nsbEnabled=true')
        .then(response => response.json())
        .then(tree => {
          const byId = new Map();
          const walk = offices => offices.forEach(office => {
            byId.set(String(office.id), office);
            walk(office.children || []);
          });
          walk(tree);
          return byId;
        })
        .catch(() => {
          delete officeLists[language];
          return new Map();
        });
    }
    return officeLists[language];
  };

  // Same acronym, same colour: a hash of the letters picks a hue and one of three pastel
  // tones. Multiplying by the golden angle sends similar acronyms (BR, BK) to hues far apart.
  // With some 120 offices a few still end up looking alike.
  const TONES = [[75, 86], [60, 91], [50, 80]]; // saturation %, lightness %
  const coloursFor = text => {
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    const hue = Math.round(hash * 137.508) % 360;
    const [saturation, lightness] = TONES[hash % 3];
    return {
      background: 'hsl(' + hue + ' ' + saturation + '% ' + lightness + '%)',
      border: 'hsl(' + hue + ' ' + (saturation - 20) + '% ' + (lightness - 14) + '%)',
    };
  };

  // Lead and body of a release as plain text. The service sends the full text with every
  // result, so searching it needs no further request. DOMParser turns the HTML into text
  // without running or loading anything in it; the space keeps paragraphs from running together.
  const parser = new DOMParser();
  const plainText = item => {
    const html = [item.description || '', ...(Array.isArray(item.text) ? item.text : [])].join(' ')
      .replace(/<\/?(p|br|div|li|ul|ol|h[1-6]|tr|td|th|table)\b/gi, ' $&');
    const body = parser.parseFromString(html, 'text/html').body;
    body.querySelectorAll('script, style').forEach(node => node.remove());
    return body.textContent.replace(/\s+/g, ' ').trim();
  };

  // The passage around the first word the title does not contain, with every search word marked.
  const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const excerptFor = (row, words) => {
    const missing = words.find(word => !row.title.includes(word));
    const at = row.plain.search(new RegExp(escapeRegExp(missing), 'i'));
    if (at < 0) return null;
    // Begin and end on a word boundary where there is one nearby.
    const space = row.plain.indexOf(' ', at - 60);
    const start = at <= 60 ? 0 : space >= 0 && space < at ? space + 1 : at - 60;
    const nextSpace = row.plain.indexOf(' ', at + missing.length + 80);
    const end = nextSpace < 0 ? row.plain.length : nextSpace;
    const parts = row.plain.slice(start, end).split(new RegExp('(' + words.map(escapeRegExp).join('|') + ')', 'gi'));
    return el('span', { class: 'excerpt' },
      start > 0 ? '… ' : '',
      ...parts.map((part, i) => (i % 2 ? el('mark', {}, part) : part)),
      end < row.plain.length ? ' …' : '');
  };

  // Older releases (ONSB) and newer ones (CONTENT_HUB) live under different paths.
  const linkFor = item => {
    const id = encodeURIComponent(item.langGroupId);
    return SITE + '/' + lang + (item.kind === 'CONTENT_HUB' ? '/newnsb/' + id : '/nsb?id=' + id);
  };

  const previous = document.getElementById(HOST_ID);
  if (previous) previous.remove();

  const languageButtons = LANGUAGES.map(code => el('button', { type: 'button' }, code.toUpperCase()));
  const todayButton = el('button', { type: 'button', autofocus: '' }, 'Today');
  const yesterdayButton = el('button', { type: 'button' }, 'Yesterday');
  const dateInput = el('input', { type: 'date', min: '1900-01-01', max: today, 'aria-label': 'Other date' });
  const filterInput = el('input', { type: 'search', placeholder: 'Search, e.g. bundesrat parlament', 'aria-label': 'Search titles and text' });
  const closeButton = el('button', { type: 'button', class: 'close', 'aria-label': 'Close' }, '✕');
  const status = el('p', { class: 'status', role: 'status' });
  const list = el('ul');
  const previousDayButton = el('button', { type: 'button', title: 'Previous day' });
  const nextDayButton = el('button', { type: 'button', title: 'Next day' });
  const panel = el(PAGE ? 'main' : 'dialog', { class: 'panel', 'aria-label': TITLE },
    el('header', {}, el(PAGE ? 'h1' : 'h2', {}, EMOJI + ' ' + TITLE), ...(PAGE ? [] : [closeButton])),
    el('div', { class: 'languages', role: 'group', 'aria-label': 'Language' }, ...languageButtons),
    el('div', { class: 'controls' }, todayButton, yesterdayButton, dateInput, filterInput),
    status,
    list,
    el('footer', {}, previousDayButton, nextDayButton));

  // The shadow root keeps the page's CSS out of the panel and ours out of the page.
  const host = el('div', { id: HOST_ID });
  host.attachShadow({ mode: 'open' }).append(el('style', {}, CSS), panel);

  let lang = 'de';
  let day = today;
  // What the search on screen returned; null while loading or after a failure.
  // { rows: [{ item, title, plain, text, sortKey }], total, offices } with title and text in lower case.
  let loaded = null;
  let latestSearch = 0;

  // The publishers of an item that the given office list knows, in the item's order.
  const knownOffices = (ids, offices) =>
    (ids || []).map(id => offices.get(String(id))).filter(office => office && office.acronym);

  // The tag names the first known publisher, with the acronym and the full name the service
  // gives for the chosen language; co-publishers go into the tooltip.
  const tagFor = item => {
    const tag = el('span', { class: 'tag' });
    const office = knownOffices(item.publishers, loaded.offices)[0];
    if (office) {
      const partners = knownOffices(item.coPublishers, loaded.offices).map(partner => partner.acronym);
      const colours = coloursFor(office.acronym);
      tag.textContent = office.acronym;
      tag.title = office.label + (partners.length ? ' (with ' + partners.join(', ') + ')' : '');
      tag.style.background = colours.background;
      tag.style.borderColor = colours.border;
    }
    return tag;
  };

  const rowFor = (row, excerpt) => el('li', {},
    tagFor(row.item),
    el('div', {},
      el('a', { href: linkFor(row.item), target: '_blank', rel: 'noopener' }, row.item.title || '(untitled)'),
      ...(excerpt ? [excerpt] : [])));

  // Runs on every character typed: works on what is already loaded, no request.
  // Every word must appear in the title or the text. Releases with all words in the
  // title come first; the others show the passage where the text matches.
  const render = () => {
    if (!loaded) return;
    const words = filterInput.value.toLowerCase().split(/\s+/).filter(Boolean);
    const inTitle = [];
    const inText = [];
    for (const row of loaded.rows) {
      if (words.every(word => row.title.includes(word))) inTitle.push(row);
      else if (words.every(word => row.title.includes(word) || row.text.includes(word))) inText.push(row);
    }
    list.replaceChildren(
      ...inTitle.map(row => rowFor(row)),
      ...inText.map(row => rowFor(row, excerptFor(row, words))));
    const count = loaded.rows.length;
    let text = (words.length ? inTitle.length + inText.length + ' of ' + count : count) + (count === 1 ? ' result' : ' results')
      + ' for ' + labelDay(day) + ' (' + lang + ')';
    if (count < loaded.total) text += '. Only ' + count + ' of ' + loaded.total + ' could be loaded.';
    status.textContent = text;
  };

  const search = async newDay => {
    // A slow answer for an earlier date must not overwrite a newer search.
    const thisSearch = ++latestSearch;
    day = newDay;
    dateInput.value = day;
    languageButtons.forEach((button, i) => button.setAttribute('aria-pressed', LANGUAGES[i] === lang));
    todayButton.setAttribute('aria-pressed', day === today);
    yesterdayButton.setAttribute('aria-pressed', day === yesterday);
    previousDayButton.textContent = '‹ ' + labelDay(shiftDay(day, -1));
    nextDayButton.textContent = labelDay(shiftDay(day, 1)) + ' ›';
    nextDayButton.disabled = day >= today;
    loaded = null;
    list.replaceChildren();
    status.textContent = 'Loading ' + labelDay(day) + ' …';
    try {
      // The office list in the chosen language gives the tags, the German one the sort order.
      const [result, offices, germanOffices] = await Promise.all([fetchDay(day, lang), loadOffices(lang), loadOffices('de')]);
      if (thisSearch !== latestSearch) return;
      const rows = result.items.map(item => {
        const plain = plainText(item);
        const office = knownOffices(item.publishers, germanOffices)[0];
        return { item, title: (item.title || '').toLowerCase(), plain, text: plain.toLowerCase(), sortKey: office ? office.acronym : '' };
      });
      // By office, in the order of the German acronyms whatever language is shown; releases
      // without a known office go last. The sort is stable, so each office keeps newest first.
      rows.sort((a, b) => !a.sortKey - !b.sortKey || a.sortKey.localeCompare(b.sortKey, 'de'));
      loaded = { rows, total: result.total, offices };
      render();
    } catch (error) {
      if (thisSearch !== latestSearch) return;
      status.textContent = 'Could not load the results: ' + error.message;
    }
  };

  languageButtons.forEach((button, i) => button.addEventListener('click', () => {
    lang = LANGUAGES[i];
    search(day);
  }));
  todayButton.addEventListener('click', () => search(today));
  yesterdayButton.addEventListener('click', () => search(yesterday));
  previousDayButton.addEventListener('click', () => search(shiftDay(day, -1)));
  nextDayButton.addEventListener('click', () => search(shiftDay(day, 1)));
  // Typing a year fires "change" for 0002, 0020, 0202 … ; min and max make those invalid.
  dateInput.addEventListener('change', () => {
    if (dateInput.value && dateInput.checkValidity()) search(dateInput.value);
  });
  filterInput.addEventListener('input', render);

  if (PAGE) {
    // Take over the tab: replace whatever it shows with an empty page of our own.
    document.open();
    document.write('<!doctype html><html lang="en"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>');
    document.close();
    document.title = TITLE;
    document.head.append(el('link', { rel: 'icon', href: 'data:image/svg+xml,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">' + EMOJI + '</text></svg>') }));
    document.documentElement.style.background = '#f3f4f6';
    document.body.style.margin = '0';
    document.body.append(host);
  } else {
    document.body.append(host);
    closeButton.addEventListener('click', () => panel.close());
    panel.addEventListener('close', () => host.remove());
    panel.showModal();
  }
  search(today);
})();
