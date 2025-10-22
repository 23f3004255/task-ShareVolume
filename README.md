# Autodesk (ADSK) Shares Outstanding Visualization

This project showcases the maximum and minimum number of common stock shares outstanding for Autodesk, Inc. using live data from the SEC.

## Features

- Fetches and processes data from the SEC XBRL API.
- Displays entity name, max/min shares with fiscal years, and supports alternate CIKs via query string.
- Dynamic UI: changing the `?CIK=XXXXXXXXXX` updates the data instantly (using a CORS proxy for the SEC API).
- Modern, visually appealing interface.

## Files

- `index.html` — Entry point UI (works for GitHub Pages/static hosting)
- `data.json` — Initial data for Autodesk (ADSK)
- `uid.txt` — Project identifier
- `LICENSE` — MIT License

## Usage

Open `index.html` directly or host via GitHub Pages.  
To view another company, append `?CIK=XXXXXXXXXX` (`XXXXXXXXXX` being a 10-digit CIK) to the URL.

## License

MIT License &copy; Autodesk (ADSK), 2024.