# bus665-api-proxy - Micro-proxy Vercel

## Deploy em 2 minutos:
1. Crie repo novo no GitHub: bus665-api
2. Envie esses 3 arquivos
3. Vai em vercel.com > Add New Project > Import bus665-api > Deploy
4. Copie a URL: https://bus665-api-seuuser.vercel.app

## Uso:
- Todos os ônibus: https://sua-url.vercel.app/api/bus
- Só linha 665: https://sua-url.vercel.app/api/bus?linha=665
- Atalho: https://sua-url.vercel.app/bus/665

## Ligar no seu app GitHub Pages:
No seu bus665 (marcelomg20.github.io/bus665), edite SRC/JAVASCRIPT/script.js

Troque:
const urls = ['https://api.allorigins.win/...']

Por:
const PROXY = 'https://bus665-api-seuuser.vercel.app/api/bus?linha=665';
const res = await fetch(PROXY);
const json = await res.json();
return json.veiculos; // [{id, lat, lng}]

Pronto! Sem CORS, sem bloqueio.
