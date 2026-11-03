import fs from 'node:fs';
import crypto from 'node:crypto';
const manifest=JSON.parse(fs.readFileSync('src/motion.json','utf8'));
for(const [exerciseId,asset] of Object.entries(manifest)){
  for(const [file,hash] of Object.entries(asset.files)){
    const data=fs.readFileSync(`public/motion/${asset.mediaVersion}/${file}`);
    if(crypto.createHash('sha256').update(data).digest('hex')!==hash)throw Error(`Asset checksum mismatch: ${exerciseId}/${file}`);
  }
  if(new Set(Object.entries(asset.files).filter(([n])=>n.includes('-key-')).map(([,h])=>h)).size<2)throw Error(`No distinct poses: ${exerciseId}`);
}
console.log(`${Object.keys(manifest).length} media mappings, all distributed source files and distinct key poses verified`);
