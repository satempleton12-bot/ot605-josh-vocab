# Joshua 1–2 Vocab (Josh Vocab)

Phone flip-card quiz for **OT605 Intermediate Hebrew** at The Expositors Seminary. Every distinct lemma in Joshua chapters 1–2 (MorphHB / WLC, 217 lemmas), with short curated glosses.

**Live:** https://satempleton12-bot.github.io/ot605-josh-vocab/

## Add to iPhone

1. Open the live link in **Safari**
2. Share → **Add to Home Screen**
3. Name it **Josh Vocab**

Works offline after the first visit (the service worker caches the shell and the deck).

## Features

- Hebrew → English (default) or English → Hebrew
- Filters: **Josh 1:1–2:14 (class so far, default)** / Hard only within 1:1–2:14 / All / Chapter 1 / Chapter 2 / Both chapters / Hard only (≤2× in Josh 1–2) / **Rated 1–2 only (weak words)** / **Not yet rated**
- Study order: **Weakest first** (default) or Shuffle
- After each flip, rate the card **1 Don't know · 2 Hard · 3 Good · 4 Know it** (keys 1–4; Space/Enter flips)
- Home screen mastery bar for the current filter (Unrated / 1 / 2 / 3 / 4)
- Results screen: per-level counts for the session, plus **Study weak words (1–2)**
- **Reset ratings** at the bottom of the home screen (asks for confirmation)

## Ratings and spaced repetition

- Ratings are saved per lemma in `localStorage["josh-vocab-ratings-v1"]` as `{"H1234|lemma": {r: lastRating, n: timesRated, t: lastSeenMs}}`. A word with no rating counts as 0.
- **Weakest first** sorts the filtered pool into tiers: unrated and 1 together, then 2, then 3, then 4. Cards are shuffled within each tier.
- Within a session:
  - A **1** comes back about 5 cards later, and again each time you rate it 1.
  - A **2** goes to the end of the queue once per session.
  - **3** and **4** don't repeat.
  - The session ends when the queue is empty, or when you tap End.
- Prefs (`josh-vocab-prefs-v2`) store mode, filter, and order. The old v1 key is removed, so the default filter stays 1:1–2:14.

## Local preview

```bash
cd /home/box/seminary/josh-vocab
python3 -m http.server 8765
```

Then open `http://localhost:8765/`. Add `#test` to the URL to expose a read-only `window.__jvDebug()` queue inspector for automated checks.

## Data pipeline

- Source text: [Open Scriptures MorphHB](https://github.com/openscriptures/morphhb) WLC `Josh.xml` (CC BY 4.0)
- Base glosses and lemma IDs: Strong's Hebrew Dictionary via [openscriptures/strongs](https://github.com/openscriptures/strongs)
- `glosses.json`: hand-curated 1–5 word flashcard glosses, one per Strong's number
- `headwords.json`: headword overrides (currently אֶל H413 and חֶסֶד H2617), so regeneration doesn't revert them

Regenerate `vocab.js` from scratch:

```bash
python3 tools_build_vocab.py Josh.xml strongs-hebrew-dictionary.js   # base deck, applies headwords + glosses
python3 tools_add_thru214.py Josh.xml                                # verses / thru214 / freq214 + vocab-stats.json
python3 tools_apply_glosses.py                                       # re-apply glosses.json + headwords.json
python3 tools_build_standalone.py /workspace/Joshua-Vocab-1.1-2.14.html && cp /workspace/Joshua-Vocab-1.1-2.14.html .
```

`Joshua-Vocab-1.1-2.14.html` is a single-file build (no service worker or manifest) that runs from a file. The build strips the code between `/* SW-START */` and `/* SW-END */` in `app.js`. In that file, ratings persist only if the browser keeps `localStorage` for `file://` pages, and iOS Files/Quick Look may not. Use the live URL for reliable progress tracking.
