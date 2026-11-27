/**
 * Villa Azul · Cotizador de excursión, taxi/expreso y transporte privado (v4.0)
 * Calcula con los costos reales de la empresa cuando existen y con supuestos editables cuando no.
 */
import { calcular, PARAMETROS_BASE, SERVICIOS, serviciosPara, PERFILES, EXTRAS_BASE, extrasDe, UNIDADES_EXTRA, detalleExtra, MODALIDADES, esBase, politicaEspera, bonoEspera, comidasPorHorario, montoComidas, COMIDAS } from '../public/js/cotizar.mjs';

export const SQL_COT_V7 = [
  `CREATE TABLE IF NOT EXISTS cotizaciones (id TEXT PRIMARY KEY, token TEXT UNIQUE, numero INTEGER, tipo TEXT, cliente TEXT, cliente_tel TEXT, origen TEXT, destino TEXT,
     fecha_servicio TEXT, datos TEXT, parametros TEXT, resultado TEXT, costo REAL, precio_minimo REAL, precio_recomendado REAL, precio_premium REAL, precio_final REAL,
     estado TEXT, valida_hasta TEXT, notas TEXT, incluye TEXT, excursion_id TEXT, creado_por TEXT, creado_en TEXT, actualizado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_cot_estado ON cotizaciones(estado)',
  'CREATE TABLE IF NOT EXISTS rutas_km (clave TEXT PRIMARY KEY, origen TEXT, destino TEXT, km REAL, peajes_ida REAL, actualizado_en TEXT)',
];
export const SQL_COT_V8 = [
  'ALTER TABLE cotizaciones ADD COLUMN precio_final_premium REAL',
  'ALTER TABLE cotizaciones ADD COLUMN plan_elegido TEXT',
  'ALTER TABLE cotizaciones ADD COLUMN elegido_en TEXT',
  'ALTER TABLE rutas_km ADD COLUMN peajes_vuelta REAL',
  'CREATE TABLE IF NOT EXISTS geocodes (lugar TEXT PRIMARY KEY, lat REAL, lon REAL, nombre TEXT, creado_en TEXT)',
  // Ruta conocida: 186 km en ~6 h. Hacia Trujillo no se paga peaje; al volver de Trujillo sí (S/ 8.80).
  "INSERT OR IGNORE INTO rutas_km (clave, origen, destino, km, peajes_ida, peajes_vuelta, actualizado_en) VALUES ('angasmarca|trujillo','Angasmarca','Trujillo',186,0,8.80,'2026-10-21 00:00:00')",
  "INSERT OR IGNORE INTO rutas_km (clave, origen, destino, km, peajes_ida, peajes_vuelta, actualizado_en) VALUES ('trujillo|angasmarca','Trujillo','Angasmarca',186,8.80,0,'2026-10-21 00:00:00')",
];
// v5.2: márgenes sobre el precio 30 % (mínimo), 40 % (recomendado) y 50 % (alto).
export const SQL_COT_V13 = [
  "INSERT OR REPLACE INTO config (clave, valor, seq) VALUES ('cot_margen_minimo','30',?)",
  "INSERT OR REPLACE INTO config (clave, valor, seq) VALUES ('cot_margen_objetivo','40',?)",
  "INSERT OR REPLACE INTO config (clave, valor, seq) VALUES ('cot_margen_premium','50',?)",
];
// v5.9: el precio por pasajero y tramo se redondea a soles enteros (si seguía en S/ 0.50).
export const SQL_COT_V17 = ["UPDATE config SET valor='1', seq=? WHERE clave='cot_redondeo_tramo' AND valor='0.5'"];
// v5.7: rutas de trocha y liquidación de cada viaje (cálculo y pago del conductor).
export const SQL_COT_V16 = ['ALTER TABLE rutas_km ADD COLUMN trocha INTEGER', 'ALTER TABLE excursiones ADD COLUMN liquidacion TEXT'];
// v5.6: el margen alto baja de 50 % a 45 % (precio de lista con espacio para una rebaja), salvo que ya lo hayas cambiado.
export const SQL_COT_V15 = ["UPDATE config SET valor='45', seq=? WHERE clave='cot_margen_premium' AND valor='50'"];
// v5.2.1: hora de espera a S/ 10.
export const SQL_COT_V14 = ["INSERT OR REPLACE INTO config (clave, valor, seq) VALUES ('cot_espera_hora','10',?)"];
export const SQL_COT_V9 = [
  'ALTER TABLE cotizaciones ADD COLUMN creado_por_id TEXT',
  `CREATE TABLE IF NOT EXISTS avisos (id TEXT PRIMARY KEY, tipo TEXT, titulo TEXT, detalle TEXT, ir TEXT, para TEXT, creado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE TABLE IF NOT EXISTS avisos_leidos (usuario_id TEXT, aviso_id TEXT, PRIMARY KEY (usuario_id, aviso_id))',
  'CREATE INDEX IF NOT EXISTS ix_avisos_creado ON avisos(creado_en)',
];
const TIPOS = { excursion: 'Excursión', taxi: 'Taxi / expreso', privado: 'Transporte privado' };
const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'];
const CLAVES = Object.keys(PARAMETROS_BASE);

export function crearCotizador(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, avisar, sol } = h;
  const esMando = (u) => u && (u.rol === 'admin' || u.rol === 'super');
  const soles = (n) => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /** Lo que ve el operador de una cotización: precios y datos del viaje. Nunca costos, pago del conductor, bono ni margen. */
  const paraOperador = (c) => c && ({ id: c.id, token: c.token, codigo: c.codigo, numero: c.numero, tipo: c.tipo, cliente: c.cliente, cliente_tel: c.cliente_tel, origen: c.origen, destino: c.destino,
    fecha_servicio: c.fecha_servicio, precio_final: c.precio_final, precio_final_premium: c.precio_final_premium, precio_acordado: c.precio_acordado, plan_elegido: c.plan_elegido, estado: c.estado,
    valida_hasta: c.valida_hasta, vencida: c.vencida, notas: c.notas, excursion_id: c.excursion_id, creado_por: c.creado_por, creado_por_id: c.creado_por_id, creado_en: c.creado_en,
    datos: (({ bono, otros, extras, ...resto }) => ({ ...resto, extras: (extras || []).map(sinCosto) }))(c.datos || {}), politica_espera: c.politica_espera, adelanto_pct: c.adelanto_pct, incluye: c.incluye, servicio_incluye: c.servicio_incluye,
    resultado: { km: c.resultado.km, km_vacios: c.resultado.km_vacios || 0, salidas: c.resultado.salidas || 1, dias: c.resultado.dias, noches: c.resultado.noches, horas_manejo: c.resultado.horas_manejo, pasajeros: c.resultado.pasajeros } });
  const r2s = (x) => Math.round(x * 100) / 100;
  const sinCosto = ({ costo, ...e }) => e;
  /* ═════════ Extras opcionales ═════════ */
  async function catalogoExtras(env) {
    const f = await env.DB.prepare("SELECT valor FROM config WHERE clave='extras_catalogo'").first();
    try { const L = f ? JSON.parse(f.valor) : null; if (Array.isArray(L)) return L; } catch (e) { }
    return EXTRAS_BASE.map(e => ({ ...e }));
  }
  function limpiarCatalogo(L) {
    if (!Array.isArray(L)) throw new ErrorApi('Lista de extras no válida.');
    const vistos = new Set();
    return L.slice(0, 10).map((e, i) => {
      const nombre = texto(e.nombre, 50); if (!nombre) return null;
      let id = texto(e.id, 30).toLowerCase().replace(/[^a-z0-9_-]/g, '') || nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'extra' + i;
      while (vistos.has(id)) id += '2'; vistos.add(id);
      const precio = Math.max(0, Math.min(10000, num(e.precio))), costo = Math.max(0, Math.min(10000, num(e.costo)));
      return { id, nombre, descripcion: texto(e.descripcion, 120), precio: r2s(precio), costo: r2s(costo), unidad: UNIDADES_EXTRA[e.unidad] ? e.unidad : 'viaje', desde_dias: Math.max(1, Math.min(30, Math.round(num(e.desde_dias) || 1))),
        activo: e.activo === false || e.activo === 0 || e.activo === '0' ? 0 : 1, tarea: texto(e.tarea, 120) };
    }).filter(Boolean);
  }
  /** Lo que suman los extras elegidos (solo los que se ofrecieron en esa cotización, con el precio con que se enviaron). */
  const extrasElegidos = (d) => { const of = Array.isArray(d && d.extras) ? d.extras : [], el = Array.isArray(d && d.extras_elegidos) ? d.extras_elegidos : [];
    return of.filter(e => el.includes(e.id)); };
  const sumaExtras = (d) => r2s(extrasElegidos(d).reduce((t, e) => t + num(e.total), 0));
  const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
  const adelantoDe = (c) => { const p = JSON.parse(c.parametros || '{}'); return p.adelanto_pct !== undefined ? num(p.adelanto_pct) : PARAMETROS_BASE.adelanto_pct; };
  const texto = (v, max = 100) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  const tel = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 9 && d[0] === '9') d = '51' + d; return d; };
  const claveRuta = (o, d) => (String(o).trim().toLowerCase() + '|' + String(d).trim().toLowerCase());
  const token = () => { const a = new Uint8Array(10); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };

  async function parametros(env) {
    const filas = (await env.DB.prepare("SELECT clave, valor FROM config WHERE clave LIKE 'cot_%'").all()).results;
    const guardados = {}; filas.forEach(f => { guardados[f.clave.slice(4)] = num(f.valor); });
    return { ...PARAMETROS_BASE, ...guardados, _guardados: Object.keys(guardados) };
  }
  /** Lo que dicen los datos reales: rendimiento y precio del diésel de los viajes con km y galones registrados. */
  async function sugeridos(env) {
    const exc = (await env.DB.prepare(`SELECT e.km_inicio, e.km_fin, COALESCE(SUM(m.galones),0) gal, COALESCE(SUM(m.monto),0) soles, COUNT(m.id) n
      FROM excursiones e JOIN exc_movimientos m ON m.excursion_id = e.id AND m.categoria='combustible' AND COALESCE(m.anulado,0)=0
      WHERE e.km_fin > e.km_inicio GROUP BY e.id`).all()).results;
    let km = 0, gal = 0, soles = 0, nComb = 0;
    exc.forEach(x => { if (x.gal > 0) { km += x.km_fin - x.km_inicio; gal += x.gal; soles += x.soles; nComb += x.n; } });
    const ruta = await env.DB.prepare("SELECT COALESCE(SUM(galones),0) gal, COALESCE(SUM(monto),0) soles, COUNT(*) n FROM movimientos WHERE estado='activo' AND galones > 0 AND monto/galones BETWEEN 8 AND 40").first();
    const galT = gal + num(ruta.gal), solesT = soles + num(ruta.soles), nT = nComb + num(ruta.n);
    return {
      rendimiento_km_gal: km && gal ? { valor: Math.round(km / gal * 10) / 10, base: `${Math.round(km)} km y ${Math.round(gal * 10) / 10} galones de ${exc.length} excursión(es)` } : null,
      precio_galon: nT >= 3 && galT ? { valor: Math.round(solesT / galT * 100) / 100, base: `${nT} cargas de combustible con galones` } : null,
    };
  }
  async function verParametros(env) {
    const rutas = (await env.DB.prepare('SELECT * FROM rutas_km ORDER BY origen, destino').all()).results;
    const lugares = (await env.DB.prepare('SELECT DISTINCT origen l FROM tarifas UNION SELECT DISTINCT destino FROM tarifas UNION SELECT origen FROM rutas_km UNION SELECT destino FROM rutas_km').all()).results.map(x => x.l).filter(Boolean).sort();
    const tarifas = (await env.DB.prepare('SELECT origen, destino, tarifa FROM tarifas WHERE COALESCE(activo,1)=1').all()).results;
    const wa = await env.DB.prepare("SELECT valor FROM config WHERE clave='whatsapp_empresa'").first();
    return { parametros: await parametros(env), base: PARAMETROS_BASE, sugeridos: await sugeridos(env), rutas, lugares, tarifas, whatsapp_empresa: wa ? wa.valor : '', extras: await catalogoExtras(env), unidades_extra: UNIDADES_EXTRA };
  }
  async function guardarParametros(env, yo, b) {
    exigirMando(yo);
    const st = [], cambios = [];
    for (const k of CLAVES) if (b[k] !== undefined && b[k] !== '') {
      const v = num(b[k]); if (v < 0 || v > 100000) throw new ErrorApi(`Valor no válido para ${k}`);
      st.push(env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind('cot_' + k, String(v), await reservarSeq(env, 1))); cambios.push(`${k}=${v}`);
    }
    if (b.whatsapp_empresa !== undefined) { st.push(env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind('whatsapp_empresa', tel(b.whatsapp_empresa), await reservarSeq(env, 1))); cambios.push('whatsapp'); }
    if (b.extras !== undefined) { const L = limpiarCatalogo(b.extras);
      st.push(env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind('extras_catalogo', JSON.stringify(L), await reservarSeq(env, 1)));
      cambios.push('extras: ' + L.map(e => `${e.nombre} S/ ${e.precio} ${UNIDADES_EXTRA[e.unidad]}${e.activo ? '' : ' (apagado)'}`).join(', ')); }
    if (st.length) await env.DB.batch(st);
    await auditar(env, yo.nombre, 'cot_parametros', cambios.join(' · '));
    return verParametros(env);
  }
  function datosDe(b) {
    const tipo = TIPOS[b.tipo] ? b.tipo : 'excursion';
    const iv = b.ida_vuelta !== false && b.ida_vuelta !== 'false', modalidad = MODALIDADES[b.modalidad] ? b.modalidad : (iv ? 'ida_vuelta' : 'solo_ida');
    const km = (v) => v !== undefined && v !== null && v !== '' ? Math.max(0, num(v)) : null;
    // Si el grupo sale de la base, los tramos vacíos ya los cuenta la modalidad: no se suma nada aparte (evita contarlos dos veces).
    const b1 = esBase(b.origen) ? 0 : km(b.km_base_origen), b2 = esBase(b.origen) ? null : esBase(b.destino) ? 0 : km(b.km_destino_base);
    // Hora en que la van sale de regreso desde el destino (o el día del recojo, en «dejar y recoger»).
    const fr = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(b.fecha_retorno || '')) && modalidad !== 'solo_ida' ? String(b.fecha_retorno) : null;
    return { tipo, modalidad, km_ida: num(b.km_ida), ida_vuelta: modalidad !== 'solo_ida', km_base_origen: b1, km_destino_base: b2, fecha_retorno: fr, perfil: PERFILES[b.perfil] ? b.perfil : 'turismo', fecha_servicio: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(String(b.fecha_servicio || '')) ? String(b.fecha_servicio) : null, trocha: b.trocha === true || b.trocha === 'true' || b.trocha === 1,
      km_extra: num(b.km_extra), dias: num(b.dias) || 1, noches: num(b.noches),
      horas_espera: num(b.horas_espera), pasajeros: num(b.pasajeros), peajes_ida: num(b.peajes_ida), peajes_vuelta: num(b.peajes_vuelta),
      precio_galon: num(b.precio_galon) > 0 ? Math.round(num(b.precio_galon) * 100) / 100 : null,
      bono: b.bono !== undefined && b.bono !== null && b.bono !== '' ? Math.max(0, Math.round(num(b.bono) * 100) / 100) : null,
      otros: (Array.isArray(b.otros) ? b.otros : []).slice(0, 8).map(o => ({ concepto: texto(o.concepto, 60), monto: num(o.monto) })).filter(o => o.monto > 0) };
  }
  async function guardar(env, yo, id, b) {
    const op = !esMando(yo);
    if (op) {
      // El operador cotiza con el margen recomendado: no escribe precios ni bono (el bono automático de viaje largo sí se aplica).
      // Puede elegir entre el precio recomendado y el alto del Estándar; nunca escribir un precio a mano.
      delete b.precio_final; delete b.precio_final_premium; delete b.bono; if (!['alto', 'descuento'].includes(b.nivel)) b.nivel = 'recomendado';
      if (id) { const prev = await env.DB.prepare('SELECT creado_por_id, excursion_id, estado FROM cotizaciones WHERE id=?').bind(id).first();
        if (!prev || prev.creado_por_id !== yo.id) throw new ErrorApi('Solo puedes editar tus propias cotizaciones.', 'SIN_PERMISO', 403);
        if (prev.estado === 'aceptada') throw new ErrorApi('El cliente ya eligió: pide a un administrador cualquier cambio.'); }
    }
    const d = datosDe(b), origen = texto(b.origen, 60), destino = texto(b.destino, 60);
    if (!origen || !destino) throw new ErrorApi('Escribe origen y destino.');
    if (!(d.km_ida > 0)) throw new ErrorApi('Escribe los kilómetros de ida.');
    if (d.fecha_retorno && b.fecha_servicio && d.fecha_retorno <= String(b.fecha_servicio)) throw new ErrorApi('El regreso debe ser después de la salida. Si es a medianoche, elige el día siguiente a las 00:00.');
    const par = await parametros(env), res = calcular(par, d), nivel = ['minimo', 'descuento', 'recomendado', 'alto'].includes(b.nivel) ? b.nivel : 'recomendado';
    d.nivel = nivel;
    const final = b.precio_final !== undefined && b.precio_final !== '' ? Math.round(num(b.precio_final) * 100) / 100 : res.estandar.precios[nivel];
    // Mientras el Premium no esté activo (Parámetros → Precios), la cotización solo lleva Estándar.
    const conPremium = false; // el Premium fijo quedó para cotizaciones anteriores a la v5.14
    // v5.14: ya no se arma un Premium fijo. El cliente suma extras opcionales al Estándar desde su enlace.
    const finalP = null;
    // Extras que se ofrecen en esta cotización: los que marcó quien cotiza o, si no tocó nada, los sugeridos (WiFi siempre; refrigerio desde 2 días).
    const catalogo = await catalogoExtras(env), todos = num(par.extras_activo) === 1 ? extrasDe(catalogo, res, par) : [];
    const pedidos = Array.isArray(b.extras_ofrecidos) ? b.extras_ofrecidos.map(String) : null;
    d.extras = todos.filter(e => pedidos ? pedidos.includes(e.id) : e.sugerido);
    if (!(final > 0) || (conPremium && !(finalP > 0))) throw new ErrorApi('Precio final no válido.');
    if (conPremium && finalP !== null && finalP < final) throw new ErrorApi('El Premium no puede costar menos que el Estándar.');
    d.precio_manual = { estandar: final !== res.estandar.precios[nivel], premium: conPremium && finalP !== res.premium.precios[nivel] };
    const ahora = ahoraLima(), valida = new Date(Date.now() - 5 * 3600000 + num(par.validez_dias) * 864e5).toISOString().slice(0, 10);
    const OBVIO = { combustible: 1, conductor: 1 };
    const PARA_CLIENTE = { combustible: 'Combustible', peajes: 'Peajes', conductor: 'Conductor profesional', viaticos: 'Alimentación del conductor', hospedaje: 'Hospedaje del conductor', cochera: 'Cochera de la van' };
    // Combustible y conductor van siempre: decirlo es relleno. Se dice lo que el cliente podría dudar (peajes, comida y hospedaje del conductor) y lo agregado a mano.
    const incluye = res.lineas.filter(l => (PARA_CLIENTE[l.clave] && !OBVIO[l.clave]) || /^otro/.test(l.clave)).map(l => PARA_CLIENTE[l.clave] || l.concepto);
    const fila = { tipo: d.tipo, cliente: texto(b.cliente, 80), cliente_tel: tel(b.cliente_tel), origen, destino, fecha_servicio: texto(b.fecha_servicio, 16),
      datos: JSON.stringify(d), parametros: JSON.stringify(par), resultado: JSON.stringify(res), costo: res.costo, precio_minimo: res.precios.minimo, precio_recomendado: res.precios.recomendado,
      precio_premium: res.precios.premium, precio_final: final, precio_final_premium: finalP, notas: texto(b.notas, 500), incluye: JSON.stringify(incluye), actualizado_en: ahora };
    // La distancia y los peajes de la ruta se recuerdan para la próxima cotización.
    const rk = env.DB.prepare('INSERT OR REPLACE INTO rutas_km (clave, origen, destino, km, peajes_ida, peajes_vuelta, trocha, actualizado_en) VALUES (?,?,?,?,?,?,?,?)').bind(claveRuta(origen, destino), origen, destino, d.km_ida, d.peajes_ida, d.peajes_vuelta, d.trocha ? 1 : 0, ahora);
    if (id) {
      const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE id=?').bind(id).first(); if (!c) throw new ErrorApi('Cotización no encontrada', 'NO_EXISTE', 404);
      if (c.estado === 'aceptada' && c.excursion_id) throw new ErrorApi('Ya se convirtió en excursión: edita la excursión.');
      // Lo que el cliente ya eligió se conserva, si ese extra se sigue ofreciendo.
      const prevEl = (JSON.parse(c.datos || '{}').extras_elegidos || []).filter(x => d.extras.some(e => e.id === x));
      if (prevEl.length) { d.extras_elegidos = prevEl; fila.datos = JSON.stringify(d); }
      fila.seq = await reservarSeq(env, 1);
      const k = Object.keys(fila);
      await env.DB.batch([env.DB.prepare(`UPDATE cotizaciones SET ${k.map(x => `${x}=?`).join(', ')} WHERE id=?`).bind(...k.map(x => fila[x]), id), rk]);
      await auditar(env, yo.nombre, 'cot_editar', `COT-${String(c.numero).padStart(4, '0')} · S/ ${final}` + cambiosCot(c, fila, d));
      return op ? paraOperador(await detalle(env, id)) : detalle(env, id);
    }
    if (b.plan_elegido === undefined) fila.plan_elegido = null;
    fila.creado_por_id = yo.id;
    // Cotización armada desde una solicitud del QR: quedan enlazadas y el cliente sigue el avance en su enlace.
    const solId = esMando(yo) && b.solicitud_id ? texto(b.solicitud_id, 40) : null;
    if (solId) fila.solicitud_id = solId;
    const n2 = (await env.DB.prepare('SELECT COALESCE(MAX(numero),0)+1 n FROM cotizaciones').first()).n;
    Object.assign(fila, { id: crypto.randomUUID(), token: token(), numero: n2, estado: 'borrador', valida_hasta: valida, creado_por: yo.nombre, creado_en: ahora, seq: await reservarSeq(env, 1) });
    const k = Object.keys(fila);
    await env.DB.batch([env.DB.prepare(`INSERT INTO cotizaciones (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`).bind(...k.map(x => fila[x])), rk]);
    await auditar(env, yo.nombre, 'cot_crear', `COT-${String(n2).padStart(4, '0')} · ${TIPOS[d.tipo]} · ${origen} → ${destino} · S/ ${final}`);
    if (solId && sol) await sol.enlazar(env, yo, solId, fila.id);
    if (op) {
      const cod = 'COT-' + String(n2).padStart(4, '0'), diesel = d.precio_galon && d.precio_galon !== num(par.precio_galon) ? ` · usó diésel a S/ ${d.precio_galon} (parámetro S/ ${num(par.precio_galon)})` : '';
      await avisar(env, { tipo: 'cotizacion', para: 'mando', titulo: `${yo.nombre} cotizó ${cod}`, ir: 'cotizador:' + fila.id,
        detalle: `${TIPOS[d.tipo]} ${origen} → ${destino}${fila.cliente ? ' · ' + fila.cliente : ''} · Estándar ${soles(final)}${d.extras.length ? ' · extras ofrecidos: ' + d.extras.map(e => e.nombre).join(', ') : ''}${diesel}` });
      return paraOperador(await detalle(env, fila.id));
    }
    return detalle(env, fila.id);
  }
  /** Qué cambió al editar: queda en la auditoría y se ve en el historial de la cotización. */
  const PERFIL_TXT = { turismo: 'Turistas', banda: 'Banda u orquesta', grupo: 'Otro grupo' }, NIVEL_TXT = { minimo: 'Mínimo', descuento: 'Con descuento', recomendado: 'Recomendado', alto: 'Alto' };
  function cambiosCot(c, fila, d) {
    const a = JSON.parse(c.datos || '{}'), L = [];
    const v = (x) => x === null || x === undefined || x === '' ? '—' : x, dif = (t, x, y, f = (z) => z) => { if (String(v(x)) !== String(v(y))) L.push(`${t} ${f(v(x))} → ${f(v(y))}`); };
    dif('precio', c.precio_final, fila.precio_final, (z) => z === '—' ? z : 'S/ ' + z);
    dif('Premium', c.precio_final_premium, fila.precio_final_premium, (z) => z === '—' ? z : 'S/ ' + z);
    dif('nivel', NIVEL_TXT[a.nivel] || a.nivel, NIVEL_TXT[d.nivel] || d.nivel);
    dif('pasajeros', a.pasajeros, d.pasajeros); dif('km de ida', a.km_ida, d.km_ida); dif('km vacíos', a.km_base_origen, d.km_base_origen);
    dif('peaje ida', a.peajes_ida, d.peajes_ida); dif('peaje vuelta', a.peajes_vuelta, d.peajes_vuelta); dif('diésel', a.precio_galon, d.precio_galon);
    dif('espera', a.horas_espera, d.horas_espera, (z) => z === '—' ? z : z + ' h'); dif('tipo de cliente', PERFIL_TXT[a.perfil || 'turismo'], PERFIL_TXT[d.perfil]);
    dif('extras ofrecidos', (a.extras || []).map(e => e.nombre).join(', ') || 'ninguno', (d.extras || []).map(e => e.nombre).join(', ') || 'ninguno');
    dif('trocha', a.trocha ? 'sí' : 'no', d.trocha ? 'sí' : 'no'); dif('salida', c.fecha_servicio, fila.fecha_servicio); dif('regreso', a.fecha_retorno, d.fecha_retorno);
    return L.length ? ' · ' + L.join(' · ') : '';
  }
  const precioPlan = (c) => c.plan_elegido === 'premium' && c.precio_final_premium ? c.precio_final_premium : r2s(num(c.precio_final) + sumaExtras(JSON.parse(c.datos || '{}')));
  // Cotizaciones guardadas antes de la v5.14.2: se quita lo obvio al mostrarlas.
  const sinObvio = (L) => L.filter(x => x !== 'Combustible' && x !== 'Conductor profesional');
  const salida = (c) => c && ({ ...c, precio_acordado: precioPlan(c), datos: JSON.parse(c.datos || '{}'), resultado: JSON.parse(c.resultado || '{}'), incluye: sinObvio(JSON.parse(c.incluye || '[]')), parametros: undefined,
    politica_espera: politicaEspera(JSON.parse(c.parametros || '{}'), JSON.parse(c.datos || '{}')), adelanto_pct: adelantoDe(c),
    servicio_incluye: serviciosPara(JSON.parse(c.datos || '{}').perfil).estandar.incluye,
    codigo: 'COT-' + String(c.numero).padStart(4, '0'), vencida: c.estado !== 'aceptada' && c.valida_hasta && c.valida_hasta < ahoraLima().slice(0, 10) });
  async function detalle(env, id) {
    const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE id=?').bind(id).first(); if (!c) throw new ErrorApi('Cotización no encontrada', 'NO_EXISTE', 404);
    return salida(c);
  }
  /** Para administradores: la cotización con su historial (quién la creó, editó, envió o eligió y qué cambió). */
  async function detalleAdmin(env, id) {
    const c = await detalle(env, id);
    const h = (await env.DB.prepare("SELECT timestamp, usuario, accion, detalle FROM auditoria WHERE accion LIKE 'cot_%' AND (detalle = ? OR detalle LIKE ?) ORDER BY timestamp DESC, seq DESC LIMIT 40")
      .bind(c.codigo, c.codigo + ' %').all()).results;
    return { ...c, historial: h };
  }
  async function listar(env) {
    const L = (await env.DB.prepare('SELECT * FROM cotizaciones ORDER BY numero DESC LIMIT 200').all()).results.map(salida);
    const mes = ahoraLima().slice(0, 7), delMes = L.filter(c => String(c.creado_en).slice(0, 7) === mes);
    const dec = L.filter(c => c.estado === 'aceptada' || c.estado === 'rechazada');
    return { cotizaciones: L, resumen: { mes_n: delMes.length, mes_monto: delMes.reduce((s, c) => s + num(c.precio_final), 0),
      aceptadas: L.filter(c => c.estado === 'aceptada').length, monto_aceptado: L.filter(c => c.estado === 'aceptada').reduce((s, c) => s + num(c.precio_acordado), 0),
      premium: L.filter(c => c.plan_elegido === 'premium').length, estandar: L.filter(c => c.plan_elegido === 'estandar').length,
      extras: (() => { const ac = L.filter(c => c.estado === 'aceptada' && (c.datos.extras || []).length), con = ac.filter(c => extrasElegidos(c.datos).length), por = {};
        con.forEach(c => extrasElegidos(c.datos).forEach(e => { por[e.nombre] = (por[e.nombre] || 0) + 1; }));
        return { ofrecidas: ac.length, con_extras: con.length, ingreso: r2s(con.reduce((t, c) => t + sumaExtras(c.datos), 0)), por_extra: por }; })(),
      tasa: dec.length ? Math.round(L.filter(c => c.estado === 'aceptada').length / dec.length * 100) : null, pendientes: L.filter(c => ['borrador', 'enviada'].includes(c.estado) && !c.vencida).length } };
  }
  async function cambiarEstado(env, yo, id, b) {
    if (!ESTADOS.includes(b.estado)) throw new ErrorApi('Estado no válido');
    const c = await detalle(env, id);
    if (!esMando(yo) && (c.creado_por_id !== yo.id || !['enviada', 'rechazada'].includes(b.estado))) throw new ErrorApi('No puedes cambiar esta cotización.', 'SIN_PERMISO', 403);
    await env.DB.prepare('UPDATE cotizaciones SET estado=?, notas=COALESCE(?, notas), actualizado_en=?, seq=? WHERE id=?').bind(b.estado, b.motivo ? (c.notas ? c.notas + ' | ' : '') + texto(b.motivo, 200) : null, ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'cot_estado', `${c.codigo} → ${b.estado}`);
    return esMando(yo) ? detalle(env, id) : paraOperador(await detalle(env, id));
  }
  /** Cotización aceptada → excursión por contrato con el monto acordado, sin volver a escribir nada. */
  async function convertir(env, yo, id, crearExcursion, b) {
    exigirMando(yo);
    let c = await detalle(env, id);
    if (c.excursion_id) throw new ErrorApi('Esta cotización ya tiene su excursión.');
    const plan = ['estandar', 'premium'].includes(b && b.plan) ? b.plan : (c.plan_elegido || 'estandar');
    if (plan !== c.plan_elegido) { await env.DB.prepare('UPDATE cotizaciones SET plan_elegido=? WHERE id=?').bind(plan, id).run(); c = await detalle(env, id); }
    const d = c.datos, f = c.fecha_servicio || ahoraLima().slice(0, 10) + 'T05:00';
    const r = await crearExcursion(env, yo, {
      titulo: `${TIPOS[c.tipo]} ${SERVICIOS[plan].nombre} ${c.origen} → ${c.destino}${c.cliente ? ' · ' + c.cliente : ''}`.slice(0, 80), tipo: 'contrato', cliente: c.cliente, cliente_tel: c.cliente_tel,
      origen: c.origen, destino: c.destino, salida: f.length === 10 ? f + 'T05:00' : f, retorno: d.fecha_retorno || undefined, monto_contrato: c.precio_acordado,
      notas: (`Desde ${c.codigo} · Servicio ${SERVICIOS[plan].nombre}: ${serviciosPara((c.datos || {}).perfil)[plan].incluye.join(', ')}.` +
        (plan === 'estandar' && extrasElegidos(d).length ? ` Extras: ${extrasElegidos(d).map(e => `${e.nombre} (${soles(e.total)})`).join(', ')}. Por hacer: ${extrasElegidos(d).map(e => e.tarea || e.nombre).join(' · ')}.` : '') + ` ${c.notas || ''}`).trim(),
      asientos_total: 15, estado: 'borrador',
    });
    await env.DB.prepare("UPDATE cotizaciones SET estado='aceptada', excursion_id=?, actualizado_en=?, seq=? WHERE id=?").bind(r.id, ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'cot_convertir', `${c.codigo} (${SERVICIOS[plan].nombre}${extrasElegidos(d).length ? ' + ' + extrasElegidos(d).map(e => e.nombre).join(' + ') : ''}) → excursión ${r.codigo}`);
    return { cotizacion: await detalle(env, id), excursion_id: r.id };
  }
  /** El cliente aceptó por WhatsApp: quien cotiza marca los extras que pidió. */
  async function marcarExtras(env, yo, id, b) {
    const c = await detalle(env, id);
    if (c.excursion_id) throw new ErrorApi('Ya se convirtió en excursión: los extras se cambian en la excursión.');
    const d = c.datos; d.extras_elegidos = (d.extras || []).filter(e => (Array.isArray(b.extras) ? b.extras.map(String) : []).includes(e.id)).map(e => e.id);
    await env.DB.prepare('UPDATE cotizaciones SET datos=?, actualizado_en=?, seq=? WHERE id=?').bind(JSON.stringify(d), ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'cot_extras', `${c.codigo} · el cliente pidió: ${extrasElegidos(d).map(e => e.nombre).join(', ') || 'ningún extra'}`);
    return esMando(yo) ? detalleAdmin(env, id) : paraOperador(await detalle(env, id));
  }
  async function eliminar(env, yo, id) {
    exigirMando(yo);
    const c = await detalle(env, id);
    if (c.excursion_id) throw new ErrorApi('Ya se convirtió en excursión: no se puede eliminar.');
    await env.DB.prepare('DELETE FROM cotizaciones WHERE id=?').bind(id).run();
    if (sol) await sol.desenlazar(env, id);
    await auditar(env, yo.nombre, 'cot_eliminar', c.codigo);
    return { id, eliminada: true };
  }
  async function publica(env, tok) {
    const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE token=?').bind(String(tok || '').toLowerCase()).first();
    if (!c) throw new ErrorApi('Cotización no encontrada.', 'NO_EXISTE', 404);
    const s = salida(c), wa = await env.DB.prepare("SELECT valor FROM config WHERE clave='whatsapp_empresa'").first();
    // Al cliente solo el precio y lo que incluye: nunca el desglose de costos ni el margen.
    const pax = s.datos.pasajeros, pp = (v) => pax ? Math.round(v / pax * 100) / 100 : null, tramos = s.datos.modalidad === 'solo_ida' || s.datos.ida_vuelta === false ? 1 : 2;
    const pt = (v) => pax ? Math.round(v / pax / tramos * 100) / 100 : null;
    const SV = serviciosPara(s.datos.perfil);
    const planes = [{ clave: 'estandar', nombre: SERVICIOS.estandar.nombre, precio: s.precio_final, por_pasajero: pp(s.precio_final), por_tramo: pt(s.precio_final), incluye: SV.estandar.incluye }];
    if (s.precio_final_premium) planes.push({ clave: 'premium', nombre: SERVICIOS.premium.nombre, precio: s.precio_final_premium, por_pasajero: pp(s.precio_final_premium), por_tramo: pt(s.precio_final_premium), incluye: SV.premium.incluye });
    return { codigo: s.codigo, tipo: TIPOS[s.tipo], cliente: s.cliente, origen: s.origen, destino: s.destino, fecha_servicio: s.fecha_servicio, fecha_retorno: s.datos.fecha_retorno || null, ida_vuelta: s.datos.ida_vuelta, modalidad: s.datos.modalidad || null, horas_tramo: s.resultado.horas_tramo || null,
      dias: s.datos.dias, noches: s.datos.noches, pasajeros: pax, horas_espera: s.datos.horas_espera, horas_manejo: s.resultado.horas_manejo || null, precio: s.precio_final,
      por_pasajero: pp(s.precio_final), tramos, incluye: s.incluye, planes, todos: planes.length > 1 ? SV.premium.incluye : SV.estandar.incluye, adelanto_pct: s.adelanto_pct, plan_elegido: s.plan_elegido || null, notas: s.notas, valida_hasta: s.valida_hasta,
      vencida: s.vencida, estado: s.estado, politica_espera: s.politica_espera, whatsapp: wa ? tel(wa.valor) : '', preferido: sol ? await sol.preferenciaDe(env, c.id) : null,
      extras: planes.length > 1 ? [] : (s.datos.extras || []).map(({ costo, tarea, sugerido, desde_dias, ...e }) => ({ ...e, descripcion: detalleExtra(e) })), extras_elegidos: s.datos.extras_elegidos || [], precio_acordado: s.precio_acordado };
  }


  /** El cliente elige Estándar o Premium desde su enlace. Queda registrado y la cotización pasa a «aceptada». */
  async function elegir(env, tok, b) {
    const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE token=?').bind(String(tok || '').toLowerCase()).first();
    if (!c) throw new ErrorApi('Cotización no encontrada.', 'NO_EXISTE', 404);
    const s = salida(c);
    if (s.excursion_id) throw new ErrorApi('Esta cotización ya fue confirmada. Escribe a Villa Azul para cualquier cambio.');
    if (s.vencida) throw new ErrorApi('Esta cotización ya venció. Pide una nueva a Villa Azul.');
    const plan = b.plan === 'premium' && c.precio_final_premium ? 'premium' : 'estandar';
    // Extras: solo los que se ofrecieron, con el precio guardado (nunca el que mande el celular).
    const d = s.datos; d.extras_elegidos = plan === 'estandar' && Array.isArray(b.extras) ? (d.extras || []).filter(e => b.extras.map(String).includes(e.id)).map(e => e.id) : [];
    await env.DB.prepare("UPDATE cotizaciones SET plan_elegido=?, datos=?, elegido_en=?, estado='aceptada', actualizado_en=?, seq=? WHERE id=?").bind(plan, JSON.stringify(d), ahoraLima(), ahoraLima(), await reservarSeq(env, 1), c.id).run();
    const ex = extrasElegidos(d), txt = SERVICIOS[plan].nombre + (ex.length ? ' + ' + ex.map(e => e.nombre).join(' + ') : ''), total = plan === 'premium' ? s.precio_final_premium : r2s(num(s.precio_final) + sumaExtras(d));
    await auditar(env, 'cliente', 'cot_elegir', `${s.codigo} · eligió ${txt} · ${soles(total)}`);
    await avisar(env, { tipo: 'aceptacion', para: 'todos', titulo: `${s.cliente || 'El cliente'} aceptó ${s.codigo}: ${txt}`, ir: 'cotizador:' + c.id,
      detalle: `${TIPOS[s.tipo]} ${s.origen} → ${s.destino} · ${soles(total)}${s.creado_por ? ' · cotizó ' + s.creado_por : ''}` });
    return publica(env, tok);
  }
  /* ═════════ Calculador de kilómetros ═════════
     1) Rutas ya conocidas (las que guardaste o cotizaste antes).  2) OpenStreetMap: busca los lugares (Nominatim) y traza la ruta (OSRM).
     Gratis y sin clave. Cada lugar se busca una sola vez y queda guardado. */
  async function geocodificar(env, lugar) {
    const k = String(lugar).trim().toLowerCase();
    const g = await env.DB.prepare('SELECT * FROM geocodes WHERE lugar=?').bind(k).first();
    if (g) return g;
    const url = (env.GEO_URL || 'https://nominatim.openstreetmap.org') + '/search?format=json&limit=1&countrycodes=pe&accept-language=es&q=' + encodeURIComponent(lugar + ', Perú');
    let r;
    try { r = await fetch(url, { headers: { 'User-Agent': 'VillaAzul-Cotizador/1.0 (villazul.telemetryx.pe)' } }); }
    catch (e) { throw new ErrorApi('No se pudo consultar el mapa en este momento. Escribe los km a mano.'); }
    if (!r.ok) throw new ErrorApi('El buscador de lugares no respondió. Escribe los km a mano.');
    const j = await r.json().catch(() => []);
    if (!j.length) throw new ErrorApi(`No encontré «${lugar}» en el mapa. Escríbelo más completo (ej.: «Huaraz, Áncash») o pon los km a mano.`, 'NO_EXISTE', 404);
    const fila = { lugar: k, lat: Number(j[0].lat), lon: Number(j[0].lon), nombre: String(j[0].display_name || lugar).slice(0, 160) };
    await env.DB.prepare('INSERT OR REPLACE INTO geocodes (lugar, lat, lon, nombre, creado_en) VALUES (?,?,?,?,?)').bind(fila.lugar, fila.lat, fila.lon, fila.nombre, ahoraLima()).run();
    return fila;
  }
  async function distancia(env, b) {
    const o = texto(b.origen, 80), d = texto(b.destino, 80);
    if (!o || !d) throw new ErrorApi('Escribe origen y destino.');
    const maps = 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + encodeURIComponent(o + ', Perú') + '&destination=' + encodeURIComponent(d + ', Perú');
    const par = await parametros(env), vel = num(par.velocidad_promedio) || 31;
    const conocida = await env.DB.prepare('SELECT * FROM rutas_km WHERE clave=?').bind(claveRuta(o, d)).first();
    if (conocida) return { km: conocida.km, peajes_ida: conocida.peajes_ida || 0, peajes_vuelta: conocida.peajes_vuelta || 0, trocha: conocida.trocha == null ? null : !!conocida.trocha, horas: Math.round(conocida.km / vel * 10) / 10, fuente: 'guardada', maps };
    const inversa = await env.DB.prepare('SELECT * FROM rutas_km WHERE clave=?').bind(claveRuta(d, o)).first();
    if (inversa) return { km: inversa.km, peajes_ida: inversa.peajes_vuelta || 0, peajes_vuelta: inversa.peajes_ida || 0, trocha: inversa.trocha == null ? null : !!inversa.trocha, horas: Math.round(inversa.km / vel * 10) / 10, fuente: 'guardada', maps };
    const [a, z] = [await geocodificar(env, o), await geocodificar(env, d)];
    let r;
    try { r = await fetch((env.RUTA_URL || 'https://router.project-osrm.org') + `/route/v1/driving/${a.lon},${a.lat};${z.lon},${z.lat}?overview=false`, { headers: { 'User-Agent': 'VillaAzul-Cotizador/1.0' } }); }
    catch (e) { throw new ErrorApi('No se pudo trazar la ruta en este momento. Escribe los km a mano.'); }
    if (!r.ok) throw new ErrorApi('El trazador de rutas no respondió. Escribe los km a mano.');
    const j = await r.json();
    if (!j.routes || !j.routes.length) throw new ErrorApi('No encontré una ruta por carretera entre esos lugares. Escribe los km a mano.');
    const km = Math.round(j.routes[0].distance / 100) / 10;
    // El tiempo se estima con tu velocidad real (186 km en 6 h), no con la del mapa, que no conoce las curvas de la sierra.
    return { km, peajes_ida: null, peajes_vuelta: null, horas: Math.round(km / vel * 10) / 10, horas_mapa: Math.round(j.routes[0].duration / 360) / 10, fuente: 'mapa', origen_nombre: a.nombre, destino_nombre: z.nombre, maps };
  }

  /* ═════════ Liquidación de un viaje (solo administradores) ═════════
     Lo cotizado frente a lo real (odómetro, diésel, cobros) y el pago del conductor con los parámetros vigentes.
     Lo que no sale de los datos (trocha, horas de espera, aguja del tanque…) se ajusta aquí y se guarda con la excursión. */
  async function liquidacion(env, excId, b, yo) {
    const e = await env.DB.prepare('SELECT * FROM excursiones WHERE id=?').bind(excId).first();
    if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    if (b && b.vincular) {
      const c = await env.DB.prepare('SELECT id, excursion_id, numero FROM cotizaciones WHERE id=?').bind(String(b.vincular)).first();
      if (!c) throw new ErrorApi('Cotización no encontrada', 'NO_EXISTE', 404);
      if (c.excursion_id && c.excursion_id !== excId) throw new ErrorApi('Esa cotización ya está unida a otro viaje.');
      await env.DB.prepare("UPDATE cotizaciones SET excursion_id=NULL, seq=? WHERE excursion_id=? AND id<>?").bind(await reservarSeq(env, 1), excId, c.id).run();
      await env.DB.prepare("UPDATE cotizaciones SET excursion_id=?, estado='aceptada', actualizado_en=?, seq=? WHERE id=?").bind(excId, ahoraLima(), await reservarSeq(env, 1), c.id).run();
      await auditar(env, yo.nombre, 'liq_vincular', `${e.titulo} ← COT-${String(c.numero).padStart(4, '0')}`);
    }
    if (b && b.conductor_id) {
      if (!await env.DB.prepare('SELECT 1 FROM usuarios WHERE id=?').bind(String(b.conductor_id)).first()) throw new ErrorApi('Conductor no encontrado');
      let L0 = {}; try { L0 = JSON.parse(e.liquidacion || '{}') || {}; } catch (x) { L0 = {}; }
      L0.conductor_id = String(b.conductor_id);
      await env.DB.prepare('UPDATE excursiones SET liquidacion=?, seq=? WHERE id=?').bind(JSON.stringify(L0), await reservarSeq(env, 1), excId).run();
      e.liquidacion = JSON.stringify(L0);
    }
    if (b && b.acordado !== undefined) {
      let L0 = {}; try { L0 = JSON.parse(e.liquidacion || '{}') || {}; } catch (x) { L0 = {}; }
      if (b.acordado === null || b.acordado === '') delete L0.acordado; else L0.acordado = Math.max(0, Math.round(num(b.acordado) * 100) / 100);
      await env.DB.prepare('UPDATE excursiones SET liquidacion=?, seq=? WHERE id=?').bind(JSON.stringify(L0), await reservarSeq(env, 1), excId).run();
      await auditar(env, yo.nombre, 'liq_acuerdo', `${e.titulo} · pago acordado S/ ${L0.acordado ?? 'por tarifa'}`);
      e.liquidacion = JSON.stringify(L0);
    }
    if (b && b.ajustes) {
      const a = b.ajustes, L = {}, sn = (v) => v === true || v === 'true' || v === 1 || v === '1';
      if (a.trocha !== undefined && a.trocha !== null) L.trocha = sn(a.trocha);
      if (a.nocturno !== undefined && a.nocturno !== null) L.nocturno = sn(a.nocturno);
      if (Array.isArray(a.comidas)) L.comidas = a.comidas.slice(0, 31).map(x => ({ dia: /^\d{4}-\d{2}-\d{2}$/.test(String(x && x.dia)) ? x.dia : '',
        desayuno: sn(x && x.desayuno), almuerzo: sn(x && x.almuerzo), cena: sn(x && x.cena) }));
      ['horas_espera', 'dias', 'noches', 'galones', 'aguja', 'bono_extra', 'horas_tramo_real', 'gasto_comidas', 'bono_espera'].forEach(k => { if (a[k] !== undefined && a[k] !== null && a[k] !== '') L[k] = Math.max(0, Math.round(num(a[k]) * 100) / 100); });
      if (L.aguja !== undefined && L.aguja > 1) throw new ErrorApi('La aguja va de 0 (nada) a 1 (tanque lleno).');
      { let L0 = {}; try { L0 = JSON.parse(e.liquidacion || '{}') || {}; } catch (x) { L0 = {}; } if (L0.acordado !== undefined) L.acordado = L0.acordado; if (L0.conductor_id) L.conductor_id = L0.conductor_id; }
      await env.DB.prepare('UPDATE excursiones SET liquidacion=?, seq=? WHERE id=?').bind(JSON.stringify(L), await reservarSeq(env, 1), excId).run();
      await auditar(env, yo.nombre, 'liq_ajustes', `${e.titulo} · ${JSON.stringify(L)}`);
      e.liquidacion = JSON.stringify(L);
    }
    const par = await parametros(env), r2 = (x) => Math.round(x * 100) / 100;
    const cot = await env.DB.prepare('SELECT * FROM cotizaciones WHERE excursion_id=?').bind(excId).first();
    const cd = cot ? JSON.parse(cot.datos || '{}') : {}, cr = cot ? JSON.parse(cot.resultado || '{}') : null;
    let aj = {}; try { aj = JSON.parse(e.liquidacion || '{}') || {}; } catch (x) { aj = {}; }
    const movs = (await env.DB.prepare('SELECT * FROM exc_movimientos WHERE excursion_id=? AND COALESCE(anulado,0)=0').bind(excId).all()).results;
    const suma = (f) => r2(movs.filter(f).reduce((s, m) => s + num(m.monto), 0));
    const linea = (cr && cr.estandar ? cr.estandar.lineas : []).reduce((o, l) => { o[l.clave] = l.monto; return o; }, {});
    const dE = (x) => x ? new Date(String(x).slice(0, 10) + 'T00:00:00Z') : null, s0 = dE(e.salida), s1 = dE(e.retorno);
    const diasExc = s0 && s1 && s1 >= s0 ? Math.round((s1 - s0) / 864e5) + 1 : 1;
    const de = (k, v) => aj[k] !== undefined ? aj[k] : v;

    // Entradas: primero lo ajustado aquí, luego la cotización, luego lo que dice la excursión.
    const kmReal = num(e.km_fin) > num(e.km_inicio) && num(e.km_inicio) ? num(e.km_fin) - num(e.km_inicio) : null;
    const kmCot = cr ? num(cr.km) : 0, km = kmReal ?? kmCot;
    const trocha = !!de('trocha', !!cd.trocha), nocturno = !!de('nocturno', !!(cr && cr.nocturno));
    const horas = num(de('horas_espera', num(cd.horas_espera))), dias = Math.max(1, num(de('dias', cr ? num(cr.dias) : diasExc)));
    const noches = num(de('noches', cr ? num(cr.noches) : Math.max(0, diasExc - 1)));
    const bonoExtra = num(de('bono_extra', num(linea.bono)));
    const fC = trocha ? num(par.trocha_factor_conductor) || 1 : 1, fD = trocha ? num(par.trocha_factor_desgaste) || 1 : 1;
    // Comidas: lo marcado aquí; si no, según el horario del viaje (cotización o fechas de la excursión).
    const hT = num(aj.horas_tramo_real) || (cr ? num(cr.horas_tramo) : 0);
    const md0 = cd.modalidad || (cd.ida_vuelta === false ? 'solo_ida' : 'ida_vuelta');
    const comidas = Array.isArray(aj.comidas) ? aj.comidas
      : comidasPorHorario({ modalidad: md0, fecha_servicio: cd.fecha_servicio || cot && cot.fecha_servicio || e.salida, fecha_retorno: cd.fecha_retorno || (cot ? null : e.retorno) }, cot ? hT : 0, dias);
    const comi = montoComidas(par, comidas), gastoCom = aj.gasto_comidas !== undefined ? num(aj.gasto_comidas) : null;
    const repone = gastoCom !== null ? r2(Math.max(0, gastoCom - comi.monto)) : 0;
    // Bono de espera: por tarifa (horas × S/ por hora) o el monto que el administrador escriba para este viaje.
    const bonoTarifa = bonoEspera(par, horas), bonoE = aj.bono_espera !== undefined ? num(aj.bono_espera) : bonoTarifa;

    // Diésel: lo escrito, o la aguja del tanque, o los galones de las boletas.
    const comb = movs.filter(m => m.tipo === 'egreso' && m.categoria === 'combustible');
    const galMov = r2(comb.reduce((s, m) => s + num(m.galones), 0)), solesMov = suma(m => m.tipo === 'egreso' && m.categoria === 'combustible');
    const precioGal = galMov ? r2(solesMov / galMov) : num(cd.precio_galon) || num(par.precio_galon);
    let galones = null, galFuente = '';
    if (aj.galones !== undefined) { galones = num(aj.galones); galFuente = 'escrito en la liquidación'; }
    else if (aj.aguja !== undefined) { galones = r2(num(aj.aguja) * num(par.tanque_litros) / 3.785); galFuente = `aguja: ${Math.round(num(aj.aguja) * 100)} % de ${num(par.tanque_litros)} L`; }
    else if (galMov) { galones = galMov; galFuente = 'galones de las boletas de combustible'; }

    // Pago del conductor con los parámetros vigentes.
    const cond = [
      ['km', 'Por km manejado', r2(km * num(par.conductor_km) * fC), `${km} km × S/ ${num(par.conductor_km)}` + (fC !== 1 ? ` × ${fC} (trocha)` : '')],
      ['espera', 'Bono de espera', bonoE, aj.bono_espera !== undefined ? `Ajustado a mano · por tarifa serían S/ ${bonoTarifa} (${horas} h × S/ ${num(par.bono_espera_hora)})` : `${horas} h × S/ ${num(par.bono_espera_hora)}`],
      ['nocturno', 'Bono nocturno', nocturno ? r2(num(par.bono_nocturno)) : 0, 'Llega a la base entre las 22:00 y las 05:00'],
      ['comidas', 'Comidas', comi.monto, comi.detalle],
      ['reposicion', 'Reposición de comidas', repone, `Gastó S/ ${gastoCom} y se le asignaron S/ ${comi.monto}: se le repone la diferencia`],
      ['hospedaje', 'Hospedaje', r2(noches * num(par.hospedaje_noche)), `${noches} noche(s) × S/ ${num(par.hospedaje_noche)}`],
      ['extra', 'Bono adicional', bonoExtra, 'Escrito a mano'],
    ].filter(x => x[2] > 0).map(([clave, concepto, monto, detalle]) => ({ clave, concepto, monto, detalle }));
    const tarifa = r2(cond.reduce((s, x) => s + x.monto, 0));
    // Pago acordado: si el administrador saldó el viaje con otro monto, la diferencia queda a la vista como ajuste.
    if (aj.acordado !== undefined && r2(aj.acordado - tarifa) !== 0) cond.push({ clave: 'acuerdo', concepto: 'Ajuste por acuerdo', monto: r2(aj.acordado - tarifa), detalle: `Por tarifa: S/ ${tarifa} · acordado: S/ ${aj.acordado}` });
    const pagoTotal = aj.acordado !== undefined ? r2(aj.acordado) : tarifa;
    const pagado = suma(m => m.tipo === 'egreso' && ['pago_conductor', 'alimentacion_conductor', 'hospedaje_conductor'].includes(m.categoria));

    // Costo real del viaje.
    const yaContados = ['combustible', 'pago_conductor', 'alimentacion_conductor', 'hospedaje_conductor'];
    const otros = movs.filter(m => m.tipo === 'egreso' && !yaContados.includes(m.categoria));
    const diesel = galones !== null ? r2(galones * precioGal) : solesMov;
    const costo = [
      ['diesel', 'Diésel consumido', diesel, galones !== null ? `${galones} gal × S/ ${precioGal} · ${galFuente}` : (solesMov ? 'Lo cargado según boletas (anota la aguja para el consumo real)' : 'Sin dato: anota la aguja o los galones')],
      ['conductor', 'Pago del conductor', pagoTotal, 'Detalle en «Pago del conductor»'],
      ['desgaste', 'Desgaste de la van', r2(km * num(par.desgaste_km) * fD), `${km} km × S/ ${num(par.desgaste_km)}` + (fD !== 1 ? ` × ${fD} (trocha)` : '')],
      ['emergencia', 'Fondo de emergencia', r2(num(par.emergencia) * (cr ? num(cr.salidas) || 1 : 1)), 'Reserva para imprevistos'],
      ...otros.map(m => [m.id, (m.categoria || 'gasto').replace(/_/g, ' '), r2(num(m.monto)), m.descripcion || 'Registrado en el viaje']),
    ].filter(x => x[2] > 0).map(([clave, concepto, monto, detalle]) => ({ clave, concepto, monto, detalle }));
    const costoTotal = r2(costo.reduce((s, x) => s + x.monto, 0));
    const cobrado = suma(m => m.tipo === 'ingreso'), pactado = e.tipo === 'contrato' ? num(e.monto_contrato) : cobrado;
    // Lo que el cliente pagó por encima de lo pactado (propina, redondeo, «está justo»).
    const adicional = e.tipo === 'contrato' && pactado ? r2(Math.max(0, cobrado - pactado)) : suma(m => m.tipo === 'ingreso' && m.categoria === 'pago_adicional');
    const base = cobrado || pactado, utilidad = r2(base - costoTotal);

    const vel = trocha ? num(par.trocha_velocidad) : num(par.velocidad_promedio);
    const comp = [
      ['Km recorridos', kmCot || null, kmReal, 'km'],
      ['Horas de manejo por tramo', cr ? num(cr.horas_tramo) || null : null, aj.horas_tramo_real ?? null, 'h'],
      ['Galones de diésel', cr ? num(cr.galones) || null : null, galones, 'gal'],
      ['Rendimiento', cr && cr.galones ? r2(num(cr.km) / num(cr.galones)) : null, galones && km ? r2(km / galones) : null, 'km/gal'],
      ['Costo del viaje', cot ? num(cot.costo) : null, costoTotal, 'S/'],
      ['Precio', cot ? num(cot.precio_final) : null, base, 'S/'],
    ];
    // Conductor del viaje: el elegido al pagar; si no, el operador que cotizó y vendió; si no, el primer operador activo.
    const usuarios = (await env.DB.prepare("SELECT id, nombre, rol, activo, nombre_completo, dni, telefono, licencia FROM usuarios").all()).results;
    const vendedor = cot ? usuarios.find(u => u.id === cot.creado_por_id) : null;
    const chofer = usuarios.find(u => u.id === aj.conductor_id) || (vendedor && vendedor.rol === 'operador' ? vendedor : null) || usuarios.find(u => u.rol === 'operador' && u.activo);
    const libres = cot ? [] : (await env.DB.prepare("SELECT id, numero, cliente, origen, destino, fecha_servicio, precio_final FROM cotizaciones WHERE excursion_id IS NULL AND estado <> 'rechazada' ORDER BY creado_en DESC LIMIT 30").all()).results
      .map(c => ({ id: c.id, codigo: 'COT-' + String(c.numero).padStart(4, '0'), texto: `${c.origen} → ${c.destino}${c.cliente ? ' · ' + c.cliente : ''}${c.fecha_servicio ? ' · ' + String(c.fecha_servicio).slice(0, 10) : ''} · S/ ${c.precio_final}` }));
    return {
      cotizacion: cot ? { id: cot.id, codigo: 'COT-' + String(cot.numero).padStart(4, '0'), precio: num(cot.precio_final), costo: num(cot.costo), cotizo: vendedor ? vendedor.nombre : cot.creado_por || null } : null, libres,
      chofer: chofer ? { id: chofer.id, nombre: chofer.nombre, nombre_completo: chofer.nombre_completo || '', dni: chofer.dni || '', telefono: chofer.telefono || '', licencia: chofer.licencia || '' } : null,
      operadores: usuarios.filter(u => u.rol === 'operador' && u.activo).map(u => ({ id: u.id, nombre: u.nombre })),
      entradas: { km, km_real: kmReal, km_cotizado: kmCot, trocha, nocturno, horas_espera: horas, dias, noches, bono_extra: bonoExtra, galones, gal_fuente: galFuente, precio_galon: precioGal,
        aguja: aj.aguja ?? null, horas_tramo_real: aj.horas_tramo_real ?? null, comidas, comidas_marcadas: Array.isArray(aj.comidas), gasto_comidas: gastoCom, comidas_monto: comi.monto, reposicion: repone, bono_espera: aj.bono_espera ?? null, bono_espera_tarifa: bonoTarifa, horas_tramo_param: vel && cr ? r2(num(cd.km_ida) / vel) : null, ajustado: Object.keys(aj) },
      conductor: { lineas: cond, total: pagoTotal, tarifa, acordado: aj.acordado ?? null, pagado, pendiente: r2(Math.max(0, pagoTotal - pagado)) },
      costo: { lineas: costo, total: costoTotal }, cobrado, pactado, adicional, utilidad, margen: base ? Math.round(utilidad / base * 100) : 0, comparativo: comp,
      parametros: { conductor_km: num(par.conductor_km), bono_espera_hora: num(par.bono_espera_hora), bono_nocturno: num(par.bono_nocturno), tanque_litros: num(par.tanque_litros),
        comidas: COMIDAS.map(([c, t]) => ({ clave: c, nombre: t, precio: num(par['comida_' + c]) })) },
    };
  }

  /** Para el operador: el servidor calcula y devuelve solo cifras básicas (recorrido y precios). */
  async function calcularOperador(env, b) {
    const d = datosDe(b); delete d.bono;
    if (!(d.km_ida > 0)) return { km: 0 };
    const par = await parametros(env), r = calcular(par, d);
    const plan = (pl, nv) => ({ precio: pl.precios[nv], por_pasajero: pl.por_pasajero ? pl.por_pasajero[nv] : null, por_tramo: pl.por_tramo ? pl.por_tramo[nv] : null });
    // El operador ve dos precios del Estándar (recomendado y alto) y elige cuál enviar. Sin costos ni porcentajes.
    return { km: r.km, km_vacios: r.km_vacios, pct_vacios: r.pct_vacios, salidas: r.salidas, tramos: r.tramos, dias: r.dias, noches: r.noches, horas_manejo: r.horas_manejo,
      pasajeros: r.pasajeros, precio_galon: r.precio_galon, opciones: { alto: plan(r.estandar, 'alto'), recomendado: plan(r.estandar, 'recomendado'), descuento: plan(r.estandar, 'descuento') },
      premium: null, extras: num(par.extras_activo) === 1 ? extrasDe(await catalogoExtras(env), r, par).map(sinCosto) : [] };
  }
  async function verOperador(env) {
    const v = await verParametros(env);
    // Solo lo necesario para cotizar: lugares, rutas conocidas y el precio del diésel para verificarlo.
    return { operador: true, lugares: v.lugares, rutas: v.rutas.map(r => ({ origen: r.origen, destino: r.destino, km: r.km, peajes_ida: r.peajes_ida, peajes_vuelta: r.peajes_vuelta, trocha: r.trocha })),
      tarifas: v.tarifas, precio_galon: v.parametros.precio_galon, velocidad_promedio: v.parametros.velocidad_promedio,
      espera: { tolerancia_min: v.parametros.tolerancia_min, espera_extra_hora: v.parametros.espera_extra_hora }, trocha_velocidad: v.parametros.trocha_velocidad,
      premium_activo: 0, extras_activo: v.parametros.extras_activo };
  }
  async function rutas(env, yo, req, url, crearExcursion) {
    const p = url.pathname, m = req.method, cuerpo = () => req.json().catch(() => ({}));
    if (!p.startsWith('/api/cotiza')) return undefined;
    if (!esMando(yo)) {
      // El operador cotiza: ve y edita SUS cotizaciones, sin parámetros, costos ni pago del conductor.
      if (p === '/api/cotizador' && m === 'GET') return verOperador(env);
      if (p === '/api/cotizador/calcular' && m === 'POST') return calcularOperador(env, await cuerpo());
      if (p === '/api/cotizador/distancia' && m === 'POST') return distancia(env, await cuerpo());
      if (p === '/api/cotizaciones' && m === 'GET') { const L = (await listar(env)).cotizaciones.filter(c => c.creado_por_id === yo.id).map(paraOperador); return { cotizaciones: L, resumen: { mes_n: L.length } }; }
      if (p === '/api/cotizaciones' && m === 'POST') return guardar(env, yo, null, await cuerpo());
      const ro = p.match(/^\/api\/cotizaciones\/([\w-]+)(?:\/(estado|extras))?$/);
      if (ro) {
        const c = await detalle(env, ro[1]);
        if (c.creado_por_id !== yo.id) throw new ErrorApi('Esa cotización no es tuya.', 'SIN_PERMISO', 403);
        if (!ro[2] && m === 'GET') return paraOperador(c);
        if (!ro[2] && m === 'PATCH') return guardar(env, yo, ro[1], await cuerpo());
        if (ro[2] === 'estado' && m === 'POST') return cambiarEstado(env, yo, ro[1], await cuerpo());
        if (ro[2] === 'extras' && m === 'POST') return marcarExtras(env, yo, ro[1], await cuerpo());
      }
      throw new ErrorApi('Esa acción la hace un administrador.', 'SIN_PERMISO', 403);
    }
    if (p === '/api/cotizador' && m === 'GET') return verParametros(env);
    if (p === '/api/cotizador/calcular' && m === 'POST') return calcularOperador(env, await cuerpo());
    if (p === '/api/cotizador/parametros' && m === 'POST') return guardarParametros(env, yo, await cuerpo());
    if (p === '/api/cotizador/distancia' && m === 'POST') return distancia(env, await cuerpo());
    if (p === '/api/cotizaciones' && m === 'GET') return listar(env);
    if (p === '/api/cotizaciones' && m === 'POST') return guardar(env, yo, null, await cuerpo());
    const lq = p.match(/^\/api\/cotizador\/liquidacion\/([\w-]+)$/);
    if (lq && m === 'GET') return liquidacion(env, lq[1]);
    if (lq && m === 'POST') { const b = await cuerpo(); return liquidacion(env, lq[1], b, yo); }
    const r = p.match(/^\/api\/cotizaciones\/([\w-]+)(?:\/(estado|convertir|extras))?$/);
    if (r && !r[2] && m === 'GET') return detalleAdmin(env, r[1]);
    if (r && !r[2] && m === 'PATCH') return guardar(env, yo, r[1], await cuerpo());
    if (r && !r[2] && m === 'DELETE') return eliminar(env, yo, r[1]);
    if (r && r[2] === 'estado' && m === 'POST') return cambiarEstado(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'extras' && m === 'POST') return marcarExtras(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'convertir' && m === 'POST') return convertir(env, yo, r[1], crearExcursion, await cuerpo());
    return undefined;
  }
  return { rutas, publica, elegir };
}
