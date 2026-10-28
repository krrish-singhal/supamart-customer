#!/usr/bin/env python3
"""Audit or optimize shipping images. Originals are backed up outside the app.

python3 scripts/trim-app-assets.py              # read-only plan
python3 scripts/trim-app-assets.py --apply      # optimize and remove unused assets
Requires Pillow with WebP support. Does not remove listing artwork or design sources.
"""
import argparse
from pathlib import Path
import re
import json
import hashlib
import shutil
from io import BytesIO
from PIL import Image, ImageChops, ImageOps
ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / 'reports/app-size-cleanup'
BACKUP = Path('/tmp/supamart-original-assets')
SOURCES = [ROOT / name for name in ['App.js', 'app.config.js', 'tailwind.config.js', 'Splash.dc.html', 'support.js']]
SOURCES += list((ROOT / 'src').rglob('*.js')) + list((ROOT / 'scripts').glob('*.cjs'))

def references():
    refs = {}
    for source in SOURCES:
        for match in re.finditer(r'''(["'])([^\n]*?)\1''', source.read_text()):
            target = (source.parent / match[2]).resolve()
            if ROOT / 'assets' in target.parents and target.is_file():
                refs.setdefault(target, set()).add(source)
    # These five filenames are constructed by the splash build script.
    for weight in ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']:
        refs.setdefault(ROOT / f'assets/fonts/PlusJakartaSans-{weight}.ttf', set()).add(ROOT / 'scripts/bundle-splash.cjs')
    # Metro automatically discovers scale variants of each required image.
    for target in list(refs):
        for variant in target.parent.glob(target.stem + '@*x' + target.suffix):
            refs.setdefault(variant, set()).update(refs[target])
    return refs

def run(apply=False):
    if apply and (REPORT / 'assets.json').exists():
        raise SystemExit("An optimization report already exists. Use the read-only audit; avoid recompressing optimized photos.")
    refs = references()
    files = [p for p in (ROOT / 'assets').rglob('*') if p.is_file()]
    # Store listing artwork is intentionally outside the runtime graph.
    keep = {'assets/ms-traders-feature-graphic.png'}
    unused = [p for p in files if p not in refs and str(p.relative_to(ROOT)) not in keep]
    result = {'assetBytesBefore': sum(p.stat().st_size for p in files),
              'removed': [{'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size} for p in unused], 'optimized': []}
    if not apply:
        print(json.dumps(result, indent=2)); return
    def backup(path):
        destination = BACKUP / path.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.exists(): shutil.copy2(path, destination)
    photo_dirs = {'Cleaned_Products', 'Fresh Vegetables', 'Dry Fruits & Nuts', 'Rice Atta & Grains', 'Spices & Masala', 'categories', 'sub-categories'}
    for path, callers in sorted(refs.items()):
        relative = path.relative_to(ROOT)
        if len(relative.parts) < 3: continue
        group = relative.parts[1]
        if group not in photo_dirs | {'Brand_Logos'}: continue
        if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}: continue
        original = path.read_bytes()
        image = ImageOps.exif_transpose(Image.open(BytesIO(original))).convert('RGBA')
        original_size = image.size
        limit = 320 if group == 'Brand_Logos' else 480 if group in {'categories', 'sub-categories'} else 640
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
        output = BytesIO()
        lossless = group == 'Brand_Logos'
        image.save(output, format='WEBP', quality=82, lossless=lossless, method=6, exact=True)
        encoded = output.getvalue()
        if len(encoded) >= len(original): continue
        decoded = Image.open(BytesIO(encoded)).convert('RGBA')
        assert decoded.size == image.size
        assert ImageChops.difference(image.getchannel('A'), decoded.getchannel('A')).getbbox() is None, str(path)
        if lossless: assert decoded.tobytes() == image.tobytes(), str(path)
        destination = path.with_suffix('.webp')
        assert destination == path or not destination.exists(), str(destination)
        backup(path)
        destination.write_bytes(encoded)
        if path != destination:
            for caller in callers:
                old = str(path.relative_to(caller.parent)) if path.is_relative_to(caller.parent) else __import__('os').path.relpath(path, caller.parent)
                new = __import__('os').path.relpath(destination, caller.parent)
                caller.write_text(caller.read_text().replace(old, new))
            path.unlink()
        result['optimized'].append({'before': str(relative), 'after': str(destination.relative_to(ROOT)),
            'beforeBytes': len(original), 'afterBytes': len(encoded), 'beforeDimensions': original_size, 'afterDimensions': image.size,
            'alphaVerified': True, 'lossless': lossless, 'sha256': hashlib.sha256(encoded).hexdigest()})
    for path in unused:
        backup(path); path.unlink()
    result['assetBytesAfter'] = sum(p.stat().st_size for p in (ROOT / 'assets').rglob('*') if p.is_file())
    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / 'assets.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v if not isinstance(v, list) else len(v) for k, v in result.items()}, indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    run(parser.parse_args().apply)
