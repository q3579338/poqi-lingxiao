"""Build matching local-directory and complete offline artifacts from one source."""
from pathlib import Path
import base64, hashlib, json, zipfile

root = Path(__file__).resolve().parents[1]
web = root / 'web'
release = root / 'release'
release.mkdir(exist_ok=True)
html = (web / 'index.html').read_text(encoding='utf-8')
license_text = (root / 'LICENSE').read_text(encoding='utf-8')
html = html.replace('</head>', '<!--\n' + license_text + '\nAI-generated scene artwork; see ASSETS.md in the source repository.\n--></head>')
styles = ['story.css', 'expedition.css']
scripts = ['text-data.js', 'text-engine.js', 'story-engine.js', 'expedition-data.js', 'expedition-engine.js', 'expedition-app.js']
for name in styles:
    css = (web / 'assets' / name).read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="assets/' + name + '">', '<style>' + css + '</style>')
for name in scripts:
    source = (web / 'assets' / name).read_text(encoding='utf-8').replace('</script', '<\\/script')
    html = html.replace('<script src="assets/' + name + '"></script>', '<script>' + source + '</script>')
art_files = sorted((web / 'assets/art').glob('*.png'))
offline_art = {art.relative_to(web).as_posix(): 'data:image/png;base64,' + base64.b64encode(art.read_bytes()).decode('ascii') for art in art_files}
html = html.replace('</head>', '<script>window.PQ_ARTS=' + json.dumps(offline_art, separators=(',', ':')) + ';</script></head>')
active_files = [web / 'index.html'] + [web / 'assets' / n for n in styles + scripts] + art_files
single = release / '破契凌霄-历练版v0.8.html'
single.write_text(html, encoding='utf-8')
directory = release / '破契凌霄-历练版H5目录包-v0.8.zip'
with zipfile.ZipFile(directory, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(root / 'LICENSE', 'LICENSE')
    for file in active_files:
        if file.is_file():
            z.write(file, file.relative_to(web).as_posix())
source_zip = release / '破契凌霄-历练版源码-v0.8.zip'
with zipfile.ZipFile(source_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for directory_name in ['web', 'docs', 'tests', '.github']:
        for file in sorted((root / directory_name).rglob('*')):
            if file.is_file() and not {'out', 'text-out', 'flow-out', 'art-out', 'brief-out', 'direct-out', 'expedition-out', '__pycache__'}.intersection(file.relative_to(root).parts) and (directory_name != 'web' or file in active_files):
                z.write(file, file.relative_to(root).as_posix())
    for name in ['README.md', 'STATUS.md', 'ASSETS.md', 'LICENSE', 'package.json', 'package-lock.json', '.gitignore', '.gitattributes']:
        if (root / name).is_file(): z.write(root / name, name)
manifest = {
    'title': '破契凌霄', 'version': '0.8.0-expedition', 'route': 'standalone-h5-text-rpg',
    'release_status': 'local-playable-not-uploaded',
    'entry': 'index.html', 'orientation': 'portrait', 'interface': 'responsive-text',
    'source': {str(p.relative_to(root)).replace('\\','/'): hashlib.sha256(p.read_bytes()).hexdigest()
               for p in active_files},
    'artifacts': {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                  for p in [single, directory, source_zip]},
}
(release / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(manifest['artifacts'], ensure_ascii=False, indent=2))
