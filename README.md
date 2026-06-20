# High School Boys + Ehti World Cup League

## Why the old button said “Failed to fetch”
football-data.org blocks browser/CORS requests, so the API cannot be called directly from `index.html`.

## Fixed live setup
This version uses a Netlify serverless function:

`/.netlify/functions/worldcup`

The function calls football-data.org from the server, then the website reads the result. The API token is included in the function file, and it can also use a Netlify environment variable called `FOOTBALL_DATA_TOKEN`.

## How to make it live
1. Upload this whole folder or ZIP to Netlify.
2. Deploy it.
3. Open your Netlify website URL.
4. Go to **Live API**.
5. Press **Sync live scores now**.

Do not test live sync by double-clicking `index.html`; Netlify functions only work on the deployed Netlify site or when using Netlify Dev locally.
