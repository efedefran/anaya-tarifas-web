const API='https://script.google.com/macros/s/AKfycbzPu-OYEh9jtdiRxfmD1AK07BUP8FBPNwfxd75HHctkHDRvKPjfgv0CHsx9JnzDSKM/exec';
const names={ferreteria:'Ferretería',milar:'Milar',fontaneria:'Fontanería'};
let area='',token='',data=null;
const $=s=>document.querySelector(s);

function jsonp(params){
  return new Promise((resolve,reject)=>{
    const cb='anayaCb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('Tiempo de espera agotado')),15000);
    function finish(err,val){
      clearTimeout(timer);
      delete window[cb];
      script.remove();
      err?reject(err):resolve(val);
    }
    window[cb]=v=>finish(null,v);
    script.onerror=()=>finish(new Error('No se pudo conectar'));
    script.src=API+'?'+new URLSearchParams({...params,api:'1',callback:cb});
    document.body.appendChild(script);
  });
}

function showAccess(a){
  area=a;
  token='';
  data=null;
  $('#home').classList.add('hidden');
  $('#access').classList.remove('hidden');
  $('#catalog').classList.add('hidden');
  $('#login').classList.remove('hidden');
  $('#areaTitle').textContent=names[a];
  $('#loginText').textContent='Introduce la contraseña correspondiente a '+names[a]+'.';
  $('#password').value='';
  $('#status').textContent='';
  history.replaceState(null,'','?area='+a);
}

function showHome(){
  $('#access').classList.add('hidden');
  $('#home').classList.remove('hidden');
  history.replaceState(null,'',location.pathname);
}

document.querySelectorAll('[data-area]').forEach(b=>b.onclick=()=>showAccess(b.dataset.area));
$('#back').onclick=showHome;
$('#toggle').onclick=()=>{$('#password').type=$('#password').type==='password'?'text':'password'};

$('#login').onsubmit=async e=>{
  e.preventDefault();
  $('#status').textContent='Comprobando…';
  try{
    const r=await jsonp({accion:'validar',area,contrasena:$('#password').value});
    if(!r.ok) throw new Error(r.mensaje||'Acceso denegado');
    token=r.token;
    await loadCatalog();
  }catch(err){
    $('#status').textContent=err.message;
  }
};

async function loadCatalog(){
  const r=await jsonp({accion:'listar',area,token});
  if(!r.ok) throw new Error(r.mensaje||'No se pudieron cargar las tarifas');
  data=r;
  $('#login').classList.add('hidden');
  $('#catalog').classList.remove('hidden');
  $('#updated').textContent='Actualizado: '+r.actualizado;
  render('');
}

function renderInfoTarifa(f){
  const fechaTarifa=f.fechaTarifa||'';
  const condiciones=f.condiciones||'';
  const descuento=f.descuento||'';
  const vigencia=f.vigencia||'';
  const observaciones=f.observaciones||'';

  const filas=[
    ['Fecha de la tarifa',fechaTarifa],
    ['Condiciones',condiciones],
    ['Descuento',descuento],
    ['Vigencia',vigencia],
    ['Observaciones',observaciones]
  ].filter(([,valor])=>String(valor||'').trim());

  const contenido=filas.length
    ? filas.map(([etiqueta,valor])=>`<div class="info-row"><span>${esc(etiqueta)}</span><strong>${esc(valor)}</strong></div>`).join('')
    : `<div class="info-empty">Sin información comercial adicional. Última actualización del archivo: <strong>${esc(f.fecha||'')}</strong></div>`;

  return `
    <details class="tariff-info">
      <summary>ⓘ Información de la tarifa</summary>
      <div class="tariff-info-body">
        ${contenido}
      </div>
    </details>`;
}

function render(q){
  const term=q.trim().toLowerCase();
  const out=[];
  (data.categorias||[]).forEach(c=>{
    const files=(c.archivos||[]).filter(f=>!term||(f.nombre+' '+c.ruta).toLowerCase().includes(term));
    if(!files.length) return;

    out.push(`
      <section class="category">
        <h3>${esc(c.ruta||c.nombre)}</h3>
        <div class="files">
          ${files.map(f=>`
            <article class="tariff-card">
              <div class="tariff-main">
                <span>
                  <strong>${esc(f.nombre)}</strong><br>
                  <small>${esc(f.tipo)} · Actualizado: ${esc(f.fecha)}</small>
                </span>
                <a class="file-action" href="${escAttr(f.url)}" target="_blank" rel="noopener">Abrir tarifa ↗</a>
              </div>
              ${renderInfoTarifa(f)}
            </article>
          `).join('')}
        </div>
      </section>`
    );
  });
  $('#results').innerHTML=out.join('')||'<p>No se encontraron resultados.</p>';
}

$('#search').oninput=e=>render(e.target.value);
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function escAttr(v){return esc(v)}
const initial=new URLSearchParams(location.search).get('area');
if(names[initial]) showAccess(initial);
