#!/usr/bin/env bash
# Re-download player headshots from the official IPL CDN into public/players/.
#
# Source: https://documents.iplt20.com/ipl/IPLHeadshot2026/<iplId>.png
#   (transparent 1024x1024 PNG cutouts, the same images shown on iplt20.com squads)
# Mapping: scripts/headshot-map.json  ->  { "<card.id>": { "iplId", "iplName", "team" } }
# Files are saved as public/players/<card.id>.png and resized to 256px for the web.
#
# To refresh for a new season:
#   1. Bump the IPLHeadshot2026 year below if the CDN path changes.
#   2. Re-scrape name->id from the 10 team squad pages and rebuild headshot-map.json
#      (a few names use cricinfo-style initials, e.g. "TM Head" = Travis Head, and
#       need a manual line in the map).
#   3. Run this script.
set -euo pipefail
cd "$(dirname "$0")/.."

MAP="scripts/headshot-map.json"
OUT="public/players"
YEAR="2026"
mkdir -p "$OUT"

command -v python3 >/dev/null || { echo "python3 required"; exit 1; }

python3 - "$MAP" "$OUT" "$YEAR" <<'PY'
import json, sys, subprocess, os
mapfile, out, year = sys.argv[1], sys.argv[2], sys.argv[3]
m = json.load(open(mapfile))
base = f"https://documents.iplt20.com/ipl/IPLHeadshot{year}/"
ok = fail = 0
try:
    from PIL import Image
    have_pil = True
except Exception:
    have_pil = False
    print("note: Pillow not installed, skipping resize (images will be full 1024px)")
for cid, info in m.items():
    dst = os.path.join(out, f"{cid}.png")
    url = base + info["iplId"] + ".png"
    r = subprocess.run(["curl","-s","-A","Mozilla/5.0",url,"-o",dst,"-w","%{http_code}"],
                       capture_output=True, text=True)
    if r.stdout.strip() != "200":
        print("FAIL", r.stdout.strip(), cid, info["iplName"]); fail += 1
        if os.path.exists(dst): os.remove(dst)
        continue
    if have_pil:
        im = Image.open(dst).convert("RGBA")
        im.thumbnail((256, 256), Image.LANCZOS)
        im.save(dst, "PNG", optimize=True)
    ok += 1
print(f"done: {ok} ok, {fail} failed")
PY
