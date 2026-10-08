#!/usr/bin/env python3
"""Inline styles.css + vocab.js + app.js into index.html -> single file that runs from file://."""
import re, sys
from pathlib import Path
H = Path(__file__).resolve().parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else H / "Joshua-Vocab-1.1-2.14.html"
html = (H / "index.html").read_text(encoding="utf-8")
css = (H / "styles.css").read_text(encoding="utf-8")
vocab = (H / "vocab.js").read_text(encoding="utf-8")
app = (H / "app.js").read_text(encoding="utf-8")

# Remove the service-worker block between /* SW-START */ and /* SW-END */ markers
app, n = re.subn(r"\n[ \t]*/\* SW-START \*/.*?/\* SW-END \*/[ \t]*\n", "\n", app, flags=re.S)
assert n == 1, "SW-START/SW-END block not found exactly once"
assert "serviceWorker" not in app

html = re.sub(r'\s*<link rel="(manifest|apple-touch-icon|icon|stylesheet)"[^>]*>', "", html)
html = html.replace("</head>", "  <style>\n" + css + "\n</style>\n</head>", 1)
safe = lambda s: s.replace("</script", "<\\/script")
html = html.replace('<script src="./vocab.js"></script>', "<script>\n" + safe(vocab) + "\n</script>", 1)
html = html.replace('<script src="./app.js"></script>', "<script>\n" + safe(app) + "\n</script>", 1)
for bad in ('src="./', 'href="./', "serviceWorker", "manifest.webmanifest"):
    assert bad not in html, bad
out.write_text(html, encoding="utf-8")
print("wrote", out, len(html), "bytes")
