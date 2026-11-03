"""Rebuild the small verified catalog from the official, hash-pinned USDA archive.
python scripts/build-food-catalog.py --archive ../data-source/usda-sr-legacy-2018.zip
"""
import argparse,csv,io,json,zipfile,hashlib,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--archive',default='../data-source/usda-sr-legacy-2018.zip');args=parser.parse_args()
archive=pathlib.Path(args.archive)
sha=hashlib.sha256(archive.read_bytes()).hexdigest()
assert sha=='b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0','Unexpected archive; review before updating'
z=zipfile.ZipFile(archive)
def rows(name):return csv.DictReader(io.TextIOWrapper(z.open(next(n for n in z.namelist() if n.endswith('/'+name))),encoding='utf-8'))
existing=json.loads((root/'src/foods.json').read_text(encoding='utf-8'))
selection=json.loads((root/'scripts/food-selection.json').read_text(encoding='utf-8'))
assert len({f['id'] for f in selection})==len(selection),'Duplicate app ID'
assert len({f['fdcId'] for f in selection})==len(selection),'Duplicate source ID'
meta={f['fdcId']:f for f in selection}
assert {f['fdcId'] for f in existing}<=meta.keys(),'Existing source entry removed'
keys={'1008':'kcal','1003':'protein','1004':'fat','1005':'carbs','1079':'fiber','1093':'sodium'}
units={r['id']:r for r in rows('nutrient.csv') if r['id'] in keys}
derivations={r['id']:r for r in rows('food_nutrient_derivation.csv')}
rawfoods={r['fdc_id']:r for r in rows('food.csv') if r['fdc_id'] in meta}
rawvalues=[r for r in rows('food_nutrient.csv') if r['fdc_id'] in meta and r['nutrient_id'] in keys]
result=[]
for fdc,m in meta.items():
 raw=rawfoods[fdc];assert raw['description']==m['originalName'],f'Food identity mismatch: {fdc}'
 record=dict(**{k:m[k] for k in ['id','name','group','state']},fdcId=fdc,originalName=raw['description'],publicationDate=raw['publication_date'],source='USDA FoodData Central · SR Legacy',version='2018-04',revision=f'sr2018-{fdc}-r1',dataType='历史编纂资料',region='美国数据；不代表中国同名食物',brand=None,basis='每 100 克可食部分',basisUnit='g',sourceUrl=f'https://fdc.nal.usda.gov/food-details/{fdc}/nutrients',sourceId='usda-sr-2018',license='CC0 1.0',verifiedAt='2026-11-03',verification='数值已逐项与固定原始 CSV 核对；中文名称为人工映射',nutrients={},fields={})
 for nutrient,k in keys.items():
  matches=[r for r in rawvalues if r['fdc_id']==fdc and r['nutrient_id']==nutrient];assert len(matches)<=1
  r=matches[0] if matches else None;v=float(r['amount']) if r and r['amount'] else None
  d=derivations.get(r['derivation_id'],{}) if r else {}
  status='missing' if v is None else 'estimated' if any(w in d.get('description','').lower() for w in ['calculat','estimat','imput','assum']) else 'reported-zero' if v==0 else 'reported'
  record['nutrients'][k]=v
  record['fields'][k]=dict(value=v,unit=units[nutrient]['unit_name'],status=status,sourceId='usda-sr-2018',sourceRowId=r['id'] if r else None,nutrientId=nutrient,derivation=d.get('description','未提供'),derivationCode=d.get('code'),dataPoints=r['data_points'] if r else None)
  old=next((f for f in existing if f['fdcId']==fdc),None)
  if old:assert old['nutrients'][k]==v,f'Existing value mismatch: {fdc}/{k}'
 record['aliases']=list(dict.fromkeys([record['name'],*m.get('aliases',[])]))
 result.append(record)
source=dict(id='usda-sr-2018',publisher='USDA Agricultural Research Service',dataset='SR Legacy 2018-04',url='https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',sha256=sha,license='CC0 1.0',downloaded='2026-11-02',checked='2026-11-03',note='历史编纂数据；非中国食品库。未录入无标签依据的品牌食品。未将数值为零解释成标签标零或低于定量限。',foodRows=list(rawfoods.values()),nutrientRows=rawvalues,nutrientDefinitions=list(units.values()),derivations={r['derivation_id']:derivations.get(r['derivation_id']) for r in rawvalues})
(root/'public/data').mkdir(exist_ok=True)
(root/'public/data/food-evidence.json').write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'src/foods.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'{len(result)} foods / {len(rawvalues)} nutrient rows verified. Existing values unchanged. Archive SHA256 {sha}')
