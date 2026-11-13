"""Build six-nutrient TFDA shards from the audited, pinned official ZIP.

python scripts/build-tfda-food-library.py [path/to/tfda.zip]
No network access; source rows are preserved without filling missing values.
"""
import collections
import hashlib
import json
import math
import pathlib
import re
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
archive = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tools/source-audit-2026-11-12/tfda.zip'
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
if digest != '755d2f0e4a7c1fe80ac0636863117e376773c9342cfd68e7b05e67d81e3c6064':
    raise ValueError('TFDA archive differs from the audited snapshot; review before changing the version')
vendor = ROOT / 'scripts/vendor/opencc'
cc = json.loads((vendor / 'source.json').read_text(encoding='utf-8'))
for name, info in cc['files'].items():
    if hashlib.sha256((vendor / name).read_bytes()).hexdigest() != info['sha256']:
        raise ValueError('OpenCC source hash mismatch')
chars = {}
for line in (vendor / 'TSCharacters.txt').read_text(encoding='utf-8').splitlines():
    if line and not line.startswith('#'):
        original, equivalents = line.split('\t')
        chars[original] = equivalents.split(' ')[0]


def simplified(text):
    # Search hint only. Does not change official names or assert food equivalence.
    return ''.join(chars.get(c, c) for c in (text or ''))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


definitions = {
    '熱量': {'key': 'kcal', 'unit': 'kcal'}, '粗蛋白': {'key': 'protein', 'unit': 'g'},
    '粗脂肪': {'key': 'fat', 'unit': 'g'}, '總碳水化合物': {'key': 'carbs', 'unit': 'g'},
    '膳食纖維': {'key': 'fiber', 'unit': 'g'}, '鈉': {'key': 'sodium', 'unit': 'mg'},
}
# Application navigation groups only; the original category remains in evidence.
categories = {'穀物類': '谷物与面食', '澱粉類': '谷物与面食', '堅果及種子類': '坚果与种子',
              '水果類': '水果与果汁', '蔬菜類': '蔬菜', '藻類': '蔬菜', '菇類': '蔬菜',
              '肉類': '肉类', '魚貝類': '鱼虾贝类', '蛋類': '蛋奶', '乳品類': '蛋奶',
              '豆類': '豆类', '油脂類': '油脂', '糖類': '甜食', '飲料類': '饮料',
              '調味料及香辛料類': '香辛料', '糕餅點心類': '烘焙食品', '加工調理食品及其他類': '混合餐食'}
with zipfile.ZipFile(archive) as z:
    rows = json.loads(z.read('20_5.json').decode('utf-8-sig'))
selected = collections.defaultdict(list)
identities = {}
seen = set()
for number, row in enumerate(rows, 1):
    code = row['整合編號']
    if not re.fullmatch(r'[A-Z][0-9]+', code):
        raise ValueError(f'Unexpected food identity: {code}')
    identity = tuple(row[k] for k in ['樣品名稱', '樣品英文名稱', '內容物描述', '食品分類'])
    if identities.setdefault(code, identity) != identity:
        raise ValueError(f'Conflicting food identity: {code}')
    nutrient = row['分析項']
    if nutrient not in definitions:
        continue
    key = (code, nutrient)
    if key in seen or row['含量單位'] != definitions[nutrient]['unit']:
        raise ValueError(f'Duplicate or mismatched unit: {key}')
    seen.add(key)
    value = row['每100克含量']
    if value is not None and str(value).strip():
        n = float(value)
        if not math.isfinite(n) or n < 0:
            raise ValueError(f'Invalid nutrient: {key}')
    selected[code].append({'rowNumber': number, 'data': row})

out = ROOT / 'public/data/tfda'
out.mkdir(parents=True, exist_ok=True)
index = []
shards = collections.defaultdict(dict)
for code, evidence in sorted(selected.items()):
    if len(evidence) != 6:
        raise ValueError(f'Missing nutrient row: {code}')
    source = evidence[0]['data']
    original = source['樣品名稱']
    description = source['內容物描述'] or ''
    state = re.search(r'樣品狀態:([^;]+)', description)
    # Compact name label only; runtime selection/detail must also display the
    # complete sample state from the bound description (tfdaStateSummary).
    label = re.split(r'[,，(（]', state.group(1))[0].strip() if state else ''
    name = original + (f'（{label}）' if label and len(label) <= 12 and label not in original else '')
    energy = next(e['data']['每100克含量'] for e in evidence if e['data']['分析項'] == '熱量')
    index.append({'id': 'tfda-' + code, 'sourceCode': code, 'name': name, 'originalName': original,
                  'category': categories[source['食品分類']], 'sourceCategory': source['食品分類'], 'kcal': float(energy) if energy is not None and energy.strip() else None,
                  'aliases': list(dict.fromkeys(filter(None, [simplified(name), source['俗名'], simplified(source['俗名']), source['樣品英文名稱']]))),
                  'revision': f'tfda-20261112-{code}-r1', 'shard': code[0]})
    shards[code[0]][code] = evidence
for key, values in shards.items():
    write(out / (key + '.json'), values)
write(out / 'index.json', index)
manifest = {
    'sourceId': 'tfda-20261112', 'dataset': '食品營養成分資料集',
    'organization': '衛生福利部食品藥物管理署', 'version': '2026-11-12 下载快照',
    'checked': '2026-11-12', 'sourceUrl': 'https://data.gov.tw/dataset/8543',
    'downloadUrl': 'https://data.fda.gov.tw/data/opendata/export/20/json',
    'sha256': digest, 'sourceFile': '20_5.json', 'sourceRowCount': len(rows),
    'license': '政府資料開放授權條款－第1版', 'licenseUrl': 'https://data.gov.tw/license',
    'attribution': '衛生福利部食品藥物管理署 2026 食品營養成分資料集（2026-11-12 下载快照）。此開放資料依政府資料開放授權條款 (Open Government Data License) 進行公眾釋出，使用者於遵守本條款各項規定之前提下，得利用之。',
    'count': len(index), 'definitions': definitions, 'applicationCategories': categories,
    'missingFields': sum(e['data']['每100克含量'] is None or not str(e['data']['每100克含量']).strip() for es in selected.values() for e in es),
    'indexSha256': hashlib.sha256((out / 'index.json').read_bytes()).hexdigest(),
    'shards': {key: hashlib.sha256((out / (key + '.json')).read_bytes()).hexdigest() for key in shards},
    'searchHints': {**cc, 'method': 'Single-character first-candidate mapping for search hints only; official names unchanged.'},
}
write(out / 'manifest.json', manifest)
license_dir = ROOT / 'public/licenses'
(license_dir / 'opencc-Apache-2.0.txt').write_bytes((vendor / 'LICENSE').read_bytes())
write(ROOT / 'src/tfda-meta.json', {k: manifest[k] for k in ['count', 'missingFields', 'checked']})
print(json.dumps({'foods': len(index), 'missing': manifest['missingFields'], 'shards': len(shards)}))
