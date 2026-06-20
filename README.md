# High School Boys + Ehti — Official Full Fixtures Version

This version fixes the fixture count and design:

- All 104 World Cup 2026 fixtures are included.
- Knockout fixtures are shown in a flowchart/bracket.
- Undecided knockout teams show as TBC rather than being hidden.
- Dashboard now shows Total Fixtures, Played, Remaining, and Goals Counted.
- Leaderboard table has been redesigned with a more official tournament style.
- Live sync replaces the saved snapshot with the latest API data from Netlify.

## Deploy update
Upload/replace these files in the same GitHub repository:

```text
index.html
app.js
data.js
styles.css
netlify.toml
package.json
README.md
netlify/functions/worldcup.js
```

Then in Netlify: Deploys → Trigger deploy → Deploy site.
