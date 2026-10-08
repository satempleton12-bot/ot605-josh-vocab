#!/usr/bin/env python3
"""Add verse refs + thru214/freq214 (Josh 1:1–2:14) to vocab.js from MorphHB WLC Josh.xml."""
import json, re, sys, xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

XML = sys.argv[1] if len(sys.argv) > 1 else "/tmp/josh-vocab-build/Josh.xml"
HERE = Path(__file__).resolve().parent
NS = {"o": "http://www.bibletechnologies.net/2003/OSIS/namespace"}
PREFIX = {"b", "c", "d", "i", "k", "l", "m"}

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
refs = defaultdict(list)          # H# -> list of "c:v" per occurrence
for v in root.iter(f"{{{NS['o']}}}verse"):
    oid = v.get("osisID") or ""
    m = re.match(r"Josh\.(\d+)\.(\d+)$", oid)
    if not m:
        continue
    c, vs = int(m.group(1)), int(m.group(2))
    if c not in (1, 2):
        continue
    for w in v.iter(f"{{{NS['o']}}}w"):
        for n in nums(w.get("lemma")):
            refs[f"H{n}"].append((c, vs))

p = HERE / "vocab.js"
src = p.read_text(encoding="utf-8")
i = src.index("window.JOSH_VOCAB = ") + len("window.JOSH_VOCAB = ")
header = src[:i]
data = json.loads(src[i:].rstrip().rstrip(";"))
words = data["words"]

problems = []
for w in words:
    occ = refs.get(w["strongs"], [])
    if len(occ) != w["freq"]:
        problems.append(f"{w['strongs']} freq {w['freq']} != {len(occ)} recomputed")
    in214 = [o for o in occ if o[0] == 1 or (o[0] == 2 and o[1] <= 14)]
    w["verses"] = sorted({f"{c}:{v}" for c, v in occ}, key=lambda s: tuple(map(int, s.split(":"))))
    w["thru214"] = bool(in214)
    w["freq214"] = len(in214)

p.write_text(header + json.dumps(data, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")

sp = HERE / "vocab-stats.json"
stats = json.loads(sp.read_text())
stats["thru214_lemmas"] = sum(w["thru214"] for w in words)
stats["hard214_lemmas"] = sum(w["thru214"] and w["freq214"] <= 2 for w in words)
stats["only_2_15_24_lemmas"] = sum(not w["thru214"] for w in words)
stats["thru214_note"] = "thru214 = occurs in Josh 1:1–2:14; freq214 = occurrences in that range (MorphHB WLC verse osisIDs)."
sp.write_text(json.dumps(stats, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({k: stats[k] for k in ("unique_lemmas", "thru214_lemmas", "hard214_lemmas", "only_2_15_24_lemmas")}))
print("freq mismatches:", problems or "none")
