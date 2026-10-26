// COLE ISSO NO SEU SRC/JAVASCRIPT/script.js - substitui tentarApiReal()
const PROXY_URL = 'https://bus665-api.vercel.app/api/bus?linha=665'; // TROQUE PELA SUA URL DO VERCEL

async function tentarApiReal(){
  const pill=document.getElementById('status-text');
  pill.textContent='BUSCANDO API REAL...';
  try{
    const r=await fetch(PROXY_URL);
    const json=await r.json();
    console.log('Resposta proxy', json);
    if(json.ok && json.veiculos.length>0){
      modo='REAL';
      pill.textContent=`AO VIVO REAL • ${json.veiculos.length} ônibus`;
      document.getElementById('status-pill').style.background='#052e16';
      // Atualiza marcadores com posição real
      json.veiculos.forEach((v,i)=>{
        if(markers['B'+(i+1)]) markers['B'+(i+1)].setLatLng([v.lat,v.lng]);
      });
      return;
    } else {
      pill.textContent=json.erro || 'SEM ÔNIBUS AGORA';
    }
  }catch(e){
    console.error(e);
    pill.textContent='ERRO PROXY';
  }
  setTimeout(()=>{document.getElementById('status-text').textContent='SIMULAÇÃO';},2000);
}
