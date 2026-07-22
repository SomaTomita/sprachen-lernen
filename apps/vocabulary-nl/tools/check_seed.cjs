const a = JSON.parse(require('node:fs').readFileSync(__dirname + '/a1_seed.json', 'utf8'));
console.log('count', a.length, 'unique', new Set(a.map(x => x.id)).size);
console.log('nouns_without_article', a.filter(x => x.pos === 'noun' && !x.article).length);
