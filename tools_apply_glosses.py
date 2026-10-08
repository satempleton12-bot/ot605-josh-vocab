#!/usr/bin/env python3
"""Apply curated flashcard glosses (glosses.json) and headword overrides (headwords.json) to vocab.js; every lemma must have a gloss."""
import json, re
from pathlib import Path
H = Path(__file__).resolve().parent
G = json.loads((H / "glosses.json").read_text(encoding="utf-8"))
p = H / "vocab.js"; src = p.read_text(encoding="utf-8")
i = src.index("window.JOSH_VOCAB = ") + len("window.JOSH_VOCAB = ")
data = json.loads(src[i:].rstrip().rstrip(";"))
missing = [w["strongs"] for w in data["words"] if w["strongs"] not in G]
extra = sorted(set(G) - {w["strongs"] for w in data["words"]})
assert not missing and not extra, (missing, extra)
HW = {k: v for k, v in json.loads((H / "headwords.json").read_text(encoding="utf-8")).items() if not k.startswith("_")}
changes = []
for w in data["words"]:
    if w["strongs"] in HW and w["lemma"] != HW[w["strongs"]]:
        print(f"headword {w['strongs']}: {w['lemma']} -> {HW[w['strongs']]}")
        w["lemma"] = HW[w["strongs"]]
for w in data["words"]:
    if w["gloss"] != G[w["strongs"]]:
        changes.append((w["strongs"], w["lemma"], w["gloss"], G[w["strongs"]]))
        w["gloss"] = G[w["strongs"]]
p.write_text(src[:i] + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
long = [(k, v) for k, v in G.items() if len(re.sub(r"\([^)]*\)", "", v).split()) > 5 or len(v) > 34]
json.dump([dict(strongs=a, lemma=b, before=c, after=d) for a, b, c, d in changes],
          open("/tmp/gloss_changes.json", "w"), ensure_ascii=False, indent=1)
print(f"{len(changes)} of {len(data['words'])} glosses changed; long-check: {long or 'none'}")
