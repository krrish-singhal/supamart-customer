#!/usr/bin/env python3
"""Convert referenced catalogue/UI PNGs to WebP; requires Pillow with libwebp.

Run from the customer directory on the original PNG checkout. No resizing, no
network access. Product/category photos use quality 90; logos/UI use lossless.
All alpha samples and dimensions must survive decoding exactly.
"""
import hashlib
from io import BytesIO
import json
import os
from pathlib import Path
import re
from PIL import Image, ImageChops, features

ROOT = Path(__file__).resolve().parents[1]
assert features.check('webp'), 'Pillow needs libwebp support'
sources = [ROOT / 'App.js', *sorted((ROOT / 'src').rglob('*.js'))]
targets = {}
for source in sources:
    for match in re.finditer(r'''require\(\s*(["'])(.*?\.png)\1\s*\)''', source.read_text()):
        path = (source.parent / match[2]).resolve()
        if ROOT / 'assets' in path.parents:
            targets.setdefault(path, []).append(source)

rows = []
for path, callers in sorted(targets.items()):
    relative = path.relative_to(ROOT)
    # Native icon/splash configuration keeps PNGs; only JS image sources change.
    if len(relative.parts) < 3:
        continue
    photo = relative.parts[1] in {'Cleaned_Products', 'categories', 'sub-categories'} or path.name == 'banner.png'
    original = path.read_bytes()
    with Image.open(path) as image:
        original_rgba = image.convert('RGBA')
        output = BytesIO()
        image.save(output, format='WEBP', quality=90, lossless=not photo, method=6, exact=True)
        encoded = output.getvalue()
    if len(encoded) >= len(original):
        continue
    with Image.open(BytesIO(encoded)) as decoded:
        assert decoded.size == original_rgba.size, str(relative)
        assert ImageChops.difference(original_rgba.getchannel('A'), decoded.convert('RGBA').getchannel('A')).getbbox() is None, str(relative)
        if not photo:
            assert original_rgba.tobytes() == decoded.convert('RGBA').tobytes(), str(relative)
    destination = path.with_suffix('.webp')
    assert not destination.exists(), str(destination)
    destination.write_bytes(encoded)
    for caller in set(callers):
        text = caller.read_text()
        # Replace the full relative require path, including spaces/apostrophes.
        require_path = os.path.relpath(path, caller.parent)
        caller.write_text(text.replace(require_path, require_path[:-4] + '.webp'))
    path.unlink()
    rows.append({'before': str(relative), 'after': str(destination.relative_to(ROOT)),
                 'beforeBytes': len(original), 'afterBytes': len(encoded),
                 'beforeSha256': hashlib.sha256(original).hexdigest(),
                 'afterSha256': hashlib.sha256(encoded).hexdigest(),
                 'mode': 'quality90' if photo else 'lossless',
                 'dimensionsPreserved': True, 'alphaPreserved': True})
output_path = ROOT / 'reports/android-size/image-conversion.json'
output_path.write_text(json.dumps(rows, indent=2) + '\n')
print(f'{len(rows)} images: {sum(r["beforeBytes"] for r in rows):,} -> {sum(r["afterBytes"] for r in rows):,} bytes')
