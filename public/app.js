/* Villa Azul · Turismo & Excursiones — app (fase 1)
   Todo se guarda primero en el teléfono (IndexedDB) y se envía al servidor cuando hay señal. */
(function () {
'use strict';
var VERSION = '5.3.0';

/* ════════════ Iconos ════════════ */
var I = {
  sol:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  luna:'<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>', auto:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  mas:'<path d="M12 5v14M5 12h14"/>', dia:'<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  caja:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M8 3h8l2 4H6Z"/>', cuentas:'<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  panel:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', movs:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  van:'<path d="M3 16V8a2 2 0 0 1 2-2h10l5 5v5"/><path d="M3 16h18"/><circle cx="7.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/><path d="M15 6v5h5"/>',
  arriba:'<path d="M12 19V5M5 12l7-7 7 7"/>', abajo:'<path d="M12 5v14M19 12l-7 7-7-7"/>',
  borrar:'<path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m17 9-6 6M11 9l6 6"/>', aviso:'<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17.5v.01"/>',
  llave:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>', salir:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16l-4-4 4-4M6 12h11"/>',
  lapiz:'<path d="M4 20h4L19 9l-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>', escudo:'<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6Z"/>',
  pausa:'<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>', play:'<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5 3.5-5 3.5Z"/>',
  basura:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', ruta:'<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  tarifa:'<path d="M20 12 12 20l-8-8V4h8Z"/><circle cx="8" cy="8" r="1.5"/>', check:'<path d="m5 12 5 5 9-10"/>',
  nube:'<path d="M7 18a5 5 0 1 1 1.2-9.9A6 6 0 0 1 19 11a3.5 3.5 0 0 1-.5 7Z"/>', subir:'<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>',
  campana:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  bajar:'<path d="M12 4v12M6 10l6 6 6-6"/><path d="M4 20h16"/>',
  qr:'<path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4Z"/><path d="M14 14h2v2h-2ZM18 14h2M14 18v2h2M18 18h2v2h-2"/>',
  sync:'<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  chk:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 12.5l2 2 4-4.5"/>'
};
var CLIP = '<svg viewBox="0 0 24 24" style="width:12px;height:12px;vertical-align:-1px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round" aria-label="Con comprobante"><path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.3 3.3 0 0 1 4.7 4.7L10.2 17a1.7 1.7 0 0 1-2.4-2.4L15.5 7"/></svg>';
function ico(n){ return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+I[n]+'</svg>'; }
var LOGO = '<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="11" fill="#1E4FD1"/><path d="M7 26c4-7 7-10 10-10 4 0 4 6 8 6 2.6 0 4.6-2 8-6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M7 31h26" stroke="#9DB7FF" stroke-width="2.2" stroke-linecap="round"/></svg>';
var TOPO = '<svg class="topo" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#9DB7FF" stroke-width="1">'+
  [0,1,2,3,4,5,6,7].map(function(i){ var y=40+i*26; return '<path d="M-10 '+(y+30)+' C 60 '+(y-10)+', 110 '+(y+40)+', 180 '+(y+6)+' S 300 '+(y-28)+', 410 '+(y+18)+'"/>'; }).join('')+'</g></svg>';

/* ════════════ Utilidades ════════════ */
var app = document.getElementById('app'), hoja = document.getElementById('hoja');
function $(id){ var h = document.getElementById('hoja'); if(h && h.open){ var x = h.querySelector('[id="'+id+'"]'); if(x) return x; } return document.getElementById(id); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function soles(n){ return 'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function soles0(n){ return 'S/ '+Math.round(Number(n||0)).toLocaleString('es-PE'); }
function iniciales(n){ var p=String(n||'?').trim().split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:(p[0][1]||''))).toUpperCase(); }
var ROL_TXT = { operador:'Operador', admin:'Admin', super:'Superadmin' };
function claseAv(u){ return u.rol==='operador'?'op':u.rol==='super'?'su':''; }
function esMando(u){ return !!u && (u.rol==='admin'||u.rol==='super'); }
function uuid(){ return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16);}); }
/* Hora de Lima en texto, como la guarda el servidor: 'AAAA-MM-DD HH:MM:SS' */
function ahoraLima(d){ return new Date((d||new Date()).getTime()-5*3600000).toISOString().replace('T',' ').slice(0,19); }
function hoyLima(){ return ahoraLima().slice(0,10); }
function horaDe(f){ var m=String(f||'').match(/(\d{2}):(\d{2})/); if(!m) return ''; var h=+m[1]; return (h%12||12)+':'+m[2]+' '+(h<12?'a. m.':'p. m.'); }
function fechaCorta(f){ var m=String(f||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return ''; return new Date(+m[1],m[2]-1,+m[3]).toLocaleDateString('es-PE',{day:'numeric',month:'short'}); }
var MESES = ['ene','feb','mar','abr','may','jun','jul','ago','set','oct','nov','dic'];
function nombreMes(ym){ var p=ym.split('-'); return MESES[+p[1]-1]+' '+p[0]; }
function haceCuanto(f){ if(!f) return ''; var t=Date.parse(String(f).replace(' ','T')+'-05:00'); var m=Math.round((Date.now()-t)/60000); if(m<1) return 'hace un momento'; if(m<60) return 'hace '+m+' min'; var h=Math.round(m/60); if(h<24) return 'hace '+h+' h'; return 'hace '+Math.round(h/24)+' d'; }
function toast(t, mal){ var e=document.createElement('div'); e.className='toast'+(mal?' mal':''); e.innerHTML=(mal?ico('aviso'):ico('check'))+'<span>'+esc(t)+'</span>'; $('toasts').appendChild(e); setTimeout(function(){ e.remove(); },3400); }
function transicion(fn){ if(document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(fn); else fn(); }
function contar(el){
  var fin=Number(el.dataset.v), pref=el.dataset.p||'', suf=el.dataset.s||'', dec=el.dataset.d==='0'?0:2;
  var fmt=function(v){ return pref+v.toLocaleString('es-PE',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf; };
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ el.textContent=fmt(fin); return; }
  var t0=performance.now(); (function paso(t){ var k=Math.min(1,(t-t0)/650), e=1-Math.pow(1-k,3); el.textContent=fmt(fin*e); if(k<1) requestAnimationFrame(paso); })(t0);
}
function ls(k, v){ try{ if(v===undefined){ var r=localStorage.getItem(k); return r?JSON.parse(r):null; } if(v===null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); }catch(e){ return null; } }

/* PIN sin señal: el mismo PBKDF2 que el servidor, con el verificador que se guardó al entrar con señal. */
function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf),function(b){return ('0'+b.toString(16)).slice(-2);}).join(''); }
function deHex(h){ var a=new Uint8Array(h.length/2); for(var i=0;i<a.length;i++) a[i]=parseInt(h.substr(i*2,2),16); return a; }
function derivar(pin, salt, iter){
  return crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
    .then(function(k){ return crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:deHex(salt),iterations:iter}, k, 256); }).then(hex);
}

/* ════════════ Base local (IndexedDB) ════════════ */
var db = null;
function abrirDB(){
  return new Promise(function(ok, mal){
    var r = indexedDB.open('villa-azul', 1);
    r.onupgradeneeded = function(){
      var d = r.result;
      d.createObjectStore('kv');
      d.createObjectStore('movs', {keyPath:'uuid'});
      d.createObjectStore('outbox', {keyPath:'op_id'});
    };
    r.onsuccess = function(){ db = r.result; ok(); };
    r.onerror = function(){ mal(r.error); };
  });
}
function tx(store, modo, fn){
  return new Promise(function(ok, mal){
    var t = db.transaction(store, modo), s = t.objectStore(store), res;
    res = fn(s);
    t.oncomplete = function(){ ok(res && res.result !== undefined ? res.result : res); };
    t.onerror = function(){ mal(t.error); };
  });
}
function todos(store){ return new Promise(function(ok){ var r = db.transaction(store).objectStore(store).getAll(); r.onsuccess=function(){ ok(r.result||[]); }; r.onerror=function(){ ok([]); }; }); }
function kvGet(k){ return new Promise(function(ok){ var r = db.transaction('kv').objectStore('kv').get(k); r.onsuccess=function(){ ok(r.result); }; r.onerror=function(){ ok(undefined); }; }); }
function kvSet(k, v){ return tx('kv','readwrite',function(s){ s.put(v,k); }); }

/* ════════════ Estado ════════════ */
var S = { yo:null, token:null, online:navigator.onLine, sincronizando:false, ultimaSync:null, cat:{}, movs:[], outbox:[],
  vista:null, tipo:'ingreso', cat_sel:null, medio:'efectivo', filtro:'todos', mes:null, usuariosAdmin:null };

function api(ruta, opciones){
  opciones = opciones || {};
  var h = {'content-type':'application/json'};
  if(S.token) h.authorization = 'Bearer '+S.token;
  return fetch(ruta, {method:opciones.method||'GET', headers:h, body:opciones.body?JSON.stringify(opciones.body):undefined, cache:'no-store'})
    .then(function(r){ return r.json().catch(function(){ return {ok:false,error:'Respuesta no válida del servidor',codigo:'RED'}; }); })
    .then(function(r){ if(!r.ok && r.codigo==='NO_AUTORIZADO' && S.yo){ sesionVencida(); } return r; },
          function(){ return {ok:false, error:'Sin conexión', codigo:'RED'}; });
}
function sesionVencida(){ ls('va_sesion', null); S.token=null; toast('Tu sesión venció. Entra de nuevo con tu PIN.', true); salir(true); }

/* ════════════ v5.0 · Unidad: checklist, documentos y mantenimiento (public/js/unidad.js) ════════════ */
function encolarOp(op){
  op.op_id = op.op_id || uuid(); op.creado = Date.now(); op.estado = 'pendiente';
  return tx('outbox','readwrite',function(s){ s.put(op); }).then(cargarLocal).then(function(){ pintarSenal(); sincronizar(); });
}
var UNI = window.VAUnidad({ S:S, api:api, esc:esc, ico:ico, toast:toast, $:$, abrirHoja:abrirHoja, hoja:function(){ return hoja; }, ir:ir, kvGet:kvGet, kvSet:kvSet, uuid:uuid,
  ahoraLima:ahoraLima, hoyLima:hoyLima, fechaCorta:fechaCorta, horaDe:horaDe, fechaLarga:fechaLarga, esMando:esMando, comprimirFoto:comprimirFoto, botonesHoja:botonesHoja,
  recordarVista:recordarVista, soles:soles, encolarOp:encolarOp, cargarSheetJS:cargarSheetJS, notificar:notificarSistema });
function etiquetaOp(o){ return o.tipo==='chk.crear' ? 'Checklist '+(o.datos.tipo==='post'?'post-ruta':'pre-ruta')+' · '+Number(o.datos.km||0).toLocaleString('es-PE')+' km' : nombreCat(o.datos)+' · '+soles(o.datos.monto); }

/* ════════════ Sincronización ════════════ */
function cargarLocal(){
  return Promise.all([todos('movs'), todos('outbox'), kvGet('cat')]).then(function(r){ S.movs=r[0]; S.outbox=r[1]; S.cat=r[2]||{}; });
}
function encolar(op){
  op.op_id = op.op_id || uuid(); op.creado = Date.now(); op.estado='pendiente';
  var mov = Object.assign({}, op.datos, {usuario_id:op.datos.a_nombre_de||S.yo.id, estado:'activo', _local:true});
  if(mov.foto){ mov.tiene_foto = true; } delete mov.foto;
  return tx('outbox','readwrite',function(s){ s.put(op); })
    .then(function(){ return tx('movs','readwrite',function(s){ s.put(mov); }); })
    .then(cargarLocal).then(function(){ sincronizar(); });
}
function sincronizar(forzarTodo){
  if(S.sincronizando || !S.token) return Promise.resolve();
  if(!navigator.onLine){ S.online=false; pintarSenal(); return Promise.resolve(); }
  S.sincronizando = true; pintarSenal();
  var quedan = 0, resUni = null;
  return kvGet('cursor').then(function(cur){
    var desde = forzarTodo ? 0 : (cur||0);
    // Un checklist con fotos viaja solo: así ninguna petición pasa el límite de tiempo del servidor.
    var pend0 = S.outbox.filter(function(o){ return o.estado==='pendiente'; });
    var pesada = function(o){ return o.tipo==='chk.crear' && o.datos && o.datos.fotos && Object.keys(o.datos.fotos).length; };
    var pend = pend0.length && pesada(pend0[0]) ? [pend0[0]] : pend0.filter(function(o){ return !pesada(o); }).slice(0,50);
    quedan = pend0.length - pend.length;
    var req = pend.length ? api('/api/sync?desde='+desde, {method:'POST', body:{ops:pend.map(function(o){ return {op_id:o.op_id,tipo:o.tipo,datos:o.datos}; })}}) : api('/api/sync?desde='+desde);
    return req.then(function(r){
      if(!r.ok){ S.online = r.codigo!=='RED'; return; }
      S.online = true;
      var d = r.data, resueltos = {}, rechazados = {};
      (d.resultados||[]).forEach(function(x){ if(x.ok) resueltos[x.op_id]=1; else rechazados[x.op_id]=x.error; });
      var tipos = {}; pend.forEach(function(o){ tipos[o.op_id]=o.tipo; });
      resUni = (d.resultados||[]).map(function(x){ return Object.assign({tipo:tipos[x.op_id]}, x); });
      return tx('outbox','readwrite',function(s){
        pend.forEach(function(o){
          if(resueltos[o.op_id]) s.delete(o.op_id);
          // Lo rechazado NO se borra: queda a la vista, con su motivo, hasta que alguien decida.
          else if(rechazados[o.op_id]){ o.estado='rechazado'; o.error=rechazados[o.op_id]; s.put(o); }
        });
      }).then(function(){
        return tx('movs','readwrite',function(s){
          if(forzarTodo) s.clear();
          (d.movimientos||[]).forEach(function(m){ s.put(m); });
        });
      }).then(function(){
        var cat = Object.assign({}, S.cat, d.catalogos||{});
        if(d.usuarios) cat.usuarios = d.usuarios;
        if(d.yo){
          var pendT = ls('va_tema_pend');
          S.yo = Object.assign(S.yo, d.yo); if(pendT) S.yo.tema = pendT;
          var ses=ls('va_sesion'); if(ses){ ses.usuario=S.yo; ls('va_sesion',ses); }
          if(!pendT && d.yo.tema && d.yo.tema!==(ls('va_tema')||'auto')) aplicarTema(d.yo.tema);
          if(pendT) enviarTema();
        }
        if(d.avisos) recibirAvisos(d.avisos);
        var rep = (d.resultados||[]).filter(function(x){ return x.foto_repetida; }).length;
        if(rep) toast('Ojo: '+rep+' foto(s) de comprobante ya se habían subido antes. Quedan marcadas para revisar.', true);
        return kvSet('cat', cat).then(function(){ return kvSet('cursor', d.seq); });
      }).then(function(){
        S.ultimaSync = Date.now();
        if(d.mas) { S.sincronizando=false; return sincronizar(); }
        if(Object.keys(rechazados).length) toast(Object.keys(rechazados).length+' registro(s) rechazado(s): revísalos en la cola', true);
      });
    });
  }).then(cargarLocal).then(function(){ S.sincronizando=false; refrescarVista(true); if(resUni) UNI.alSincronizar(resUni); if(quedan>0 && navigator.onLine && S.online) setTimeout(sincronizar, 400); }, function(e){ S.sincronizando=false; console.error(e); pintarSenal(); });
}
window.addEventListener('online', function(){ S.online=true; sincronizar(); });
window.addEventListener('offline', function(){ S.online=false; pintarSenal(); });
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible') sincronizar(); });
setInterval(function(){ if(S.yo && S.outbox.some(function(o){return o.estado==='pendiente';})) sincronizar(); }, 30000);
// Cada minuto, con la app abierta y con señal, se traen los avisos nuevos del equipo.
setInterval(function(){ if(S.yo && navigator.onLine && document.visibilityState==='visible' && !S.sincronizando) sincronizar(); }, 60000);

/* ════════════ Avisos del equipo ════════════ */
S.avisosN = 0;
function notificarSistema(titulo, cuerpo, tag){
  try{
    if(!('Notification' in window) || Notification.permission!=='granted' || !navigator.serviceWorker) return;
    navigator.serviceWorker.ready.then(function(reg){ reg.showNotification(titulo, {body:cuerpo, tag:tag, icon:'/icon-192.png', badge:'/icon-192.png', vibrate:[80,40,80], data:{url:'/'}}); }).catch(function(){});
  }catch(e){}
}
function recibirAvisos(lista){
  S.avisosN = lista.length; pintarCampana();
  var vistos = ls('va_avisados')||[], nuevos = lista.filter(function(a){ return vistos.indexOf(a.id)<0; });
  if(nuevos.length){
    toast(nuevos.length===1 ? nuevos[0].titulo : nuevos.length+' avisos nuevos: '+nuevos[0].titulo);
    try{ if(navigator.vibrate) navigator.vibrate([60,40,60]); }catch(e){}
    // v5.1: si el teléfono dio permiso, el aviso también aparece como notificación del sistema (útil con la app en segundo plano).
    nuevos.slice(0,3).forEach(function(a){ notificarSistema(a.titulo, a.detalle||'', 'aviso-'+a.id); });
    ls('va_avisados', vistos.concat(nuevos.map(function(a){ return a.id; })).slice(-300));
  }
}
function pintarCampana(){ var b=$('campN'); if(!b) return; b.textContent = S.avisosN>9?'9+':S.avisosN; b.classList.toggle('oculto', !S.avisosN); $('campana').setAttribute('aria-label', S.avisosN ? S.avisosN+' avisos sin leer' : 'Avisos'); }
function haceCuanto(f){ var m = Math.round((Date.parse(String(f).replace(' ','T')+'-05:00') - Date.now())/60000)*-1; if(isNaN(m)) return ''; return m<1?'ahora':m<60?'hace '+m+' min':m<1440?'hace '+Math.round(m/60)+' h':'hace '+Math.round(m/1440)+' d'; }
function hojaAvisos(){
  if(!navigator.onLine){ toast('Los avisos se ven con señal', true); return; }
  abrirHoja('<h2 id="hoja-t">Avisos</h2><p class="desc">Lo que pasó en Villa Azul y te toca saber.</p><div id="lav"><p class="vacio">Cargando…</p></div><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
  api('/api/avisos').then(function(r){
    if(!r.ok || !$('lav')) return; var L = r.data.avisos;
    $('lav').innerHTML = L.length ? L.map(function(a,i){ return '<button type="button" class="aviso-i'+(a.leido?'':' nuevo')+'" data-av="'+i+'"><b>'+esc(a.titulo)+'</b><small>'+esc(a.detalle||'')+'</small><span>'+esc(haceCuanto(a.creado_en))+(a.ir?' · Ver →':'')+'</span></button>'; }).join('') : '<p class="vacio">No hay avisos de los últimos 30 días.</p>';
    hoja.querySelectorAll('[data-av]').forEach(function(b){ b.onclick=function(){ var a=L[+b.dataset.av]; if(!a.ir) return; hoja.close(); irAviso(a.ir); }; });
    if(L.some(function(a){ return !a.leido; })) api('/api/avisos/leer',{method:'POST',body:{}}).then(function(){ S.avisosN=0; pintarCampana(); });
  });
}
function irAviso(dest){
  var p = String(dest).split(':');
  if(p[0]==='cotizador'){ S.cot = {vista:'detalle', id:p[1]}; ir('cotizador', true); }
  else if(p[0]==='solicitud'){ S.sol = {vista:'detalle', id:p[1], filtro:'activas'}; ir('solicitudes', true); }
  else if(p[0]==='excursion'){ S.excId = p[1]; S.excTab='resumen'; ir('excursiones', true); }
  else if(p[0]==='unidad'){ UNI.abrir(p[1], p[2]); }
  else ir(p[0]);
}

/* ════════════ Lo escrito no se pierde ════════════
   Al salir a WhatsApp o a la cámara y volver (o si el teléfono recarga la app), lo que estabas llenando sigue ahí. */
var BORR_KEY = 'va_borradores';
function claveBorr(){ return (S.yo?S.yo.id:'')+'|'+S.vista+(S.vista==='excursiones'?':'+(S.excId||'')+':'+S.excTab:'')+(S.vista==='cotizador'?':'+(S.cot&&S.cot.vista)+':'+(S.cot&&S.cot.editar?S.cot.editar.id:'')+(S.cot&&S.cot.pre?':sol'+S.cot.pre.solicitud_id:''):'')+(S.vista==='caja'?':'+(S.cajaPersona||'')+':'+(S.cajaFecha||''):''); }
function borrador(){ var b = ls(BORR_KEY)||{}, d = b[claveBorr()]; return d && Date.now()-d.t < 12*3600e3 ? d : null; }
function borrarBorrador(k){ var b = ls(BORR_KEY)||{}; delete b[k||claveBorr()]; ls(BORR_KEY, b); }
function guardarCampo(e){
  var el = e.target; if(!S.yo || !el || !el.id || !el.closest || !el.closest('#vista')) return;
  if(el.type==='file' || el.type==='password' || el.id==='pref') return;
  var b = ls(BORR_KEY)||{}, k = claveBorr(); b[k] = b[k] || {t:Date.now(), v:{}}; b[k].v = b[k].v || {};
  b[k].v[el.id] = el.value; b[k].t = Date.now();
  Object.keys(b).forEach(function(x){ if(Date.now()-b[x].t > 12*3600e3) delete b[x]; });
  ls(BORR_KEY, b);
}
// Sin zoom con dos dedos en iPhone: iOS ignora user-scalable=no, así que se frena el gesto.
['gesturestart','gesturechange'].forEach(function(t){ document.addEventListener(t, function(e){ e.preventDefault(); }, {passive:false}); });
document.addEventListener('input', guardarCampo, true); document.addEventListener('change', guardarCampo, true);
function restaurarBorrador(){
  var d = borrador(); if(!d || !d.v) return;
  Object.keys(d.v).forEach(function(id){ var el = document.getElementById(id); if(!el || !el.closest('#vista') || el.value===String(d.v[id])) return;
    el.value = d.v[id]; el.dispatchEvent(new Event('input', {bubbles:true})); });
}
function recordarVista(){ if(S.yo) ls('va_ultima', {u:S.yo.id, t:Date.now(), vista:S.vista, excId:S.excId, excTab:S.excTab, cot:S.cot?{vista:S.cot.vista, id:S.cot.id, pre:S.cot.pre||null}:null, sol:S.sol?{vista:S.sol.vista, id:S.sol.id, filtro:S.sol.filtro}:null, cajaPersona:S.cajaPersona, cajaFecha:S.cajaFecha, uni:S.uni?{tab:S.uni.tab}:null}); }
/* Con el teclado abierto se esconde la barra inferior: así no tapa el campo que escribes (Android e iPhone). */
document.addEventListener('focusin', function(e){ if(e.target.matches && e.target.matches('input:not([type=file]):not([type=checkbox]):not([type=radio]), textarea, select')) document.body.classList.add('kb-abierto'); });
document.addEventListener('focusout', function(){ setTimeout(function(){ var a = document.activeElement; if(!(a && a.matches && a.matches('input, textarea, select'))) document.body.classList.remove('kb-abierto'); }, 120); });

/* ════════════ Tema ════════════ */
/* Cada persona tiene su tema y la sigue en cualquier teléfono. La pantalla de acceso usa el del teléfono. */
function temaActual(){ return (S.yo && S.yo.tema) || 'auto'; }
function aplicarTema(t){
  ls('va_tema', t==='auto'?null:t);          // lo lee el arranque para no parpadear al abrir
  if(t==='auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme=t;
  document.querySelectorAll('.tema button').forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.t===t); });
}
function ponerTema(t){
  aplicarTema(t);
  if(!S.yo) return;
  S.yo.tema = t;
  var ses = ls('va_sesion'); if(ses){ ses.usuario.tema = t; ls('va_sesion', ses); }
  var pf = ls('va_perfiles')||{}; if(pf[S.yo.id]){ pf[S.yo.id].tema = t; ls('va_perfiles', pf); }
  ls('va_tema_pend', t);
  enviarTema();
}
function enviarTema(){
  var t = ls('va_tema_pend'); if(!t || !S.token || !navigator.onLine) return;
  api('/api/mi-tema', {method:'POST', body:{tema:t}}).then(function(r){ if(r.ok && ls('va_tema_pend')===t) ls('va_tema_pend', null); });
}
function selectorTema(claro){
  var t = temaActual();
  return '<div class="tema'+(claro?' claro':'')+'" role="group" aria-label="Tema">'+[['light','sol','Claro'],['dark','luna','Oscuro'],['auto','auto','Según el teléfono']].map(function(x){
    return '<button type="button" data-t="'+x[0]+'" aria-pressed="'+(t===x[0])+'" aria-label="Tema '+x[2].toLowerCase()+'" title="'+x[2]+'">'+ico(x[1])+'</button>'; }).join('')+'</div>';
}
document.addEventListener('click', function(e){ var b=e.target.closest('.tema button'); if(b) transicion(function(){ ponerTema(b.dataset.t); }); });

/* ════════════ Acceso ════════════ */
function usuariosAcceso(){
  return api('/api/estado').then(function(r){
    if(r.ok){ ls('va_usuarios', r.data.usuarios); ls('va_esquema', r.data.esquema); return r.data.usuarios; }
    return ls('va_usuarios') || [];
  });
}
function pantallaAcceso(sel){
  document.body.classList.remove('en-app');
  usuariosAcceso().then(function(lista){
    var h = '<div class="acceso"><section class="hero">'+TOPO+'<div class="fila"><div class="marca">'+LOGO+'<div><b>Villa Azul</b><span>Turismo & Excursiones</span></div></div></div>'+
      '<h1>Buen viaje, empecemos.</h1><p class="sub">Angasmarca, Trujillo, Huaraz y donde nos lleve la ruta. Funciona también sin señal.</p></section><section class="tarjeta-acceso entrar">';
    var u = sel && lista.filter(function(x){return x.id===sel;})[0];
    if(!u){
      if(!lista.length) h += '<h2>Sin conexión</h2><p class="ayuda">La primera vez en este teléfono se necesita señal para traer la lista de usuarios.</p><button type="button" class="btn ancho" id="reint" style="margin-top:14px">Reintentar</button>';
      else h += '<h2>¿Quién ingresa?</h2><div class="usuarios">'+lista.map(function(x){ return '<button type="button" class="u-card" data-u="'+esc(x.id)+'"><span class="avatar '+claseAv(x)+'">'+esc(iniciales(x.nombre))+'</span><span><b>'+esc(x.nombre)+'</b><small>'+ROL_TXT[x.rol]+'</small></span></button>'; }).join('')+'</div>';
    } else {
      h += '<div class="pin"><div class="quien"><span class="avatar grande '+claseAv(u)+'">'+esc(iniciales(u.nombre))+'</span><b>'+esc(u.nombre)+'</b><small>Escribe tu PIN de 4 dígitos</small></div>'+
        '<div class="puntos" id="puntos" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p class="msg" id="pinmsg" role="alert"></p>'+
        '<div class="teclado" id="teclado">'+[1,2,3,4,5,6,7,8,9].map(function(n){return '<button type="button" data-k="'+n+'" aria-label="'+n+'">'+n+'</button>';}).join('')+
        '<button type="button" class="nada" tabindex="-1" aria-hidden="true"></button><button type="button" data-k="0" aria-label="0">0</button><button type="button" class="borrar" data-k="del" aria-label="Borrar">'+ico('borrar')+'</button></div>'+
        '<button type="button" class="enlace" id="otro">No soy '+esc(u.nombre)+'</button></div>';
    }
    h += '</section><p class="vacio" style="font-size:12px">v'+VERSION+'</p></div>';
    app.className=''; app.innerHTML = h;
    if($('reint')) $('reint').onclick = function(){ pantallaAcceso(); };
    if(!u){ app.querySelectorAll('.u-card').forEach(function(b){ b.onclick=function(){ transicion(function(){ pantallaAcceso(b.dataset.u); }); }; }); return; }
    tecladoPin(u);
  });
}
function tecladoPin(u){
  var pin = '', ocupado = false;
  function pintar(){ $('puntos').querySelectorAll('i').forEach(function(i,k){ i.classList.toggle('lleno', k<pin.length); }); }
  function error(t){ var p=$('puntos'); p.classList.remove('mal'); void p.offsetWidth; p.classList.add('mal'); $('pinmsg').textContent=t; if(navigator.vibrate) navigator.vibrate(120); setTimeout(function(){ pin=''; pintar(); },380); }
  function tecla(k){
    if(ocupado) return;
    if(k==='del'){ pin=pin.slice(0,-1); pintar(); return; }
    if(pin.length>=4) return;
    pin+=k; pintar();
    if(pin.length===4) verificar();
  }
  function verificar(){
    ocupado = true; $('pinmsg').textContent='';
    var intento = pin;
    api('/api/login', {method:'POST', body:{id:u.id, pin:intento}}).then(function(r){
      ocupado = false;
      if(r.ok){
        ls('va_sesion', {token:r.data.token, usuario:r.data.usuario});
        var vs = ls('va_verif')||{}; vs[u.id] = r.data.verificador; ls('va_verif', vs);
        var tk = ls('va_tokens')||{}; tk[u.id] = r.data.token; ls('va_tokens', tk);
        var pf = ls('va_perfiles')||{}; pf[u.id] = r.data.usuario; ls('va_perfiles', pf);
        return iniciar(r.data.usuario, r.data.token);
      }
      if(r.codigo!=='RED') return error(r.error);
      // Sin señal: se comprueba contra el verificador guardado la última vez que entró con señal.
      var v = (ls('va_verif')||{})[u.id], t = (ls('va_tokens')||{})[u.id];
      if(!v || !t) return error('Sin señal. La primera vez en este teléfono necesitas conexión.');
      derivar(intento, v.salt, v.iter).then(function(h){
        if(h!==v.hash) return error('PIN incorrecto');
        var perfil = (ls('va_perfiles')||{})[u.id] || u;
        ls('va_sesion', {token:t, usuario:perfil});
        iniciar(perfil, t);
      });
    });
  }
  $('teclado').addEventListener('click', function(e){ var b=e.target.closest('[data-k]'); if(b) tecla(b.dataset.k); });
  $('otro').onclick = function(){ transicion(function(){ pantallaAcceso(); }); };
  document.onkeydown = function(e){ if(!$('teclado')){ document.onkeydown=null; return; } if(/^\d$/.test(e.key)) tecla(e.key); if(e.key==='Backspace') tecla('del'); };
}
function iniciar(usuario, token){
  document.onkeydown = null;
  S.yo = usuario; S.token = token;
  var pend = ls('va_tema_pend');
  aplicarTema(pend || usuario.tema || 'auto'); if(pend) enviarTema();
  return cargarLocal().then(function(){
    document.body.classList.add('en-app');
    S.vista = esMando(S.yo) ? 'panel' : 'registrar';
    var ult = ls('va_ultima');
    if(ult && ult.u===usuario.id && Date.now()-ult.t < 2*3600e3 && (nav().some(function(n){ return n[0]===ult.vista; }) || (esMando(usuario) ? VISTAS_EXTRA_MANDO : VISTAS_EXTRA_OP).indexOf(ult.vista)>=0)){
      S.vista = ult.vista; S.excId = ult.excId||null; S.excTab = ult.excTab||'resumen'; if(ult.cot) S.cot = ult.cot; if(ult.sol) S.sol = ult.sol; S.cajaPersona = ult.cajaPersona||null; S.cajaFecha = ult.cajaFecha||null; if(ult.uni && S.uni) S.uni.tab = ult.uni.tab||'estado';
    }
    transicion(function(){ pintarApp(); window.scrollTo(0,0); });
    sincronizar();
    UNI.precargar();   // checklist y documentos a bordo disponibles sin señal
  });
}
function salir(sinAviso){
  if(hoja.open) hoja.close();
  var t = S.token;
  if(t && !sinAviso && navigator.onLine) api('/api/logout', {method:'POST'});
  ls('va_sesion', null);
  S.yo=null; S.token=null; S.usuariosAdmin=null; S.excLista=null; S.excId=null;
  if(S.uni){ S.uni.d=null; S.uni.modo=null; S.uni.f=null; S.uni.borr=null; S.uni.tab='estado'; } UNI.salir();
  ls('va_tema_pend', null);
  transicion(function(){ aplicarTema('auto'); pantallaAcceso(); });
}

/* ════════════ Estructura ════════════ */
var NAV_OP = [['registrar','Registrar','mas'],['unidad','Checklist','chk'],['dia','Mi día','dia'],['caja','Caja','caja'],['cuentas','Cuentas','cuentas'],['viajes','Viajes','van']];
var NAV_MANDO = [['panel','Panel','panel'],['caja','Caja','caja'],['excursiones','Excursiones','van'],['movs','Movimientos','movs'],['modulos','Más','grid']];
var TITULOS = {unidad:'Unidad',solicitudes:'Solicitudes',cotizador:'Cotizador',viajes:'Viajes',calendario:'Calendario',revision:'Por revisar',registrar:'Registrar',dia:'Mi día',caja:'Caja',cuentas:'Cuentas',panel:'Panel',movs:'Movimientos',usuarios:'Usuarios',modulos:'Más',importar:'Importar datos',excursiones:'Excursiones'};
var VISTAS_EXTRA_OP = ['cotizador'];
var VISTAS_EXTRA_MANDO = ['dia','registrar','cuentas','importar','usuarios','revision','calendario','viajes','cotizador','solicitudes','unidad'];
function nav(){ return esMando(S.yo) ? NAV_MANDO : NAV_OP; }
function ir(v, mantener){
  if(!mantener){ if(v==='caja'){ S.cajaPersona=null; S.cajaFecha=null; } if(v==='registrar'){ S.regFecha=null; S.regPara=null; } }
  var permitido = nav().some(function(n){return n[0]===v;}) || (esMando(S.yo) ? VISTAS_EXTRA_MANDO : VISTAS_EXTRA_OP).indexOf(v)>=0;
  if(!permitido) return;
  if(v==='excursiones') S.excId = null;
  if(v!=='unidad') UNI.salir();
  transicion(function(){ S.vista=v; recordarVista(); pintarApp(); window.scrollTo(0,0); });
}
function pintarApp(){
  var activo = S.vista, items = nav().map(function(n){ var on = n[0]===activo || (n[0]==='modulos' && VISTAS_EXTRA_MANDO.indexOf(activo)>=0) || (n[0]==='viajes' && activo==='cotizador' && !esMando(S.yo)); return '<button type="button" data-ir="'+n[0]+'"'+(on?' aria-current="page"':'')+'>'+ico(n[2])+'<span>'+n[1]+'</span></button>'; }).join('');
  app.className = 'app';
  app.innerHTML = '<nav class="nav-lat" aria-label="Secciones"><div class="marca">'+LOGO+'<div><b>Villa Azul</b><span>Turismo & Excursiones</span></div></div>'+items+'</nav>'+
    '<div><header class="barra-sup">'+LOGO+'<h1>'+(activo==='unidad' && !esMando(S.yo) ? 'Checklist' : TITULOS[activo])+'</h1><button type="button" class="campana" id="campana" aria-label="Avisos">'+ico('campana')+'<span class="punto oculto" id="campN">0</span></button><button type="button" class="senal" id="senal"></button>'+
    '<button type="button" class="btn-avatar" id="perfil" aria-label="Mi perfil"><span class="avatar '+claseAv(S.yo)+'">'+esc(iniciales(S.yo.nombre))+'</span></button></header><main id="vista"></main></div>'+
    '<nav class="nav-inf'+(nav().length>5?' n6':'')+'" aria-label="Secciones">'+items+'</nav>';
  app.querySelectorAll('[data-ir]').forEach(function(b){ b.onclick=function(){ ir(b.dataset.ir); }; });
  $('perfil').onclick = hojaPerfil; $('senal').onclick = hojaCola; $('campana').onclick = hojaAvisos; pintarCampana();
  pintarSenal(); refrescarVista();
}
function refrescarVista(desdeSync){
  if(!S.yo || !$('vista')) return;
  pintarSenal();
  // Una sincronización de fondo (al volver a la app, cada 30 s) solo repinta listas, nunca un formulario a medio llenar.
  if(desdeSync){
    var pasivas = ['dia','movs','revision'];
    if(hoja.open) return;
    if(pasivas.indexOf(S.vista)<0 && !(S.vista==='registrar' && !$('monto'))) return;
  }
  recordarVista();
  ({unidad:UNI.vista,registrar:vRegistrar,dia:vDia,caja:vCaja,cuentas:vCuentas,calendario:vCalendario,viajes:vViajes,cotizador:vCotizador,solicitudes:vSolicitudes,panel:vPanel,movs:vMovs,usuarios:vUsuarios,modulos:vModulos,importar:vImportar,excursiones:vExcursiones,revision:vRevision}[S.vista])();
  document.querySelectorAll('#vista [data-v]').forEach(contar);
}
function pintarSenal(){
  var b = $('senal'); if(!b) return;
  var pend = S.outbox.filter(function(o){return o.estado==='pendiente';}).length, rech = S.outbox.length - pend;
  var off = !navigator.onLine || !S.online;
  b.className = 'senal'+(off||rech?' off':'');
  b.innerHTML = (S.sincronizando ? ico('sync')+'Enviando' : off ? ico('nube')+'Sin señal' : '<span class="p"></span>En línea') + ((pend+rech)?' <span class="cuenta num">'+(pend+rech)+'</span>':'');
  b.setAttribute('aria-label', (off?'Sin señal':'En línea')+(pend?', '+pend+' por enviar':'')+(rech?', '+rech+' rechazados':''));
}

