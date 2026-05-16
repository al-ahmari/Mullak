# Mullak Deployment And Google Sheets Setup

## What This Gives You

- Public deployment on Render
- Lead submissions saved by the app
- Durable sync to Google Sheets for spreadsheet access
- Local JSON file remains available as a server-side backup when running locally

## Important Note

On hosted platforms like Render, local files are not a reliable long-term database. Treat Google Sheets as the main persistent store for production.

## 1. Create The Google Sheet

1. Create a new Google Sheet.
2. Rename the first tab to `Leads` or set `GOOGLE_SHEET_NAME` to your chosen tab name.
3. Add this header row in row 1:

```text
submittedAt,id,name,phone,units,city,notes
```

## 2. Create A Google Service Account

1. Open Google Cloud Console.
2. Create a project or choose an existing one.
3. Enable the Google Sheets API.
4. Create a service account.
5. Generate a JSON key for that service account.
6. Copy the service account email.
7. Copy the private key value.
8. Share the Google Sheet with the service account email as an Editor.

## 3. Set Environment Variables

Use the values from the service account and sheet:

- `GOOGLE_SHEET_ID`
- `GOOGLE_SHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

For the private key, keep the full key including BEGIN/END lines. If the platform needs a single-line value, keep the `\n` escaped newlines.

## 4. Deploy On Render

1. Push this project to GitHub.
2. In Render, choose `New +` then `Blueprint`.
3. Select the repository.
4. Render will read `render.yaml` automatically.
5. Fill in the three secret environment variables:
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
6. Deploy.

## 5. Local Run

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## 6. CSV Export

To export the server-side JSON backup to CSV:

```bash
npm run export:csv
```

The output file will be written to `exports/leads.csv`.

## 7. Production Recommendation

For production, use Google Sheets as the durable store and treat local file storage only as a local-development backup.
