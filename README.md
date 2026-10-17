# A bookmarklet to rapidly find a press release of the Federal Council
## The Problem
At work, I often need to be able to reference the URL of a specific press release of the Federal Council, in a footnote for example. Often the decision is from some months or even years ago in the past. I typically do know the date of the decision.
Unfortunately, the search options in News Service Bund at https://www.admin.ch/de/newnsb are very clumsy (go have a look and try to search for all the press releases of January 15th 2025, for example, and you will immediately understand what I mean ...) 
## The purpose of the Bookmarklet
So I wanted to have a small Bookmarklet (a small program saved in a bookmark directly in my browser) that does something very simple:
* When I launch the Bookmarklet
* there is a pop-up asking me for a date, in the DD.MM.YYYY format
* I insert the day I am searching and confirm by clicking OK
* I get all the Press Releases of that day, in the language of my browser, with the full title and with a link to the URL of that language version
## Version 1.0.0 - thanks to Gamba
With a lot of help from AI, I wrote a very, very, very basic first version, barely working - and then Gamba basically wrote a full-blown small web-application (see history). That's what you now find in the files, including a "build.js" and a detailed explanation of what Gamba did.
## How to use it
If you are working for the Federal Administration and visiting this page from your work-station, you can't execute the build-file locally.
But there is an easy workaround if you just want to use the bookmarklet:
1. Open the "bookmarklet-page.js"-file 
2. Click in the code, select it all (with Ctrl-A, for example) and then copy it (Ctrl-C)
3. Go to your Browser (Edge, Firefox, ...) and create a new Bookmark from Scratch: The easiest is to simply "bookmark" any page and save it wherever you like and then right-click it to edit it. 
4. Give it a name and then insert the code you have in the memory in the URL-field. 
5. Save the modified Bookmark and you're all set.
