export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  if(req.method==='OPTIONS') return res.status(200).end();
  const linhaQuery=(req.query.linha||'665').toString();

  // ENDPOINTS CORRETOS PARA POSIÇÃO EM TEMPO REAL
  const urls=[
    'http://www.poatransporte.com.br/php/facades/process.php?a=vp&p=%',
    'https://www.poatransporte.com.br/php/facades/process.php?a=vp&p=%',
    'http://www.poatransporte.com.br/php/facades/process.php?a=vp&p=665',
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=o',
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=665&t=o'
  ];

  for(let url of urls){
    try{
      const r=await fetch(url,{headers:{'User-Agent':'bus665-v4'},signal:AbortSignal.timeout(12000)});
      const txt=await r.text();
      let data;
      try{ data=JSON.parse(txt); }catch(e){ 
        // tenta ver se é texto vazio
        continue; 
      }

      let lista=[];
      if(Array.isArray(data)) lista=data;
      else if(data.veiculos) lista=data.veiculos;
      else if(typeof data==='object') {
        // pode ser objeto { "codigo": [veiculos] } ou array dentro
        let vals=Object.values(data);
        // se vals[0] é array, flatten
        if(vals.length>0 && Array.isArray(vals[0])){
          vals.forEach(arr=>{ if(Array.isArray(arr)) lista.push(...arr); });
        } else {
          // se data é objeto de linha com veiculos dentro
          for(let k in data){
            let v=data[k];
            if(Array.isArray(v)) lista.push(...v.map(b=>({...b,_linhaKey:k})));
            else if(v && v.latitude) { v._linhaKey=k; lista.push(v); }
          }
          if(lista.length===0) lista=Object.values(data);
        }
      }

      if(lista.length===0) continue;

      // Tenta identificar campos de posição
      const sample = lista.slice(0,3).map(o=>({
        id:o.id||o.prefixo,
        codigo:o.codigo||o.codigoLinha||o.linha||o._linhaKey,
        lat:o.latitude||o.lat||o.lt,
        lng:o.longitude||o.lng||o.ln,
        allKeys: Object.keys(o).slice(0,15)
      }));

      // Filtro 665 - agora muito mais tolerante
      const alvo = linhaQuery.replace(/\D/g,'');
      let filtrado = lista.filter(o=>{
        const str = JSON.stringify(o).toUpperCase();
        const key = String(o._linhaKey||'').toUpperCase();
        // procura 665 em qualquer lugar, ou codigo que contenha
        return str.includes('665') || key.includes('665') || str.includes('PLANALTO');
      });

      // Se não achou 665, mas tem posição, mostra tudo para debug
      const normalizadoAll = lista.map(v=>({
        id: String(v.id||v.prefixo||Math.random().toString(36).slice(2,6)),
        linha: String(v.codigoLinha||v.codigo||v.linha||v._linhaKey||''),
        lat: parseFloat(v.latitude||v.lat||v.lt||v.y||0),
        lng: parseFloat(v.longitude||v.lng||v.ln||v.x||0),
        nome: v.nome||'',
        raw: v
      })).filter(v=>v.lat!==0);

      const normalizado665 = filtrado.map(v=>({
        id: String(v.id||v.prefixo||Math.random().toString(36).slice(2,6)),
        linha: String(v.codigoLinha||v.codigo||v.linha||v._linhaKey||linhaQuery),
        lat: parseFloat(v.latitude||v.lat||v.lt||0),
        lng: parseFloat(v.longitude||v.lng||0),
        raw: v
      })).filter(v=>v.lat!==0);

      // Se tem ônibus com posição, retorna
      if(normalizadoAll.length>0){
        return res.status(200).json({
          ok:true,
          linha: linhaQuery,
          total: normalizado665.length,
          totalGeral: normalizadoAll.length,
          timestamp: new Date().toISOString(),
          fonte: url,
          debugSample: sample,
          // se não tem 665, retorna 5 aleatórios para você ver que tem posição
          veiculos: normalizado665.length>0 ? normalizado665 : normalizadoAll.slice(0,5),
          todosTemPosicao: normalizadoAll.length>0
        });
      }

    }catch(e){
      console.error('erro url',url,e.message);
      continue;
    }
  }

  return res.status(200).json({ok:false, erro:'nenhum endpoint retornou posição', total:0, veiculos:[]});
}
