export default async function handler(req, res) {
  // Libera CORS para seu GitHub Pages
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const linha = (req.query.linha || '665').toString();

  // Tenta PoaTransporte (principal) + DataPoa fallback
  const fontes = [
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=o',
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=t'
  ];

  for (let url of fontes) {
    try {
      const r = await fetch(url, { 
        headers: { 'User-Agent': 'bus665-app/1.0' },
        signal: AbortSignal.timeout(8000)
      });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { continue; }

      // Normaliza formato - PoaTransporte retorna array ou objeto
      let lista = Array.isArray(data) ? data : (data.linhas || data.veiculos || []);
      
      // Filtra só a linha desejada - testa vários campos possíveis
      let filtrado = lista.filter(o => {
        const s = JSON.stringify(o).toUpperCase();
        return s.includes(linha);
      });

      // Se não achou filtrando, tenta pegar campo codigoLinha
      if (filtrado.length === 0 && linha === '665') {
        filtrado = lista.filter(o => {
          return (o.codigoLinha === '665' || o.codigo === '665' || o.linha === '665' || o.idLinha === 665 || String(o.numero||'').includes('665'));
        });
      }

      if (filtrado.length > 0 || lista.length > 0) {
        // Retorna no formato padrão que seu frontend já entende
        const normalizado = filtrado.map(v => ({
          id: v.id || v.prefixo || v.codigo || Math.random().toString(36).slice(2),
          linha: v.codigoLinha || v.linha || v.codigo || linha,
          lat: parseFloat(v.latitude || v.lat || v.lt || 0),
          lng: parseFloat(v.longitude || v.lng || v.ln || 0),
          velocidade: v.velocidade || v.speed || 0,
          raw: v
        })).filter(v => v.lat !== 0 && v.lng !== 0);

        return res.status(200).json({
          ok: true,
          linha,
          total: normalizado.length,
          totalGeral: lista.length,
          timestamp: new Date().toISOString(),
          fonte: url,
          veiculos: normalizado
        });
      }
    } catch (e) {
      console.error('Erro fonte', url, e.message);
      continue;
    }
  }

  // Se chegou aqui, API fora do ar
  return res.status(200).json({
    ok: false,
    linha,
    total: 0,
    erro: 'API EPTC fora do ar ou sem veículos no momento',
    timestamp: new Date().toISOString(),
    veiculos: []
  });
}
