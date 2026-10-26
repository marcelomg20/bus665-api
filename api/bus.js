export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const linhaQuery = (req.query.linha || '665').toString().trim();
  const debug = req.query.debug === '1';

  const urls = [
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=o',
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=t',
    'https://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=o'
  ];

  for (let url of urls) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'bus665-app/2.0' }, signal: AbortSignal.timeout(10000) });
      const txt = await r.text();
      let data;
      try { data = JSON.parse(txt); } catch { continue; }

      let lista = [];
      if (Array.isArray(data)) lista = data;
      else if (data.veiculos) lista = data.veiculos;
      else if (data.linhas) lista = data.linhas;
      else if (typeof data === 'object') {
        // PoaTransporte às vezes retorna objeto { "1": {...}, "2": {...} }
        lista = Object.values(data);
      }

      if (lista.length === 0) continue;

      // FILTRO MELHORADO PARA 665
      const alvo = linhaQuery.replace(/\D/g,''); // só números
      let filtrado = lista.filter(o => {
        if (!o) return false;
        const campos = [
          o.codigoLinha, o.codigo, o.linha, o.idLinha, o.numero, o.nome, o.itinerario, o.linhaNome, o.prefixo
        ].map(v => String(v||'').toUpperCase());
        const jsonStr = JSON.stringify(o).toUpperCase();
        // testa: contém 665 exato, ou termina com 665, ou igual
        return campos.some(c => c.includes(alvo) || c.includes('665')) || jsonStr.includes(alvo);
      });

      // Se ainda zero e é segunda, retorna amostra para debug + tenta filtro frouxo 66*
      let amostra = [];
      if (filtrado.length === 0) {
        // pega 5 exemplos da lista para ver formato
        amostra = lista.slice(0,5).map(o => ({
          codigoLinha: o.codigoLinha,
          codigo: o.codigo,
          linha: o.linha,
          idLinha: o.idLinha,
          nome: (o.nome||'').slice(0,80)
        }));
        // filtro frouxo: qualquer linha que contenha 66
        if (linhaQuery === '665') {
          filtrado = lista.filter(o => JSON.stringify(o).includes('66')).slice(0,10);
        }
      }

      const normalizado = filtrado.map(v => ({
        id: String(v.id || v.prefixo || v.codigo || Math.random().toString(36).slice(2,8)),
        linha: String(v.codigoLinha || v.linha || v.codigo || linhaQuery),
        lat: parseFloat(v.latitude || v.lat || v.lt || v.y || 0),
        lng: parseFloat(v.longitude || v.lng || v.ln || v.x || 0),
        raw: debug ? v : undefined
      })).filter(v => v.lat !== 0 && v.lng !== 0);

      return res.status(200).json({
        ok: true,
        linha: linhaQuery,
        total: normalizado.length,
        totalGeral: lista.length,
        timestamp: new Date().toISOString(),
        fonte: url,
        amostraFormato: amostra, // para você ver como vem o dado
        veiculos: normalizado
      });

    } catch (e) {
      console.error('Erro', e.message);
      continue;
    }
  }

  return res.status(200).json({ ok:false, linha:linhaQuery, total:0, erro:'API fora', veiculos:[] });
}
