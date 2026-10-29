/**
 * Villa Azul · Cotizador de excursión, taxi/expreso y transporte privado (v4.0)
 * Calcula con los costos reales de la empresa cuando existen y con supuestos editables cuando no.
 */
import { calcular, PARAMETROS_BASE, SERVICIOS, MODALIDADES, esBase, politicaEspera } from '../public/js/cotizar.mjs';

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
    datos: (({ bono, otros, ...resto }) => resto)(c.datos || {}), politica_espera: c.politica_espera,
    resultado: { km: c.resultado.km, km_vacios: c.resultado.km_vacios || 0, salidas: c.resultado.salidas || 1, dias: c.resultado.dias, noches: c.resultado.noches, horas_manejo: c.resultado.horas_manejo, pasajeros: c.resultado.pasajeros } });
  const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
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
    return { parametros: await parametros(env), base: PARAMETROS_BASE, sugeridos: await sugeridos(env), rutas, lugares, tarifas, whatsapp_empresa: wa ? wa.valor : '' };
  }
  async function guardarParametros(env, yo, b) {
    exigirMando(yo);
    const st = [], cambios = [];
    for (const k of CLAVES) if (b[k] !== undefined && b[k] !== '') {
      const v = num(b[k]); if (v < 0 || v > 100000) throw new ErrorApi(`Valor no válido para ${k}`);
      st.push(env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind('cot_' + k, String(v), await reservarSeq(env, 1))); cambios.push(`${k}=${v}`);
    }
    if (b.whatsapp_empresa !== undefined) { st.push(env.DB.prepare('INSERT OR REPLACE INTO config (clave, valor, seq) VALUES (?,?,?)').bind('whatsapp_empresa', tel(b.whatsapp_empresa), await reservarSeq(env, 1))); cambios.push('whatsapp'); }
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
    return { tipo, modalidad, km_ida: num(b.km_ida), ida_vuelta: modalidad !== 'solo_ida', km_base_origen: b1, km_destino_base: b2,
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
      delete b.precio_final; delete b.precio_final_premium; delete b.nivel; delete b.bono;
      if (id) { const prev = await env.DB.prepare('SELECT creado_por_id, excursion_id, estado FROM cotizaciones WHERE id=?').bind(id).first();
        if (!prev || prev.creado_por_id !== yo.id) throw new ErrorApi('Solo puedes editar tus propias cotizaciones.', 'SIN_PERMISO', 403);
        if (prev.estado === 'aceptada') throw new ErrorApi('El cliente ya eligió: pide a un administrador cualquier cambio.'); }
    }
    const d = datosDe(b), origen = texto(b.origen, 60), destino = texto(b.destino, 60);
    if (!origen || !destino) throw new ErrorApi('Escribe origen y destino.');
    if (!(d.km_ida > 0)) throw new ErrorApi('Escribe los kilómetros de ida.');
    const par = await parametros(env), res = calcular(par, d), nivel = ['minimo', 'recomendado', 'alto'].includes(b.nivel) ? b.nivel : 'recomendado';
    const final = b.precio_final !== undefined && b.precio_final !== '' ? Math.round(num(b.precio_final) * 100) / 100 : res.estandar.precios[nivel];
    let finalP = b.precio_final_premium !== undefined && b.precio_final_premium !== '' ? Math.round(num(b.precio_final_premium) * 100) / 100 : res.premium.precios[nivel];
    // Si subiste a mano el Estándar y no tocaste el Premium, el Premium sube igual: Estándar + lo que cuestan los extras.
    if ((b.precio_final_premium === undefined || b.precio_final_premium === '') && finalP < final) finalP = Math.ceil((final + res.premium.costo - res.estandar.costo) / 10) * 10;
    if (!(final > 0) || !(finalP > 0)) throw new ErrorApi('Precio final no válido.');
    if (finalP < final) throw new ErrorApi('El Premium no puede costar menos que el Estándar.');
    const ahora = ahoraLima(), valida = new Date(Date.now() - 5 * 3600000 + num(par.validez_dias) * 864e5).toISOString().slice(0, 10);
    const PARA_CLIENTE = { combustible: 'Combustible', peajes: 'Peajes', conductor: 'Conductor profesional', viaticos: 'Alimentación del conductor', hospedaje: 'Hospedaje del conductor', cochera: 'Cochera de la van' };
    const incluye = res.lineas.filter(l => PARA_CLIENTE[l.clave] || /^otro/.test(l.clave)).map(l => PARA_CLIENTE[l.clave] || l.concepto);
    const fila = { tipo: d.tipo, cliente: texto(b.cliente, 80), cliente_tel: tel(b.cliente_tel), origen, destino, fecha_servicio: texto(b.fecha_servicio, 16),
      datos: JSON.stringify(d), parametros: JSON.stringify(par), resultado: JSON.stringify(res), costo: res.costo, precio_minimo: res.precios.minimo, precio_recomendado: res.precios.recomendado,
      precio_premium: res.precios.premium, precio_final: final, precio_final_premium: finalP, notas: texto(b.notas, 500), incluye: JSON.stringify(incluye), actualizado_en: ahora };
    // La distancia y los peajes de la ruta se recuerdan para la próxima cotización.
    const rk = env.DB.prepare('INSERT OR REPLACE INTO rutas_km (clave, origen, destino, km, peajes_ida, peajes_vuelta, actualizado_en) VALUES (?,?,?,?,?,?,?)').bind(claveRuta(origen, destino), origen, destino, d.km_ida, d.peajes_ida, d.peajes_vuelta, ahora);
    if (id) {
      const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE id=?').bind(id).first(); if (!c) throw new ErrorApi('Cotización no encontrada', 'NO_EXISTE', 404);
      if (c.estado === 'aceptada' && c.excursion_id) throw new ErrorApi('Ya se convirtió en excursión: edita la excursión.');
      fila.seq = await reservarSeq(env, 1);
      const k = Object.keys(fila);
      await env.DB.batch([env.DB.prepare(`UPDATE cotizaciones SET ${k.map(x => `${x}=?`).join(', ')} WHERE id=?`).bind(...k.map(x => fila[x]), id), rk]);
      await auditar(env, yo.nombre, 'cot_editar', `COT-${String(c.numero).padStart(4, '0')} · S/ ${final}`);
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
        detalle: `${TIPOS[d.tipo]} ${origen} → ${destino}${fila.cliente ? ' · ' + fila.cliente : ''} · Estándar ${soles(final)} · Premium ${soles(finalP)}${diesel}` });
      return paraOperador(await detalle(env, fila.id));
    }
    return detalle(env, fila.id);
  }
  const precioPlan = (c) => c.plan_elegido === 'premium' && c.precio_final_premium ? c.precio_final_premium : c.precio_final;
  const salida = (c) => c && ({ ...c, precio_acordado: precioPlan(c), datos: JSON.parse(c.datos || '{}'), resultado: JSON.parse(c.resultado || '{}'), incluye: JSON.parse(c.incluye || '[]'), parametros: undefined,
    politica_espera: politicaEspera(JSON.parse(c.parametros || '{}'), JSON.parse(c.datos || '{}')),
    codigo: 'COT-' + String(c.numero).padStart(4, '0'), vencida: c.estado !== 'aceptada' && c.valida_hasta && c.valida_hasta < ahoraLima().slice(0, 10) });
  async function detalle(env, id) {
    const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE id=?').bind(id).first(); if (!c) throw new ErrorApi('Cotización no encontrada', 'NO_EXISTE', 404);
    return salida(c);
  }
  async function listar(env) {
    const L = (await env.DB.prepare('SELECT * FROM cotizaciones ORDER BY numero DESC LIMIT 200').all()).results.map(salida);
    const mes = ahoraLima().slice(0, 7), delMes = L.filter(c => String(c.creado_en).slice(0, 7) === mes);
    const dec = L.filter(c => c.estado === 'aceptada' || c.estado === 'rechazada');
    return { cotizaciones: L, resumen: { mes_n: delMes.length, mes_monto: delMes.reduce((s, c) => s + num(c.precio_final), 0),
      aceptadas: L.filter(c => c.estado === 'aceptada').length, monto_aceptado: L.filter(c => c.estado === 'aceptada').reduce((s, c) => s + num(c.precio_acordado), 0),
      premium: L.filter(c => c.plan_elegido === 'premium').length, estandar: L.filter(c => c.plan_elegido === 'estandar').length,
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
      origen: c.origen, destino: c.destino, salida: f.length === 10 ? f + 'T05:00' : f, monto_contrato: c.precio_acordado,
      notas: `Desde ${c.codigo} · Servicio ${SERVICIOS[plan].nombre}: ${SERVICIOS[plan].incluye.join(', ')}. ${c.notas || ''}`.trim(),
      asientos_total: 15, estado: 'borrador',
    });
    await env.DB.prepare("UPDATE cotizaciones SET estado='aceptada', excursion_id=?, actualizado_en=?, seq=? WHERE id=?").bind(r.id, ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'cot_convertir', `${c.codigo} (${SERVICIOS[plan].nombre}) → excursión ${r.codigo}`);
    return { cotizacion: await detalle(env, id), excursion_id: r.id };
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
    const pax = s.datos.pasajeros, pp = (v) => pax ? Math.round(v / pax * 100) / 100 : null;
    const planes = [{ clave: 'estandar', nombre: SERVICIOS.estandar.nombre, precio: s.precio_final, por_pasajero: pp(s.precio_final), incluye: SERVICIOS.estandar.incluye }];
    if (s.precio_final_premium) planes.push({ clave: 'premium', nombre: SERVICIOS.premium.nombre, precio: s.precio_final_premium, por_pasajero: pp(s.precio_final_premium), incluye: SERVICIOS.premium.incluye });
    return { codigo: s.codigo, tipo: TIPOS[s.tipo], cliente: s.cliente, origen: s.origen, destino: s.destino, fecha_servicio: s.fecha_servicio, ida_vuelta: s.datos.ida_vuelta, modalidad: s.datos.modalidad || null, horas_tramo: s.resultado.horas_tramo || null,
      dias: s.datos.dias, noches: s.datos.noches, pasajeros: pax, horas_espera: s.datos.horas_espera, horas_manejo: s.resultado.horas_manejo || null, precio: s.precio_final,
      por_pasajero: pp(s.precio_final), incluye: s.incluye, planes, todos: SERVICIOS.premium.incluye, plan_elegido: s.plan_elegido || null, notas: s.notas, valida_hasta: s.valida_hasta,
      vencida: s.vencida, estado: s.estado, politica_espera: s.politica_espera, whatsapp: wa ? tel(wa.valor) : '', preferido: sol ? await sol.preferenciaDe(env, c.id) : null };
  }


  /** El cliente elige Estándar o Premium desde su enlace. Queda registrado y la cotización pasa a «aceptada». */
  async function elegir(env, tok, b) {
    const c = await env.DB.prepare('SELECT * FROM cotizaciones WHERE token=?').bind(String(tok || '').toLowerCase()).first();
    if (!c) throw new ErrorApi('Cotización no encontrada.', 'NO_EXISTE', 404);
    const s = salida(c);
    if (s.excursion_id) throw new ErrorApi('Esta cotización ya fue confirmada. Escribe a Villa Azul para cualquier cambio.');
    if (s.vencida) throw new ErrorApi('Esta cotización ya venció. Pide una nueva a Villa Azul.');
    const plan = b.plan === 'premium' && c.precio_final_premium ? 'premium' : 'estandar';
    await env.DB.prepare("UPDATE cotizaciones SET plan_elegido=?, elegido_en=?, estado='aceptada', actualizado_en=?, seq=? WHERE id=?").bind(plan, ahoraLima(), ahoraLima(), await reservarSeq(env, 1), c.id).run();
    await auditar(env, 'cliente', 'cot_elegir', `${s.codigo} · eligió ${SERVICIOS[plan].nombre}`);
    await avisar(env, { tipo: 'aceptacion', para: 'todos', titulo: `${s.cliente || 'El cliente'} aceptó ${s.codigo}: servicio ${SERVICIOS[plan].nombre}`, ir: 'cotizador:' + c.id,
      detalle: `${TIPOS[s.tipo]} ${s.origen} → ${s.destino} · ${soles(plan === 'premium' ? s.precio_final_premium : s.precio_final)}${s.creado_por ? ' · cotizó ' + s.creado_por : ''}` });
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
    if (conocida) return { km: conocida.km, peajes_ida: conocida.peajes_ida || 0, peajes_vuelta: conocida.peajes_vuelta || 0, horas: Math.round(conocida.km / vel * 10) / 10, fuente: 'guardada', maps };
    const inversa = await env.DB.prepare('SELECT * FROM rutas_km WHERE clave=?').bind(claveRuta(d, o)).first();
    if (inversa) return { km: inversa.km, peajes_ida: inversa.peajes_vuelta || 0, peajes_vuelta: inversa.peajes_ida || 0, horas: Math.round(inversa.km / vel * 10) / 10, fuente: 'guardada', maps };
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

  /** Para el operador: el servidor calcula y devuelve solo cifras básicas (recorrido y precios). */
  async function calcularOperador(env, b) {
    const d = datosDe(b); delete d.bono;
    if (!(d.km_ida > 0)) return { km: 0 };
    const r = calcular(await parametros(env), d);
    const plan = (pl) => ({ precio: pl.precios.recomendado, por_pasajero: pl.por_pasajero ? pl.por_pasajero.recomendado : null, por_tramo: pl.por_tramo ? pl.por_tramo.recomendado : null });
    return { km: r.km, km_vacios: r.km_vacios, pct_vacios: r.pct_vacios, salidas: r.salidas, tramos: r.tramos, dias: r.dias, noches: r.noches, horas_manejo: r.horas_manejo,
      pasajeros: r.pasajeros, precio_galon: r.precio_galon, planes: { estandar: plan(r.estandar), premium: plan(r.premium) } };
  }
  async function verOperador(env) {
    const v = await verParametros(env);
    // Solo lo necesario para cotizar: lugares, rutas conocidas y el precio del diésel para verificarlo.
    return { operador: true, lugares: v.lugares, rutas: v.rutas.map(r => ({ origen: r.origen, destino: r.destino, km: r.km, peajes_ida: r.peajes_ida, peajes_vuelta: r.peajes_vuelta })),
      tarifas: v.tarifas, precio_galon: v.parametros.precio_galon, velocidad_promedio: v.parametros.velocidad_promedio,
      espera: { tolerancia_min: v.parametros.tolerancia_min, espera_extra_hora: v.parametros.espera_extra_hora, espera_tope_h: v.parametros.espera_tope_h } };
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
      const ro = p.match(/^\/api\/cotizaciones\/([\w-]+)(?:\/(estado))?$/);
      if (ro) {
        const c = await detalle(env, ro[1]);
        if (c.creado_por_id !== yo.id) throw new ErrorApi('Esa cotización no es tuya.', 'SIN_PERMISO', 403);
        if (!ro[2] && m === 'GET') return paraOperador(c);
        if (!ro[2] && m === 'PATCH') return guardar(env, yo, ro[1], await cuerpo());
        if (ro[2] === 'estado' && m === 'POST') return cambiarEstado(env, yo, ro[1], await cuerpo());
      }
      throw new ErrorApi('Esa acción la hace un administrador.', 'SIN_PERMISO', 403);
    }
    if (p === '/api/cotizador' && m === 'GET') return verParametros(env);
    if (p === '/api/cotizador/calcular' && m === 'POST') return calcularOperador(env, await cuerpo());
    if (p === '/api/cotizador/parametros' && m === 'POST') return guardarParametros(env, yo, await cuerpo());
    if (p === '/api/cotizador/distancia' && m === 'POST') return distancia(env, await cuerpo());
    if (p === '/api/cotizaciones' && m === 'GET') return listar(env);
    if (p === '/api/cotizaciones' && m === 'POST') return guardar(env, yo, null, await cuerpo());
    const r = p.match(/^\/api\/cotizaciones\/([\w-]+)(?:\/(estado|convertir))?$/);
    if (r && !r[2] && m === 'GET') return detalle(env, r[1]);
    if (r && !r[2] && m === 'PATCH') return guardar(env, yo, r[1], await cuerpo());
    if (r && !r[2] && m === 'DELETE') return eliminar(env, yo, r[1]);
    if (r && r[2] === 'estado' && m === 'POST') return cambiarEstado(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'convertir' && m === 'POST') return convertir(env, yo, r[1], crearExcursion, await cuerpo());
    return undefined;
  }
  return { rutas, publica, elegir };
}
