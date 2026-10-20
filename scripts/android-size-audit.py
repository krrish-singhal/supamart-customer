#!/usr/bin/env python3
"""Reproducible byte inventory; sizes are not Play download estimates.

python3 scripts/android-size-audit.py --output reports/android-size/local.json
python3 scripts/android-size-audit.py --artifact /tmp/app.aab --output /tmp/aab.json
"""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def audit():
    sources = [ROOT / 'App.js', ROOT / 'app.config.js', ROOT / 'tailwind.config.js']
    sources += sorted((ROOT / 'src').rglob('*.js'))
    references = collections.defaultdict(list)
    imports = collections.defaultdict(list)
    dynamic = []
    for source in sources:
        text = source.read_text()
        for match in re.finditer(r'''require\(\s*(["'])(.*?)\1\s*\)''', text):
            path = (source.parent / match[2]).resolve()
            if ROOT / 'assets' in path.parents:
                references[str(path.relative_to(ROOT))].append(str(source.relative_to(ROOT)))
        if source.name == 'app.config.js':
            for asset in re.findall(r'''["'](\./assets/[^"']+)["']''', text):
                references[asset.removeprefix('./')].append('app.config.js')
        for package in re.findall(r'''(?:from\s*|import\s*\(|require\s*\()\s*["']([^./][^"']*)["']''', text):
            key = '/'.join(package.split('/')[:2]) if package.startswith('@') else package.split('/')[0]
            imports[key].append(str(source.relative_to(ROOT)))
        for line, value in enumerate(text.splitlines(), 1):
            if not value.lstrip().startswith('//') and re.search(r'\brequire\(\s*[^\s"\']', value):
                dynamic.append({'source': str(source.relative_to(ROOT)), 'line': line, 'text': value})
    rows = []
    groups = collections.Counter()
    for path in sorted((ROOT / 'assets').rglob('*')):
        if not path.is_file():
            continue
        name = str(path.relative_to(ROOT))
        size = path.stat().st_size
        groups[str(path.parent.relative_to(ROOT))] += size
        rows.append({'path': name, 'bytes': size, 'references': sorted(set(references[name])),
                     'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
    dependencies = []
    package = json.loads((ROOT / 'package.json').read_text())
    lock = json.loads((ROOT / 'package-lock.json').read_text())
    for name in package['dependencies']:
        path = ROOT / 'node_modules' / name
        size = sum(p.stat().st_size for p in path.rglob('*') if p.is_file())
        dependencies.append({'name': name, 'installedBytes': size,
                             'lockedVersion': lock['packages'].get('node_modules/' + name, {}).get('version'),
                             'directSourceImports': sorted(set(imports[name])),
                             'androidDirectory': (path / 'android').is_dir(),
                             'expoModule': (path / 'expo-module.config.json').exists()})
    return {'assetBytes': sum(groups.values()), 'assetGroups': dict(groups),
            'assets': sorted(rows, key=lambda r: -r['bytes']),
            'unreferencedCandidates': [r['path'] for r in rows if not r['references']],
            'nonLiteralRequires': dynamic,
            'dependencies': sorted(dependencies, key=lambda r: -r['installedBytes']),
            'caveat': 'Installed npm bytes include source/iOS/tools and do not measure APK contribution. Unreferenced candidates require review before deletion.'}


def artifact(path):
    with zipfile.ZipFile(path) as archive:
        rows = [{'path': i.filename, 'bytes': i.file_size, 'zipBytes': i.compress_size}
                for i in archive.infolist() if not i.is_dir()]
        groups = collections.defaultdict(lambda: {'bytes': 0, 'zipBytes': 0, 'count': 0})
        for row in rows:
            name = row['path']
            if '/lib/' in name or name.startswith('lib/'):
                group = 'native/' + name.split('lib/', 1)[1].split('/')[0]
            elif name.endswith(('.bundle', '.hbc')):
                group = 'javascript-hermes'
            elif '/dex/' in name or name.endswith('.dex'):
                group = 'dex'
            elif '/res/' in name or name.startswith('res/'):
                group = 'resources'
            elif '/assets/' in name or name.startswith('assets/'):
                group = 'assets'
            else:
                group = 'metadata-other'
            for key in ['bytes', 'zipBytes']:
                groups[group][key] += row[key]
            groups[group]['count'] += 1
    return {'artifact': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'uploadBytes': path.stat().st_size, 'groups': dict(groups),
            'entries': sorted(rows, key=lambda r: -r['bytes']),
            'caveat': 'ZIP bytes are upload compression, not device-specific Play download size or installed disk usage.'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    report = artifact(args.artifact) if args.artifact else audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(args.output)