/* ════════════ Catálogos ════════════ */
function cats(tipo){ return ((S.cat[tipo==='ingreso'?'cat_ingresos':'cat_egresos'])||[]).filter(function(c){ return c.activo; }); }
function nombreCat(m){ var l=(S.cat.cat_ingresos||[]).concat(S.cat.cat_egresos||[]); var c=l.filter(function(x){return x.clave===m.categoria;})[0]; return c?c.nombre:String(m.categoria||'').replace(/_/g,' '); }
function nombreUsuario(id, legado){ var u=(S.cat.usuarios||[]).filter(function(x){return x.id===id;})[0]; return u?u.nombre:(legado||''); }
function cuentasActivas(){ return (S.cat.cuentas||[]).filter(function(c){ return c.activo; }); }
function cuentaSugerida(medio){
  var para = $('rpara') && (S.cat.usuarios||[]).filter(function(u){ return u.id===$('rpara').value; })[0] || S.yo;
  var leg = para.legado || String(para.nombre).toLowerCase();
  var c = cuentasActivas().filter(function(x){ return x.dueno===leg && x.tipo===(medio==='yape'?'digital':'efectivo'); })[0];
  return c ? c.clave : '';
}
function placaDefecto(){ var u=(S.cat.unidades||[]).filter(function(x){return x.activo;})[0]; return u?u.placa:''; }

/* ════════════ Registrar ════════════ */
function vRegistrar(){
  var lista = cats(S.tipo);
  if(!lista.length){ $('vista').innerHTML='<div class="card"><p class="vacio">'+(S.sincronizando?'Trayendo los conceptos…':'Aún no hay conceptos en este teléfono. Conéctate una vez para descargarlos'+(esMando(S.yo)?' o importa el Excel desde Más → Importar datos.':'.'))+'</p></div>'; return; }
  if(!S.cat_sel || !lista.some(function(c){return c.clave===S.cat_sel;})) S.cat_sel = lista[0].clave;
  var h = '<div class="saludo entrar"><h2>Hola, '+esc(S.yo.nombre)+'</h2><p>'+new Date().toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',timeZone:'America/Lima'})+'</p></div>';
  h += '<div class="card"><div class="seg" role="group" aria-label="Tipo"><button type="button" class="ing" data-tipo="ingreso" aria-pressed="'+(S.tipo==='ingreso')+'">Ingreso</button><button type="button" class="egr" data-tipo="egreso" aria-pressed="'+(S.tipo==='egreso')+'">Gasto</button></div>';
  h += '<span class="etq">Concepto</span><div class="chips">'+lista.map(function(c){ return '<button type="button" class="chip" data-cat="'+esc(c.clave)+'" aria-pressed="'+(S.cat_sel===c.clave)+'">'+esc(c.nombre)+'</button>'; }).join('')+'</div>';
  h += '<label class="etq" for="monto">Monto</label><div class="monto"><span>S/</span><input id="monto" inputmode="decimal" autocomplete="off" placeholder="0.00" class="num"></div>';
  h += '<span class="etq">Medio de pago</span><div class="chips">'+[['efectivo','Efectivo'],['yape','Yape']].map(function(m){ return '<button type="button" class="chip" data-medio="'+m[0]+'" aria-pressed="'+(S.medio===m[0])+'">'+m[1]+'</button>'; }).join('')+'</div>';
  if(esMando(S.yo)){
    var gente = (S.cat.usuarios||[]).filter(function(u){ return u.activo && u.rol!=='super'; });
    h += '<div class="dos"><div class="campo"><label for="rpara">A nombre de</label><select id="rpara">'+gente.map(function(u){ return '<option value="'+esc(u.id)+'"'+(u.id===(S.regPara||S.yo.id)?' selected':'')+'>'+esc(u.nombre)+'</option>'; }).join('')+(gente.some(function(u){return u.id===S.yo.id;})?'':'<option value="'+esc(S.yo.id)+'" selected>'+esc(S.yo.nombre)+'</option>')+'</select></div>'+
      '<div class="campo"><label for="rfecha">Fecha y hora</label><input id="rfecha" type="datetime-local" value="'+esc(S.regFecha||ahoraLima().slice(0,16).replace(' ','T'))+'"></div></div><p class="ayuda" id="rreg"></p>';
  }
  if(esMando(S.yo)) h += '<div class="campo"><label for="cuenta">Cuenta</label><select id="cuenta"><option value="">Sin cuenta</option>'+cuentasActivas().map(function(c){ return '<option value="'+esc(c.clave)+'">'+esc(c.nombre)+'</option>'; }).join('')+'</select></div>';
  h += '<div class="campo"><label for="desc">Detalle <small style="font-weight:500;color:var(--muted)">(opcional)</small></label><input id="desc" maxlength="200" autocomplete="off"></div>';
  h += '<div class="campo"><label for="rfo">Comprobante <small style="font-weight:500;color:var(--muted)">(boleta, ticket de peaje o captura de Yape)</small></label><input id="rfo" type="file" accept="image/*,application/pdf" capture="environment"></div><img id="rpr" class="previa'+(S.fotoReg&&S.fotoReg.mime!=='application/pdf'?'':' oculto')+'" alt="Vista previa del comprobante"'+(S.fotoReg&&S.fotoReg.mime!=='application/pdf'?' src="data:'+S.fotoReg.mime+';base64,'+S.fotoReg.data+'"':'')+'>';
  h += '<button type="button" class="btn ancho" id="registrar" style="margin-top:20px" disabled></button></div>';
  if(!esMando(S.yo)) h = h.replace('</div><div class="card">', '</div>'+UNI.bannerOperador()+'<div class="card">');
  $('vista').innerHTML = h;
  if(!esMando(S.yo)) UNI.enlazarBanner();
  var v = $('vista');
  v.querySelectorAll('[data-tipo]').forEach(function(b){ b.onclick=function(){ S.tipo=b.dataset.tipo; S.cat_sel=null; vRegistrar(); }; });
  v.querySelectorAll('[data-cat]').forEach(function(b){ b.onclick=function(){ S.cat_sel=b.dataset.cat; v.querySelectorAll('[data-cat]').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); }; });
  v.querySelectorAll('[data-medio]').forEach(function(b){ b.onclick=function(){ S.medio=b.dataset.medio; v.querySelectorAll('[data-medio]').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); if($('cuenta')) $('cuenta').value=cuentaSugerida(S.medio); }; });
  if($('cuenta')) $('cuenta').value = cuentaSugerida(S.medio);
  if($('rpara')){
    var aviso = function(){ var otro = $('rpara').value!==S.yo.id, atras = $('rfecha').value.slice(0,10)!==hoyLima(); S.regPara=$('rpara').value; S.regFecha=$('rfecha').value;
      $('rreg').textContent = (otro||atras) ? 'Regularización: quedará a nombre de '+$('rpara').selectedOptions[0].text+' el '+fechaCorta($('rfecha').value.replace('T',' '))+', con tu nombre como quien lo registró.' : ''; $('cuenta').value = cuentaSugerida(S.medio); };
    $('rpara').onchange = aviso; $('rfecha').onchange = aviso; aviso();
  }
  $('monto').oninput = revisar; $('registrar').onclick = registrar;
  restaurarBorrador(); revisar();
  $('rfo').onchange = function(){
    var f = this.files[0]; if(!f){ S.fotoReg=null; return; }
    $('registrar').disabled = true;
    comprimirFoto(f).then(function(x){ S.fotoReg = x; if(x.mime!=='application/pdf'){ $('rpr').src='data:'+x.mime+';base64,'+x.data; $('rpr').classList.remove('oculto'); } revisar(); })
      .catch(function(err){ S.fotoReg=null; toast(err.message, true); revisar(); });
  };
}
function montoActual(){ return Number(String($('monto').value).replace(',','.'))||0; }
function revisar(){ var m=montoActual(), b=$('registrar'); b.disabled=!(m>0); b.innerHTML=(S.tipo==='ingreso'?ico('arriba'):ico('abajo'))+'<span>'+(S.tipo==='ingreso'?'Registrar ingreso ':'Registrar gasto ')+(m>0?soles(m):'')+'</span>'; }
var ultimoRegistro = 0;
function registrar(){
  var m = montoActual(); if(!(m>0)) return;
  if(Date.now()-ultimoRegistro < 1500) return;          // el doble toque no crea dos registros
  ultimoRegistro = Date.now();
  var fReg = $('rfecha') && $('rfecha').value ? $('rfecha').value.replace('T',' ')+':00' : ahoraLima();
  if(fReg > ahoraLima()){ toast('La fecha no puede estar en el futuro', true); return; }
  var datos = { uuid:uuid(), fecha:fReg, a_nombre_de: $('rpara') ? $('rpara').value : undefined, tipo:S.tipo, categoria:S.cat_sel, monto:Math.round(m*100)/100, medio_pago:S.medio,
    cuenta: $('cuenta') ? $('cuenta').value : cuentaSugerida(S.medio), descripcion:$('desc').value.trim(), placa:placaDefecto(), foto:S.fotoReg||null };
  S.fotoReg = null;
  borrarBorrador();
  encolar({tipo:'mov.crear', datos:datos}).then(function(){
    toast(navigator.onLine ? (S.tipo==='ingreso'?'Ingreso registrado':'Gasto registrado')+' · '+soles(m) : 'Guardado sin señal · se enviará solo');
    refrescarVista();
  });
}

/* ════════════ Listas ════════════ */
function filaMov(m, conAutor){
  var pend = m._local, anul = m.estado!=='activo';
  return '<li class="mov" data-mov="'+esc(m.uuid)+'" role="button" tabindex="0" style="cursor:pointer'+(anul?';opacity:.55':'')+'"><span class="ic '+(m.tipo==='ingreso'?'i':'e')+'">'+ico(m.tipo==='ingreso'?'arriba':'abajo')+'</span>'+
    '<div><b>'+esc(nombreCat(m))+(pend?'<span class="estado cola">En cola</span>':'')+(anul?'<span class="estado inac">'+esc(m.estado)+'</span>':'')+((m.foto_id||m.tiene_foto)?' <span class="estado '+(m.foto_repetida?'cola':'inac')+'" title="Con comprobante">'+CLIP+(m.foto_repetida?' repetida':'')+'</span>':'')+'</b><small>'+fechaCorta(m.fecha)+' · '+horaDe(m.fecha)+' · '+esc(m.medio_pago||'')+(conAutor?' · '+esc(nombreUsuario(m.usuario_id, m.usuario)):'')+(m.descripcion?' · '+esc(m.descripcion):'')+'</small></div>'+
    '<span class="m num '+(m.tipo==='ingreso'?'ok':'bad')+'"'+(anul?' style="text-decoration:line-through"':'')+'>'+(m.tipo==='ingreso'?'+':'−')+soles(m.monto)+'</span></li>';
}
function ordenar(l){ return l.slice().sort(function(a,b){ return String(b.fecha).localeCompare(String(a.fecha)); }); }
function totales(l){ var t={i:0,e:0}; l.forEach(function(m){ if(m.estado!=='activo') return; if(m.tipo==='ingreso') t.i+=Number(m.monto)||0; else t.e+=Number(m.monto)||0; }); return t; }
function vDia(){
  var hoy = hoyLima(), lista = ordenar(S.movs.filter(function(m){ return String(m.fecha).slice(0,10)===hoy && m.usuario_id===S.yo.id; })), t = totales(lista);
  var h = '<div class="kpis k3 entrar"><div class="kpi"><small>Ingresos</small><b class="num ok" data-v="'+t.i+'" data-p="S/ ">'+soles(t.i)+'</b></div>'+
    '<div class="kpi"><small>Gastos</small><b class="num bad" data-v="'+t.e+'" data-p="S/ ">'+soles(t.e)+'</b></div>'+
    '<div class="kpi"><small>Neto del día</small><b class="num" data-v="'+(t.i-t.e)+'" data-p="S/ ">'+soles(t.i-t.e)+'</b></div></div>';
  h += '<div class="titulo-sec"><h3>Mis registros de hoy</h3><span class="rol">'+lista.length+'</span></div><div class="card"><ul class="lista">'+(lista.length?lista.map(function(m){return filaMov(m,false);}).join(''):'<li class="vacio">Aún no registras nada hoy.</li>')+'</ul></div>';
  $('vista').innerHTML = h;
}
function vFase2(){
  $('vista').innerHTML = '<div class="saludo entrar"><h2>'+TITULOS[S.vista]+'</h2><p>Esta pantalla se migra en la fase 2, con las mismas reglas de la v3.10: arqueo, cierre con Yape, traspasos y bolsillos.</p></div><div class="card"><p class="vacio">Mientras tanto, la caja diaria se sigue cerrando en la app actual.</p></div>';
}

/* ════════════ Panel ════════════ */
function mesesDisponibles(){ var s={}; S.movs.forEach(function(m){ if(m.fecha) s[String(m.fecha).slice(0,7)]=1; }); return Object.keys(s).sort(); }
/* ════════════ Panel: tendencias por día, mes y año + qué hacer ════════════ */
S.pVista = 'mes'; S.pRef = null; S.charts = [];
function cargarGraficos(){
  if(window.Chart && window.ChartDataLabels) return Promise.resolve();
  var cargar = function(src){ return new Promise(function(ok, mal){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ mal(new Error('No se pudieron cargar los gráficos.')); }; document.head.appendChild(s); }); };
  return cargar('/vendor/chart.umd.js').then(function(){ return cargar('/vendor/chartjs-datalabels.min.js'); }).then(function(){ Chart.register(ChartDataLabels); });
}
function colorVar(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
function k0(n){ n=Number(n)||0; return Math.abs(n)>=1000 ? (Math.round(n/100)/10).toLocaleString('es-PE')+' mil' : Math.round(n).toLocaleString('es-PE'); }
var NIVEL = {decision:['Requiere decisión','bad'], negativo:['Lo negativo','warn'], oportunidad:['Oportunidades','brand'], bien:['Cómo vamos','ok']};
function vPanel(){
  if(!navigator.onLine){ $('vista').innerHTML='<div class="card"><p class="vacio">El panel se calcula con señal, con todos los registros al día.</p></div>'; return; }
  if(!S.pData) $('vista').innerHTML = '<p class="vacio">Analizando la operación…</p>';
  Promise.all([api('/api/panel?vista='+S.pVista+'&ref='+(S.pRef||'')), cargarGraficos().catch(function(){ return null; })]).then(function(r){
    var res = r[0]; if(!res.ok){ $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(res.error)+'</p></div>'; return; }
    S.pData = res.data; if(S.vista==='panel') pintarPanel();
  });
}
function pintarPanel(){
  var d = S.pData, t = d.totales;
  S.charts.forEach(function(c){ try{ c.destroy(); }catch(e){} }); S.charts = [];
  var refs = d.vista==='dia' ? d.meses : d.vista==='mes' ? d.anios : [];
  var h = '<div class="saludo entrar"><h2>Buen día, '+esc(S.yo.nombre)+'</h2><p>Así va Villa Azul: ruta y excursiones juntas.</p></div>';
  h += UNI.tiraPanel() + barraCompartir();
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="seg" style="flex:1;min-width:220px;grid-template-columns:repeat(3,1fr)" role="group" aria-label="Agrupar por">'+[['dia','Día'],['mes','Mes'],['anio','Año']].map(function(x){ return '<button type="button" data-pv="'+x[0]+'" aria-pressed="'+(d.vista===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>'+
    (refs.length?'<select id="pref" aria-label="Periodo" style="min-height:46px;border-radius:12px;border:1px solid var(--line);background:var(--surface);padding:0 12px;font-weight:700">'+refs.slice().reverse().map(function(x){ return '<option value="'+x+'"'+(x===d.ref?' selected':'')+'>'+(d.vista==='dia'?nombreMes(x):x)+'</option>'; }).join('')+'</select>':'')+'</div>';
  var vari = function(v){ return v===null||v===undefined ? '' : '<span class="d '+(v>=0?'ok':'bad')+'">'+(v>=0?'▲ ':'▼ ')+Math.abs(v)+'% vs. '+(d.vista==='dia'?'mes':'año')+' anterior</span>'; };
  h += '<div class="kpis k4" style="margin-top:12px"><div class="kpi"><small>Ingresos</small><b class="num ok" data-v="'+t.ing+'" data-p="S/ " data-d="0">'+soles0(t.ing)+'</b><span class="d">Ruta '+soles0(t.ruta_ing)+' · Excursiones '+soles0(t.exc_ing)+'</span>'+vari(t.var_ing)+'</div>'+
    '<div class="kpi"><small>Gastos</small><b class="num bad" data-v="'+t.egr+'" data-p="S/ " data-d="0">'+soles0(t.egr)+'</b><span class="d">'+(t.ing?Math.round(t.egr/t.ing*100):0)+'% de lo cobrado</span></div>'+
    '<div class="kpi"><small>Utilidad</small><b class="num" data-v="'+t.util+'" data-p="S/ " data-d="0">'+soles0(t.util)+'</b>'+vari(t.var_util)+'</div>'+
    '<div class="kpi'+(t.margen<15&&t.ing?' alerta':'')+'"><small>Margen</small><b class="num" data-v="'+t.margen+'" data-s=" %" data-d="0">'+t.margen+' %</b><span class="d">de cada S/ 100 cobrados</span></div></div>';
  // Qué hacer
  var grupos = {}; d.hallazgos.forEach(function(x){ (grupos[x.nivel]=grupos[x.nivel]||[]).push(x); });
  h += '<div class="titulo-sec"><h3>Qué hacer</h3><span class="rol">'+d.hallazgos.length+'</span></div>';
  // Lo que requiere decisión siempre a la vista; del resto, lo primero de cada grupo. El resto, a un toque.
  var ocultos = 0;
  ['decision','negativo','oportunidad','bien'].forEach(function(n){ if(!grupos[n]) return;
    h += '<p class="etq" style="margin:14px 0 6px;color:var(--'+NIVEL[n][1]+')">'+NIVEL[n][0]+'</p>'+grupos[n].map(function(x,i){ var oc = !S.pTodos && n!=='decision' && i>0; if(oc) ocultos++;
      return '<button type="button" class="hallazgo h-'+n+(oc?' oculto':'')+'"'+(x.ir?' data-hir="'+x.ir+'"':'')+'><b>'+esc(x.titulo)+'</b><small>'+esc(x.evidencia)+'</small><span>'+esc(x.accion)+(x.ir?' →':'')+'</span></button>'; }).join(''); });
  if(ocultos) h += '<button type="button" class="btn sec ancho" id="htodos" style="margin-top:10px">Ver '+ocultos+' hallazgo(s) más</button>';
  h += '<div class="titulo-sec"><h3>Ingresos, gastos y utilidad</h3></div><div class="card"><p class="ayuda" style="margin:0 0 8px">'+(d.vista==='anio'?'Toca un año para verlo por meses.':d.vista==='mes'?'Toca un mes para verlo día por día.':'Toca una barra para ver el detalle del día.')+'</p><div class="graf alto"><canvas id="gTend" role="img" aria-label="Ingresos, gastos y utilidad por periodo"></canvas></div></div>';
  h += '<div class="dos-g"><div><div class="titulo-sec"><h3>En qué se fue el gasto</h3></div><div class="card"><div class="graf"><canvas id="gEgr" role="img" aria-label="Gastos por tipo"></canvas></div><ul class="lista mini-l" id="lEgr"></ul></div></div>'+
    '<div><div class="titulo-sec"><h3>De dónde vino el ingreso</h3></div><div class="card"><div class="graf"><canvas id="gIng" role="img" aria-label="Ingresos por concepto"></canvas></div><ul class="lista mini-l" id="lIng"></ul></div></div></div>';
  h += '<div class="titulo-sec"><h3>Mejores días de la semana</h3><span class="ayuda">utilidad promedio por día operado</span></div><div class="card"><div class="graf"><canvas id="gSem" role="img" aria-label="Utilidad promedio por día de la semana"></canvas></div></div>';
  if(d.rutas.length) h += '<div class="titulo-sec"><h3>Rutas</h3></div><div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Ruta</th><th class="n">Viajes</th><th class="n">Pasajes/viaje</th><th class="n">Utilidad/viaje</th></tr></thead><tbody>'+
    d.rutas.map(function(r){ return '<tr><td>'+esc(r.ruta)+'</td><td class="n">'+r.viajes+'</td><td class="n">'+r.pax_viaje+'</td><td class="n '+(r.util_viaje<0?'bad':'ok')+'">'+soles0(r.util_viaje)+'</td></tr>'; }).join('')+'</tbody></table></div>';
  $('vista').innerHTML = h; activarCompartir();
  document.querySelectorAll('#vista [data-v]').forEach(contar);
  UNI.enlazarTira();
  $('vista').querySelectorAll('[data-pv]').forEach(function(b){ b.onclick=function(){ S.pVista=b.dataset.pv; S.pRef=null; vPanel(); }; });
  if($('pref')) $('pref').onchange = function(){ S.pRef=this.value; vPanel(); };
  if($('htodos')) $('htodos').onclick = function(){ S.pTodos = true; $('vista').querySelectorAll('.hallazgo.oculto').forEach(function(x){ x.classList.remove('oculto'); }); this.remove(); };
  $('vista').querySelectorAll('[data-hir]').forEach(function(b){ b.onclick=function(){ ir(b.dataset.hir); }; });
  if(!window.Chart){ ['gTend','gEgr','gIng','gSem'].forEach(function(id){ $(id).parentNode.innerHTML='<p class="ayuda">Los gráficos se cargan con señal.</p>'; }); listasDonas(d); return; }
  graficos(d);
}
function listasDonas(d){
  [['lEgr', d.egresos_cat],['lIng', d.ingresos_cat]].forEach(function(x){ var tot = x[1].reduce(function(s,c){ return s+c.monto; },0)||1;
    $(x[0]).innerHTML = x[1].slice(0,6).map(function(c,i){ return '<li class="mov" style="grid-template-columns:14px 1fr auto;padding:7px 0"><i style="width:12px;height:12px;border-radius:3px;background:'+PALETA[i%PALETA.length]+'"></i><span>'+esc(c.nombre)+'</span><b class="num">'+soles0(c.monto)+' · '+Math.round(c.monto/tot*100)+'%</b></li>'; }).join('') || '<li class="vacio">Sin datos.</li>'; });
}
var PALETA = ['#1E4FD1','#E07A1F','#0F7A55','#C0392F','#7A4FD1','#0E8FA6','#B08900','#D1497A','#536077','#2E9E6B'];
function graficos(d){
  var ink = colorVar('--ink'), muted = colorVar('--muted'), line = colorVar('--line'), ok = colorVar('--ok'), bad = colorVar('--bad'), brand = colorVar('--brand'), surface = colorVar('--surface');
  Chart.defaults.font.family = '"Plus Jakarta Sans", system-ui, sans-serif'; Chart.defaults.color = muted;
  var muchas = d.claves.length > 14;
  var tend = new Chart($('gTend'), {
    data: { labels: d.etiquetas, datasets: [
      {type:'bar', label:'Ingresos ruta', data:d.series.ruta_ing, backgroundColor:ok, stack:'i', borderRadius:4, order:2},
      {type:'bar', label:'Ingresos excursiones', data:d.series.exc_ing, backgroundColor:brand, stack:'i', borderRadius:4, order:2},
      {type:'bar', label:'Gastos', data:d.series.ruta_egr.map(function(v,i){ return Math.round((v+d.series.exc_egr[i])*100)/100; }), backgroundColor:bad+'B3', stack:'e', borderRadius:4, order:2},
      {type:'line', label:'Utilidad', data:d.series.utilidad, borderColor:ink, backgroundColor:ink, pointRadius:muchas?2:4, tension:.3, order:1,
        datalabels:{display:function(c){ var v=c.dataset.data[c.dataIndex]; return !muchas && v!==0; }, align:'top', color:ink, font:{weight:'800', size:11}, formatter:function(v){ return k0(v); }}}
    ]},
    options: { responsive:true, maintainAspectRatio:false, interaction:{mode:'index', intersect:false},
      plugins: { legend:{position:'bottom', labels:{boxWidth:12, usePointStyle:true}},
        tooltip:{callbacks:{label:function(c){ return ' '+c.dataset.label+': '+soles(c.parsed.y); }}},
        // Etiqueta arriba de cada barra: el total de ingresos (ruta + excursiones) y el total de gastos.
        datalabels:{display:function(c){ if(muchas || c.dataset.type!=='bar' || c.datasetIndex===0) return false; var tot = c.datasetIndex===1 ? d.series.ruta_ing[c.dataIndex]+d.series.exc_ing[c.dataIndex] : c.dataset.data[c.dataIndex]; return tot>0; },
          anchor:'end', align:'end', offset:-2, color:muted, font:{size:10, weight:'700'}, formatter:function(v,c){ return k0(c.datasetIndex===1 ? d.series.ruta_ing[c.dataIndex]+d.series.exc_ing[c.dataIndex] : v); }} },
      scales: { x:{grid:{display:false}}, y:{grid:{color:line}, ticks:{callback:function(v){ return k0(v); }}} },
      onClick: function(e, els){
        if(!els.length) return; var k = d.claves[els[0].index];
        if(d.vista==='anio'){ S.pVista='mes'; S.pRef=k; vPanel(); }
        else if(d.vista==='mes'){ S.pVista='dia'; S.pRef=k; vPanel(); }
        else { S.cajaFecha = k; S.cajaPersona = null; ir('caja', true); }
      } }
  });
  var dona = function(id, lista){ var top = lista.slice(0,7), resto = lista.slice(7).reduce(function(s,c){ return s+c.monto; },0); if(resto) top = top.concat([{nombre:'Otros', monto:resto}]);
    var tot = top.reduce(function(s,c){ return s+c.monto; },0) || 1;
    return new Chart($(id), { type:'doughnut', data:{ labels:top.map(function(c){ return c.nombre; }), datasets:[{ data:top.map(function(c){ return c.monto; }), backgroundColor:PALETA, borderColor:surface, borderWidth:2 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'58%', plugins:{ legend:{display:false},
        tooltip:{callbacks:{label:function(c){ return ' '+c.label+': '+soles(c.parsed)+' ('+Math.round(c.parsed/tot*100)+'%)'; }}},
        datalabels:{ color:'#fff', font:{weight:'800', size:12}, display:function(c){ return c.dataset.data[c.dataIndex]/tot >= 0.06; }, formatter:function(v){ return Math.round(v/tot*100)+'%'; } } } } }); };
  var e1 = dona('gEgr', d.egresos_cat), e2 = dona('gIng', d.ingresos_cat);
  var sem = new Chart($('gSem'), { type:'bar', data:{ labels:d.semana.map(function(s){ return s.dia.slice(0,3); }), datasets:[{ label:'Utilidad promedio', data:d.semana.map(function(s){ return s.util_prom; }),
      backgroundColor:d.semana.map(function(s){ return s.util_prom<0?bad:ok; }), borderRadius:6 }] },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false},
      tooltip:{callbacks:{label:function(c){ var s=d.semana[c.dataIndex]; return ' '+soles(c.parsed.y)+' por día · '+s.n+' día(s) operados'; }}},
      datalabels:{ anchor:'end', align:function(c){ return c.dataset.data[c.dataIndex]<0?'start':'end'; }, color:ink, font:{weight:'800', size:11}, formatter:function(v,c){ return d.semana[c.dataIndex].n ? k0(v) : ''; } } },
      scales:{ x:{grid:{display:false}}, y:{grid:{color:line}, ticks:{callback:function(v){ return k0(v); }}} } } });
  S.charts = [tend, e1, e2, sem];
  listasDonas(d);
}

/* ════════════ Cotizador ════════════ */
var COT_TIPO = {excursion:'Excursión', taxi:'Taxi / expreso', privado:'Transporte privado'};
var COT_EST = {borrador:['Borrador',''], enviada:['Enviada','en_ruta'], aceptada:['Aceptada','abierta'], rechazada:['Rechazada','anulada'], vencida:['Vencida','anulada']};
var PLAN_TXT = {estandar:'Estándar', premium:'Premium'};
var NIVEL_TXT = {minimo:'Mínimo', recomendado:'Recomendado', alto:'Alto'}, NIVEL_CORTO = {minimo:'Mín.', recomendado:'Recom.', alto:'Alto'};
var COT_TIPO_CORTO = {excursion:'Excursión', taxi:'Taxi', privado:'Privado'};
// Igual que en /js/cotizar.mjs (BASE y MODALIDADES): la cochera de la van y cómo se mueve en cada servicio.
var COT_BASE = 'Angasmarca';
var COT_MOD = {ida_vuelta:['Ida y vuelta','La van lleva al grupo, lo espera o se queda con él, y lo trae de vuelta.'],
  solo_ida:['Solo ida','La van deja (o recoge) al grupo y regresa vacía a la base.'],
  dos_dias:['Dejar y recoger otro día','Día 1: deja al grupo y regresa vacía. Día del retorno: va vacía a recogerlo y lo trae.']};
