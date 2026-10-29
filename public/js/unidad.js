/* Villa Azul · Unidad (v5.0)
   Checklist pre y post ruta de la Hiace, novedades, documentos a bordo, mantenimiento e indicadores.
   Se carga antes de app.js; app.js le entrega sus utilidades con window.VAUnidad(ctx).
   Funciona sin señal: el estado y las fotos de los documentos quedan guardados en el teléfono,
   y el checklist se guarda en la cola hasta que vuelva la señal. */
window.VAUnidad = function (V) {
'use strict';
var S = V.S, esc = V.esc, ico = V.ico, api = V.api, toast = V.toast, $ = V.$;
var U = S.uni = S.uni || { tab: 'estado' };
var PL = null, ITEMS = {}, ORDEN = [];

/* ════════════ Vocabulario ════════════ */
var APT = {
  apto: { t: 'Apta para salir', c: 'ok', corto: 'Apta' },
  obs: { t: 'Apta con observaciones', c: 'warn', corto: 'Con observaciones' },
  fallas: { t: 'Con fallas: sale con precaución', c: 'alto', corto: 'Con fallas' },
  no: { t: 'No apta: no debe salir', c: 'bad', corto: 'No apta' },
  sin_datos: { t: 'Aún sin inspecciones', c: 'muted', corto: 'Sin datos' }
};
var PRIO = { C: ['Crítico', 'crit'], A: ['Alto', 'alto'], M: ['Medio', 'medio'], B: ['Bajo', 'bajo'] };
var TIPO = { pre: 'Salida', post: 'Llegada (v7.2)' };
var NIVEL_NOV = { critica: 'Falla crítica', falla: 'Falla', obs: 'Observación' };
var EST_NOV = { abierta: 'Abierta', en_reparacion: 'En reparación', resuelta: 'Resuelta' };
var COMO = { inspeccion: 'por inspección', mantenimiento: 'con mantenimiento', manual: 'a mano' };
var P = {
  motor: '<path d="M4 10h3l2-3h6l2 3h3v7h-3l-2 2H9l-2-2H4Z"/><path d="M1 12v3M23 12v3M10 4h4"/>',
  rueda: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  freno: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M6.5 6.5a8 8 0 0 0 0 11"/>',
  luz: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z"/>',
  carga: '<path d="M3 8 12 3l9 5v8l-9 5-9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  asiento: '<path d="M7 3h5v10H7z"/><path d="M5 13h12v4H5zM7 17v4M15 17v4"/>',
  botiquin: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M12 10.5v6M9 13.5h6"/>',
  ruta: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  doc: '<path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.7 16a5 5 0 0 1 6.6 0"/><circle cx="12" cy="19.5" r="1"/>',
  chk: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4M9 12.5l2 2 4-4.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>', exc: '<path d="M12 4v10M12 18.5v.01"/>',
  llave: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4Z"/>',
  camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', compartir: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/>'
};
function ic(n, cls) { if (!P[n]) return V.ico(n); return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + P[n] + '</svg>'; }
var CICON = { mot: 'motor', neu: 'rueda', fre: 'freno', ele: 'luz', car: 'carga', int: 'asiento', eme: 'botiquin', rut: 'ruta', doc: 'doc', acc: 'wifi' };
var DOCS = {
  soat: { n: 'SOAT', ent: 'Aseguradora', num: 'N.° de póliza', em: 'Inicio de vigencia', ven: 'Fin de vigencia', extra: [] },
  tarjeta_circulacion: { n: 'Tarjeta de circulación', ent: 'Emitida por', num: 'N.° de tarjeta', em: 'Emisión', ven: 'Vencimiento', extra: [['cert_hv', 'Certificado de habilitación vehicular'], ['partida', 'Partida registral']] },
  revision_tecnica: { n: 'Revisión técnica', ent: 'Centro de inspección', num: 'N.° de certificado', em: 'Fecha de inspección', ven: 'Vencimiento', extra: [['resultado', 'Resultado (aprobado / observado)'], ['exigible_desde', 'Exigible desde (si aún no aplica)', 'date']] },
  licencia: { n: 'Licencia de conducir', ent: 'Titular', num: 'N.° de licencia', em: 'Emisión', ven: 'Vencimiento', extra: [['categoria', 'Categoría (ej. A-IIb)']] },
  seguro: { n: 'Seguro vehicular', ent: 'Aseguradora', num: 'N.° de póliza', em: 'Inicio de vigencia', ven: 'Fin de vigencia', extra: [['cobertura', 'Cobertura']] },
  tarjeta_propiedad: { n: 'Tarjeta de propiedad', ent: 'Emitida por', num: 'N.° de tarjeta', em: 'Emisión', ven: '', extra: [] },
  extintor: { n: 'Recarga del extintor', ent: 'Empresa de recarga', num: 'N.° de serie', em: 'Última recarga', ven: 'Próxima recarga', extra: [] },
  otro: { n: 'Otro documento', ent: 'Emitido por', num: 'Número', em: 'Emisión', ven: 'Vencimiento (si tiene)', extra: [] }
};

/* ════════════ Utilidades ════════════ */
function km(n) { return (Number(n) || 0).toLocaleString('es-PE') + ' km'; }
function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }
function dia(f) { return V.fechaCorta(f) || '—'; }
function diaHora(f) { if (!f) return '—'; var d = String(f).slice(0, 10), h = V.hoyLima(); return (d === h ? 'Hoy' : d === sumar(h, -1) ? 'Ayer' : V.fechaCorta(f)) + (String(f).length > 10 ? ', ' + V.horaDe(f) : ''); }
function sumar(ymd, n) { var p = ymd.split('-'); return new Date(Date.UTC(+p[0], p[1] - 1, +p[2]) + n * 864e5).toISOString().slice(0, 10); }
function durTxt(s) { if (!s) return '—'; var m = Math.round(s / 60); return m < 1 ? s + ' s' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; }
function mando() { return V.esMando(S.yo); }
function chipApt(a, extra) { var x = APT[a] || APT.sin_datos; return '<span class="u-pill ' + x.c + (extra ? ' ' + extra : '') + '">' + x.corto + '</span>'; }
function sev(p) { var x = PRIO[p] || PRIO.M; return '<span class="u-sev ' + x[1] + '">' + x[0] + '</span>'; }
function placaFmt(p) { p = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return p.length === 6 ? p.slice(0, 3) + '-' + p.slice(3) : p; }
function vacio(t, accion) { return '<div class="card"><p class="vacio">' + t + '</p>' + (accion || '') + '</div>'; }
function enVista() { return S.vista === 'unidad' && $('vista'); }
function pintarSi(fn) { if (enVista()) fn(); }

