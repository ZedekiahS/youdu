"""Build a searchable SR Legacy library; retain the original CSV rows in lazy shards."""
import csv,hashlib,io,json,pathlib,zipfile,collections
root=pathlib.Path(__file__).resolve().parents[1]
archive=root.parent/'data-source/usda-sr-legacy-2018.zip'
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
assert digest=='b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0'
z=zipfile.ZipFile(archive)
def rows(name):return csv.DictReader(io.TextIOWrapper(z.open(next(n for n in z.namelist() if n.endswith('/'+name))),encoding='utf-8'))
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
foods=list(rows('food.csv'));assert len({f['fdc_id'] for f in foods})==len(foods)
keys={'1008':'kcal','1003':'protein','1004':'fat','1005':'carbs','1079':'fiber','1093':'sodium'}
definitions={r['id']:r for r in rows('nutrient.csv') if r['id'] in keys}
derivations={r['id']:r for r in rows('food_nutrient_derivation.csv')}
names=['蛋奶','香辛料','婴幼儿食品','油脂','禽肉','汤与酱汁','加工肉','早餐谷物','水果与果汁','猪肉','蔬菜','坚果与种子','牛肉','饮料','鱼虾贝类','豆类','羊肉与其他肉类','烘焙食品','甜食','谷物与面食','快餐','混合餐食','零食','美国原住民食物','餐馆食品','品牌数据库','质控材料','酒精饮料']
groups={r['id']:{**r,'name':names[int(r['id'])-1]} for r in rows('food_category.csv')}
values=collections.defaultdict(dict)
for r in rows('food_nutrient.csv'):
 if r['nutrient_id'] not in keys:continue
 assert r['nutrient_id'] not in values[r['fdc_id']]
 if r['amount']:assert float(r['amount'])>=0
 values[r['fdc_id']][r['nutrient_id']]=r
curated=json.loads((root/'src/foods.json').read_text(encoding='utf-8'))
for f in curated:
 assert next(r for r in foods if r['fdc_id']==f['fdcId'])['description']==f['originalName']
 for n,k in keys.items():assert float(values[f['fdcId']][n]['amount'])==f['nutrients'][k]
out=root/'public/data/sr-legacy';out.mkdir(exist_ok=True)
index=[];shards=collections.defaultdict(dict)
for f in foods:
 fdc=f['fdc_id'];n=values[fdc];energy=n.get('1008',{}).get('amount')
 index.append([fdc,f['description'],f['food_category_id'],float(energy) if energy else None,f['publication_date']])
 shards[str(int(fdc)//1000)][fdc]=list(n.values())
for shard,data in shards.items():write(out/(shard+'.json'),data)
manifest={'dataset':'USDA FoodData Central SR Legacy 2018-04','sourceId':'usda-sr-2018','sourceUrl':'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip','sha256':digest,'license':'CC0 1.0','checked':'2026-11-04','count':len(index),'curatedCount':len(curated),'fieldCount':sum(len(v) for v in values.values()),'missingFields':len(index)*6-sum(len(v) for v in values.values()),'keys':keys,'definitions':definitions,'derivations':derivations,'groups':groups,'indexColumns':['fdcId','originalName','categoryId','kcal','publicationDate'],'shards':{key:hashlib.sha256((out/(key+'.json')).read_bytes()).hexdigest() for key in shards}}
write(out/'index.json',index);manifest['indexSha256']=hashlib.sha256((out/'index.json').read_bytes()).hexdigest();write(out/'manifest.json',manifest)
write(root/'src/catalog-meta.json',{k:manifest[k] for k in ['count','curatedCount','fieldCount','missingFields','checked']})
print(json.dumps({'foods':len(index),'fields':manifest['fieldCount'],'missing':manifest['missingFields'],'shards':len(shards),'bytes':sum(p.stat().st_size for p in out.glob('*.json'))}))
