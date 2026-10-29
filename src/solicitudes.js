/**
 * Villa Azul · Solicitudes de viaje desde el QR (v4.3)
 * El cliente arma su viaje en /viaja (como en una aerolínea): fechas, viajeros, partida, llegada y recorrido interno.
 * La solicitud avisa a los administradores, que arman la cotización (Estándar y Premium), la validan y la envían por WhatsApp.
 * El estado que ve el cliente se deriva de la cotización: no hay dos estados que se puedan contradecir.
 */
export const WHATSAPP_EMPRESA = '51990587558';

export const SQL_SOL_V10 = [
  `CREATE TABLE IF NOT EXISTS solicitudes (id TEXT PRIMARY KEY, numero INTEGER, token TEXT UNIQUE, tipo TEXT, ida_vuelta INTEGER, origen TEXT, destino TEXT,
     lugar_recojo TEXT, punto_llegada TEXT, hora_salida TEXT, fecha_ida TEXT, fecha_retorno TEXT, adultos INTEGER, ninos INTEGER, bebes INTEGER, pasajeros INTEGER,
     recorrido_interno INTEGER, recorrido_ciudad TEXT, recorrido_horas REAL, recorrido_detalle TEXT, servicio_pref TEXT, detalles TEXT,
     cliente TEXT, celular TEXT, email TEXT, canal TEXT, ip_hash TEXT, estado TEXT, motivo TEXT, visto_por TEXT, visto_en TEXT,
     cotizacion_id TEXT, cotizado_en TEXT, cotizado_por TEXT, creado_en TEXT, actualizado_en TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_sol_creado ON solicitudes(creado_en)',
  'CREATE INDEX IF NOT EXISTS ix_sol_cot ON solicitudes(cotizacion_id)',
  'CREATE INDEX IF NOT EXISTS ix_sol_ip ON solicitudes(ip_hash, creado_en)',
  'ALTER TABLE cotizaciones ADD COLUMN solicitud_id TEXT',
];

const TIPOS = { excursion: 'Excursión', privado: 'Transporte privado' };
const PREF = { estandar: 'Estándar', premium: 'Premium', ambos: 'Ver ambos' };
const CANALES = { qr: 'QR', wa: 'WhatsApp', fb: 'Facebook', ig: 'Instagram', tt: 'TikTok', web: 'Web' };
/* Estado del flujo. Los tres primeros los fija el equipo; los demás salen de la cotización enlazada. */
const ETAPAS = ['nueva', 'revisando', 'cotizada', 'enviada', 'aceptada', 'rechazada', 'vencida', 'descartada'];
const CAPACIDAD_VAN = 15;

export function crearSolicitudes(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, avisar } = h;
  const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
  const entero = (v, min, max) => Math.min(max, Math.max(min, Math.round(num(v))));
  const texto = (v, max = 100) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const textoLargo = (v, max = 600) => String(v == null ? '' : v).replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, max);
  const tel = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 9 && d[0] === '9') d = '51' + d; return d; };
  const token = () => { const a = new Uint8Array(10); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
  const sha = async (t) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const codigo = (n) => 'SOL-' + String(n).padStart(4, '0');
  const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
  const diaMas = (f, n) => new Date(Date.parse(f + 'T12:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const diasEntre = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
  const horasEntre = (a, b) => (Date.parse(String(b).replace(' ', 'T') + 'Z') - Date.parse(String(a).replace(' ', 'T') + 'Z')) / 36e5;
  const fechaCorta = (f) => { if (!f) return ''; const d = new Date(f + 'T12:00:00Z'); return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/[.,]/g, ''); };

  async function whatsapp(env) {
    const w = await env.DB.prepare("SELECT valor FROM config WHERE clave='whatsapp_empresa'").first();
    return tel(w && w.valor) || WHATSAPP_EMPRESA;
  }

  /** La etapa real: si hay cotización, manda la cotización. */
  function etapa(s, c) {
    if (s.estado === 'descartada') return 'descartada';
    if (!c) return s.estado === 'revisando' ? 'revisando' : 'nueva';
    if (c.estado === 'aceptada') return 'aceptada';
    if (c.estado === 'rechazada') return 'rechazada';
    if (c.estado === 'vencida') return 'vencida';
    if (c.valida_hasta && c.valida_hasta < ahoraLima().slice(0, 10) && c.estado === 'enviada') return 'vencida';
    if (c.estado === 'enviada') return 'enviada';
    return 'cotizada';
  }
  async function conCotizaciones(env, filas) {
    const ids = filas.map(s => s.cotizacion_id).filter(Boolean);
    const cots = {};
    for (let i = 0; i < ids.length; i += 90) {
      const lote = ids.slice(i, i + 90);
      (await env.DB.prepare(`SELECT id, token, numero, estado, plan_elegido, precio_final, precio_final_premium, valida_hasta, creado_en, actualizado_en, elegido_en FROM cotizaciones WHERE id IN (${lote.map(() => '?').join(',')})`).bind(...lote).all())
        .results.forEach(c => { cots[c.id] = c; });
    }
    return filas.map(s => {
      const c = s.cotizacion_id ? cots[s.cotizacion_id] : null;
      return { ...s, codigo: codigo(s.numero), recorrido_interno: !!s.recorrido_interno, ida_vuelta: !!s.ida_vuelta, etapa: etapa(s, c),
        cotizacion: c ? { id: c.id, token: c.token, codigo: 'COT-' + String(c.numero).padStart(4, '0'), estado: c.estado, plan_elegido: c.plan_elegido,
          precio_final: c.precio_final, precio_final_premium: c.precio_final_premium, valida_hasta: c.valida_hasta, elegido_en: c.elegido_en } : null, ip_hash: undefined };
    });
  }

  /* ═════════ Lo público: el portal /viaja ═════════ */
  async function portal(env) {
    const hoy = ahoraLima().slice(0, 10), tope = diaMas(hoy, 400);
    // Días en que la van ya tiene otro viaje: el cliente igual puede pedirlos, pero sabe que hay que confirmar.
    const ex = (await env.DB.prepare(`SELECT salida, retorno FROM excursiones WHERE (estado IN ('abierta','cerrada','en_ruta') OR (estado='borrador' AND tipo='contrato'))
      AND substr(COALESCE(retorno, salida),1,10) >= ? AND substr(salida,1,10) <= ?`).bind(hoy, tope).all()).results;
    const ocupados = new Set();
    ex.forEach(e => { const a = String(e.salida || '').slice(0, 10), b = String(e.retorno || e.salida || '').slice(0, 10);
      if (!RE_FECHA.test(a)) return; const fin = RE_FECHA.test(b) && b >= a ? b : a;
      for (let d = a, i = 0; d <= fin && i < 40; d = diaMas(d, 1), i++) if (d >= hoy) ocupados.add(d); });
    // Destinos que la empresa ya conoce: los que más se piden primero.
    const pedidos = (await env.DB.prepare("SELECT destino l, COUNT(*) n FROM solicitudes WHERE estado <> 'descartada' GROUP BY lower(destino) ORDER BY n DESC LIMIT 8").all()).results.map(x => x.l);
    const conocidos = (await env.DB.prepare('SELECT DISTINCT destino l FROM rutas_km UNION SELECT DISTINCT origen FROM rutas_km UNION SELECT DISTINCT destino FROM tarifas WHERE COALESCE(activo,1)=1').all()).results.map(x => x.l);
    const vistos = new Set(), lugares = [];
    pedidos.concat(conocidos, ['Trujillo', 'Huamachuco', 'Cajabamba', 'Santiago de Chuco', 'Huanchaco', 'Cajamarca']).forEach(l => {
      const k = String(l || '').trim(); if (k && !vistos.has(k.toLowerCase())) { vistos.add(k.toLowerCase()); lugares.push(k); } });
    return { whatsapp: await whatsapp(env), hoy, ocupados: [...ocupados].sort(), lugares: lugares.slice(0, 24), capacidad: CAPACIDAD_VAN, base: 'Angasmarca' };
  }

  async function crear(env, req, b) {
    if (texto(b.web, 50)) return { codigo: 'SOL-0000', token: '0' };          // trampa para robots: se ignora sin avisar
    const ip = req.headers.get('cf-connecting-ip') || '';
    const ipHash = ip ? (await sha('va|' + ip)).slice(0, 20) : null;
    if (ipHash) {
      const r = await env.DB.prepare('SELECT COUNT(*) n FROM solicitudes WHERE ip_hash=? AND creado_en >= ?').bind(ipHash, ahoraLima(new Date(Date.now() - 3600e3))).first();
      if (r.n >= 6) throw new ErrorApi('Ya recibimos varias solicitudes desde este teléfono. Escríbenos por WhatsApp y te atendemos al momento.', 'LIMITE', 429);
    }
    const tipo = TIPOS[b.tipo] ? b.tipo : null;
    if (!tipo) throw new ErrorApi('Elige excursión o transporte privado.');
    const iv = b.ida_vuelta === true || b.ida_vuelta === 'true' || b.ida_vuelta === 1;
    const origen = texto(b.origen, 60), destino = texto(b.destino, 60);
    if (!origen) throw new ErrorApi('Escribe desde dónde parten.');
    if (!destino) throw new ErrorApi('Escribe a dónde quieren ir.');
    const hoy = ahoraLima().slice(0, 10), ida = String(b.fecha_ida || ''), ret = String(b.fecha_retorno || '');
    if (!RE_FECHA.test(ida)) throw new ErrorApi('Elige la fecha de ida en el calendario.');
    if (ida < hoy) throw new ErrorApi('La fecha de ida ya pasó. Elige otra en el calendario.');
    if (ida > diaMas(hoy, 400)) throw new ErrorApi('Por ahora recibimos viajes hasta dentro de un año.');
    if (iv) {
      if (!RE_FECHA.test(ret)) throw new ErrorApi('Elige la fecha de retorno en el calendario.');
      if (ret < ida) throw new ErrorApi('El retorno no puede ser antes de la ida.');
      if (diasEntre(ida, ret) > 30) throw new ErrorApi('Para viajes de más de 30 días escríbenos por WhatsApp.');
    }
    const hora = /^\d{2}:\d{2}$/.test(String(b.hora_salida || '')) ? b.hora_salida : null;
    const adultos = entero(b.adultos, 0, 99), ninos = entero(b.ninos, 0, 99), bebes = entero(b.bebes, 0, 15);
    if (adultos < 1) throw new ErrorApi('Debe viajar al menos un adulto.');
    if (adultos + ninos > CAPACIDAD_VAN) throw new ErrorApi(`Nuestra van lleva hasta ${CAPACIDAD_VAN} viajeros con asiento. Para grupos más grandes escríbenos por WhatsApp y coordinamos otra unidad.`);
    if (bebes > adultos) throw new ErrorApi('Cada bebé viaja en brazos de un adulto: hay más bebés que adultos.');
    const interno = b.recorrido_interno === true || b.recorrido_interno === 'true';
    const cliente = texto(b.cliente, 80), celular = tel(b.celular);
    if (cliente.length < 3) throw new ErrorApi('Escribe tu nombre y apellido.');
    if (celular.length < 9 || celular.length > 15) throw new ErrorApi('Escribe tu número de WhatsApp (9 dígitos).');
    const email = texto(b.email, 80);
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErrorApi('El correo no parece válido. Corrígelo o déjalo vacío.');
    if (!b.acepto) throw new ErrorApi('Marca la casilla para que podamos escribirte por WhatsApp.');
    const canal = CANALES[b.canal] ? b.canal : 'web';
    const ahora = ahoraLima(), n = (await env.DB.prepare('SELECT COALESCE(MAX(numero),0)+1 n FROM solicitudes').first()).n;
    const fila = { id: crypto.randomUUID(), numero: n, token: token(), tipo, ida_vuelta: iv ? 1 : 0, origen, destino,
      lugar_recojo: texto(b.lugar_recojo, 120), punto_llegada: texto(b.punto_llegada, 120), hora_salida: hora, fecha_ida: ida, fecha_retorno: iv ? ret : null,
      adultos, ninos, bebes, pasajeros: adultos + ninos, recorrido_interno: interno ? 1 : 0,
      recorrido_ciudad: interno ? texto(b.recorrido_ciudad, 60) : null, recorrido_horas: interno ? Math.min(24, Math.max(0, num(b.recorrido_horas))) : null,
      recorrido_detalle: interno ? textoLargo(b.recorrido_detalle, 300) : null, servicio_pref: PREF[b.servicio_pref] ? b.servicio_pref : 'ambos',
      detalles: textoLargo(b.detalles, 600), cliente, celular, email: email || null, canal, ip_hash: ipHash, estado: 'nueva',
      creado_en: ahora, actualizado_en: ahora, seq: await reservarSeq(env, 1) };
    const k = Object.keys(fila);
    await env.DB.prepare(`INSERT INTO solicitudes (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`).bind(...k.map(x => fila[x])).run();
    const fechas = fechaCorta(ida) + (iv ? ' → ' + fechaCorta(ret) : ' (solo ida)');
    await avisar(env, { tipo: 'solicitud', para: 'mando', titulo: `Nueva solicitud ${codigo(n)} · ${cliente}`, ir: 'solicitud:' + fila.id,
      detalle: `${TIPOS[tipo]} ${origen} → ${destino} · ${fechas} · ${adultos + ninos} viajero(s)${interno ? ' · recorrido interno' : ''} · prefiere ${PREF[fila.servicio_pref]}` });
    await auditar(env, 'cliente', 'sol_crear', `${codigo(n)} · ${cliente} · ${origen} → ${destino} · ${ida} · canal ${canal}`);
    return { codigo: codigo(n), token: fila.token, whatsapp: await whatsapp(env) };
  }

  /** Lo que ve el cliente en «Mi solicitud». La cotización aparece solo cuando un administrador ya la envió. */
  async function seguimiento(env, tok) {
    const s = await env.DB.prepare('SELECT * FROM solicitudes WHERE token=?').bind(String(tok || '').toLowerCase()).first();
    if (!s) throw new ErrorApi('No encontramos esa solicitud. Revisa el enlace.', 'NO_EXISTE', 404);
    const [x] = await conCotizaciones(env, [s]);
    const lista = x.cotizacion && x.cotizacion.estado !== 'borrador';
    return { codigo: x.codigo, tipo: TIPOS[x.tipo], ida_vuelta: x.ida_vuelta, origen: x.origen, destino: x.destino, fecha_ida: x.fecha_ida, fecha_retorno: x.fecha_retorno,
      hora_salida: x.hora_salida, adultos: x.adultos, ninos: x.ninos, bebes: x.bebes, pasajeros: x.pasajeros, recorrido_interno: x.recorrido_interno,
      servicio_pref: x.servicio_pref, cliente: x.cliente.split(' ')[0], creado_en: x.creado_en,
      etapa: x.etapa === 'cotizada' ? 'revisando' : x.etapa, cotizacion: lista ? { token: x.cotizacion.token, codigo: x.cotizacion.codigo, plan_elegido: x.cotizacion.plan_elegido } : null,
      whatsapp: await whatsapp(env) };
  }

  async function publicas(env, req, url) {
    const p = url.pathname, m = req.method;
    if (p === '/api/publico/viaja' && m === 'GET') return portal(env);
    if (p === '/api/publico/viaja' && m === 'POST') return crear(env, req, await req.json().catch(() => ({})));
    const ms = p.match(/^\/api\/publico\/viaja\/([a-f0-9]{20})$/i);
    if (ms && m === 'GET') return seguimiento(env, ms[1]);
    return undefined;
  }

  /* ═════════ Para el equipo: bandeja, indicadores y flujo ═════════ */
  function resumen(L) {
    const ahora = ahoraLima(), mes = ahora.slice(0, 7), hace90 = ahoraLima(new Date(Date.now() - 90 * 864e5)), hace30 = ahoraLima(new Date(Date.now() - 30 * 864e5));
    const embudo = Object.fromEntries(ETAPAS.map(e => [e, 0])); L.forEach(s => { embudo[s.etapa]++; });
    const pendientes = L.filter(s => s.etapa === 'nueva' || s.etapa === 'revisando');
    const mas_antigua = pendientes.length ? Math.max(...pendientes.map(s => horasEntre(s.creado_en, ahora))) : null;
    // Tiempo de respuesta: desde que llega hasta que existe la cotización (mediana de los últimos 30 días).
    const t = L.filter(s => s.cotizado_en && s.creado_en >= hace30).map(s => horasEntre(s.creado_en, s.cotizado_en)).filter(x => x >= 0).sort((a, b) => a - b);
    const mediana = t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : (t[t.length / 2 - 1] + t[t.length / 2]) / 2) : null;
    const en_meta = t.length ? Math.round(t.filter(x => x <= 2).length / t.length * 100) : null;
    const v90 = L.filter(s => s.creado_en >= hace90 && s.etapa !== 'descartada');
    const decididas = v90.filter(s => ['aceptada', 'rechazada', 'vencida'].includes(s.etapa));
    const aceptadas = v90.filter(s => s.etapa === 'aceptada');
    const monto = aceptadas.reduce((a, s) => a + num(s.cotizacion && (s.cotizacion.plan_elegido === 'premium' ? s.cotizacion.precio_final_premium : s.cotizacion.precio_final)), 0);
    const delMes = L.filter(s => String(s.creado_en).slice(0, 7) === mes);
    const contar = (f) => { const o = {}; L.filter(s => s.creado_en >= hace90).forEach(s => { const k = f(s); if (k) o[k] = (o[k] || 0) + 1; }); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
    return {
      pendientes: pendientes.length, mas_antigua_h: mas_antigua === null ? null : Math.round(mas_antigua * 10) / 10,
      respuesta_mediana_h: mediana === null ? null : Math.round(mediana * 10) / 10, respuesta_en_meta: en_meta, meta_h: 2,
      conversion: v90.length ? Math.round(aceptadas.length / v90.length * 100) : null, cierre: decididas.length ? Math.round(aceptadas.length / decididas.length * 100) : null,
      aceptadas_90: aceptadas.length, monto_aceptado_90: Math.round(monto * 100) / 100,
      mes_n: delMes.length, mes_viajeros: delMes.reduce((a, s) => a + num(s.pasajeros), 0),
      premium_pref: L.filter(s => s.creado_en >= hace90 && s.servicio_pref === 'premium').length,
      embudo, canales: contar(s => CANALES[s.canal] || 'Web').slice(0, 6), destinos: contar(s => s.destino).slice(0, 6),
      meses: contar(s => String(s.fecha_ida || '').slice(0, 7)).sort((a, b) => a[0] < b[0] ? -1 : 1).filter(x => x[0] >= mes).slice(0, 6),
    };
  }
  async function listar(env) {
    const filas = (await env.DB.prepare('SELECT * FROM solicitudes ORDER BY numero DESC LIMIT 300').all()).results;
    const L = await conCotizaciones(env, filas);
    return { solicitudes: L, resumen: resumen(L), whatsapp: await whatsapp(env) };
  }
  async function detalle(env, yo, id) {
    let s = await env.DB.prepare('SELECT * FROM solicitudes WHERE id=?').bind(id).first();
    if (!s) throw new ErrorApi('Solicitud no encontrada', 'NO_EXISTE', 404);
    // Abrirla la marca como «en revisión»: así el resto del equipo sabe que alguien ya la tomó.
    if (s.estado === 'nueva' && !s.cotizacion_id) {
      const ahora = ahoraLima();
      await env.DB.prepare("UPDATE solicitudes SET estado='revisando', visto_por=?, visto_en=?, actualizado_en=?, seq=? WHERE id=?").bind(yo.nombre, ahora, ahora, await reservarSeq(env, 1), id).run();
      s = { ...s, estado: 'revisando', visto_por: yo.nombre, visto_en: ahora };
    }
    const [x] = await conCotizaciones(env, [s]);
    return x;
  }
  async function cambiarEstado(env, yo, id, b) {
    const s = await env.DB.prepare('SELECT * FROM solicitudes WHERE id=?').bind(id).first();
    if (!s) throw new ErrorApi('Solicitud no encontrada', 'NO_EXISTE', 404);
    const estado = ['nueva', 'revisando', 'descartada'].includes(b.estado) ? b.estado : null;
    if (!estado) throw new ErrorApi('Estado no válido');
    if (estado === 'descartada' && s.cotizacion_id) throw new ErrorApi('Ya tiene cotización: márcala como rechazada desde la cotización.');
    const motivo = estado === 'descartada' ? texto(b.motivo, 200) : null;
    if (estado === 'descartada' && !motivo) throw new ErrorApi('Anota por qué se descarta.');
    await env.DB.prepare('UPDATE solicitudes SET estado=?, motivo=?, actualizado_en=?, seq=? WHERE id=?').bind(estado, motivo, ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'sol_estado', `${codigo(s.numero)} → ${estado}${motivo ? ' · ' + motivo : ''}`);
    return detalle(env, yo, id);
  }
  async function eliminar(env, yo, id) {
    const s = await env.DB.prepare('SELECT * FROM solicitudes WHERE id=?').bind(id).first();
    if (!s) throw new ErrorApi('Solicitud no encontrada', 'NO_EXISTE', 404);
    if (s.cotizacion_id) throw new ErrorApi('Tiene una cotización enlazada: no se puede eliminar.');
    await env.DB.prepare('DELETE FROM solicitudes WHERE id=?').bind(id).run();
    await auditar(env, yo.nombre, 'sol_eliminar', `${codigo(s.numero)} · ${s.cliente}`);
    return { id, eliminada: true };
  }
  /** Lo llama el cotizador al guardar una cotización hecha desde una solicitud. */
  async function enlazar(env, yo, solicitudId, cotizacionId) {
    const ahora = ahoraLima();
    await env.DB.prepare('UPDATE solicitudes SET cotizacion_id=?, cotizado_en=COALESCE(cotizado_en, ?), cotizado_por=?, estado=CASE WHEN estado=\'descartada\' THEN \'revisando\' ELSE estado END, actualizado_en=?, seq=? WHERE id=? AND (cotizacion_id IS NULL OR cotizacion_id=?)')
      .bind(cotizacionId, ahora, yo.nombre, ahora, await reservarSeq(env, 1), solicitudId, cotizacionId).run();
  }
  /** Si se elimina la cotización, la solicitud vuelve a la bandeja para cotizarse otra vez. */
  async function desenlazar(env, cotizacionId) {
    await env.DB.prepare("UPDATE solicitudes SET cotizacion_id=NULL, cotizado_en=NULL, cotizado_por=NULL, estado='revisando', actualizado_en=?, seq=? WHERE cotizacion_id=?")
      .bind(ahoraLima(), await reservarSeq(env, 1), cotizacionId).run();
  }
  async function preferenciaDe(env, cotizacionId) {
    const s = await env.DB.prepare('SELECT servicio_pref FROM solicitudes WHERE cotizacion_id=?').bind(cotizacionId).first();
    return s ? s.servicio_pref : null;
  }

  async function rutas(env, yo, req, url) {
    const p = url.pathname, m = req.method;
    if (!p.startsWith('/api/solicitudes')) return undefined;
    exigirMando(yo);
    if (p === '/api/solicitudes' && m === 'GET') return listar(env);
    const r = p.match(/^\/api\/solicitudes\/([\w-]+)(?:\/(estado))?$/);
    if (r && !r[2] && m === 'GET') return detalle(env, yo, r[1]);
    if (r && !r[2] && m === 'DELETE') return eliminar(env, yo, r[1]);
    if (r && r[2] === 'estado' && m === 'POST') return cambiarEstado(env, yo, r[1], await req.json().catch(() => ({})));
    return undefined;
  }
  return { publicas, rutas, enlazar, desenlazar, preferenciaDe };
}
