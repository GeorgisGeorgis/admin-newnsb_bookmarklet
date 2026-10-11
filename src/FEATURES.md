# Features added since the first version

The first version asked for a date and for keywords in two pop-ups, then replaced the page with a plain list of titles. Everything below was added after it.

## Features

- **Two bookmarklets.** `bookmarklet-modal.js` opens the tool in a dialog over the current page; closing it (✕ or Esc) gives the page back as it was. `bookmarklet-page.js` replaces the current page with the tool as a page of its own, in a centred column.
- **Start from an empty page.** The page bookmarklet also runs on `about:blank`, not only on a web page.
- **Language selector.** The first row offers DE, FR, IT and EN, with DE selected by default. Changing the language repeats the search for the same day.
- **Date choice.** Today (loaded when the tool opens), Yesterday, or any other day in a date field.
- **Day navigation.** Two buttons at the bottom step to the day before and the day after, each labelled with weekday and date. There is no stepping past today.
- **Search as you type.** One or more words narrow the list with every character typed, without any request to the news service.
- **Full-text search.** The words are searched in the title, the lead and the full text of each Press Release. Releases with all words in the title come first; the others show the passage where the text matches, with the words highlighted.
- **Office tag.** Each Press Release carries a tag with the acronym of the office that published it (BR, BK, SECO …), in place of a bullet point.
- **One colour per office.** The tags use a pastel palette; the same acronym always gets the same colour.
- **Office names.** Hovering over a tag shows the full name of the office in the chosen language, and the offices that co-published the release.
- **Sorted by office.** The list is ordered by the German acronym of the office, whatever language is shown; within an office the newest release comes first.
- **Working links.** Each title links to the Press Release in the chosen language and opens it in a new tab, for older and for newer releases alike.
- **All results of the day.** Every release is listed, also on days with more than the 50 the news service returns per request, and none twice.
- **Status line.** It shows the number of results, the weekday and date and the language, how many match while searching, and a message while loading or when the news service cannot be reached.
- **Quiet list.** Titles are in the text colour rather than link blue, every second row is lightly shaded, and visited titles turn grey.
- **Title.** "📰 Press releases, day by day".
- **Safe display.** Titles and texts from the news service are shown as text, never run as HTML.
- **Readable source.** The code lives in `src/bookmarklet.js` and `src/style.css`; `node src/build.js` writes the two bookmarklet files from them.

## Notes

- **Install.** Create a new bookmark and paste, as its URL, the whole content of one of the two bookmarklet files. Each file is one long line starting with `javascript:`.
- **Start page.** Browsers run no bookmarklet on their built-in start page (the "New Tab" page of Chrome and Edge, the Firefox home page). Open `about:blank` or any web page first.
- **Build.** `node src/build.js` needs Node.js and no packages. The two bookmarklet files are generated; do not edit them by hand.
- **One string.** Each bookmarklet has to stay in one string. www.admin.ch sends a Content-Security-Policy that blocks scripts and images from other hosts; inline styles and `data:` images are allowed.
- **Only the news service.** Everything shown comes from the news service (`d-nsbc-p.admin.ch`). It returns the same, German acronym for an office in all four languages, so the tags stay German; only the full names change with the language.
- **Service limits.** It returns at most 50 items per request, and items with the same timestamp do not come in the same order every time; `fetchDay` deals with both. It names publishers by id only; acronyms and names come from `/v1/organisations`, fetched once per language by `loadOffices`.
- **Day boundaries.** A day is searched from 00:00 to 23:59 UTC, not Swiss time.
- **Go easy on the service when testing.** After a burst of about 130 scripted requests in ten minutes it reset every connection from the test machine for a while.
