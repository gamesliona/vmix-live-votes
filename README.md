# vMix Live Votes

A transparent, centered live-vote overlay with two vertical Windows 7 style progress bars. Built with HTML, CSS, JavaScript and a small Node.js server.

- Google Sheets counts refresh every seven seconds without reloading.
- Percentages use the sum of the two vote counts.
- The leader is green; the losing bar turns glossy black. Ties are green.
- Soft edge glow, animated shine, and locally bundled Fjalla One labels below each bar.
- Failed requests preserve the last valid result and show a subtle warning.

## Setup

Requires Node.js 20 or later. No npm dependencies are needed.

1. Copy `config.example.json` to `config.local.json`.
2. Set `apiKey` and `spreadsheetId` in the local file. Enable the Google Sheets API for your key's project.
3. Keep `range` as `Sheet1!A1:C3`. The default labels are A2/A3 and counts B2/B3; cell mappings are configurable within that range.
4. Run `node test-request.mjs` to see the actual API response.
5. Run `node server.mjs` and keep it running.
6. Open http://127.0.0.1:8080/.

For local mode, the API key stays in local configuration, which is ignored by Git and never served to the browser. The hosted live page uses a key-free public CSV read of only Sheet1!A1:B3. Its config.public.json contains the tally spreadsheet ID and cell mapping, with no API key. The local server binds to 127.0.0.1 and serves only explicitly allowed files. `/api/votes` returns only the two aggregate results.

## Add to vMix

1. Choose **Add Input → Web Browser**.
2. Enter `http://127.0.0.1:8080/` and set **Width = 1920**, **Height = 1080**.
3. Click **OK**, then click the input's **1** overlay button to show it over the program.
4. Use **Input Settings → Position** for further positioning or scaling. No chroma key is needed.

Run the server on the same computer as vMix. Refresh the browser input once after changing the project files; vote changes update automatically.

## Demo and checks

- `http://127.0.0.1:8080/?demo=cycle` cycles through 2–2, 2–1 and 0–0.
- `?demo=tie`, `?demo=split`, and `?demo=zero` hold individual cases.
- `?demo=failure` starts at 2–1, then issues a failing request and retains the last result.
- For an offline preview, open `index.html` with `?demo=cycle` appended to its file URL.
- Run `node --test overlay.test.mjs` to check totals, rendering updates, lead changes, ties, and failed requests.

## Google Sheets privacy

An API key can read a publicly readable tally, but cannot access a private spreadsheet. Do not make a Google Form responses workbook public: it may include voter email addresses.

For a private source, use a separate tally workbook containing only team labels and two aggregate counts. Update it through an owner-authorized process that copies only those totals. Share only that tally workbook for API-key reads. A 403 can also indicate key restrictions or a disabled API; inspect the returned error first.

The GitHub Pages site reads the aggregate tally directly from Google Sheets every seven seconds. It uses the public Google Sheets CSV endpoint for only Sheet1!A1:B3, with no API key. This works only for a publicly readable aggregate tally. No response rows or email addresses are read. Local mode continues to use the Node.js proxy and config.local.json. The deployment workflow uploads only an explicit list of public files.

## Third-party assets

- [7.css](https://github.com/khang-nd/7.css), MIT license: `7.css.LICENSE`.
- [Fjalla One](https://github.com/google/fonts/tree/main/ofl/fjallaone), SIL Open Font License: `FjallaOne-LICENSE.txt`.

[Google Sheets API reference](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get) · [vMix Web Browser documentation](https://www.vmix.com/help28/WebBrowser.html)


