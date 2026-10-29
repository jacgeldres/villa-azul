/**
 * Villa Azul · Excursiones (port de la v3.12 a D1)
 * Expreso, contrato o venta por asiento: pasajeros, asientos, manifiesto, ingresos, gastos con boleta e indicadores.
 * Lleva su propio libro: no toca Movimientos ni la caja diaria de la ruta.
 */
export const SQL_EXC = [
  // Un asiento activo por viaje y un DNI activo por viaje. La base lo garantiza aunque dos personas reserven a la vez.
  "CREATE UNIQUE INDEX IF NOT EXISTS ux_exc_asiento ON exc_pasajeros(excursion_id, asiento) WHERE estado IN ('reservado','confirmado','pagado')",
  "CREATE UNIQUE INDEX IF NOT EXISTS ux_exc_dni ON exc_pasajeros(excursion_id, dni) WHERE estado IN ('reservado','confirmado','pagado')",
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_exc_codigo ON excursiones(codigo)',
  'CREATE INDEX IF NOT EXISTS ix_excmov_exc ON exc_movimientos(excursion_id)',
  // Fotos de boletas: cabe una foto comprimida (~150 KB) por fila; sin configurar nada extra en Cloudflare.
  'CREATE TABLE IF NOT EXISTS comprobantes (id TEXT PRIMARY KEY, mime TEXT NOT NULL, datos BLOB NOT NULL, creado_en TEXT)',
  'CREATE TABLE IF NOT EXISTS limites (clave TEXT PRIMARY KEY, n INTEGER NOT NULL, hasta INTEGER NOT NULL)',
];

const ESTADOS = ['borrador', 'abierta', 'cerrada', 'en_ruta', 'finalizada', 'anulada'];
const EST_PAS = ['reservado', 'confirmado', 'pagado', 'liberado'];
const ACTIVOS = ['reservado', 'confirmado', 'pagado'];
export const CAT_EXC = {
  ingreso: ['adelanto', 'saldo', 'pasaje', 'otro_ingreso'],
  egreso: ['combustible', 'peaje', 'pago_conductor', 'hospedaje_conductor', 'alimentacion_conductor', 'cochera', 'lavado', 'mantenimiento', 'otro_gasto'],
};
const MAX_ASIENTOS = 15;
export const SQL_EXC_V6 = [
  'ALTER TABLE excursiones ADD COLUMN token_org TEXT',
  'ALTER TABLE exc_vouchers ADD COLUMN concepto TEXT',
  "UPDATE excursiones SET token_org = lower(hex(randomblob(12))) WHERE token_org IS NULL OR token_org = ''",
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_exc_token_org ON excursiones(token_org)',
];
export const SQL_EXC_V5 = [
  'ALTER TABLE exc_pasajeros ADD COLUMN boleto TEXT',
  `CREATE TABLE IF NOT EXISTS exc_vouchers (id TEXT PRIMARY KEY, excursion_id TEXT, grupo TEXT, monto REAL, operacion TEXT, foto_id TEXT, foto_repetida INTEGER,
     operacion_repetida INTEGER, estado TEXT, motivo TEXT, celular TEXT, creado_en TEXT, revisado_por TEXT, revisado_en TEXT, movimiento_id TEXT, seq INTEGER NOT NULL DEFAULT 0)`,
  'CREATE INDEX IF NOT EXISTS ix_vou_exc ON exc_vouchers(excursion_id)',
  'CREATE INDEX IF NOT EXISTS ix_vou_op ON exc_vouchers(operacion)',
  "UPDATE exc_pasajeros SET boleto = lower(hex(randomblob(6))) WHERE boleto IS NULL OR boleto = ''",
  'CREATE UNIQUE INDEX IF NOT EXISTS ux_exc_boleto ON exc_pasajeros(boleto)',
];

