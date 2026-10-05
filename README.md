# Joshua 1–2 Vocab (Josh Vocab)

Phone flip-card quiz for **OT605 Intermediate Hebrew** at The Expositors Seminary. Every distinct lemma in Joshua chapters 1–2 (MorphHB / WLC), with Strong’s glosses.

## Add to iPhone

1. Open the live link in **Safari** (see below once Pages is on)
2. Share → **Add to Home Screen**
3. Name it **Josh Vocab**

Works offline after the first visit (service worker caches the shell + deck).

## Local preview

```bash
cd /home/box/seminary/josh-vocab
python3 -m http.server 8765
```

Then open `http://localhost:8765/`.

## Features

- Hebrew → English (default) or English → Hebrew
- Filters: All / Chapter 1 / Chapter 2 / Both chapters / Hard only (≤2× in Josh 1–2)
- Shuffle, Got it / Missed, review pile, full quiz again
- Progress `n/total`
- Dark theme matching the BC 801 verse quiz

## Data notes

- Source text: [Open Scriptures MorphHB](https://github.com/openscriptures/morphhb) WLC `Josh.xml` (CC BY 4.0)
- Glosses: Strong’s Hebrew Dictionary via [openscriptures/strongs](https://github.com/openscriptures/strongs) (public domain / CC-BY)
- A small number of MorphHB tokens are inseparable preposition+pronoun clitics without a separate numeric lemma ID; all numbered lemmas are included
- See `vocab-stats.json` for counts

## Deploy

Repo is initialized on `main` with remote:

`https://github.com/sethtempleton-alt/ot605-josh-vocab.git`

When GitHub CLI / credentials are available:

```bash
gh repo create sethtempleton-alt/ot605-josh-vocab --public --source=. --remote=origin --push
gh api -X POST repos/sethtempleton-alt/ot605-josh-vocab/pages -f build_type=workflow -f source[branch]=main -f source[path]=/
# or: Settings → Pages → Deploy from branch `main` / root
```

Intended live URL: `https://sethtempleton-alt.github.io/ot605-josh-vocab/`
