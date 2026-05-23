# Portfolio Manager App

A clean, dark-themed stock portfolio & monthly expense tracker.

## Project Structure

```
portfolio-app/
├── index.html        ← Main HTML
├── css/
│   └── style.css     ← All styles
├── js/
│   └── app.js        ← All logic
└── README.md
```

## How to Run in VS Code

### Option 1 — Live Server (recommended)
1. Open the `portfolio-app` folder in VS Code
2. Install the **Live Server** extension (by Ritwick Dey)
3. Right-click `index.html` → **Open with Live Server**
4. App opens at `http://127.0.0.1:5500`

### Option 2 — Open directly
Just double-click `index.html` to open it in your browser.
> Note: localStorage works in both modes.

## Features
- **Holdings tab** — add stocks with ticker, qty, buy price & current price
- **Edit button** — inline-edit qty, buy price, or current price any time (e.g. monthly updates)
- **Allocation chart** — doughnut chart showing portfolio split
- **Expenses tab** — log monthly expenses by category
- **Month/year filter** — filter expenses to any specific month
- **Category bar chart** — see spending breakdown
- **Monthly totals chart** — see all months at a glance
- **Data persisted** — saved to browser localStorage automatically

## Tech Stack
- Vanilla HTML / CSS / JS (no build step needed)
- Chart.js 4.4.1 (via CDN)
- Google Fonts: Sora + DM Mono
