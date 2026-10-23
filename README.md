# Prism Gallery AI

A lightweight, browser-based photo gallery and editor.

## Run locally

You can open `index.html` directly: image search uses Openverse and falls back to Wikimedia Commons when needed. An internet connection is required. Or run `npm start` with Node.js 20.6 or newer and open http://localhost:3000 to also enable Unsplash search.

## Features

- Add and organize photos by category
- Browse photos in the Memory Wall slideshow
- Adjust brightness, contrast, saturation, highlights, shadows, warmth, vibrance, blur, and sharpness
- Find visually similar images and remove extra copies
- Favorite, lock, trash, and download photos
- Search openly licensed images from Openverse or Wikimedia Commons and add them to Downloads
- Create albums, search descriptions and tags, and monitor browser storage use
- Generate AI image descriptions and tags when the local server and OpenAI key are configured

## Image search setup

1. For basic Openverse search, no setup is needed; open the app with an internet connection.
2. To enable Unsplash results and AI descriptions, create an Unsplash developer application, copy `.env.example` to `.env`, and set `UNSPLASH_ACCESS_KEY` plus `OPENAI_API_KEY`.
3. Install Node.js 20.6 or newer, run `npm start`, and open `http://localhost:3000`. Opening the HTML file directly supports albums, storage estimates, duplicate scanning, and Openverse search, but cannot call the protected OpenAI endpoint.

Type a query in the top search bar and press Enter to show image results. Click **Add to gallery** on the images you want to save. The **Google Images** button opens a Google image search for that query. Download an image from Google to your device, then choose **+ Add photos** to import it. Google’s Custom Search API requires credentials and is closed to new customers, so Google results cannot be imported directly from its results page.

## Photo storage

Photos are stored in the browser's local storage for the current site origin. They are not uploaded to a server. Clearing browser data or using a different browser or origin can make the saved gallery unavailable. The Locked category is a visibility gate, not encryption.

## Project files

- `server.mjs` — local server and protected API routes

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup and workflow instructions. Please open an issue to discuss larger changes before starting work, then submit a pull request for review.

To add someone as a repository collaborator, open the repository on GitHub and go to **Settings → Collaborators** (under **Access**), then invite them by GitHub username. For open-source contributions, anyone can fork the repository and open a pull request without collaborator access.

- index.html — page structure
- style.css — layout and styling
- script.js — gallery and editor behavior
