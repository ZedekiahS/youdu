"""Download the pinned, MIT-licensed source. Never fetch main at runtime."""
import urllib.request, pathlib, json, hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
DEST=ROOT/'tools/desk-break'
COMMIT='8d475aa476b2c0e9ec6d09d8558faf17161e19ef'
FILES=['README.md','LICENSE','library/exercises.json','library/exercises.glb']
DEST.mkdir(parents=True,exist_ok=True)
for name in FILES:
    path=DEST/pathlib.Path(name).name
    if not path.exists():
        with urllib.request.urlopen('https://raw.githubusercontent.com/shlomorsh/desk-break/'+COMMIT+'/'+name,timeout=120) as response:
            path.write_bytes(response.read())
    print(name,path.stat().st_size,hashlib.sha256(path.read_bytes()).hexdigest(),flush=True)
(DEST/'source.json').write_text(json.dumps({'repository':'https://github.com/shlomorsh/desk-break','commit':COMMIT,'files':{f:hashlib.sha256((DEST/pathlib.Path(f).name).read_bytes()).hexdigest() for f in FILES}},indent=2))