export function crearExcursiones(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, prepararFoto, avisar } = h;
  const puedeYape = (u) => u.rol === 'super' || (u.rol === 'admin' && u.funcion === 'digital');
  const nuevoBoleto = () => { const a = new Uint8Array(6); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
  const ocultarDni = (d) => d ? '••••' + String(d).slice(-4) : '';
  const nuevoToken = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return [...a].map(x => x.toString(16).padStart(2, '0')).join(''); };
  const POR_CONFIRMAR = 'Por confirmar';

  /* ── utilidades ── */
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const monto = (v) => { if (v === '' || v == null) return null; const n = Number(String(v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : null; };
  const texto = (v, max = 100) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  const tel = (t) => { let d = String(t || '').replace(/\D/g, ''); if (d.length === 9 && d[0] === '9') d = '51' + d; return d; };
  const fechaTxt = (v) => { const s = String(v || '').trim(); return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(s) ? s : ''; };
  const limaADate = (s) => new Date(String(s).length === 10 ? s + 'T23:59:00-05:00' : s + ':00-05:00');
  const total = (e) => Math.min(MAX_ASIENTOS, num(e.asientos_total) || MAX_ASIENTOS);
  const bloqueados = (e) => String(e.bloqueados || '').split(/[^0-9]+/).filter(Boolean).map(Number).filter(n => n >= 1 && n <= MAX_ASIENTOS);
  const bloqTxt = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(/[^0-9]+/)).map(Number).filter(n => n >= 1 && n <= MAX_ASIENTOS))].sort((a, b) => a - b).join(',');
  const etiqueta = (n) => { if (n === 'Por confirmar') return 'Apartado'; const p = String(n || '').trim().split(/\s+/); const cap = w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); return p.length > 1 ? cap(p[0]) + ' ' + p[1].charAt(0).toUpperCase() + '.' : cap(p[0] || ''); };
  const codigo = (n) => { const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(x => abc[x % abc.length]).join(''); };
  const vencido = (x) => x.estado === 'reservado' && x.vence_en && Date.parse(x.vence_en) < Date.now();
  const activos = (pas) => pas.filter(x => ACTIVOS.includes(x.estado) && !vencido(x));

  async function porId(env, id) { return env.DB.prepare('SELECT * FROM excursiones WHERE id = ?').bind(String(id || '')).first(); }
  async function porCodigo(env, c) { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c ? env.DB.prepare('SELECT * FROM excursiones WHERE codigo = ?').bind(c).first() : null; }
  async function pasajerosDe(env, id) { return (await env.DB.prepare('SELECT * FROM exc_pasajeros WHERE excursion_id = ?').bind(id).all()).results; }
  async function movsDe(env, id) { return (await env.DB.prepare('SELECT * FROM exc_movimientos WHERE excursion_id = ?').bind(id).all()).results; }
  /** Las reservas sin pago que vencieron pasan a «liberado» antes de tocar asientos: así el índice único deja reservarlos. */
  function sqlLiberarVencidos(env, id) {
    return env.DB.prepare("UPDATE exc_pasajeros SET estado='liberado', nota=TRIM(COALESCE(nota,'')||' venció sin pago'), actualizado_por='sistema', actualizado_en=? WHERE excursion_id=? AND estado='reservado' AND vence_en IS NOT NULL AND vence_en <> '' AND vence_en < ?")
      .bind(ahoraLima(), id, new Date().toISOString());
  }
  function abierta(e) {
    if (e.estado !== 'abierta') {
      const t = { borrador: 'Las reservas aún no están abiertas.', cerrada: 'Las reservas para este viaje ya cerraron.', en_ruta: 'Este viaje ya salió.', finalizada: 'Este viaje ya terminó.', anulada: 'Este viaje fue cancelado.' };
      return { ok: false, motivo: t[e.estado] || 'Las reservas no están abiertas.' };
    }
    if (e.cierre_reservas && limaADate(e.cierre_reservas).getTime() < Date.now()) return { ok: false, motivo: 'Las reservas para este viaje ya cerraron.' };
    return { ok: true, motivo: '' };
  }
  function vistaPublica(e, pas) {
    const ocupados = {};
    activos(pas).forEach(x => { ocupados[x.asiento] = { quien: etiqueta(x.nombre), estado: x.estado === 'reservado' ? 'reservado' : 'confirmado' }; });
    const ab = abierta(e);
    return { titulo: e.titulo, origen: e.origen, destino: e.destino, via: e.via, salida: e.salida, retorno: e.retorno, tipo: e.tipo,
      precio_asiento: e.tipo === 'por_asiento' ? num(e.precio_asiento) : null, instrucciones_pago: e.instrucciones_pago || '', whatsapp: tel(e.whatsapp),
      asientos_total: total(e), bloqueados: bloqueados(e), ocupados, vence_horas: num(e.vence_horas), abierta: ab.ok, motivo_cierre: ab.motivo };
  }
  function limpiarPasajero(x) {
    const nombre = texto(x && x.nombre, 80).replace(/\s+/g, ' '), dni = String((x && x.dni) || '').replace(/\D/g, ''), asiento = Number(x && x.asiento);
    if (!(asiento >= 1 && asiento <= MAX_ASIENTOS && asiento % 1 === 0)) return { error: 'Asiento no válido.' };
    if (nombre.split(' ').length < 2) return { error: `Asiento ${asiento}: escribe nombre y al menos un apellido.` };
    if (dni.length !== 8) return { error: `Asiento ${asiento}: el DNI debe tener 8 números.` };
    return { nombre, dni, asiento };
  }
  async function limite(env, clave, max, seg) {
    const ahora = Date.now(), r = await env.DB.prepare('SELECT n, hasta FROM limites WHERE clave = ?').bind(clave).first();
    if (r && r.hasta > ahora && r.n >= max) return false;
    if (!r || r.hasta <= ahora) await env.DB.prepare('INSERT OR REPLACE INTO limites (clave, n, hasta) VALUES (?, 1, ?)').bind(clave, ahora + seg * 1000).run();
    else await env.DB.prepare('UPDATE limites SET n = n + 1 WHERE clave = ?').bind(clave).run();
    return true;
  }

  /* ── indicadores ── */
  function kpis(e, pas, movs) {
    const act = activos(pas), vendibles = total(e) - bloqueados(e).length;
    const vivos = movs.filter(m => !(m.anulado === 1 || m.anulado === true));
    let ing = 0, egr = 0, gal = 0, comb = 0, sinC = 0, sinCn = 0; const porCat = {};
    vivos.forEach(m => {
      const v = num(m.monto);
      if (m.tipo === 'ingreso') { ing += v; return; }
      egr += v; porCat[m.categoria] = (porCat[m.categoria] || 0) + v;
      if (m.categoria === 'combustible') { gal += num(m.galones); comb += v; }
      if ((!m.comprobante_tipo || m.comprobante_tipo === 'sin') && !m.foto_id) { sinC += v; sinCn++; }
    });
    const pactado = e.tipo === 'contrato' ? num(e.monto_contrato) : act.reduce((s, x) => s + num(x.precio), 0);
    const km = num(e.km_fin) && num(e.km_inicio) ? num(e.km_fin) - num(e.km_inicio) : 0;
    const r2 = n => Math.round(n * 100) / 100, cuenta = { reservado: 0, confirmado: 0, pagado: 0 };
    act.forEach(x => { cuenta[x.estado]++; });
    return { asientos_venta: vendibles, ocupados: act.length, libres: Math.max(0, vendibles - act.length), ocupacion: vendibles ? r2(act.length / vendibles * 100) : 0, por_estado: cuenta,
      pactado: r2(pactado), cobrado: r2(ing), por_cobrar: r2(Math.max(0, pactado - ing)), gastos: r2(egr), gastos_por_categoria: porCat,
      utilidad: r2(ing - egr), utilidad_proyectada: r2(pactado - egr), margen: ing ? r2((ing - egr) / ing * 100) : 0,
      km, costo_km: km ? r2(egr / km) : 0, galones: r2(gal), km_galon: km && gal ? r2(km / gal) : 0, precio_galon: gal ? r2(comb / gal) : 0,
      soles_asiento_km: km && vendibles ? Math.round(pactado / (vendibles * km) * 1000) / 1000 : 0, sin_comprobante: r2(sinC), sin_comprobante_n: sinCn };
  }

  /* ═════════ Públicas: el enlace para clientes ═════════ */
  async function publica(env, cod) {
    const e = await porCodigo(env, cod);
    if (!e) throw new ErrorApi('Este enlace no existe o ya no está disponible.', 'NO_EXISTE', 404);
    return vistaPublica(e, await pasajerosDe(env, e.id));
  }
  async function reservar(env, b, ip) {
    if (b.web) throw new ErrorApi('No se pudo registrar.', 'SPAM');
    const lista = Array.isArray(b.pasajeros) ? b.pasajeros : [];
    if (!lista.length) throw new ErrorApi('Elige al menos un asiento.');
    if (lista.length > 6) throw new ErrorApi('Puedes reservar hasta 6 asientos por vez.');
    const cel = tel(b.celular);
    if (!/^519\d{8}$/.test(cel)) throw new ErrorApi('Escribe un celular de 9 dígitos que empiece en 9.', 'CELULAR');
    const limpios = [], dnis = {}, sillas = {};
    for (const x of lista) {
      const d = limpiarPasajero(x); if (d.error) throw new ErrorApi(d.error);
      if (dnis[d.dni]) throw new ErrorApi(`El DNI ${d.dni} está repetido en tu reserva.`);
      if (sillas[d.asiento]) throw new ErrorApi(`El asiento ${d.asiento} está repetido.`);
      dnis[d.dni] = sillas[d.asiento] = 1; limpios.push(d);
    }
    const e = await porCodigo(env, b.codigo);
    if (!e) throw new ErrorApi('Este enlace no existe o ya no está disponible.', 'NO_EXISTE', 404);
    // Freno de abuso: el enlace es público. 6 envíos por celular, 20 por conexión y 120 por viaje cada hora.
    if (!(await limite(env, `r:${e.id}:${cel}`, 6, 3600)) || !(await limite(env, `r:${e.id}:ip:${ip}`, 20, 3600)) || !(await limite(env, `r:${e.id}`, 120, 3600)))
      throw new ErrorApi('Demasiados intentos. Espera unos minutos o escribe al organizador.', 'LIMITE', 429);
    const ab = abierta(e); if (!ab.ok) throw new ErrorApi(ab.motivo, 'CERRADA');
    const pas = await pasajerosDe(env, e.id), act = activos(pas), tot = total(e), bloq = bloqueados(e);
    for (const d of limpios) {
      if (d.asiento > tot || bloq.includes(d.asiento)) throw new ErrorApi(`El asiento ${d.asiento} no está disponible.`);
      if (act.some(x => num(x.asiento) === d.asiento)) { const err = new ErrorApi(`El asiento ${d.asiento} acaba de ser tomado. Elige otro.`, 'OCUPADO', 409); err.datos = vistaPublica(e, pas); throw err; }
      const mismo = act.find(x => String(x.dni) === d.dni);
      if (mismo) throw new ErrorApi(`El DNI ${d.dni} ya tiene el asiento ${mismo.asiento}.`, 'DNI');
    }
    const ahora = new Date(), horas = num(e.vence_horas);
    const vence = horas > 0 ? new Date(ahora.getTime() + horas * 3600000).toISOString() : '';
    const grupo = codigo(5), precio = e.tipo === 'por_asiento' ? num(e.precio_asiento) : null, s0 = await reservarSeq(env, limpios.length);
    const st = [sqlLiberarVencidos(env, e.id)].concat(limpios.map((d, i) => env.DB.prepare(
      `INSERT INTO exc_pasajeros (id,excursion_id,asiento,nombre,dni,celular,grupo,estado,origen_registro,precio,creado_en,vence_en,actualizado_por,actualizado_en,nota,boleto,seq)
       VALUES (?,?,?,?,?,?,?,?,'enlace',?,?,?,'enlace',?,'',?,?)`).bind(crypto.randomUUID(), e.id, d.asiento, d.nombre, d.dni, cel, grupo, e.tipo === 'contrato' ? 'confirmado' : 'reservado', precio, ahoraLima(), e.tipo === 'contrato' ? '' : vence, ahoraLima(), nuevoBoleto(), s0 + i)));
    try { await env.DB.batch(st); }
    catch (err) {
      // Dos personas eligieron el mismo asiento en el mismo segundo: gana la primera, a la segunda se le muestra el mapa al día.
      if (/UNIQUE/i.test(String(err.message))) { const e2 = new ErrorApi('Uno de esos asientos acaba de ser tomado. Elige otro.', 'OCUPADO', 409); e2.datos = vistaPublica(e, await pasajerosDe(env, e.id)); throw e2; }
      throw err;
    }
    await auditar(env, 'enlace', 'exc_reserva', `${e.titulo} · asientos ${limpios.map(d => d.asiento).join(', ')}`);
    return { grupo, asientos: limpios.map(d => d.asiento), total: precio ? precio * limpios.length : 0, vence_en: e.tipo === 'contrato' ? '' : vence, whatsapp: tel(e.whatsapp), cel4: cel.slice(-4), tipo: e.tipo };
  }

  /* ═════════ Privadas (solo admin y superadmin) ═════════ */
  async function listar(env) {
    const excs = (await env.DB.prepare("SELECT * FROM excursiones WHERE estado <> 'anulada' ORDER BY salida DESC").all()).results;
    const pas = (await env.DB.prepare('SELECT * FROM exc_pasajeros').all()).results, movs = (await env.DB.prepare('SELECT * FROM exc_movimientos').all()).results;
    const vp = {}; (await env.DB.prepare("SELECT excursion_id, COUNT(*) n FROM exc_vouchers WHERE estado='pendiente' GROUP BY excursion_id").all()).results.forEach(r => { vp[r.excursion_id] = r.n; });
    return { excursiones: excs.map(e => ({ id: e.id, codigo: e.codigo, titulo: e.titulo, tipo: e.tipo, origen: e.origen, destino: e.destino, salida: e.salida, retorno: e.retorno, estado: e.estado, vouchers_pendientes: vp[e.id] || 0,
      kpis: kpis(e, pas.filter(x => x.excursion_id === e.id), movs.filter(m => m.excursion_id === e.id)) })), categorias: CAT_EXC };
  }
  async function detalle(env, id) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    const pas = await pasajerosDe(env, id), movs = await movsDe(env, id);
    const vou = (await env.DB.prepare('SELECT * FROM exc_vouchers WHERE excursion_id = ? ORDER BY creado_en DESC').bind(id).all()).results;
    return { excursion: e, pasajeros: pas.map(x => ({ ...x, vencido: vencido(x) })), movimientos: movs, vouchers: vou, kpis: kpis(e, pas, movs), categorias: CAT_EXC };
  }
  async function guardar(env, yo, id, x) {
    const d = {
      titulo: texto(x.titulo, 80), tipo: x.tipo === 'por_asiento' ? 'por_asiento' : 'contrato', cliente: texto(x.cliente, 80), cliente_tel: tel(x.cliente_tel),
      origen: texto(x.origen, 60), destino: texto(x.destino, 60), via: texto(x.via, 80), salida: fechaTxt(x.salida), retorno: fechaTxt(x.retorno),
      precio_asiento: monto(x.precio_asiento), monto_contrato: monto(x.monto_contrato),
      asientos_total: Math.min(MAX_ASIENTOS, Math.max(1, Number(x.asientos_total) || MAX_ASIENTOS)), bloqueados: bloqTxt(x.bloqueados), whatsapp: tel(x.whatsapp),
      instrucciones_pago: texto(x.instrucciones_pago, 300), vence_horas: Math.max(0, Math.min(168, Number(x.vence_horas) || 0)),
      cierre_reservas: fechaTxt(x.cierre_reservas), notas: texto(x.notas, 500), actualizado_en: ahoraLima(),
    };
    if (x.estado) { if (!ESTADOS.includes(x.estado)) throw new ErrorApi('Estado no válido'); d.estado = x.estado; }
    if (!d.titulo || !d.origen || !d.destino || !d.salida) throw new ErrorApi('Faltan nombre, origen, destino o fecha de salida.');
    if (d.tipo === 'por_asiento' && !(d.precio_asiento > 0)) throw new ErrorApi('En venta por asiento el precio por asiento es obligatorio.');
    if (id) {
      const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
      if (e.estado === 'anulada') throw new ErrorApi('Una excursión anulada no se puede editar.');
      const act = activos(await pasajerosDe(env, id));
      if (act.some(p => num(p.asiento) > d.asientos_total)) throw new ErrorApi(`Hay pasajeros en asientos mayores a ${d.asientos_total}.`);
      if (d.estado === 'anulada' && act.length) {
        if (!x.liberar) throw new ErrorApi(`Hay ${act.length} pasajero(s) con asiento. Confirma «Anular y liberar asientos».`, 'CONFIRMAR');
        await env.DB.prepare("UPDATE exc_pasajeros SET estado='liberado', nota=TRIM(COALESCE(nota,'')||' excursión anulada'), actualizado_por=?, actualizado_en=?, seq=? WHERE excursion_id=? AND estado IN ('reservado','confirmado','pagado')")
          .bind(yo.nombre, ahoraLima(), await reservarSeq(env, 1), id).run();
      }
      d.seq = await reservarSeq(env, 1);
      const k = Object.keys(d);
      await env.DB.prepare(`UPDATE excursiones SET ${k.map(c => `${c} = ?`).join(', ')} WHERE id = ?`).bind(...k.map(c => d[c]), id).run();
      await auditar(env, yo.nombre, 'exc_editar', d.titulo + (d.estado && d.estado !== e.estado ? ' → ' + d.estado : ''));
      return { id, codigo: e.codigo };
    }
    d.id = crypto.randomUUID(); d.token_org = nuevoToken(); d.estado = d.estado || 'borrador'; d.creado_por = yo.nombre; d.creado_en = d.actualizado_en; d.seq = await reservarSeq(env, 1);
    let c; do { c = codigo(6); } while (await porCodigo(env, c)); d.codigo = c;
    const k = Object.keys(d);
    await env.DB.prepare(`INSERT INTO excursiones (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`).bind(...k.map(c => d[c])).run();
    await auditar(env, yo.nombre, 'exc_crear', d.titulo);
    return { id: d.id, codigo: d.codigo };
  }
  async function km(env, yo, id, b) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    const ent = v => Math.max(0, Math.round(Number(String(v).replace(/[^0-9.]/g, '')) || 0));
    const c = {};
    if (b.km_inicio !== undefined && b.km_inicio !== '') c.km_inicio = ent(b.km_inicio);
    if (b.km_fin !== undefined && b.km_fin !== '') c.km_fin = ent(b.km_fin);
    const ini = c.km_inicio ?? num(e.km_inicio), fin = c.km_fin ?? num(e.km_fin);
    if (ini && fin && fin <= ini) throw new ErrorApi('El km de llegada debe ser mayor que el de salida.');
    if (ini && fin && fin - ini > 5000) throw new ErrorApi('Más de 5,000 km: revisa el odómetro.');
    if (c.km_inicio !== undefined && !e.km_inicio && ['abierta', 'cerrada', 'borrador'].includes(e.estado)) c.estado = 'en_ruta';
    c.actualizado_en = ahoraLima(); c.seq = await reservarSeq(env, 1);
    const k = Object.keys(c);
    await env.DB.prepare(`UPDATE excursiones SET ${k.map(x => `${x} = ?`).join(', ')} WHERE id = ?`).bind(...k.map(x => c[x]), id).run();
    await auditar(env, yo.nombre, 'exc_km', `${e.titulo} · salida ${ini} · llegada ${fin}`);
    return { km_inicio: ini, km_fin: fin, estado: c.estado || e.estado };
  }
  async function pasajero(env, yo, id, b) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    const pas = await pasajerosDe(env, id), act = activos(pas), ahora = ahoraLima();
    const precioBase = e.tipo === 'por_asiento' ? num(e.precio_asiento) : null;
    const libre = (a, ignorar) => {
      if (a > total(e) || bloqueados(e).includes(a)) return `El asiento ${a} no está disponible.`;
      const o = act.find(x => num(x.asiento) === a && x.id !== ignorar); return o ? `El asiento ${a} ya es de ${o.nombre}.` : '';
    };
    const dniLibre = (dni, ignorar) => { const o = act.find(x => String(x.dni) === dni && x.id !== ignorar); return o ? `Ese DNI ya está en el asiento ${o.asiento}.` : ''; };
    const conflicto = (err) => { if (/UNIQUE/i.test(String(err.message))) throw new ErrorApi('Ese asiento o DNI acaba de ser tomado. Vuelve a cargar.', 'OCUPADO', 409); throw err; };

    if (b.accion === 'asignar') {
      const d = limpiarPasajero(b); if (d.error) throw new ErrorApi(d.error);
      const m = libre(d.asiento) || dniLibre(d.dni); if (m) throw new ErrorApi(m, 'OCUPADO', 409);
      const est = ['reservado', 'confirmado', 'pagado'].includes(b.estado) ? b.estado : 'confirmado', nid = crypto.randomUUID(), s = await reservarSeq(env, 1);
      await env.DB.batch([sqlLiberarVencidos(env, id), env.DB.prepare(`INSERT INTO exc_pasajeros (id,excursion_id,asiento,nombre,dni,celular,grupo,estado,origen_registro,precio,creado_en,vence_en,actualizado_por,actualizado_en,nota,boleto,seq)
        VALUES (?,?,?,?,?,?,'',?,'app',?,?,'',?,?,?,?,?)`).bind(nid, id, d.asiento, d.nombre, d.dni, tel(b.celular), est, b.precio !== undefined && b.precio !== '' ? monto(b.precio) : precioBase, ahora, yo.nombre, ahora, texto(b.nota, 200), nuevoBoleto(), s)]).catch(conflicto);
      await auditar(env, yo.nombre, 'exc_pasajero', `${e.titulo} · asiento ${d.asiento} · ${d.nombre}`);
      return { id: nid };
    }
    const x = pas.find(r => r.id === b.id); if (!x) throw new ErrorApi('Pasajero no encontrado', 'NO_EXISTE', 404);
    if (b.accion === 'editar') {
      const d = limpiarPasajero({ nombre: b.nombre, dni: b.dni, asiento: b.asiento || x.asiento }); if (d.error) throw new ErrorApi(d.error);
      if (x.estado !== 'liberado') { const m = libre(d.asiento, x.id) || dniLibre(d.dni, x.id); if (m) throw new ErrorApi(m, 'OCUPADO', 409); }
      const s = await reservarSeq(env, 1);
      await env.DB.prepare('UPDATE exc_pasajeros SET asiento=?, nombre=?, dni=?, celular=?, precio=?, nota=?, actualizado_por=?, actualizado_en=?, seq=? WHERE id=?')
        .bind(d.asiento, d.nombre, d.dni, tel(b.celular) || x.celular, b.precio !== undefined && b.precio !== '' ? monto(b.precio) : x.precio, b.nota !== undefined ? texto(b.nota, 200) : x.nota, yo.nombre, ahora, s, x.id).run().catch(conflicto);
      await auditar(env, yo.nombre, 'exc_pasajero', `${e.titulo} · ${d.nombre} · asiento ${x.asiento}→${d.asiento}`);
      return { id: x.id };
    }
    if (b.accion === 'eliminar') {
      // Para reservas hechas por error. Si tiene un pago registrado, primero se anula el pago.
      const pago = await env.DB.prepare('SELECT 1 FROM exc_movimientos WHERE pasajero_id = ? AND COALESCE(anulado,0) = 0').bind(x.id).first();
      if (pago) throw new ErrorApi('Esta reserva tiene un pago registrado. Anula primero ese ingreso en «Ingresos y gastos».');
      await env.DB.prepare('DELETE FROM exc_pasajeros WHERE id = ?').bind(x.id).run();
      await auditar(env, yo.nombre, 'exc_pasajero_eliminar', `${e.titulo} · asiento ${x.asiento} · ${x.nombre} · DNI ${x.dni}`);
      return { id: x.id, eliminado: true };
    }
    if (b.accion === 'estado') {
      if (!EST_PAS.includes(b.estado)) throw new ErrorApi('Estado no válido');
      if (x.estado === 'liberado' && b.estado !== 'liberado') { const m = libre(num(x.asiento), x.id) || dniLibre(String(x.dni), x.id); if (m) throw new ErrorApi(m + ' No se puede reactivar.', 'OCUPADO', 409); }
      const s = await reservarSeq(env, 1);
      const st = [env.DB.prepare('UPDATE exc_pasajeros SET estado=?, vence_en=CASE WHEN ?=\'reservado\' THEN vence_en ELSE \'\' END, actualizado_por=?, actualizado_en=?, seq=? WHERE id=?').bind(b.estado, b.estado, yo.nombre, ahora, s, x.id)];
      let movId = '';
      if (b.cobro && monto(b.cobro.monto) > 0) {
        const m = await prepMov(env, yo, e, { tipo: 'ingreso', categoria: b.cobro.categoria || 'pasaje', monto: b.cobro.monto, medio: b.cobro.medio, cuenta: b.cobro.cuenta, pasajero_id: x.id, descripcion: `Asiento ${x.asiento} · ${x.nombre}`, comprobante_tipo: 'sin' });
        st.push(...m.st); movId = m.id;
      }
      await env.DB.batch(st).catch(conflicto);
      await auditar(env, yo.nombre, 'exc_pasajero', `${e.titulo} · asiento ${x.asiento} · ${x.estado}→${b.estado}`);
      return { id: x.id, movimiento_id: movId };
    }
    throw new ErrorApi('Acción no válida');
  }

  /* Ingresos y gastos. Idempotente por id: la cola sin señal puede reenviarlo y no se duplica. */
  async function prepMov(env, yo, e, m) {
    const tipo = m.tipo === 'ingreso' ? 'ingreso' : 'egreso';
    const cat = CAT_EXC[tipo].includes(m.categoria) ? m.categoria : (tipo === 'ingreso' ? 'otro_ingreso' : 'otro_gasto');
    const mt = monto(m.monto); if (!(mt > 0) || mt > 50000) throw new ErrorApi('Monto no válido.');
    const gal = cat === 'combustible' ? monto(m.galones) : null; if (gal != null && gal > 200) throw new ErrorApi('Galones no válidos.');
    const id = /^[0-9a-f-]{36}$/i.test(String(m.id || '')) ? m.id : crypto.randomUUID();
    const st = []; let fotoId = null;
    if (m.foto && m.foto.data) {
      const mime = String(m.foto.mime || 'image/jpeg');
      if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mime)) throw new ErrorApi('Formato de archivo no admitido');
      const bin = Uint8Array.from(atob(String(m.foto.data)), c => c.charCodeAt(0));
      if (bin.length > 1500000) throw new ErrorApi('La foto pesa más de 1.5 MB. Tómala de nuevo.');
      fotoId = crypto.randomUUID();
      st.push(env.DB.prepare('INSERT INTO comprobantes (id, mime, datos, creado_en) VALUES (?,?,?,?)').bind(fotoId, mime, bin, ahoraLima()));
    }
    const s = await reservarSeq(env, 1);
    const fecha = fechaTxt(m.fecha) || ahoraLima().slice(0, 16).replace(' ', 'T');
    st.push(env.DB.prepare(`INSERT INTO exc_movimientos (id,excursion_id,tipo,categoria,monto,medio,cuenta,pasajero_id,galones,km_odometro,comprobante_tipo,comprobante_num,foto_url,foto_id,descripcion,fecha,registrado_por,registrado_en,anulado,anulado_por,motivo_anulacion,seq)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,'','',?)`).bind(id, e.id, tipo, cat, mt, ['efectivo', 'yape', 'transferencia'].includes(m.medio) ? m.medio : 'efectivo', texto(m.cuenta, 40), texto(m.pasajero_id, 60),
      gal, m.km_odometro ? Math.round(num(m.km_odometro)) : null, ['boleta', 'factura', 'ticket', 'sin'].includes(m.comprobante_tipo) ? m.comprobante_tipo : 'sin', texto(m.comprobante_num, 40),
      fotoId ? '/api/comprobantes/' + fotoId : '', fotoId, texto(m.descripcion, 200), fecha, yo.nombre, ahoraLima(), s));
    return { id, st };
  }
  async function movimiento(env, yo, m) {
    if (m.id && await env.DB.prepare('SELECT 1 FROM exc_movimientos WHERE id = ?').bind(m.id).first()) return { id: m.id, duplicado: true };
    const e = await porId(env, m.excursion_id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    if (e.estado === 'anulada') throw new ErrorApi('La excursión está anulada.');
    const r = await prepMov(env, yo, e, m);
    await env.DB.batch(r.st);
    await auditar(env, yo.nombre, 'exc_mov', `${e.titulo} · ${m.tipo} · ${m.categoria} · S/ ${monto(m.monto)}`);
    return { id: r.id };
  }
  async function eliminarExc(env, yo, id) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    const mv = await env.DB.prepare('SELECT COUNT(*) n FROM exc_movimientos WHERE excursion_id = ? AND COALESCE(anulado,0) = 0').bind(id).first();
    if (mv.n > 0) throw new ErrorApi(`Tiene ${mv.n} ingreso(s) o gasto(s) activos. Anúlalos primero, o usa «Anular excursión» para conservar el historial.`);
    const pas = await env.DB.prepare('SELECT COUNT(*) n FROM exc_pasajeros WHERE excursion_id = ?').bind(id).first();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM exc_pasajeros WHERE excursion_id = ?').bind(id),
      env.DB.prepare('DELETE FROM exc_movimientos WHERE excursion_id = ?').bind(id),
      env.DB.prepare('DELETE FROM excursiones WHERE id = ?').bind(id),
    ]);
    await auditar(env, yo.nombre, 'exc_eliminar', `${e.titulo} · ${e.salida} · código ${e.codigo} · ${pas.n} reserva(s)`);
    return { id, eliminada: true };
  }
  async function editarMov(env, yo, id, b) {
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo de la corrección.');
    const m = await env.DB.prepare('SELECT * FROM exc_movimientos WHERE id = ?').bind(id).first(); if (!m) throw new ErrorApi('Movimiento no encontrado', 'NO_EXISTE', 404);
    if (m.anulado) throw new ErrorApi('Un movimiento anulado no se edita.');
    const c = {};
    if (b.monto !== undefined) { const v = monto(b.monto); if (!(v > 0) || v > 50000) throw new ErrorApi('Monto no válido.'); c.monto = v; }
    if (b.categoria !== undefined) { if (!CAT_EXC[m.tipo].includes(b.categoria)) throw new ErrorApi('Tipo no válido'); c.categoria = b.categoria; }
    if (b.medio !== undefined) c.medio = ['efectivo', 'yape', 'transferencia'].includes(b.medio) ? b.medio : m.medio;
    if (b.cuenta !== undefined) c.cuenta = texto(b.cuenta, 40);
    if (b.descripcion !== undefined) c.descripcion = texto(b.descripcion, 200);
    if (b.comprobante_num !== undefined) c.comprobante_num = texto(b.comprobante_num, 40);
    if (b.galones !== undefined) c.galones = monto(b.galones);
    if (b.fecha !== undefined && fechaTxt(b.fecha)) c.fecha = fechaTxt(b.fecha);
    const campos = Object.keys(c).filter(k => String(c[k] ?? '') !== String(m[k] ?? ''));
    if (!campos.length) throw new ErrorApi('No cambiaste nada.');
    const st = [];
    for (const k of campos) st.push(env.DB.prepare('INSERT INTO correcciones (id, pestana, ubicacion, campo, valor_anterior, valor_nuevo, por_que, seq) VALUES (?,?,?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), 'Exc_Movimientos', id, k, String(m[k] ?? ''), String(c[k] ?? ''), `${motivo} — ${yo.nombre} · ${ahoraLima()}`, await reservarSeq(env, 1)));
    const upd = { ...Object.fromEntries(campos.map(k => [k, c[k]])), seq: await reservarSeq(env, 1) };
    const k2 = Object.keys(upd);
    st.push(env.DB.prepare(`UPDATE exc_movimientos SET ${k2.map(k => `${k} = ?`).join(', ')} WHERE id = ?`).bind(...k2.map(k => upd[k]), id));
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'exc_mov_editar', `${m.categoria} · ${campos.map(k => `${k}: ${m[k] ?? '—'} → ${c[k] ?? '—'}`).join(' · ')} · ${motivo}`);
    return { id };
  }
  async function anular(env, yo, id, b) {
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo de la anulación.');
    const m = await env.DB.prepare('SELECT * FROM exc_movimientos WHERE id = ?').bind(id).first(); if (!m) throw new ErrorApi('Movimiento no encontrado', 'NO_EXISTE', 404);
    if (m.anulado) throw new ErrorApi('Ya estaba anulado.');
    await env.DB.prepare('UPDATE exc_movimientos SET anulado=1, anulado_por=?, motivo_anulacion=?, seq=? WHERE id=?').bind(yo.nombre, motivo, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'exc_anular', `${m.categoria} S/ ${m.monto} · ${motivo}`);
    return { id };
  }


  /* ═════════ Pago con voucher, boleto digital y viajes para compartir (v3.1) ═════════ */
  async function grupoPublico(env, cod, grupo, cel4) {
    const e = await porCodigo(env, cod); if (!e) throw new ErrorApi('Este enlace no existe o ya no está disponible.', 'NO_EXISTE', 404);
    const pas = (await env.DB.prepare('SELECT * FROM exc_pasajeros WHERE excursion_id = ? AND grupo = ?').bind(e.id, String(grupo || '').toUpperCase()).all()).results;
    // El código de reserva más los 4 últimos dígitos del celular: así nadie ve una reserva ajena adivinando códigos.
    if (!pas.length || !pas.some(x => String(x.celular || '').slice(-4) === String(cel4 || ''))) throw new ErrorApi('No encontramos esa reserva. Revisa el código y los 4 últimos dígitos de tu celular.', 'NO_EXISTE', 404);
    return { e, pas };
  }
  async function reservaPublica(env, url, cod, grupo) {
    const { e, pas } = await grupoPublico(env, cod, grupo, url.searchParams.get('c'));
    const v = await env.DB.prepare('SELECT estado, motivo, monto, creado_en FROM exc_vouchers WHERE excursion_id = ? AND grupo = ? ORDER BY creado_en DESC LIMIT 1').bind(e.id, String(grupo).toUpperCase()).first();
    const act = pas.filter(x => ACTIVOS.includes(x.estado) && !vencido(x));
    return { titulo: e.titulo, origen: e.origen, destino: e.destino, via: e.via, salida: e.salida, retorno: e.retorno, tipo: e.tipo, instrucciones_pago: e.instrucciones_pago || '', whatsapp: tel(e.whatsapp),
      grupo: String(grupo).toUpperCase(), total: act.reduce((s, x) => s + num(x.precio), 0),
      pasajeros: pas.map(x => ({ asiento: x.asiento, nombre: x.nombre, estado: vencido(x) ? 'vencido' : x.estado, vence_en: x.estado === 'reservado' ? x.vence_en : '', boleto: ['confirmado', 'pagado'].includes(x.estado) ? x.boleto : null })),
      voucher: v || null };
  }
  async function subirVoucher(env, b, ip) {
    const { e, pas } = await grupoPublico(env, b.codigo, b.grupo, b.cel4);
    if (!(await limite(env, `v:${e.id}:${b.grupo}`, 6, 3600)) || !(await limite(env, `v:ip:${ip}`, 30, 3600))) throw new ErrorApi('Demasiados intentos. Espera unos minutos.', 'LIMITE', 429);
    const porPagar = pas.filter(x => ['reservado', 'confirmado'].includes(x.estado) && !vencido(x));
    if (!porPagar.length) throw new ErrorApi('Esta reserva no tiene asientos pendientes de pago.');
    const mt = monto(b.monto); if (!(mt > 0) || mt > 50000) throw new ErrorApi('Escribe el monto que pagaste.');
    if (!b.foto || !b.foto.data) throw new ErrorApi('Adjunta la captura de tu Yape o transferencia.');
    const foto = await prepararFoto(env, b.foto);
    const op = texto(b.operacion, 30).replace(/\s+/g, '');
    const opRep = op ? !!(await env.DB.prepare("SELECT 1 FROM exc_vouchers WHERE operacion = ? AND estado <> 'rechazado'").bind(op).first()) : false;
    const id = crypto.randomUUID(), s = await reservarSeq(env, 2);
    await env.DB.batch([
      foto.st,
      env.DB.prepare("UPDATE exc_vouchers SET estado='reemplazado', seq=? WHERE excursion_id=? AND grupo=? AND estado='pendiente'").bind(s, e.id, String(b.grupo).toUpperCase()),
      env.DB.prepare(`INSERT INTO exc_vouchers (id,excursion_id,grupo,monto,operacion,foto_id,foto_repetida,operacion_repetida,estado,celular,creado_en,seq) VALUES (?,?,?,?,?,?,?,?,'pendiente',?,?,?)`)
        .bind(id, e.id, String(b.grupo).toUpperCase(), mt, op || null, foto.id, foto.repetida ? 1 : 0, opRep ? 1 : 0, porPagar[0].celular, ahoraLima(), s + 1),
    ]);
    await auditar(env, 'enlace', 'exc_voucher', `${e.titulo} · grupo ${b.grupo} · S/ ${mt}${op ? ' · op ' + op : ''}${foto.repetida || opRep ? ' · REPETIDO' : ''}`);
    if (avisar) await avisar(env, { tipo: 'voucher', para: 'mando', titulo: `Nuevo voucher por aprobar · S/ ${mt}`, detalle: `${e.titulo} · grupo ${b.grupo}${foto.repetida || opRep ? ' · ojo: captura u operación repetida' : ''}`, ir: 'revision' });
    return { id, estado: 'pendiente' };
  }
  async function boletoPublico(env, token) {
    const x = await env.DB.prepare('SELECT * FROM exc_pasajeros WHERE boleto = ?').bind(String(token || '').toLowerCase()).first();
    if (!x) throw new ErrorApi('Boleto no encontrado.', 'NO_EXISTE', 404);
    const e = await porId(env, x.excursion_id); if (!e) throw new ErrorApi('Boleto no encontrado.', 'NO_EXISTE', 404);
    const est = vencido(x) ? 'vencido' : x.estado;
    return { titulo: e.titulo, origen: e.origen, destino: e.destino, via: e.via, salida: e.salida, retorno: e.retorno, estado_viaje: e.estado,
      asiento: x.asiento, nombre: x.nombre, dni: ocultarDni(x.dni), estado: est, grupo: x.grupo || '', boleto: x.boleto, whatsapp: tel(e.whatsapp),
      valido: ['confirmado', 'pagado'].includes(est) && e.estado !== 'anulada' && !!x.dni, falta_datos: !x.dni };
  }
  async function vouchersPendientes(env) {
    const v = (await env.DB.prepare(`SELECT v.*, e.titulo, e.salida FROM exc_vouchers v JOIN excursiones e ON e.id = v.excursion_id WHERE v.estado='pendiente' ORDER BY v.creado_en`).all()).results;
    for (const x of v) x.pasajeros = (await env.DB.prepare('SELECT asiento, nombre, estado, precio FROM exc_pasajeros WHERE excursion_id=? AND grupo=?').bind(x.excursion_id, x.grupo).all()).results;
    return { vouchers: v };
  }
  async function aprobarVoucher(env, yo, id, b) {
    if (!puedeYape(yo)) throw new ErrorApi('Los vouchers de Yape los verifica quien maneja los Yape (Yenner o Superadmin).', 'SIN_PERMISO', 403);
    const v = await env.DB.prepare('SELECT * FROM exc_vouchers WHERE id = ?').bind(id).first(); if (!v) throw new ErrorApi('Voucher no encontrado', 'NO_EXISTE', 404);
    if (v.estado !== 'pendiente') throw new ErrorApi('Ese voucher ya fue revisado.');
    const e = await porId(env, v.excursion_id);
    if (v.grupo === 'ORG' && e.tipo === 'contrato') return aprobarContrato(env, yo, v, e, b);
    const pas = (await env.DB.prepare('SELECT * FROM exc_pasajeros WHERE excursion_id=? AND grupo=?').bind(v.excursion_id, v.grupo).all()).results.filter(x => ['reservado', 'confirmado'].includes(x.estado));
    if (!pas.length) throw new ErrorApi('Ese grupo ya no tiene asientos por pagar (¿se liberaron?).');
    const mt = b.monto !== undefined && b.monto !== '' ? monto(b.monto) : num(v.monto); if (!(mt > 0)) throw new ErrorApi('Monto no válido.');
    const cuenta = await env.DB.prepare("SELECT clave FROM cuentas WHERE tipo='digital' AND COALESCE(transitoria,0)=0 AND COALESCE(activo,1)=1 LIMIT 1").first();
    const ahora = ahoraLima(), movId = crypto.randomUUID(), s = await reservarSeq(env, pas.length + 2);
    const st = pas.map((x, i) => env.DB.prepare("UPDATE exc_pasajeros SET estado='pagado', vence_en='', boleto=COALESCE(NULLIF(boleto,''), ?), actualizado_por=?, actualizado_en=?, seq=? WHERE id=?").bind(nuevoBoleto(), yo.nombre, ahora, s + i, x.id));
    st.push(env.DB.prepare(`INSERT INTO exc_movimientos (id,excursion_id,tipo,categoria,monto,medio,cuenta,pasajero_id,galones,km_odometro,comprobante_tipo,comprobante_num,foto_url,foto_id,descripcion,fecha,registrado_por,registrado_en,anulado,anulado_por,motivo_anulacion,seq)
      VALUES (?,?,'ingreso',?,?,'yape',?,?,NULL,NULL,'voucher',?,?,?,?,?,?,?,0,'','',?)`).bind(movId, v.excursion_id, e.tipo === 'contrato' ? 'adelanto' : 'pasaje', mt, cuenta ? cuenta.clave : '', pas[0].id, v.operacion || '',
      v.foto_id ? '/api/comprobantes/' + v.foto_id : '', v.foto_id, `Voucher grupo ${v.grupo} · asientos ${pas.map(x => x.asiento).join(', ')}`, ahora.slice(0, 16).replace(' ', 'T'), yo.nombre, ahora, s + pas.length));
    st.push(env.DB.prepare("UPDATE exc_vouchers SET estado='aprobado', monto=?, revisado_por=?, revisado_en=?, movimiento_id=?, seq=? WHERE id=?").bind(mt, yo.nombre, ahora, movId, s + pas.length + 1, id));
    await env.DB.batch(st);
    await auditar(env, yo.nombre, 'exc_voucher_aprobar', `${e.titulo} · grupo ${v.grupo} · S/ ${mt}`);
    const listos = (await env.DB.prepare('SELECT asiento, nombre, celular, boleto FROM exc_pasajeros WHERE excursion_id=? AND grupo=?').bind(v.excursion_id, v.grupo).all()).results;
    return { id, pasajeros: listos, celular: v.celular, titulo: e.titulo, salida: e.salida, origen: e.origen, destino: e.destino };
  }
  async function rechazarVoucher(env, yo, id, b) {
    if (!puedeYape(yo)) throw new ErrorApi('Los vouchers de Yape los verifica quien maneja los Yape (Yenner o Superadmin).', 'SIN_PERMISO', 403);
    const motivo = texto(b.motivo, 200); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo: el pasajero lo verá.');
    const v = await env.DB.prepare('SELECT * FROM exc_vouchers WHERE id = ?').bind(id).first(); if (!v) throw new ErrorApi('Voucher no encontrado', 'NO_EXISTE', 404);
    if (v.estado !== 'pendiente') throw new ErrorApi('Ese voucher ya fue revisado.');
    await env.DB.prepare("UPDATE exc_vouchers SET estado='rechazado', motivo=?, revisado_por=?, revisado_en=?, seq=? WHERE id=?").bind(motivo, yo.nombre, ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'exc_voucher_rechazar', `grupo ${v.grupo} · ${motivo}`);
    return { id, celular: v.celular, grupo: v.grupo };
  }
  /* Para todo el equipo, incluido el operador: viajes abiertos para compartir y su lista de pasajeros. Sin montos. */
  async function viajesCompartir(env) {
    const desde = ahoraLima().slice(0, 10);
    const ex = (await env.DB.prepare("SELECT * FROM excursiones WHERE estado IN ('abierta','cerrada','en_ruta') AND (substr(salida,1,10) >= ? OR estado = 'en_ruta') ORDER BY salida").bind(desde).all()).results;
    const out = [];
    for (const e of ex) { const act = activos(await pasajerosDe(env, e.id)); out.push({ id: e.id, codigo: e.codigo, titulo: e.titulo, origen: e.origen, destino: e.destino, via: e.via, salida: e.salida, retorno: e.retorno, estado: e.estado, tipo: e.tipo, precio_asiento: e.tipo === 'por_asiento' ? num(e.precio_asiento) : null, ocupados: act.length, vendibles: total(e) - bloqueados(e).length }); }
    return { viajes: out };
  }
  async function manifiesto(env, id) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Viaje no encontrado', 'NO_EXISTE', 404);
    const act = activos(await pasajerosDe(env, id)).sort((a, b) => num(a.asiento) - num(b.asiento));
    return { id, codigo: e.codigo, titulo: e.titulo, origen: e.origen, destino: e.destino, salida: e.salida, estado: e.estado,
      pasajeros: act.map(x => ({ asiento: x.asiento, nombre: x.nombre, dni: x.dni, celular: x.celular, estado: x.estado, boleto: x.boleto })) };
  }

  /* ═════════ Enlace del organizador (v3.2) ═════════
     Un enlace privado por excursión para el líder o quien contrata: registra a todo su grupo sin el límite de 6,
     aparta asientos y completa nombres después, corrige datos hasta el cierre y paga con un solo voucher. */
  async function porToken(env, t) {
    const tok = String(t || '').toLowerCase().replace(/[^a-f0-9]/g, '');
    const e = tok.length >= 16 ? await env.DB.prepare('SELECT * FROM excursiones WHERE token_org = ?').bind(tok).first() : null;
    if (!e || e.estado === 'anulada') throw new ErrorApi('Este enlace de organizador no es válido o fue cambiado. Pide uno nuevo a Villa Azul.', 'NO_EXISTE', 404);
    return e;
  }
  const orgEditable = (e) => ['borrador', 'abierta'].includes(e.estado) && !(e.cierre_reservas && limaADate(e.cierre_reservas).getTime() < Date.now());
  async function orgVista(env, t) {
    const e = await porToken(env, t), pas = await pasajerosDe(env, e.id), act = activos(pas);
    const vou = (await env.DB.prepare("SELECT id, grupo, monto, concepto, operacion, estado, motivo, creado_en FROM exc_vouchers WHERE excursion_id = ? AND grupo = 'ORG' ORDER BY creado_en DESC").bind(e.id).all()).results;
    const pagado = (await env.DB.prepare("SELECT COALESCE(SUM(monto),0) s FROM exc_movimientos WHERE excursion_id=? AND tipo='ingreso' AND COALESCE(anulado,0)=0").bind(e.id).first()).s;
    const pactado = e.tipo === 'contrato' ? num(e.monto_contrato) : act.reduce((s, x) => s + num(x.precio), 0);
    return { titulo: e.titulo, codigo: e.codigo, tipo: e.tipo, origen: e.origen, destino: e.destino, via: e.via, salida: e.salida, retorno: e.retorno, estado: e.estado, cliente: e.cliente,
      editable: orgEditable(e), instrucciones_pago: e.instrucciones_pago || '', whatsapp: tel(e.whatsapp), precio_asiento: e.tipo === 'por_asiento' ? num(e.precio_asiento) : null,
      asientos_total: total(e), bloqueados: bloqueados(e),
      pasajeros: act.sort((a, b) => num(a.asiento) - num(b.asiento)).map(x => ({ id: x.id, asiento: x.asiento, nombre: x.nombre, dni: ocultarDni(x.dni), celular: x.celular ? String(x.celular).slice(-4) : '', estado: x.estado,
        origen: x.origen_registro, falta_datos: !x.dni || x.nombre === POR_CONFIRMAR, boleto: ['confirmado', 'pagado'].includes(x.estado) && x.dni ? x.boleto : null })),
      resumen: { pactado: Math.round(pactado * 100) / 100, pagado: Math.round(pagado * 100) / 100, por_pagar: Math.max(0, Math.round((pactado - pagado) * 100) / 100) },
      vouchers: vou };
  }
  function limpiarOrg(x) {
    const asiento = Number(x && x.asiento);
    if (!(asiento >= 1 && asiento <= MAX_ASIENTOS && asiento % 1 === 0)) return { error: 'Asiento no válido.' };
    const nombre = texto(x.nombre, 80).replace(/\s+/g, ' '), dni = String(x.dni || '').replace(/\D/g, '');
    if (!nombre && !dni) return { asiento, nombre: POR_CONFIRMAR, dni: null, celular: tel(x.celular) || null };      // apartado: datos después
    if (nombre.split(' ').length < 2) return { error: `Asiento ${asiento}: escribe nombre y al menos un apellido.` };
    if (dni.length !== 8) return { error: `Asiento ${asiento}: el DNI debe tener 8 números.` };
    return { asiento, nombre, dni, celular: tel(x.celular) || null };
  }
  async function orgAgregar(env, t, b, ip) {
    const e = await porToken(env, t);
    if (!orgEditable(e)) throw new ErrorApi('Las reservas de este viaje ya cerraron. Para cambios, escribe a Villa Azul.', 'CERRADA');
    if (!(await limite(env, `o:${e.id}:${ip}`, 60, 3600))) throw new ErrorApi('Demasiados cambios seguidos. Espera unos minutos.', 'LIMITE', 429);
    const lista = Array.isArray(b.pasajeros) ? b.pasajeros.slice(0, MAX_ASIENTOS) : [];
    if (!lista.length) throw new ErrorApi('Elige al menos un asiento.');
    const pas = await pasajerosDe(env, e.id), act = activos(pas), tot = total(e), bloq = bloqueados(e), vistos = {}, dnis = {}, out = [];
    for (const x of lista) {
      const d = limpiarOrg(x); if (d.error) throw new ErrorApi(d.error);
      if (d.asiento > tot || bloq.includes(d.asiento)) throw new ErrorApi(`El asiento ${d.asiento} no está disponible.`);
      if (vistos[d.asiento]) throw new ErrorApi(`El asiento ${d.asiento} está repetido.`); vistos[d.asiento] = 1;
      const o = act.find(p => num(p.asiento) === d.asiento); if (o) throw new ErrorApi(`El asiento ${d.asiento} ya es de ${o.nombre}.`, 'OCUPADO', 409);
      if (d.dni) { if (dnis[d.dni] || act.some(p => String(p.dni) === d.dni)) throw new ErrorApi(`El DNI ${d.dni} ya está registrado en este viaje.`, 'DNI'); dnis[d.dni] = 1; }
      out.push(d);
    }
    const estado = e.tipo === 'contrato' ? 'confirmado' : 'reservado', horas = num(e.vence_horas);
    const vence = estado === 'reservado' && horas > 0 ? new Date(Date.now() + horas * 3600000).toISOString() : '';
    const precio = e.tipo === 'por_asiento' ? num(e.precio_asiento) : null, ahora = ahoraLima(), s0 = await reservarSeq(env, out.length);
    const st = [sqlLiberarVencidos(env, e.id)].concat(out.map((d, i) => env.DB.prepare(
      `INSERT INTO exc_pasajeros (id,excursion_id,asiento,nombre,dni,celular,grupo,estado,origen_registro,precio,creado_en,vence_en,actualizado_por,actualizado_en,nota,boleto,seq)
       VALUES (?,?,?,?,?,?,'ORG',?,'organizador',?,?,?,'organizador',?,'',?,?)`).bind(crypto.randomUUID(), e.id, d.asiento, d.nombre, d.dni, d.celular, estado, precio, ahora, vence, ahora, nuevoBoleto(), s0 + i)));
    try { await env.DB.batch(st); }
    catch (err) { if (/UNIQUE/i.test(String(err.message))) throw new ErrorApi('Uno de esos asientos o DNI acaba de registrarse. Vuelve a cargar.', 'OCUPADO', 409); throw err; }
    await auditar(env, 'organizador', 'exc_org_agregar', `${e.titulo} · asientos ${out.map(d => d.asiento).join(', ')}${out.some(d => !d.dni) ? ' · con apartados sin nombre' : ''}`);
    return orgVista(env, t);
  }
  async function orgEditar(env, t, id, b) {
    const e = await porToken(env, t);
    if (!orgEditable(e)) throw new ErrorApi('Las reservas de este viaje ya cerraron. Para cambios, escribe a Villa Azul.', 'CERRADA');
    const pas = await pasajerosDe(env, e.id), act = activos(pas), x = act.find(p => p.id === id);
    if (!x) throw new ErrorApi('Ese pasajero ya no está en el viaje.', 'NO_EXISTE', 404);
    const d = limpiarOrg({ asiento: b.asiento || x.asiento, nombre: b.nombre, dni: b.dni, celular: b.celular });
    if (d.error) throw new ErrorApi(d.error);
    if (!d.dni) throw new ErrorApi('Escribe nombre y DNI.');
    if (d.asiento !== num(x.asiento)) {
      if (d.asiento > total(e) || bloqueados(e).includes(d.asiento)) throw new ErrorApi(`El asiento ${d.asiento} no está disponible.`);
      const o = act.find(p => num(p.asiento) === d.asiento && p.id !== id); if (o) throw new ErrorApi(`El asiento ${d.asiento} ya es de ${o.nombre}.`, 'OCUPADO', 409);
    }
    if (act.some(p => String(p.dni) === d.dni && p.id !== id)) throw new ErrorApi(`El DNI ${d.dni} ya está registrado en este viaje.`, 'DNI');
    await env.DB.prepare('UPDATE exc_pasajeros SET asiento=?, nombre=?, dni=?, celular=COALESCE(?, celular), actualizado_por=?, actualizado_en=?, seq=? WHERE id=?')
      .bind(d.asiento, d.nombre, d.dni, d.celular, 'organizador', ahoraLima(), await reservarSeq(env, 1), id).run()
      .catch(err => { if (/UNIQUE/i.test(String(err.message))) throw new ErrorApi('Ese asiento o DNI acaba de registrarse. Vuelve a cargar.', 'OCUPADO', 409); throw err; });
    await auditar(env, 'organizador', 'exc_org_editar', `${e.titulo} · asiento ${x.asiento} · ${x.nombre} → ${d.nombre}`);
    return orgVista(env, t);
  }
  async function orgQuitar(env, t, id) {
    const e = await porToken(env, t);
    if (!orgEditable(e)) throw new ErrorApi('Las reservas de este viaje ya cerraron. Para cambios, escribe a Villa Azul.', 'CERRADA');
    const x = activos(await pasajerosDe(env, e.id)).find(p => p.id === id); if (!x) throw new ErrorApi('Ese pasajero ya no está en el viaje.', 'NO_EXISTE', 404);
    if (x.estado === 'pagado' && e.tipo === 'por_asiento') throw new ErrorApi('Ese asiento ya está pagado: para quitarlo escribe a Villa Azul.');
    await env.DB.prepare("UPDATE exc_pasajeros SET estado='liberado', nota=TRIM(COALESCE(nota,'')||' quitado por el organizador'), actualizado_por='organizador', actualizado_en=?, seq=? WHERE id=?").bind(ahoraLima(), await reservarSeq(env, 1), id).run();
    await auditar(env, 'organizador', 'exc_org_quitar', `${e.titulo} · asiento ${x.asiento} · ${x.nombre}`);
    return orgVista(env, t);
  }
  async function orgVoucher(env, t, b, ip) {
    const e = await porToken(env, t);
    if (!(await limite(env, `ov:${e.id}:${ip}`, 8, 3600))) throw new ErrorApi('Demasiados intentos. Espera unos minutos.', 'LIMITE', 429);
    const mt = monto(b.monto); if (!(mt > 0) || mt > 50000) throw new ErrorApi('Escribe el monto que pagaste.');
    if (!b.foto || !b.foto.data) throw new ErrorApi('Adjunta la captura de tu Yape o transferencia.');
    const concepto = ['adelanto', 'saldo', 'pasaje'].includes(b.concepto) ? b.concepto : (e.tipo === 'contrato' ? 'adelanto' : 'pasaje');
    const foto = await prepararFoto(env, b.foto), op = texto(b.operacion, 30).replace(/\s+/g, '');
    const opRep = op ? !!(await env.DB.prepare("SELECT 1 FROM exc_vouchers WHERE operacion = ? AND estado <> 'rechazado'").bind(op).first()) : false;
    const id = crypto.randomUUID(), s = await reservarSeq(env, 1);
    await env.DB.batch([foto.st, env.DB.prepare(`INSERT INTO exc_vouchers (id,excursion_id,grupo,monto,operacion,foto_id,foto_repetida,operacion_repetida,estado,celular,creado_en,concepto,seq) VALUES (?,?,'ORG',?,?,?,?,?,'pendiente',?,?,?,?)`)
      .bind(id, e.id, mt, op || null, foto.id, foto.repetida ? 1 : 0, opRep ? 1 : 0, tel(e.cliente_tel) || null, ahoraLima(), concepto, s)]);
    await auditar(env, 'organizador', 'exc_voucher', `${e.titulo} · organizador · ${concepto} S/ ${mt}${op ? ' · op ' + op : ''}`);
    if (avisar) await avisar(env, { tipo: 'voucher', para: 'mando', titulo: `Voucher del organizador por aprobar · S/ ${mt}`, detalle: `${e.titulo} · ${concepto}${opRep ? ' · ojo: operación repetida' : ''}`, ir: 'revision' });
    return orgVista(env, t);
  }
  /** Voucher del organizador en un contrato: es adelanto o saldo del contrato, no el pago de asientos sueltos. */
  async function aprobarContrato(env, yo, v, e, b) {
    const mt = b.monto !== undefined && b.monto !== '' ? monto(b.monto) : num(v.monto); if (!(mt > 0)) throw new ErrorApi('Monto no válido.');
    const cuenta = await env.DB.prepare("SELECT clave FROM cuentas WHERE tipo='digital' AND COALESCE(transitoria,0)=0 AND COALESCE(activo,1)=1 LIMIT 1").first();
    const ahora = ahoraLima(), movId = crypto.randomUUID(), s = await reservarSeq(env, 2), concepto = ['adelanto', 'saldo'].includes(v.concepto) ? v.concepto : 'adelanto';
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO exc_movimientos (id,excursion_id,tipo,categoria,monto,medio,cuenta,pasajero_id,galones,km_odometro,comprobante_tipo,comprobante_num,foto_url,foto_id,descripcion,fecha,registrado_por,registrado_en,anulado,anulado_por,motivo_anulacion,seq)
        VALUES (?,?,'ingreso',?,?,'yape',?,'',NULL,NULL,'voucher',?,?,?,?,?,?,?,0,'','',?)`).bind(movId, e.id, concepto, mt, cuenta ? cuenta.clave : '', v.operacion || '', v.foto_id ? '/api/comprobantes/' + v.foto_id : '', v.foto_id,
        `Voucher del organizador · ${concepto} del contrato`, ahora.slice(0, 16).replace(' ', 'T'), yo.nombre, ahora, s),
      env.DB.prepare("UPDATE exc_vouchers SET estado='aprobado', monto=?, revisado_por=?, revisado_en=?, movimiento_id=?, seq=? WHERE id=?").bind(mt, yo.nombre, ahora, movId, s + 1, v.id),
    ]);
    await auditar(env, yo.nombre, 'exc_voucher_aprobar', `${e.titulo} · organizador · ${concepto} S/ ${mt}`);
    return { id: v.id, contrato: true, concepto, monto: mt, pasajeros: [], celular: v.celular, titulo: e.titulo, salida: e.salida, origen: e.origen, destino: e.destino };
  }
  async function nuevoTokenOrg(env, yo, id) {
    const e = await porId(env, id); if (!e) throw new ErrorApi('Excursión no encontrada', 'NO_EXISTE', 404);
    const t = nuevoToken();
    await env.DB.prepare('UPDATE excursiones SET token_org=?, seq=? WHERE id=?').bind(t, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'exc_org_token', `${e.titulo} · enlace de organizador cambiado (el anterior dejó de funcionar)`);
    return { token_org: t };
  }
  /* ═════════ Rutas ═════════ */
  async function publicas(env, req, url) {
    const p = url.pathname;
    const mp = p.match(/^\/api\/publico\/excursion\/([A-Za-z0-9]+)$/);
    if (mp && req.method === 'GET') return publica(env, mp[1]);
    if (p === '/api/publico/reservar' && req.method === 'POST') return reservar(env, await req.json().catch(() => ({})), req.headers.get('cf-connecting-ip') || 'local');
    const mr = p.match(/^\/api\/publico\/reserva\/([A-Za-z0-9]+)\/([A-Za-z0-9]+)$/);
    if (mr && req.method === 'GET') return reservaPublica(env, url, mr[1], mr[2]);
    if (p === '/api/publico/voucher' && req.method === 'POST') return subirVoucher(env, await req.json().catch(() => ({})), req.headers.get('cf-connecting-ip') || 'local');
    const mo = p.match(/^\/api\/publico\/org\/([a-f0-9]+)(?:\/(pasajeros|voucher))?(?:\/([\w-]+))?$/i);
    if (mo) {
      const ip = req.headers.get('cf-connecting-ip') || 'local', body = () => req.json().catch(() => ({}));
      if (!mo[2] && req.method === 'GET') return orgVista(env, mo[1]);
      if (mo[2] === 'pasajeros' && !mo[3] && req.method === 'POST') return orgAgregar(env, mo[1], await body(), ip);
      if (mo[2] === 'pasajeros' && mo[3] && req.method === 'PATCH') return orgEditar(env, mo[1], mo[3], await body());
      if (mo[2] === 'pasajeros' && mo[3] && req.method === 'DELETE') return orgQuitar(env, mo[1], mo[3]);
      if (mo[2] === 'voucher' && req.method === 'POST') return orgVoucher(env, mo[1], await body(), ip);
    }
    const mb = p.match(/^\/api\/publico\/boleto\/([a-f0-9]+)$/i);
    if (mb && req.method === 'GET') return boletoPublico(env, mb[1]);
    return undefined;
  }
  async function privadas(env, yo, req, url) {
    const p = url.pathname, m = req.method;
    // Todo el equipo, incluido el operador: compartir enlaces y ver la lista de pasajeros (sin montos).
    if (p === '/api/viajes-compartir' && m === 'GET') return viajesCompartir(env);
    const mv = p.match(/^\/api\/viajes-compartir\/([\w-]+)$/);
    if (mv && m === 'GET') return manifiesto(env, mv[1]);
    if (!p.startsWith('/api/excursiones') && !p.startsWith('/api/comprobantes') && !p.startsWith('/api/exc-movimientos') && !p.startsWith('/api/vouchers')) return undefined;
    exigirMando(yo);
    const cuerpo = () => req.json().catch(() => ({}));
    if (p === '/api/vouchers' && m === 'GET') return vouchersPendientes(env);
    const mvo = p.match(/^\/api\/vouchers\/([\w-]+)\/(aprobar|rechazar)$/);
    if (mvo && m === 'POST') { const b = await cuerpo(); return mvo[2] === 'aprobar' ? aprobarVoucher(env, yo, mvo[1], b) : rechazarVoucher(env, yo, mvo[1], b); }
    if (p === '/api/excursiones' && m === 'GET') return listar(env);
    if (p === '/api/excursiones' && m === 'POST') return guardar(env, yo, null, await cuerpo());
    let r = p.match(/^\/api\/excursiones\/([\w-]+)(?:\/(km|pasajeros|movimientos|token-org))?$/);
    if (r && r[2] === 'token-org' && m === 'POST') return nuevoTokenOrg(env, yo, r[1]);
    if (r && !r[2] && m === 'GET') return detalle(env, r[1]);
    if (r && !r[2] && m === 'PATCH') return guardar(env, yo, r[1], await cuerpo());
    if (r && !r[2] && m === 'DELETE') return eliminarExc(env, yo, r[1]);
    if (r && r[2] === 'km' && m === 'POST') return km(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'pasajeros' && m === 'POST') return pasajero(env, yo, r[1], await cuerpo());
    if (r && r[2] === 'movimientos' && m === 'POST') { const b = await cuerpo(); return movimiento(env, yo, { ...b, excursion_id: r[1] }); }
    r = p.match(/^\/api\/exc-movimientos\/([\w-]+)\/anular$/);
    if (r && m === 'POST') return anular(env, yo, r[1], await cuerpo());
    r = p.match(/^\/api\/exc-movimientos\/([\w-]+)$/);
    if (r && m === 'PATCH') return editarMov(env, yo, r[1], await cuerpo());
    r = p.match(/^\/api\/comprobantes\/([\w-]+)$/);
    if (r && m === 'GET') {
      const f = await env.DB.prepare('SELECT mime, datos FROM comprobantes WHERE id = ?').bind(r[1]).first();
      if (!f) throw new ErrorApi('Comprobante no encontrado', 'NO_EXISTE', 404);
      return new Response(new Uint8Array(f.datos), { headers: { 'content-type': f.mime, 'cache-control': 'private, max-age=86400' } });
    }
    return undefined;
  }
  return { publicas, privadas, movimiento, crear: (env, yo, x) => guardar(env, yo, null, x) };
}
