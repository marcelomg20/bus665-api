export default async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  if(req.method==='OPTIONS') return res.status(200).end();
  const linhaQuery=(req.query.linha||'665').toString();
  const urls=[
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=o',
    'http://www.poatransporte.com.br/php/facades/process.php?a=nc&p=%&t=t'
  ];
  for(let url of urls){
    try{
      const r=await fetch(url,{headers:{'User-Agent':'bus665-v3'},signal:AbortSignal.timeout(10000)});
      const txt=await r.text();
      let data;
      try{ data=JSON.parse(txt);}catch(e){ continue; }

      // TENTA ENTENDER FORMATO REAL
      let tipo = Array.isArray(data) ? 'array' : typeof data;
      let keys = tipo==='object' ? Object.keys(data).slice(0,10) : [];
      let firstKey = keys[0];
      let firstVal = firstKey ? data[firstKey] : null;
      let firstValType = Array.isArray(firstVal) ? 'array len '+firstVal.length : typeof firstVal;
      let sampleRaw = null;
      try{
        if(Array.isArray(data)) sampleRaw = data.slice(0,2);
        else if(firstVal) sampleRaw = Array.isArray(firstVal) ? firstVal.slice(0,2) : firstVal;
      }catch{}

      // FLATTEN: Se data é objeto { "codigoLinha": [veiculos] } ou { "codigo": {veiculos: []} }
      let todosVeiculos=[];
      if(Array.isArray(data)){
        todosVeiculos=data;
      } else if(typeof data==='object'){
        for(let k in data){
          let v=data[k];
          if(Array.isArray(v)){
            // v é array de ônibus
            v.forEach(bus=>{ bus._linhaKey=k; todosVeiculos.push(bus); });
          } else if(v && typeof v==='object'){
            if(Array.isArray(v.veiculos)) v.veiculos.forEach(b=>{b._linhaKey=k; todosVeiculos.push(b);});
            else if(Array.isArray(v.carros)) v.carros.forEach(b=>{b._linhaKey=k; todosVeiculos.push(b);});
            else {
              // v é um ônibus único
              v._linhaKey=k;
              todosVeiculos.push(v);
            }
          }
        }
      }

      // Filtro 665 - agora busca na chave também
      let alvo = linhaQuery.replace(/\D/g,'');
      let filtrado = todosVeiculos.filter(o=>{
        let k = String(o._linhaKey||'').toUpperCase();
        let campos = [o.codigoLinha,o.codigo,o.linha,o.idLinha,o.numero,o.linhaNome,o.nome].map(x=>String(x||'').toUpperCase());
        let s = (k + ' ' + campos.join(' ') + ' ' + JSON.stringify(o)).toUpperCase();
        return s.includes(alvo);
      });

      const normalizado = filtrado.map(v=>({
        id: String(v.id||v.prefixo||v.codigo||Math.random().toString(36).slice(2,6)),
        linha: String(v._linhaKey||v.codigoLinha||v.linha||linhaQuery),
        lat: parseFloat(v.latitude||v.lat||v.lt||0),
        lng: parseFloat(v.longitude||v.lng||0),
        raw: v
      })).filter(v=>v.lat!==0);

      return res.status(200).json({
        ok:true,
        debug:{ tipo, totalKeys: Object.keys(data).length, sampleKeys: keys, firstKey, firstValType, sampleRaw },
        linha: linhaQuery,
        total: normalizado.length,
        totalGeral: todosVeiculos.length,
        timestamp: new Date().toISOString(),
        fonte: url,
        veiculos: normalizado.slice(0,50) // limita 50
      });

    }catch(e){
      continue;
    }
  }
  return res.status(200).json({ok:false, erro:'falha', veiculos:[]});
}
