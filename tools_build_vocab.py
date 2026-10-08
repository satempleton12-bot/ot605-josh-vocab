#!/usr/bin/env python3
"""Regenerate base vocab.js (lemma, gloss, strongs, freq, chapters) for Josh 1–2 from MorphHB WLC + Strong's.

Full pipeline:
  python3 tools_build_vocab.py Josh.xml strongs-hebrew-dictionary.js
  python3 tools_add_thru214.py Josh.xml
  python3 tools_apply_glosses.py          # applies glosses.json AND headwords.json
Sources:
  https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/Josh.xml
  https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js
"""
import json, re, sys, xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

H = Path(__file__).resolve().parent
XML = sys.argv[1] if len(sys.argv) > 1 else "/tmp/josh-vocab-build/Josh.xml"
DICT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/josh-vocab-build/strongs-hebrew-dictionary.js"
NS = "{http://www.bibletechnologies.net/2003/OSIS/namespace}"
PREFIX = {"b", "c", "d", "i", "k", "l", "m"}

js = Path(DICT).read_text(encoding="utf-8")
start = js.index("var strongsHebrewDictionary = ") + len("var strongsHebrewDictionary = ")
strongs = json.loads(js[start:js.index("};\n", start) + 1])
headwords = {k: v for k, v in json.loads((H / "headwords.json").read_text(encoding="utf-8")).items() if not k.startswith("_")}
glosses = json.loads((H / "glosses.json").read_text(encoding="utf-8"))

def nums(attr):
    out = []
    for p in (attr or "").split("/"):
        p = p.strip()
        if not p or (len(p) == 1 and p.lower() in PREFIX):
            continue
        m = re.match(r"^(\d+)", re.sub(r"\s+[a-zA-Z]$", "", p))
        if m:
            out.append(int(m.group(1)))
    return out

root = ET.parse(XML).getroot()
counts, chapters = defaultdict(int), defaultdict(set)
for ch in root.iter(NS + "chapter"):
    m = re.match(r"Josh\.(\d+)$", ch.get("osisID") or "")
    if not m or int(m.group(1)) not in (1, 2):
        continue
    c = int(m.group(1))
    for w in ch.iter(NS + "w"):
        for n in nums(w.get("lemma")):
            counts[n] += 1
            chapters[n].add(c)

words = []
for n, f in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
    hid = f"H{n}"
    e = strongs[hid]
    gloss = glosses.get(hid) or (e.get("strongs_def") or e.get("kjv_def") or "").replace("{", "").replace("}", "")
    words.append({"lemma": headwords.get(hid, e["lemma"]), "gloss": gloss, "strongs": hid,
                  "freq": f, "chapters": sorted(chapters[n])})

(H / "vocab.js").write_text(
    "/* Joshua 1–2 vocabulary from MorphHB WLC + Strong's (public domain / CC-BY).\n"
    " * Generated for OT605 Intermediate Hebrew — Seth Templeton / The Expositors Seminary.\n"
    " */\n"
    "window.JOSH_VOCAB = " + json.dumps({"words": words}, ensure_ascii=False, indent=2) + ";\n",
    encoding="utf-8")
print(f"base vocab.js: {len(words)} lemmas")