/* ════════════ Plantilla y estado (con copia en el teléfono) ════════════ */
function plantilla() {
  if (PL) return Promise.resolve(PL);
  return fetch('/js/plantilla-checklist.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (p) { V.kvSet('plantilla', p); return p; }, function () { return V.kvGet('plantilla'); })
    .then(function (p) {
      if (!p) throw new Error('Conéctate una vez para descargar el checklist.');
      PL = p; ITEMS = {}; ORDEN = [];
      p.categorias.forEach(function (c) { c.items.forEach(function (it) { ITEMS[it[0]] = { k: it[0], cat: c.id, categoria: c.nombre, nombre: it[1], prioridad: it[2] }; ORDEN.push(it[0]); }); });
      return p;
    });
}
function cargar() {
  var desdeCopia = function () { return V.kvGet('flota').then(function (d) { if (d) { U.d = d; U.copia = true; } return d; }); };
  if (!navigator.onLine) return desdeCopia();
  return api('/api/flota/estado').then(function (r) {
    if (!r.ok) return desdeCopia();
    U.d = r.data; U.copia = false; U.t = Date.now(); V.kvSet('flota', r.data); guardarFotosDocs(r.data); programarRecordatorios();
    return r.data;
  });
}
/* Fotos: se piden con la sesión. Las de los documentos se guardan en el teléfono para mostrarlas sin señal en un control. */
var IMG = {};
function imagen(id, guardar) {
  if (IMG[id]) return Promise.resolve(IMG[id]);
  return V.kvGet('img:' + id).then(function (d) {
    if (d) { IMG[id] = d; return d; }
    return fetch('/api/flota/archivo/' + id, { headers: { authorization: 'Bearer ' + S.token } })
      .then(function (r) { if (!r.ok) throw new Error('No se pudo abrir el archivo' + (navigator.onLine ? '.' : ': sin señal.')); return r.blob(); })
      .then(function (b) { return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { IMG[id] = fr.result; if (guardar) V.kvSet('img:' + id, fr.result); ok(fr.result); }; fr.readAsDataURL(b); }); });
  });
}
function guardarFotosDocs(d) { (d.documentos || []).filter(function (x) { return x.foto_id; }).slice(0, 10).forEach(function (x) { imagen(x.foto_id, true).catch(function () {}); }); }
function verArchivo(id, titulo, mime) {
  V.abrirHoja('<h2 id="hoja-t">' + esc(titulo) + '</h2><div id="uimg" class="u-visor"><p class="vacio">Abriendo…</p></div><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
  imagen(id, true).then(function (url) {
    var el = $('uimg'); if (!el) return;
    if (/^data:application\/pdf/.test(url) || mime === 'application/pdf') {
      var bin = atob(url.split(',')[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var u = URL.createObjectURL(new Blob([arr], { type: 'application/pdf' }));
      el.innerHTML = '<a class="btn ancho" href="' + u + '" target="_blank" rel="noopener">' + ic('doc') + 'Abrir el PDF</a>';
    } else el.innerHTML = '<img src="' + url + '" alt="' + esc(titulo) + '">';
  }, function (e) { if ($('uimg')) $('uimg').innerHTML = '<p class="vacio">' + esc(e.message) + '</p>'; });
}

/* ════════════ La Hiace real, con un punto por zona: cada punto toma el color de su peor novedad abierta ════════════ */
var FOTO = '/hiace-lateral.jpg', FOTO_W = 1100, FOTO_H = 620;
var ZONAS = [ // [categoría, etiqueta, x %, y % sobre la foto]
  ['mot', 'Motor', 83, 67], ['ele', 'Luces', 88.8, 51.9], ['neu', 'Neumáticos', 72.3, 83], ['fre', 'Frenos', 13.8, 72.6], ['car', 'Techo y carga', 20.2, 16],
  ['acc', 'Equipos', 48.1, 6], ['int', 'Cabina', 31.9, 39.6], ['eme', 'Emergencia', 40, 58], ['doc', 'Documentos', 52.1, 32.1]];
function zona(z) { return 'z-' + (z || 'ok'); }
function peor(a, b) { var w = { ok: 0, obs: 1, falla: 2, critica: 3 }; return (w[a] || 0) >= (w[b] || 0) ? a : b; }
var NIV_TXT = { ok: 'Conforme', obs: 'Con observación', falla: 'Con falla', critica: 'Falla crítica' };
function van(zs) {
  zs = zs || {};
  return '<div class="u-foto"><img src="' + FOTO + '" width="' + FOTO_W + '" height="' + FOTO_H + '" alt="Toyota Hiace de Villa Azul con la puerta corrediza abierta" decoding="async">' +
    ZONAS.map(function (z) { var n = zs[z[0]] || 'ok'; return '<button type="button" class="u-pin ' + zona(n) + (z[2] > 62 ? ' izq' : '') + '" data-z="' + z[0] + '" style="left:' + z[2] + '%;top:' + z[3] + '%" aria-label="' + z[1] + ': ' + NIV_TXT[n] + '"><i>' + ic(CICON[z[0]]) + '</i><span>' + z[1] + '</span></button>'; }).join('') + '</div>';
}
function chipsZona(zs) {
  zs = zs || {};
  return '<div class="u-zchips"><button type="button" class="u-zc ' + zona(zs.rut) + '" data-z="rut">' + ic('ruta') + '<span>Ruta y viaje</span></button><span class="u-leyenda"><i class="ok"></i>Bien<i class="obs"></i>Observación<i class="falla"></i>Falla<i class="critica"></i>Crítico</span></div>';
}
/* Miniatura de la zona en la foto: en el checklist, Jorge ve dónde mirar. */
function miniZona(cat) {
  var z = ZONAS.filter(function (x) { return x[0] === cat; })[0], L = 56;
  if (!z) return '<span class="u-mini" style="background-size:cover;background-position:center" aria-hidden="true"></span>';
  var zoom = 3.4, W = L * zoom, H = W * FOTO_H / FOTO_W;
  var x = Math.max(0, Math.min(W - L, z[2] / 100 * W - L / 2)), y = Math.max(0, Math.min(H - L, z[3] / 100 * H - L / 2));
  return '<span class="u-mini" style="background-size:' + Math.round(W) + 'px auto;background-position:-' + Math.round(x) + 'px -' + Math.round(y) + 'px" aria-hidden="true"></span>';
}
function hero(d) {
  var v = APT[d.veredicto] || APT.sin_datos, u = d.unidad || {}, m = d.mantenimiento && d.mantenimiento.estado;
  var razon = '';
  if (d.veredicto === 'no') { var dv = (d.documentos || []).filter(function (x) { return x.estado === 'vencido' && x.bloquea; }); var cr = (d.novedades || []).filter(function (n) { return n.nivel === 'critica'; }); razon = dv.map(function (x) { return x.nombre + ' vencido'; }).concat(cr.map(function (n) { return n.nombre; })).slice(0, 2).join(' · '); }
  else if (d.veredicto === 'fallas' || d.veredicto === 'obs') razon = plural((d.novedades || []).length, 'novedad abierta', 'novedades abiertas');
  else if (d.veredicto === 'apto') razon = 'Sin novedades abiertas y con los documentos al día';
  else razon = 'Haz el primer checklist para conocer su estado';
  return '<section class="u-hero v-' + v.c + '">' +
    '<div class="u-hero-top"><div class="u-hero-t"><small>' + esc((u.marca_modelo || 'Toyota Hiace') + (u.anio ? ' ' + u.anio : '')) + '</small><b>' + v.t + '</b><span>' + esc(razon) + '</span></div>' +
    '<span class="u-placa" aria-label="Placa ' + esc(d.placa) + '"><i>PERÚ</i>' + esc(placaFmt(d.placa)) + '</span></div>' +
    van(d.zonas) + chipsZona(d.zonas) +
    '<div class="u-hero-pie"><div><small>Odómetro</small><b class="num">' + (d.odometro && d.odometro.km ? km(d.odometro.km) : '—') + '</b></div>' +
    '<div><small>Último checklist</small><b>' + (d.ultima ? (d.ultima.tipo === 'pre' ? 'De salida' : 'Llegada') : 'Ninguno') + '</b>' + (d.ultima ? '<em>' + esc(diaHora(d.ultima.fecha)) + '</em>' : '') + '</div>' +
    '<div><small>Próximo servicio</small><b class="num">' + (m ? km(m.proximo_km) : '—') + '</b></div></div>' +
    (U.copia ? '<p class="u-copia">' + ic('reloj') + 'Sin señal: datos guardados en este teléfono' + (d.ahora ? ' (' + esc(diaHora(d.ahora)) + ')' : '') + '</p>' : '') +
    '</section>';
}
function enlazarHero(cont) {
  cont.querySelectorAll('[data-z]').forEach(function (g) {
    g.style.cursor = 'pointer';
    g.addEventListener('click', function () { hojaZona(g.getAttribute('data-z')); });
  });
}
function hojaZona(z) {
  var d = U.d; if (!d || !PL) return;
  var cats = [z];
  var nombres = PL.categorias.filter(function (c) { return cats.indexOf(c.id) >= 0; }).map(function (c) { return c.nombre; });
  var nov = (d.novedades || []).filter(function (n) { return ITEMS[n.item] && cats.indexOf(ITEMS[n.item].cat) >= 0; });
  var h = '<h2 id="hoja-t">' + esc(nombres.join(' y ')) + '</h2><p class="desc">' + (nov.length ? plural(nov.length, 'novedad abierta', 'novedades abiertas') : 'Sin novedades abiertas en esta zona.') + '</p>';
  if (z === 'doc') h += (d.documentos || []).filter(function (x) { return x.estado !== 'vigente' && x.estado !== 'permanente'; }).map(function (x) { return filaAlerta({ nivel: x.estado === 'vencido' ? 'bad' : 'warn', titulo: x.nombre + (x.estado === 'vencido' ? ' vencido' : ' por vencer'), detalle: x.vencimiento ? 'Vence el ' + dia(x.vencimiento) : 'Sin fecha' }); }).join('');
  h += nov.map(filaNovedad).join('');
  h += '<div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  V.abrirHoja(h);
  V.hoja().querySelectorAll('[data-nov]').forEach(function (b) { b.onclick = function () { if (mando()) hojaNovedad(b.getAttribute('data-nov')); }; });
}

/* ════════════ Piezas comunes ════════════ */
function filaAlerta(a) {
  return '<button type="button" class="u-alerta ' + a.nivel + '"' + (a.ir ? ' data-ira="' + esc(a.ir) + '"' : '') + '><span class="u-al-i">' + (a.nivel === 'bad' ? ic('x') : a.nivel === 'warn' ? ic('exc') : ic('reloj')) + '</span><span><b>' + esc(a.titulo) + '</b><small>' + esc(a.detalle || '') + '</small></span></button>';
}
function enlazarAlertas(cont) {
  cont.querySelectorAll('[data-ira]').forEach(function (b) {
    b.onclick = function () { var t = b.getAttribute('data-ira'); if (t === 'checklist') return empezar(); if (mando()) { U.tab = t; pintar(); window.scrollTo(0, 0); } else if (t === 'documentos' || t === 'mantenimiento' || t === 'novedades') { var el = $('u-' + t); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } };
  });
}
function filaInsp(x, cola) {
  var flags = '';
  if (x.km_alerta) flags += '<span class="u-flag warn">km dudoso</span>';
  if (x.duracion_seg && x.duracion_seg < 180) flags += '<span class="u-flag">exprés ' + durTxt(x.duracion_seg) + '</span>';
  if (cola) flags += '<span class="u-flag warn">En cola</span>';
  if (x.a_tiempo === 1) flags += '<span class="u-flag ok">' + (x.min_antes > 0 ? x.min_antes + ' min antes' : 'a tiempo') + '</span>';
  if (x.a_tiempo === 0) flags += '<span class="u-flag warn">' + (x.min_antes < 0 ? durMin(-x.min_antes) + ' tarde' : 'fuera de hora') + '</span>';
  if (mando() && !cola && x.origen !== 'v7' && !x.revisado_en && (x.aptitud === 'no' || x.aptitud === 'fallas' || x.km_alerta)) flags += '<span class="u-flag brand">Por revisar</span>';
  return '<button type="button" class="u-insp" ' + (cola ? 'data-cola="1"' : 'data-insp="' + esc(x.id) + '"') + '>' +
    '<span class="u-insp-t ' + x.tipo + '">' + (x.tipo === 'pre' ? 'SALIDA' : 'LLEGADA') + (x.origen === 'v7' ? '<em>v7.2</em>' : '') + '</span>' +
    '<span class="u-insp-c"><b>' + esc(diaHora(x.fecha)) + ' · ' + esc(x.lugar || '') + '</b><small>' + (x.operador ? esc(x.operador) + ' · ' : '') + (x.km ? km(x.km) : '') + (x.titulo_exc ? ' · ' + esc(x.titulo_exc) : '') + '</small>' +
    '<span class="u-cuenta num"><i class="ok">' + ic('check') + (x.conformes || 0) + '</i><i class="warn">' + ic('exc') + (x.observaciones || 0) + '</i><i class="bad">' + ic('x') + (x.fallas || 0) + '</i>' + flags + '</span></span>' +
    chipApt(x.aptitud) + '</button>';
}
function plazoTxt(n) {
  if (n.estado === 'resuelta' || n.dias_plazo === undefined || n.dias_plazo === null) return '';
  var t = n.dias_plazo < 0 ? 'Plazo vencido hace ' + plural(-n.dias_plazo, 'día', 'días') : n.dias_plazo === 0 ? 'Vence hoy' : 'Plazo: ' + plural(n.dias_plazo, 'día', 'días');
  return '<span class="u-plazo ' + (n.dias_plazo < 0 ? 'bad' : n.dias_plazo <= 2 ? 'warn' : '') + '">' + t + (n.compromiso ? ' · compromiso' : '') + '</span>';
}
function filaNovedad(n, sel) {
  return '<button type="button" class="u-nov n-' + n.nivel + (sel ? ' sel' : '') + '" data-nov="' + esc(n.id) + '">' + (U.selModo ? '<span class="u-cb" aria-hidden="true">' + (sel ? V.ico('check') : '') + '</span>' : '<span class="u-nov-b"></span>') + '<span class="u-nov-c">' +
    '<b>' + esc(n.nombre) + '</b><small>' + esc(n.categoria) + ' · ' + (n.escalada ? '<span class="u-tag-esc">Sin regularizar</span>' : NIVEL_NOV[n.nivel]) + (n.estado === 'en_reparacion' ? ' · <span class="u-tag-rep">En reparación</span>' : '') + (n.reincide ? ' · vuelve a fallar' : '') + '</small>' +
    (n.ultima_nota ? '<em>«' + esc(n.ultima_nota) + '»</em>' : '') + plazoTxt(n) + '</span>' +
    '<span class="u-nov-d num"><b>' + (n.estado === 'resuelta' ? '✓' : n.dias_abierta + ' d') + '</b><small>' + plural(n.veces, 'reporte', 'reportes') + '</small></span></button>';
}
function tarjetaDoc(x) {
  var est = { vigente: ['Vigente', 'ok'], por_vencer: ['Por vencer', 'warn'], vencido: ['Vencido', 'bad'], sin_fecha: ['Sin fecha', 'muted'], permanente: ['Sin vencimiento', 'muted'], no_aplica: ['Aún no exigible', 'brand'] }[x.estado] || ['—', 'muted'];
  var cuando = x.estado === 'no_aplica' ? 'Exigible desde el ' + dia(x.exigible_desde) + ' · en ' + plural(x.dias, 'día', 'días') : x.dias === null ? (x.emision ? 'Emitido el ' + dia(x.emision) : '') : x.dias < 0 ? 'Venció hace ' + plural(-x.dias, 'día', 'días') : x.dias === 0 ? 'Vence hoy' : 'Vence en ' + plural(x.dias, 'día', 'días') + ' · ' + dia(x.vencimiento);
  var extra = Object.keys(x.datos || {}).map(function (k) { var lab = ((DOCS[x.tipo] || DOCS.otro).extra.filter(function (e) { return e[0] === k; })[0] || [k, k])[1]; return '<dt>' + esc(lab) + '</dt><dd>' + esc(x.datos[k]) + '</dd>'; }).join('');
  return '<article class="u-doc d-' + est[1] + '"><div class="u-doc-h">' + ic(x.tipo === 'licencia' ? 'asiento' : 'doc') + '<div><b>' + esc(x.nombre) + '</b><small>' + esc(cuando) + '</small></div><span class="u-pill ' + est[1] + '">' + est[0] + '</span></div>' +
    (x.vigencia_pct !== null && x.vigencia_pct !== undefined ? '<div class="u-barra" role="img" aria-label="Vigencia usada ' + x.vigencia_pct + '%"><i style="width:' + x.vigencia_pct + '%"></i></div>' : '') +
    '<dl class="u-dl">' + (x.numero ? '<dt>' + esc((DOCS[x.tipo] || DOCS.otro).num) + '</dt><dd class="num">' + esc(x.numero) + '</dd>' : '') + (x.entidad ? '<dt>' + esc((DOCS[x.tipo] || DOCS.otro).ent) + '</dt><dd>' + esc(x.entidad) + '</dd>' : '') + extra + '</dl>' +
    (x.foto_id ? '' : '<p class="ayuda u-sinfoto">' + (mando() ? 'Sin foto: súbela con «Corregir» para que se vea en un control.' : 'Sin foto cargada.') + '</p>') +
    '<div class="botones">' + (x.foto_id ? '<button type="button" class="btn-mini" data-vdoc="' + esc(x.id) + '">' + ic('ojo') + ' Ver documento</button>' : '') +
    (mando() ? '<button type="button" class="btn-mini" data-rdoc="' + esc(x.tipo) + '">' + ic('chk') + ' Renovar</button><button type="button" class="btn-mini" data-edoc="' + esc(x.id) + '">' + ic('lapiz') + ' Corregir</button>' : '') + '</div></article>';
}
function barrasMant(mt, completo) {
  var m = mt && mt.estado;
  if (!m) return '<div class="card"><p class="vacio">Aún no hay mantenimientos registrados.' + (mando() ? '' : ' Lo registra un administrador.') + '</p>' + (mando() ? '<button type="button" class="btn ancho" data-mant="nuevo">' + ic('llave') + 'Registrar el último servicio</button>' : '') + '</div>';
  var col = { ok: 'ok', atencion: 'warn', proximo: 'alto', vencido: 'bad' }[m.estado];
  var t = m.estado === 'vencido' ? (m.motivo === 'tiempo' ? 'Mantenimiento vencido por tiempo' : 'Mantenimiento vencido: excedido en ' + km(-m.restantes)) : 'Faltan ' + km(m.restantes) + ' o ' + plural(m.dias_restantes, 'día', 'días');
  return '<div class="card u-mant m-' + col + '"><div class="u-mant-h"><div><small>Próximo servicio</small><b class="num">' + km(m.proximo_km) + '</b><span>o el ' + esc(dia(m.fecha_limite)) + ', lo que llegue primero</span></div><span class="u-pill ' + col + '">' + { ok: 'Al día', atencion: 'Atención', proximo: 'Próximo', vencido: 'Vencido' }[m.estado] + '</span></div>' +
    '<div class="u-medidor"><div class="u-med-l"><span>Kilometraje</span><b class="num">' + m.pct + '%</b></div><div class="u-barra grande"><i style="width:' + Math.max(2, m.pct) + '%"></i></div>' +
    '<div class="u-med-e num"><span>' + km(m.ultimo.km) + '</span><span>' + km(m.proximo_km) + '</span></div></div>' +
    '<div class="u-medidor"><div class="u-med-l"><span>Tiempo</span><b class="num">' + m.pct_tiempo + '%</b></div><div class="u-barra"><i style="width:' + Math.max(2, m.pct_tiempo) + '%"></i></div>' +
    '<div class="u-med-e"><span>' + esc(dia(m.ultimo.fecha)) + '</span><span>' + esc(dia(m.fecha_limite)) + '</span></div></div>' +
    '<p class="u-mant-t ' + col + '">' + esc(t) + '</p>' +
    (completo ? '<p class="ayuda">Último: ' + esc(m.ultimo.tipo === 'correctivo' ? 'reparación' : 'mantenimiento') + ' el ' + esc(dia(m.ultimo.fecha)) + ' en ' + esc(m.ultimo.taller || '—') + ' · ' + km(m.ultimo.km) + '. Intervalo: ' + km(mt.intervalo_km) + ' o ' + mt.intervalo_dias + ' días.</p>' : '') + '</div>';
}
function enlazarComunes(cont) {
  enlazarAlertas(cont); enlazarHero(cont);
  cont.querySelectorAll('[data-insp]').forEach(function (b) { b.onclick = function () { hojaInspeccion(b.getAttribute('data-insp')); }; });
  cont.querySelectorAll('[data-cola]').forEach(function (b) { b.onclick = function () { toast('Se enviará sola cuando vuelva la señal'); }; });
  cont.querySelectorAll('[data-nov]').forEach(function (b) { b.onclick = function () { hojaNovedad(b.getAttribute('data-nov')); }; });
  cont.querySelectorAll('[data-vdoc]').forEach(function (b) { b.onclick = function () { var x = (U.d.documentos || []).filter(function (y) { return y.id === b.getAttribute('data-vdoc'); })[0]; if (x) verArchivo(x.foto_id, x.nombre, x.foto_mime); }; });
  cont.querySelectorAll('[data-rdoc]').forEach(function (b) { b.onclick = function () { formDoc(b.getAttribute('data-rdoc'), null); }; });
  cont.querySelectorAll('[data-edoc]').forEach(function (b) { b.onclick = function () { var x = (U.d.documentos || []).filter(function (y) { return y.id === b.getAttribute('data-edoc'); })[0]; if (x) formDoc(x.tipo, x); }; });
  cont.querySelectorAll('[data-mant="nuevo"]').forEach(function (b) { b.onclick = function () { formMant(); }; });
  cont.querySelectorAll('[data-empezar]').forEach(function (b) { b.onclick = function () { empezar(b.getAttribute('data-empezar'), b.getAttribute('data-viaje')); }; });
  var bn = cont.querySelector('#unotif'); if (bn) bn.onclick = pedirPermiso;
  var bi = cont.querySelector('#uimpv7'); if (bi) bi.onclick = hojaImportarV7;
}
function enCola() { return (S.outbox || []).filter(function (o) { return o.tipo === 'chk.crear'; }).map(function (o) { var d = o.datos, n = { c: 0, o: 0, f: 0 }; Object.keys(d.items || {}).forEach(function (k) { n[d.items[k].e]++; }); return { id: d.id, tipo: d.tipo, fecha: d.fecha, lugar: d.lugar, km: d.km, operador: S.yo.nombre, conformes: n.c, observaciones: n.o, fallas: n.f, aptitud: d._aptitud || 'obs', rechazo: o.estado === 'rechazado' ? o.error : '' }; }); }
function viajesHtml(d) {
  var L = d.viajes || []; if (!L.length) return '';
  return '<div class="titulo-sec"><h3>Viajes de estos días</h3></div><div class="card u-viajes">' + L.map(function (v) {
    var sale = String(v.salida || '').replace('T', ' ');
    var pre = v.pre ? chipApt(v.pre.aptitud) : '<span class="u-pill muted">Pendiente</span>';
    var falta = !v.pre && v.estado !== 'en_ruta';
    var cuando = v.salida_hora && !v.pre && v.estado !== 'en_ruta' ? (v.min_para_salir - ((U.d.parametros || {}).chk_ventana_min || 60) > 0 ? 'Checklist desde las ' + v.checklist_desde.slice(11, 16) : '<b class="u-ya">Hora del checklist</b>') : '';
    return '<div class="u-viaje"><div><b>' + esc(v.titulo) + '</b><small>' + esc(v.origen) + ' → ' + esc(v.destino) + ' · ' + esc(diaHora(v.salida_hora || sale)) + (v.estado === 'en_ruta' ? ' · en ruta' : '') + '</small><div class="u-viaje-e">Checklist ' + pre + (cuando ? ' · ' + cuando : '') + '</div></div>' +
      (falta ? '<button type="button" class="btn-mini" data-empezar="pre" data-viaje="' + esc(v.id) + '">' + ic('chk') + ' Checklist</button>' : '') + '</div>';
  }).join('') + '</div>';
}

/* ════════════ Vista principal ════════════ */
function vista() {
  if (U.modo === 'checklist') return plantilla().then(pintarChecklist, errorPlantilla);
  if (U.modo === 'resultado') return pintarResultado();
  if (!U.d) $('vista').innerHTML = '<p class="vacio">Revisando la unidad…</p>';
  else pintar();
  return Promise.all([plantilla().catch(function () { return null; }), cargar()]).then(function () {
    if (!U.d) return pintarSi(function () { $('vista').innerHTML = vacio('Sin señal y sin datos guardados de la unidad. Conéctate una vez para descargarlos.'); });
    pintarSi(pintar);
  });
}
function errorPlantilla(e) { U.modo = null; $('vista').innerHTML = vacio(esc(e.message || 'No se pudo abrir el checklist.')); }
function pintar() {
  if (U.modo) return;
  if (!mando()) return pintarOperador();
  var tabs = [['estado', 'Estado'], ['inspecciones', 'Inspecciones'], ['novedades', 'Novedades'], ['documentos', 'Documentos'], ['mantenimiento', 'Mantenimiento'], ['indicadores', 'Indicadores']];
  var nNov = (U.d.novedades || []).length;
  var h = '<div class="tabs" role="tablist" style="margin-top:0">' + tabs.map(function (t) { return '<button type="button" role="tab" data-utab="' + t[0] + '" aria-selected="' + (U.tab === t[0]) + '">' + t[1] + (t[0] === 'novedades' && nNov ? ' <span class="u-n">' + nNov + '</span>' : '') + '</button>'; }).join('') + '</div><div id="upanel"></div>';
  $('vista').innerHTML = h;
  $('vista').querySelectorAll('[data-utab]').forEach(function (b) { b.onclick = function () { U.tab = b.getAttribute('data-utab'); V.recordarVista(); pintar(); }; });
  ({ estado: tabEstado, inspecciones: tabInspecciones, novedades: tabNovedades, documentos: tabDocumentos, mantenimiento: tabMantenimiento, indicadores: tabIndicadores }[U.tab] || tabEstado)();
}
/* La próxima salida con hora: desde cuándo vale el checklist y cuánto falta. */
function proximaSalida(d) {
  var ahora = Date.now();
  return (d.viajes || []).filter(function (v) { return v.salida_hora && !v.pre && v.estado !== 'en_ruta' && v.min_para_salir !== null; })
    .map(function (v) { var ms = Date.parse(v.salida_hora.replace(' ', 'T') + ':00-05:00'); return { v: v, min: Math.round((ms - ahora) / 60000) }; })
    .filter(function (x) { return x.min > -60; }).sort(function (a, b) { return a.min - b.min; })[0] || null;
}
function botonesChecklist(d) {
  var preHoy = d.hoy && d.hoy.pre, ven = (d.parametros || {}).chk_ventana_min || 60, px = proximaSalida(d), extra = '';
  if (px) {
    var abre = px.min - ven, hh = px.v.salida_hora.slice(11, 16);
    extra = abre > 0 ? '<p class="u-cuenta-reg">' + ic('reloj') + '<span><b>' + esc(px.v.titulo) + ' sale a las ' + hh + '</b>El checklist se abre a las ' + esc(px.v.checklist_desde.slice(11, 16)) + ' (en ' + durMin(abre) + ').</span></p>'
      : '<p class="u-cuenta-reg ahora">' + ic('reloj') + '<span><b>Hora del checklist: ' + esc(px.v.titulo) + '</b>' + (px.min >= 0 ? 'Sale a las ' + hh + ' (en ' + durMin(px.min) + ').' : 'Debía salir a las ' + hh + '.') + '</span></p>';
  }
  return extra + '<button type="button" class="btn ancho u-btn-chk" data-empezar="pre">' + ic('chk') + '<span>Hacer checklist de salida<small>Entre 1 h y 30 min antes de salir · ' + ORDEN.length + ' ítems · ~10 min</small></span></button>' +
    '<p class="ayuda u-hoy">' + (preHoy ? 'Hoy: último checklist a las ' + V.horaDe(preHoy.fecha) + ' · ' + APT[preHoy.aptitud].corto.toLowerCase() + '. Cada salida lleva el suyo.' : 'Hoy aún no hay checklist de salida.') + '</p>' +
    (('Notification' in window) && Notification.permission === 'default' && !mando() ? '<button type="button" class="btn-mini u-notif" id="unotif">' + ic('reloj') + ' Activar recordatorios en este teléfono</button>' : '');
}
function durMin(m) { m = Math.max(0, Math.round(m)); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : ''); }
function borradorAviso() { return U.borr ? '<div class="u-borr"><div><b>Tienes un checklist a medio llenar</b><small>' + TIPO[U.borr.tipo] + ' · ' + Object.keys(U.borr.items || {}).length + ' de ' + ORDEN.length + ' ítems · empezado ' + esc(diaHora(U.borr.inicio)) + '</small></div><button type="button" class="btn-mini" id="ucont">Continuar</button><button type="button" class="btn-mini" id="udesc" style="color:var(--bad)">Descartar</button></div>' : ''; }
function enlazarBorrador() {
  if ($('ucont')) $('ucont').onclick = function () { U.modo = 'checklist'; U.f = U.borr; vista(); window.scrollTo(0, 0); };
  if ($('udesc')) $('udesc').onclick = function () { if (!confirm('¿Descartar el checklist a medio llenar?')) return; borrarBorrador().then(function () { U.borr = null; pintar(); }); };
}
function pintarOperador() {
  var d = U.d, cola = enCola();
  var h = hero(d) + borradorAviso() + botonesChecklist(d);
  var al = (d.alertas || []).filter(function (a) { return a.nivel !== 'info' || a.ir === 'checklist'; });
  if (al.length) h += '<div class="titulo-sec"><h3>Atención</h3></div><div class="u-alertas">' + al.map(filaAlerta).join('') + '</div>';
  h += viajesHtml(d);
  h += '<div class="titulo-sec" id="u-documentos"><h3>Documentos a bordo</h3><span class="ayuda" style="margin:0">Muéstralos en un control</span></div>' + ((d.documentos || []).length ? '<div class="u-docs">' + d.documentos.map(tarjetaDoc).join('') + '</div>' : vacio('Aún no hay documentos cargados. Los sube un administrador.'));
  h += '<div class="titulo-sec" id="u-mantenimiento"><h3>Mantenimiento</h3></div>' + barrasMant(d.mantenimiento);
  h += '<div class="titulo-sec" id="u-novedades"><h3>Novedades abiertas</h3><span class="rol">' + (d.novedades || []).length + '</span></div>' + ((d.novedades || []).length ? '<div class="card u-lista">' + d.novedades.map(filaNovedad).join('') + '<p class="ayuda">Se cierran solas cuando un checklist marca el ítem como «Bien».</p></div>' : vacio('Sin novedades abiertas.'));
  h += '<div class="titulo-sec"><h3>Mis checklists</h3></div><div class="card u-lista">' + (cola.length || (d.inspecciones || []).length ? cola.map(function (x) { return filaInsp(x, true); }).join('') + (d.inspecciones || []).map(function (x) { return filaInsp(x); }).join('') : '<p class="vacio">Aún no haces ninguno.</p>') + '</div>';
  $('vista').innerHTML = '<div class="entrar">' + h + '</div>';
  enlazarComunes($('vista')); enlazarBorrador();
  // Para el operador, las novedades se ven pero no se gestionan.
  $('vista').querySelectorAll('[data-nov]').forEach(function (b) { b.onclick = function () { hojaNovedadLectura(b.getAttribute('data-nov')); }; });
}
function hojaNovedadLectura(id) {
  var n = (U.d.novedades || []).filter(function (x) { return x.id === id; })[0]; if (!n) return;
  V.abrirHoja('<h2 id="hoja-t">' + esc(n.nombre) + '</h2><p class="desc">' + esc(n.categoria) + ' · ' + NIVEL_NOV[n.nivel] + ' · ' + EST_NOV[n.estado] + '</p>' + plazoTxt(n) + '<dl class="ficha"><dt>Abierta</dt><dd>' + esc(dia(n.abierta_en)) + ' (' + plural(n.dias_abierta, 'día', 'días') + ')</dd><dt>Reportes</dt><dd>' + n.veces + '</dd>' + (n.ultima_nota ? '<dt>Última nota</dt><dd>' + esc(n.ultima_nota) + '</dd>' : '') + (n.taller_nota ? '<dt>Reparación</dt><dd>' + esc(n.taller_nota) + '</dd>' : '') + '</dl><p class="ayuda">Cuando esté arreglado, márcalo «Bien» en tu próximo checklist y se cierra solo.</p><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Entendido</button></div>');
}
function tabEstado() {
  var d = U.d, m = d.mantenimiento && d.mantenimiento.estado;
  var docsOk = (d.documentos || []).filter(function (x) { return x.estado === 'vigente' || x.estado === 'permanente' || x.estado === 'no_aplica'; }).length, docsN = (d.documentos || []).length;
  var crit = (d.novedades || []).filter(function (n) { return n.nivel === 'critica'; }).length, venc = (d.novedades || []).filter(function (n) { return n.atrasada; }).length;
  var h = hero(d) + borradorAviso() + botonesChecklist(d);
  if ((d.alertas || []).length) h += '<div class="titulo-sec"><h3>Qué atender</h3><span class="rol">' + d.alertas.length + '</span></div><div class="u-alertas">' + d.alertas.map(filaAlerta).join('') + '</div>';
  h += '<div class="kpis k4" style="margin-top:14px">' +
    '<div class="kpi"><small>Odómetro</small><b class="num">' + (d.odometro.km ? km(d.odometro.km) : '—') + '</b><span class="d">' + (d.odometro.ultima_lectura ? 'Leído ' + esc(diaHora(d.odometro.ultima_lectura.fecha)) : 'Sin lecturas') + '</span></div>' +
    '<div class="kpi' + (m && (m.estado === 'vencido' || m.estado === 'proximo') ? ' alerta' : '') + '"><small>Para el servicio</small><b class="num">' + (m ? (m.restantes > 0 ? km(m.restantes) : 'Vencido') : '—') + '</b><span class="d">' + (m ? 'o ' + plural(Math.max(0, m.dias_restantes), 'día', 'días') : 'Sin registro') + '</span></div>' +
    '<button type="button" class="kpi u-kpi-btn' + (crit || venc ? ' alerta' : '') + '" data-ira="novedades"><small>Por regularizar</small><b class="num">' + (d.novedades || []).length + '</b><span class="d">' + (venc ? plural(venc, 'con plazo vencido', 'con plazo vencido') : 'Todas en plazo') + (crit ? ' · ' + plural(crit, 'crítica', 'críticas') : '') + '</span></button>' +
    '<div class="kpi' + (docsN && docsOk < docsN ? ' alerta' : '') + '"><small>Documentos al día</small><b class="num">' + docsOk + ' / ' + docsN + '</b><span class="d">' + (d.documentos_faltan.length ? plural(d.documentos_faltan.length, 'sin cargar', 'sin cargar') : 'Todos cargados') + '</span></div></div>';
  h += viajesHtml(d);
  h += '<div class="titulo-sec"><h3>Últimos checklists</h3><button type="button" class="btn-mini" id="uvert">Ver todos</button></div><div class="card u-lista">' + ((d.inspecciones || []).length || enCola().length ? enCola().map(function (x) { return filaInsp(x, true); }).join('') + d.inspecciones.slice(0, 6).map(function (x) { return filaInsp(x); }).join('') : '<p class="vacio">Aún no hay checklists. El primero lo puede hacer Jorge desde su pestaña «Checklist».</p>') + '</div>';
  $('upanel').innerHTML = '<div class="entrar">' + h + '</div>';
  enlazarComunes($('upanel')); enlazarBorrador();
  if ($('uvert')) $('uvert').onclick = function () { U.tab = 'inspecciones'; pintar(); };
}

/* ════════════ Checklist: preparar → revisar ítem por ítem → enviar ════════════ */
function claveBorr() { return 'chk_borr:' + (S.yo ? S.yo.id : ''); }
function cargarBorrador() { return V.kvGet(claveBorr()).then(function (b) { U.borr = b && b.items && Object.keys(b.items).length && Date.now() - (b.t || 0) < 24 * 3600e3 ? b : null; return U.borr; }); }
var tBorr = null;
function guardarBorrador() { clearTimeout(tBorr); tBorr = setTimeout(function () { if (U.f) { U.f.t = Date.now(); V.kvSet(claveBorr(), U.f); } }, 350); }
function borrarBorrador() { clearTimeout(tBorr); U.borr = null; return V.kvSet(claveBorr(), null); }
function empezar(tipo, viaje) {
  var nuevo = function () {
    U.f = { id: V.uuid(), tipo: 'pre', viaje: viaje || '', motivo: viaje ? 'excursion' : '', lugar: '', km: '', salida: '', inicio: V.ahoraLima(), items: {}, fotos: {}, abiertas: {}, t: Date.now() };
    U.paso = 'preparar'; U.modo = 'checklist'; S.vista === 'unidad' ? vista() : V.ir('unidad', true); window.scrollTo(0, 0);
  };
  cargarBorrador().then(function (b) {
    if (b && b.tipo !== 'post' && confirm('Tienes un checklist de salida a medio llenar (' + Object.keys(b.items).length + ' de ' + (ORDEN.length || 77) + '). ¿Continuarlo?\n\nAceptar: continuar · Cancelar: empezar uno nuevo')) { U.f = b; U.paso = 'items'; U.modo = 'checklist'; S.vista === 'unidad' ? vista() : V.ir('unidad', true); return; }
    if (b) borrarBorrador();
    nuevo();
  });
}
function salirChecklist() { U.modo = null; U.f = null; U.paso = null; document.body.classList.remove('en-chk'); vista(); window.scrollTo(0, 0); }
function pintarChecklist() {
  if (!U.f) return salirChecklist();
  if (U.f.items && Object.keys(U.f.items).length && U.paso !== 'preparar') U.paso = 'items';
  return U.paso === 'preparar' ? pintarPreparar() : pintarItems();
}
function ultimaLectura() { var d = U.d || {}; return d.odometro || { km: 0 }; }
function revisarKm(v) {
  var o = ultimaLectura(), k = Number(String(v || '').replace(/\D/g, '')) || 0;
  if (!k) return { ok: false, t: 'Escribe el kilometraje que marca el tablero.' };
  if (o.km && k < o.km - 5) return { ok: true, aviso: true, t: 'Es menor que el último registrado (' + km(o.km) + '). Revisa el tablero: si está bien, sigue igual.' };
  if (o.km && k > o.km + 3000) return { ok: true, aviso: true, t: 'Son ' + km(k - o.km) + ' más que el último registrado. Revisa los dígitos: un error así descuadra el mantenimiento.' };
  return { ok: true, t: o.km ? 'Último registrado: ' + km(o.km) + (k >= o.km ? ' · +' + km(k - o.km) : '') : '' };
}
function limaMas(min) { return V.ahoraLima(new Date(Date.now() + min * 60000)).slice(0, 16); }
function minHasta(f16) { return Math.round((Date.parse(String(f16).replace(' ', 'T').slice(0, 16) + ':00-05:00') - Date.now()) / 60000); }
function pintarPreparar() {
  var f = U.f, d = U.d || {}, ven = (d.parametros || {}).chk_ventana_min || 60, ant = (d.parametros || {}).chk_anticipacion_min;
  if (ant === undefined || ant === null) ant = 30;
  var viajes = (d.viajes || []).filter(function (v) { return v.estado !== 'en_ruta' && !v.pre; });
  var lugares = ['Angasmarca', 'Trujillo']; viajes.forEach(function (v) { if (v.origen && lugares.indexOf(v.origen) < 0) lugares.push(v.origen); });
  var vj = function () { return viajes.filter(function (v) { return v.id === f.viaje; })[0]; };
  if (!f.lugar) f.lugar = vj() ? vj().origen : 'Angasmarca';
  var opc = viajes.map(function (v) { return ['excursion', v.id, v.titulo, v.salida_hora ? 'Sale ' + diaHora(v.salida_hora) : diaHora(String(v.salida).replace('T', ' ')) + ' · sin hora'] })
    .concat([['ruta', '', 'Ruta Angasmarca ⇄ Trujillo', 'Viaje regular'], ['otro', '', 'Otro viaje largo', 'Sin excursión registrada']]);
  if (!f.motivo || (f.motivo === 'excursion' && !vj())) { f.motivo = viajes.length ? 'excursion' : 'ruta'; f.viaje = viajes.length ? viajes[0].id : ''; }
  if (f.motivo !== 'excursion' && !f.salida) f.salida = limaMas(30);
  var h = '<button type="button" class="enlace" id="uvolver" style="padding:4px 0">← Volver a la unidad</button>' +
    '<div class="saludo" style="margin-top:6px"><h2>Checklist de salida</h2><p>Se hace en la hora previa a salir, antes de recoger a los pasajeros. Placa ' + esc(placaFmt(d.placa || '')) + '.</p></div>' +
    '<div class="card"><span class="etq" style="margin-top:0">¿Para qué viaje?</span><div class="u-opcs">' + opc.map(function (o, i) { var sel = o[0] === f.motivo && (o[0] !== 'excursion' || o[1] === f.viaje); return '<button type="button" class="u-opc" data-uv="' + i + '" aria-pressed="' + sel + '"><b>' + esc(o[2]) + '</b><small>' + esc(o[3]) + '</small></button>'; }).join('') + '</div>' +
    '<div id="uhora"></div>' +
    '<span class="etq">Lugar de salida</span><div class="chips">' + lugares.slice(0, 5).map(function (l) { return '<button type="button" class="chip" data-ul="' + esc(l) + '" aria-pressed="' + (f.lugar === l) + '">' + esc(l) + '</button>'; }).join('') + '</div>' +
    '<div class="campo"><label for="ulugar">Otro lugar</label><input id="ulugar" maxlength="60" autocomplete="off" value="' + (lugares.indexOf(f.lugar) < 0 ? esc(f.lugar) : '') + '" placeholder="Escribe si no está arriba"></div>' +
    '<div class="campo"><label for="ukm">Kilometraje del tablero</label><input id="ukm" inputmode="numeric" class="num" autocomplete="off" placeholder="Ej. 122500" value="' + esc(f.km) + '"></div><p class="ayuda" id="ukmt"></p>' +
    '<button type="button" class="btn ancho" id="uir" style="margin-top:18px">' + ic('chk') + 'Empezar: ' + ORDEN.length + ' ítems</button><p class="ayuda" id="uirt" style="text-align:center"></p></div>';
  $('vista').innerHTML = '<div class="entrar">' + h + '</div>';
  var v = $('vista');
  // Hora de salida: la de la excursión, o la que indica el conductor (máximo dentro de la ventana).
  var pintarHora = function () {
    var x = vj(), cont = $('uhora'), hh = '';
    if (f.motivo === 'excursion' && x) {
      if (x.salida_hora) { var faltan = minHasta(x.salida_hora); hh = '<div class="u-hora ' + (faltan - ven > 10 ? 'temprano' : 'ok') + '">' + ic('reloj') + '<span><b>Sale a las ' + esc(x.salida_hora.slice(11, 16)) + '</b>' + (faltan - ven > 10 ? 'El checklist se abre a las ' + esc(x.checklist_desde.slice(11, 16)) + ' (en ' + durMin(faltan - ven) + '). Si lo haces antes, no valdrá para esta salida.' : faltan >= ant ? 'Faltan ' + durMin(faltan) + ': es la hora del checklist.' : faltan >= 0 ? 'Faltan solo ' + durMin(faltan) + ': debía hacerse ' + ant + ' min antes. Hazlo ya; quedará como fuera de hora.' : 'Ya pasó la hora de salida: hazlo ahora y avisa a la oficina.') + '</span></div>'; }
      else hh = '<div class="u-hora">' + ic('reloj') + '<span><b>Esta excursión no tiene hora registrada</b>Hazlo dentro de la hora previa a salir.</span></div>';
    } else {
      var faltan2 = f.salida ? minHasta(f.salida) : 30;
      hh = '<span class="etq">¿A qué hora sales?</span><div class="chips">' + [[ant, 'En ' + ant + ' min'], [Math.round((ant + ven) / 2), 'En ' + Math.round((ant + ven) / 2) + ' min'], [ven, 'En ' + durMin(ven)]].map(function (o) { return '<button type="button" class="chip" data-uh="' + o[0] + '" aria-pressed="' + (Math.abs(faltan2 - o[0]) <= 2) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
        '<div class="campo"><label for="uhs">Hora de salida</label><input id="uhs" type="time" value="' + esc((f.salida || limaMas(30)).slice(11, 16)) + '"></div>' +
        '<p class="ayuda">Se hace entre ' + durMin(ven) + ' y ' + ant + ' min antes de salir. Si sales más tarde de la hora indicada, tendrás que repetirlo.</p>';
    }
    cont.innerHTML = hh;
    cont.querySelectorAll('[data-uh]').forEach(function (b) { b.onclick = function () { f.salida = limaMas(+b.getAttribute('data-uh')); pintarHora(); validar(); }; });
    if ($('uhs')) $('uhs').onchange = function () { if (!this.value) return; var d0 = V.hoyLima() + ' ' + this.value; if (minHasta(d0) < -60) d0 = sumar(V.hoyLima(), 1) + ' ' + this.value; f.salida = d0; pintarHora(); validar(); };
  };
  var validar = function () {
    var x = vj(), msg = '', ok = true;
    if (f.motivo === 'excursion' && x && x.salida_hora && minHasta(x.salida_hora) - ven > 10) { ok = false; msg = 'Se habilita a las ' + x.checklist_desde.slice(11, 16) + '.'; }
    if (f.motivo !== 'excursion' && f.salida) { var m = minHasta(f.salida); if (m > ven + 5) { ok = false; msg = 'Sales en ' + durMin(m) + ': el checklist se hace como máximo ' + durMin(ven) + ' antes.'; } else if (m < -30) { ok = false; msg = 'Esa hora ya pasó: elige la hora real de salida.'; } else if (m < ant - 5) msg = 'Con menos de ' + ant + ' min antes de salir quedará registrado como fuera de hora.'; }
    $('uir').disabled = !ok; $('uirt').textContent = msg; return ok;
  };
  pintarHora(); validar();
  $('uvolver').onclick = function () { if (Object.keys(f.items).length) guardarBorrador(); else borrarBorrador(); salirChecklist(); };
  v.querySelectorAll('[data-uv]').forEach(function (b) { b.onclick = function () { var o = opc[+b.getAttribute('data-uv')]; f.motivo = o[0]; f.viaje = o[1]; if (o[0] !== 'excursion' && !f.salida) f.salida = limaMas(30); if (o[0] === 'excursion' && vj() && lugares.indexOf(vj().origen) >= 0) f.lugar = vj().origen; v.querySelectorAll('[data-uv]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); pintarHora(); validar(); }; });
  v.querySelectorAll('[data-ul]').forEach(function (b) { b.onclick = function () { f.lugar = b.getAttribute('data-ul'); $('ulugar').value = ''; v.querySelectorAll('[data-ul]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
  $('ulugar').oninput = function () { var t = this.value.trim(); if (t) { f.lugar = t; v.querySelectorAll('[data-ul]').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); } };
  var kmv = function () { f.km = $('ukm').value.replace(/\D/g, ''); var r = revisarKm(f.km); $('ukmt').textContent = f.km ? r.t.replace(' · +0 km', '') : (ultimaLectura().km ? 'Último registrado: ' + km(ultimaLectura().km) : ''); $('ukmt').classList.toggle('alerta', !!r.aviso); };
  $('ukm').oninput = kmv; kmv();
  $('uir').onclick = function () {
    if (!validar()) return toast($('uirt').textContent, true);
    if (!f.lugar || f.lugar.length < 2) return toast('Elige o escribe el lugar', true);
    var r = revisarKm(f.km); if (!r.ok) { $('ukm').focus(); return toast(r.t, true); }
    if (r.aviso && !confirm(r.t + '\n\n¿El kilometraje ' + km(f.km) + ' es correcto?')) return $('ukm').focus();
    if (!Object.keys(f.items).length) f.inicio = V.ahoraLima();
    U.paso = 'items'; guardarBorrador(); pintarItems(); window.scrollTo(0, 0);
  };
}
function horaTxt(f) { var x = ((U.d || {}).viajes || []).filter(function (v) { return v.id === f.viaje; })[0], hs = f.motivo === 'excursion' ? (x && x.salida_hora) : f.salida; return hs ? ' · sale ' + V.horaDe(hs) : ''; }
function novPorItem() { var m = {}; ((U.d || {}).novedades || []).forEach(function (n) { m[n.item] = n; }); return m; }
function docsVencidos() { return ((U.d || {}).documentos || []).filter(function (x) { return x.estado === 'vencido' && x.bloquea; }); }
function conteo() {
  var f = U.f, n = { c: 0, o: 0, f: 0, cr: 0, hechos: 0 };
  ORDEN.forEach(function (k) { var x = f.items[k]; if (!x || !x.e) return; n.hechos++; n[x.e]++; if (x.e === 'f' && ITEMS[k].prioridad === 'C') n.cr++; });
  n.apt = (n.cr || docsVencidos().length) ? 'no' : n.f ? 'fallas' : n.o ? 'obs' : 'apto';
  return n;
}
function pintarItems() {
  var f = U.f, nov = novPorItem();
  document.body.classList.add('en-chk');
  var h = '<div class="chk-barra" id="ubar"><div class="chk-prog" aria-hidden="true"><i class="c"></i><i class="o"></i><i class="f"></i></div>' +
    '<div class="chk-info"><b class="num" id="unum"></b><span class="u-pill" id="uapt"></span><button type="button" class="btn-mini" id="usig">Siguiente pendiente</button></div></div>';
  h += '<div class="chk-cab"><button type="button" class="enlace" id="uvolver" style="padding:4px 0">← Guardar y salir</button><p><b>Checklist de salida</b> · ' + esc(f.lugar) + ' · ' + km(f.km) + horaTxt(f) + ' <button type="button" class="enlace" id="ucambiar" style="padding:0 4px">Cambiar</button></p>' +
    (docsVencidos().length ? '<p class="u-aviso-doc">' + ic('x') + esc(docsVencidos().map(function (x) { return x.nombre; }).join(', ')) + ' vencido: la unidad saldrá NO APTA aunque todo esté bien.</p>' : '') + '</div>';
  PL.categorias.forEach(function (c) {
    var abierta = f.abiertas[c.id] !== false;
    h += '<section class="chk-cat" data-cat="' + c.id + '"><button type="button" class="chk-cat-h" aria-expanded="' + abierta + '" data-cath="' + c.id + '">' + miniZona(c.id) + '<b>' + esc(c.nombre) + '</b><span class="chk-cat-n num" id="ucn-' + c.id + '"></span><svg class="ico chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button><div class="chk-cat-b"' + (abierta ? '' : ' hidden') + '>' +
      (c.guia ? '<p class="chk-guia">' + ic(CICON[c.id]) + '<span>' + esc(c.guia) + '</span></p>' : '');
    c.items.forEach(function (it) {
      var k = it[0], x = f.items[k] || {}, n = nov[k];
      h += '<div class="chk-it" id="it-' + k + '" data-k="' + k + '" data-e="' + (x.e || '') + '"><div class="chk-it-t">' + sev(it[2]) + '<b>' + esc(it[1]) + '</b>' +
        (n ? '<small class="chk-prev">' + ic('exc') + 'Pendiente desde ' + esc(dia(n.abierta_en)) + ' · ' + plural(n.veces, 'reporte', 'reportes') + (n.ultima_nota ? ': «' + esc(n.ultima_nota) + '»' : '') + (n.estado === 'en_reparacion' ? ' · en reparación' : '') + '</small>' : '') + '</div>' +
        '<div class="tri" role="radiogroup" aria-label="' + esc(it[1]) + '">' +
        '<button type="button" role="radio" data-e="c" aria-checked="' + (x.e === 'c') + '">' + V.ico('check') + 'Bien</button>' +
        '<button type="button" role="radio" data-e="o" aria-checked="' + (x.e === 'o') + '">' + ic('exc') + 'Observación</button>' +
        '<button type="button" role="radio" data-e="f" aria-checked="' + (x.e === 'f') + '">' + ic('x') + 'Falla</button></div>' +
        '<div class="chk-nota"' + (x.e === 'o' || x.e === 'f' ? '' : ' hidden') + '><textarea data-nota="' + k + '" rows="2" maxlength="200" placeholder="¿Qué viste? (obligatorio)">' + esc(x.n || '') + '</textarea>' +
        '<div class="chk-foto"><button type="button" class="btn-mini" data-foto="' + k + '">' + ic('camara') + (f.fotos[k] ? ' Cambiar foto' : ' Foto') + '</button>' + (f.fotos[k] ? '<img alt="Evidencia" src="data:' + f.fotos[k].mime + ';base64,' + f.fotos[k].data + '"><button type="button" class="btn-mini" data-sinfoto="' + k + '">Quitar</button>' : '') + '</div></div></div>';
    });
    h += '<button type="button" class="chk-todo" data-todo="' + c.id + '" id="ut-' + c.id + '"></button></div></section>';
  });
  h += '<div class="chk-fin"><button type="button" class="btn ancho" id="uenviar">Revisar y enviar</button><p class="ayuda" style="text-align:center">Se guarda solo mientras avanzas: puedes salir y volver.</p></div>';
  h += '<input type="file" id="ufoto" accept="image/*" capture="environment" hidden>';
  $('vista').innerHTML = '<div id="uchk">' + h + '</div>';
  enlazarItems(); actualizar(true);
}
function actualizar(todo) {
  var f = U.f, n = conteo(), T = ORDEN.length, a = APT[n.hechos ? n.apt : 'sin_datos'];
  var bar = $('ubar'); if (!bar) return;
  var is = bar.querySelectorAll('.chk-prog i');
  is[0].style.width = (n.c / T * 100) + '%'; is[1].style.width = (n.o / T * 100) + '%'; is[2].style.width = (n.f / T * 100) + '%';
  $('unum').textContent = n.hechos + ' de ' + T;
  var apt = $('uapt'); apt.className = 'u-pill ' + (n.hechos ? a.c : 'muted'); apt.textContent = n.hechos ? (n.hechos < T && n.apt === 'apto' ? 'Todo bien hasta ahora' : a.corto) : 'Sin empezar';
  $('usig').hidden = n.hechos >= T;
  var env = $('uenviar'); env.textContent = n.hechos < T ? 'Revisar y enviar · faltan ' + (T - n.hechos) : 'Revisar y enviar';
  PL.categorias.forEach(function (c) {
    var hechos = 0, o = 0, fl = 0; c.items.forEach(function (it) { var x = f.items[it[0]]; if (x && x.e) { hechos++; if (x.e === 'o') o++; if (x.e === 'f') fl++; } });
    var el = $('ucn-' + c.id); if (el) el.innerHTML = (fl ? '<i class="bad">' + fl + '</i>' : '') + (o ? '<i class="warn">' + o + '</i>' : '') + hechos + '/' + c.items.length;
    var sec = el && el.closest('.chk-cat'); if (sec) sec.classList.toggle('lista', hechos === c.items.length);
    var t = $('ut-' + c.id), falta = c.items.length - hechos; if (t) { t.hidden = !falta; t.innerHTML = V.ico('check') + 'Marcar «Bien» en ' + (falta === c.items.length ? 'toda la sección' : 'los ' + falta + ' que faltan'); }
  });
}
function marcar(k, e) {
  var f = U.f, x = f.items[k] = f.items[k] || {}; x.e = e;
  var row = $('it-' + k); if (!row) return;
  row.setAttribute('data-e', e); row.classList.remove('falta');
  row.querySelectorAll('[data-e]').forEach(function (b) { if (b !== row) b.setAttribute('aria-checked', b.getAttribute('data-e') === e); });
  var nota = row.querySelector('.chk-nota'); nota.hidden = e === 'c';
  if (e !== 'c') { var ta = nota.querySelector('textarea'); if (!ta.value.trim()) setTimeout(function () { ta.focus(); }, 60); }
}
function enlazarItems() {
  var v = $('uchk'), f = U.f;
  $('uvolver').onclick = function () { guardarBorrador(); U.borr = f; salirChecklist(); toast('Checklist guardado: continúalo cuando quieras'); };
  $('ucambiar').onclick = function () { U.paso = 'preparar'; pintarPreparar(); window.scrollTo(0, 0); };
  $('usig').onclick = function () { var k = ORDEN.filter(function (k) { return !(f.items[k] && f.items[k].e); })[0]; if (k) irA(k); };
  $('uenviar').onclick = revisarEnvio;
  v.addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b || !U.f) return;
    var row = b.closest('.chk-it');
    if (row && b.hasAttribute('data-e')) {
      var k = row.getAttribute('data-k'); marcar(k, b.getAttribute('data-e')); actualizar(); guardarBorrador();
      // Sección completa y todo «Bien»: se pliega sola para avanzar más rápido.
      var c = ITEMS[k].cat, cat = PL.categorias.filter(function (x) { return x.id === c; })[0];
      if (b.getAttribute('data-e') === 'c' && cat.items.every(function (it) { return f.items[it[0]] && f.items[it[0]].e === 'c'; })) setTimeout(function () { plegar(c, false); }, 260);
      return;
    }
    if (b.hasAttribute('data-cath')) { var id = b.getAttribute('data-cath'); plegar(id, b.getAttribute('aria-expanded') !== 'true'); return; }
    if (b.hasAttribute('data-todo')) {
      var cid = b.getAttribute('data-todo'), cc = PL.categorias.filter(function (x) { return x.id === cid; })[0];
      cc.items.forEach(function (it) { if (!(f.items[it[0]] && f.items[it[0]].e)) marcar(it[0], 'c'); });
      actualizar(); guardarBorrador(); setTimeout(function () { plegar(cid, false); var sig = PL.categorias[PL.categorias.indexOf(cc) + 1]; if (sig) { plegar(sig.id, true); var s = v.querySelector('[data-cat="' + sig.id + '"]'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 200);
      return;
    }
    if (b.hasAttribute('data-foto')) {
      if (Object.keys(f.fotos).length >= 3 && !f.fotos[b.getAttribute('data-foto')]) return toast('Máximo 3 fotos por checklist', true);
      U.fotoK = b.getAttribute('data-foto'); $('ufoto').value = ''; $('ufoto').click(); return;
    }
    if (b.hasAttribute('data-sinfoto')) { delete f.fotos[b.getAttribute('data-sinfoto')]; guardarBorrador(); repintarFoto(b.getAttribute('data-sinfoto')); }
  });
  v.addEventListener('input', function (ev) { var t = ev.target; if (t.hasAttribute && t.hasAttribute('data-nota') && U.f) { var k = t.getAttribute('data-nota'); (f.items[k] = f.items[k] || {}).n = t.value; if (t.value.trim()) t.classList.remove('falta'); guardarBorrador(); } });
  $('ufoto').onchange = function () {
    var file = this.files[0], k = U.fotoK; if (!file || !k) return;
    V.comprimirFoto(file).then(function (x) { if (x.mime === 'application/pdf') throw new Error('Toma una foto, no un PDF.'); f.fotos[k] = x; guardarBorrador(); repintarFoto(k); }).catch(function (e) { toast(e.message, true); });
  };
}
function repintarFoto(k) {
  var row = $('it-' + k); if (!row) return; var f = U.f, cont = row.querySelector('.chk-foto');
  cont.innerHTML = '<button type="button" class="btn-mini" data-foto="' + k + '">' + ic('camara') + (f.fotos[k] ? ' Cambiar foto' : ' Foto') + '</button>' + (f.fotos[k] ? '<img alt="Evidencia" src="data:' + f.fotos[k].mime + ';base64,' + f.fotos[k].data + '"><button type="button" class="btn-mini" data-sinfoto="' + k + '">Quitar</button>' : '');
}
function plegar(cid, abrir) {
  var sec = document.querySelector('.chk-cat[data-cat="' + cid + '"]'); if (!sec) return;
  sec.querySelector('.chk-cat-h').setAttribute('aria-expanded', abrir); sec.querySelector('.chk-cat-b').hidden = !abrir;
  U.f.abiertas[cid] = abrir; guardarBorrador();
}
function irA(k) {
  plegar(ITEMS[k].cat, true);
  var row = $('it-' + k); if (!row) return;
  row.classList.add('falta'); row.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function revisarEnvio() {
  var f = U.f, n = conteo(), T = ORDEN.length;
  var falta = ORDEN.filter(function (k) { return !(f.items[k] && f.items[k].e); });
  if (falta.length) { toast('Faltan ' + plural(falta.length, 'ítem', 'ítems') + ': te llevo al primero', true); falta.forEach(function (k) { var r = $('it-' + k); if (r) r.classList.add('falta'); }); return irA(falta[0]); }
  var sinNota = ORDEN.filter(function (k) { return f.items[k].e !== 'c' && !(f.items[k].n || '').trim(); });
  if (sinNota.length) { toast('Describe lo que viste en ' + plural(sinNota.length, 'ítem', 'ítems'), true); sinNota.forEach(function (k) { var t = document.querySelector('[data-nota="' + k + '"]'); if (t) t.classList.add('falta'); }); irA(sinNota[0]); var ta = document.querySelector('[data-nota="' + sinNota[0] + '"]'); if (ta) setTimeout(function () { ta.focus(); }, 450); return; }
  var a = APT[n.apt], viaje = ((U.d || {}).viajes || []).filter(function (v) { return v.id === f.viaje; })[0];
  var raz = docsVencidos().map(function (x) { return x.nombre + ' vencido'; }).concat(ORDEN.filter(function (k) { return f.items[k].e === 'f' && ITEMS[k].prioridad === 'C'; }).map(function (k) { return 'Falla crítica: ' + ITEMS[k].nombre; }));
  var lista = function (e, t) { var L = ORDEN.filter(function (k) { return f.items[k].e === e; }); return L.length ? '<span class="etq">' + t + ' (' + L.length + ')</span><ul class="u-hall">' + L.map(function (k) { return '<li>' + sev(ITEMS[k].prioridad) + '<span><b>' + esc(ITEMS[k].nombre) + '</b><small>' + esc(f.items[k].n) + (f.fotos[k] ? ' · con foto' : '') + '</small></span></li>'; }).join('') + '</ul>' : ''; };
  var dur = Math.round((Date.parse(V.ahoraLima().replace(' ', 'T') + 'Z') - Date.parse(String(f.inicio).replace(' ', 'T') + 'Z')) / 1000);
  var h = '<h2 id="hoja-t">Revisar y enviar</h2><div class="u-res-mini v-' + a.c + '"><b>' + a.t + '</b>' + (raz.length ? '<small>' + esc(raz.slice(0, 3).join(' · ')) + '</small>' : '') + '</div>' +
    '<dl class="ficha"><dt>Salida</dt><dd>' + esc(horaTxt(f).replace(' · sale ', '') || 'Sin hora') + '</dd><dt>Viaje</dt><dd>' + esc(viaje ? viaje.titulo : f.motivo === 'ruta' ? 'Ruta Angasmarca ⇄ Trujillo' : 'Otro viaje') + '</dd><dt>Lugar</dt><dd>' + esc(f.lugar) + '</dd><dt>Kilometraje</dt><dd class="num">' + km(f.km) + '</dd>' +
    '<dt>Resultado</dt><dd class="num">' + n.c + ' bien · ' + plural(n.o, 'observación', 'observaciones') + ' · ' + plural(n.f, 'falla', 'fallas') + '</dd><dt>Tiempo</dt><dd>' + durTxt(dur) + '</dd></dl>' +
    lista('f', 'Fallas') + lista('o', 'Observaciones') +
    (dur < 180 ? '<p class="ayuda alerta">Lo llenaste en menos de 3 minutos. Si no revisaste cada punto, vuelve y hazlo con calma: es la seguridad de tus pasajeros.</p>' : '') +
    '<p class="ayuda">Al enviar se registra la hora (' + V.horaDe(V.ahoraLima()) + ') y ya no se puede cambiar.' + (navigator.onLine ? '' : ' Sin señal: se guarda en el teléfono y se envía solo.') + '</p>' +
    '<p class="error" id="er" role="alert"></p><div class="acciones"><button type="button" class="btn ancho" id="ok">' + (navigator.onLine ? 'Enviar checklist' : 'Guardar y enviar con señal') + '</button><button type="button" class="btn sec ancho" data-cerrar>Seguir revisando</button></div>';
  V.abrirHoja(h);
  $('ok').onclick = function () { enviar(n); };
}
var enviando = false;
function enviar(n) {
  if (enviando) return; enviando = true; $('ok').disabled = true;
  var f = U.f, items = {};
  ORDEN.forEach(function (k) { items[k] = f.items[k].e === 'c' ? { e: 'c' } : { e: f.items[k].e, n: f.items[k].n.trim() }; });
  var datos = { id: f.id, tipo: 'pre', fecha: V.ahoraLima(), inicio: f.inicio, lugar: f.lugar, km: Number(f.km), motivo: f.motivo || 'ruta', excursion_id: f.motivo === 'excursion' ? f.viaje : null,
    salida_prevista: f.motivo === 'excursion' ? null : f.salida, plantilla: PL.version, items: items, fotos: f.fotos };
  var alaCola = function () {
    datos._aptitud = n.apt;
    var raz = docsVencidos().map(function (x) { return x.nombre + ' vencido'; }).concat(ORDEN.filter(function (k) { return items[k].e === 'f' && ITEMS[k].prioridad === 'C'; }).map(function (k) { return 'Falla crítica: ' + ITEMS[k].nombre; }));
    return V.encolarOp({ tipo: 'chk.crear', datos: datos }).then(function () { terminar({ cola: true, aptitud: n.apt, conformes: n.c, observaciones: n.o, fallas: n.f, razones: raz }, datos); });
  };
  var p = navigator.onLine ? api('/api/flota/inspecciones', { method: 'POST', body: datos }).then(function (r) {
    if (r.ok) return terminar(r.data, datos);
    if (r.codigo === 'RED') return alaCola();
    $('er').textContent = r.error; $('ok').disabled = false;
  }) : alaCola();
  p.then(function () { enviando = false; }, function (e) { enviando = false; if ($('er')) { $('er').textContent = 'No se pudo guardar: ' + (e.message || e); $('ok').disabled = false; } });
}
function terminar(res, datos) {
  if (V.hoja().open) V.hoja().close();
  document.body.classList.remove('en-chk');
  return borrarBorrador().then(function () {
    U.res = Object.assign({}, res, { tipo: datos.tipo, fecha: datos.fecha, lugar: datos.lugar, km: datos.km, items: datos.items, excursion_id: datos.excursion_id });
    if (res.cola && datos.salida_prevista) U.res.min_antes = Math.round((Date.parse(datos.salida_prevista.replace(' ', 'T').slice(0, 16) + ':00-05:00') - Date.parse(String(datos.inicio).replace(' ', 'T').slice(0, 19) + '-05:00')) / 60000);
    U.f = null; U.modo = 'resultado'; window.scrollTo(0, 0); pintarResultado();
    if (!res.cola) cargar();
  });
}
function textoWa(r) {
  var a = APT[r.aptitud] || APT.obs, L = function (e) { return ORDEN.filter(function (k) { return r.items && r.items[k] && r.items[k].e === e; }).map(function (k) { return '• ' + ITEMS[k].nombre + (r.items[k].n ? ': ' + r.items[k].n : ''); }); };
  var fl = L('f'), ob = L('o');
  return '🚐 *Checklist de ' + (r.tipo === 'pre' ? 'salida' : 'llegada') + ' · ' + placaFmt((U.d || {}).placa || '') + '*\n' + diaHora(r.fecha) + ' · ' + r.lugar + ' · ' + km(r.km) + '\n' +
    'Resultado: *' + a.corto.toUpperCase() + '*\n✅ ' + r.conformes + ' · ⚠️ ' + r.observaciones + ' · ❌ ' + r.fallas + '\n' +
    (fl.length ? '\nFallas:\n' + fl.join('\n') + '\n' : '') + (ob.length ? '\nObservaciones:\n' + ob.join('\n') + '\n' : '') +
    '\nConductor: ' + S.yo.nombre + '\nVilla Azul · Turismo & Excursiones';
}
function pintarResultado() {
  var r = U.res; if (!r) { U.modo = null; return vista(); }
  var a = APT[r.aptitud] || APT.obs;
  var msj = r.cola ? 'Guardado en el teléfono. Se enviará solo cuando vuelva la señal y el sistema confirmará el resultado.'
    : r.aptitud === 'no' ? 'La unidad no debe salir así. Ya avisamos a los administradores.'
    : r.aptitud === 'fallas' ? 'Las fallas quedaron registradas para repararlas. Si sales, hazlo con precaución.'
    : r.aptitud === 'obs' ? 'Las observaciones quedaron registradas. Puedes continuar.'
    : 'Todo en orden. ¡Buen viaje!';
  var ven = ((U.d || {}).parametros || {}).chk_ventana_min || 60;
  var ant = ((U.d || {}).parametros || {}).chk_anticipacion_min; if (ant === undefined || ant === null) ant = 30;
  var tiempo = r.min_antes === null || r.min_antes === undefined ? '' : r.min_antes >= ant - 5 && r.min_antes <= ven + 10 ? '<p class="u-nota ok">' + V.ico('check') + ' Hecho ' + durMin(r.min_antes) + ' antes de salir: a tiempo.</p>'
    : r.min_antes >= 0 ? '<p class="u-nota bad">Hecho solo ' + durMin(r.min_antes) + ' antes de salir (debía ser al menos ' + ant + ' min).</p>' : '<p class="u-nota bad">Hecho ' + durMin(-r.min_antes) + ' después de la hora de salida prevista.</p>';
  var h = '<section class="u-final v-' + a.c + ' entrar"><span class="u-final-i">' + (r.aptitud === 'no' ? ic('x') : r.aptitud === 'apto' ? V.ico('check') : ic('exc')) + '</span>' +
    '<small>Checklist de salida · ' + esc(diaHora(r.fecha)) + ' · ' + esc(r.lugar) + ' · ' + km(r.km) + '</small><h2>' + a.t + '</h2><p>' + esc(msj) + '</p>' + tiempo +
    '<div class="u-cuenta grande num"><i class="ok">' + V.ico('check') + r.conformes + '</i><i class="warn">' + ic('exc') + r.observaciones + '</i><i class="bad">' + ic('x') + r.fallas + '</i></div>' +
    ((r.razones || []).length ? '<ul class="u-razones">' + r.razones.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
    (r.km_alerta ? '<p class="u-nota">El kilometraje no cuadra con el último registrado: un administrador lo revisará.</p>' : '') +
    (r.resueltas ? '<p class="u-nota">' + plural(r.resueltas, 'novedad quedó cerrada', 'novedades quedaron cerradas') + ' porque ahora está bien.</p>' : '') +
    '</section><div class="acciones"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(textoWa(r)) + '">' + ic('compartir') + 'Compartir por WhatsApp</a><button type="button" class="btn sec" id="uok">Volver a la unidad</button></div>';
  $('vista').innerHTML = h;
  $('uok').onclick = function () { U.modo = null; U.res = null; vista(); window.scrollTo(0, 0); };
}

/* ════════════ Inspecciones (administración) ════════════ */
U.fi = U.fi || { f: 'todas', dias: 30 };
function tabInspecciones() {
  var F = [['todas', 'Todas'], ['revisar', 'Por revisar'], ['no', 'No aptas'], ['fallas', 'Con fallas'], ['pre', 'Salidas'], ['post', 'Llegadas (v7.2)']];
  var h = '<div class="chips" role="group" aria-label="Filtro">' + F.map(function (x) { return '<button type="button" class="chip" data-fi="' + x[0] + '" aria-pressed="' + (U.fi.f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="seg u-seg4" role="group" aria-label="Periodo" style="margin-top:10px">' + [[7, '7 días'], [30, '30 días'], [90, '90 días'], [365, '1 año']].map(function (x) { return '<button type="button" data-fd="' + x[0] + '" aria-pressed="' + (U.fi.dias === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div id="uil" style="margin-top:12px"><p class="vacio">Cargando…</p></div>' +
    '<div class="card u-impv7"><div>' + ic('doc') + '<span><b>Historial de la app v7.2</b><small>Importa el Excel de Google Sheets: checklists, mantenimientos y documentos. No duplica.</small></span></div><button type="button" class="btn-mini" id="uimpv7">Importar Excel</button></div>';
  $('upanel').innerHTML = h;
  $('uimpv7').onclick = hojaImportarV7;
  $('upanel').querySelectorAll('[data-fi]').forEach(function (b) { b.onclick = function () { U.fi.f = b.getAttribute('data-fi'); tabInspecciones(); }; });
  $('upanel').querySelectorAll('[data-fd]').forEach(function (b) { b.onclick = function () { U.fi.dias = +b.getAttribute('data-fd'); tabInspecciones(); }; });
  if (!navigator.onLine) { $('uil').innerHTML = vacio('El historial completo se carga con señal.') + '<div class="card u-lista">' + (U.d.inspecciones || []).map(function (x) { return filaInsp(x); }).join('') + '</div>'; enlazarComunes($('uil')); return; }
  var q = '?desde=' + sumar(V.hoyLima(), -(U.fi.dias - 1)) + (U.fi.f === 'revisar' ? '&revisar=1' : U.fi.f === 'no' || U.fi.f === 'fallas' ? '&aptitud=' + U.fi.f : U.fi.f === 'pre' || U.fi.f === 'post' ? '&tipo=' + U.fi.f : '') + '&limite=150';
  api('/api/flota/inspecciones' + q).then(function (r) {
    if (!$('uil')) return;
    if (!r.ok) { $('uil').innerHTML = vacio(esc(r.error)); return; }
    var L = r.data.inspecciones;
    $('uil').innerHTML = '<p class="ayuda" style="margin-top:0">' + plural(L.length, 'checklist', 'checklists') + (r.data.mas ? ' · mostrando los 150 más recientes' : '') + '</p>' + (L.length ? '<div class="card u-lista">' + L.map(function (x) { return filaInsp(x); }).join('') + '</div>' : vacio('Nada con este filtro.'));
    enlazarComunes($('uil'));
  });
}
function hojaInspeccion(id) {
  V.abrirHoja('<h2 id="hoja-t">Checklist</h2><div id="uhi"><p class="vacio">Cargando…</p></div>');
  api('/api/flota/inspecciones/' + id).then(function (r) {
    var el = $('uhi'); if (!el) return;
    if (!r.ok) { el.innerHTML = '<p class="vacio">' + esc(r.codigo === 'RED' ? 'El detalle se abre con señal.' : r.error) + '</p><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>'; V.hoja().querySelectorAll('[data-cerrar]').forEach(function (b) { b.onclick = function () { V.hoja().close(); }; }); return; }
    var x = r.data, a = APT[x.aptitud] || APT.obs;
    var porCat = {}; ORDEN.forEach(function (k) { var it = x.items[k]; if (!it) return; (porCat[ITEMS[k].cat] = porCat[ITEMS[k].cat] || []).push(k); });
    var hall = function (e, t) { var L = ORDEN.filter(function (k) { return x.items[k] && x.items[k].e === e; }); return L.length ? '<span class="etq">' + t + ' (' + L.length + ')</span><ul class="u-hall">' + L.map(function (k) { return '<li>' + sev(ITEMS[k].prioridad) + '<span><b>' + esc(ITEMS[k].nombre) + '</b><small>' + esc(x.items[k].n || '') + '</small>' + (x.fotos[k] ? '<button type="button" class="btn-mini" data-ufo="' + esc(x.fotos[k]) + '">' + ic('camara') + ' Ver foto</button>' : '') + '</span></li>'; }).join('') + '</ul>' : ''; };
    var h = '<div class="u-res-mini v-' + a.c + '"><b>' + (x.tipo === 'pre' ? 'Checklist de salida' : 'Llegada (v7.2)') + ' · ' + a.t + '</b>' + (x.razones.length ? '<small>' + esc(x.razones.join(' · ')) + '</small>' : '') + '</div>' +
      (x.estado === 'anulada' ? '<p class="u-nota bad">Anulado por ' + esc(x.anulado_por) + ': ' + esc(x.motivo_anulacion) + '</p>' : '') +
      '<dl class="ficha"><dt>Fecha</dt><dd>' + esc(diaHora(x.fecha)) + '</dd><dt>Conductor</dt><dd>' + esc(x.operador) + '</dd><dt>Lugar</dt><dd>' + esc(x.lugar) + '</dd>' +
      '<dt>Kilometraje</dt><dd class="num">' + km(x.km) + (x.km_alerta ? ' <span class="u-flag warn">' + (x.km_alerta === 'salto' ? 'salto dudoso' : 'menor al anterior') + '</span>' : '') + '</dd>' +
      (x.titulo_exc ? '<dt>Excursión</dt><dd>' + esc(x.titulo_exc) + '</dd>' : '<dt>Viaje</dt><dd>' + (x.motivo === 'ruta' ? 'Ruta Angasmarca ⇄ Trujillo' : 'Otro viaje') + '</dd>') +
      (x.par ? '<dt>' + (x.tipo === 'post' ? 'Su salida' : 'Su llegada') + '</dt><dd>' + esc(diaHora(x.par.fecha)) + ' · ' + APT[x.par.aptitud].corto + (x.km_recorrido > 0 ? ' · ' + km(x.km_recorrido) + ' recorridos' : '') + '</dd>' : '') +
      (x.salida_prevista ? '<dt>Salida prevista</dt><dd>' + esc(diaHora(x.salida_prevista)) + (x.min_antes !== null && x.origen !== 'v7' ? ' · ' + (x.min_antes >= 0 ? 'hecho ' + durMin(x.min_antes) + ' antes' : 'hecho ' + durMin(-x.min_antes) + ' tarde') + (x.a_tiempo === 1 ? ' <span class="u-flag ok">a tiempo</span>' : x.a_tiempo === 0 ? ' <span class="u-flag warn">fuera de hora</span>' : '') : '') + '</dd>' : '') +
      (x.origen === 'v7' ? '<dt>Origen</dt><dd>Importado de la app v7.2</dd>' : '') +
      '<dt>Tiempo</dt><dd>' + durTxt(x.duracion_seg) + (x.duracion_seg && x.duracion_seg < 180 ? ' <span class="u-flag">exprés</span>' : '') + '</dd>' +
      '<dt>Revisión</dt><dd>' + (x.revisado_por ? 'Revisado por ' + esc(x.revisado_por) + ' · ' + esc(diaHora(x.revisado_en)) : 'Sin revisar') + '</dd></dl>' +
      hall('f', 'Fallas') + hall('o', 'Observaciones') +
      '<details class="u-det"><summary>Ver los ' + ORDEN.length + ' ítems</summary>' + PL.categorias.map(function (c) { return '<p class="u-det-c">' + esc(c.nombre) + '</p><ul>' + (porCat[c.id] || []).map(function (k) { var e = x.items[k].e; return '<li class="e-' + e + '"><i>' + (e === 'c' ? '✓' : e === 'o' ? '!' : '✕') + '</i>' + esc(ITEMS[k].nombre) + '</li>'; }).join('') + '</ul>'; }).join('') + '</details>';
    var acc = '';
    if (mando() && x.estado === 'activa') {
      if (x.km_alerta) acc += '<div class="u-kmfix"><p class="ayuda" style="margin-top:0">El odómetro no cuadra. Si el número es correcto, valídalo; si no, corrígelo para que el mantenimiento se calcule bien.</p><div class="campo"><label for="ukmc">Kilometraje correcto</label><input id="ukmc" inputmode="numeric" class="num" value="' + x.km + '"></div><div class="botones" style="margin-top:8px"><button type="button" class="btn-mini" id="ukmv">Es correcto: validar</button><button type="button" class="btn-mini" id="ukmg">Guardar corrección</button></div></div>';
      if (!x.revisado_por) acc += '<button type="button" class="btn ancho" id="urev">' + V.ico('check') + 'Marcar como revisado</button>';
      acc += '<button type="button" class="btn sec ancho" id="uanu" style="color:var(--bad)">Anular este checklist</button>';
    }
    x.items && (x.conformes !== undefined) && (acc += '<a class="btn sec ancho" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(textoWa(x)) + '">' + ic('compartir') + 'Compartir por WhatsApp</a>');
    el.innerHTML = h + '<p class="error" id="er" role="alert"></p><div class="acciones">' + acc + '<button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
    var H = V.hoja();
    H.querySelectorAll('[data-cerrar]').forEach(function (b) { b.onclick = function () { H.close(); }; });
    H.querySelectorAll('[data-ufo]').forEach(function (b) { b.onclick = function () { var u = b.getAttribute('data-ufo'); b.disabled = true; imagen(u).then(function (src) { var img = document.createElement('img'); img.src = src; img.className = 'u-ev'; b.replaceWith(img); }, function (e) { toast(e.message, true); b.disabled = false; }); }; });
    var post = function (ruta, body, ok) { api(ruta, { method: 'POST', body: body }).then(function (r) { if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión.' : r.error; return; } H.close(); toast(ok); refrescar(); }); };
    if ($('urev')) $('urev').onclick = function () { post('/api/flota/inspecciones/' + id + '/revisar', {}, 'Checklist revisado'); };
    if ($('ukmv')) $('ukmv').onclick = function () { post('/api/flota/inspecciones/' + id + '/revisar', { km_valido: true }, 'Kilometraje validado'); };
    if ($('ukmg')) $('ukmg').onclick = function () { post('/api/flota/inspecciones/' + id + '/revisar', { km_corregido: $('ukmc').value }, 'Kilometraje corregido'); };
    if ($('uanu')) $('uanu').onclick = function () { var m = prompt('¿Por qué se anula? (queda registrado)\n\nLas novedades que abrió siguen abiertas: ciérralas en Novedades si no correspondían.'); if (m === null) return; post('/api/flota/inspecciones/' + id + '/anular', { motivo: m }, 'Checklist anulado'); };
  });
}
function refrescar() { U.cache = {}; cargar().then(function () { pintarSi(pintar); }); }

/* ════════════ Novedades: abierta → en reparación → resuelta ════════════ */
U.fn = U.fn || 'abiertas';
U.sel = U.sel || {};
function tabNovedades() {
  var F = [['abiertas', 'Por regularizar'], ['vencidas', 'Plazo vencido'], ['reparacion', 'En reparación'], ['resueltas', 'Resueltas'], ['todas', 'Todas']];
  var h = '<div class="u-flujo" aria-label="Cómo avanza una novedad"><span><b>Abierta</b><small>la reporta un checklist</small></span><i></i><span><b>En reparación</b><small>con fecha compromiso</small></span><i></i><span><b>Resuelta</b><small>checklist, taller o a mano</small></span></div>' +
    '<p class="ayuda">Plazo para regularizar: crítico 2 días, alto 7, medio 15 y bajo 30. Una observación en un ítem <b>crítico</b> con el plazo vencido deja la unidad <b>NO APTA</b> hasta resolverla o fijar un compromiso.</p>' +
    '<div class="chips" role="group" aria-label="Mostrar" style="margin-top:10px">' + F.map(function (x) { return '<button type="button" class="chip" data-fn="' + x[0] + '" aria-pressed="' + (U.fn === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="u-selbar"><button type="button" class="btn-mini" id="usel">' + (U.selModo ? 'Terminar selección' : 'Seleccionar varias') + '</button>' + (U.selModo ? '<button type="button" class="btn-mini" id="useltodo">Todas</button>' : '') + '</div>' +
    '<div id="unl" style="margin-top:8px"></div><div id="ulote"></div>';
  $('upanel').innerHTML = h;
  $('upanel').querySelectorAll('[data-fn]').forEach(function (b) { b.onclick = function () { U.fn = b.getAttribute('data-fn'); U.sel = {}; tabNovedades(); }; });
  $('usel').onclick = function () { U.selModo = !U.selModo; U.sel = {}; tabNovedades(); };
  if ($('useltodo')) $('useltodo').onclick = function () { (U.novL || []).forEach(function (n) { if (n.estado !== 'resuelta') U.sel[n.id] = 1; }); pintarL(U.novL || []); };
  var pintarL = function (L) {
    if (!$('unl')) return; U.novL = L;
    $('unl').innerHTML = L.length ? '<div class="card u-lista">' + L.map(function (n) { return filaNovedad(n, !!U.sel[n.id]); }).join('') + '</div>' : vacio(U.fn === 'abiertas' ? 'Nada por regularizar: la unidad está conforme.' : U.fn === 'vencidas' ? 'Ninguna novedad con el plazo vencido.' : 'Nada por aquí todavía.');
    $('unl').querySelectorAll('[data-nov]').forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-nov'); if (U.selModo) { if (U.sel[id]) delete U.sel[id]; else U.sel[id] = 1; pintarL(U.novL); } else hojaNovedad(id); }; });
    var n = Object.keys(U.sel).length;
    $('ulote').innerHTML = U.selModo ? '<div class="u-lotebar"><b>' + plural(n, 'seleccionada', 'seleccionadas') + '</b><button type="button" class="btn-mini" data-lote="resolver"' + (n ? '' : ' disabled') + '>' + V.ico('check') + ' Resueltas</button><button type="button" class="btn-mini" data-lote="reparacion"' + (n ? '' : ' disabled') + '>' + ic('llave') + ' En reparación</button><button type="button" class="btn-mini" data-lote="plazo"' + (n ? '' : ' disabled') + '>' + ic('reloj') + ' Compromiso</button></div>' : '';
    $('ulote').querySelectorAll('[data-lote]').forEach(function (b) { b.onclick = function () { hojaLote(b.getAttribute('data-lote')); }; });
  };
  if (U.fn === 'abiertas' && !navigator.onLine) return pintarL(U.d.novedades || []);
  $('unl').innerHTML = '<p class="vacio">Cargando…</p>';
  api('/api/flota/novedades?estado=' + U.fn).then(function (r) { if (r.ok) pintarL(r.data.novedades); else if (r.codigo === 'RED') pintarL(U.d.novedades || []); else if ($('unl')) $('unl').innerHTML = vacio(esc(r.error)); });
}
function hojaLote(acc) {
  var ids = Object.keys(U.sel), t = { resolver: 'Marcar como resueltas', reparacion: 'Mandar a reparación', plazo: 'Fijar fecha de compromiso' }[acc];
  var h = '<h2 id="hoja-t">' + t + '</h2><p class="desc">' + plural(ids.length, 'novedad', 'novedades') + ': ' + esc((U.novL || []).filter(function (n) { return U.sel[n.id]; }).map(function (n) { return n.nombre; }).slice(0, 5).join(' · ')) + (ids.length > 5 ? '…' : '') + '</p>' +
    (acc !== 'plazo' ? '<div class="campo"><label for="uln">' + (acc === 'resolver' ? '¿Cómo se regularizaron?' : '¿Dónde o quién las repara?') + '</label><textarea id="uln" rows="2" maxlength="200" placeholder="' + (acc === 'resolver' ? 'Ej. Compramos el kit de emergencia completo' : 'Ej. Taller eléctrico en Trujillo') + '"></textarea></div>' : '') +
    (acc !== 'resolver' ? '<div class="campo"><label for="ulc">Fecha de compromiso</label><input id="ulc" type="date" min="' + V.hoyLima() + '" value="' + sumar(V.hoyLima(), 7) + '"></div><p class="ayuda">Hasta esa fecha la novedad no cuenta como vencida.</p>' : '') +
    V.botonesHoja('Guardar');
  V.abrirHoja(h);
  $('ok').onclick = function () {
    $('ok').disabled = true;
    api('/api/flota/novedades/lote', { method: 'POST', body: { ids: ids, accion: acc, nota: $('uln') ? $('uln').value : '', compromiso: $('ulc') ? $('ulc').value : null } }).then(function (r) {
      $('ok').disabled = false; if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión.' : r.error; return; }
      V.hoja().close(); toast(plural(r.data.cambiadas, 'novedad actualizada', 'novedades actualizadas')); U.sel = {}; U.selModo = false; refrescar();
    });
  };
}
function hojaNovedad(id) {
  if (!mando()) return hojaNovedadLectura(id);
  var n = (U.novL || []).concat(U.d.novedades || []).filter(function (x) { return x.id === id; })[0]; if (!n) return;
  var h = '<h2 id="hoja-t">' + esc(n.nombre) + '</h2><p class="desc">' + esc(n.categoria) + ' · ' + sev(n.prioridad) + ' · ' + NIVEL_NOV[n.nivel] + '</p>' + plazoTxt(n) +
    (n.escalada ? '<p class="u-nota bad">Observación en un ítem crítico con el plazo vencido: la unidad está NO APTA hasta regularizarla o fijar una fecha de compromiso.</p>' : '') +
    '<ol class="u-pasos"><li class="hecho"><b>Abierta</b><small>' + esc(diaHora(n.abierta_en)) + (n.reincide || n.reincide_de ? ' · vuelve a fallar tras una reparación' : '') + '</small></li>' +
    '<li class="' + (n.estado !== 'abierta' ? 'hecho' : '') + '"><b>En reparación</b><small>' + (n.taller_nota ? esc(n.taller_nota) + (n.taller_por ? ' · ' + esc(n.taller_por) : '') : 'Aún no') + (n.compromiso ? ' · compromiso ' + esc(dia(n.compromiso)) : '') + '</small></li>' +
    '<li class="' + (n.estado === 'resuelta' ? 'hecho' : '') + '"><b>Resuelta</b><small>' + (n.estado === 'resuelta' ? esc(diaHora(n.resuelta_en)) + ' ' + (COMO[n.resuelta_como] || '') + (n.resuelta_nota ? ' · ' + esc(n.resuelta_nota) : '') : 'Pendiente') + '</small></li></ol>' +
    '<dl class="ficha"><dt>Reportes</dt><dd>' + n.veces + '</dd><dt>Días abierta</dt><dd>' + n.dias_abierta + '</dd>' + (n.plazo && n.estado !== 'resuelta' ? '<dt>Plazo</dt><dd>' + esc(dia(n.plazo)) + '</dd>' : '') + (n.ultima_nota ? '<dt>Última nota</dt><dd>' + esc(n.ultima_nota) + '</dd>' : '') + '</dl>' +
    (n.foto_id ? '<button type="button" class="btn-mini" id="unf">' + ic('camara') + ' Ver foto</button>' : '');
  if (n.estado !== 'resuelta') h += '<div class="campo"><label for="unn">Nota</label><textarea id="unn" rows="2" maxlength="200" placeholder="Taller, repuesto, quién la ve…"></textarea></div>' +
    '<div class="campo"><label for="unc">Fecha de compromiso <small style="font-weight:500;color:var(--muted)">(opcional)</small></label><input id="unc" type="date" min="' + V.hoyLima() + '" value="' + esc(n.compromiso && n.compromiso >= V.hoyLima() ? n.compromiso : '') + '"></div>';
  h += '<p class="error" id="er" role="alert"></p><div class="acciones">' +
    (n.estado === 'abierta' ? '<button type="button" class="btn ancho" data-na="reparacion">' + ic('llave') + 'Mandar a reparación</button>' : '') +
    (n.estado !== 'resuelta' ? '<button type="button" class="btn ' + (n.estado === 'abierta' ? 'sec ' : '') + 'ancho" data-na="resolver">' + V.ico('check') + 'Marcar resuelta</button><button type="button" class="btn sec ancho" data-na="plazo">' + ic('reloj') + 'Solo fijar el compromiso</button><button type="button" class="btn sec ancho" id="unm">Registrar el mantenimiento que la resuelve</button>' : '<button type="button" class="btn sec ancho" data-na="reabrir">Reabrir</button>') +
    '<button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>';
  V.abrirHoja(h);
  var H = V.hoja();
  if ($('unf')) $('unf').onclick = function () { verArchivo(n.foto_id, n.nombre); };
  if ($('unm')) $('unm').onclick = function () { formMant([n.id]); };
  H.querySelectorAll('[data-na]').forEach(function (b) {
    b.onclick = function () {
      var acc = b.getAttribute('data-na'), nota = $('unn') ? $('unn').value.trim() : '', comp = $('unc') ? $('unc').value : '';
      if ((acc === 'reparacion' || acc === 'resolver') && nota.length < 3) { $('er').textContent = acc === 'reparacion' ? 'Escribe dónde o quién la repara.' : 'Escribe cómo se resolvió.'; $('unn').focus(); return; }
      if (acc === 'plazo' && !comp) { $('er').textContent = 'Elige la fecha de compromiso.'; $('unc').focus(); return; }
      b.disabled = true;
      api('/api/flota/novedades/' + id, { method: 'POST', body: { accion: acc, nota: nota, compromiso: comp || null } }).then(function (r) { b.disabled = false; if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión.' : r.error; return; } H.close(); toast({ reparacion: 'Novedad en reparación', resolver: 'Novedad resuelta', reabrir: 'Novedad reabierta', plazo: 'Compromiso guardado' }[acc]); refrescar(); });
    };
  });
}

/* ════════════ Documentos ════════════ */
function tabDocumentos() {
  var d = U.d;
  var h = '<p class="ayuda" style="margin-top:0">Jorge los ve en su teléfono, también sin señal, para mostrarlos en un control. Avisamos a todo el equipo a los ' + d.parametros.docs_aviso_dias + ', 15, 7 y 1 día del vencimiento.</p>';
  h += (d.documentos || []).length ? '<div class="u-docs">' + d.documentos.map(tarjetaDoc).join('') + '</div>' : '';
  if ((d.documentos_faltan || []).length) h += '<div class="titulo-sec"><h3>Sin cargar</h3></div><div class="u-faltan">' + d.documentos_faltan.map(function (x) { return '<button type="button" class="u-falta" data-rdoc="' + esc(x.tipo) + '">' + ic('doc') + '<span><b>' + esc(x.nombre) + '</b><small>' + (x.bloquea ? 'Obligatorio para salir' : 'Recomendado') + '</small></span>' + V.ico('mas') + '</button>'; }).join('') + '</div>';
  h += '<div class="botones" style="margin-top:14px"><button type="button" class="btn sec" data-rdoc="otro">' + V.ico('mas') + 'Otro documento</button><button type="button" class="btn sec" id="udh">Historial de renovaciones</button></div>';
  $('upanel').innerHTML = '<div class="entrar">' + h + '</div>';
  enlazarComunes($('upanel'));
  $('udh').onclick = function () {
    V.abrirHoja('<h2 id="hoja-t">Historial de documentos</h2><div id="udhl"><p class="vacio">Cargando…</p></div><div class="acciones"><button type="button" class="btn sec ancho" data-cerrar>Cerrar</button></div>');
    api('/api/flota/docs').then(function (r) { if (!$('udhl')) return; if (!r.ok) { $('udhl').innerHTML = '<p class="vacio">' + esc(r.error) + '</p>'; return; }
      $('udhl').innerHTML = '<ul class="lista hist">' + r.data.documentos.map(function (x) { return '<li><span><b>' + esc(x.nombre) + '</b> ' + esc(x.numero || '') + (x.vigente ? ' <span class="u-pill ok">Vigente</span>' : '') + '</span><span>' + (x.vencimiento ? 'hasta ' + esc(dia(x.vencimiento)) : '—') + '</span></li>'; }).join('') + '</ul>'; });
  };
}
function formDoc(tipo, x) {
  var t = DOCS[tipo] || DOCS.otro, e = !!x, v = function (k) { return esc(x && x[k] != null ? x[k] : ''); };
  var h = '<h2 id="hoja-t">' + (e ? 'Corregir: ' + esc(x.nombre) : (x === null && (U.d.documentos || []).some(function (y) { return y.tipo === tipo; }) && tipo !== 'otro' ? 'Renovar: ' : 'Cargar: ') + esc(t.n)) + '</h2>' +
    '<p class="desc">' + (e ? 'Corrige un dato mal escrito. Para un documento nuevo usa «Renovar»: el anterior queda en el historial.' : 'El anterior del mismo tipo pasa al historial.') + '</p>' +
    (tipo === 'otro' ? '<div class="campo"><label for="udt">Nombre del documento</label><input id="udt" maxlength="60" value="' + v('titulo') + '"></div>' : '') +
    '<div class="dos"><div class="campo"><label for="udn">' + t.num + '</label><input id="udn" maxlength="40" value="' + v('numero') + '"></div><div class="campo"><label for="ude">' + t.ent + '</label><input id="ude" maxlength="60" value="' + v('entidad') + '"></div></div>' +
    '<div class="dos"><div class="campo"><label for="udem">' + t.em + '</label><input id="udem" type="date" value="' + v('emision') + '"></div>' + (t.ven ? '<div class="campo"><label for="udv">' + t.ven + '</label><input id="udv" type="date" value="' + v('vencimiento') + '"></div>' : '<div></div>') + '</div>' +
    t.extra.map(function (z) { return '<div class="campo"><label for="ux-' + z[0] + '">' + z[1] + '</label><input id="ux-' + z[0] + '"' + (z[2] ? ' type="' + z[2] + '"' : ' maxlength="80"') + ' value="' + esc(x && x.datos && x.datos[z[0]] || '') + '"></div>'; }).join('') +
    '<div class="campo"><label for="udf">Foto o PDF del documento <small style="font-weight:500;color:var(--muted)">(se ve sin señal en el teléfono de Jorge)</small></label><input id="udf" type="file" accept="image/*,application/pdf"></div><img id="udp" class="previa oculto" alt="Vista previa">' +
    (e && x.foto_id ? '<label class="u-check"><input type="checkbox" id="udq"> Quitar la foto actual</label>' : '') +
    '<div class="campo"><label for="udo">Notas</label><input id="udo" maxlength="200" value="' + v('notas') + '"></div>' + V.botonesHoja(e ? 'Guardar corrección' : 'Guardar documento');
  V.abrirHoja(h);
  var foto = null;
  $('udf').onchange = function () { var f = this.files[0]; if (!f) { foto = null; return; } $('ok').disabled = true; V.comprimirFoto(f).then(function (z) { foto = z; if (z.mime !== 'application/pdf') { $('udp').src = 'data:' + z.mime + ';base64,' + z.data; $('udp').classList.remove('oculto'); } $('ok').disabled = false; }, function (er) { toast(er.message, true); $('ok').disabled = false; }); };
  $('ok').onclick = function () {
    var datos = {}; t.extra.forEach(function (z) { datos[z[0]] = $('ux-' + z[0]).value; });
    var b = { tipo: tipo, titulo: $('udt') ? $('udt').value : undefined, numero: $('udn').value, entidad: $('ude').value, emision: $('udem').value, vencimiento: $('udv') ? $('udv').value : '', datos: datos, notas: $('udo').value, foto: foto, quitar_foto: $('udq') && $('udq').checked };
    $('ok').disabled = true;
    api('/api/flota/docs' + (e ? '/' + x.id : ''), { method: e ? 'PATCH' : 'POST', body: b }).then(function (r) {
      $('ok').disabled = false;
      if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión: los documentos se cargan con señal.' : r.error; return; }
      V.hoja().close(); toast(e ? 'Documento corregido' : 'Documento guardado'); refrescar();
    });
  };
}

/* ════════════ Mantenimiento ════════════ */
function tabMantenimiento() {
  var d = U.d, mt = d.mantenimiento, p = d.parametros;
  var h = barrasMant(mt, true);
  if (mt && mt.estado) h += '<button type="button" class="btn ancho" data-mant="nuevo" style="margin-top:12px">' + ic('llave') + 'Registrar servicio o reparación</button>';
  h += '<div class="titulo-sec"><h3>Historial</h3></div><div class="card u-lista">' + ((mt.historial || []).length ? mt.historial.map(function (m) {
    return '<div class="u-mfila"><span class="u-insp-t ' + (m.tipo === 'correctivo' ? 'post' : 'pre') + '">' + (m.tipo === 'correctivo' ? 'REP' : 'MANT') + '</span><span class="u-insp-c"><b>' + esc(dia(m.fecha)) + ' · ' + km(m.km) + '</b><small>' + esc(m.taller || '') + (m.detalle ? ' · ' + esc(m.detalle) : '') + '</small></span>' +
      '<span class="u-mder num">' + (m.costo !== null && m.costo !== undefined ? V.soles(m.costo) : '') + (m.foto_id ? '<button type="button" class="btn-mini" data-mf="' + esc(m.foto_id) + '">' + ic('camara') + '</button>' : '') + '<button type="button" class="btn-mini" data-ma="' + esc(m.id) + '" aria-label="Anular">' + V.ico('basura') + '</button></span></div>';
  }).join('') : '<p class="vacio">Sin registros.</p>') + '</div>';
  h += '<div class="titulo-sec"><h3>Reglas de la unidad</h3></div><div class="card"><div class="dos">' +
    '<div class="campo"><label for="upi">Servicio cada (km)</label><input id="upi" inputmode="numeric" class="num" value="' + p.mant_intervalo_km + '"></div>' +
    '<div class="campo"><label for="upd">o cada (días)</label><input id="upd" inputmode="numeric" class="num" value="' + p.mant_intervalo_dias + '"></div>' +
    '<div class="campo"><label for="upa">Avisar faltando (km)</label><input id="upa" inputmode="numeric" class="num" value="' + p.mant_alerta_km + '"></div>' +
    '<div class="campo"><label for="upv">Avisar documentos con (días)</label><input id="upv" inputmode="numeric" class="num" value="' + p.docs_aviso_dias + '"></div></div>' +
    '<div class="dos"><div class="campo"><label for="upx">Checklist para salir de excursión</label><select id="upx"><option value="1"' + (p.chk_exige_salida ? ' selected' : '') + '>Obligatorio</option><option value="0"' + (p.chk_exige_salida ? '' : ' selected') + '>Solo avisar</option></select></div>' +
    '<div class="campo"><label for="uph">Se abre antes de salir (min)</label><input id="uph" inputmode="numeric" class="num" value="' + p.chk_ventana_min + '"></div>' +
    '<div class="campo"><label for="upn">Listo al menos (min antes)</label><input id="upn" inputmode="numeric" class="num" value="' + (p.chk_anticipacion_min === undefined ? 30 : p.chk_anticipacion_min) + '"></div><div></div></div>' +
    '<label class="u-check"><input type="checkbox" id="upe"' + (p.nov_escalar ? ' checked' : '') + '> Una observación en un ítem crítico con el plazo vencido deja la unidad NO APTA</label>' +
    '<p class="ayuda">El checklist se hace entre 1 hora y 30 min antes de salir (configurable). Obligatorio: la excursión pasa a «En ruta» solo con un checklist apto de esa ventana (más 30 min de tolerancia por demoras).</p>' +
    '<p class="ayuda">Si falta o salió «No apta», un administrador puede salir igual dejando el motivo: queda registrado y avisa al equipo.</p>' +
    '<button type="button" class="btn sec ancho" id="upg" style="margin-top:12px">Guardar reglas</button></div>';
  $('upanel').innerHTML = '<div class="entrar">' + h + '</div>';
  enlazarComunes($('upanel'));
  $('upanel').querySelectorAll('[data-mf]').forEach(function (b) { b.onclick = function () { verArchivo(b.getAttribute('data-mf'), 'Comprobante del servicio'); }; });
  $('upanel').querySelectorAll('[data-ma]').forEach(function (b) { b.onclick = function () { var m = prompt('¿Por qué se anula este registro?'); if (m === null) return; api('/api/flota/mant/' + b.getAttribute('data-ma') + '/anular', { method: 'POST', body: { motivo: m } }).then(function (r) { if (!r.ok) return toast(r.error, true); toast('Registro anulado'); refrescar(); }); }; });
  $('upg').onclick = function () {
    api('/api/flota/parametros', { method: 'POST', body: { mant_intervalo_km: $('upi').value, mant_intervalo_dias: $('upd').value, mant_alerta_km: $('upa').value, docs_aviso_dias: $('upv').value, chk_exige_salida: $('upx').value, chk_ventana_min: $('uph').value, chk_anticipacion_min: $('upn').value, nov_escalar: $('upe').checked ? 1 : 0 } })
      .then(function (r) { if (!r.ok) return toast(r.codigo === 'RED' ? 'Sin conexión' : r.error, true); toast('Reglas guardadas'); refrescar(); });
  };
}
function formMant(resolver) {
  var d = U.d, nov = d.novedades || [], sel = resolver || [];
  var h = '<h2 id="hoja-t">Registrar servicio</h2><p class="desc">El preventivo reinicia el conteo para el próximo servicio. La reparación cierra las novedades que marques.</p>' +
    '<div class="seg" role="group" aria-label="Tipo" style="margin-top:12px"><button type="button" data-mt="preventivo" aria-pressed="' + !resolver + '">Mantenimiento preventivo</button><button type="button" data-mt="correctivo" aria-pressed="' + !!resolver + '">Reparación</button></div>' +
    '<div class="dos"><div class="campo"><label for="umf">Fecha</label><input id="umf" type="date" value="' + V.hoyLima() + '" max="' + V.hoyLima() + '"></div><div class="campo"><label for="umk">Kilometraje</label><input id="umk" inputmode="numeric" class="num" value="' + (d.odometro.km || '') + '"></div></div>' +
    '<div class="campo"><label for="umt">Taller</label><input id="umt" maxlength="60" list="umtl" placeholder="Ej. Toyota Trujillo"><datalist id="umtl">' + (d.mantenimiento.historial || []).map(function (m) { return m.taller; }).filter(function (t, i, a) { return t && a.indexOf(t) === i; }).map(function (t) { return '<option value="' + esc(t) + '">'; }).join('') + '</datalist></div>' +
    '<div class="campo"><label for="umd">Qué se hizo</label><textarea id="umd" rows="2" maxlength="300" placeholder="Cambio de aceite y filtros, rotación de llantas…"></textarea></div>' +
    '<div class="dos"><div class="campo"><label for="umc">Costo (S/)</label><input id="umc" inputmode="decimal" class="num" placeholder="Opcional"></div><div class="campo"><label for="umr">Responsable</label><input id="umr" maxlength="40" value="' + esc(S.yo.nombre) + '"></div></div>' +
    '<p class="ayuda">El costo es referencial para los indicadores: el gasto se registra en caja como siempre.</p>' +
    (nov.length ? '<span class="etq">Novedades que resuelve</span><div class="u-checks">' + nov.map(function (n) { return '<label class="u-check"><input type="checkbox" data-mn="' + esc(n.id) + '"' + (sel.indexOf(n.id) >= 0 ? ' checked' : '') + '> ' + esc(n.nombre) + ' <small>' + NIVEL_NOV[n.nivel] + '</small></label>'; }).join('') + '</div>' : '') +
    '<div class="campo"><label for="umfo">Foto de la boleta u orden de trabajo</label><input id="umfo" type="file" accept="image/*,application/pdf"></div>' + V.botonesHoja('Guardar');
  V.abrirHoja(h);
  var tipo = resolver ? 'correctivo' : 'preventivo', foto = null, H = V.hoja();
  H.querySelectorAll('[data-mt]').forEach(function (b) { b.onclick = function () { tipo = b.getAttribute('data-mt'); H.querySelectorAll('[data-mt]').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
  $('umfo').onchange = function () { var f = this.files[0]; if (!f) { foto = null; return; } $('ok').disabled = true; V.comprimirFoto(f).then(function (z) { foto = z; $('ok').disabled = false; }, function (er) { toast(er.message, true); $('ok').disabled = false; }); };
  $('ok').onclick = function () {
    var ids = []; H.querySelectorAll('[data-mn]').forEach(function (c) { if (c.checked) ids.push(c.getAttribute('data-mn')); });
    $('ok').disabled = true;
    api('/api/flota/mant', { method: 'POST', body: { tipo: tipo, fecha: $('umf').value, km: $('umk').value, taller: $('umt').value, detalle: $('umd').value, costo: $('umc').value, responsable: $('umr').value, novedades: ids, foto: foto } }).then(function (r) {
      $('ok').disabled = false; if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión.' : r.error; return; }
      H.close(); toast(tipo === 'correctivo' ? 'Reparación registrada' : 'Mantenimiento registrado'); refrescar();
    });
  };
}

/* ════════════ Indicadores: cada cifra con su meta y su semáforo ════════════ */
U.idias = U.idias || 30;
function semaf(v, ok, warn, menorMejor) { if (v === null || v === undefined) return 'muted'; return menorMejor ? (v <= ok ? 'ok' : v <= warn ? 'warn' : 'bad') : (v >= ok ? 'ok' : v >= warn ? 'warn' : 'bad'); }
function kpiU(t, v, sub, meta, col) { return '<div class="kpi u-kpi k-' + col + '"><small>' + t + '</small><b class="num">' + v + '</b><span class="d">' + sub + '</span>' + (meta ? '<span class="u-meta">Meta: ' + meta + '</span>' : '') + '</div>'; }
function tabIndicadores() {
  var h = '<div class="seg u-seg4" role="group" aria-label="Periodo">' + [[7, '7 días'], [30, '30 días'], [90, '90 días'], [365, '1 año']].map(function (x) { return '<button type="button" data-id="' + x[0] + '" aria-pressed="' + (U.idias === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="uind" style="margin-top:12px"><p class="vacio">Calculando…</p></div>';
  $('upanel').innerHTML = h;
  $('upanel').querySelectorAll('[data-id]').forEach(function (b) { b.onclick = function () { U.idias = +b.getAttribute('data-id'); tabIndicadores(); }; });
  if (!navigator.onLine) { $('uind').innerHTML = vacio('Los indicadores se calculan con señal.'); return; }
  api('/api/flota/indicadores?dias=' + U.idias).then(function (r) { if (!$('uind')) return; if (!r.ok) { $('uind').innerHTML = vacio(esc(r.error)); return; } pintarIndicadores(r.data); });
}
function pintarIndicadores(x) {
  var c = x.cumplimiento, nv = x.novedades;
  var pu = x.puntualidad, rg = x.regularizar;
  var h = '<p class="ayuda" style="margin-top:0">Del ' + esc(dia(x.desde)) + ' al ' + esc(dia(x.hasta)) + ' · ' + plural(x.total, 'checklist de salida', 'checklists de salida') + (x.historial_v7 ? ' (' + x.historial_v7 + ' del historial v7.2)' : '') + '</p>';
  h += '<div class="kpis k4">' +
    kpiU('Días con checklist', c.pct === null ? '—' : c.pct + '%', c.dias_actividad ? c.cubiertos + ' de ' + plural(c.dias_actividad, 'día', 'días') + ' con actividad' : 'Sin días con actividad', '100%', semaf(c.pct, 95, 80)) +
    kpiU('Disponibilidad', x.disponibilidad.pct + '%', x.disponibilidad.dias_no_apta ? plural(x.disponibilidad.dias_no_apta, 'día', 'días') + ' con falla crítica' : 'Ningún día con falla crítica', '≥ 95%', semaf(x.disponibilidad.pct, 95, 85)) +
    kpiU('Índice de aptitud', x.pct_apto === null ? '—' : x.pct_apto + '%', 'Aptas o con observaciones', '≥ 90%', semaf(x.pct_apto, 90, 75)) +
    kpiU('Checklist a tiempo', pu.pct === null ? '—' : pu.pct + '%', pu.medidos ? pu.a_tiempo + ' de ' + pu.medidos + ' entre ' + pu.ventana + ' y ' + pu.anticipacion + ' min antes' + (pu.mediana_min !== null ? ' · típico ' + pu.mediana_min + ' min antes' : '') : 'Se mide con los checklists nuevos', '100%', semaf(pu.pct, 95, 80)) +
    kpiU('Regularizado en plazo', rg.pct_en_plazo === null ? '—' : rg.pct_en_plazo + '%', 'De las novedades resueltas en el periodo', '≥ 90%', semaf(rg.pct_en_plazo, 90, 60)) +
    kpiU('Por regularizar', rg.pendientes, rg.vencidas ? plural(rg.vencidas, 'con plazo vencido', 'con plazo vencido') + (rg.escaladas ? ' · ' + rg.escaladas + ' dejan la unidad no apta' : '') : 'Todas en plazo', '0 vencidas', rg.escaladas ? 'bad' : rg.vencidas ? 'warn' : 'ok') +
    kpiU('Tiempo de reparación', nv.mttr_horas === null ? '—' : nv.mttr_horas < 48 ? nv.mttr_horas + ' h' : nv.mttr_dias + ' d', 'Promedio de ' + plural(nv.resueltas, 'novedad resuelta', 'novedades resueltas'), '≤ 3 días', semaf(nv.mttr_dias, 3, 7, true)) +
    kpiU('Tiempo de llenado', x.tiempo.mediana_seg ? durTxt(x.tiempo.mediana_seg) : '—', x.tiempo.expres ? plural(x.tiempo.expres, 'checklist exprés', 'checklists exprés') + ' (menos de 3 min)' : 'Ninguno exprés', '8–15 min, 0 exprés', x.tiempo.expres ? 'warn' : 'ok') +
    '</div>';
  // Tendencia semanal: columnas apiladas por resultado
  var max = Math.max.apply(null, x.semanas.map(function (s) { return s.apto + s.obs + s.fallas + s.no; }).concat([1]));
  h += '<div class="titulo-sec"><h3>Resultados por semana</h3></div><div class="card"><div class="u-cols" role="img" aria-label="Checklists por semana según resultado">' + x.semanas.map(function (s) {
    var t = s.apto + s.obs + s.fallas + s.no, seg = function (n, cl) { return n ? '<i class="' + cl + '" style="height:' + (n / max * 100) + '%" title="' + n + '"></i>' : ''; };
    return '<div class="u-col"><span class="num">' + (t || '') + '</span><div class="u-col-b">' + seg(s.no, 'bad') + seg(s.fallas, 'alto') + seg(s.obs, 'warn') + seg(s.apto, 'ok') + '</div><small>' + esc(V.fechaCorta(s.desde)) + '</small></div>';
  }).join('') + '</div><div class="leyenda"><span><i style="background:var(--ok)"></i>Apta</span><span><i style="background:var(--warn)"></i>Observ.</span><span><i style="background:var(--alto)"></i>Fallas</span><span><i style="background:var(--bad)"></i>No apta</span></div></div>';
  // Recurrencia y categorías
  var maxT = Math.max.apply(null, x.top_items.map(function (t) { return t.veces; }).concat([1]));
  h += '<div class="dos-g"><div><div class="titulo-sec"><h3>Lo que más se repite</h3></div><div class="card">' + (x.top_items.length ? x.top_items.map(function (t) { return '<div class="u-rep"><p>' + sev(t.prioridad) + ' <b>' + esc(t.nombre) + '</b></p><div class="mini-bar u-mb" style="--w:' + Math.round(t.veces / maxT * 100) + '%"><span>' + esc(t.categoria) + '</span><i class="' + (t.prioridad === 'C' ? 'bad' : '') + '"></i><b class="num">' + t.veces + '</b></div></div>'; }).join('') + '<p class="ayuda">Reportes acumulados de cada problema. Lo que se repite pide una reparación de fondo, no un parche.</p>' : '<p class="vacio">Sin novedades en el periodo.</p>') + '</div></div>';
  var maxC = Math.max.apply(null, x.por_categoria.map(function (t) { return t.n; }).concat([1]));
  h += '<div><div class="titulo-sec"><h3>Novedades por zona</h3></div><div class="card">' + (x.por_categoria.length ? x.por_categoria.map(function (t) { return '<div class="mini-bar u-mb" style="--w:' + Math.round(t.n / maxC * 100) + '%"><span>' + esc(t.categoria) + '</span><i></i><b class="num">' + t.n + '</b></div>'; }).join('') : '<p class="vacio">Sin datos.</p>') +
    '<p class="ayuda">Resueltas: ' + nv.resueltas_por.inspeccion + ' por checklist, ' + nv.resueltas_por.mantenimiento + ' con mantenimiento, ' + nv.resueltas_por.manual + ' a mano · ' + nv.nuevas + ' nuevas en el periodo' + (nv.reincidencia_pct !== null ? ' · reincidencia ' + nv.reincidencia_pct + '% (meta ≤ 10%)' : '') + '.</p></div></div></div>';
  h += '<div class="kpis k3" style="margin-top:14px">' + kpiU('Recorrido', x.km.periodo ? km(x.km.periodo) : '—', x.km.por_dia ? km(x.km.por_dia) + ' por día' : 'Según los checklists', '', 'muted') +
    kpiU('Mantenimiento', V.soles(x.mantenimiento.costo), plural(x.mantenimiento.servicios, 'servicio', 'servicios') + ' en el periodo', '', 'muted') +
    kpiU('Costo por km', x.mantenimiento.costo_km ? 'S/ ' + x.mantenimiento.costo_km.toFixed(2) : '—', 'Mantenimiento ÷ km recorridos', '', 'muted') + '</div>';
  if (c.sin_checklist.length) h += '<div class="titulo-sec"><h3>Días con actividad y sin checklist de salida</h3></div><div class="card"><div class="chips">' + c.sin_checklist.map(function (d0) { return '<span class="chip" style="cursor:default">' + esc(V.fechaLarga(d0)) + '</span>'; }).join('') + '</div><p class="ayuda">Días con ingresos del operador o salida de excursión sin checklist pre-ruta. Conversa con el conductor: es el hábito que más protege.</p></div>';
  if (x.operadores.length) h += '<div class="titulo-sec"><h3>Por conductor</h3></div><div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Conductor</th><th class="n">Checklists</th><th class="n">Tiempo típico</th><th class="n">Exprés</th></tr></thead><tbody>' + x.operadores.map(function (o) { return '<tr><td>' + esc(o.operador) + '</td><td class="n">' + o.n + '</td><td class="n">' + durTxt(o.mediana_seg) + '</td><td class="n' + (o.expres ? ' warn' : '') + '">' + o.expres + '</td></tr>'; }).join('') + '</tbody></table></div>';
  $('uind').innerHTML = '<div class="entrar">' + h + '</div>';
}

/* ════════════ Importar el Excel de la app v7.2 (historial de checklists, mantenimientos y documentos) ════════════ */
function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
function idV7(txt) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(function (b) { var h = hex(b); return h.slice(0, 8) + '-' + h.slice(8, 12) + '-4' + h.slice(13, 16) + '-8' + h.slice(17, 20) + '-' + h.slice(20, 32); }); }
function p2(n) { return ('0' + n).slice(-2); }
function fechaSerial(v) { if (typeof v === 'number') return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); var m = String(v || '').match(/(\d{4})-(\d{2})-(\d{2})/) || String(v || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); if (!m) return null; return m[1].length === 4 ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '-' + p2(m[2]) + '-' + p2(m[1]); }
function horaV7(v) { if (v === null || v === undefined || v === '') return null; if (typeof v === 'number') { var t = Math.round((v % 1) * 1440); return p2(Math.floor(t / 60)) + ':' + p2(t % 60); } var m = String(v).match(/(\d{1,2}):(\d{2})\s*([AaPp])?/); if (!m) return null; var h = +m[1]; if (m[3]) h = h % 12 + (/p/i.test(m[3]) ? 12 : 0); return p2(h) + ':' + m[2]; }
function sellos(t) { var m = String(t || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{2}):(\d{2})\s*([ap])/i); if (!m) return null; var h = +m[4] % 12 + (/p/i.test(m[7]) ? 12 : 0); return m[3] + '-' + p2(m[2]) + '-' + p2(m[1]) + ' ' + p2(h) + ':' + m[5] + ':' + m[6]; }
function leerV7(buf) {
  var wb = XLSX.read(buf, { type: 'array' }), hoja = function (n) { return wb.Sheets[n] ? XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: null, raw: true }) : []; };
  var ins = hoja('Inspecciones'); if (!ins.length) throw new Error('El archivo no tiene la hoja «Inspecciones» de la app v7.2.');
  var filas = [];
  return Promise.all(ins.filter(function (r) { return r.Fecha && r.KM; }).map(function (r) {
    var tipo = /post/i.test(r.Tipo || '') ? 'post' : 'pre', d = fechaSerial(r.Fecha), hs = horaV7(r['Hora Salida']), hl = horaV7(r['Hora Llegada']);
    var fecha = sellos(r.Timestamp) || (d + ' ' + ((tipo === 'pre' ? hs : hl) || '12:00') + ':00');
    var km0 = Math.round(Number(String(r.KM).replace(/[^\d.]/g, '')) || 0);
    return idV7(fecha + '|' + tipo + '|' + km0).then(function (id) { filas.push({ id: id, tipo: tipo, fecha: fecha, operador: r.Operador || '', km: km0, lugar: r.Lugar || '', obs: r['Obs. detalle'] || '', fallas: r['Fallas Detalle'] || '', salida_prevista: tipo === 'pre' && hs && d ? d + ' ' + hs : null }); });
  })).then(function () {
    filas.sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; });
    var mant = hoja('Mantenimientos').filter(function (m) { return m.Fecha && m.KM; }).map(function (m) { return { id: m.ID, fecha: fechaSerial(m.Fecha), km: m.KM, taller: m.Taller, operador: m.Operador, obs: m.Observaciones }; });
    var config = {}; hoja('Config').forEach(function (c) { try { if (c.clave && c.json) config[c.clave] = JSON.parse(c.json); } catch (e) {} });
    return { filas: filas, mant: mant, config: config };
  });
}
function hojaImportarV7() {
  V.abrirHoja('<h2 id="hoja-t">Importar la app v7.2</h2><p class="desc">Elige el Excel «Checklist_Hiace_T7V359.xlsx». Se cargan los checklists, los mantenimientos, el SOAT y la tarjeta de circulación. Lo que ya está no se duplica: puedes importarlo otra vez sin problema.</p>' +
    '<div class="campo"><label for="uxf">Archivo de Excel</label><input id="uxf" type="file" accept=".xlsx,.xls"></div><div id="uxp"></div>' +
    '<p class="ayuda">Los checklists de la v7.2 abren las novedades que siguen pendientes (lo que se marcó «No tiene» o «Vencido» y nunca se regularizó). No generan avisos.</p>' + V.botonesHoja('Importar'));
  var datos = null;
  $('ok').disabled = true;
  $('uxf').onchange = function () {
    var f = this.files[0]; if (!f) return;
    $('uxp').innerHTML = '<p class="ayuda">Leyendo…</p>';
    V.cargarSheetJS().then(function () { return f.arrayBuffer(); }).then(leerV7).then(function (x) {
      datos = x; $('ok').disabled = false;
      $('uxp').innerHTML = '<p class="u-nota ok">' + plural(x.filas.length, 'checklist', 'checklists') + ' (del ' + esc(dia(x.filas[0].fecha)) + ' al ' + esc(dia(x.filas[x.filas.length - 1].fecha)) + '), ' + plural(x.mant.length, 'mantenimiento', 'mantenimientos') + (x.config.soat ? ', SOAT' : '') + (x.config.tc ? ', tarjeta de circulación' : '') + '.</p>';
    }).catch(function (e) { $('uxp').innerHTML = '<p class="error">' + esc(e.message) + '</p>'; });
  };
  $('ok').onclick = function () {
    if (!datos) return;
    $('ok').disabled = true; $('uxf').disabled = true;
    var F = datos.filas, i = 0, nuevos = 0, dup = 0, err = [], kmd = 0, extra = null;
    var paso = function () {
      if (i >= F.length) {
        V.hoja().close();
        toast('Importados ' + nuevos + ' checklists' + (dup ? ' (' + dup + ' ya estaban)' : '') + (extra && extra.mant ? ', ' + extra.mant + ' mantenimientos' : '') + (err.length ? ' · ' + err.length + ' con error' : ''), !!err.length);
        if (err.length) console.warn('Importación v7.2', err);
        U.tab = 'novedades'; U.fn = 'abiertas'; refrescar(); return;
      }
      var lote = F.slice(i, i + 4), body = { filas: lote, total: F.length, ultimo: i + 4 >= F.length };
      if (i === 0) { body.mant = datos.mant; body.config = datos.config; }
      $('uxp').innerHTML = '<div class="u-barra grande"><i style="width:' + Math.round(i / F.length * 100) + '%"></i></div><p class="ayuda">' + i + ' de ' + F.length + '…</p>';
      api('/api/flota/importar-v7', { method: 'POST', body: body }).then(function (r) {
        if (!r.ok) { $('er').textContent = r.codigo === 'RED' ? 'Sin conexión: vuelve a intentarlo con señal (lo ya importado no se repite).' : r.error; $('ok').disabled = false; return; }
        if (r.data.mant !== undefined && i === 0) extra = r.data;
        r.data.resultados.forEach(function (x) { if (!x.ok) err.push(x.error); else if (x.duplicado) dup++; else { nuevos++; if (x.km_alerta) kmd++; } });
        i += 4; paso();
      });
    };
    paso();
  };
}

/* ════════════ Recordatorios en el teléfono: a la hora de abrir el checklist y 15 min antes de salir ════════════ */
var timers = [];
function programarRecordatorios() {
  timers.forEach(clearTimeout); timers = [];
  var d = U.d; if (!d || !('Notification' in window) || Notification.permission !== 'granted') return;
  var ven = (d.parametros || {}).chk_ventana_min || 60;
  (d.viajes || []).forEach(function (v) {
    if (!v.salida_hora || v.pre || v.estado === 'en_ruta') return;
    var ms = Date.parse(v.salida_hora.replace(' ', 'T') + ':00-05:00');
    [[ms - ven * 60000, 'Hora del checklist de salida', v.titulo + ' sale a las ' + v.salida_hora.slice(11, 16) + '. Hazlo ahora.'], [ms - 15 * 60000, 'Faltan 15 min para salir', 'Aún no hay checklist de salida para ' + v.titulo + '.']].forEach(function (x) {
      var dt = x[0] - Date.now();
      if (dt > 0 && dt < 12 * 3600e3) timers.push(setTimeout(function () { if (U.d && (U.d.viajes || []).some(function (y) { return y.id === v.id && !y.pre; })) { V.notificar(x[1], x[2], 'chk-' + v.id); toast(x[1] + ': ' + v.titulo); } }, dt));
    });
  });
}
function pedirPermiso() {
  if (!('Notification' in window)) return toast('Este teléfono no permite notificaciones del navegador', true);
  Notification.requestPermission().then(function (p) { if (p === 'granted') { toast('Recordatorios activados en este teléfono'); programarRecordatorios(); V.notificar('Villa Azul', 'Así te avisaremos la hora del checklist de salida.', 'prueba'); } else toast('Sin permiso: los avisos seguirán en la campana', true); if ($('unotif')) $('unotif').remove(); });
}

/* ════════════ Conexión con el resto de Villa Azul ════════════ */
function abrir(tab, id) {
  U.modo = U.modo === 'checklist' ? U.modo : null;
  if (tab === 'insp') { U.tab = 'inspecciones'; V.ir('unidad', true); setTimeout(function () { hojaInspeccion(id); }, 250); return; }
  if (tab === 'checklist') { U.tab = 'estado'; V.ir('unidad', true); return; }
  if (['documentos', 'mantenimiento', 'novedades', 'inspecciones', 'indicadores'].indexOf(tab) >= 0) U.tab = mando() ? tab : 'estado';
  V.ir('unidad', true);
  if (!mando()) setTimeout(function () { var el = $('u-' + tab); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 600);
}
function alSincronizar(res) {
  var r = (res || []).filter(function (x) { return x.tipo === 'chk.crear'; });
  if (!r.length) return;
  r.forEach(function (x) { if (x.ok) toast('Checklist enviado: ' + (APT[x.aptitud] || APT.obs).corto.toLowerCase()); });
  cargar().then(function () { if (enVista() && !U.modo && !V.hoja().open) pintar(); });
}
function estadoReciente() { return U.d && U.t && Date.now() - U.t < 90e3 ? Promise.resolve(U.d) : cargar(); }
function tiraHtml() {
  var d = U.d; if (!d) return '<button type="button" class="u-tira v-muted" id="utira"><span class="u-tira-p"></span><span><b>Unidad</b><small>Revisando…</small></span></button>';
  var a = APT[d.veredicto] || APT.sin_datos, al = (d.alertas || []).filter(function (x) { return x.nivel !== 'info'; });
  return '<button type="button" class="u-tira v-' + a.c + '" id="utira"><span class="u-tira-p"></span><span><b>' + esc(placaFmt(d.placa)) + ' · ' + a.corto + '</b><small>' + (al.length ? esc(al[0].titulo) + (al.length > 1 ? ' · +' + (al.length - 1) : '') : 'Sin alertas · ' + (d.ultima ? 'último checklist ' + esc(diaHora(d.ultima.fecha)).toLowerCase() : 'sin checklists')) + '</small></span><span class="u-tira-v">Ver unidad ' + '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></span></button>';
}
function tiraPanel() { return '<div id="utiraw">' + tiraHtml() + '</div>'; }
function enlazarTira() {
  var bind = function () { var b = $('utira'); if (b) b.onclick = function () { U.tab = 'estado'; U.modo = null; V.ir('unidad', true); }; };
  bind();
  estadoReciente().then(function () { var w = $('utiraw'); if (w) { w.innerHTML = tiraHtml(); bind(); } });
}
function bannerHtml() {
  var d = U.d; if (!d) return '';
  if (U.borr) return '<button type="button" class="u-banner warn" data-uban="borr">' + ic('chk') + '<span><b>Checklist a medio llenar</b><small>Toca para continuarlo</small></span></button>';
  var px = proximaSalida(d), ven = (d.parametros || {}).chk_ventana_min || 60;
  if (px && px.min <= ven) return '<button type="button" class="u-banner bad" data-uban="pre">' + ic('reloj') + '<span><b>Hora del checklist de salida</b><small>' + esc(px.v.titulo) + (px.min >= 0 ? ' sale en ' + durMin(px.min) + ' (' + px.v.salida_hora.slice(11, 16) + ').' : ' debía salir a las ' + px.v.salida_hora.slice(11, 16) + '.') + ' Toca para hacerlo ahora.</small></span></button>';
  if (px && px.min <= ven + 180) return '<button type="button" class="u-banner info" data-uban="ver">' + ic('reloj') + '<span><b>' + esc(px.v.titulo) + ' sale a las ' + px.v.salida_hora.slice(11, 16) + '</b><small>El checklist se abre a las ' + px.v.checklist_desde.slice(11, 16) + ' (en ' + durMin(px.min - ven) + ').</small></span></button>';
  var pend = (d.alertas || []).filter(function (a) { return a.ir === 'checklist'; })[0];
  if (pend) return '<button type="button" class="u-banner ' + pend.nivel + '" data-uban="pre">' + ic('chk') + '<span><b>' + esc(pend.titulo) + '</b><small>' + esc(pend.detalle) + '</small></span></button>';
  if (d.veredicto === 'no') return '<button type="button" class="u-banner bad" data-uban="ver">' + ic('x') + '<span><b>La unidad está NO APTA</b><small>Revisa las novedades antes de salir.</small></span></button>';
  return '';
}
function bannerOperador() { return '<div id="ubanw">' + bannerHtml() + '</div>'; }
function enlazarBanner() {
  var bind = function () { var b = document.querySelector('[data-uban]'); if (!b) return; b.onclick = function () { var t = b.getAttribute('data-uban'); if (t === 'borr') { U.f = U.borr; U.paso = 'items'; U.modo = 'checklist'; V.ir('unidad', true); } else if (t === 'pre') empezar('pre'); else { U.modo = null; V.ir('unidad', true); } }; };
  bind();
  Promise.all([estadoReciente(), cargarBorrador()]).then(function () { var w = $('ubanw'); if (w) { w.innerHTML = bannerHtml(); bind(); } });
}
function tarjetaExc(excId, el) {
  if (!el) return;
  el.innerHTML = '<div class="u-xchk"><p class="vacio" style="padding:6px">Revisando el checklist…</p></div>';
  api('/api/flota/excursion/' + excId).then(function (r) {
    if (!r.ok) { el.innerHTML = ''; return; }
    var x = r.data.pre;
    el.innerHTML = '<div class="u-xchk">' + ic('chk') + '<div><b>Checklist de salida</b><div class="u-xchk-f">' + (x ? chipApt(x.aptitud) + '<small>' + esc(x.operador) + ' · ' + esc(diaHora(x.fecha)) + ' · ' + km(x.km) + (x.min_antes !== null && x.min_antes !== undefined ? ' · ' + (x.min_antes >= 0 ? x.min_antes + ' min antes' : durMin(-x.min_antes) + ' tarde') : '') + '</small><button type="button" class="btn-mini" data-xi="' + esc(x.id) + '">Ver</button>'
      : '<span class="u-pill muted">Pendiente</span><small>Jorge lo hace en la hora previa a la salida, desde su pestaña «Checklist». Sin él no se registra la salida.</small>') + '</div></div></div>';
    el.querySelectorAll('[data-xi]').forEach(function (b) { b.onclick = function () { plantilla().then(function () { hojaInspeccion(b.getAttribute('data-xi')); }); }; });
  });
}
function modulo() { var d = U.d; if (!d) return 'Checklist, documentos y mantenimiento'; var n = (d.alertas || []).filter(function (a) { return a.nivel !== 'info'; }).length; return (APT[d.veredicto] || APT.sin_datos).corto + (n ? ' · ' + plural(n, 'alerta', 'alertas') : ' · al día'); }

/* El estado y el borrador se cargan antes de pintar: así el operador ve su checklist pendiente al abrir. */
var vistaBase = vista;
vista = function () { return cargarBorrador().then(vistaBase, vistaBase); };

return {
  vista: function () { return vista(); },
  pasiva: function () { return !U.modo && !V.hoja().open; },
  abrir: abrir, alSincronizar: alSincronizar, empezar: empezar,
  tiraPanel: tiraPanel, enlazarTira: enlazarTira, bannerOperador: bannerOperador, enlazarBanner: enlazarBanner,
  tarjetaExc: tarjetaExc, modulo: modulo, salir: function () { document.body.classList.remove('en-chk'); },
  precargar: function () { plantilla().catch(function () {}); estadoReciente(); }
};
};
