# Fund Analysis Dashboard

Interactive comparison of 20 overseas-themed funds from 2024-09-24 onward.

The dashboard includes normalized NAV trends, maximum drawdown ranking,
risk/return comparison, annualized volatility, and a detailed fund table.

## Data updates

GitHub Actions refreshes public NAV data from Eastmoney and deploys the result
to GitHub Pages every day at 20:30 Asia/Shanghai. The workflow can also be
triggered manually from the Actions tab.

## Local refresh

```bash
node scripts/update-data.mjs
```

The published dashboard is generated in `public/index.html`.