function cotModalidad(d){ return d && COT_MOD[d.modalidad] ? d.modalidad : (d && d.ida_vuelta===false ? 'solo_ida' : 'ida_vuelta'); }
/** Etiqueta larga en pantallas normales y corta en las angostas (ver .lc-l / .lc-c en index.html). */
function lc(largo, corto){ return largo===corto ? esc(largo) : '<span class="lc-l">'+esc(largo)+'</span><span class="lc-c">'+esc(corto)+'</span>'; }
S.cot = {vista:'lista'};
function formula(){ return S.cotFormula ? Promise.resolve(S.cotFormula) : import('/js/cotizar.mjs').then(function(m){ S.cotFormula = m; return m; }); }
function vCotizador(){
  if(!navigator.onLine) return sinSenal(null, 'El cotizador trabaja con señal.');
  if(!S.cotL) $('vista').innerHTML = '<p class="vacio">Cargando cotizaciones…</p>';
  Promise.all([api('/api/cotizaciones'), api('/api/cotizador')]).then(function(r){
    if(!r[0].ok){ $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(r[0].error)+'</p></div>'; return; }
    S.cotL = r[0].data; S.cotP = r[1].data;
    if(S.cot.vista==='nueva') return cotForm(S.cot.editar||null, S.cot.pre);
    if(S.cot.vista==='detalle' && S.cot.id) return cotDetalle(S.cot.id);
    cotLista();
  });
}
function precioAcordado(c){ return c.plan_elegido==='premium' && c.precio_final_premium ? c.precio_final_premium : c.precio_final; }
function cotLista(){
  S.cot = {vista:'lista'}; recordarVista();
  var L = S.cotL.cotizaciones, R = S.cotL.resumen;
  var OP = !!S.cotP.operador;
  var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>'+(OP?'Mis cotizaciones':'Cotizador')+'</h2><p>Excursión, taxi o expreso y transporte privado, en servicio Estándar o Premium.</p></div><div class="botones">'+(OP?'':'<button type="button" class="btn sec" id="cpar">Parámetros</button>')+'<button type="button" class="btn" id="cnue">'+ico('mas')+'Nueva cotización</button></div></div>';
  if(!OP) h += '<div class="kpis k4"><div class="kpi"><small>Cotizado este mes</small><b class="num">'+soles0(R.mes_monto)+'</b><span class="d">'+R.mes_n+' cotización(es)</span></div><div class="kpi"><small>Aceptadas</small><b class="num ok">'+soles0(R.monto_aceptado)+'</b><span class="d">'+R.aceptadas+' · '+(R.premium||0)+' Premium · '+(R.estandar||0)+' Estándar</span></div>'+
    '<div class="kpi"><small>Tasa de aceptación</small><b class="num">'+(R.tasa===null?'—':R.tasa+' %')+'</b><span class="d">de las ya respondidas</span></div><div class="kpi'+(R.pendientes?' alerta':'')+'"><small>Por responder</small><b class="num">'+R.pendientes+'</b><span class="d">vigentes sin respuesta</span></div></div>';
  h += '<div class="titulo-sec"><h3>Cotizaciones</h3></div>';
  if(!L.length) h += '<div class="card"><p class="vacio">Aún no hay cotizaciones. Crea la primera con «Nueva cotización».</p></div>';
  h += L.map(function(c){ var e = c.vencida ? COT_EST.vencida : COT_EST[c.estado];
    return '<button type="button" class="exc-item" data-cot="'+esc(c.id)+'"><b>'+esc(c.codigo)+' · '+esc(c.cliente||'Sin nombre')+'</b><span class="chip-est '+e[1]+'">'+e[0]+'</span>'+(c.plan_elegido?'<span class="chip-est '+(c.plan_elegido==='premium'?'abierta':'borrador')+'">Eligió '+PLAN_TXT[c.plan_elegido]+'</span>':'')+
      '<small>'+esc(COT_TIPO[c.tipo])+' · '+esc(c.origen)+' → '+esc(c.destino)+(c.fecha_servicio?' · '+esc(fechaExc(c.fecha_servicio)):'')+(!OP&&c.creado_por?' · cotizó '+esc(c.creado_por):'')+'</small><div class="datos num"><span>Estándar <b>'+soles0(c.precio_final)+'</b></span>'+(c.precio_final_premium?'<span>Premium <b>'+soles0(c.precio_final_premium)+'</b></span>':'')+(OP?'':'<span>Costo '+soles0(c.costo)+'</span>')+'</div></button>'; }).join('');
  $('vista').innerHTML = h;
  $('cnue').onclick = function(){ cotForm(null); }; if($('cpar')) $('cpar').onclick = cotParametros;
  $('vista').querySelectorAll('[data-cot]').forEach(function(b){ b.onclick=function(){ cotDetalle(b.dataset.cot); }; });
}
function cotForm(c, pre){
  pre = c ? null : (pre || null);
  S.cot = {vista:'nueva', editar:c, pre:pre}; recordarVista();
  var P = S.cotP, OP = !!P.operador, dr = !c ? (borrador()||{}).extra || {} : {};
  var galonParam = OP ? P.precio_galon : P.parametros.precio_galon, vel = OP ? P.velocidad_promedio : P.parametros.velocidad_promedio;
  var x = c ? Object.assign({}, c.datos, {cliente:c.cliente, cliente_tel:String(c.cliente_tel||'').replace(/^51/,''), origen:c.origen, destino:c.destino, fecha_servicio:c.fecha_servicio, notas:c.notas})
            : Object.assign({tipo:'excursion', modalidad:'ida_vuelta', dias:1, noches:0, pasajeros:15, origen:COT_BASE}, pre||{}, dr);
  var v = function(k){ return esc(x[k]==null?'':x[k]); };
  var h = '<button type="button" class="enlace" id="cvol" style="padding:4px 0">'+(pre?'← Volver a '+esc(pre.codigo):'← Cotizaciones')+'</button><div class="saludo"><h2>'+(c?'Editar '+esc(c.codigo):pre?'Cotizar '+esc(pre.codigo)+' · '+esc(pre.cliente):'Nueva cotización')+'</h2></div>';
  if(pre) h += '<div class="card desde-sol"><b>Lo que pidió el cliente</b><p class="ayuda">Los datos ya están puestos. Revisa los km, ajusta los precios y guarda: luego la envías por WhatsApp desde la cotización.</p><dl class="ficha"><dt>Prefiere</dt><dd>'+esc(SOL_PREF[pre.servicio_pref]||'—')+'</dd>'+
    (pre.recorrido?'<dt>Recorrido interno</dt><dd>'+esc(pre.recorrido)+'<br><small class="ayuda">'+(pre.tipo==='privado'?'Puesto como horas de espera. Suma los km del recorrido en «Km adicionales».':'Suma los km del recorrido en «Km adicionales».')+'</small></dd>':'')+
    (pre.bebes?'<dt>Bebés en brazos</dt><dd>'+pre.bebes+' (sin asiento: no se cobran)</dd>':'')+(pre.detalles?'<dt>Detalles</dt><dd style="white-space:pre-wrap">'+esc(pre.detalles)+'</dd>':'')+'</dl></div>';
  if(!OP && !P.parametros._guardados.length) h += '<div class="card" style="border-color:var(--warn);background:var(--warn-soft)"><b class="warn">Revisa los parámetros una vez</b><p class="ayuda">Los costos fijos (diésel, conductor por km, viáticos, cochera) aún tienen los valores iniciales. <a href="#" id="apar">Revisar parámetros</a></p></div>';
  h += '<div class="card" style="margin-top:12px"><div class="seg seg3" role="group" aria-label="Tipo">'+Object.keys(COT_TIPO).map(function(t){ return '<button type="button" data-ct="'+t+'" aria-pressed="'+(x.tipo===t)+'" aria-label="'+COT_TIPO[t]+'">'+lc(COT_TIPO[t], COT_TIPO_CORTO[t])+'</button>'; }).join('')+'</div>'+
    '<div class="dos"><div class="campo"><label for="qcl">Cliente</label><input id="qcl" value="'+v('cliente')+'" maxlength="80"></div><div class="campo"><label for="qct">Celular</label><input id="qct" inputmode="tel" value="'+v('cliente_tel')+'" maxlength="9"></div></div>'+
    '<datalist id="lug">'+P.lugares.map(function(l){ return '<option value="'+esc(l)+'">'; }).join('')+'</datalist>'+
    '<div class="dos"><div class="campo"><label for="qor">Origen</label><input id="qor" list="lug" value="'+v('origen')+'" autocomplete="off"></div><div class="campo"><label for="qde">Destino</label><input id="qde" list="lug" value="'+v('destino')+'" autocomplete="off"></div></div>'+
    '<div class="botones" style="margin-top:10px"><button type="button" class="btn sec" id="qcalc">'+ico('ruta')+'Calcular km</button><a class="btn sec" id="qmaps" target="_blank" rel="noopener" href="#">Ver en Google Maps</a></div><p class="ayuda" id="qrk"></p>'+
    '<span class="etq">Recorrido</span><div class="chips" role="group" aria-label="Recorrido">'+Object.keys(COT_MOD).map(function(m){ return '<button type="button" class="chip" data-md="'+m+'" aria-pressed="'+(cotModalidad(x)===m)+'">'+COT_MOD[m][0]+'</button>'; }).join('')+'</div><p class="ayuda" id="qmdh"></p>'+
    '<div class="dos"><div class="campo"><label for="qkm">Km de ida</label><input id="qkm" inputmode="decimal" class="num" value="'+v('km_ida')+'"></div><div class="campo"><label for="qkx">Km adicionales <small style="font-weight:500;color:var(--muted)">(paseos en destino)</small></label><input id="qkx" inputmode="decimal" class="num" value="'+v('km_extra')+'"></div></div>'+
    '<div class="dos"><div class="campo"><label for="qpe">Peajes de ida S/</label><input id="qpe" inputmode="decimal" class="num" value="'+v('peajes_ida')+'"></div><div class="campo" id="bpv"><label for="qpv" id="qpvl">Peajes de vuelta S/</label><input id="qpv" inputmode="decimal" class="num" value="'+v('peajes_vuelta')+'"></div></div>'+
    '<p class="ayuda tramos" id="qtr"></p><div id="bvac"><span class="etq">El grupo no sale de '+COT_BASE+' <small>(km que la van hace vacía para llegar y volver)</small></span><div class="dos"><div class="campo" style="margin-top:0"><label for="qb1" id="qb1l">De '+COT_BASE+' al origen</label><input id="qb1" inputmode="decimal" class="num" value="'+v('km_base_origen')+'"></div><div class="campo" style="margin-top:0"><label for="qb2" id="qb2l">Del destino a '+COT_BASE+'</label><input id="qb2" inputmode="decimal" class="num" value="'+v('km_destino_base')+'"></div></div><p class="ayuda" id="qvac"></p></div>'+
    '<div class="dos"><div class="campo" id="bdi"><label for="qdi">Días de servicio</label><input id="qdi" inputmode="numeric" class="num" value="'+v('dias')+'"></div><div class="campo" id="bno"><label for="qno">Noches fuera</label><input id="qno" inputmode="numeric" class="num" value="'+v('noches')+'"></div></div>'+
    '<div class="dos"><div class="campo" id="bho"><label for="qho">Horas de espera incluidas</label><input id="qho" inputmode="decimal" class="num" value="'+v('horas_espera')+'" placeholder="0"></div><div class="campo"><label for="qpa">Pasajeros</label><input id="qpa" inputmode="numeric" class="num" value="'+v('pasajeros')+'"></div></div>'+
    '<div class="regla-esp" id="qesp"></div>'+
    '<div class="campo"><label for="qfe">Fecha del servicio</label><input id="qfe" type="datetime-local" value="'+v('fecha_servicio')+'"></div>'+
    '<div class="campo"><label for="qdg">Precio del diésel hoy <small style="font-weight:500;color:var(--muted)">(S/ por galón)</small></label><input id="qdg" inputmode="decimal" class="num" value="'+esc(x.precio_galon||galonParam)+'"><p class="ayuda aviso-diesel">Verifica el precio de hoy en el grifo antes de cotizar. Si cambió, corrígelo aquí: solo afecta a esta cotización.</p></div>'+
    (OP?'':'<div class="campo"><label for="qbo">Bono del conductor para este viaje <small style="font-weight:500;color:var(--muted)">(S/, opcional)</small></label><input id="qbo" inputmode="decimal" class="num" value="'+esc(x.bono==null?'':x.bono)+'" placeholder="Automático"><p class="ayuda" id="qbs"></p></div>')+
    '<span class="etq">'+(OP?'Gastos extra del viaje':'Otros costos de este viaje')+' <small>(entradas, guía…)</small></span><div id="qot"></div><button type="button" class="btn-mini" id="qadd">'+ico('mas')+(OP?' Agregar gasto':' Agregar costo')+'</button>'+
    '<div class="campo"><label for="qnt">Notas para el cliente</label><textarea id="qnt" maxlength="500">'+v('notas')+'</textarea></div></div>';
  h += '<div class="titulo-sec"><h3>Precio</h3></div><div id="qres" class="card"><p class="vacio">Escribe los km de ida o pulsa «Calcular km».</p></div>';
  h += '<p class="error" id="qerr" role="alert"></p><button type="button" class="btn ancho" id="qgu" style="margin-top:8px">'+(c?'Guardar cambios':'Guardar cotización')+'</button>';
  $('vista').innerHTML = h;
  var tipo = x.tipo, md = cotModalidad(x), otros = (x.otros||[]).slice(), nivel = x.nivel || 'recomendado';
  // Km vacíos: se llenan solos con las rutas conocidas hasta que alguien los escribe a mano.
  var vacMan = {qb1: x.km_base_origen!=null && x.km_base_origen!=='', qb2: x.km_destino_base!=null && x.km_destino_base!==''};
  var lugar = function(t){ return String(t||'').trim().toLowerCase(); };
  var kmEntre = function(a, b){ a = lugar(a); b = lugar(b); if(!a || !b) return null; if(a===b) return 0;
    var o = lugar($('qor').value), de = lugar($('qde').value), k = Number(String($('qkm').value).replace(',','.'))||0;
    if(k && ((a===o && b===de) || (a===de && b===o))) return k;
    var r = P.rutas.filter(function(z){ var zo = lugar(z.origen), zd = lugar(z.destino); return (zo===a && zd===b) || (zo===b && zd===a); })[0];
    return r ? r.km : null; };
  var desdeBase = function(){ return !$('qor').value.trim() || lugar($('qor').value)===lugar(COT_BASE); };
  var autoVacios = function(){
    var o = $('qor').value.trim() || 'el origen', de = $('qde').value.trim() || 'el destino';
    $('qb1l').textContent = 'De '+COT_BASE+' a '+o; $('qb2l').textContent = 'De '+de+' a '+COT_BASE;
    if(desdeBase()){ $('qvac').textContent = ''; return; }
    [['qb1', COT_BASE, $('qor').value], ['qb2', $('qde').value, COT_BASE]].forEach(function(z){ if(vacMan[z[0]]) return; var k = kmEntre(z[1], z[2]); $(z[0]).value = k==null ? '' : k; });
    var falta = [];
    if($('qb1').value==='') falta.push(COT_BASE+' → '+o);
    if(md!=='ida_vuelta' && $('qb2').value==='') falta.push(de+' → '+COT_BASE);
    $('qvac').innerHTML = falta.length ? '<span class="warn">No conozco los km de '+esc(falta.join(' ni de '))+'. Escríbelos'+(md!=='ida_vuelta' && $('qb2').value==='' ? ': mientras tanto se toma el regreso igual al tramo de ida.' : '.')+'</span>'
      : 'Se llenan solos con las rutas conocidas. Corrígelos si la van va por otro camino.';
  };
  /** Cada movimiento de la van, para ver de dónde salen los km. */
  var pintarTramos = function(km, kv){
    var o = $('qor').value.trim() || 'Origen', de = $('qde').value.trim() || 'Destino', k = Number(String($('qkm').value).replace(',','.'))||0;
    if(!k){ $('qtr').innerHTML = ''; return; }
    var b1 = desdeBase() ? 0 : Number($('qb1').value)||0, b2 = desdeBase() ? k : ($('qb2').value==='' ? k : Number($('qb2').value)||0);
    var t = function(a, b, n, vacio){ return n ? '<li'+(vacio?' class="tv"':'')+'>'+esc(a)+' → '+esc(b)+' · <b>'+n+' km</b>'+(vacio?' vacía':' con pasajeros')+'</li>' : ''; };
    var ida = t(COT_BASE, o, b1, 1)+t(o, de, k)+t(de, COT_BASE, b2, 1), vuelta = t(COT_BASE, de, b2, 1)+t(de, o, k)+t(o, COT_BASE, b1, 1);
    var h = md==='dos_dias' ? '<b>Día de ida</b><ul>'+ida+'</ul><b>Día del retorno</b><ul>'+vuelta+'</ul>'
      : md==='solo_ida' ? '<ul>'+ida+'</ul>' : '<ul>'+t(COT_BASE, o, b1, 1)+t(o, de, k)+t(de, o, k)+t(o, COT_BASE, b1, 1)+'</ul>';
    $('qtr').innerHTML = h + 'Total: <b>'+km+' km</b>'+(kv ? ', de ellos <b>'+kv+' vacíos</b>.' : ', siempre con pasajeros.');
  };
  var precios = c ? {estandar:c.precio_final, premium:c.precio_final_premium||''} : {estandar:'', premium:''}, manual = {estandar:!!c, premium:!!(c&&c.precio_final_premium)};
  var extra = function(){ if(c) return; var b=ls('va_borradores')||{}, k=claveBorr(); b[k]=b[k]||{t:Date.now(),v:{}}; b[k].extra={tipo:tipo, modalidad:md, otros:otros, nivel:nivel}; b[k].t=Date.now(); ls('va_borradores',b); };
  var pintarOtros = function(){ $('qot').innerHTML = otros.map(function(o,i){ return '<div class="dos" style="align-items:end"><div class="campo"><label for="qoc'+i+'">Concepto</label><input id="qoc'+i+'" value="'+esc(o.concepto)+'"></div><div class="campo"><label for="qom'+i+'">Monto S/</label><input id="qom'+i+'" inputmode="decimal" class="num" value="'+esc(o.monto)+'"></div></div>'; }).join('');
    otros.forEach(function(o,i){ $('qoc'+i).oninput=function(){ o.concepto=this.value; extra(); recalcular(); }; $('qom'+i).oninput=function(){ o.monto=this.value; extra(); recalcular(); }; }); };
  var sinDias = function(){ return tipo==='taxi' || md==='dos_dias'; };
  var visibles = function(){ $('bno').classList.toggle('oculto', sinDias()); $('bdi').classList.toggle('oculto', sinDias()); $('bho').classList.toggle('oculto', tipo==='excursion');
    $('qpvl').textContent = md==='solo_ida' ? 'Peajes del regreso vacío S/' : 'Peajes de vuelta S/';
    $('bvac').classList.toggle('oculto', desdeBase());
    $('qmdh').textContent = COT_MOD[md][1] + (md==='dos_dias' ? ' Cuenta 2 jornadas del conductor.' : ''); pintarEspera(); };
  /** Lo que verá el cliente sobre la espera. Las horas incluidas van dentro del precio; lo adicional se cobra aparte a S/ fijo. */
  var pintarEspera = function(){ formula().then(function(F){ if(!$('qesp')) return;
    var L = F.politicaEspera(OP ? P.espera : P.parametros, {tipo:tipo, horas_espera:$('qho').value});
    $('qesp').innerHTML = L.length ? '<b>Así lo verá el cliente</b><ul>'+L.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>'+(OP?'':'<small>Las horas incluidas se suman al costo con el margen elegido. La tolerancia, el cobro por hora adicional y el tope se cambian en Parámetros → Espera.</small>') : ''; }); };
  var datos = function(){ return {tipo:tipo, modalidad:md, ida_vuelta:md!=='solo_ida', km_ida:$('qkm').value, km_base_origen:desdeBase()?0:$('qb1').value, km_destino_base:desdeBase()?'':$('qb2').value, km_extra:$('qkx').value,
    origen:$('qor').value, destino:$('qde').value,
    dias:sinDias()?1:$('qdi').value, noches:sinDias()?0:$('qno').value, horas_espera:tipo==='excursion'?0:$('qho').value, pasajeros:$('qpa').value, peajes_ida:$('qpe').value, peajes_vuelta:$('qpv').value, otros:otros,
    precio_galon:$('qdg').value, bono:$('qbo')?$('qbo').value:undefined}; };
  var linkMaps = function(){ var o=$('qor').value.trim(), d=$('qde').value.trim(); $('qmaps').href = (o&&d) ? 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+encodeURIComponent(o+', Perú')+'&destination='+encodeURIComponent(d+', Perú') : '#'; };
  var conocida = function(){ vacMan = {qb1:false, qb2:false}; visibles(); var o=$('qor').value.trim().toLowerCase(), de=$('qde').value.trim().toLowerCase(), r=P.rutas.filter(function(z){ return z.origen.toLowerCase()===o && z.destino.toLowerCase()===de; })[0], inv = !r && P.rutas.filter(function(z){ return z.origen.toLowerCase()===de && z.destino.toLowerCase()===o; })[0];
    if(r||inv){ var km = (r||inv).km, pi = r ? r.peajes_ida : inv.peajes_vuelta, pv = r ? r.peajes_vuelta : inv.peajes_ida;
      $('qkm').value = km; $('qpe').value = pi||0; $('qpv').value = pv||0; ['qkm','qpe','qpv'].forEach(function(id){ guardarCampo({target:$(id)}); }); $('qrk').innerHTML = 'Ruta conocida: <b>'+km+' km</b> · peaje de ida S/ '+(pi||0)+' · de vuelta S/ '+(pv||0)+' · ≈ '+Math.round(km/(vel||31)*10)/10+' h de manejo por tramo.'; }
    linkMaps(); recalcular(); };
  var calcularKm = function(){
    var o=$('qor').value.trim(), d=$('qde').value.trim(); if(!o||!d){ $('qrk').textContent='Escribe origen y destino.'; return; }
    $('qcalc').disabled = true; $('qrk').textContent = 'Buscando la ruta en el mapa…';
    api('/api/cotizador/distancia',{method:'POST',body:{origen:o, destino:d}}).then(function(r){ $('qcalc').disabled=false;
      if(!r.ok){ $('qrk').innerHTML = '<span class="warn">'+esc(r.error)+'</span>'; return; }
      var z = r.data; $('qkm').value = z.km; if(z.peajes_ida!==null){ $('qpe').value = z.peajes_ida; $('qpv').value = z.peajes_vuelta; } ['qkm','qpe','qpv'].forEach(function(id){ guardarCampo({target:$(id)}); });
      $('qrk').innerHTML = (z.fuente==='guardada' ? 'Ruta conocida' : 'Calculado con OpenStreetMap')+': <b>'+z.km+' km</b> por tramo · ≈ '+z.horas+' h de manejo'+(z.fuente==='mapa'?'. Verifícalo con «Ver en Google Maps» y anota los peajes: al guardar, la ruta queda recordada.':' · peajes ida S/ '+z.peajes_ida+' · vuelta S/ '+z.peajes_vuelta+'.');
      $('qkm').dispatchEvent(new Event('input',{bubbles:true})); recalcular(); });
  };
  var tCalc = null;
  var recalcularOp = function(){
    autoVacios(); var dd = datos(); if(!(Number(String(dd.km_ida).replace(',','.'))>0)){ $('qres').innerHTML='<p class="vacio">Escribe los km de ida o pulsa «Calcular km».</p>'; return; }
    clearTimeout(tCalc); tCalc = setTimeout(function(){ api('/api/cotizador/calcular',{method:'POST',body:dd}).then(function(r){
      if(!r.ok || !$('qres')) return; var z = r.data; pintarTramos(z.km, z.km_vacios);
      var card = function(k){ var pl = z.planes[k]; return '<div class="plan-c plan-'+k+'"><div class="plan-h"><b>'+PLAN_TXT[k]+'</b></div><p style="padding:10px 12px 0;margin:0"><b class="num" style="font-size:24px">'+soles0(pl.precio)+'</b></p><p class="ayuda">'+(pl.por_pasajero?soles(pl.por_pasajero)+' por pasajero'+(z.tramos>1&&pl.por_tramo?' · '+soles(pl.por_tramo)+' por tramo':''):'')+'</p></div>'; };
      $('qres').innerHTML = '<div class="kpis" style="margin-bottom:10px"><div class="kpi"><small>Recorrido</small><b class="num">'+z.km+' km</b><span class="d">≈ '+z.horas_manejo+' h de manejo'+(z.salidas>1?' · '+z.salidas+' salidas':'')+'</span></div><div class="kpi"><small>Km vacíos</small><b class="num">'+z.km_vacios+' km</b><span class="d">'+(z.km_vacios?z.pct_vacios+' % del recorrido':'Siempre con pasajeros')+'</span></div></div>'+
        '<div class="planes2">'+card('estandar')+card('premium')+'</div><p class="ayuda" style="margin-top:8px">Precios oficiales de Villa Azul. Si el cliente pide otro precio, un administrador lo ajusta.</p>'; }); }, 450);
  };
  var recalcular = function(){ if(OP) return recalcularOp(); formula().then(function(F){
    autoVacios(); var dd = datos(); if(!(Number(String(dd.km_ida).replace(',','.'))>0)){ $('qres').innerHTML='<p class="vacio">Escribe los km de ida o pulsa «Calcular km».</p>'; return; }
    var r = F.calcular(P.parametros, dd); S.cot.res = r; pintarTramos(r.km, r.km_vacios);
    var monto = function(cl){ return (r.estandar.lineas.filter(function(l){ return l.clave===cl; })[0]||{}).monto||0; };
    var ayudaPlan = function(pr, pl){ return (r.pasajeros?soles(pr/r.pasajeros)+' por pasajero'+(r.tramos>1?' ('+soles(pr/r.pasajeros/r.tramos)+' por tramo)':'')+' · ':'')+'margen '+(pr?Math.round((pr-pl.costo)/pr*100):0)+' %'; };
    if($('qbs')) $('qbs').textContent = r.bono_sugerido ? 'Sugerido por ser viaje largo: S/ '+r.bono_sugerido+'. Déjalo vacío para usarlo, o escribe otro monto (0 = sin bono).' : 'Viaje corto: sin bono automático. Escribe un monto si este viaje lo amerita.';
    ['estandar','premium'].forEach(function(k){ if(!manual[k]) precios[k] = r[k].precios[nivel]; });
    var tar = P.tarifas.filter(function(t){ return t.origen.toLowerCase()===$('qor').value.trim().toLowerCase() && t.destino.toLowerCase()===$('qde').value.trim().toLowerCase(); })[0];
    var card = function(k){ var pl = r[k], pr = Number(String(precios[k]).replace(',','.'))||0;
      return '<div class="plan-c plan-'+k+'"><div class="plan-h"><b>'+PLAN_TXT[k]+'</b><small>Costo '+soles0(pl.costo)+'</small></div><div class="campo" style="margin-top:8px"><label for="qp_'+k+'">Precio al cliente</label><input id="qp_'+k+'" inputmode="decimal" class="num" value="'+esc(precios[k])+'"></div>'+
        '<p class="ayuda">'+ayudaPlan(pr, pl)+'</p></div>'; };
    var prE = Number(String(precios.estandar).replace(',','.'))||0;
    $('qres').innerHTML = '<div class="kpis k4" style="margin-bottom:10px"><div class="kpi"><small>Recorrido</small><b class="num">'+r.km+' km</b><span class="d">≈ '+r.horas_manejo+' h de manejo'+(r.salidas>1?' · '+r.salidas+' salidas':'')+'</span></div>'+
      '<div class="kpi"><small>Km vacíos</small><b class="num">'+r.km_vacios+' km</b><span class="d">'+(r.km_vacios?r.pct_vacios+' % del recorrido':'Siempre con pasajeros')+'</span></div>'+
      '<div class="kpi"><small>Diésel</small><b class="num">'+r.galones+' gal</b><span class="d">'+soles0(monto('combustible'))+' en total</span></div>'+
      '<div class="kpi"><small>Conductor</small><b class="num">'+soles0(monto('conductor'))+'</b><span class="d">S/ '+(Number(P.parametros.conductor_km)||0).toFixed(2)+' por km recorrido</span></div></div>'+
      '<span class="etq">Margen sobre el precio</span><div class="seg seg-nivel" role="group" aria-label="Margen">'+['minimo','recomendado','alto'].map(function(n){ return '<button type="button" data-nv="'+n+'" aria-pressed="'+(nivel===n)+'" aria-label="'+NIVEL_TXT[n]+' '+r.margenes[n]+' %"><span>'+lc(NIVEL_TXT[n], NIVEL_CORTO[n])+'</span><small>'+r.margenes[n]+' %</small></button>'; }).join('')+'</div>'+
      '<div class="planes2" style="margin-top:12px">'+card('estandar')+card('premium')+'</div>'+
      (prE && r.km ? '<p class="ayuda" style="margin-top:8px">Estándar: '+soles(prE/r.km)+' por km recorrido · costo '+soles(r.costo_km)+' por km'+(r.km_vacios?' · el '+r.pct_vacios+' % del recorrido va vacío y ya está en el costo':'')+'.</p>' : '')+
      (tar && Number(dd.pasajeros)?'<p class="ayuda">Referencia: como pasajes de ruta ('+soles(tar.tarifa)+' × '+dd.pasajeros+') serían '+soles(tar.tarifa*Number(dd.pasajeros)*r.tramos)+'.</p>':'')+
      '<details style="margin-top:10px"><summary>Desglose de costos</summary><table class="tabla"><tbody>'+r.premium.lineas.map(function(l){ var soloP = l.clave==='snacks'||l.clave==='wifi'; return '<tr><td>'+esc(l.concepto)+(soloP?' <span class="chip-est abierta">solo Premium</span>':'')+'<br><small class="ayuda">'+esc(l.detalle)+'</small></td><td class="n">'+soles(l.monto)+'</td></tr>'; }).join('')+
      '<tr><td><b>Total Estándar</b></td><td class="n"><b>'+soles(r.estandar.costo)+'</b></td></tr><tr><td><b>Total Premium</b></td><td class="n"><b>'+soles(r.premium.costo)+'</b></td></tr></tbody></table></details>';
    $('qres').querySelectorAll('[data-nv]').forEach(function(b){ b.onclick=function(){ nivel=b.dataset.nv; manual={estandar:false, premium:false}; extra(); recalcular(); }; });
    ['estandar','premium'].forEach(function(k){ $('qp_'+k).oninput=function(){ manual[k]=true; precios[k]=this.value; this.closest('.plan-c').querySelector('.ayuda').textContent = ayudaPlan(Number(String(this.value).replace(',','.'))||0, r[k]); }; });
  }); };
  pintarOtros(); visibles(); linkMaps();
  restaurarBorrador(); recalcular();
  $('vista').querySelectorAll('[data-ct]').forEach(function(b){ b.onclick=function(){ tipo=b.dataset.ct; $('vista').querySelectorAll('[data-ct]').forEach(function(z){ z.setAttribute('aria-pressed', z===b); }); visibles(); extra(); recalcular(); }; });
  $('vista').querySelectorAll('[data-md]').forEach(function(b){ b.onclick=function(){ md=b.dataset.md; $('vista').querySelectorAll('[data-md]').forEach(function(z){ z.setAttribute('aria-pressed', z===b); }); visibles(); extra(); recalcular(); }; });
  ['qb1','qb2'].forEach(function(id){ $(id).addEventListener('input', function(){ vacMan[id] = $(id).value.trim()!==''; }); });
  ['qkm','qpe','qpv','qdi','qno','qho','qpa','qkx','qdg','qb1','qb2'].concat($('qbo')?['qbo']:[]).forEach(function(id){ $(id).addEventListener('input', recalcular); });
  $('qho').addEventListener('input', pintarEspera);
  $('qor').addEventListener('input', function(){ visibles(); recalcular(); }); $('qde').addEventListener('input', recalcular);
  $('qdg').addEventListener('input', function(){ $('qdg').classList.toggle('cambiado', Number(String($('qdg').value).replace(',','.')) !== Number(galonParam)); });
  $('qor').addEventListener('change', conocida); $('qde').addEventListener('change', conocida); $('qor').addEventListener('input', linkMaps); $('qde').addEventListener('input', linkMaps);
  $('qcalc').onclick = calcularKm;
  $('qadd').onclick = function(){ otros.push({concepto:'', monto:''}); extra(); pintarOtros(); };
  $('cvol').onclick = function(){ if(pre){ S.sol = {vista:'detalle', id:pre.solicitud_id, filtro:'activas'}; ir('solicitudes', true); } else cotLista(); };
  if(pre && !$('qkm').value){ conocida(); if(!$('qkm').value) calcularKm(); }
  if($('apar')) $('apar').onclick = function(e){ e.preventDefault(); cotParametros(); };
  $('qgu').onclick = function(){
    // Antes de guardar y enviar: confirmar el precio del diésel de hoy.
    var dg = Number(String($('qdg').value).replace(',','.'));
    if(!(dg>0)){ $('qerr').textContent='Escribe el precio del diésel de hoy.'; $('qdg').focus(); return; }
    if(!confirm('Antes de guardar: ¿el diésel está hoy a S/ '+dg.toFixed(2)+' por galón?\n\nSi cambió, toca «Cancelar» y corrígelo en «Precio del diésel hoy».')){ $('qdg').focus(); $('qdg').select(); return; }
    var body = Object.assign(datos(), {cliente:$('qcl').value, cliente_tel:$('qct').value, origen:$('qor').value, destino:$('qde').value, fecha_servicio:$('qfe').value, notas:$('qnt').value, nivel:nivel,
      precio_final:$('qp_estandar')?$('qp_estandar').value:'', precio_final_premium:$('qp_premium')?$('qp_premium').value:'', solicitud_id:pre?pre.solicitud_id:undefined});
    $('qgu').disabled = true;
    api(c?'/api/cotizaciones/'+c.id:'/api/cotizaciones', {method:c?'PATCH':'POST', body:body}).then(function(r){ $('qgu').disabled=false;
      if(!r.ok){ $('qerr').textContent = r.error; return; }
      borrarBorrador(); toast(c?'Cotización actualizada':'Cotización '+r.data.codigo+' guardada');
      api('/api/cotizaciones').then(function(l){ if(l.ok) S.cotL=l.data; api('/api/cotizador').then(function(p){ if(p.ok) S.cotP=p.data; }); cotDetalle(r.data.id); }); });
  };
}
function cotDetalle(id){
  S.cot = {vista:'detalle', id:id}; recordarVista();
  api('/api/cotizaciones/'+id).then(function(r){
    if(!r.ok){ toast(r.error,true); cotLista(); return; }
    var c = r.data, e = c.vencida ? COT_EST.vencida : COT_EST[c.estado], url = location.origin+'/cotizacion?c='+c.token, d = c.datos, pax = d.pasajeros;
    var h = '<button type="button" class="enlace" id="cvol" style="padding:4px 0">← Cotizaciones</button><div class="saludo"><h2>'+esc(c.codigo)+' · '+esc(c.cliente||'Sin nombre')+'</h2><p>'+esc(COT_TIPO[c.tipo])+' · '+esc(c.origen)+' → '+esc(c.destino)+' ('+COT_MOD[cotModalidad(d)][0].toLowerCase()+') <span class="chip-est '+e[1]+'">'+e[0]+'</span>'+(c.plan_elegido?' <span class="chip-est abierta">El cliente eligió '+PLAN_TXT[c.plan_elegido]+'</span>':'')+'</p></div>';
    var OP = !esMando(S.yo);
    var tarj = function(k, precio, costo){ return '<div class="kpi'+(c.plan_elegido===k?' elegida':'')+'"><small>'+PLAN_TXT[k]+(c.plan_elegido===k?' · elegido':'')+'</small><b class="num">'+soles(precio)+'</b><span class="d">'+(pax?soles(precio/pax)+' por pasajero':'')+(OP?'':' · utilidad '+soles0(precio-costo))+'</span></div>'; };
    var cP = !OP && c.resultado.premium ? c.resultado.premium.costo : c.costo;
    if(!OP && c.creado_por) h += '<p class="ayuda" style="margin:-6px 0 10px">Cotizó '+esc(c.creado_por)+(d.precio_galon && S.cotP && S.cotP.parametros && Number(S.cotP.parametros.precio_galon) !== Number(d.precio_galon) ? ' · usó diésel a S/ '+d.precio_galon+' (parámetro S/ '+S.cotP.parametros.precio_galon+')' : '')+(c.resultado.bono?' · bono del conductor '+soles(c.resultado.bono):'')+'</p>';
    if(!OP && c.solicitud_id) h += '<p class="ayuda" style="margin:-6px 0 10px">Viene de una solicitud del QR. <a href="#" id="csol">Ver la solicitud</a></p>';
    h += '<div class="kpis">'+tarj('estandar', c.precio_final, c.costo)+(c.precio_final_premium?tarj('premium', c.precio_final_premium, cP):'')+'</div>';
    h += '<div class="card" style="margin-top:12px"><dl class="ficha"><dt>Fecha</dt><dd>'+esc(c.fecha_servicio?fechaExc(c.fecha_servicio,true):'Por definir')+'</dd><dt>Recorrido</dt><dd>'+c.resultado.km+' km'+(c.resultado.km_vacios?' ('+c.resultado.km_vacios+' vacíos)':'')+(c.resultado.salidas>1?' · '+c.resultado.salidas+' salidas':'')+(c.resultado.horas_manejo?' · ≈ '+c.resultado.horas_manejo+' h de manejo':'')+' · '+c.resultado.dias+' día(s) · '+c.resultado.noches+' noche(s)</dd><dt>Pasajeros</dt><dd>'+(pax||'—')+'</dd><dt>Válida hasta</dt><dd>'+esc(c.valida_hasta)+'</dd>'+(c.notas?'<dt>Notas</dt><dd>'+esc(c.notas)+'</dd>':'')+'</dl></div>';
    h += '<div class="compartir"><b>Enlace para el cliente</b><p class="ayuda">El cliente ve los dos servicios con sus precios y elige uno. Nunca ve tus costos ni tu margen.</p><code>'+esc(url)+'</code><div class="botones">'+(c.cliente_tel?'<a class="btn" id="cwa" target="_blank" rel="noopener" href="https://wa.me/'+esc(c.cliente_tel)+'?text='+encodeURIComponent('Hola'+(c.cliente?' '+c.cliente:'')+', te envío la cotización '+c.codigo+' de Villa Azul · Turismo & Excursiones:\n'+COT_TIPO[c.tipo]+' '+c.origen+' → '+c.destino+'\nEstándar: '+soles(c.precio_final)+(c.precio_final_premium?'\nPremium: '+soles(c.precio_final_premium):'')+'\nVálida hasta el '+c.valida_hasta+'.'+((c.politica_espera||[]).length?'\n\n⏱️ '+c.politica_espera.join(' '):'')+'\n\nElige tu servicio aquí: '+url)+'">Enviar por WhatsApp</a>':'')+'<button type="button" class="btn sec" id="ccp">Copiar enlace</button><a class="btn sec" target="_blank" rel="noopener" href="'+esc(url)+'">Ver como cliente</a></div></div>';
    h += '<div class="acciones">';
    if(OP){
      if(c.estado!=='aceptada' && !c.excursion_id) h += '<button type="button" class="btn sec ancho" id="cedi">'+ico('lapiz')+'Editar</button>'+(c.estado!=='rechazada'?'<button type="button" class="btn sec ancho" id="crec">Marcar rechazada</button>':'');
      if(c.estado==='aceptada') h += '<p class="ayuda" style="text-align:center">El cliente eligió '+PLAN_TXT[c.plan_elegido]+'. Un administrador confirma y crea la excursión.</p>';
    }
    else if(c.excursion_id) h += '<button type="button" class="btn ancho" id="cexc">'+ico('van')+'Ver la excursión creada</button>';
    else {
      if(c.plan_elegido) h += '<button type="button" class="btn ancho" data-conv="'+c.plan_elegido+'">'+ico('check')+'Crear la excursión · '+PLAN_TXT[c.plan_elegido]+'</button>';
      else h += '<button type="button" class="btn ancho" data-conv="estandar">'+ico('check')+'Aceptó Estándar: crear la excursión</button>'+(c.precio_final_premium?'<button type="button" class="btn ancho" data-conv="premium">'+ico('check')+'Aceptó Premium: crear la excursión</button>':'');
      if(c.estado!=='rechazada') h += '<button type="button" class="btn sec ancho" id="crec">Marcar rechazada</button>';
      h += '<button type="button" class="btn sec ancho" id="cedi">'+ico('lapiz')+'Editar</button><button type="button" class="btn peligro ancho" id="celi">'+ico('basura')+'Eliminar</button>';
    }
    h += '</div>';
    $('vista').innerHTML = h;
    $('cvol').onclick = function(){ S.cot={vista:'lista'}; vCotizador(); };
    if($('csol')) $('csol').onclick = function(e){ e.preventDefault(); S.sol = {vista:'detalle', id:c.solicitud_id, filtro:'activas'}; ir('solicitudes', true); };
    $('ccp').onclick = function(){ (navigator.clipboard?navigator.clipboard.writeText(url):Promise.reject()).then(function(){ toast('Enlace copiado'); }, function(){ prompt('Copia el enlace:', url); }); };
    if($('cwa')) $('cwa').addEventListener('click', function(){ if(c.estado==='borrador') api('/api/cotizaciones/'+c.id+'/estado',{method:'POST',body:{estado:'enviada'}}); });
    if($('cexc')) $('cexc').onclick = function(){ S.excId = c.excursion_id; S.excTab='resumen'; S.vista='excursiones'; pintarApp(); };
    $('vista').querySelectorAll('[data-conv]').forEach(function(b){ b.onclick = function(){ var plan=b.dataset.conv, mt = plan==='premium'?c.precio_final_premium:c.precio_final;
      if(!confirm('¿Crear la excursión por contrato, servicio '+PLAN_TXT[plan]+', por '+soles(mt)+'?')) return;
      api('/api/cotizaciones/'+c.id+'/convertir',{method:'POST',body:{plan:plan}}).then(function(r2){ if(!r2.ok){ toast(r2.error,true); return; } toast('Excursión creada desde '+c.codigo); S.excId=r2.data.excursion_id; S.excTab='datos'; S.vista='excursiones'; pintarApp(); }); }; });
    if($('crec')) $('crec').onclick = function(){ formMotivo('Marcar rechazada', 'Anota por qué no se aceptó: te ayuda a ajustar precios.', 'Guardar', function(m){ return api('/api/cotizaciones/'+c.id+'/estado',{method:'POST',body:{estado:'rechazada',motivo:m}}); }, 'Cotización marcada como rechazada', function(){ cotDetalle(c.id); }); };
    if($('cedi')) $('cedi').onclick = function(){ cotForm(c); };
    if($('celi')) $('celi').onclick = function(){ if(!confirm('¿Eliminar '+c.codigo+'?')) return; api('/api/cotizaciones/'+c.id,{method:'DELETE'}).then(function(r2){ if(!r2.ok){ toast(r2.error,true); return; } toast('Cotización eliminada'); S.cot={vista:'lista'}; vCotizador(); }); };
  });
}
var COT_PAR = [
  ['Combustible', [['precio_galon','Precio del diésel','S/ por galón · cámbialo cuando suba o baje'],['rendimiento_km_gal','Rendimiento de la Hiace','km por galón']]],
  ['Conductor', [['conductor_km','Pago al conductor','S/ por km · hoy S/ 120 ÷ 372 km = 0.3226'],['viatico_dia','Alimentación','S/ por día'],['hospedaje_noche','Hospedaje','S/ por noche fuera']]],
  ['Van', [['cochera_noche','Cochera','S/ por noche fuera'],['desgaste_km','Desgaste (llantas, aceite)','S/ por km'],['emergencia','Fondo de emergencia','S/ por viaje · parchado de llanta'],['velocidad_promedio','Velocidad real promedio','km/h · 186 km en 6 h = 31']]],
  ['Espera (taxi y transporte privado)', [['espera_hora','Costo por hora incluida','S/ · va dentro del precio con margen; el cliente no la ve aparte'],['tolerancia_min','Tolerancia sin costo','minutos · si no hay horas incluidas'],['espera_extra_hora','Hora adicional','S/ que paga el cliente, sin margen · hoy 10'],['espera_tope_h','Tope de espera adicional','horas · luego se coordina otro horario · 0 = sin tope']]],
  ['Bono del conductor (viajes largos)', [['bono_desde_km','Desde cuántos km recorridos','km ida + vuelta · 0 = sin bono automático'],['bono_por_dia','Bono por día de servicio','S/ · se suma solo en viajes largos']]],
  ['Servicio Premium', [['snack_pax_dia','Refrigerio','S/ por pasajero por día'],['wifi_pax_viaje','WiFi a bordo','S/ por pasajero por viaje · igual si dura 1 o 4 días · sin margen encima']]],
  ['Precios · margen sobre el precio', [['margen_minimo','Margen mínimo','% · hoy 30'],['margen_objetivo','Margen recomendado','% · hoy 40'],['margen_premium','Margen alto','% · hoy 50'],['validez_dias','Validez de la cotización','días']]]
];
function cotParametros(){
  var P = S.cotP, h = '<h2 id="hoja-t">Parámetros del cotizador</h2><p class="desc">Costos fijos que casi no cambian. Modifícalos solo cuando la situación lo amerite: alza del combustible, nuevo pago al conductor, etc. Cada cambio queda registrado.</p>';
  COT_PAR.forEach(function(g){ h += '<span class="etq" style="margin-top:18px">'+g[0]+'</span>'+g[1].map(function(x){ var s = P.sugeridos[x[0]], guardado = P.parametros._guardados.indexOf(x[0])>=0;
    return '<div class="campo"><label for="pp_'+x[0]+'">'+x[1]+' <small style="font-weight:500;color:var(--muted)">('+x[2]+')'+(guardado?'':' · valor inicial')+'</small></label><input id="pp_'+x[0]+'" inputmode="decimal" class="num" value="'+esc(P.parametros[x[0]])+'">'+
      (s?'<button type="button" class="btn-mini" data-sug="'+x[0]+'" data-val="'+s.valor+'" style="margin-top:6px">Usar dato real: '+s.valor+' · '+esc(s.base)+'</button>':'')+'</div>'; }).join(''); });
  h += '<div class="campo"><label for="pp_wa">WhatsApp de la empresa <small style="font-weight:500;color:var(--muted)">(recibe la elección del cliente)</small></label><input id="pp_wa" inputmode="tel" value="'+esc(String(P.whatsapp_empresa||'').replace(/^51/,''))+'"></div>'+botonesHoja('Guardar parámetros');
  abrirHoja(h);
  hoja.querySelectorAll('[data-sug]').forEach(function(b){ b.onclick=function(){ $('pp_'+b.dataset.sug).value = b.dataset.val; }; });
  $('ok').onclick = function(){ var body = {whatsapp_empresa:$('pp_wa').value}; COT_PAR.forEach(function(g){ g[1].forEach(function(x){ body[x[0]] = $('pp_'+x[0]).value.replace(',','.'); }); });
    $('ok').disabled=true; api('/api/cotizador/parametros',{method:'POST',body:body}).then(function(r){ $('ok').disabled=false; if(!r.ok){ $('er').textContent=r.error; return; } S.cotP=r.data; hoja.close(); toast('Parámetros guardados'); if(S.cot.vista==='nueva') cotForm(S.cot.editar||null); }); };
}

/* ════════════ Compartir el portal con un toque ════════════
   Cada botón lleva su propia marca (?src=…) para saber en «Solicitudes» por dónde llegó cada cliente. */
var MSJ_PORTAL = '🚐 ¿Planeas un viaje con tu familia, tu promoción o tu grupo?\nArma tu excursión o transporte privado en Villa Azul: eliges fechas y cuántos viajan, y te enviamos la cotización por WhatsApp.\n\nCotiza aquí 👉 ';
function urlPortal(src){ return location.origin+'/viaja?src='+src; }
function msjPortal(){ return ls('va_msj_portal') || MSJ_PORTAL; }
function barraCompartir(){
  return '<div class="compartir-portal"><div class="cp-t"><b>Comparte tu portal de viajes</b><code>'+esc(location.host)+'/viaja</code></div><div class="cp-b">'+
    '<a class="cp wa" id="cpWa" target="_blank" rel="noopener" href="#"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.2-.2-.5-.3Z"/></svg>WhatsApp</a>'+
    '<a class="cp fb" id="cpFb" target="_blank" rel="noopener" href="#"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.2H7.3V14h2.8v8Z"/></svg>Facebook</a>'+
    '<button type="button" class="cp" id="cpIg">Copiar para Instagram o TikTok</button>'+
    (navigator.share?'<button type="button" class="cp" id="cpMas">Más opciones</button>':'')+
    '<button type="button" class="cp" id="cpQr">'+ico('qr')+'QR</button><button type="button" class="cp enl" id="cpEd">Editar mensaje</button></div></div>';
}
function activarCompartir(){
  if(!$('cpWa')) return;
  var pinta = function(){ $('cpWa').href = 'https://wa.me/?text='+encodeURIComponent(msjPortal()+urlPortal('wa'));
    $('cpFb').href = 'https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(urlPortal('fb')); };
  pinta();
  $('cpIg').onclick = function(){ var t = msjPortal()+urlPortal('ig'); (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){ toast('Copiado: pégalo en tu biografía, historia o descripción'); }, function(){ prompt('Copia el texto:', t); }); };
  if($('cpMas')) $('cpMas').onclick = function(){ navigator.share({title:'Villa Azul · Arma tu viaje', text:msjPortal(), url:urlPortal('wa')}).catch(function(){}); };
  $('cpQr').onclick = hojaQR;
  $('cpEd').onclick = function(){
    abrirHoja('<h2 id="hoja-t">Mensaje para compartir</h2><p class="desc">Es el texto que acompaña al enlace en WhatsApp, Instagram y TikTok. El enlace se agrega solo al final.</p><div class="campo"><label for="cpTx">Mensaje</label><textarea id="cpTx" maxlength="600" style="min-height:150px">'+esc(msjPortal())+'</textarea></div>'+
      '<button type="button" class="btn-mini" id="cpRe">Volver al mensaje original</button>'+botonesHoja('Guardar mensaje'));
    $('cpRe').onclick = function(){ $('cpTx').value = MSJ_PORTAL; };
    $('ok').onclick = function(){ var v = $('cpTx').value.trim(); ls('va_msj_portal', v && v!==MSJ_PORTAL.trim() ? v.replace(/\s*$/,' ') : null); hoja.close(); pinta(); toast('Mensaje guardado'); };
  };
}

/* ════════════ Solicitudes desde el QR ════════════
   El cliente arma su viaje en /viaja → llega aquí con aviso → un administrador la abre (queda «en revisión»),
   arma la cotización con los datos ya puestos, ajusta precios y la envía por WhatsApp. El cliente elige Estándar o Premium. */
var SOL_ET = {nueva:['Nueva','nuevo'], revisando:['En revisión','en_ruta'], cotizada:['Cotizada, sin enviar','borrador'], enviada:['Enviada al cliente','borrador'], aceptada:['Aceptada','abierta'], rechazada:['Rechazada','anulada'], vencida:['Vencida','anulada'], descartada:['Descartada','anulada']};
var SOL_PREF = {estandar:'Estándar', premium:'Premium', ambos:'Estándar y Premium'};
var SOL_TIPO = {excursion:'Excursión', privado:'Transporte privado'};
var SOL_CANAL = {qr:'QR', wa:'WhatsApp', fb:'Facebook', ig:'Instagram', tt:'TikTok', web:'Web'};
var SOL_FILTROS = [['activas','Activas',['nueva','revisando','cotizada','enviada']],['atender','Por atender',['nueva','revisando']],['aceptada','Aceptadas',['aceptada']],['cerradas','Cerradas',['rechazada','vencida','descartada']],['todas','Todas',null]];
S.sol = {vista:'lista', filtro:'activas'};
function solDia(s){ var m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return '—'; var t = new Date(+m[1],m[2]-1,+m[3]).toLocaleDateString('es-PE',{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,''); return t.charAt(0).toUpperCase()+t.slice(1); }
function solNoches(s){ return s.ida_vuelta && s.fecha_retorno ? Math.round((Date.parse(s.fecha_retorno+'T12:00:00')-Date.parse(s.fecha_ida+'T12:00:00'))/864e5) : 0; }
function solHoras(h){ if(h===null||h===undefined) return '—'; return h<1 ? Math.max(1,Math.round(h*60))+' min' : h<48 ? (Math.round(h*10)/10)+' h' : Math.round(h/24)+' días'; }
function solEspera(s){ return (Date.now() - Date.parse(String(s.creado_en).replace(' ','T')+'-05:00'))/36e5; }
function solFechas(s){ return solDia(s.fecha_ida)+(s.hora_salida?' '+s.hora_salida:'')+(s.ida_vuelta?' → '+solDia(s.fecha_retorno):' · solo ida'); }
function vSolicitudes(){
  if(!navigator.onLine) return sinSenal(null, 'Las solicitudes se ven con señal.');
  if(S.sol.vista==='detalle' && S.sol.id) return solDetalle(S.sol.id);
  if(!S.solL) $('vista').innerHTML = '<p class="vacio">Cargando solicitudes…</p>';
  api('/api/solicitudes').then(function(r){
    if(!r.ok){ $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    S.solL = r.data; solLista();
  });
}
function solBarras(pares, total){ if(!pares.length) return '<p class="ayuda">Aún sin datos.</p>'; var max = Math.max.apply(null, pares.map(function(p){ return p[1]; }));
  return pares.map(function(p){ return '<div class="mini-bar"><span>'+esc(p[0])+'</span><i style="--w:'+Math.max(4,Math.round(p[1]/max*100))+'%"></i><b class="num">'+p[1]+'</b></div>'; }).join(''); }
function solLista(){
  S.sol = {vista:'lista', filtro:S.sol.filtro||'activas'}; recordarVista();
  var L = S.solL.solicitudes, R = S.solL.resumen, f = SOL_FILTROS.filter(function(x){ return x[0]===S.sol.filtro; })[0] || SOL_FILTROS[0];
  var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Solicitudes de viaje</h2><p>Lo que piden los clientes desde el QR y el enlace /viaja.</p></div><div class="botones"><button type="button" class="btn sec" id="sqr">'+ico('qr')+'QR y enlace</button><a class="btn sec" href="/viaja" target="_blank" rel="noopener">Ver el portal</a></div></div>';
  h += barraCompartir();
  h += '<div class="kpis k4"><div class="kpi'+(R.pendientes && R.mas_antigua_h>R.meta_h?' alerta':'')+'"><small>Por atender</small><b class="num">'+R.pendientes+'</b><span class="d">'+(R.pendientes?'la más antigua espera '+solHoras(R.mas_antigua_h):'todo al día')+'</span></div>'+
    '<div class="kpi"><small>Tiempo de respuesta</small><b class="num">'+solHoras(R.respuesta_mediana_h)+'</b><span class="d">mediana · meta '+R.meta_h+' h'+(R.respuesta_en_meta===null?'':' · '+R.respuesta_en_meta+' % a tiempo')+'</span></div>'+
    '<div class="kpi"><small>Conversión (90 días)</small><b class="num'+(R.conversion?' ok':'')+'">'+(R.conversion===null?'—':R.conversion+' %')+'</b><span class="d">'+R.aceptadas_90+' aceptadas · '+soles0(R.monto_aceptado_90)+'</span></div>'+
    '<div class="kpi"><small>Este mes</small><b class="num">'+R.mes_n+'</b><span class="d">'+R.mes_viajeros+' viajeros pedidos</span></div></div>';
  // Embudo: dónde se quedan las solicitudes.
  var E = R.embudo, perdidas = E.rechazada+E.vencida+E.descartada, etapas = [['nueva','Nuevas'],['revisando','En revisión'],['cotizada','Cotizadas sin enviar'],['enviada','Enviadas al cliente'],['aceptada','Aceptadas']], tot = Math.max(1, L.length);
  h += '<div class="titulo-sec"><h3>Flujo de solicitudes</h3><small class="ayuda">'+L.length+' en total</small></div><div class="card embudo">'+etapas.map(function(e){ return '<button type="button" data-ef="'+e[0]+'"><span>'+e[1]+'</span><i style="--w:'+Math.max(2,Math.round(E[e[0]]/tot*100))+'%" class="e-'+e[0]+'"></i><b class="num">'+E[e[0]]+'</b></button>'; }).join('')+
    '<button type="button" data-ef="cerradas"><span>Perdidas o descartadas</span><i style="--w:'+Math.max(2,Math.round(perdidas/tot*100))+'%" class="e-perdida"></i><b class="num">'+perdidas+'</b></button>'+
    (R.cierre!==null?'<p class="ayuda" style="margin-top:8px">De las cotizaciones que el cliente ya respondió, se cierra el '+R.cierre+' %. '+(R.premium_pref?R.premium_pref+' cliente(s) pidieron Premium en 90 días.':'')+'</p>':'')+'</div>';
  h += '<div class="chips" style="margin-top:16px" role="group" aria-label="Filtro">'+SOL_FILTROS.map(function(x){ var n = x[2] ? L.filter(function(s){ return x[2].indexOf(s.etapa)>=0; }).length : L.length; return '<button type="button" class="chip" data-sf="'+x[0]+'" aria-pressed="'+(x[0]===f[0])+'">'+x[1]+' <span class="num" style="opacity:.7">'+n+'</span></button>'; }).join('')+'</div>';
  var lista = f[2] ? L.filter(function(s){ return f[2].indexOf(s.etapa)>=0; }) : L;
  h += '<div style="margin-top:12px">'+(lista.length ? lista.map(function(s){ var e = SOL_ET[s.etapa], pend = s.etapa==='nueva'||s.etapa==='revisando', esp = solEspera(s);
    return '<button type="button" class="exc-item" data-sol="'+esc(s.id)+'"><b>'+esc(s.codigo)+' · '+esc(s.cliente)+'</b><span class="chip-est '+e[1]+'">'+e[0]+'</span>'+(pend&&esp>R.meta_h?'<span class="chip-est nuevo">Responder ya</span>':'')+
      '<small>'+esc(SOL_TIPO[s.tipo])+' · '+esc(s.origen)+(s.ida_vuelta?' ⇄ ':' → ')+esc(s.destino)+' · '+esc(solFechas(s))+'</small><div class="datos num"><span>'+s.pasajeros+' viajero(s)</span><span>Pide '+SOL_PREF[s.servicio_pref]+'</span>'+(s.recorrido_interno?'<span>Recorrido interno</span>':'')+
      (s.cotizacion?'<span>'+esc(s.cotizacion.codigo)+' · Est. <b>'+soles0(s.cotizacion.precio_final)+'</b>'+(s.cotizacion.precio_final_premium?' · Prem. <b>'+soles0(s.cotizacion.precio_final_premium)+'</b>':'')+'</span>':'')+'<span>'+(pend?'espera ':'llegó hace ')+solHoras(esp)+'</span><span>'+(SOL_CANAL[s.canal]||'Web')+'</span></div></button>'; }).join('')
    : '<div class="card"><p class="vacio">'+(L.length?'No hay solicitudes con este filtro.':'Aún no llegan solicitudes. Comparte el QR o el enlace /viaja con tus clientes.')+'</p></div>')+'</div>';
  h += '<div class="titulo-sec"><h3>Demanda (90 días)</h3></div><div class="dos-g demanda"><div class="card"><b>Destinos más pedidos</b>'+solBarras(R.destinos)+'</div><div class="card"><b>Por dónde llegan</b>'+solBarras(R.canales)+'</div><div class="card"><b>Meses de viaje pedidos</b>'+solBarras(R.meses.map(function(m){ var d = new Date(+m[0].slice(0,4), +m[0].slice(5,7)-1, 1); return [d.toLocaleDateString('es-PE',{month:'long'})+' '+d.getFullYear(), m[1]]; }))+'</div></div>';
  $('vista').innerHTML = h;
  $('sqr').onclick = hojaQR; activarCompartir();
  $('vista').querySelectorAll('[data-sf]').forEach(function(b){ b.onclick=function(){ S.sol.filtro=b.dataset.sf; solLista(); }; });
  $('vista').querySelectorAll('[data-ef]').forEach(function(b){ b.onclick=function(){ var k=b.dataset.ef; S.sol.filtro = k==='cerradas'?'cerradas':k==='aceptada'?'aceptada':(k==='nueva'||k==='revisando')?'atender':'activas'; solLista(); }; });
  $('vista').querySelectorAll('[data-sol]').forEach(function(b){ b.onclick=function(){ solDetalle(b.dataset.sol); }; });
}
function solDetalle(id){
  S.sol = {vista:'detalle', id:id, filtro:S.sol.filtro}; recordarVista();
  $('vista').innerHTML = '<p class="vacio">Abriendo solicitud…</p>';
  api('/api/solicitudes/'+id).then(function(r){
    if(!r.ok){ toast(r.error,true); S.sol={vista:'lista', filtro:S.sol.filtro}; vSolicitudes(); return; }
    var s = r.data, e = SOL_ET[s.etapa], c = s.cotizacion, n = solNoches(s), cel = String(s.celular||''), celVer = cel.replace(/^51(\d{3})(\d{3})(\d{3})$/,'+51 $1 $2 $3');
    var h = '<button type="button" class="enlace" id="svol" style="padding:4px 0">← Solicitudes</button><div class="saludo"><h2>'+esc(s.codigo)+' · '+esc(s.cliente)+'</h2><p>'+esc(SOL_TIPO[s.tipo])+' · '+esc(s.origen)+(s.ida_vuelta?' ⇄ ':' → ')+esc(s.destino)+' <span class="chip-est '+e[1]+'">'+e[0]+'</span></p></div>';
    if(s.pasajeros > 15) h += '<div class="card" style="border-color:var(--warn);background:var(--warn-soft)"><b class="warn">Pidió '+s.pasajeros+' viajeros</b><p class="ayuda">Supera los 15 asientos de la van: cotiza una segunda unidad o conversa con el cliente.</p></div>';
    // El flujo de trabajo, paso a paso, con quién y cuándo.
    var paso = s.etapa==='descartada' ? -1 : !c ? 1 : c.estado==='borrador' ? 3 : s.etapa==='aceptada' ? 5 : 4;
    var pasos = [['Recibida', solDia(s.creado_en)+' '+String(s.creado_en).slice(11,16)+' · por '+(SOL_CANAL[s.canal]||'Web')],
      ['En revisión', s.visto_por ? s.visto_por+' la abrió '+solHoras((Date.parse(String(s.visto_en).replace(' ','T'))-Date.parse(String(s.creado_en).replace(' ','T')))/36e5)+' después' : 'Nadie la abrió todavía'],
      ['Cotización armada', c ? c.codigo+' por '+(s.cotizado_por||'—')+' · '+solHoras((Date.parse(String(s.cotizado_en).replace(' ','T'))-Date.parse(String(s.creado_en).replace(' ','T')))/36e5)+' después de llegar' : 'Arma la cotización con los datos ya puestos'],
      ['Enviada por WhatsApp', c && c.estado!=='borrador' ? 'El cliente ya tiene su enlace' : 'Revisa precios y envíala desde la cotización'],
      ['El cliente eligió', c && c.plan_elegido ? 'Servicio '+(c.plan_elegido==='premium'?'Premium':'Estándar') : 'Estándar o Premium, desde su enlace']];
    h += '<div class="card" style="margin-top:12px"><ol class="flujo">'+pasos.map(function(p,i){ return '<li data-n="'+(i+1)+'" class="'+(i<paso?'hecho':i===paso?'ahora':'')+'"><div><b>'+p[0]+'</b><small>'+esc(p[1])+'</small></div></li>'; }).join('')+'</ol>'+
      (s.etapa==='descartada'?'<p class="ayuda bad">Descartada: '+esc(s.motivo||'')+'</p>':'')+'</div>';
    var fichas = [['Ruta', s.origen+(s.ida_vuelta?' ⇄ ':' → ')+s.destino], ['Ida', solDia(s.fecha_ida)+(s.hora_salida?', salida '+s.hora_salida:', hora a coordinar')], s.ida_vuelta?['Vuelta', solDia(s.fecha_retorno)+' · '+(n+1)+' día(s), '+n+' noche(s)']:null,
      ['Viajeros', s.pasajeros+' con asiento ('+s.adultos+' adulto(s)'+(s.ninos?', '+s.ninos+' niño(s)':'')+')'+(s.bebes?' + '+s.bebes+' bebé(s) en brazos':'')], s.lugar_recojo?['Recojo', s.lugar_recojo]:null, s.punto_llegada?['Llegada', s.punto_llegada]:null,
      s.recorrido_interno?['Recorrido interno', (s.recorrido_ciudad||s.destino)+' · ≈ '+s.recorrido_horas+' h'+(s.recorrido_detalle?' · '+s.recorrido_detalle:'')]:['Recorrido interno','No'], ['Prefiere', SOL_PREF[s.servicio_pref]], s.detalles?['Detalles', s.detalles]:null,
      ['WhatsApp', celVer], s.email?['Correo', s.email]:null].filter(Boolean);
    h += '<div class="card"><dl class="ficha">'+fichas.map(function(x){ return '<dt>'+esc(x[0])+'</dt><dd style="white-space:pre-wrap">'+esc(x[1])+'</dd>'; }).join('')+'</dl>';
    var saludo = 'Hola '+String(s.cliente).split(' ')[0]+', te saluda Villa Azul · Turismo & Excursiones. Recibimos tu solicitud '+s.codigo+' ('+s.origen+' → '+s.destino+', '+solDia(s.fecha_ida)+'). Estamos preparando tu cotización y te la enviamos por aquí en breve.';
    h += '<div class="botones"><a class="btn sec" target="_blank" rel="noopener" href="https://wa.me/'+esc(cel)+'?text='+encodeURIComponent(saludo)+'">Escribir por WhatsApp</a><a class="btn sec" href="tel:+'+esc(cel)+'">Llamar</a></div></div>';
    h += '<div class="acciones">';
    if(c) h += '<button type="button" class="btn ancho" id="scot">'+ico('tarifa')+(c.estado==='borrador'?'Revisar y enviar '+esc(c.codigo):'Abrir '+esc(c.codigo))+'</button>';
    else if(s.etapa==='descartada') h += '<button type="button" class="btn sec ancho" id="sreab">Volver a abrir</button>';
    else h += '<button type="button" class="btn ancho" id="sarm">'+ico('tarifa')+'Armar cotización</button><button type="button" class="btn sec ancho" id="sdes">Descartar</button>';
    if(!c) h += '<button type="button" class="btn peligro ancho" id="seli">'+ico('basura')+'Eliminar (spam o duplicada)</button>';
    h += '</div>';
    $('vista').innerHTML = h;
    $('svol').onclick = function(){ S.sol={vista:'lista', filtro:S.sol.filtro}; vSolicitudes(); };
    if($('scot')) $('scot').onclick = function(){ S.cot = {vista:'detalle', id:c.id}; ir('cotizador', true); };
    if($('sarm')) $('sarm').onclick = function(){ solACotizar(s); };
    if($('sdes')) $('sdes').onclick = function(){ formMotivo('Descartar '+s.codigo, 'Por ejemplo: fecha sin unidad, ruta que no hacemos, duplicada o el cliente ya no viaja.', 'Descartar', function(m){ return api('/api/solicitudes/'+s.id+'/estado',{method:'POST',body:{estado:'descartada', motivo:m}}); }, 'Solicitud descartada', function(){ solDetalle(s.id); }); };
    if($('sreab')) $('sreab').onclick = function(){ api('/api/solicitudes/'+s.id+'/estado',{method:'POST',body:{estado:'revisando'}}).then(function(r2){ if(!r2.ok){ toast(r2.error,true); return; } toast('Solicitud abierta otra vez'); solDetalle(s.id); }); };
    if($('seli')) $('seli').onclick = function(){ if(!confirm('¿Eliminar '+s.codigo+'? No se puede deshacer.')) return; api('/api/solicitudes/'+s.id,{method:'DELETE'}).then(function(r2){ if(!r2.ok){ toast(r2.error,true); return; } toast('Solicitud eliminada'); S.sol={vista:'lista', filtro:S.sol.filtro}; vSolicitudes(); }); };
  });
}
/** Pasa los datos de la solicitud al cotizador: nadie vuelve a escribir lo que el cliente ya dio. */
function solACotizar(s){
  var n = solNoches(s), notas = [];
  if(s.lugar_recojo) notas.push('Recojo: '+s.lugar_recojo+(s.hora_salida?' a las '+s.hora_salida:'')+'.');
  if(s.punto_llegada) notas.push('Llegada: '+s.punto_llegada+'.');
  if(s.recorrido_interno) notas.push('Incluye recorrido dentro de '+(s.recorrido_ciudad||s.destino)+' (≈ '+s.recorrido_horas+' h)'+(s.recorrido_detalle?': '+s.recorrido_detalle:'')+'.');
  var pre = {solicitud_id:s.id, codigo:s.codigo, servicio_pref:s.servicio_pref, recorrido:s.recorrido_interno?((s.recorrido_ciudad||s.destino)+' ≈ '+s.recorrido_horas+' h'+(s.recorrido_detalle?' · '+s.recorrido_detalle:'')):'', detalles:s.detalles||'', bebes:s.bebes,
    tipo:s.tipo, modalidad: !s.ida_vuelta ? 'solo_ida' : (s.tipo!=='excursion' && n>0 ? 'dos_dias' : 'ida_vuelta'), cliente:s.cliente, cliente_tel:String(s.celular||'').replace(/^51/,''), origen:s.origen, destino:s.destino, pasajeros:s.pasajeros,
    dias:n+1, noches:n, fecha_servicio:s.fecha_ida+'T'+(s.hora_salida||'05:00'), horas_espera:s.tipo==='privado'&&s.recorrido_interno?s.recorrido_horas:'', notas:notas.join('\n')};
  S.cot = {vista:'nueva', editar:null, pre:pre}; ir('cotizador', true);
}
/* QR con el logo al centro: corrección de errores alta (H) para que lea igual con el logo encima. */
function cargarQR(){ return window.qrcode ? Promise.resolve() : new Promise(function(ok, mal){ var s=document.createElement('script'); s.src='/vendor/qrcode.js'; s.onload=ok; s.onerror=mal; document.head.appendChild(s); }); }
function dibujarQR(canvas, texto){
  var q = qrcode(0,'H'); q.addData(texto); q.make();
  var n = q.getModuleCount(), borde = 4, tam = canvas.width, celda = tam/(n+borde*2), x = canvas.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0,0,tam,tam); x.fillStyle = '#0B1B33';
  for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(q.isDark(r,c)) x.fillRect(Math.floor((c+borde)*celda), Math.floor((r+borde)*celda), Math.ceil(celda), Math.ceil(celda));
  // Logo: 22 % del código, sobre un fondo blanco redondeado.
  var lado = tam*0.22, pos = (tam-lado)/2, marco = lado*0.14;
  var rr = function(px,py,w,hh,rad){ x.beginPath(); x.moveTo(px+rad,py); x.arcTo(px+w,py,px+w,py+hh,rad); x.arcTo(px+w,py+hh,px,py+hh,rad); x.arcTo(px,py+hh,px,py,rad); x.arcTo(px,py,px+w,py,rad); x.closePath(); };
  x.fillStyle = '#FFFFFF'; rr(pos-marco,pos-marco,lado+marco*2,lado+marco*2,(lado+marco*2)*0.26); x.fill();
  x.save(); x.translate(pos,pos); x.scale(lado/40,lado/40);
  x.fillStyle = '#1E4FD1'; rr(0,0,40,40,11); x.fill();
  x.lineCap = 'round'; x.strokeStyle = '#FFFFFF'; x.lineWidth = 2.6; x.stroke(new Path2D('M7 26c4-7 7-10 10-10 4 0 4 6 8 6 2.6 0 4.6-2 8-6'));
  x.strokeStyle = '#9DB7FF'; x.lineWidth = 2.2; x.stroke(new Path2D('M7 31h26'));
  x.restore();
}
function hojaQR(){
  var wa = (S.solL && S.solL.whatsapp) || '51990587558', waVer = '+'+wa.replace(/^51(\d{3})(\d{3})(\d{3})$/,'51 $1 $2 $3');
  var Q = {portal:{url:location.origin+'/viaja?src=qr', t:'Arma tu viaje', s:'Escanea con la cámara de tu celular, elige fechas y viajeros, y recibe tu cotización por WhatsApp.', arch:'qr-villa-azul-viaja.png'},
           wa:{url:'https://wa.me/'+wa+'?text='+encodeURIComponent('Hola Villa Azul, quiero cotizar un viaje.'), t:'Escríbenos por WhatsApp', s:'Escanea para abrir un chat con Villa Azul · '+waVer, arch:'qr-villa-azul-whatsapp.png'}}, modo = 'portal';
  abrirHoja('<h2 id="hoja-t">QR para clientes</h2><p class="desc">Ponlo en la van, en el paradero, en tus estados de WhatsApp o en un volante. Las solicitudes que llegan por este QR se cuentan aparte en «Por dónde llegan».</p>'+
    '<div class="seg" style="margin-top:14px" role="group" aria-label="Tipo de QR"><button type="button" data-qm="portal" aria-pressed="true">Portal de viajes</button><button type="button" data-qm="wa" aria-pressed="false">Chat de WhatsApp</button></div>'+
    '<div class="qr-caja"><canvas id="qrcv" width="900" height="900" aria-label="Código QR"></canvas></div><code class="qr-url" id="qru"></code>'+
    '<div class="acciones"><button type="button" class="btn ancho" id="qdes">'+ico('bajar')+'Descargar imagen</button><button type="button" class="btn sec ancho" id="qimp">Imprimir afiche</button><button type="button" class="btn sec ancho" id="qcop">Copiar enlace</button><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
  var pintarQR = function(){ cargarQR().then(function(){ dibujarQR($('qrcv'), Q[modo].url); $('qru').textContent = Q[modo].url; }).catch(function(){ $('qru').textContent = 'No se pudo cargar el generador de QR. Revisa tu señal.'; }); };
  hoja.querySelectorAll('[data-qm]').forEach(function(b){ b.onclick=function(){ modo=b.dataset.qm; hoja.querySelectorAll('[data-qm]').forEach(function(z){ z.setAttribute('aria-pressed', z===b); }); pintarQR(); }; });
  $('qdes').onclick = function(){ var a=document.createElement('a'); a.href=$('qrcv').toDataURL('image/png'); a.download=Q[modo].arch; document.body.appendChild(a); a.click(); a.remove(); };
  $('qcop').onclick = function(){ var u=Q[modo].url; (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast('Enlace copiado'); }, function(){ prompt('Copia el enlace:', u); }); };
  $('qimp').onclick = function(){ var img=$('qrcv').toDataURL('image/png'), q=Q[modo], w=window.open('', '_blank'); if(!w){ toast('Permite las ventanas emergentes para imprimir', true); return; }
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Afiche QR · Villa Azul</title><style>@page{size:A5;margin:0}body{margin:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#0C1A2E}'+
      '.a{width:148mm;height:210mm;box-sizing:border-box;padding:14mm 12mm;display:flex;flex-direction:column;align-items:center;text-align:center;background:#fff}.m{display:flex;align-items:center;gap:8px;font-weight:800;font-size:15pt}.m small{display:block;font-weight:600;font-size:9pt;color:#536077;text-align:left}'+
      'h1{font-size:30pt;letter-spacing:-.02em;margin:10mm 0 3mm;line-height:1}p{font-size:11.5pt;color:#334;margin:0 6mm;max-width:110mm}img{width:92mm;height:92mm;margin:8mm 0 5mm}.u{font-size:10pt;color:#536077;word-break:break-all}.w{margin-top:auto;padding-top:6mm;border-top:1.5px dashed #DCE2EA;width:100%;font-weight:800;font-size:12.5pt}</style></head><body><div class="a">'+
      '<div class="m"><svg width="34" height="34" viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#1E4FD1"/><path d="M7 26c4-7 7-10 10-10 4 0 4 6 8 6 2.6 0 4.6-2 8-6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M7 31h26" stroke="#9DB7FF" stroke-width="2.2" stroke-linecap="round"/></svg><span>Villa Azul<small>Turismo &amp; Excursiones</small></span></div>'+
      '<h1>'+esc(q.t)+'</h1><p>'+esc(q.s)+'</p><img src="'+img+'" alt=""><div class="u">'+esc(modo==='portal'?location.host+'/viaja':waVer)+'</div><div class="w">WhatsApp '+esc(waVer)+'</div></div><script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script></body></html>');
    w.document.close(); };
  pintarQR();
}

var LIM_MOVS = 120;
function vMovs(){
  var f = S.filtro, lista = ordenar(S.movs.filter(function(m){ return f==='todos' || (f==='anulados' ? m.estado!=='activo' : (m.tipo===f && m.estado==='activo')); }));
  var h = '<div class="chips entrar" role="group" aria-label="Filtro">'+[['todos','Todos'],['ingreso','Ingresos'],['egreso','Gastos'],['anulados','Anulados y corregidos']].map(function(x){ return '<button type="button" class="chip" data-f="'+x[0]+'" aria-pressed="'+(f===x[0])+'">'+x[1]+'</button>'; }).join('')+'</div>';
  h += '<p class="ayuda" style="margin-top:10px">'+lista.length+' registros'+(lista.length>LIM_MOVS?' · mostrando los '+LIM_MOVS+' más recientes':'')+'</p>';
  h += '<div class="card" style="margin-top:8px"><ul class="lista">'+(lista.length?lista.slice(0,LIM_MOVS).map(function(m){return filaMov(m,true);}).join(''):'<li class="vacio">Sin registros con este filtro.</li>')+'</ul></div>';
  if(lista.length>LIM_MOVS) h += '<button type="button" class="btn sec mas-btn" id="vermas">Ver más</button>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-f]').forEach(function(b){ b.onclick=function(){ S.filtro=b.dataset.f; LIM_MOVS=120; vMovs(); }; });
  if($('vermas')) $('vermas').onclick=function(){ LIM_MOVS+=200; vMovs(); };
}
function vModulos(){
  var nRev = porRevisar().length;
  var nSol = S.solL ? S.solL.resumen.pendientes : 0;
  var m = [['unidad','Unidad y checklist','chk',UNI.modulo()],['solicitudes','Solicitudes de viaje','qr',nSol?nSol+' por atender':'Pedidos desde el QR'],['registrar','Registrar','mas','También días atrasados'],['calendario','Calendario','dia','Rutas, cierres y días sin registro'],['cuentas','Cuentas','cuentas','Bolsillos y traspasos'],['revision','Por revisar','check',nRev?nRev+' comprobante(s)':'Todo al día'],['usuarios','Usuarios','users','Equipo, PIN y funciones'],['importar','Importar datos','subir','Desde el Excel actual'],['dia','Mi día','dia','Tus registros de hoy'],['viajes','Viajes para compartir','van','Enlaces y pasajeros'],['cotizador','Cotizador','tarifa','Excursión, taxi y privado']];
  $('vista').innerHTML = '<div class="modulos entrar">'+m.map(function(x){ return '<button type="button" class="modulo"'+(x[0]?' data-ir2="'+x[0]+'"':' data-pronto="'+x[3]+'"')+'><span class="ic">'+ico(x[2])+'</span><span><b>'+x[1]+'</b><br><small>'+x[3]+'</small></span></button>'; }).join('')+'</div>';
  $('vista').querySelectorAll('[data-ir2]').forEach(function(b){ b.onclick=function(){ ir(b.dataset.ir2); }; });
  $('vista').querySelectorAll('[data-pronto]').forEach(function(b){ b.onclick=function(){ toast('Este módulo llega en la '+b.dataset.pronto.toLowerCase()); }; });
}

/* ════════════ Usuarios ════════════ */
function vUsuarios(){
  if(!navigator.onLine){ $('vista').innerHTML='<div class="card"><p class="vacio">La gestión de usuarios necesita señal: cada cambio se aplica al instante en todos los teléfonos.</p></div>'; return; }
  if(!S.usuariosAdmin) $('vista').innerHTML='<p class="vacio">Cargando el equipo…</p>';
  else pintarUsuarios();
  api('/api/usuarios').then(function(r){ if(!r.ok){ if(r.codigo!=='NO_AUTORIZADO') $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; } S.usuariosAdmin=r.data; if(S.vista==='usuarios') pintarUsuarios(); });
}
function pintarUsuarios(){
  var d = S.usuariosAdmin, lista = d.usuarios;
  var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Equipo</h2><p>'+lista.filter(function(u){return u.activo;}).length+' activos · todos ingresan con PIN</p></div><button type="button" class="btn" id="nuevo">'+ico('mas')+'Nuevo usuario</button></div>';
  h += lista.map(function(u){ return '<button type="button" class="fila-u'+(u.activo?'':' inactivo')+'" data-u="'+esc(u.id)+'"><span class="avatar '+claseAv(u)+'">'+esc(iniciales(u.nombre))+'</span><span><b>'+esc(u.nombre)+'</b>'+(u.id===S.yo.id?' <span class="estado inac">Tú</span>':'')+(u.activo?'':' <span class="estado inac">Inactivo</span>')+'<small>'+(u.ultimo?'Último ingreso '+haceCuanto(u.ultimo):'Sin ingresos aún')+' · '+u.registros+' registros</small></span><span class="rol '+u.rol+'">'+ROL_TXT[u.rol]+'</span></button>'; }).join('');
  h += '<div class="titulo-sec"><h3>Historial de cambios</h3></div><div class="card"><ul class="lista hist">'+(d.historial.length?d.historial.map(function(l){ return '<li><span>'+esc(l.detalle)+' · <b>'+esc(l.usuario)+'</b></span><span>'+haceCuanto(l.timestamp)+'</span></li>'; }).join(''):'<li><span class="ayuda">Todavía no hay cambios.</span></li>')+'</ul></div>';
  $('vista').innerHTML = h;
  $('nuevo').onclick = hojaNuevo;
  $('vista').querySelectorAll('[data-u]').forEach(function(b){ b.onclick=function(){ hojaUsuario(lista.filter(function(u){return u.id===b.dataset.u;})[0]); }; });
}
/* Las mismas reglas que el servidor, para no ofrecer botones que van a fallar. El servidor decide igual. */
function motivoNo(accion, u){
  var lista = S.usuariosAdmin.usuarios, mandos = lista.filter(function(x){ return x.activo && esMando(x) && x.id!==u.id; }).length;
  if(accion==='desactivar'||accion==='eliminar'){
    if(u.id===S.yo.id) return 'No puedes '+accion+' tu propia cuenta.';
    if(u.protegido) return 'La cuenta Superadmin está protegida.';
    if(esMando(u) && mandos<1) return 'Debe quedar al menos un administrador activo.';
  }
  if(accion==='eliminar' && u.registros>0) return 'Tiene '+u.registros+' registros que deben conservar su autor. Desactívalo en su lugar.';
  if(accion==='rol'){ if(u.id===S.yo.id) return 'No puedes cambiar tu propio rol.'; if(u.protegido) return 'La cuenta Superadmin está protegida.'; }
  return '';
}
function abrirHoja(html){ hoja.innerHTML='<div class="hoja">'+html+'</div>'; if(!hoja.open) hoja.showModal(); hoja.querySelectorAll('[data-cerrar]').forEach(function(b){ b.onclick=function(){ hoja.close(); }; }); }
hoja.addEventListener('click', function(e){ if(e.target===hoja) hoja.close(); });
function campoPin(id, et){ return '<div class="campo"><label for="'+id+'">'+et+'</label><input id="'+id+'" type="password" inputmode="numeric" maxlength="4" autocomplete="new-password" class="num" placeholder="••••"></div>'; }
function botonesHoja(txt, peligro){ return '<p class="error" id="er" role="alert"></p><div class="acciones"><button type="button" class="btn ancho'+(peligro?' peligro':'')+'" id="ok">'+txt+'</button><button type="button" class="btn sec ancho" data-cerrar>Cancelar</button></div>'; }
function enviar(promesa, exito){
  $('ok').disabled = true;
  return promesa.then(function(r){ $('ok').disabled=false; if(!r.ok){ $('er').textContent = r.codigo==='RED'?'Sin conexión: inténtalo con señal.':r.error; return; } hoja.close(); toast(exito); vUsuarios(); return r; });
}
function hojaUsuario(u){
  var acc = function(id, ic, t, sub, accion, peligro){ var no = accion?motivoNo(accion,u):''; return '<button type="button" class="acc'+(peligro?' peligro':'')+'" data-a="'+id+'"'+(no?' disabled aria-disabled="true"':'')+'>'+ico(ic)+'<span>'+t+'<small>'+esc(no||sub)+'</small></span></button>'; };
  var h = '<div style="display:flex;gap:14px;align-items:center"><span class="avatar grande '+claseAv(u)+'">'+esc(iniciales(u.nombre))+'</span><div><h2 id="hoja-t">'+esc(u.nombre)+'</h2><p class="desc"><span class="rol '+u.rol+'">'+ROL_TXT[u.rol]+'</span> '+(u.activo?'':'<span class="estado inac">Inactivo</span>')+(u.nombre_completo?' · '+esc(u.nombre_completo):'')+'</p></div></div><div style="margin-top:18px">';
  h += acc('nombre','lapiz','Editar nombre','Cómo aparece en la app y en los reportes');
  h += acc('rol','escudo','Cambiar rol','Ahora: '+ROL_TXT[u.rol],'rol');
  if(u.rol==='admin') h += acc('funcion','caja','Función en la caja','Ahora: '+({caja:'verifica el efectivo',digital:'verifica los Yape'}[u.funcion]||'sin asignar'));
  h += u.id===S.yo.id ? acc('mipin','llave','Cambiar mi PIN','Necesitas tu PIN actual') : acc('pin','llave','Restablecer PIN','Pones un PIN nuevo y se lo dices en persona');
  h += u.activo ? acc('desactivar','pausa','Desactivar','Ya no aparece en el acceso; su historial se conserva','desactivar') : acc('activar','play','Reactivar','Vuelve a aparecer en el acceso');
  h += acc('eliminar','basura','Eliminar','Solo si nunca registró nada','eliminar',true)+'</div><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  abrirHoja(h);
  hoja.querySelectorAll('[data-a]:not([disabled])').forEach(function(b){ b.onclick=function(){
    var a=b.dataset.a;
    if(a==='nombre'){ abrirHoja('<h2 id="hoja-t">Editar nombre</h2><div class="campo"><label for="nn">Nombre</label><input id="nn" value="'+esc(u.nombre)+'" maxlength="30" autocomplete="off"></div>'+botonesHoja('Guardar')); $('ok').onclick=function(){ enviar(api('/api/usuarios/'+u.id,{method:'PATCH',body:{nombre:$('nn').value}}),'Nombre actualizado'); }; }
    if(a==='rol'){ abrirHoja('<h2 id="hoja-t">Rol de '+esc(u.nombre)+'</h2><p class="desc">El operador solo ve Registrar, Mi día, Caja y Cuentas. Admin y Superadmin ven todo y gestionan usuarios.</p><div class="campo"><label for="nr">Rol</label><select id="nr">'+['operador','admin','super'].map(function(r){ return '<option value="'+r+'"'+(u.rol===r?' selected':'')+'>'+ROL_TXT[r]+'</option>'; }).join('')+'</select></div>'+botonesHoja('Guardar')); $('ok').onclick=function(){ enviar(api('/api/usuarios/'+u.id,{method:'PATCH',body:{rol:$('nr').value}}),'Rol actualizado'); }; }
    if(a==='pin'){ abrirHoja('<h2 id="hoja-t">Restablecer PIN</h2><p class="desc">El PIN anterior de '+esc(u.nombre)+' deja de funcionar al instante y se cierran sus sesiones.</p>'+campoPin('p1','PIN nuevo')+campoPin('p2','Repite el PIN')+botonesHoja('Guardar PIN'));
      $('ok').onclick=function(){ var x=$('p1').value, y=$('p2').value; if(!/^\d{4}$/.test(x)) return $('er').textContent='El PIN debe tener 4 números.'; if(x!==y) return $('er').textContent='Los dos PIN no coinciden.'; enviar(api('/api/usuarios/'+u.id+'/pin',{method:'POST',body:{pin:x}}),'PIN de '+u.nombre+' restablecido'); }; }
    if(a==='mipin') hojaMiPin();
    if(a==='funcion'){ abrirHoja('<h2 id="hoja-t">Función de '+esc(u.nombre)+'</h2><p class="desc">Todos los administradores pueden cerrar cajas. La función decide qué parte verifica cada uno.</p><div class="campo"><label for="nf">Función</label><select id="nf"><option value="caja"'+(u.funcion==='caja'?' selected':'')+'>Efectivo: recibe y verifica el efectivo</option><option value="digital"'+(u.funcion==='digital'?' selected':'')+'>Yape: verifica los Yape</option></select></div>'+botonesHoja('Guardar'));
      $('ok').onclick=function(){ enviar(api('/api/usuarios/'+u.id,{method:'PATCH',body:{funcion:$('nf').value}}),'Función actualizada'); }; }
    if(a==='desactivar') enviarDirecto(api('/api/usuarios/'+u.id,{method:'PATCH',body:{activo:false}}), u.nombre+' desactivado');
    if(a==='activar') enviarDirecto(api('/api/usuarios/'+u.id,{method:'PATCH',body:{activo:true}}), u.nombre+' reactivado');
    if(a==='eliminar'){ abrirHoja('<h2 id="hoja-t">¿Eliminar a '+esc(u.nombre)+'?</h2><p class="desc">No se puede deshacer. Escribe su nombre para confirmar.</p><div class="campo"><label for="cf">Nombre</label><input id="cf" autocomplete="off"></div>'+botonesHoja('Eliminar definitivamente',true));
      $('ok').onclick=function(){ if($('cf').value.trim().toLowerCase()!==u.nombre.toLowerCase()) return $('er').textContent='El nombre no coincide.'; enviar(api('/api/usuarios/'+u.id,{method:'DELETE'}), u.nombre+' eliminado'); }; }
  }; });
}
function enviarDirecto(p, exito){ p.then(function(r){ if(!r.ok){ toast(r.codigo==='RED'?'Sin conexión':r.error, true); return; } hoja.close(); toast(exito); vUsuarios(); }); }
function hojaNuevo(){
  abrirHoja('<h2 id="hoja-t">Nuevo usuario</h2><p class="desc">Aparecerá en la pantalla de acceso de todos los teléfonos.</p><div class="campo"><label for="nn">Nombre</label><input id="nn" maxlength="30" autocomplete="off"></div>'+
    '<div class="campo"><label for="nr">Rol</label><select id="nr"><option value="operador">Operador</option><option value="admin">Admin</option><option value="super">Superadmin</option></select></div>'+campoPin('p1','PIN inicial')+botonesHoja('Dar de alta'));
  $('ok').onclick=function(){ if(!/^\d{4}$/.test($('p1').value)) return $('er').textContent='El PIN debe tener 4 números.'; enviar(api('/api/usuarios',{method:'POST',body:{nombre:$('nn').value,rol:$('nr').value,pin:$('p1').value}}), $('nn').value.trim()+' ya puede ingresar'); };
}
function hojaMiPin(){
  abrirHoja('<h2 id="hoja-t">Cambiar mi PIN</h2><p class="desc">Necesita señal. Vale para todos tus teléfonos.</p>'+campoPin('p0','PIN actual')+campoPin('p1','PIN nuevo')+campoPin('p2','Repite el PIN nuevo')+botonesHoja('Cambiar PIN'));
  $('ok').onclick=function(){
    var a=$('p0').value, x=$('p1').value, y=$('p2').value;
    if(!/^\d{4}$/.test(x)) return $('er').textContent='El PIN nuevo debe tener 4 números.';
    if(x!==y) return $('er').textContent='Los PIN nuevos no coinciden.';
    $('ok').disabled=true;
    api('/api/mi-pin',{method:'POST',body:{actual:a,nuevo:x}}).then(function(r){
      $('ok').disabled=false;
      if(!r.ok){ $('er').textContent = r.codigo==='RED'?'Sin conexión: inténtalo con señal.':r.error; return; }
      var vs=ls('va_verif')||{}; vs[S.yo.id]=r.data.verificador; ls('va_verif',vs);
      hoja.close(); toast('Tu PIN se cambió');
    });
  };
}

/* ════════════ Perfil y cola ════════════ */
function hojaPerfil(){
  var u = S.yo;
  var h = '<div style="display:flex;gap:14px;align-items:center"><span class="avatar grande '+claseAv(u)+'">'+esc(iniciales(u.nombre))+'</span><div><h2 id="hoja-t">'+esc(u.nombre)+'</h2><p class="desc"><span class="rol '+u.rol+'">'+ROL_TXT[u.rol]+'</span></p></div></div>';
  h += '<span class="etq">Tema</span>'+selectorTema(true)+'<div style="margin-top:16px">';
  h += esMando(u) ? '<button type="button" class="acc" id="mp">'+ico('llave')+'<span>Cambiar mi PIN<small>Necesitas tu PIN actual y señal</small></span></button>'
                  : '<div class="acc" style="cursor:default">'+ico('llave')+'<span>Tu PIN<small>Si necesitas cambiarlo, pídeselo a un administrador.</small></span></div>';
  h += '<button type="button" class="acc" id="sy">'+ico('sync')+'<span>Sincronizar ahora<small>'+(S.ultimaSync?'Última: '+new Date(S.ultimaSync).toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'}):'Aún no en esta sesión')+'</small></span></button>';
  h += '<button type="button" class="acc peligro" id="sal">'+ico('salir')+'<span>Cerrar sesión'+(S.outbox.length?'<small>Tienes '+S.outbox.length+' registro(s) sin enviar: quedan guardados en este teléfono</small>':'')+'</span></button></div>';
  h += '<p class="ayuda" style="margin-top:12px;text-align:center">Villa Azul v'+VERSION+(ls('va_esquema')?' · base de datos v'+ls('va_esquema'):'')+'</p><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Listo</button></div>';
  abrirHoja(h);
  if($('mp')) $('mp').onclick = hojaMiPin;
  $('sy').onclick = function(){ hoja.close(); sincronizar(true).then(function(){ toast('Datos al día'); }); };
  $('sal').onclick = function(){ salir(); };
}
function hojaCola(){
  var pend = S.outbox.filter(function(o){return o.estado==='pendiente';}), rech = S.outbox.filter(function(o){return o.estado==='rechazado';});
  var off = !navigator.onLine || !S.online;
  var h = '<h2 id="hoja-t">'+(off?'Sin señal':'En línea')+'</h2><p class="desc">'+(off?'Todo lo que registres se guarda en este teléfono y se envía solo cuando vuelva la señal.':'Los registros se envían al instante.')+(S.ultimaSync?' Última sincronización: '+new Date(S.ultimaSync).toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'})+'.':'')+'</p>';
  h += '<div class="kpis" style="margin-top:14px"><div class="kpi"><small>Por enviar</small><b class="num">'+pend.length+'</b></div><div class="kpi"><small>Rechazados</small><b class="num '+(rech.length?'bad':'')+'">'+rech.length+'</b></div></div>';
  rech.forEach(function(o){ h += '<div class="rechazo"><b>'+esc(etiquetaOp(o))+'</b><small>'+esc(o.error)+' · '+fechaCorta(o.datos.fecha)+' '+horaDe(o.datos.fecha)+'</small><div style="display:flex;gap:8px;margin-top:8px"><button type="button" class="btn-mini" data-re="'+o.op_id+'">Reintentar</button><button type="button" class="btn-mini" data-de="'+o.op_id+'" style="color:var(--bad)">Descartar</button></div></div>'; });
  h += '<div class="acciones"><button type="button" class="btn ancho" id="syn"'+(off?' disabled':'')+'>'+ico('sync')+'Sincronizar ahora</button><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  abrirHoja(h);
  $('syn').onclick = function(){ hoja.close(); sincronizar(); };
  hoja.querySelectorAll('[data-re]').forEach(function(b){ b.onclick=function(){ var o=S.outbox.filter(function(x){return x.op_id===b.dataset.re;})[0]; o.estado='pendiente'; delete o.error; tx('outbox','readwrite',function(s){ s.put(o); }).then(cargarLocal).then(function(){ hoja.close(); sincronizar(); }); }; });
  // Descartar exige confirmar con el importe a la vista (lección del 27/08: seis registros se borraron solos).
  hoja.querySelectorAll('[data-de]').forEach(function(b){ b.onclick=function(){
    var o=S.outbox.filter(function(x){return x.op_id===b.dataset.de;})[0];
    if(!confirm('¿Descartar '+etiquetaOp(o)+'? No se podrá recuperar.')) return;
    tx('outbox','readwrite',function(s){ s.delete(o.op_id); }).then(function(){ return o.datos.uuid ? tx('movs','readwrite',function(s){ s.delete(o.datos.uuid); }) : null; }).then(cargarLocal).then(function(){ hoja.close(); refrescarVista(); toast('Registro descartado'); });
  }; });
}

/* ════════════ Importador del Excel ════════════ */
var HOJAS_IMPORT = ['Cat_Ingresos','Cat_Egresos','Cuentas','Rutas','Alias','Unidades','Tarifas','Actividades','Agencias','Empresas_Agencia','Temporadas','Config','Usuarios','Viajes','Movimientos','Traspasos','Cierres','Excursiones','Exc_Pasajeros','Exc_Movimientos','Auditoria','Correcciones'];
var COLS_FECHA = /^(fecha|creado_en|modificado_en|confirmado_en|cerrado_en|reabierto_en|verificado_en|timestamp|desde|hasta|fecha_corte|hora_salida|hora_llegada|salida|retorno|cierre_reservas|vence_en|registrado_en|actualizado_en)$/;
function serialATexto(v){
  // Número de serie de Excel → texto con la hora de pared tal como estaba en la hoja (sin zona horaria).
  var ms = Math.round((v - 25569) * 864e5), d = new Date(ms);
  var s = d.toISOString().replace('T',' ').slice(0,19);
  return v < 1 ? s.slice(11,16) : s;
}
function cargarSheetJS(){
  if(window.XLSX) return Promise.resolve();
  return new Promise(function(ok, mal){ var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=function(){ mal(new Error('No se pudo cargar el lector de Excel. Revisa tu señal.')); }; document.head.appendChild(s); });
}
function huella(o){ return crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(o))).then(function(b){ return hex(b).slice(0,32); }); }
var IMP = null;
function vImportar(){
  var h = '<div class="saludo entrar"><h2>Importar desde el Excel</h2><p>Descarga tu Google Sheet como .xlsx (Archivo → Descargar → Microsoft Excel) y súbelo aquí. Puedes repetirlo: nada se duplica.</p></div>';
  if(!IMP) h += '<label class="archivo">'+ico('subir')+'<b>Elegir el archivo .xlsx</b><small class="ayuda">Se lee en tu teléfono; solo se envían los datos.</small><input type="file" id="xls" accept=".xlsx"></label>';
  else h += '<div class="card"><b>'+esc(IMP.nombre)+'</b><p class="ayuda">'+IMP.hojas.length+' pestañas reconocidas · '+IMP.hojas.reduce(function(s,x){return s+x.filas.length;},0)+' filas</p><div class="prog"><i id="barra" style="width:'+(IMP.pct||0)+'%"></i></div><p class="ayuda" id="paso">'+esc(IMP.paso||'Listo para importar')+'</p>'+
    (IMP.fase==='listo'?'<button type="button" class="btn ancho" id="imp" style="margin-top:14px">'+ico('subir')+'Importar ahora</button>':'')+'</div>'+
    '<div class="titulo-sec"><h3>Comprobación</h3></div><div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Pestaña</th><th class="n">En el Excel</th><th class="n">En la nube</th><th></th></tr></thead><tbody>'+
    IMP.hojas.map(function(x){ var n=IMP.resumen?IMP.resumen[x.tabla]:null; var okk = n!=null && (x.tabla==='usuarios' || n>=x.unicas); return '<tr><td>'+esc(x.hoja)+'</td><td class="n">'+x.unicas+'</td><td class="n">'+(n==null?'—':n)+'</td><td>'+(n==null?'':okk?'<span class="ok">'+ico('check')+'</span>':'<span class="bad">'+ico('aviso')+'</span>')+'</td></tr>'; }).join('')+
    (IMP.sumas?'<tr><td><b>Ingresos activos</b></td><td class="n">'+soles(IMP.sumas.ingreso)+'</td><td class="n">'+(IMP.resumen?soles(IMP.resumen.sumas.ingreso):'—')+'</td><td>'+(IMP.resumen?(Math.abs(IMP.resumen.sumas.ingreso-IMP.sumas.ingreso)<0.01?'<span class="ok">'+ico('check')+'</span>':'<span class="bad">'+ico('aviso')+'</span>'):'')+'</td></tr><tr><td><b>Gastos activos</b></td><td class="n">'+soles(IMP.sumas.egreso)+'</td><td class="n">'+(IMP.resumen?soles(IMP.resumen.sumas.egreso):'—')+'</td><td>'+(IMP.resumen?(Math.abs(IMP.resumen.sumas.egreso-IMP.sumas.egreso)<0.01?'<span class="ok">'+ico('check')+'</span>':'<span class="bad">'+ico('aviso')+'</span>'):'')+'</td></tr>':'')+
    '</tbody></table></div>'+(IMP.fase==='hecho'?'<button type="button" class="btn sec ancho" id="otra" style="margin-top:12px">Importar otro archivo</button>':'');
  $('vista').innerHTML = h;
  if($('xls')) $('xls').onchange = function(){ leerExcel(this.files[0]); };
  if($('imp')) $('imp').onclick = ejecutarImport;
  if($('otra')) $('otra').onclick = function(){ IMP=null; vImportar(); };
}
function leerExcel(file){
  if(!file) return;
  IMP = {nombre:file.name, hojas:[], fase:'leyendo', paso:'Leyendo el archivo…'}; vImportar();
  cargarSheetJS().then(function(){ return file.arrayBuffer(); }).then(function(buf){
    var wb = XLSX.read(buf, {type:'array'});
    var trabajos = [];
    HOJAS_IMPORT.forEach(function(nombre){
      var ws = wb.Sheets[nombre]; if(!ws) return;
      var filas = XLSX.utils.sheet_to_json(ws, {defval:null, raw:true}).filter(function(f){ return Object.keys(f).some(function(k){ return f[k]!==null && f[k]!==''; }); });
      filas.forEach(function(f){ Object.keys(f).forEach(function(k){ if(COLS_FECHA.test(k) && typeof f[k]==='number') f[k]=serialATexto(f[k]); }); });
      var tabla = nombre.toLowerCase();
      var p = (tabla==='auditoria'||tabla==='correcciones') ? Promise.all(filas.map(function(f){ return huella(f).then(function(h){ f.id=h; }); })) : Promise.resolve();
      trabajos.push(p.then(function(){
        var pk = {movimientos:'uuid',traspasos:'uuid',cuentas:'clave',agencias:'paradero',alias:'nombre_viejo',rutas:'nombre',unidades:'placa',config:'clave',cat_ingresos:'clave',cat_egresos:'clave',tarifas:'clave',actividades:'clave',empresas_agencia:'clave',temporadas:'clave'}[tabla]||'id';
        var u = {}; filas.forEach(function(f){ if(f[pk]!=null && f[pk]!=='') u[f[pk]]=1; });
        IMP.hojas.push({hoja:nombre, tabla:tabla, filas:filas, unicas: tabla==='usuarios'?filas.length:Object.keys(u).length});
      }));
    });
    return Promise.all(trabajos);
  }).then(function(){
    IMP.hojas.sort(function(a,b){ return HOJAS_IMPORT.indexOf(a.hoja)-HOJAS_IMPORT.indexOf(b.hoja); });
    var mv = IMP.hojas.filter(function(x){return x.tabla==='movimientos';})[0];
    if(mv){ IMP.sumas = {ingreso:0, egreso:0}; mv.filas.forEach(function(f){ if(f.estado==='activo') IMP.sumas[f.tipo]=Math.round((IMP.sumas[f.tipo]+Number(f.monto||0))*100)/100; }); }
    IMP.fase = IMP.hojas.length ? 'listo' : 'vacio';
    IMP.paso = IMP.hojas.length ? 'Listo para importar' : 'No encontré pestañas de Santa Rosa en este archivo.';
    vImportar();
  }).catch(function(e){ IMP.paso = e.message || 'No se pudo leer el archivo'; IMP.fase='error'; vImportar(); });
}
function ejecutarImport(){
  IMP.fase = 'importando'; var total = IMP.hojas.reduce(function(s,x){return s+x.filas.length;},0), hechas = 0;
  var cola = [];
  IMP.hojas.forEach(function(x){ for(var i=0;i<x.filas.length;i+=150) cola.push({tabla:x.tabla, hoja:x.hoja, filas:x.filas.slice(i,i+150)}); });
  function siguiente(){
    if(!cola.length) return api('/api/importar/resumen').then(function(r){
      IMP.fase='hecho'; IMP.pct=100; IMP.paso='Importación terminada. Revisa la comprobación.'; if(r.ok) IMP.resumen=r.data; vImportar();
      return kvSet('cursor', 0).then(function(){ return sincronizar(true); });
    });
    var lote = cola.shift();
    IMP.paso = 'Importando '+lote.hoja+'…'; if($('paso')) $('paso').textContent = IMP.paso;
    return api('/api/importar', {method:'POST', body:{tabla:lote.tabla, filas:lote.filas}}).then(function(r){
      if(!r.ok){ IMP.fase='error'; IMP.paso='Se detuvo en '+lote.hoja+': '+r.error+'. Puedes volver a intentarlo: lo ya importado no se duplica.'; IMP.fase='listo'; vImportar(); return; }
      hechas += lote.filas.length; IMP.pct = Math.round(hechas/total*100); if($('barra')) $('barra').style.width = IMP.pct+'%';
      return siguiente();
    });
  }
  if($('imp')) $('imp').disabled = true;
  siguiente();
}

/* ════════════ Excursiones (solo admin y superadmin) ════════════ */
var EXC_CAT_TXT = {adelanto:'Adelanto',saldo:'Saldo',pasaje:'Pasaje',otro_ingreso:'Otro ingreso',combustible:'Combustible',peaje:'Peaje',pago_conductor:'Pago al conductor',hospedaje_conductor:'Hospedaje conductor',alimentacion_conductor:'Alimentación conductor',cochera:'Cochera',lavado:'Lavado',mantenimiento:'Mantenimiento',otro_gasto:'Otro gasto'};
var EXC_CAT = {ingreso:['adelanto','saldo','pasaje','otro_ingreso'], egreso:['combustible','peaje','pago_conductor','hospedaje_conductor','alimentacion_conductor','cochera','lavado','mantenimiento','otro_gasto']};
var EXC_EST = {borrador:'Borrador',abierta:'Reservas abiertas',cerrada:'Reservas cerradas',en_ruta:'En ruta',finalizada:'Finalizada',anulada:'Anulada'};
var PAS_TXT = {reservado:'Separado (sin pago)',confirmado:'Confirmado',pagado:'Pagado',liberado:'Liberado'};
var SEATS = {1:'Adelante, junto al conductor',2:'Adelante, ventana',3:'Fila 2, ventana',4:'Fila 2, centro',5:'Fila 2, pasillo',6:'Fila 3, ventana',7:'Fila 3, pasillo',8:'Fila 3, ventana junto a la puerta',9:'Fila 4, ventana',10:'Fila 4, pasillo',11:'Fila 4, ventana (detrás del 8)',12:'Última fila, ventana',13:'Última fila, centro',14:'Última fila, centro',15:'Última fila, ventana (detrás del 11)'};
var PLANO = [['conductor','vacio',1,2],'sep',[3,4,5,'puerta'],[6,7,'pasillo',8],[9,10,'pasillo',11],[12,13,14,15]];
S.excId = null; S.excTab = 'resumen'; S.excLista = ls('va_exc_lista'); S.excDet = null;

function fechaExc(s, larga){
  var m = String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/); if(!m) return s?String(s):'—';
  var d = new Date(+m[1],m[2]-1,+m[3],+(m[4]||0),+(m[5]||0));
  var t = d.toLocaleDateString('es-PE', larga?{weekday:'long',day:'numeric',month:'long'}:{weekday:'short',day:'numeric',month:'short'});
  if(m[4]) t += ' · '+d.toLocaleTimeString('es-PE',{hour:'numeric',minute:'2-digit'});
  return t;
}
function enlaceExc(c){ return location.origin + '/reservar?e=' + c; }
function ahoraLocalInput(){ return ahoraLima().slice(0,16).replace(' ','T'); }

function vExcursiones(){ if(S.excId) return excDetalle(); excLista(); }
function excLista(){
  pintarExcLista();
  api('/api/excursiones').then(function(r){
    if(!r.ok){
      if(S.vista!=='excursiones' || S.excId) return;
      if(r.codigo==='RED'){ if(!S.excLista) $('vista').innerHTML='<div class="card"><p class="vacio">Sin señal. Las excursiones se cargan con conexión; los gastos que registres se guardan y se envían solos.</p></div>'; return; }
      // Antes un error aquí se callaba y la lista se quedaba vieja: ahora se dice y se puede reintentar.
      $('vista').innerHTML='<div class="card"><p class="vacio"><b class="bad">No se pudieron cargar las excursiones.</b><br>'+esc(r.error)+'</p><button type="button" class="btn ancho" id="reexc">Reintentar</button></div>';
      $('reexc').onclick = excLista; return;
    }
    S.excLista = r.data.excursiones; ls('va_exc_lista', S.excLista);
    if(S.vista==='excursiones' && !S.excId) pintarExcLista();
  });
}
function pintarExcLista(){
  var L = S.excLista;
  if(!L){ $('vista').innerHTML='<p class="vacio">Cargando excursiones…</p>'; return; }
  var mes = hoyLima().slice(0,7), delMes = L.filter(function(e){ return String(e.salida).slice(0,7)===mes; });
  var t = delMes.reduce(function(a,e){ a.c+=e.kpis.cobrado; a.g+=e.kpis.gastos; a.p+=e.kpis.por_cobrar; return a; },{c:0,g:0,p:0});
  var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Excursiones</h2><p>Expresos, contratos y viajes con venta por asiento.</p></div><button type="button" class="btn" id="nexc">'+ico('mas')+'Nueva excursión</button></div>';
  h += '<div class="kpis k4"><div class="kpi"><small>Cobrado este mes</small><b class="num ok" data-v="'+t.c+'" data-p="S/ " data-d="0">'+soles0(t.c)+'</b></div><div class="kpi"><small>Gastos del mes</small><b class="num bad" data-v="'+t.g+'" data-p="S/ " data-d="0">'+soles0(t.g)+'</b></div>'+
    '<div class="kpi"><small>Utilidad del mes</small><b class="num" data-v="'+(t.c-t.g)+'" data-p="S/ " data-d="0">'+soles0(t.c-t.g)+'</b></div><div class="kpi"><small>Por cobrar</small><b class="num" data-v="'+t.p+'" data-p="S/ " data-d="0">'+soles0(t.p)+'</b></div></div>';
  h += '<div class="titulo-sec"><h3>Viajes</h3><span class="rol">'+L.length+'</span></div>';
  if(!L.length) h += '<div class="card"><p class="vacio">Aún no hay excursiones. Crea la primera con «Nueva excursión».</p></div>';
  h += L.map(function(e){ var k=e.kpis, n=k.por_estado.reservado||0;
    return '<button type="button" class="exc-item" data-exc="'+esc(e.id)+'"><b>'+esc(e.titulo)+'</b><span class="chip-est '+esc(e.estado)+'">'+esc(EXC_EST[e.estado]||e.estado)+'</span>'+(n?'<span class="chip-est nuevo">'+n+' por confirmar</span>':'')+(e.vouchers_pendientes?'<span class="chip-est nuevo">'+e.vouchers_pendientes+' voucher(s)</span>':'')+
      '<small>'+esc(e.origen)+' ⇄ '+esc(e.destino)+' · '+esc(fechaExc(e.salida))+'</small><div class="datos num"><span>'+k.ocupados+'/'+k.asientos_venta+' asientos</span><span class="ok">Cobrado '+soles0(k.cobrado)+'</span><span class="bad">Gastos '+soles0(k.gastos)+'</span><span>Utilidad '+soles0(k.utilidad)+'</span></div></button>'; }).join('');
  $('vista').innerHTML = h;
  $('nexc').onclick = function(){ formExcursion(null); };
  $('vista').querySelectorAll('[data-exc]').forEach(function(b){ b.onclick=function(){ abrirExc(b.dataset.exc); }; });
  document.querySelectorAll('#vista [data-v]').forEach(contar);
}
function abrirExc(id, tab){ transicion(function(){ S.excId=id; S.excTab=tab||'resumen'; S.excDet=null; recordarVista(); excDetalle(); window.scrollTo(0,0); }); }
function excDetalle(){
  if(!S.excDet || S.excDet.excursion.id!==S.excId) $('vista').innerHTML='<p class="vacio">Cargando…</p>'; else pintarExcDetalle();
  return api('/api/excursiones/'+S.excId).then(function(r){
    if(!r.ok){ if(r.codigo!=='RED'){ toast(r.error,true); S.excId=null; excLista(); } else if(!S.excDet) $('vista').innerHTML='<div class="card"><p class="vacio">Sin señal: el detalle se carga con conexión.</p></div>'; return; }
    S.excDet = r.data; if(S.vista==='excursiones' && S.excId===r.data.excursion.id) pintarExcDetalle();
  });
}
function pintarExcDetalle(){
  var d = S.excDet, e = d.excursion;
  var tabs = [['resumen','Resumen'],['asientos','Asientos'],['caja','Ingresos y gastos'],['datos','Datos']];
  var h = '<button type="button" class="enlace" id="vlista" style="padding:4px 0">← Todas las excursiones</button><div class="saludo" style="margin-top:6px"><h2>'+esc(e.titulo)+'</h2><p><b>'+esc(e.origen)+' ⇄ '+esc(e.destino)+'</b>'+(e.via?' · vía '+esc(e.via):'')+'</p><p>Salida '+esc(fechaExc(e.salida))+(e.retorno?' · Retorno '+esc(fechaExc(e.retorno)):'')+' <span class="chip-est '+esc(e.estado)+'">'+esc(EXC_EST[e.estado])+'</span></p>'+
    (e.estado!=='anulada'?'<div class="botones" style="margin-top:10px"><button type="button" class="btn-mini" id="xedit">'+ico('lapiz')+' Editar datos</button><button type="button" class="btn-mini" id="xdel" style="color:var(--bad)">'+ico('basura')+' Eliminar o anular</button></div>':'')+'</div>';
  h += '<div class="tabs" role="tablist">'+tabs.map(function(t){ return '<button type="button" role="tab" data-tab="'+t[0]+'" aria-selected="'+(S.excTab===t[0])+'">'+t[1]+'</button>'; }).join('')+'</div><div id="panelx"></div>';
  $('vista').innerHTML = h;
  $('vlista').onclick = function(){ transicion(function(){ S.excId=null; excLista(); }); };
  if($('xedit')) $('xedit').onclick = function(){ S.excTab='datos'; pintarExcDetalle(); };
  if($('xdel')) $('xdel').onclick = function(){ hojaEliminarExc(e); };
  $('vista').querySelectorAll('[data-tab]').forEach(function(b){ b.onclick=function(){ S.excTab=b.dataset.tab; pintarExcDetalle(); if(S.excTab!=='datos') excDetalle(); }; });
  ({resumen:excResumen,asientos:excAsientos,caja:excCaja,datos:function(){ formExcursion(e, $('panelx')); }}[S.excTab])();
  document.querySelectorAll('#vista [data-v]').forEach(contar);
}
function kpiX(v,l,alerta){ return '<div class="kpi'+(alerta?' alerta':'')+'"><small>'+esc(l)+'</small><b class="num">'+esc(v)+'</b></div>'; }
function excResumen(){
  var d = S.excDet, e = d.excursion, k = d.kpis, orden = ['borrador','abierta','cerrada','en_ruta','finalizada'], i = orden.indexOf(e.estado);
  var pasos = [['Crear el viaje','Datos, precio o monto del contrato'],['Abrir reservas','Compartir el enlace; los asientos llegan solos'],['Cerrar reservas','Confirmar pagos y descargar el manifiesto'],['Salida','Km del odómetro al salir; gastos con foto de la boleta'],['Llegada y cierre','Km al volver, saldo cobrado, utilidad final']];
  var h = '';
  if(e.estado!=='anulada'){
    h += '<ol class="flujo">'+pasos.map(function(p,j){ var c = (j<i || e.estado==='finalizada')?'hecho':(j===i?'ahora':''); return '<li data-n="'+(j+1)+'" class="'+c+'"><div><b>'+p[0]+'</b><small>'+p[1]+'</small></div></li>'; }).join('')+'</ol>';
    var b = '';
    if(e.estado==='borrador') b += '<button type="button" class="btn" data-est="abierta">Abrir reservas</button>';
    if(e.estado==='abierta') b += '<button type="button" class="btn" data-est="cerrada">Cerrar reservas</button>';
    if(e.estado==='cerrada') b += '<button type="button" class="btn sec" data-est="abierta">Reabrir reservas</button>';
    if(['borrador','abierta','cerrada'].indexOf(e.estado)>=0) b += '<button type="button" class="btn sec" data-km="inicio">'+ico('van')+'Registrar salida (km)</button>';
    if(e.estado==='en_ruta' && !e.km_fin) b += '<button type="button" class="btn sec" data-km="fin">'+ico('van')+'Registrar llegada (km)</button>';
    if(e.estado==='en_ruta' && e.km_fin) b += '<button type="button" class="btn" data-est="finalizada">Finalizar viaje</button>';
    h += '<div class="botones">'+b+'</div>';
    if(['abierta','cerrada','borrador','en_ruta','finalizada'].indexOf(e.estado)>=0) h += '<div id="xchk"></div>';
  }
  if(e.estado==='abierta' || e.estado==='borrador'){
    var url = enlaceExc(e.codigo);
    h += '<div class="compartir"><b>Enlace para tus clientes</b>'+(e.estado==='borrador'?'<small style="display:block;color:var(--muted)">Funcionará cuando abras las reservas.</small>':'')+'<code id="url">'+esc(url)+'</code><div class="botones"><button type="button" class="btn" id="copiar">Copiar enlace</button>'+
      '<a class="btn sec" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(textoWa(e,url))+'">Compartir por WhatsApp</a><a class="btn sec" target="_blank" rel="noopener" href="'+esc(url)+'">Ver como cliente</a></div></div>';
  }
  if(e.estado!=='anulada' && e.token_org){
    var uo = location.origin+'/organizador?t='+e.token_org;
    h += '<div class="compartir" style="border-color:var(--warn);background:var(--warn-soft)"><b>Enlace del organizador</b> <small style="color:var(--muted)">· privado</small><p class="ayuda" style="margin-top:4px">Para el líder o quien contrata: registra a todo su grupo sin límite, aparta asientos y completa nombres después, corrige datos hasta el cierre y envía un solo voucher.</p><code>'+esc(uo)+'</code><div class="botones">'+
      '<button type="button" class="btn" id="cporg">Copiar enlace</button>'+(e.cliente_tel?'<a class="btn sec" target="_blank" rel="noopener" href="https://wa.me/'+esc(e.cliente_tel)+'?text='+encodeURIComponent('Hola'+(e.cliente?' '+e.cliente:'')+', te comparto tu panel de organizador para «'+e.titulo+'» ('+fechaExc(e.salida,true)+').\nDesde aquí registras a tu grupo, eliges sus asientos y envías los pagos:\n'+uo+'\n\nEs solo para ti; no lo reenvíes al grupo. Para ellos está el enlace de reserva.')+'">Enviar al organizador</a>':'')+
      '<button type="button" class="btn sec" id="rtorg">Cambiar enlace</button></div></div>';
  }
  h += '<div class="kpis k3" style="margin-top:14px">'+
    kpiX(soles(k.pactado), e.tipo==='contrato'?'Monto del contrato':'Venta de asientos')+kpiX(soles(k.cobrado),'Cobrado')+kpiX(soles(k.por_cobrar),'Por cobrar', k.por_cobrar>0 && (e.estado==='en_ruta'||e.estado==='finalizada'))+
    kpiX(soles(k.gastos),'Gastos')+kpiX(soles(k.utilidad),'Utilidad real', k.utilidad<0)+kpiX(soles(k.utilidad_proyectada),'Utilidad si se cobra todo', k.utilidad_proyectada<0)+
    kpiX(k.margen+' %','Margen sobre lo cobrado')+kpiX(k.ocupados+' / '+k.asientos_venta,'Asientos ('+k.ocupacion+' %)')+kpiX(k.km?k.km.toLocaleString('es-PE')+' km':'—','Recorrido')+
    kpiX(k.costo_km?soles(k.costo_km):'—','Costo por km')+kpiX(k.km_galon?k.km_galon+' km/gal':'—','Rendimiento real')+kpiX(k.precio_galon?soles(k.precio_galon):'—','Precio por galón')+
    kpiX(k.soles_asiento_km?'S/ '+k.soles_asiento_km.toFixed(3):'—','Soles por asiento-km')+kpiX(soles(k.sin_comprobante), k.sin_comprobante_n+' gasto'+(k.sin_comprobante_n===1?'':'s')+' sin boleta', k.sin_comprobante_n>0)+'</div>';
  var cats = Object.keys(k.gastos_por_categoria).sort(function(a,b){ return k.gastos_por_categoria[b]-k.gastos_por_categoria[a]; });
  if(cats.length) h += '<div class="titulo-sec"><h3>Gastos por tipo</h3></div><div class="card"><ul class="lista">'+cats.map(function(c){ var v=k.gastos_por_categoria[c]; return '<li class="mov" style="grid-template-columns:1fr auto"><div><b>'+esc(EXC_CAT_TXT[c]||c)+'</b><div class="barra-ocup" style="margin-top:6px"><i style="width:'+Math.round(v/k.gastos*100)+'%;background:var(--bad);opacity:.75"></i></div></div><span class="m num">'+soles(v)+' · '+Math.round(v/k.gastos*100)+' %</span></li>'; }).join('')+'</ul></div>';
  $('panelx').innerHTML = h;
  if($('cporg')) $('cporg').onclick = function(){ var u=location.origin+'/organizador?t='+e.token_org; (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast('Enlace del organizador copiado'); }, function(){ prompt('Copia el enlace:', u); }); };
  if($('rtorg')) $('rtorg').onclick = function(){ if(!confirm('¿Cambiar el enlace del organizador? El actual dejará de funcionar al instante.')) return; api('/api/excursiones/'+e.id+'/token-org',{method:'POST',body:{}}).then(function(r){ if(!r.ok){ toast(r.error,true); return; } toast('Enlace cambiado: envía el nuevo al organizador'); excDetalle(); }); };
  if($('copiar')) $('copiar').onclick = function(){ var u=enlaceExc(e.codigo); (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){ toast('Enlace copiado'); }, function(){ toast('Mantén presionado el enlace para copiarlo'); }); };
  $('panelx').querySelectorAll('[data-est]').forEach(function(b){ b.onclick=function(){ cambiarEstadoExc(b.dataset.est); }; });
  $('panelx').querySelectorAll('[data-km]').forEach(function(b){ b.onclick=function(){ formKm(b.dataset.km); }; });
  if($('xchk')) UNI.tarjetaExc(e.id, $('xchk'));
}
function textoWa(e,url){ return '🚐 *'+e.titulo+'*\n'+e.origen+' ⇄ '+e.destino+'\nSalida: '+fechaExc(e.salida,true)+(e.retorno?'\nRetorno: '+fechaExc(e.retorno,true):'')+(e.tipo==='por_asiento'?'\nPrecio: '+soles(e.precio_asiento)+' por asiento':'')+'\n\nElige tu asiento aquí 👇\n'+url+'\n\nVilla Azul · Turismo & Excursiones'; }
function cambiarEstadoExc(est){
  var e = S.excDet.excursion;
  if(est==='finalizada' && S.excDet.kpis.por_cobrar>0 && !confirm('Aún hay '+soles(S.excDet.kpis.por_cobrar)+' por cobrar. ¿Finalizar igual?')) return;
  api('/api/excursiones/'+e.id, {method:'PATCH', body:Object.assign({}, e, {estado:est})}).then(function(r){
    if(!r.ok){ toast(r.codigo==='RED'?'Sin conexión':r.error, true); return; }
    toast(est==='abierta'?'Reservas abiertas: ya puedes compartir el enlace':est==='cerrada'?'Reservas cerradas':'Viaje finalizado'); excDetalle();
  });
}
function formKm(cual){
  var e = S.excDet.excursion;
  abrirHoja('<h2 id="hoja-t">'+(cual==='inicio'?'Salida del viaje':'Llegada del viaje')+'</h2><p class="desc">Anota el kilometraje del odómetro'+(cual==='inicio'?' antes de arrancar.':' al terminar.')+(cual==='fin'&&e.km_inicio?' Salió con '+Number(e.km_inicio).toLocaleString('es-PE')+' km.':'')+'</p><div class="campo"><label for="km">Kilometraje</label><input id="km" inputmode="numeric" class="num"></div>'+botonesHoja('Guardar'));
  $('ok').onclick = function(){ var v=$('km').value.replace(/\D/g,''); if(!v) return $('er').textContent='Escribe el kilometraje.'; var b={}; b[cual==='inicio'?'km_inicio':'km_fin']=v;
    if($('kmfm')){ if($('kmfm').value.trim().length<5) return $('er').textContent='Escribe por qué sale sin un checklist apto (al menos 5 letras).'; b.forzar_checklist=true; b.motivo_checklist=$('kmfm').value.trim(); }
    api('/api/excursiones/'+e.id+'/km',{method:'POST',body:b}).then(function(r){
      if(!r.ok){
        // v5.0: sin checklist pre-ruta apto no se sale; un administrador puede hacerlo igual dejando el motivo.
        if((r.codigo==='CHECKLIST'||r.codigo==='NO_APTA') && !$('kmfm')){ $('er').textContent=r.error; $('ok').insertAdjacentHTML('beforebegin','<div class="campo" style="margin-top:0"><label for="kmfm">Salir igual: motivo</label><input id="kmfm" maxlength="200" placeholder="Queda registrado y se avisa al equipo"></div>'); $('ok').textContent='Registrar salida igual'; $('ok').classList.add('peligro'); return; }
        $('er').textContent=r.codigo==='RED'?'Sin conexión: anótalo y regístralo con señal.':r.error; return; }
      hoja.close(); toast('Kilometraje guardado'); excDetalle(); }); };
}

