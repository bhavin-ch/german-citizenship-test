# Einbürgerungstest Trainer

A local, browser-only practice app for the German citizenship test (Einbürgerungstest / Leben in Deutschland). All 460 questions (300 general + 10 per Bundesland), German-first with an English toggle. Your progress never leaves your machine — it's stored in `localStorage`.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173 (it opens automatically).

Production build: `npm run build` then `npm run preview`.

## Features

- **Pick your Bundesland** — all 16 states; your 3 state questions come from there.
- **Mock exam** — official format: 33 questions (30 general + 3 state), 60-minute countdown, pass ≥ 17, no feedback until the end.
- **State drill / General practice / Review mistakes** — instant feedback with the explanation for each question.
- **German first**, flip on the English translation per question with a toggle (preference is remembered).
- **Analytics** — score over time (chart), accuracy per question (weakest first), and a mistake pile that clears as you get questions right.
- **Light gamification** — XP, levels, a daily streak, and a handful of badges. No clutter.

## Data

Questions, categories, answer keys, images and translations come from the open
[leben-in-deutschland](https://github.com/leben-in-deutschland) project (questions © BAMF).
`src/data/questions.json` is a slimmed copy keeping only German + English. To regenerate it,
re-download `data/question.json` from the `leben-in-deutschland-scrapper` repo and re-run the
transform used to build it.

## Stack

Vite + React + TypeScript, Recharts for the one chart. No backend, no accounts, no network calls
except loading the ~40 external question images.