/* Asientos: la misma foto interactiva de la Hiace y el esquema que ve el cliente, con los estados de administración */
var FW=652, FH=683, FOTO={
  1:[343,125,410,198,377,152,44], 2:[422,125,490,198,455,152,44],
  3:[150,215,236,293,192,245,44], 4:[247,215,330,293,286,245,44], 5:[340,215,422,293,380,245,44],
  6:[98,306,205,390,151,348,48], 7:[223,306,333,390,278,348,48], 8:[465,306,565,392,515,350,48],
  9:[65,420,182,522,123,467,50], 10:[215,420,330,522,271,467,50], 11:[465,420,585,522,526,467,50],
  12:[65,546,195,630,130,590,52], 13:[205,546,330,630,267,590,52], 14:[342,546,468,630,405,590,52], 15:[478,546,586,630,522,592,52]
};
var VOLANTE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M3.5 10.5h6M14.5 10.5h6M12 14.5V21"/></svg>';
function excAsientos(){
  var vp = (S.excDet.vouchers||[]).filter(function(v){ return v.estado==='pendiente'; }).map(function(v){ return Object.assign({}, v, {pasajeros:S.excDet.pasajeros.filter(function(p){ return p.grupo===v.grupo; })}); });
  var d = S.excDet, e = d.excursion, tot = Number(e.asientos_total)||15, bloq = String(e.bloqueados||'').split(',').filter(Boolean).map(Number), ocupa = {};
  d.pasajeros.forEach(function(p){ if(p.estado!=='liberado' && !p.vencido) ocupa[p.asiento]=p; });
  function est(n){ if(n>tot || bloq.indexOf(n)>=0) return 'off'; var p=ocupa[n]; return !p?'libre':p.estado==='reservado'?'separado':p.estado; }
  var TXT = {libre:'Libre', separado:'Separado', confirmado:'Confirmado', pagado:'Pagado', off:'Bloqueado'};
  var pc = function(x){ return (Math.round(x*1000)/1000)+'%'; };
  var h = '<figure class="hiace" aria-label="Asientos de la Toyota Hiace"><figcaption class="titulo"><b>Toyota Hiace</b><span>Toca un asiento para ver o registrar al pasajero</span></figcaption>';
  h += '<div class="foto"><img src="/hiace-interior.jpg" width="652" height="683" alt="Interior de la van con los 15 asientos numerados">';
  for(var n=1;n<=15;n++){
    var f=FOTO[n], w=f[2]-f[0], hh=f[3]-f[1], v=est(n), p=ocupa[n];
    h += '<button type="button" class="ho '+v+'" data-seat="'+n+'"'+(v==='off'?' disabled':'')+' aria-label="Asiento '+n+', '+TXT[v]+(p?', '+esc(p.nombre):'')+'" style="left:'+pc(f[0]/FW*100)+';top:'+pc(f[1]/FH*100)+';width:'+pc(w/FW*100)+';height:'+pc(hh/FH*100)+'">'+
      '<span class="num" style="left:'+pc((f[4]-f[6]/2-f[0])/w*100)+';top:'+pc((f[5]-f[6]/2-f[1])/hh*100)+';width:'+pc(f[6]/w*100)+';height:'+pc(f[6]/hh*100)+'">'+n+'</span></button>';
  }
  h += '</div><div class="esquema"><div class="tablet"><span class="muesca">Adelante</span><div class="grilla">';
  PLANO.forEach(function(fila){
    if(fila==='sep'){ h+='<div class="fila-sep"></div>'; return; }
    fila.forEach(function(c){
      if(c==='conductor'){ h+='<div class="celda"><div class="cond">'+VOLANTE+'Conductor</div></div>'; return; }
      if(c==='vacio'||c==='pasillo'){ h+='<div class="celda" aria-hidden="true"></div>'; return; }
      if(c==='puerta'){ h+='<div class="celda puerta-e">Puerta ▸</div>'; return; }
      var v=est(c), p=ocupa[c];
      h += '<div class="celda"><button type="button" class="st '+v+'" data-seat="'+c+'"'+(v==='off'?' disabled':'')+' aria-label="Asiento '+c+', '+TXT[v]+(p?', '+esc(p.nombre):'')+'"><span class="n">'+c+'</span><span class="q">'+esc(p?corto(p.nombre):TXT[v])+'</span></button></div>';
    });
  });
  h += '</div></div><div class="leyenda-h"><span><i class="l1"></i>Libre</span><span><i class="l4"></i>Separado</span><span><i class="l2"></i>Confirmado</span><span><i class="l5"></i>Pagado</span></div></div></figure>';
  var act = d.pasajeros.filter(function(p){ return p.estado!=='liberado' && !p.vencido; }).sort(function(a,b){ return a.asiento-b.asiento; });
  var otros = d.pasajeros.filter(function(p){ return p.estado==='liberado' || p.vencido; });
  h += '<div class="titulo-sec"><h3>Manifiesto ('+act.length+')</h3><div class="botones"><button type="button" class="btn-mini" id="csv">Descargar Excel</button><button type="button" class="btn-mini" id="imp">Imprimir</button></div></div>';
  h += act.length ? '<div class="card tabla-wrap"><table class="tabla"><thead><tr><th>N.º</th><th>Nombre</th><th>DNI</th><th>Celular</th><th>Estado</th></tr></thead><tbody>'+act.map(function(p){ return '<tr><td>'+p.asiento+'</td><td>'+esc(p.nombre)+'</td><td class="num">'+esc(p.dni)+'</td><td class="num">'+esc(String(p.celular||'').replace(/^51/,''))+'</td><td>'+esc(PAS_TXT[p.estado])+(p.origen_registro==='enlace'?' · enlace':'')+'</td></tr>'; }).join('')+'</tbody></table></div>'
    : '<div class="card"><p class="vacio">Sin pasajeros. Comparte el enlace o toca un asiento libre para registrarlo.</p></div>';
  if(otros.length) h += '<details style="margin-top:12px"><summary>Liberados y vencidos ('+otros.length+')</summary><ul>'+otros.map(function(p){ return '<li>Asiento '+p.asiento+' · '+esc(p.nombre)+' · '+(p.vencido?'venció sin pago':esc(p.nota||'liberado'))+'</li>'; }).join('')+'</ul></details>';
  if(vp.length) h = '<div class="titulo-sec" style="margin-top:0"><h3>Vouchers por verificar</h3><span class="rol">'+vp.length+'</span></div>'+vp.map(function(v){ return tarjetaVoucher(v); }).join('')+'<div style="height:14px"></div>'+h;
  $('panelx').innerHTML = h;
  enlazarVouchers($('panelx'), vp, excDetalle);
  $('panelx').querySelectorAll('[data-seat]:not([disabled])').forEach(function(b){ b.onclick=function(){ var n=+b.dataset.seat; ocupa[n]?fichaPas(ocupa[n]):formPas(n); }; });
  $('csv').onclick = descargarManifiesto; $('imp').onclick = imprimirManifiesto;
}
function corto(n){ var p=String(n).split(' '); return p[0]+(p[1]?' '+p[1].charAt(0)+'.':''); }
function fichaPas(p){
  var e = S.excDet.excursion;
  var h = '<h2 id="hoja-t">Asiento '+p.asiento+'</h2><p class="desc">'+esc(SEATS[p.asiento])+'</p><dl class="ficha"><dt>Nombre</dt><dd>'+esc(p.nombre)+'</dd><dt>DNI</dt><dd class="num">'+esc(p.dni)+'</dd>'+
    '<dt>Celular</dt><dd>'+(p.celular?'<a href="https://wa.me/'+esc(p.celular)+'" target="_blank" rel="noopener">'+esc(String(p.celular).replace(/^51/,''))+'</a>':'—')+'</dd><dt>Estado</dt><dd>'+esc(PAS_TXT[p.estado])+'</dd>'+
    (p.precio!=null&&p.precio!==''?'<dt>Precio</dt><dd>'+soles(p.precio)+'</dd>':'')+'<dt>Registro</dt><dd>'+({enlace:'Por enlace',organizador:'Por el organizador'}[p.origen_registro]||'En la app')+(p.grupo?' · código '+esc(p.grupo):'')+'</dd>'+(p.nota?'<dt>Nota</dt><dd>'+esc(p.nota)+'</dd>':'')+'</dl><div class="acciones">';
  if(p.estado==='reservado') h += '<button type="button" class="btn ancho" data-a="confirmado">Confirmar asiento</button>';
  if(p.estado!=='pagado' && e.tipo==='por_asiento') h += '<button type="button" class="btn ancho" data-a="cobrar">Registrar pago y marcar pagado</button>';
  if(p.estado!=='pagado' && e.tipo==='contrato') h += '<button type="button" class="btn sec ancho" data-a="pagado">Marcar pagado</button>';
  h += '<button type="button" class="btn sec ancho" data-a="contacto">'+(['confirmado','pagado'].indexOf(p.estado)>=0?'Enviar boleto · WhatsApp · SMS · Llamar':'Contactar · WhatsApp · SMS · Llamar')+'</button>';
  h += '<button type="button" class="btn sec ancho" data-a="editar">Editar o cambiar de asiento</button><button type="button" class="btn peligro ancho" data-a="liberado">Liberar asiento</button><button type="button" class="btn peligro ancho" data-a="eliminar">'+ico('basura')+'Eliminar reserva (hecha por error)</button><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  abrirHoja(h);
  hoja.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){
    var a=b.dataset.a;
    if(a==='editar') return formPas(p.asiento, p);
    if(a==='contacto'){ var grupo = p.grupo ? S.excDet.pasajeros.filter(function(x){ return x.grupo===p.grupo && x.estado!=='liberado' && !x.vencido; }) : [p]; return hojaContacto(e, grupo, p.celular); }
    if(a==='cobrar') return formCobro(p);
    if(a==='eliminar'){
      if(!confirm('¿Eliminar la reserva de '+p.nombre+' (asiento '+p.asiento+')? No se puede deshacer.')) return;
      return api('/api/excursiones/'+S.excDet.excursion.id+'/pasajeros',{method:'POST',body:{accion:'eliminar',id:p.id}}).then(function(r){ if(!r.ok){ toast(r.error,true); return; } hoja.close(); toast('Reserva eliminada'); excDetalle(); });
    }
    if(a==='liberado' && !confirm('¿Liberar el asiento '+p.asiento+' de '+p.nombre+'? Queda registrado.')) return;
    estadoPas(p, a);
  }; });
}
function estadoPas(p, est, cobro){
  return api('/api/excursiones/'+S.excDet.excursion.id+'/pasajeros',{method:'POST',body:{accion:'estado',id:p.id,estado:est,cobro:cobro||null}}).then(function(r){
    if(!r.ok){ toast(r.codigo==='RED'?'Sin conexión':r.error, true); return; }
    hoja.close(); toast({confirmado:'Asiento confirmado',pagado:'Pago registrado',liberado:'Asiento liberado',reservado:'Asiento separado'}[est]); excDetalle();
  });
}
var CUENTAS_EXC = [['','—'],['efectivo_jorge','Efectivo de Jorge'],['yape_jorge','Yape de Jorge'],['efectivo_myaipen','Caja de la empresa'],['yape_ychavez','Yape de la empresa'],['cliente','Pagó el cliente directo']];
function opcionesCuenta(sel){ return CUENTAS_EXC.map(function(c){ return '<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+c[1]+'</option>'; }).join(''); }
function chipsMedio(nombre, sel){ return '<div class="chips">'+['efectivo','yape','transferencia'].map(function(m){ return '<button type="button" class="chip" data-'+nombre+'="'+m+'" aria-pressed="'+(m===sel)+'">'+m.charAt(0).toUpperCase()+m.slice(1)+'</button>'; }).join('')+'</div>'; }
function enlazarChips(attr){ hoja.querySelectorAll('[data-'+attr+']').forEach(function(b){ b.onclick=function(){ hoja.querySelectorAll('[data-'+attr+']').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); }; }); }
function chipSel(attr){ var b=hoja.querySelector('[data-'+attr+'][aria-pressed="true"]'); return b?b.getAttribute('data-'+attr):''; }
function formCobro(p){
  abrirHoja('<h2 id="hoja-t">Pago del asiento '+p.asiento+'</h2><p class="desc">'+esc(p.nombre)+'</p><div class="campo"><label for="cm">Monto recibido</label><input id="cm" inputmode="decimal" class="num" value="'+esc(p.precio||'')+'"></div>'+
    '<span class="etq">Medio</span>'+chipsMedio('cmed','yape')+'<div class="campo"><label for="ccu">¿A qué bolsillo entró?</label><select id="ccu">'+opcionesCuenta('yape_ychavez')+'</select></div>'+botonesHoja('Guardar pago'));
  enlazarChips('cmed');
  $('ok').onclick = function(){ var m=Number($('cm').value.replace(',','.')); if(!(m>0)) return $('er').textContent='Escribe el monto.'; estadoPas(p,'pagado',{monto:m, medio:chipSel('cmed'), cuenta:$('ccu').value, categoria:'pasaje'}); };
}
function formPas(n, p){
  var e = S.excDet.excursion;
  abrirHoja('<h2 id="hoja-t">'+(p?'Editar pasajero':'Asiento '+n)+'</h2><p class="desc">'+(p?'':esc(SEATS[n]))+'</p>'+(p?'<div class="campo"><label for="aa">Asiento</label><input id="aa" inputmode="numeric" value="'+p.asiento+'"></div>':'')+
    '<div class="campo"><label for="an">Nombre completo</label><input id="an" value="'+esc(p?p.nombre:'')+'" autocomplete="off"></div><div class="dos"><div class="campo"><label for="ad">DNI</label><input id="ad" inputmode="numeric" maxlength="8" value="'+esc(p?p.dni:'')+'"></div>'+
    '<div class="campo"><label for="ac">Celular</label><input id="ac" inputmode="tel" value="'+esc(p?String(p.celular||'').replace(/^51/,''):'')+'"></div></div>'+
    (e.tipo==='por_asiento'?'<div class="campo"><label for="ap">Precio <small style="font-weight:500;color:var(--muted)">(cambia si hay descuento)</small></label><input id="ap" inputmode="decimal" value="'+esc(p?p.precio:e.precio_asiento)+'"></div>':'')+
    (!p?'<span class="etq">Estado</span><div class="chips">'+['confirmado','reservado','pagado'].map(function(s,i){ return '<button type="button" class="chip" data-aes="'+s+'" aria-pressed="'+(i===0)+'">'+PAS_TXT[s]+'</button>'; }).join('')+'</div>':'')+
    '<div class="campo"><label for="ano">Nota</label><input id="ano" value="'+esc(p?p.nota||'':'')+'"></div>'+botonesHoja('Guardar pasajero'));
  enlazarChips('aes');
  $('ok').onclick = function(){
    var b = {accion:p?'editar':'asignar', id:p?p.id:undefined, asiento:p?Number($('aa').value):n, nombre:$('an').value, dni:$('ad').value, celular:$('ac').value, precio:$('ap')?$('ap').value:'', nota:$('ano').value, estado:p?undefined:chipSel('aes')};
    api('/api/excursiones/'+e.id+'/pasajeros',{method:'POST',body:b}).then(function(r){ if(!r.ok){ $('er').textContent=r.codigo==='RED'?'Sin conexión':r.error; return; } hoja.close(); toast('Pasajero guardado'); excDetalle(); });
  };
}
function filasManifiesto(){ return S.excDet.pasajeros.filter(function(p){ return p.estado!=='liberado' && !p.vencido; }).sort(function(a,b){ return a.asiento-b.asiento; }); }
function descargarManifiesto(){
  var e = S.excDet.excursion;
  var f = [['Asiento','Ubicación','Nombre','DNI','Celular','Estado','Precio']].concat(filasManifiesto().map(function(p){ return [p.asiento, SEATS[p.asiento], p.nombre, p.dni, String(p.celular||'').replace(/^51/,''), PAS_TXT[p.estado], p.precio==null?'':p.precio]; }));
  var csv = '\ufeff'+f.map(function(r){ return r.map(function(v){ return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'; }).join(';'); }).join('\r\n');
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  a.download = 'manifiesto-'+String(e.salida).slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function imprimirManifiesto(){
  var e = S.excDet.excursion, placa = ((S.cat.unidades||[])[0]||{}).placa||'';
  $('imprimir').innerHTML = '<h2>Manifiesto de pasajeros · Villa Azul · Turismo & Excursiones</h2><p><b>'+esc(e.titulo)+'</b> — '+esc(e.origen)+' ⇄ '+esc(e.destino)+(e.via?' (vía '+esc(e.via)+')':'')+'<br>Salida: '+esc(fechaExc(e.salida,true))+(e.retorno?' · Retorno: '+esc(fechaExc(e.retorno,true)):'')+'</p>'+
    '<table><thead><tr><th>N.º</th><th>Nombre completo</th><th>DNI</th><th>Celular</th><th>Firma</th></tr></thead><tbody>'+filasManifiesto().map(function(p){ return '<tr><td>'+p.asiento+'</td><td>'+esc(p.nombre)+'</td><td>'+esc(p.dni)+'</td><td>'+esc(String(p.celular||'').replace(/^51/,''))+'</td><td style="width:30%"></td></tr>'; }).join('')+'</tbody></table><p style="margin-top:28px">Conductor: ______________________ &nbsp; Placa: '+esc(placa)+'</p>';
  window.print();
}

/* Ingresos y gastos: pasan por la cola, así se registran en carretera sin señal. */
function excCaja(){
  var d = S.excDet, e = d.excursion, k = d.kpis;
  var pend = S.outbox.filter(function(o){ return o.tipo==='exc.mov' && o.datos.excursion_id===e.id; });
  var h = '<div class="kpis k3">'+kpiX(soles(k.cobrado),'Cobrado')+kpiX(soles(k.gastos),'Gastos')+kpiX(soles(k.utilidad),'Utilidad real',k.utilidad<0)+'</div><div class="titulo-sec"><h3>Movimientos</h3></div><div class="card"><ul class="lista">';
  h += pend.map(function(o){ var m=o.datos; return '<li class="mov"><span class="ic '+(m.tipo==='ingreso'?'i':'e')+'">'+ico(m.tipo==='ingreso'?'arriba':'abajo')+'</span><div><b>'+esc(EXC_CAT_TXT[m.categoria])+'<span class="estado cola">'+(o.estado==='rechazado'?'Rechazado':'En cola')+'</span></b><small>'+(o.error?esc(o.error):'Se enviará sola cuando haya señal')+'</small></div><span class="m num '+(m.tipo==='ingreso'?'ok':'bad')+'">'+(m.tipo==='ingreso'?'+':'−')+soles(m.monto)+'</span></li>'; }).join('');
  var movs = d.movimientos.slice().sort(function(a,b){ return String(b.fecha).localeCompare(String(a.fecha)); });
  if(!movs.length && !pend.length) h += '<li class="vacio">Sin movimientos. Registra el adelanto del cliente o el primer gasto.</li>';
  h += movs.map(function(m){
    var an = !!m.anulado, det = [fechaExc(m.fecha), m.medio, m.registrado_por];
    if(m.galones) det.push(m.galones+' gal'); if(m.comprobante_tipo && m.comprobante_tipo!=='sin') det.push(m.comprobante_tipo+(m.comprobante_num?' '+m.comprobante_num:''));
    return '<li class="mov"'+(an?' style="opacity:.55"':'')+'><span class="ic '+(m.tipo==='ingreso'?'i':'e')+'">'+ico(m.tipo==='ingreso'?'arriba':'abajo')+'</span><div><b>'+esc(EXC_CAT_TXT[m.categoria]||m.categoria)+(m.descripcion?' · '+esc(m.descripcion):'')+'</b><small>'+esc(det.join(' · '))+
      (m.foto_id?' · <a href="#" data-foto="'+esc(m.foto_url)+'">Ver boleta</a>':(m.tipo==='egreso'&&(!m.comprobante_tipo||m.comprobante_tipo==='sin')?' · <b class="bad">sin boleta</b>':''))+(an?'<br>Anulado por '+esc(m.anulado_por)+': '+esc(m.motivo_anulacion):'')+'</small></div>'+
      '<div style="text-align:right"><span class="m num '+(m.tipo==='ingreso'?'ok':'bad')+'"'+(an?' style="text-decoration:line-through"':'')+'>'+(m.tipo==='ingreso'?'+':'−')+soles(m.monto)+'</span>'+(an?'':'<br><span class="botones" style="justify-content:flex-end;margin-top:4px"><button type="button" class="btn-mini" style="min-height:32px;padding:4px 10px" data-editx="'+esc(m.id)+'">Editar</button><button type="button" class="btn-mini" style="min-height:32px;padding:4px 10px" data-anular="'+esc(m.id)+'">Anular</button></span>')+'</div></li>';
  }).join('');
  h += '</ul></div><div style="height:80px"></div><div class="flota"><button type="button" class="btn sec" id="ning">'+ico('arriba')+'Ingreso</button><button type="button" class="btn" id="ngas">'+ico('abajo')+'Gasto</button></div>';
  $('panelx').innerHTML = h;
  $('ning').onclick = function(){ formMovExc('ingreso'); }; $('ngas').onclick = function(){ formMovExc('egreso'); };
  $('panelx').querySelectorAll('[data-foto]').forEach(function(a){ a.onclick=function(ev){ ev.preventDefault(); verBoleta(a.dataset.foto); }; });
  $('panelx').querySelectorAll('[data-editx]').forEach(function(b){ b.onclick=function(){ editarMovExc(d.movimientos.filter(function(m){ return m.id===b.dataset.editx; })[0]); }; });
  $('panelx').querySelectorAll('[data-anular]').forEach(function(b){ b.onclick=function(){
    var motivo = prompt('Motivo de la anulación (queda registrado):'); if(!motivo) return;
    api('/api/exc-movimientos/'+b.dataset.anular+'/anular',{method:'POST',body:{motivo:motivo}}).then(function(r){ if(!r.ok){ toast(r.codigo==='RED'?'Sin conexión':r.error,true); return; } toast('Movimiento anulado'); excDetalle(); });
  }; });
}
function editarMovExc(m){
  abrirHoja('<h2 id="hoja-t">Editar '+esc(EXC_CAT_TXT[m.categoria]||m.categoria)+'</h2><p class="desc">El cambio queda registrado con el valor anterior, el nuevo y el motivo.</p>'+
    '<div class="dos"><div class="campo"><label for="xmo">Monto S/</label><input id="xmo" inputmode="decimal" class="num" value="'+esc(m.monto)+'"></div><div class="campo"><label for="xca">Tipo</label><select id="xca">'+EXC_CAT[m.tipo].map(function(c){ return '<option value="'+c+'"'+(c===m.categoria?' selected':'')+'>'+EXC_CAT_TXT[c]+'</option>'; }).join('')+'</select></div></div>'+
    '<div class="dos"><div class="campo"><label for="xme">Medio</label><select id="xme">'+['efectivo','yape','transferencia'].map(function(x){ return '<option value="'+x+'"'+(x===m.medio?' selected':'')+'>'+x.charAt(0).toUpperCase()+x.slice(1)+'</option>'; }).join('')+'</select></div><div class="campo"><label for="xnu">N.º comprobante</label><input id="xnu" value="'+esc(m.comprobante_num||'')+'"></div></div>'+
    (m.categoria==='combustible'?'<div class="campo"><label for="xga">Galones</label><input id="xga" inputmode="decimal" class="num" value="'+esc(m.galones||'')+'"></div>':'')+
    '<div class="campo"><label for="xde">Detalle</label><input id="xde" value="'+esc(m.descripcion||'')+'"></div><div class="campo"><label for="xmt">Motivo del cambio</label><input id="xmt" maxlength="200"></div>'+botonesHoja('Guardar cambios'));
  $('ok').onclick = function(){
    var t=$('xmt').value.trim(); if(t.length<5) return $('er').textContent='Escribe el motivo (al menos 5 letras).';
    var b={monto:$('xmo').value.replace(',','.'), categoria:$('xca').value, medio:$('xme').value, comprobante_num:$('xnu').value, descripcion:$('xde').value, motivo:t}; if($('xga')) b.galones=$('xga').value;
    $('ok').disabled=true;
    api('/api/exc-movimientos/'+m.id,{method:'PATCH',body:b}).then(function(r){ $('ok').disabled=false; if(!r.ok){ $('er').textContent=r.codigo==='RED'?'Sin conexión':r.error; return; } hoja.close(); toast('Cambios guardados'); excDetalle(); });
  };
}
function verBoleta(url){
  fetch(url,{headers:{authorization:'Bearer '+S.token}}).then(function(r){ if(!r.ok) throw 0; return r.blob(); }).then(function(b){
    var u = URL.createObjectURL(b);
    abrirHoja('<h2 id="hoja-t">Comprobante</h2>'+(b.type==='application/pdf'?'<p class="desc"><a href="'+u+'" target="_blank" rel="noopener">Abrir el PDF</a></p>':'<img src="'+u+'" alt="Foto del comprobante" style="width:100%;border-radius:12px;margin-top:10px">')+'<div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
  }).catch(function(){ toast('No se pudo abrir la boleta: necesita señal', true); });
}
function formMovExc(tipo){
  var e = S.excDet.excursion, def = tipo==='egreso'?'combustible':(S.excDet.kpis.cobrado>0?'saldo':'adelanto'), foto = null;
  var h = '<h2 id="hoja-t">'+(tipo==='egreso'?'Nuevo gasto':'Nuevo ingreso')+'</h2><span class="etq">Tipo</span><div class="chips">'+EXC_CAT[tipo].map(function(c){ return '<button type="button" class="chip" data-mcat="'+c+'" aria-pressed="'+(c===def)+'">'+EXC_CAT_TXT[c]+'</button>'; }).join('')+'</div>'+
    '<div class="dos"><div class="campo"><label for="mmo">Monto S/</label><input id="mmo" inputmode="decimal" class="num"></div><div class="campo" id="bgal"><label for="mga">Galones</label><input id="mga" inputmode="decimal" class="num"></div></div>'+
    '<span class="etq">Medio</span>'+chipsMedio('mmed','efectivo')+'<div class="campo"><label for="mcu">'+(tipo==='egreso'?'¿De qué bolsillo salió?':'¿A qué bolsillo entró?')+'</label><select id="mcu">'+opcionesCuenta('')+'</select></div>';
  if(tipo==='egreso') h += '<span class="etq">Comprobante</span><div class="chips">'+[['boleta','Boleta'],['factura','Factura'],['ticket','Ticket'],['sin','Sin comprobante']].map(function(c,i){ return '<button type="button" class="chip" data-mcom="'+c[0]+'" aria-pressed="'+(i===0)+'">'+c[1]+'</button>'; }).join('')+'</div>'+
    '<div class="dos"><div class="campo"><label for="mnu">N.º de comprobante</label><input id="mnu" autocomplete="off"></div><div class="campo"><label for="mkm">Km odómetro</label><input id="mkm" inputmode="numeric" class="num"></div></div>'+
    '<div class="campo"><label for="mfo">Foto de la boleta</label><input id="mfo" type="file" accept="image/*,application/pdf" capture="environment"></div><img id="mpr" class="previa oculto" alt="Vista previa de la boleta">';
  h += '<div class="campo"><label for="mde">Detalle</label><input id="mde" autocomplete="off" placeholder="Grifo, lugar, quién pagó…"></div><div class="campo"><label for="mfe">Fecha y hora</label><input id="mfe" type="datetime-local" value="'+ahoraLocalInput()+'"></div>'+botonesHoja('Guardar');
  abrirHoja(h); enlazarChips('mmed'); enlazarChips('mcom');
  function verGal(){ $('bgal').style.visibility = chipSel('mcat')==='combustible'?'visible':'hidden'; }
  hoja.querySelectorAll('[data-mcat]').forEach(function(b){ b.onclick=function(){ hoja.querySelectorAll('[data-mcat]').forEach(function(x){ x.setAttribute('aria-pressed', x===b); }); verGal(); }; }); verGal();
  if($('mfo')) $('mfo').onchange = function(){
    var file = this.files[0]; if(!file){ foto=null; return; }
    $('ok').disabled = true; $('er').textContent = 'Preparando la foto…';
    comprimirFoto(file).then(function(f){ foto=f; $('er').textContent=''; $('ok').disabled=false; if(f.mime!=='application/pdf'){ $('mpr').src='data:'+f.mime+';base64,'+f.data; $('mpr').classList.remove('oculto'); } })
      .catch(function(err){ foto=null; $('ok').disabled=false; $('er').textContent=err.message; });
  };
  $('ok').onclick = function(){
    var monto = Number($('mmo').value.replace(',','.')); if(!(monto>0)){ $('er').textContent='Escribe el monto.'; return; }
    var cat = chipSel('mcat'), com = chipSel('mcom') || 'sin';
    if(tipo==='egreso' && com!=='sin' && !foto && !$('mnu').value.trim() && !confirm('No pusiste foto ni número de comprobante. ¿Guardar así?')) return;
    var datos = {id:uuid(), excursion_id:e.id, tipo:tipo, categoria:cat, monto:monto, medio:chipSel('mmed'), cuenta:$('mcu').value, galones:cat==='combustible'?$('mga').value:'',
      km_odometro:$('mkm')?$('mkm').value:'', comprobante_tipo:tipo==='egreso'?com:'sin', comprobante_num:$('mnu')?$('mnu').value:'', descripcion:$('mde').value, fecha:$('mfe').value, foto:foto};
    $('ok').disabled = true;
    var op = {op_id:uuid(), tipo:'exc.mov', datos:datos, creado:Date.now(), estado:'pendiente'};
    tx('outbox','readwrite',function(s){ s.put(op); }).then(cargarLocal).then(function(){
      hoja.close();
      toast(navigator.onLine ? (tipo==='egreso'?'Gasto registrado':'Ingreso registrado') : 'Sin señal: guardado en el teléfono, se enviará solo');
      excCaja();
      return sincronizar();
    }).then(function(){ if(navigator.onLine) excDetalle(); }).catch(function(){ toast('El teléfono no pudo guardar el registro', true); $('ok').disabled=false; });
  };
}
/* Foto a JPEG de 1280 px: de ~4 MB a ~150 KB, para que suba con 2G. */
function comprimirFoto(file){
  return new Promise(function(ok, mal){
    var lector = new FileReader(); lector.onerror = function(){ mal(new Error('No se pudo leer el archivo.')); };
    if(file.type==='application/pdf'){ if(file.size > 1400000) return mal(new Error('El PDF pesa más de 1.4 MB. Toma una foto en su lugar.')); lector.onload=function(){ ok({mime:'application/pdf', data:String(lector.result).split(',')[1]}); }; return lector.readAsDataURL(file); }
    lector.onload = function(){ var img = new Image(); img.onload = function(){ var max=1280, f=Math.min(1, max/Math.max(img.naturalWidth,img.naturalHeight)), c=document.createElement('canvas'); c.width=Math.round(img.naturalWidth*f); c.height=Math.round(img.naturalHeight*f); c.getContext('2d').drawImage(img,0,0,c.width,c.height); ok({mime:'image/jpeg', data:c.toDataURL('image/jpeg',0.72).split(',')[1]}); }; img.onerror=function(){ mal(new Error('Ese archivo no es una imagen válida.')); }; img.src = lector.result; };
    lector.readAsDataURL(file);
  });
}

/* Crear y editar */
function formExcursion(e, dentro){
  var x = e || {tipo:'contrato', asientos_total:15, vence_horas:0, origen:'Angasmarca'}, v = function(k){ return esc(x[k]==null?'':x[k]); };
  var h = (dentro?'':'<h2 id="hoja-t">Nueva excursión</h2>')+'<div class="campo"><label for="et">Nombre del viaje</label><input id="et" value="'+v('titulo')+'" maxlength="80" placeholder="Ej.: Retiro hermanos de la iglesia"></div>'+
    '<span class="etq">Tipo de venta</span><div class="chips"><button type="button" class="chip" data-eti="contrato" aria-pressed="'+(x.tipo!=='por_asiento')+'">Contrato (van completa)</button><button type="button" class="chip" data-eti="por_asiento" aria-pressed="'+(x.tipo==='por_asiento')+'">Venta por asiento</button></div>'+
    '<div class="dos"><div class="campo"><label for="eo">Origen</label><input id="eo" value="'+v('origen')+'"></div><div class="campo"><label for="ed">Destino</label><input id="ed" value="'+v('destino')+'"></div></div>'+
    '<div class="campo"><label for="ev">Vía</label><input id="ev" value="'+v('via')+'" placeholder="Sierra (Pallasca) o costa (Trujillo)"></div>'+
    '<div class="dos"><div class="campo"><label for="es">Salida</label><input id="es" type="datetime-local" value="'+v('salida')+'"></div><div class="campo"><label for="er2">Retorno</label><input id="er2" type="datetime-local" value="'+v('retorno')+'"></div></div>'+
    '<div id="bcon"><div class="dos"><div class="campo"><label for="ecl">Cliente</label><input id="ecl" value="'+v('cliente')+'"></div><div class="campo"><label for="ect">Celular del cliente</label><input id="ect" inputmode="tel" value="'+esc(String(x.cliente_tel||'').replace(/^51/,''))+'"></div></div><div class="campo"><label for="emc">Monto del contrato S/</label><input id="emc" inputmode="decimal" class="num" value="'+v('monto_contrato')+'"></div></div>'+
    '<div id="basi"><div class="dos"><div class="campo"><label for="epa">Precio por asiento S/</label><input id="epa" inputmode="decimal" class="num" value="'+v('precio_asiento')+'"></div><div class="campo"><label for="evh">Horas para pagar</label><input id="evh" inputmode="numeric" value="'+v('vence_horas')+'"></div></div></div>'+
    '<div class="dos"><div class="campo"><label for="ea">Asientos a la venta</label><input id="ea" inputmode="numeric" value="'+v('asientos_total')+'"></div><div class="campo"><label for="eb">Bloqueados (ej.: 1, 2)</label><input id="eb" value="'+v('bloqueados')+'"></div></div>'+
    '<div class="campo"><label for="ecr">Cierre automático de reservas</label><input id="ecr" type="datetime-local" value="'+v('cierre_reservas')+'"></div>'+
    '<div class="campo"><label for="ew">WhatsApp que recibe las reservas</label><input id="ew" inputmode="tel" value="'+esc(String(x.whatsapp||'').replace(/^51/,''))+'" placeholder="9XX XXX XXX"></div>'+
    '<div class="campo"><label for="eip">Instrucciones de pago (las ve el cliente)</label><textarea id="eip">'+v('instrucciones_pago')+'</textarea></div><div class="campo"><label for="en">Notas internas</label><textarea id="en">'+v('notas')+'</textarea></div>'+
    (e?'<div class="campo"><label for="eest">Estado</label><select id="eest">'+Object.keys(EXC_EST).map(function(s){ return '<option value="'+s+'"'+(s===x.estado?' selected':'')+'>'+EXC_EST[s]+'</option>'; }).join('')+'</select></div>':'')+
    '<p class="error" id="er" role="alert"></p><div class="acciones"><button type="button" class="btn ancho" id="ok">'+(e?'Guardar cambios':'Crear excursión')+'</button>'+(dentro?'':'<button type="button" class="btn sec ancho" data-cerrar>Cancelar</button>')+'</div>';
  if(dentro){
    dentro.innerHTML = '<div class="card">'+h+'</div>'+(e && e.estado!=='anulada' ? '<div class="titulo-sec"><h3>Zona de cuidado</h3></div><div class="card"><p class="ayuda">Si la excursión se creó por error o se canceló.</p><div class="acciones">'+
      '<button type="button" class="btn sec ancho" id="xanu">Anular excursión y liberar asientos</button><button type="button" class="btn peligro ancho" id="xeli">'+ico('basura')+'Eliminar excursión</button></div></div>' : '');
    if($('xanu')) $('xanu').onclick = function(){ formMotivo('Anular '+e.titulo, 'Se liberan todos los asientos y la excursión deja de aparecer en la lista. Su historial se conserva.', 'Anular excursión', function(m){ return api('/api/excursiones/'+e.id,{method:'PATCH',body:Object.assign({}, e, {estado:'anulada', liberar:true, notas:(e.notas?e.notas+' | ':'')+'Anulada: '+m})}); }, 'Excursión anulada', function(){ S.excId=null; excLista(); }); };
    if($('xeli')) $('xeli').onclick = function(){ hojaEliminarExc(e); };
  } else abrirHoja(h);
  var raiz = dentro || hoja;
  function verTipo(){ var t = raiz.querySelector('[data-eti][aria-pressed="true"]').dataset.eti; $('bcon').classList.toggle('oculto', t!=='contrato'); $('basi').classList.toggle('oculto', t!=='por_asiento'); }
  raiz.querySelectorAll('[data-eti]').forEach(function(b){ b.onclick=function(){ raiz.querySelectorAll('[data-eti]').forEach(function(y){ y.setAttribute('aria-pressed', y===b); }); verTipo(); }; }); verTipo();
  if(dentro) restaurarBorrador();
  $('ok').onclick = function(){
    var datos = {titulo:$('et').value, tipo:raiz.querySelector('[data-eti][aria-pressed="true"]').dataset.eti, origen:$('eo').value, destino:$('ed').value, via:$('ev').value, salida:$('es').value, retorno:$('er2').value,
      cliente:$('ecl').value, cliente_tel:$('ect').value, monto_contrato:$('emc').value, precio_asiento:$('epa').value, vence_horas:$('evh').value, asientos_total:$('ea').value, bloqueados:$('eb').value,
      cierre_reservas:$('ecr').value, whatsapp:$('ew').value, instrucciones_pago:$('eip').value, notas:$('en').value, estado:$('eest')?$('eest').value:undefined};
    if(!datos.titulo.trim()||!datos.origen.trim()||!datos.destino.trim()||!datos.salida){ $('er').textContent='Faltan nombre, origen, destino o fecha de salida.'; return; }
    $('ok').disabled = true;
    api(e?'/api/excursiones/'+e.id:'/api/excursiones', {method:e?'PATCH':'POST', body:datos}).then(function(r){
      $('ok').disabled = false;
      if(!r.ok){ $('er').textContent = r.codigo==='RED'?'Sin conexión: inténtalo con señal.':r.error; return; }
      if(!dentro) hoja.close(); else borrarBorrador();
      toast(e?'Cambios guardados':'Excursión creada. Ábrela a reservas para compartir el enlace.');
      abrirExc(r.data.id, 'resumen');
    });
  };
}

setInterval(function(){ if(S.yo && S.vista==='excursiones' && S.excId && S.excTab!=='datos' && !hoja.open && document.visibilityState==='visible' && navigator.onLine) excDetalle(); }, 30000);


/* ════════════ Caja diaria ════════════ */
S.cajaFecha = null; S.cajaPersona = null;
function sinSenal(v, txt){ $('vista').innerHTML = '<div class="card"><p class="vacio">'+(txt||'Sin señal.')+'</p></div>'; }
function fechaLarga(d){ var m=String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return d; var t=new Date(+m[1],m[2]-1,+m[3]).toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long'}); return t.charAt(0).toUpperCase()+t.slice(1); }
function chipCierre(c){
  if(!c) return '<span class="chip-est">Abierta</span>';
  var efe = c.estado==='verificado', yapeOk = !!c.yape_verificado_por || !c.cerrado_por, d = Number(c.estado==='verificado' && c.diferencia_final!=null ? c.diferencia_final : c.diferencia)||0;
  var h = efe ? '<span class="chip-est abierta">Efectivo verificado</span>' : '<span class="chip-est en_ruta">Efectivo por verificar</span>';
  if(c.cerrado_por) h += yapeOk ? '<span class="chip-est abierta">Yape verificado</span>' : '<span class="chip-est en_ruta">Yape por verificar</span>';
  if(d) h += '<span class="chip-est anulada">'+(d<0?'Falta ':'Sobra ')+soles(Math.abs(d))+'</span>';
  return h;
}
function vCaja(){
  if(!navigator.onLine) return sinSenal(null, 'La caja se cierra con señal: así el efectivo y el Yape quedan verificados al instante. Tus registros sin señal se guardan y se envían solos.');
  if(esMando(S.yo) && !S.cajaPersona) return cajaResumen();
  cajaPersona(S.cajaPersona || S.yo.id);
}
function cajaResumen(){
  var f = S.cajaFecha || hoyLima();
  $('vista').innerHTML = '<p class="vacio">Cargando la caja…</p>';
  api('/api/caja/resumen?fecha='+f).then(function(r){
    if(!r.ok){ $('vista').innerHTML = '<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    var d = r.data, txt = function(x){ return x.funcion==='operador'?'Operador':'Verifica '+x.funcion; };
    var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Caja del día</h2><p>'+esc(fechaLarga(f))+' · tú verificas '+(d.puedo_efectivo&&d.puedo_yape?'efectivo y Yape':d.puedo_efectivo?'el efectivo':'los Yape')+'</p></div>'+
      '<div class="campo" style="margin:0"><label for="cfd" class="oculto">Fecha</label><input id="cfd" type="date" value="'+f+'" max="'+hoyLima()+'"></div></div>';
    h += d.filas.map(function(x){ return '<button type="button" class="exc-item" data-cp="'+esc(x.usuario_id)+'"><b>'+esc(x.nombre)+'</b> <span class="rol '+x.rol+'">'+esc(txt(x))+'</span>'+(x.viaje_abierto?' <span class="chip-est en_ruta">Viaje abierto</span>':'')+
      '<div class="datos num"><span>Efectivo esperado '+soles(x.efectivo_sistema)+'</span><span>Yape neto '+soles(x.digital_neto)+'</span>'+(x.por_recibir?'<span class="warn">Por recibir '+soles(x.por_recibir)+'</span>':'')+'<span>'+x.movimientos+' registros</span></div><div style="margin-top:8px">'+chipCierre(x.cierre)+'</div></button>'; }).join('');
    h += '<button type="button" class="btn sec ancho" id="creg" style="margin-top:6px">'+ico('mas')+'Registrar en este día (a nombre de alguien)</button>';
    $('vista').innerHTML = h;
    $('cfd').onchange = function(){ S.cajaFecha = this.value; cajaResumen(); };
    $('creg').onclick = function(){ S.regFecha = f+'T'+(f===hoyLima()?ahoraLima().slice(11,16):'12:00'); ir('registrar', true); };
    $('vista').querySelectorAll('[data-cp]').forEach(function(b){ b.onclick = function(){ S.cajaPersona = b.dataset.cp; cajaPersona(b.dataset.cp); window.scrollTo(0,0); }; });
  });
}
function cajaPersona(uid){
  var f = S.cajaFecha || hoyLima();
  $('vista').innerHTML = '<p class="vacio">Cargando…</p>';
  api('/api/caja?fecha='+f+(uid!==S.yo.id?'&usuario='+uid:'')).then(function(r){
    if(!r.ok){ $('vista').innerHTML = '<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    var a = r.data, c = a.cierre, mando = esMando(S.yo), ajena = !a.es_mio;
    var h = mando ? '<button type="button" class="enlace" id="cvol" style="padding:4px 0">← Caja de todos</button>' : '';
    h += '<div class="saludo entrar"><h2>'+(ajena?'Caja de '+esc(a.nombre):'Mi caja')+'</h2><p>'+esc(fechaLarga(f))+'</p></div>';
    if(a.viaje_abierto) h += '<div class="card" style="border-color:var(--warn);background:var(--warn-soft)"><b class="warn">Viaje abierto: '+esc(a.viaje_abierto.origen)+' → '+esc(a.viaje_abierto.destino)+'</b><small style="display:block;color:var(--muted)">Desde el '+esc(fechaCorta(a.viaje_abierto.fecha))+'. Revisa que estén todos los boletos antes de cerrar.'+(mando?'':' Avísale a un administrador para cerrarlo.')+'</small>'+(mando?'<button type="button" class="btn-mini" id="cva" style="margin-top:8px">Cerrar ese viaje</button>':'')+'</div>';
    h += '<div class="kpis" style="margin-top:12px"><div class="kpi"><small>Efectivo esperado</small><b class="num" data-v="'+a.efectivo_sistema+'" data-p="S/ ">'+soles(a.efectivo_sistema)+'</b><span class="d">Cobros '+soles(a.ingresos_efectivo)+' − gastos '+soles(a.egresos_efectivo)+(a.recibido_operadores?' + recibido '+soles(a.recibido_operadores):'')+'</span></div>'+
      '<div class="kpi"><small>Yape neto del día</small><b class="num" data-v="'+a.digital_neto+'" data-p="S/ ">'+soles(a.digital_neto)+'</b><span class="d">Cobros '+soles(a.digital_ingresos)+' − gastos '+soles(a.digital_egresos)+'</span></div></div>';
    if(a.adelanto_operador) h += '<p class="ayuda">Pusiste de tu bolsillo '+soles(a.adelanto_operador)+': no se descuenta de lo que entregas, se te reembolsa aparte.</p>';
    if(a.pendientes_de_verificar.length) h += '<div class="card" style="margin-top:12px;border-color:var(--warn)"><b class="warn">Antes de cerrar tu día, verifica la caja de: '+esc(a.pendientes_de_verificar.map(function(x){return x.operador;}).join(', '))+'</b></div>';
    if(c){
      var dE = Number(c.estado==='verificado' && c.diferencia_final!=null ? c.diferencia_final : c.diferencia)||0, dY = Number(c.yape_diferencia_final!=null ? c.yape_diferencia_final : c.diferencia_digital)||0;
      h += '<div class="titulo-sec"><h3>Cierre</h3>'+(mando?'<button type="button" class="btn-mini" id="crea">Reabrir</button>':'')+'</div><div class="card"><dl class="ficha">'+
        '<dt>Efectivo</dt><dd>'+(c.estado==='verificado'?'Recibido '+soles(c.efectivo_recibido)+' · '+(c.verificado_por==='sistema'?'sin movimiento':'verificó '+esc(nombreLegado(c.verificado_por))):'Declarado '+soles(c.efectivo_declarado)+' · <span class="warn">por verificar</span>')+(dE?' · <span class="bad">'+(dE<0?'falta ':'sobra ')+soles(Math.abs(dE))+'</span>':' · <span class="ok">cuadra</span>')+'</dd>'+
        '<dt>Yape</dt><dd>'+(c.yape_verificado_por?'Llegó '+soles(c.yape_recibido)+' · '+(c.yape_verificado_por==='sistema'?'sin movimiento':'verificó '+esc(nombreLegado(c.yape_verificado_por))):(c.cerrado_por?'Declarado '+soles(c.digital_declarado)+' · <span class="warn">por verificar</span>':'Declarado '+soles(c.digital_declarado)))+(dY?' · <span class="bad">'+(dY<0?'falta ':'sobra ')+soles(Math.abs(dY))+'</span>':'')+'</dd>'+
        '<dt>Cerró</dt><dd>'+esc(c.cerrado_por?nombreLegado(c.cerrado_por):'(historial)')+' · '+esc(horaDe(c.cerrado_en))+'</dd>'+(c.observacion?'<dt>Notas</dt><dd>'+esc(c.observacion)+'</dd>':'')+'</dl>';
      var b = '';
      if(a.puedo_efectivo && c.estado==='cerrado') b += '<button type="button" class="btn ancho" id="cve">'+ico('check')+'Verificar efectivo recibido</button>';
      if(a.puedo_yape && c.cerrado_por && !c.yape_verificado_por) b += '<button type="button" class="btn ancho" id="cvy">'+ico('check')+'Verificar Yape recibido</button>';
      h += (b?'<div class="acciones">'+b+'</div>':'')+'</div>';
    } else {
      h += '<div class="titulo-sec"><h3>Cerrar la caja</h3></div><div class="card"><div class="campo"><label for="cef">Efectivo contado</label><input id="cef" inputmode="decimal" class="num" placeholder="0.00"></div><div id="dfe"></div>'+
        '<div class="campo"><label for="cyp">Yape cobrado hoy <small style="font-weight:500;color:var(--muted)">(mira tu app de Yape)</small></label><input id="cyp" inputmode="decimal" class="num" placeholder="0.00"></div><div id="dfy"></div>'+
        (ajena?'<div class="campo"><label for="cmo2">Motivo para cerrar la caja de '+esc(a.nombre)+'</label><input id="cmo2" maxlength="200" placeholder="Ej.: regularización de setiembre"></div>':'')+
        '<div class="campo"><label for="cob">Observación</label><input id="cob" maxlength="300"></div><p class="error" id="cer" role="alert"></p><button type="button" class="btn ancho" id="ccer" style="margin-top:8px" disabled>Cerrar caja</button></div>';
    }
    if(a.saldo_efectivo_pendiente || a.saldo_digital_pendiente) h += '<p class="ayuda" style="margin-top:10px">Saldo acumulado sin rendir · efectivo '+soles(a.saldo_efectivo_pendiente||0)+' · Yape '+soles(a.saldo_digital_pendiente||0)+'</p>';
    $('vista').innerHTML = h;
    document.querySelectorAll('#vista [data-v]').forEach(contar);
    if($('cvol')) $('cvol').onclick = function(){ S.cajaPersona = null; cajaResumen(); };
    if($('cva')) $('cva').onclick = function(){ cerrarViaje(a.viaje_abierto, function(){ cajaPersona(uid); }); };
    if($('crea')) $('crea').onclick = function(){ formMotivo('Reabrir la caja de '+a.nombre, 'Vuelve a quedar abierta para agregar o corregir registros. Luego hay que cerrarla de nuevo.', 'Reabrir caja', function(m){ return api('/api/caja/reabrir',{method:'POST',body:{usuario:a.usuario_id,fecha:f,motivo:m}}); }, 'Caja reabierta', function(){ cajaPersona(uid); }); };
    if($('cve')) $('cve').onclick = function(){ formVerificar('efectivo', a, c, f, uid); };
    if($('cvy')) $('cvy').onclick = function(){ formVerificar('yape', a, c, f, uid); };
    if($('ccer')){
      var dif = function(inp, esp, box){ var v = inp.value===''?null:Number(inp.value.replace(',','.')); if(v===null||isNaN(v)){ box.innerHTML=''; return false; } var d = Math.round((v-esp)*100)/100; box.innerHTML = '<div class="diff '+(d===0?'cero':d<0?'falta':'sobra')+'"><span>'+(d===0?'Cuadra exacto':d<0?'Falta':'Sobra')+'</span><span class="num">'+(d===0?ico('check'):soles(Math.abs(d)))+'</span></div>'; return true; };
      var rev = function(){ var e1 = dif($('cef'), a.efectivo_sistema, $('dfe')), e2 = a.digital_neto===0 ? true : dif($('cyp'), a.digital_neto, $('dfy')); if(a.digital_neto===0 && $('cyp').value!=='') dif($('cyp'), 0, $('dfy')); $('ccer').disabled = !(e1 && e2); };
      $('cef').oninput = rev; $('cyp').oninput = rev;
      restaurarBorrador(); rev();
      $('ccer').onclick = function(){
        $('ccer').disabled = true;
        api('/api/caja/cerrar',{method:'POST',body:{usuario:ajena?a.usuario_id:undefined, fecha:f, efectivo_declarado:$('cef').value.replace(',','.'), digital_declarado:$('cyp').value.replace(',','.'), motivo:$('cmo2')?$('cmo2').value:undefined, observacion:$('cob').value}}).then(function(r2){
          if(!r2.ok){ $('cer').textContent = r2.error; $('ccer').disabled = false; return; }
          var d = r2.data;
          borrarBorrador();
          toast('Caja cerrada'+(d.diferencia?' · '+(d.diferencia<0?'falta ':'sobra ')+soles(Math.abs(d.diferencia)):' · cuadra exacto'));
          (d.avisos||[]).forEach(function(x,i){ setTimeout(function(){ toast(x,true); }, 700*(i+1)); });
          if(d.pendiente && d.pendiente.length) setTimeout(function(){ toast('Queda por verificar: '+d.pendiente.join(' y '), false); }, 1500);
          cajaPersona(uid);
        });
      };
    }
  });
}
function nombreLegado(l){ var u=(S.cat.usuarios||[]).filter(function(x){ return (x.legado||'')===l; })[0]; return u?u.nombre:l; }
function formVerificar(que, a, c, f, uid){
  var esp = que==='efectivo' ? c.efectivo_declarado : c.digital_declarado;
  abrirHoja('<h2 id="hoja-t">'+(que==='efectivo'?'Verificar el efectivo':'Verificar el Yape')+' de '+esc(a.nombre)+'</h2><p class="desc">'+(que==='efectivo'?'Cuenta el efectivo que recibes en la mano. ':'Revisa en el Yape de la empresa cuánto llegó de este día. ')+'Declaró '+soles(esp)+'; el sistema esperaba '+soles(que==='efectivo'?c.efectivo_sistema:c.digital_sistema)+'.</p>'+
    '<div class="campo"><label for="vrm">'+(que==='efectivo'?'Efectivo recibido':'Yape recibido')+'</label><input id="vrm" inputmode="decimal" class="num" value="'+esc(esp)+'"></div><div id="vdf"></div>'+(que==='efectivo'?'<div class="campo"><label for="vob">Observación</label><input id="vob" maxlength="200"></div>':'')+botonesHoja('Verificar'));
  var sis = Number(que==='efectivo'?c.efectivo_sistema:c.digital_sistema)||0;
  var pinta = function(){ var v=Number($('vrm').value.replace(',','.')); if(isNaN(v)){ $('vdf').innerHTML=''; return; } var d=Math.round((v-sis)*100)/100; $('vdf').innerHTML='<div class="diff '+(d===0?'cero':d<0?'falta':'sobra')+'"><span>'+(d===0?'Cuadra con el sistema':d<0?'Falta':'Sobra')+'</span><span class="num">'+(d===0?ico('check'):soles(Math.abs(d)))+'</span></div>'; };
  $('vrm').oninput = pinta; pinta();
  $('ok').onclick = function(){
    $('ok').disabled = true;
    var body = {usuario:a.usuario_id, fecha:f}; if(que==='efectivo'){ body.efectivo_recibido=$('vrm').value.replace(',','.'); body.observacion=$('vob').value; } else body.yape_recibido=$('vrm').value.replace(',','.');
    api(que==='efectivo'?'/api/caja/verificar':'/api/caja/verificar-yape',{method:'POST',body:body}).then(function(r){
      $('ok').disabled = false;
      if(!r.ok){ $('er').textContent = r.error; return; }
      hoja.close(); toast((que==='efectivo'?'Efectivo':'Yape')+' verificado'+(r.data.diferencia_final?' · '+(r.data.diferencia_final<0?'falta ':'sobra ')+soles(Math.abs(r.data.diferencia_final)):' · cuadra'));
      [r.data.aviso_traspaso, r.data.aviso_caja_propia].filter(Boolean).forEach(function(x,i){ setTimeout(function(){ toast(x,true); }, 800*(i+1)); });
      cajaPersona(uid);
    });
  };
}
function formMotivo(titulo, desc, boton, llamada, exito, despues){
  abrirHoja('<h2 id="hoja-t">'+esc(titulo)+'</h2><p class="desc">'+esc(desc)+'</p><div class="campo"><label for="fmm">Motivo</label><textarea id="fmm" maxlength="200"></textarea></div>'+botonesHoja(boton));
  $('ok').onclick = function(){ var m=$('fmm').value.trim(); if(m.length<5) return $('er').textContent='Escribe el motivo (al menos 5 letras).'; $('ok').disabled=true;
    llamada(m).then(function(r){ $('ok').disabled=false; if(!r.ok){ $('er').textContent=r.error; return; } hoja.close(); toast(exito); if(r.data && r.data.aviso) setTimeout(function(){ toast(r.data.aviso,true); },700); if(despues) despues(); }); };
}
function cerrarViaje(v, despues){
  formMotivo('Cerrar viaje '+v.origen+' → '+v.destino, 'Quedó abierto desde el '+fechaCorta(v.fecha||v.d)+'. Al cerrarlo deja de aparecer como pendiente.', 'Cerrar viaje', function(m){ return api('/api/viajes/'+v.id+'/cerrar',{method:'POST',body:{motivo:m}}); }, 'Viaje cerrado', despues);
}

/* ════════════ Cuentas: bolsillos y traspasos ════════════ */
var TIPO_TR = {entrega:'Entrega de efectivo',transferencia:'Transferencia de Yape',reembolso:'Reembolso al operador',inyeccion:'Adelanto para la ruta',ajuste:'Ajuste'};
function vCuentas(){
  if(!navigator.onLine) return sinSenal(null, 'Los saldos se calculan con señal, con todos los registros al día.');
  $('vista').innerHTML = '<p class="vacio">Calculando saldos…</p>';
  api('/api/cuentas').then(function(r){
    if(!r.ok){ $('vista').innerHTML = '<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    var d = r.data, mando = esMando(S.yo), nom = function(k){ var c=d.todas.filter(function(x){return x.clave===k;})[0]; return c?c.nombre:k; };
    var h = '<div class="saludo entrar" style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap"><div><h2>Bolsillos</h2><p>Dónde está el dinero hoy · contado desde el '+esc(fechaCorta(d.corte))+'</p></div><button type="button" class="btn" id="ntr">'+ico('movs')+(mando?'Nuevo traspaso':'Declarar entrega')+'</button></div>';
    if(mando) h += '<div class="kpi" style="margin-bottom:12px"><small>Total de la empresa</small><b class="num" data-v="'+d.total_empresa+'" data-p="S/ ">'+soles(d.total_empresa)+'</b></div>';
    h += d.cuentas.map(function(c){ return '<div class="card bolsillo"'+(c.sin_rendir?' style="border-color:'+(c.sin_rendir<0?'var(--bad)':'var(--warn)')+'"':'')+'><div><b>'+esc(c.nombre)+'</b><small>'+(c.transitoria?'Debe quedar en cero al rendir':c.tipo==='personal'?'Dinero propio (reembolsos)':'Saldo continuo')+(c.sin_rendir?(c.sin_rendir<0?' · <b class="bad">en negativo: se entregó más de lo registrado</b>':' · <b class="warn">sin rendir</b>'):'')+'</small></div><b class="num '+(c.saldo<0?'bad':'')+'" data-v="'+c.saldo+'" data-p="S/ ">'+soles(c.saldo)+'</b></div>'; }).join('');
    Object.keys(d.deudas).forEach(function(k){ var x=d.deudas[k]; if(x.puso) h += '<p class="ayuda">Lo que '+esc(nombreLegado(k))+' puso de su bolsillo: '+soles(x.puso)+' · reembolsado '+soles(x.reembolsado)+' · <b>pendiente '+soles(x.pendiente)+'</b></p>'; });
    if(d.por_firmar.length) h += '<div class="titulo-sec"><h3>Esperan tu confirmación</h3><span class="rol">'+d.por_firmar.length+'</span></div>'+d.por_firmar.map(function(t){ return '<div class="card"><b>'+esc(TIPO_TR[t.tipo]||t.tipo)+' · '+soles(t.monto)+'</b><small style="display:block;color:var(--muted)">'+esc(nom(t.cuenta_origen))+' → '+esc(nom(t.cuenta_destino))+' · '+esc(fechaCorta(t.fecha))+' · declaró '+esc(nombreLegado(t.declarado_por))+'</small><small style="display:block">'+esc(t.motivo)+'</small><div class="botones" style="margin-top:8px"><button type="button" class="btn-mini" data-cf="'+esc(t.uuid)+'">Confirmo que llegó</button>'+(mando?'<button type="button" class="btn-mini" data-an="'+esc(t.uuid)+'" style="color:var(--bad)">Anular</button>':'')+'</div></div>'; }).join('');
    h += '<div class="titulo-sec"><h3>Traspasos recientes</h3></div><div class="card"><ul class="lista">'+(d.recientes.length?d.recientes.map(function(t){ return '<li class="mov" style="grid-template-columns:1fr auto'+(t.estado==='anulado'?';opacity:.55':'')+'"><div><b>'+esc(TIPO_TR[t.tipo]||t.tipo)+(t.estado!=='confirmado'?'<span class="estado '+(t.estado==='pendiente'?'cola':'inac')+'">'+esc(t.estado)+'</span>':'')+'</b><small>'+esc(nom(t.cuenta_origen))+' → '+esc(nom(t.cuenta_destino))+' · '+esc(fechaCorta(t.fecha))+'</small></div><div style="text-align:right"><span class="m num"'+(t.estado==='anulado'?' style="text-decoration:line-through"':'')+'>'+soles(t.monto)+'</span>'+(mando&&t.estado!=='anulado'?'<br><button type="button" class="btn-mini" style="margin-top:4px;min-height:32px;padding:4px 10px" data-an="'+esc(t.uuid)+'">Anular</button>':'')+'</div></li>'; }).join(''):'<li class="vacio">Sin traspasos.</li>')+'</ul></div>';
    $('vista').innerHTML = h;
    document.querySelectorAll('#vista [data-v]').forEach(contar);
    $('ntr').onclick = function(){ formTraspaso(d); };
    $('vista').querySelectorAll('[data-cf]').forEach(function(b){ b.onclick=function(){ b.disabled=true; api('/api/traspasos/'+b.dataset.cf+'/confirmar',{method:'POST',body:{}}).then(function(r2){ if(!r2.ok){ toast(r2.error,true); b.disabled=false; return; } toast('Traspaso confirmado'); vCuentas(); }); }; });
    $('vista').querySelectorAll('[data-an]').forEach(function(b){ b.onclick=function(){ formMotivo('Anular traspaso','El traspaso deja de mover saldos y queda en el historial como anulado.','Anular traspaso',function(m){ return api('/api/traspasos/'+b.dataset.an+'/anular',{method:'POST',body:{motivo:m}}); },'Traspaso anulado', vCuentas); }; });
  });
}
function formTraspaso(d){
  var mando = esMando(S.yo), propias = d.todas.filter(function(c){ return mando || c.dueno===(S.yo.legado||''); }), dest = d.todas;
  var tipos = mando ? ['entrega','transferencia','reembolso','inyeccion','ajuste'] : ['entrega','transferencia'];
  abrirHoja('<h2 id="hoja-t">'+(mando?'Nuevo traspaso':'Declarar entrega')+'</h2><p class="desc">Mover dinero entre bolsillos no es ingreso ni gasto. '+(mando?'':'Lo confirma quien lo recibe.')+'</p>'+
    '<div class="campo"><label for="tti">Tipo</label><select id="tti">'+tipos.map(function(t){ return '<option value="'+t+'">'+TIPO_TR[t]+'</option>'; }).join('')+'</select></div>'+
    '<div class="dos"><div class="campo"><label for="tor">Sale de</label><select id="tor">'+propias.map(function(c){ return '<option value="'+esc(c.clave)+'">'+esc(c.nombre)+'</option>'; }).join('')+'</select></div><div class="campo"><label for="tde">Entra a</label><select id="tde">'+dest.map(function(c){ return '<option value="'+esc(c.clave)+'">'+esc(c.nombre)+'</option>'; }).join('')+'</select></div></div>'+
    '<div class="dos"><div class="campo"><label for="tmo">Monto S/</label><input id="tmo" inputmode="decimal" class="num"></div><div class="campo"><label for="tfe">Fecha</label><input id="tfe" type="date" value="'+hoyLima()+'" max="'+hoyLima()+'"></div></div>'+
    '<div class="campo"><label for="tmt">Motivo</label><input id="tmt" maxlength="200" placeholder="Ej.: Yape del 20 de octubre"></div>'+botonesHoja('Guardar'));
  var sugerir = function(){ var t=$('tti').value, tipo = t==='transferencia'?'digital':t==='entrega'?'efectivo':null; if(!tipo) return;
    var o = propias.filter(function(c){ return c.tipo===tipo && c.transitoria; })[0]; if(o) $('tor').value=o.clave;
    var de = dest.filter(function(c){ return c.tipo===tipo && !c.transitoria; })[0]; if(de) $('tde').value=de.clave; };
  $('tti').onchange = sugerir; sugerir();
  var enviarT = function(conf){ $('ok').disabled=true; api('/api/traspasos',{method:'POST',body:{tipo:$('tti').value,cuenta_origen:$('tor').value,cuenta_destino:$('tde').value,monto:$('tmo').value.replace(',','.'),fecha:$('tfe').value,motivo:$('tmt').value,confirmado:conf}}).then(function(r){
    $('ok').disabled=false;
    if(!r.ok){ if(r.codigo==='CONFIRMAR' && confirm(r.error)) return enviarT(true); $('er').textContent=r.error; return; }
    hoja.close(); toast(r.data.estado==='pendiente'?'Declarado: espera la confirmación de la otra parte':'Traspaso registrado'); vCuentas(); }); };
  $('ok').onclick = function(){ enviarT(false); };
}

/* ════════════ Calendario ════════════ */
S.calMes = null;
function vCalendario(){
  if(!navigator.onLine) return sinSenal(null, 'El calendario se arma con señal.');
  var mes = S.calMes || hoyLima().slice(0,7);
  $('vista').innerHTML = '<p class="vacio">Armando el calendario…</p>';
  api('/api/calendario?mes='+mes).then(function(r){
    if(!r.ok){ $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    var d = r.data, dias = {}, y = +mes.slice(0,4), m = +mes.slice(5,7), n = new Date(y,m,0).getDate();
    var primero = (S.movs.map(function(x){ return String(x.fecha).slice(0,10); }).filter(Boolean).sort()[0]) || mes+'-01';
    for(var i=1;i<=n;i++){ var k = mes+'-'+('0'+i).slice(-2); dias[k] = {viajes:[], cierres:[], movs:[], ing:0, egr:0, n:0}; }
    d.viajes.forEach(function(v){ if(dias[v.d]) dias[v.d].viajes.push(v); });
    d.cierres.forEach(function(c){ if(dias[c.d]) dias[c.d].cierres.push(c); });
    d.movimientos.forEach(function(x){ if(dias[x.d]){ dias[x.d].movs.push(x); dias[x.d].ing+=x.ing; dias[x.d].egr+=x.egr; dias[x.d].n+=x.n; } });
    var res = {iv:0, ida:0, cuadra:0, desc:0, porVer:0, sinCierre:0, sinReg:0};
    Object.keys(dias).forEach(function(k){
      var x = dias[k], pares = {}; x.viajes.forEach(function(v){ pares[v.origen+'>'+v.destino]=1; });
      x.ruta = x.viajes.some(function(v){ return pares[v.destino+'>'+v.origen]; }) ? 'iv' : x.viajes.length ? 'ida' : '';
      x.desc = x.cierres.some(function(c){ return Math.abs(c.diferencia_efectiva)>=0.01; });
      x.porVer = x.cierres.some(function(c){ return c.estado==='cerrado' || (c.cerrado_por && !c.yape_verificado_por); });
      var conMovs = {}; x.movs.forEach(function(mm){ conMovs[mm.usuario]=1; }); x.cierres.forEach(function(c){ delete conMovs[c.operador]; });
      x.sinCierre = k < d.hoy && Object.keys(conMovs).length > 0;
      x.sinReg = k < d.hoy && k >= primero && !x.n && !x.viajes.length;
      if(x.ruta==='iv') res.iv++; else if(x.ruta==='ida') res.ida++;
      if(x.cierres.length){ if(x.desc) res.desc++; else if(x.porVer) res.porVer++; else res.cuadra++; }
      if(x.sinCierre) res.sinCierre++; if(x.sinReg) res.sinReg++;
    });
    S.calDias = dias; S.calData = d;
    var nombre = new Date(y,m-1,1).toLocaleDateString('es-PE',{month:'long',year:'numeric'}); nombre = nombre.charAt(0).toUpperCase()+nombre.slice(1);
    var h = '<div class="saludo entrar" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><button type="button" class="btn-mini" id="cmp" aria-label="Mes anterior">‹</button><h2 style="text-align:center;flex:1">'+esc(nombre)+'</h2><button type="button" class="btn-mini" id="cms" aria-label="Mes siguiente"'+(mes>=d.hoy.slice(0,7)?' disabled':'')+'>›</button></div>';
    h += '<div class="kpis k4"><div class="kpi"><small>Ida y vuelta</small><b class="num">'+res.iv+'</b><span class="d">días</span></div><div class="kpi"><small>Solo ida</small><b class="num">'+res.ida+'</b><span class="d">días</span></div>'+
      '<div class="kpi"><small>Cierres que cuadran</small><b class="num ok">'+res.cuadra+'</b><span class="d '+(res.desc?'bad':'')+'">'+res.desc+' con descuadre · '+res.porVer+' por verificar</span></div>'+
      '<div class="kpi'+(res.sinReg||res.sinCierre?' alerta':'')+'"><small>Por regularizar</small><b class="num">'+(res.sinReg+res.sinCierre)+'</b><span class="d">'+res.sinReg+' sin registro · '+res.sinCierre+' sin cierre</span></div></div>';
    if(d.viajes_abiertos.length) h += '<div class="card" style="margin-top:12px;border-color:var(--warn);background:var(--warn-soft)">'+d.viajes_abiertos.map(function(v){ return '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><b class="warn">Viaje abierto</b> · '+esc(v.origen)+' → '+esc(v.destino)+' desde el '+esc(fechaCorta(v.d))+'</span><button type="button" class="btn-mini" data-cv="'+esc(v.id)+'">Cerrar</button></div>'; }).join('')+'</div>';
    var dow = (new Date(y,m-1,1).getDay()+6)%7;
    h += '<div class="card" style="margin-top:12px;padding:12px"><div class="cal">'+['L','M','M','J','V','S','D'].map(function(x){ return '<span class="cal-d">'+x+'</span>'; }).join('');
    for(var e=0;e<dow;e++) h += '<span></span>';
    Object.keys(dias).forEach(function(k){
      var x = dias[k], cls = 'cal-c'+(k===d.hoy?' hoy':'')+(k>d.hoy?' fut':'')+(x.sinReg?' sr':'');
      var marca = x.cierres.length ? (x.desc?'bad':x.porVer?'warn':'ok') : (x.sinCierre?'bad':'');
      h += '<button type="button" class="'+cls+'" data-dia="'+k+'"'+(k>d.hoy?' disabled':'')+' aria-label="'+esc(fechaLarga(k))+'"><span class="n">'+(+k.slice(8))+'</span>'+
        (x.ruta?'<i class="ruta '+x.ruta+'" title="'+(x.ruta==='iv'?'Ida y vuelta':'Solo ida')+'"></i>':'')+(marca?'<i class="cie '+marca+'"></i>':'')+(x.sinReg?'<i class="sinreg">!</i>':'')+'</button>';
    });
    h += '</div><div class="leyenda" style="flex-wrap:wrap;margin-top:12px"><span><i style="background:var(--brand)"></i>Ida y vuelta</span><span><i style="border:2px solid var(--brand);background:transparent"></i>Solo ida</span><span><i style="background:var(--ok)"></i>Cierre cuadra</span><span><i style="background:var(--warn)"></i>Por verificar</span><span><i style="background:var(--bad)"></i>Descuadre o sin cierre</span><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>Sin registro</span></div></div>';
    $('vista').innerHTML = h;
    var mover = function(k){ var dt=new Date(y,m-1+k,1); S.calMes = dt.getFullYear()+'-'+('0'+(dt.getMonth()+1)).slice(-2); vCalendario(); };
    $('cmp').onclick = function(){ mover(-1); }; $('cms').onclick = function(){ mover(1); };
    $('vista').querySelectorAll('[data-cv]').forEach(function(b){ b.onclick=function(){ cerrarViaje(d.viajes_abiertos.filter(function(v){return v.id===b.dataset.cv;})[0], vCalendario); }; });
    $('vista').querySelectorAll('[data-dia]').forEach(function(b){ b.onclick=function(){ fichaDia(b.dataset.dia); }; });
  });
}
function fichaDia(k){
  var x = S.calDias[k];
  var h = '<h2 id="hoja-t">'+esc(fechaLarga(k))+'</h2><p class="desc">'+(x.ruta==='iv'?'Ida y vuelta':x.ruta==='ida'?'Solo ida':'Sin viajes registrados')+(x.n?' · '+x.n+' registros · ingresos '+soles(x.ing)+' · gastos '+soles(x.egr):'')+'</p>';
  if(x.viajes.length) h += '<span class="etq">Viajes</span><ul class="lista">'+x.viajes.map(function(v){ return '<li class="mov" style="grid-template-columns:1fr auto"><div><b>'+esc(v.origen)+' → '+esc(v.destino)+'</b><small>'+esc(nombreLegado(v.operador))+' · '+esc(v.placa||'')+'</small></div><span class="chip-est '+(v.estado==='abierto'?'en_ruta':'')+'">'+esc(v.estado)+'</span></li>'; }).join('')+'</ul>';
  if(x.cierres.length) h += '<span class="etq">Cierres</span><ul class="lista">'+x.cierres.map(function(c){ return '<li class="mov" style="grid-template-columns:1fr"><div><b>'+esc(nombreLegado(c.operador))+'</b><div style="margin-top:4px">'+chipCierre(c)+'</div></div></li>'; }).join('')+'</ul>';
  if(x.sinCierre) h += '<p class="ayuda alerta">Hay registros de este día sin caja cerrada.</p>';
  if(x.sinReg) h += '<p class="ayuda alerta">No hay registros de este día. Si la van trabajó, regulariza: registra los ingresos y gastos a nombre de quien operó y luego cierra su caja.</p>';
  h += '<div class="acciones"><button type="button" class="btn ancho" id="fdc">'+ico('caja')+'Ver la caja de este día</button><button type="button" class="btn sec ancho" id="fdr">'+ico('mas')+'Registrar en este día</button><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  abrirHoja(h);
  $('fdc').onclick = function(){ hoja.close(); S.cajaFecha = k; S.cajaPersona = null; ir('caja', true); };
  $('fdr').onclick = function(){ hoja.close(); S.regFecha = k+'T12:00'; var j=(S.cat.usuarios||[]).filter(function(u){ return u.rol==='operador' && u.activo; })[0]; if(j) S.regPara=j.id; ir('registrar', true); };
}


/* ════════════ v3.1 · Eliminar, vouchers, boletos, contacto y viajes para compartir ════════════ */
function hojaEliminarExc(e){
  var k = (S.excDet && S.excDet.excursion.id===e.id) ? S.excDet.kpis : null, conDinero = S.excDet ? S.excDet.movimientos.some(function(m){ return !m.anulado; }) : false;
  abrirHoja('<h2 id="hoja-t">'+esc(e.titulo)+'</h2><p class="desc">Elige qué hacer con esta excursión.</p><div style="margin-top:12px">'+
    '<button type="button" class="acc" id="hxa">'+ico('pausa')+'<span>Anular y liberar asientos<small>Para un viaje cancelado: sale de la lista y se conserva el historial'+(k&&k.ocupados?' · libera '+k.ocupados+' asiento(s)':'')+'</small></span></button>'+
    '<button type="button" class="acc peligro" id="hxe"'+(conDinero?' disabled':'')+'>'+ico('basura')+'<span>Eliminar definitivamente<small>'+(conDinero?'Tiene ingresos o gastos activos: anúlalos primero en «Ingresos y gastos»':'Para una excursión creada por error: se borra con sus reservas')+'</small></span></button></div>'+
    '<div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cancelar</button></div>');
  $('hxa').onclick = function(){ formMotivo('Anular '+e.titulo, 'Se liberan todos los asientos y la excursión deja de aparecer en la lista. Su historial se conserva.', 'Anular excursión', function(m){ return api('/api/excursiones/'+e.id,{method:'PATCH',body:Object.assign({}, e, {estado:'anulada', liberar:true, notas:(e.notas?e.notas+' | ':'')+'Anulada: '+m})}); }, 'Excursión anulada', function(){ S.excId=null; S.excLista=null; excLista(); }); };
  if(!conDinero) $('hxe').onclick = function(){
    abrirHoja('<h2 id="hoja-t">¿Eliminar «'+esc(e.titulo)+'»?</h2><p class="desc">Se borran la excursión y sus reservas. No se puede deshacer. Escribe ELIMINAR para confirmar.</p><div class="campo"><label for="xcf">Confirmación</label><input id="xcf" autocomplete="off" autocapitalize="characters"></div>'+botonesHoja('Eliminar definitivamente', true));
    $('ok').onclick = function(){ if($('xcf').value.trim().toUpperCase()!=='ELIMINAR') return $('er').textContent='Escribe ELIMINAR para confirmar.'; $('ok').disabled=true;
      api('/api/excursiones/'+e.id,{method:'DELETE'}).then(function(r){ $('ok').disabled=false; if(!r.ok){ $('er').textContent=r.error; return; } hoja.close(); toast('Excursión eliminada'); S.excId=null; S.excLista=null; excLista(); }); };
  };
}
function urlBoleto(b){ return location.origin+'/boleto?b='+b; }
function telLocal(c){ return String(c||'').replace(/^51/,''); }
function textoBoleto(viaje, pas){
  return '✅ *Villa Azul · Turismo & Excursiones*\nTu reserva está confirmada.\n🚐 '+viaje.titulo+'\n'+viaje.origen+' → '+viaje.destino+'\n📅 '+fechaExc(viaje.salida, true)+'\n'+
    pas.map(function(p){ return '💺 Asiento '+p.asiento+' · '+p.nombre+'\n🎫 '+urlBoleto(p.boleto); }).join('\n')+'\nPresenta tu boleto al subir. ¡Buen viaje!';
}
function botonesContacto(cel, texto){
  if(!cel) return '<p class="ayuda">Sin celular registrado.</p>';
  var c = String(cel).replace(/\D/g,''); if(c.length===9) c='51'+c;
  return '<div class="botones"><a class="btn" style="flex:1" target="_blank" rel="noopener" href="https://wa.me/'+c+'?text='+encodeURIComponent(texto)+'">WhatsApp</a>'+
    '<a class="btn sec" style="flex:1" href="sms:+'+c+'?&body='+encodeURIComponent(texto.replace(/\*/g,''))+'">SMS</a><a class="btn sec" style="flex:1" href="tel:+'+c+'">Llamar</a></div>';
}
function hojaContacto(viaje, pas, cel){
  var listos = pas.filter(function(p){ return p.boleto && ['confirmado','pagado'].indexOf(p.estado||'pagado')>=0; });
  var txt = listos.length ? textoBoleto(viaje, listos) : 'Hola, te escribimos de Villa Azul · Turismo & Excursiones por tu reserva en «'+viaje.titulo+'» ('+fechaExc(viaje.salida, true)+').';
  abrirHoja('<h2 id="hoja-t">'+(listos.length?'Enviar boleto digital':'Contactar al pasajero')+'</h2><p class="desc">'+esc(pas.map(function(p){ return 'Asiento '+p.asiento+' · '+p.nombre; }).join(' · '))+'</p>'+
    (listos.length?'<div class="card" style="margin:12px 0;white-space:pre-wrap;font-size:14px">'+esc(txt)+'</div>':'')+botonesContacto(cel, txt)+
    (listos.length?'<div class="botones" style="margin-top:8px">'+listos.map(function(p){ return '<a class="btn-mini" target="_blank" rel="noopener" href="'+esc(urlBoleto(p.boleto))+'">Ver boleto asiento '+p.asiento+'</a>'; }).join('')+'</div>':'')+
    '<div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
}
/* Vouchers del enlace: los verifica quien maneja los Yape */
function puedoYape(){ return S.yo.rol==='super' || (S.yo.rol==='admin' && S.yo.funcion==='digital'); }
function tarjetaVoucher(v, viaje){
  var pas = v.pasajeros || [];
  return '<div class="card" style="margin-top:10px;border-color:var(--warn)"><div style="display:flex;justify-content:space-between;gap:10px"><div><b>'+(v.grupo==='ORG'?'Voucher del organizador · '+esc(v.concepto||'pago'):'Voucher · grupo '+esc(v.grupo))+'</b><small style="display:block;color:var(--muted)">'+(viaje?esc(viaje)+' · ':'')+esc(pas.map(function(p){ return 'asiento '+p.asiento+' '+p.nombre; }).join(', '))+'</small>'+
    (v.operacion?'<small style="display:block">Operación '+esc(v.operacion)+(v.operacion_repetida?' · <b class="bad">número repetido</b>':'')+'</small>':'<small class="warn" style="display:block">Sin número de operación</small>')+(v.foto_repetida?'<small class="bad" style="display:block;font-weight:700">Esta captura ya se había subido antes</small>':'')+'</div><b class="num">'+soles(v.monto)+'</b></div>'+
    '<div class="botones" style="margin-top:10px"><button type="button" class="btn-mini" data-vv="'+esc(v.foto_id)+'">Ver captura</button>'+(puedoYape()?'<button type="button" class="btn-mini" data-vap="'+esc(v.id)+'">Aprobar</button><button type="button" class="btn-mini" data-vre="'+esc(v.id)+'" style="color:var(--bad)">Rechazar</button>':'<small class="ayuda">Lo verifica quien maneja los Yape</small>')+'</div></div>';
}
function enlazarVouchers(cont, lista, despues){
  cont.querySelectorAll('[data-vv]').forEach(function(b){ b.onclick=function(){ verBoleta('/api/comprobantes/'+b.dataset.vv); }; });
  cont.querySelectorAll('[data-vap]').forEach(function(b){ b.onclick=function(){
    var v = lista.filter(function(x){ return x.id===b.dataset.vap; })[0];
    abrirHoja('<h2 id="hoja-t">Aprobar voucher · grupo '+esc(v.grupo)+'</h2><p class="desc">Revisa en el Yape de la empresa que llegó el pago. Al aprobar, los asientos pasan a «Pagado» y se registra el ingreso.</p><div class="campo"><label for="vam">Monto que llegó</label><input id="vam" inputmode="decimal" class="num" value="'+esc(v.monto)+'"></div>'+botonesHoja('Aprobar pago'));
    $('ok').onclick = function(){ $('ok').disabled=true; api('/api/vouchers/'+v.id+'/aprobar',{method:'POST',body:{monto:$('vam').value.replace(',','.')}}).then(function(r){
      $('ok').disabled=false; if(!r.ok){ $('er').textContent=r.error; return; }
      if(r.data.contrato){ hoja.close(); toast('Pago del contrato aprobado ('+r.data.concepto+' '+soles(r.data.monto)+')'); if(despues) despues(); return; }
      toast('Pago aprobado: ya puedes enviar los boletos');
      hojaContacto({titulo:r.data.titulo, origen:r.data.origen, destino:r.data.destino, salida:r.data.salida}, r.data.pasajeros.map(function(p){ return Object.assign({estado:'pagado'}, p); }), r.data.celular);
      if(despues) despues(); }); };
  }; });
  cont.querySelectorAll('[data-vre]').forEach(function(b){ b.onclick=function(){ formMotivo('Rechazar voucher', 'El pasajero verá el motivo al abrir su reserva y podrá subir otra captura.', 'Rechazar', function(m){ return api('/api/vouchers/'+b.dataset.vre+'/rechazar',{method:'POST',body:{motivo:m}}); }, 'Voucher rechazado', despues); }; });
}
/* Viajes para compartir: todo el equipo, incluido el operador. Sin montos. */
function vViajes(){
  if(!navigator.onLine) return sinSenal(null, 'La lista de viajes se carga con señal.');
  $('vista').innerHTML = '<p class="vacio">Cargando viajes…</p>';
  api('/api/viajes-compartir').then(function(r){
    if(!r.ok){ $('vista').innerHTML='<div class="card"><p class="vacio">'+esc(r.error)+'</p></div>'; return; }
    var L = r.data.viajes;
    var h = '<div class="saludo entrar"><h2>Viajes</h2><p>Comparte el enlace para que cada pasajero elija su asiento, pague y reciba su boleto.</p></div>';
    h += '<div class="botones" style="margin-bottom:6px"><button type="button" class="btn" id="vcot">'+ico('tarifa')+'Cotizar un viaje</button><button type="button" class="btn sec" id="vmis">Mis cotizaciones</button></div>';
    if(!L.length) h += '<div class="card"><p class="vacio">No hay viajes con reservas abiertas.</p></div>';
    h += L.map(function(v){ var url = enlaceExc(v.codigo);
      return '<div class="card" style="margin-top:10px"><b>'+esc(v.titulo)+'</b> <span class="chip-est '+esc(v.estado)+'">'+esc(EXC_EST[v.estado])+'</span><small style="display:block;color:var(--muted)">'+esc(v.origen)+' → '+esc(v.destino)+' · '+esc(fechaExc(v.salida))+'</small>'+
        '<div class="barra-ocup" style="margin-top:8px"><i style="width:'+Math.round(v.ocupados/Math.max(1,v.vendibles)*100)+'%"></i></div><small class="num">'+v.ocupados+' de '+v.vendibles+' asientos</small>'+
        '<div class="botones" style="margin-top:10px">'+(v.estado==='abierta'?'<a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text='+encodeURIComponent(textoWa(v,url))+'">Compartir por WhatsApp</a><button type="button" class="btn sec" data-cp="'+esc(url)+'">Copiar enlace</button>':'')+
        '<button type="button" class="btn sec" data-man="'+esc(v.id)+'">Pasajeros</button></div></div>'; }).join('');
    $('vista').innerHTML = h;
    $('vista').querySelectorAll('[data-cp]').forEach(function(b){ b.onclick=function(){ (navigator.clipboard?navigator.clipboard.writeText(b.dataset.cp):Promise.reject()).then(function(){ toast('Enlace copiado'); }, function(){ prompt('Copia el enlace:', b.dataset.cp); }); }; });
    $('vista').querySelectorAll('[data-man]').forEach(function(b){ b.onclick=function(){ manifiestoViaje(b.dataset.man); }; });
    $('vcot').onclick = function(){ S.cot={vista:'nueva'}; ir('cotizador', true); };
    $('vmis').onclick = function(){ S.cot={vista:'lista'}; ir('cotizador', true); };
  });
}
function manifiestoViaje(id){
  api('/api/viajes-compartir/'+id).then(function(r){
    if(!r.ok){ toast(r.error,true); return; }
    var d = r.data;
    var h = '<h2 id="hoja-t">'+esc(d.titulo)+'</h2><p class="desc">'+esc(d.origen)+' → '+esc(d.destino)+' · '+esc(fechaExc(d.salida))+' · '+d.pasajeros.length+' pasajero(s)</p><ul class="lista" style="margin-top:8px">';
    h += d.pasajeros.length ? d.pasajeros.map(function(p,i){ return '<li class="mov" style="grid-template-columns:40px 1fr auto"><span class="ic"><b>'+p.asiento+'</b></span><div><b>'+esc(p.nombre)+'</b><small>DNI '+esc(p.dni)+' · '+esc(PAS_TXT[p.estado])+'</small></div><button type="button" class="btn-mini" data-ct="'+i+'">Contactar</button></li>'; }).join('') : '<li class="vacio">Sin pasajeros todavía.</li>';
    h += '</ul><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
    abrirHoja(h);
    hoja.querySelectorAll('[data-ct]').forEach(function(b){ b.onclick=function(){ var p=d.pasajeros[+b.dataset.ct]; hojaContacto(d, [p], p.celular); }; });
  });
}

/* ════════════ Ficha, corrección y anulación de movimientos ════════════ */
document.addEventListener('click', function(e){ var li = e.target.closest('[data-mov]'); if(li && S.yo) fichaMov(li.dataset.mov); });
document.addEventListener('keydown', function(e){ if(e.key==='Enter'){ var li = e.target.closest && e.target.closest('[data-mov]'); if(li && S.yo) fichaMov(li.dataset.mov); } });
function movPorId(id){ return S.movs.filter(function(m){ return m.uuid===id; })[0]; }
function porRevisar(){ return S.movs.filter(function(m){ return m.foto_id && !m.revisado_en && m.estado==='activo'; }); }
function fichaMov(id){
  var m = movPorId(id); if(!m) return;
  var reemplazo = S.movs.filter(function(x){ return x.ref_uuid===m.uuid; })[0], original = m.ref_uuid && movPorId(m.ref_uuid);
  var cuenta = (S.cat.cuentas||[]).filter(function(c){ return c.clave===m.cuenta; })[0];
  var h = '<h2 id="hoja-t">'+esc(nombreCat(m))+'</h2><p class="desc"><b class="num '+(m.tipo==='ingreso'?'ok':'bad')+'" style="font-size:24px">'+(m.tipo==='ingreso'?'+':'−')+soles(m.monto)+'</b> '+(m.estado!=='activo'?'<span class="estado inac">'+esc(m.estado)+'</span>':'')+(m._local?'<span class="estado cola">En cola</span>':'')+'</p>';
  h += '<dl class="ficha"><dt>Fecha</dt><dd>'+fechaCorta(m.fecha)+' · '+horaDe(m.fecha)+'</dd><dt>Medio</dt><dd>'+esc(m.medio_pago||'—')+'</dd><dt>Cuenta</dt><dd>'+esc(cuenta?cuenta.nombre:(m.cuenta||'—'))+'</dd>'+
    '<dt>Registró</dt><dd>'+esc(nombreUsuario(m.usuario_id, m.usuario)||'—')+'</dd>'+(m.descripcion?'<dt>Detalle</dt><dd>'+esc(m.descripcion)+'</dd>':'')+
    (m.cantidad?'<dt>Cantidad</dt><dd>'+esc(m.cantidad)+'</dd>':'')+(m.placa?'<dt>Placa</dt><dd>'+esc(m.placa)+'</dd>':'')+
    ((m.foto_id||m.tiene_foto)?'<dt>Comprobante</dt><dd>'+(m.revisado_en?'Conforme · '+esc(m.revisado_por):(m.tiene_foto&&!m.foto_id?'Se envía con el registro':'Por revisar'))+(m.foto_repetida?' · <span class="bad">esta foto ya se había subido antes</span>':'')+'</dd>':'')+
    (m.motivo?'<dt>Motivo</dt><dd>'+esc(m.motivo)+(m.modificado_por?' · '+esc(m.modificado_por):'')+'</dd>':'')+'</dl>';
  if(original) h += '<button type="button" class="acc" data-ir-mov="'+esc(original.uuid)+'">'+ico('movs')+'<span>Corrige a un registro anterior<small>'+soles(original.monto)+' · '+esc(nombreCat(original))+'</small></span></button>';
  if(reemplazo) h += '<button type="button" class="acc" data-ir-mov="'+esc(reemplazo.uuid)+'">'+ico('movs')+'<span>Fue reemplazado por una corrección<small>'+soles(reemplazo.monto)+' · '+esc(nombreCat(reemplazo))+'</small></span></button>';
  h += '<div class="acciones">';
  if(m.foto_id && esMando(S.yo)) h += '<button type="button" class="btn sec ancho" id="vfoto">Ver comprobante</button>';
  if(esMando(S.yo) && m.estado==='activo' && !m._local){
    if(m.foto_id && !m.revisado_en) h += '<button type="button" class="btn ancho" id="mrev">'+ico('check')+'Comprobante conforme</button>';
    h += '<button type="button" class="btn sec ancho" id="mcor">'+ico('lapiz')+'Corregir</button><button type="button" class="btn peligro ancho" id="man">'+ico('basura')+'Anular</button>';
  }
  h += '<button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  abrirHoja(h);
  hoja.querySelectorAll('[data-ir-mov]').forEach(function(b){ b.onclick=function(){ fichaMov(b.dataset.irMov); }; });
  if($('vfoto')) $('vfoto').onclick = function(){ verBoleta('/api/comprobantes/'+m.foto_id); };
  if($('mrev')) $('mrev').onclick = function(){ accionMov(m, 'revisar', {}, 'Comprobante conforme'); };
  if($('mcor')) $('mcor').onclick = function(){ formCorregir(m); };
  if($('man')) $('man').onclick = function(){ formAnular(m); };
}
function accionMov(m, accion, cuerpo, exito){
  if(!navigator.onLine){ toast('Corregir, anular o revisar necesita señal', true); return Promise.resolve(); }
  return api('/api/movimientos/'+m.uuid+'/'+accion, {method:'POST', body:cuerpo}).then(function(r){
    if(!r.ok){ if($('er')) $('er').textContent = r.error; else toast(r.error, true); return; }
    hoja.close(); toast(exito);
    if(r.data && r.data.aviso) setTimeout(function(){ toast(r.data.aviso, true); }, 600);
    return sincronizar();
  });
}
function formAnular(m){
  abrirHoja('<h2 id="hoja-t">Anular '+esc(nombreCat(m))+' · '+soles(m.monto)+'</h2><p class="desc">Sale de todos los totales, pero queda visible en «Anulados» con su motivo y quién lo anuló.</p><div class="campo"><label for="amot">Motivo</label><textarea id="amot" maxlength="200" placeholder="Ej.: registrado dos veces"></textarea></div>'+botonesHoja('Anular movimiento', true));
  $('ok').onclick = function(){ var t=$('amot').value.trim(); if(t.length<5) return $('er').textContent='Escribe el motivo (al menos 5 letras).'; accionMov(m, 'anular', {motivo:t}, 'Movimiento anulado'); };
}
function formCorregir(m){
  var cs = cats(m.tipo), f = String(m.fecha||'').slice(0,16).replace(' ','T');
  var h = '<h2 id="hoja-t">Corregir '+esc(nombreCat(m))+'</h2><p class="desc">El original no se borra: queda como «corregido» y este cambio guarda el valor anterior, el nuevo, quién lo hizo y por qué.</p>'+
    '<div class="dos"><div class="campo"><label for="cmo">Monto S/</label><input id="cmo" inputmode="decimal" class="num" value="'+esc(m.monto)+'"></div><div class="campo"><label for="cfe">Fecha y hora</label><input id="cfe" type="datetime-local" value="'+esc(f)+'"></div></div>'+
    '<div class="campo"><label for="cca">Concepto</label><select id="cca">'+cs.map(function(c){ return '<option value="'+esc(c.clave)+'"'+(c.clave===m.categoria?' selected':'')+'>'+esc(c.nombre)+'</option>'; }).join('')+'</select></div>'+
    '<div class="dos"><div class="campo"><label for="cme">Medio</label><select id="cme"><option value="efectivo"'+(m.medio_pago==='efectivo'?' selected':'')+'>Efectivo</option><option value="yape"'+(m.medio_pago==='yape'?' selected':'')+'>Yape</option></select></div>'+
    '<div class="campo"><label for="ccu">Cuenta</label><select id="ccu"><option value="">Sin cuenta</option>'+cuentasActivas().map(function(c){ return '<option value="'+esc(c.clave)+'"'+(c.clave===m.cuenta?' selected':'')+'>'+esc(c.nombre)+'</option>'; }).join('')+'</select></div></div>'+
    '<div class="campo"><label for="cde">Detalle</label><input id="cde" maxlength="200" value="'+esc(m.descripcion||'')+'"></div><div class="campo"><label for="cmot">Motivo de la corrección</label><textarea id="cmot" maxlength="200" placeholder="Ej.: el pasaje era S/ 45, no S/ 40"></textarea></div>'+botonesHoja('Guardar corrección');
  abrirHoja(h);
  $('ok').onclick = function(){
    var t = $('cmot').value.trim(); if(t.length<5) return $('er').textContent='Escribe el motivo (al menos 5 letras).';
    var cambios = {monto:$('cmo').value, fecha:$('cfe').value, categoria:$('cca').value, medio_pago:$('cme').value, cuenta:$('ccu').value, descripcion:$('cde').value};
    accionMov(m, 'corregir', {cambios:cambios, motivo:t}, 'Corrección guardada');
  };
}
function vRevision(){
  var l = ordenar(porRevisar());
  var h = '<div class="saludo entrar"><h2>Comprobantes por revisar</h2><p>Compara cada foto con su monto. Si cuadra, márcala conforme; si no, corrígela o anúlala.</p></div>';
  if(!l.length) h += '<div class="card"><p class="vacio">Todo al día: no hay comprobantes pendientes.</p></div>';
  h += l.map(function(m){ return '<div class="card" style="margin-top:10px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><b>'+esc(nombreCat(m))+'</b><small style="display:block;color:var(--muted)">'+fechaCorta(m.fecha)+' · '+horaDe(m.fecha)+' · '+esc(m.medio_pago||'')+' · '+esc(nombreUsuario(m.usuario_id, m.usuario))+'</small>'+(m.foto_repetida?'<small class="bad" style="display:block;font-weight:700">Esta foto ya se había subido antes</small>':'')+'</div><b class="num '+(m.tipo==='ingreso'?'ok':'bad')+'">'+soles(m.monto)+'</b></div>'+
    '<div class="botones" style="margin-top:10px"><button type="button" class="btn-mini" data-vf="'+esc(m.foto_id)+'">Ver foto</button><button type="button" class="btn-mini" data-ok="'+esc(m.uuid)+'">Conforme</button><button type="button" class="btn-mini" data-ab="'+esc(m.uuid)+'">Corregir o anular</button></div></div>'; }).join('');
  h += '<div id="vouch"></div>';
  $('vista').innerHTML = h;
  if(navigator.onLine) api('/api/vouchers').then(function(r){ if(!r.ok || !$('vouch')) return; var L=r.data.vouchers; if(!L.length) return;
    $('vouch').innerHTML = '<div class="titulo-sec"><h3>Vouchers de reservas</h3><span class="rol">'+L.length+'</span></div>'+L.map(function(v){ return tarjetaVoucher(v, v.titulo); }).join('');
    enlazarVouchers($('vouch'), L, vRevision); });
  $('vista').querySelectorAll('[data-vf]').forEach(function(b){ b.onclick=function(){ verBoleta('/api/comprobantes/'+b.dataset.vf); }; });
  $('vista').querySelectorAll('[data-ok]').forEach(function(b){ b.onclick=function(){ b.disabled=true; accionMov(movPorId(b.dataset.ok), 'revisar', {}, 'Comprobante conforme'); }; });
  $('vista').querySelectorAll('[data-ab]').forEach(function(b){ b.onclick=function(){ fichaMov(b.dataset.ab); }; });
}

/* ════════════ Arranque ════════════ */
abrirDB().then(function(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function(){});
  var ses = ls('va_sesion');
  if(ses && ses.token && ses.usuario){ iniciar(ses.usuario, ses.token); }
  else pantallaAcceso();
}).catch(function(){ app.innerHTML = '<p class="vacio">Este navegador no permite guardar datos. Ábrelo en Chrome o Safari actualizados.</p>'; });
})();
