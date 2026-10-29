/**
 * Villa Azul · Caja diaria, bolsillos y traspasos (port de Caja.gs y Cuentas.gs de la v3.10)
 *
 * Reglas que se conservan tal cual:
 *  - El efectivo se CUENTA; el Yape se CONCILIA. Las dos cifras son netas (cobros − gastos).
 *  - Lo que el operador pagó de su bolsillo no sale de la caja: genera una deuda a su favor.
 *  - Quien declara no firma: el traspaso lo confirma la otra parte.
 *  - El efectivo de un día se entrega UNA sola vez (candado por operador + fecha) y una cuenta
 *    transitoria nunca queda en negativo.
 * Nuevo en Villa Azul: cada administrador verifica la parte que le toca según su función.
 *  Efectivo → función «caja» (Marielena) · Yape → función «digital» (Yenner) · Superadmin, ambas.
 */
export const SQL_CAJA_V4 = [
  'ALTER TABLE cierres ADD COLUMN yape_recibido REAL',
  'ALTER TABLE cierres ADD COLUMN yape_diferencia_final REAL',
  'ALTER TABLE cierres ADD COLUMN yape_verificado_por TEXT',
  'ALTER TABLE cierres ADD COLUMN yape_verificado_en TEXT',
  'ALTER TABLE cierres ADD COLUMN cerrado_por TEXT',
];
const TIPOS_TRASPASO = ['entrega', 'transferencia', 'reembolso', 'inyeccion', 'ajuste'];
const DOBLE_FIRMA = ['entrega', 'transferencia', 'reembolso', 'inyeccion'];
const DIGITAL = ['yape', 'plin', 'tarjeta', 'transferencia'];

export function crearCaja(h) {
  const { ErrorApi, ahoraLima, reservarSeq, auditar, exigirMando, esMando } = h;
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const verdad = (v) => v === true || v === 1 || /^(true|1|s[ií])$/i.test(String(v));
  const dia = (f) => String(f || '').slice(0, 10);
  const hoy = () => ahoraLima().slice(0, 10);
  const valida = (f) => /^\d{4}-\d{2}-\d{2}$/.test(String(f || ''));
  const leg = (u) => u.legado || String(u.nombre).toLowerCase();
  const puedeEfectivo = (u) => u.rol === 'super' || (u.rol === 'admin' && u.funcion !== 'digital');
  const puedeYape = (u) => u.rol === 'super' || (u.rol === 'admin' && u.funcion === 'digital');
  const funcionTxt = (u) => u.rol === 'operador' ? 'operador' : u.rol === 'super' ? 'efectivo y Yape' : u.funcion === 'digital' ? 'Yape' : 'efectivo';

  async function usuarioPorId(env, id) { return env.DB.prepare('SELECT * FROM usuarios WHERE id = ?').bind(String(id || '')).first(); }
  async function corteContable(env) {
    const r = await env.DB.prepare("SELECT valor FROM config WHERE clave='fecha_corte_contable'").first();
    return dia(r && r.valor) || '2026-08-01';
  }
  async function cuentasActivas(env) { return (await env.DB.prepare('SELECT * FROM cuentas WHERE activo = 1 OR activo IS NULL').all()).results; }
  /** Cuenta por defecto de una persona según el medio. Si no tiene propia, la NO transitoria de la empresa. */
  async function cuentaDe(env, legado, medio) {
    const tipo = DIGITAL.includes(String(medio)) || medio === 'digital' ? 'digital' : 'efectivo';
    const cs = await cuentasActivas(env);
    const propia = cs.find(c => String(c.dueno) === String(legado) && c.tipo === tipo);
    if (propia) return propia.clave;
    const emp = cs.find(c => c.tipo === tipo && !verdad(c.transitoria));
    return emp ? emp.clave : '';
  }
  async function saldoCuenta(env, clave, hasta) {
    const c = await env.DB.prepare('SELECT * FROM cuentas WHERE clave = ?').bind(clave).first();
    if (!c) return null;
    const corte = dia(c.fecha_corte) || await corteContable(env), h2 = hasta || hoy();
    const m = await env.DB.prepare(`SELECT
        COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END),0) ing,
        COALESCE(SUM(CASE WHEN tipo='egreso' AND COALESCE(lo_puso_operador,0)=0 THEN monto END),0) egr
      FROM movimientos WHERE estado='activo' AND cuenta=? AND substr(fecha,1,10) BETWEEN ? AND ?`).bind(clave, corte, h2).first();
    const t = await env.DB.prepare(`SELECT
        COALESCE(SUM(CASE WHEN cuenta_destino=? THEN monto END),0) entra,
        COALESCE(SUM(CASE WHEN cuenta_origen=? THEN monto END),0) sale
      FROM traspasos WHERE estado='confirmado' AND substr(fecha,1,10) BETWEEN ? AND ?`).bind(clave, clave, corte, h2).first();
    return r2(num(c.saldo_inicial) + m.ing - m.egr + t.entra - t.sale);
  }
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  async function deudaConOperador(env, legado) {
    const corte = await corteContable(env);
    const p = await env.DB.prepare("SELECT COALESCE(SUM(monto),0) s FROM movimientos WHERE estado='activo' AND tipo='egreso' AND usuario=? AND COALESCE(lo_puso_operador,0)=1 AND substr(fecha,1,10) >= ?").bind(legado, corte).first();
    const d = await env.DB.prepare("SELECT COALESCE(SUM(t.monto),0) s FROM traspasos t JOIN cuentas c ON c.clave=t.cuenta_destino WHERE t.estado='confirmado' AND t.tipo='reembolso' AND c.dueno=? AND substr(t.fecha,1,10) >= ?").bind(legado, corte).first();
    return { puso: r2(p.s), reembolsado: r2(d.s), pendiente: r2(p.s - d.s) };
  }
  async function cierreDe(env, legado, fecha) {
    return env.DB.prepare("SELECT * FROM cierres WHERE operador = ? AND substr(fecha,1,10) = ? AND estado IN ('cerrado','verificado') ORDER BY cerrado_en DESC LIMIT 1").bind(legado, fecha).first();
  }

  /* ═════════ Arqueo ═════════ */
  async function arqueo(env, u, fecha) {
    const L = leg(u);
    const movs = (await env.DB.prepare("SELECT tipo, medio_pago, monto, lo_puso_operador FROM movimientos WHERE estado='activo' AND usuario=? AND substr(fecha,1,10)=?").bind(L, fecha).all()).results;
    let efeIng = 0, efeEgr = 0, digIng = 0, digEgr = 0, adelanto = 0;
    for (const m of movs) {
      const v = num(m.monto), efe = m.medio_pago === 'efectivo';
      if (m.tipo === 'ingreso') { if (efe) efeIng += v; else digIng += v; continue; }
      if (verdad(m.lo_puso_operador)) { adelanto += v; continue; }      // de su bolsillo: no sale de la caja
      if (efe) efeEgr += v; else digEgr += v;
    }
    // Solo quien maneja el efectivo consolida lo que recibió de los operadores ese día.
    let recibido = 0, porRecibir = 0; const pendientes = [];
    if (esMando(u) && u.funcion !== 'digital') {
      const cs = (await env.DB.prepare("SELECT operador, estado, verificado_por, efectivo_recibido, efectivo_declarado FROM cierres WHERE substr(fecha,1,10)=? AND operador <> ?").bind(fecha, L).all()).results;
      for (const c of cs) {
        if (c.estado === 'verificado' && String(c.verificado_por) === L) recibido += num(c.efectivo_recibido);
        else if (c.estado === 'cerrado') { porRecibir += num(c.efectivo_declarado); pendientes.push({ operador: c.operador, declarado: r2(c.efectivo_declarado) }); }
      }
    }
    const cE = await cuentaDe(env, L, 'efectivo'), cY = await cuentaDe(env, L, 'yape');
    return {
      fecha, operador: L, usuario_id: u.id, nombre: u.nombre, rol: u.rol, funcion: funcionTxt(u),
      ingresos_efectivo: r2(efeIng), egresos_efectivo: r2(efeEgr), adelanto_operador: r2(adelanto),
      recibido_operadores: r2(recibido), por_recibir: r2(porRecibir), pendientes_de_verificar: pendientes,
      efectivo_sistema: r2(efeIng - efeEgr + recibido), digital_ingresos: r2(digIng), digital_egresos: r2(digEgr), digital_neto: r2(digIng - digEgr),
      saldo_efectivo_pendiente: cE ? await saldoCuenta(env, cE) : null, saldo_digital_pendiente: cY ? await saldoCuenta(env, cY) : null,
      n_movimientos: movs.length,
    };
  }
  async function viajesDe(env, L, fecha) {
    return (await env.DB.prepare('SELECT id, placa, origen, destino, hora_salida, hora_llegada, estado FROM viajes WHERE operador=? AND substr(fecha,1,10)=?').bind(L, fecha).all()).results;
  }
  async function estado(env, yo, url) {
    const fecha = url.searchParams.get('fecha') || hoy(); if (!valida(fecha)) throw new ErrorApi('Fecha no válida');
    let u = yo;
    const pid = url.searchParams.get('usuario');
    if (pid && pid !== yo.id) { exigirMando(yo); u = await usuarioPorId(env, pid); if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404); }
    const a = await arqueo(env, u, fecha), c = await cierreDe(env, leg(u), fecha);
    const abierto = await env.DB.prepare("SELECT id, fecha, origen, destino FROM viajes WHERE operador=? AND estado='abierto' ORDER BY fecha DESC LIMIT 1").bind(leg(u)).first();
    return { ...a, cerrada: !!c, cierre: c || null, viajes: await viajesDe(env, leg(u), fecha), viaje_abierto: abierto || null,
      puedo_efectivo: puedeEfectivo(yo), puedo_yape: puedeYape(yo), es_mio: u.id === yo.id };
  }

  /* ═════════ Traspaso automático al verificar ═════════ */
  async function traspasoDeCierre(env, yo, legOp, fecha, monto, cierreId, medio) {
    if (!(monto > 0)) return null;
    const origen = await cuentaDe(env, legOp, medio), destino = await cuentaDe(env, leg(yo), medio);
    if (!origen || !destino || origen === destino) return null;
    const ref = medio === 'efectivo' ? cierreId : cierreId + ':yape';
    // El dinero de un día se entrega una sola vez, lo haya declarado quien lo haya declarado.
    const dup = await env.DB.prepare("SELECT * FROM traspasos WHERE estado <> 'anulado' AND cuenta_origen = ? AND (ref = ? OR substr(fecha,1,10) = ?) LIMIT 1").bind(origen, ref, fecha).first();
    if (dup) { await auditar(env, yo.nombre, 'traspaso_auto_omitido', `${legOp} · ${fecha} · ya existe ${dup.uuid} por S/ ${dup.monto}`); return { omitido: true, motivo: 'ya_entregado', existente: dup }; }
    const disp = await saldoCuenta(env, origen);
    const oc = await env.DB.prepare('SELECT transitoria FROM cuentas WHERE clave=?').bind(origen).first();
    if (oc && verdad(oc.transitoria) && disp !== null && r2(disp - monto) < -0.01) {
      await auditar(env, yo.nombre, 'traspaso_auto_omitido', `${legOp} · ${fecha} · ${origen} tiene S/ ${disp} y se pretendía S/ ${monto}`);
      return { omitido: true, motivo: 'saldo_insuficiente', disponible: disp, pretendido: r2(monto) };
    }
    const t = { uuid: crypto.randomUUID(), fecha: fecha + ' 12:00:00', cuenta_origen: origen, cuenta_destino: destino, monto: r2(monto),
      motivo: (medio === 'efectivo' ? 'Entrega del efectivo de la caja del ' : 'Transferencia del Yape de la caja del ') + fecha,
      tipo: medio === 'efectivo' ? 'entrega' : 'transferencia', declarado_por: legOp, confirmado_por: leg(yo), confirmado_en: ahoraLima(), estado: 'confirmado', ref, creado_en: ahoraLima() };
    await insertarTraspaso(env, t);
    await auditar(env, yo.nombre, 'traspaso_auto', `${origen} → ${destino} · S/ ${t.monto} · cierre ${cierreId}`);
    return t;
  }
  async function insertarTraspaso(env, t) {
    t.seq = await reservarSeq(env, 1);
    const k = Object.keys(t);
    await env.DB.prepare(`INSERT INTO traspasos (${k.join(',')}) VALUES (${k.map(() => '?').join(',')})`).bind(...k.map(x => t[x])).run();
  }
  function avisoTraspaso(t, legOp, fecha) {
    if (!t || !t.omitido) return null;
    return t.motivo === 'ya_entregado'
      ? `No se generó el traspaso: lo del ${fecha} ya figura entregado (S/ ${t.existente.monto}). Si el monto cambió, anula ese traspaso en Cuentas y vuelve a verificar.`
      : `No se generó el traspaso: dejaría la cuenta de ${legOp} en negativo (tiene S/ ${t.disponible} y se entregarían S/ ${t.pretendido}). Casi siempre significa que ya se entregó con otro traspaso: revísalo en Cuentas.`;
  }

  /* ═════════ Cerrar, verificar y reabrir ═════════ */
  async function cerrar(env, yo, b) {
    const fecha = b.fecha || hoy(); if (!valida(fecha)) throw new ErrorApi('Fecha no válida');
    if (fecha > hoy()) throw new ErrorApi('No se puede cerrar un día que todavía no llega.');
    let u = yo;
    if (b.usuario && b.usuario !== yo.id) { exigirMando(yo); u = await usuarioPorId(env, b.usuario); if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404); }
    if (u.rol === 'super') throw new ErrorApi('La cuenta Superadmin no rinde caja.');
    const ajena = u.id !== yo.id, L = leg(u);
    if (ajena && String(b.motivo || '').trim().length < 5) throw new ErrorApi('Escribe el motivo para cerrar la caja de otra persona.');
    if (await cierreDe(env, L, fecha)) throw new ErrorApi('La caja de ese día ya está cerrada.', 'YA_CERRADA');
    const a = await arqueo(env, u, fecha);
    if (esMando(u) && a.pendientes_de_verificar.length) throw new ErrorApi('Falta verificar la caja de: ' + a.pendientes_de_verificar.map(x => x.operador).join(', ') + '. Recibe ese efectivo y verifícalo antes de cerrar el día.', 'CIERRES_PENDIENTES');
    if (b.efectivo_declarado === undefined || b.efectivo_declarado === null || b.efectivo_declarado === '' || isNaN(Number(b.efectivo_declarado))) throw new ErrorApi('Escribe el efectivo contado.');
    const declarado = r2(b.efectivo_declarado);
    let dig;
    if (a.digital_neto !== 0) {
      if (b.digital_declarado === undefined || b.digital_declarado === null || b.digital_declarado === '' || isNaN(Number(b.digital_declarado))) throw new ErrorApi('Mira tu app de Yape y escribe cuánto cobraste hoy.', 'FALTA_YAPE');
      dig = r2(b.digital_declarado);
    } else dig = r2(b.digital_declarado || 0);
    const viajes = await viajesDe(env, L, fecha);
    const placas = [...new Set(viajes.map(v => v.placa).filter(Boolean))].join(', ');
    let obs = String(b.observacion || '').slice(0, 300);
    if (ajena) obs = (obs ? obs + ' | ' : '') + `Cerrada por ${yo.nombre}: ${String(b.motivo).trim().slice(0, 200)}`;
    const id = crypto.randomUUID(), ahora = ahoraLima(), s = await reservarSeq(env, 1);
    await env.DB.prepare(`INSERT INTO cierres (id,fecha,operador,placas,viajes,efectivo_sistema,efectivo_declarado,diferencia,digital_sistema,digital_declarado,diferencia_digital,adelanto_operador,n_movimientos,estado,observacion,cerrado_en,cerrado_por,seq)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'cerrado',?,?,?,?)`).bind(id, fecha + ' 00:00:00', L, placas, viajes.length, a.efectivo_sistema, declarado, r2(declarado - a.efectivo_sistema),
      a.digital_neto, dig, r2(dig - a.digital_neto), a.adelanto_operador, a.n_movimientos, obs, ahora, leg(yo), s).run();
    await auditar(env, yo.nombre, 'caja_cerrar', `${ajena ? 'caja de ' + u.nombre + ' · ' : ''}${fecha} · sistema S/ ${a.efectivo_sistema} · declarado S/ ${declarado} · Yape S/ ${dig}`);
    // Quien cierra verifica en el acto la parte que le toca; la otra queda para su responsable.
    const out = { cerrada: true, id, efectivo_sistema: a.efectivo_sistema, efectivo_declarado: declarado, diferencia: r2(declarado - a.efectivo_sistema), digital_neto: a.digital_neto, digital_declarado: dig, avisos: [] };
    const sinEfectivo = a.efectivo_sistema === 0 && declarado === 0, sinYape = a.digital_neto === 0 && dig === 0;
    if (esMando(yo) && (puedeEfectivo(yo) || sinEfectivo)) { const v = await verificarEfectivo(env, yo, { usuario: u.id, fecha, efectivo_recibido: declarado }, true); out.efectivo_verificado = true; if (v.aviso_traspaso) out.avisos.push(v.aviso_traspaso); }
    else if (sinEfectivo) { await marcarEfectivoSinMovimiento(env, id, yo); out.efectivo_verificado = true; }
    if ((esMando(yo) && puedeYape(yo)) || sinYape) { const v = await verificarYape(env, yo, { usuario: u.id, fecha, yape_recibido: dig }, true); out.yape_verificado = true; if (v.aviso_traspaso) out.avisos.push(v.aviso_traspaso); }
    out.pendiente = [!out.efectivo_verificado ? 'efectivo (lo verifica quien maneja el efectivo)' : null, !out.yape_verificado ? 'Yape (lo verifica quien maneja los Yape)' : null].filter(Boolean);
    return out;
  }
  async function marcarEfectivoSinMovimiento(env, id, yo) {
    await env.DB.prepare("UPDATE cierres SET estado='verificado', verificado_por='sistema', verificado_en=?, efectivo_recibido=0, diferencia_final=0, seq=? WHERE id=?").bind(ahoraLima(), await reservarSeq(env, 1), id).run();
  }
  async function verificarEfectivo(env, yo, b, interno) {
    if (!puedeEfectivo(yo) && !interno) throw new ErrorApi('El efectivo lo verifica quien maneja el efectivo (Marielena o Superadmin).', 'SIN_PERMISO', 403);
    const u = await usuarioPorId(env, b.usuario); if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
    const fecha = b.fecha, L = leg(u);
    if (b.efectivo_recibido === undefined || b.efectivo_recibido === '' || isNaN(Number(b.efectivo_recibido))) throw new ErrorApi('Escribe el efectivo que recibiste.');
    const c = await env.DB.prepare("SELECT * FROM cierres WHERE operador=? AND substr(fecha,1,10)=? AND estado IN ('cerrado','verificado') ORDER BY cerrado_en DESC LIMIT 1").bind(L, fecha).first();
    if (!c) throw new ErrorApi('No hay un cierre para ese día.', 'NO_EXISTE', 404);
    if (c.estado === 'verificado') throw new ErrorApi('El efectivo de esa caja ya fue verificado.', 'YA_VERIFICADA');
    const recibido = r2(b.efectivo_recibido), dif = r2(recibido - num(c.efectivo_sistema));
    const obs = b.observacion ? (c.observacion ? c.observacion + ' | ' : '') + 'Verificación: ' + String(b.observacion).slice(0, 200) : c.observacion;
    await env.DB.prepare("UPDATE cierres SET estado='verificado', verificado_por=?, verificado_en=?, efectivo_recibido=?, diferencia_final=?, observacion=?, seq=? WHERE id=?")
      .bind(leg(yo), ahoraLima(), recibido, dif, obs, await reservarSeq(env, 1), c.id).run();
    const t = await traspasoDeCierre(env, yo, L, fecha, recibido, c.id, 'efectivo');
    await auditar(env, yo.nombre, 'caja_verificar', `${u.nombre} · ${fecha} · sistema S/ ${c.efectivo_sistema} · recibido S/ ${recibido} · diferencia S/ ${dif}`);
    let avisoPropio = null;
    if (u.id !== yo.id && yo.rol !== 'super' && !(await cierreDe(env, leg(yo), fecha))) avisoPropio = `Tu caja del ${fecha} sigue abierta con este efectivo dentro. Ciérrala para que ese día quede cuadrado.`;
    return { verificada: true, diferencia_final: dif, cuadra: dif === 0, traspaso: t && !t.omitido ? t : null, aviso_traspaso: avisoTraspaso(t, L, fecha), aviso_caja_propia: avisoPropio };
  }
  async function verificarYape(env, yo, b, interno) {
    if (!puedeYape(yo) && !interno) throw new ErrorApi('El Yape lo verifica quien maneja los Yape (Yenner o Superadmin).', 'SIN_PERMISO', 403);
    const u = await usuarioPorId(env, b.usuario); if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
    const fecha = b.fecha, L = leg(u);
    if (b.yape_recibido === undefined || b.yape_recibido === '' || isNaN(Number(b.yape_recibido))) throw new ErrorApi('Escribe cuánto Yape llegó a la cuenta de la empresa.');
    const c = await env.DB.prepare("SELECT * FROM cierres WHERE operador=? AND substr(fecha,1,10)=? AND estado IN ('cerrado','verificado') ORDER BY cerrado_en DESC LIMIT 1").bind(L, fecha).first();
    if (!c) throw new ErrorApi('No hay un cierre para ese día.', 'NO_EXISTE', 404);
    if (c.yape_verificado_por) throw new ErrorApi('El Yape de esa caja ya fue verificado.', 'YA_VERIFICADA');
    const recibido = r2(b.yape_recibido), dif = r2(recibido - num(c.digital_sistema));
    await env.DB.prepare('UPDATE cierres SET yape_recibido=?, yape_diferencia_final=?, yape_verificado_por=?, yape_verificado_en=?, seq=? WHERE id=?')
      .bind(recibido, dif, (num(c.digital_sistema) === 0 && recibido === 0 && interno && !puedeYape(yo)) ? 'sistema' : leg(yo), ahoraLima(), await reservarSeq(env, 1), c.id).run();
    const t = puedeYape(yo) ? await traspasoDeCierre(env, yo, L, fecha, recibido, c.id, 'yape') : null;
    await auditar(env, yo.nombre, 'caja_verificar_yape', `${u.nombre} · ${fecha} · sistema S/ ${c.digital_sistema} · recibido S/ ${recibido} · diferencia S/ ${dif}`);
    return { verificada: true, diferencia_final: dif, cuadra: dif === 0, traspaso: t && !t.omitido ? t : null, aviso_traspaso: avisoTraspaso(t, L, fecha) };
  }
  async function reabrir(env, yo, b) {
    exigirMando(yo);
    const motivo = String(b.motivo || '').trim(); if (motivo.length < 5) throw new ErrorApi('El motivo es obligatorio para reabrir una caja.');
    const u = await usuarioPorId(env, b.usuario); if (!u) throw new ErrorApi('Usuario no encontrado', 'NO_EXISTE', 404);
    const c = await cierreDe(env, leg(u), b.fecha); if (!c) throw new ErrorApi('No hay una caja cerrada ese día.', 'NO_EXISTE', 404);
    await env.DB.prepare("UPDATE cierres SET estado='reabierto', reabierto_por=?, reabierto_en=?, observacion=?, seq=? WHERE id=?")
      .bind(leg(yo), ahoraLima(), (c.observacion ? c.observacion + ' | ' : '') + 'Reapertura: ' + motivo.slice(0, 200), await reservarSeq(env, 1), c.id).run();
    await auditar(env, yo.nombre, 'caja_reabrir', `${u.nombre} · ${b.fecha} · ${motivo}`);
    return { reabierta: true, aviso: c.estado === 'verificado' ? 'Esa caja ya había entregado su dinero: si al volver a cerrarla el monto cambia, revisa el traspaso en Cuentas.' : '' };
  }
  async function resumenDia(env, yo, url) {
    exigirMando(yo);
    const fecha = url.searchParams.get('fecha') || hoy(); if (!valida(fecha)) throw new ErrorApi('Fecha no válida');
    const us = (await env.DB.prepare("SELECT * FROM usuarios WHERE activo = 1 AND rol <> 'super'").all()).results;
    const filas = [];
    for (const u of us) {
      const a = await arqueo(env, u, fecha), c = await cierreDe(env, leg(u), fecha);
      const ab = await env.DB.prepare("SELECT 1 FROM viajes WHERE operador=? AND estado='abierto' LIMIT 1").bind(leg(u)).first();
      filas.push({ usuario_id: u.id, nombre: u.nombre, rol: u.rol, funcion: funcionTxt(u), efectivo_sistema: a.efectivo_sistema, digital_neto: a.digital_neto, por_recibir: a.por_recibir,
        movimientos: a.n_movimientos, cierre: c || null, viaje_abierto: !!ab });
    }
    const rango = c => !c ? 0 : (c.estado === 'verificado' && (c.yape_verificado_por || !c.cerrado_por) ? 2 : 1);
    filas.sort((x, y) => (rango(x.cierre) - rango(y.cierre)) || (y.efectivo_sistema - x.efectivo_sistema));
    return { fecha, filas, puedo_efectivo: puedeEfectivo(yo), puedo_yape: puedeYape(yo) };
  }
  async function cierresListar(env, yo, url) {
    exigirMando(yo);
    const d = url.searchParams.get('desde') || '2000-01-01', h2 = url.searchParams.get('hasta') || '2999-12-31';
    const cs = (await env.DB.prepare('SELECT * FROM cierres WHERE substr(fecha,1,10) BETWEEN ? AND ? ORDER BY fecha DESC').bind(d, h2).all()).results;
    return { cierres: cs.map(c => ({ ...c, diferencia_efectiva: r2(c.estado === 'verificado' && c.diferencia_final !== null && c.diferencia_final !== '' ? c.diferencia_final : c.diferencia) })) };
  }

  /* ═════════ Bolsillos y traspasos ═════════ */
  async function cuentas(env, yo) {
    const mando = esMando(yo), L = leg(yo);
    const cs = (await cuentasActivas(env)).filter(c => mando || String(c.dueno) === L);
    const out = [];
    for (const c of cs) {
      const saldo = await saldoCuenta(env, c.clave), trans = verdad(c.transitoria);
      out.push({ clave: c.clave, nombre: c.nombre, dueno: c.dueno, tipo: c.tipo, transitoria: trans, computa_empresa: verdad(c.computa_empresa), saldo, sin_rendir: trans && Math.abs(saldo) >= 0.01 ? saldo : 0 });
    }
    const deudas = {};
    for (const c of out) if (c.transitoria && !deudas[c.dueno]) deudas[c.dueno] = await deudaConOperador(env, c.dueno);
    const claves = out.map(c => c.clave), mismas = claves.map(() => '?').join(',') || "''";
    const pend = (await env.DB.prepare(`SELECT * FROM traspasos WHERE estado='pendiente' ${mando ? '' : `AND (cuenta_origen IN (${mismas}) OR cuenta_destino IN (${mismas}))`} ORDER BY fecha DESC`).bind(...(mando ? [] : claves.concat(claves))).all()).results;
    const recientes = (await env.DB.prepare(`SELECT * FROM traspasos ${mando ? '' : `WHERE cuenta_origen IN (${mismas}) OR cuenta_destino IN (${mismas})`} ORDER BY fecha DESC LIMIT 40`).bind(...(mando ? [] : claves.concat(claves))).all()).results;
    const res = { cuentas: out, deudas, por_firmar: pend.filter(t => String(t.declarado_por) !== L), pendientes: pend, recientes, corte: await corteContable(env), todas: (await cuentasActivas(env)).filter(c => mando || String(c.dueno) === L || !verdad(c.transitoria) && verdad(c.computa_empresa)).map(c => ({ clave: c.clave, nombre: c.nombre, dueno: c.dueno, tipo: c.tipo, transitoria: verdad(c.transitoria) })) };
    if (mando) res.total_empresa = r2(out.reduce((s, c) => s + (c.computa_empresa ? c.saldo : 0), 0));
    return res;
  }
  async function traspasoCrear(env, yo, b) {
    const o = String(b.cuenta_origen || ''), d = String(b.cuenta_destino || ''), monto = r2(b.monto), tipo = TIPOS_TRASPASO.includes(b.tipo) ? b.tipo : 'ajuste';
    if (!o || !d) throw new ErrorApi('Faltan las cuentas.'); if (o === d) throw new ErrorApi('Origen y destino no pueden ser la misma cuenta.');
    if (!(monto > 0)) throw new ErrorApi('El monto debe ser mayor que cero.');
    const motivo = String(b.motivo || '').trim(); if (motivo.length < 3) throw new ErrorApi('El motivo es obligatorio.');
    const cO = await env.DB.prepare('SELECT * FROM cuentas WHERE clave=?').bind(o).first(), cD = await env.DB.prepare('SELECT * FROM cuentas WHERE clave=?').bind(d).first();
    if (!cO || !cD) throw new ErrorApi('Cuenta no encontrada', 'NO_EXISTE', 404);
    if (!esMando(yo) && String(cO.dueno) !== leg(yo)) throw new ErrorApi('Solo puedes declarar salidas de tus propias cuentas.', 'SIN_PERMISO', 403);
    if (!esMando(yo) && !['entrega', 'transferencia'].includes(tipo)) throw new ErrorApi('Ese tipo de traspaso lo declara un administrador.', 'SIN_PERMISO', 403);
    const gemelo = await env.DB.prepare("SELECT declarado_por FROM traspasos WHERE estado='pendiente' AND cuenta_origen=? AND cuenta_destino=? AND ABS(monto-?)<0.005 LIMIT 1").bind(o, d, monto).first();
    if (gemelo && !b.confirmado) throw new ErrorApi(`Ya hay un traspaso de S/ ${monto.toFixed(2)} esperando confirmación (lo declaró ${gemelo.declarado_por}). Primero que confirmen ese.`, 'DUPLICADO_PENDIENTE');
    if (tipo === 'reembolso') {
      if (cD.tipo !== 'personal') throw new ErrorApi('Un reembolso entra al bolsillo PROPIO del operador, no a una cuenta de trabajo.');
      if (!verdad(cO.computa_empresa)) throw new ErrorApi('Un reembolso lo paga la empresa: el origen debe ser una cuenta de la empresa.');
      if (String(cO.dueno) === String(cD.dueno)) throw new ErrorApi('Esa cuenta es del mismo dueño: se reembolsaría con su propio dinero.');
      const deuda = await deudaConOperador(env, cD.dueno);
      if (monto > deuda.pendiente + 0.005 && !b.confirmado) throw new ErrorApi(`A ${cD.dueno} se le deben S/ ${deuda.pendiente.toFixed(2)} y estás declarando S/ ${monto.toFixed(2)}. Si aun así corresponde, confírmalo.`, 'CONFIRMAR');
    }
    const f = String(b.fecha || '').replace('T', ' ');
    const t = { uuid: crypto.randomUUID(), fecha: /^\d{4}-\d{2}-\d{2}/.test(f) ? (f.length === 10 ? f + ' 12:00:00' : f.slice(0, 16) + ':00') : ahoraLima(), cuenta_origen: o, cuenta_destino: d, monto,
      motivo: motivo.slice(0, 200), tipo, declarado_por: leg(yo), confirmado_por: '', confirmado_en: '', estado: DOBLE_FIRMA.includes(tipo) ? 'pendiente' : 'confirmado', ref: String(b.ref || ''), creado_en: ahoraLima() };
    await insertarTraspaso(env, t);
    await auditar(env, yo.nombre, 'traspaso_crear', `${tipo} · ${o} → ${d} · S/ ${monto} · ${t.estado}`);
    return t;
  }
  async function traspasoConfirmar(env, yo, uuid) {
    const t = await env.DB.prepare('SELECT * FROM traspasos WHERE uuid=?').bind(uuid).first(); if (!t) throw new ErrorApi('Traspaso no encontrado', 'NO_EXISTE', 404);
    if (t.estado !== 'pendiente') throw new ErrorApi('Ese traspaso ya fue confirmado o anulado.');
    if (String(t.declarado_por) === leg(yo)) throw new ErrorApi('El traspaso lo confirma la OTRA parte, no quien lo declaró.', 'SIN_PERMISO', 403);
    const cO = await env.DB.prepare('SELECT dueno FROM cuentas WHERE clave=?').bind(t.cuenta_origen).first(), cD = await env.DB.prepare('SELECT dueno FROM cuentas WHERE clave=?').bind(t.cuenta_destino).first();
    const meToca = (cO && cO.dueno === leg(yo)) || (cD && cD.dueno === leg(yo));
    if (!meToca && !esMando(yo)) throw new ErrorApi('Ese traspaso no te corresponde.', 'SIN_PERMISO', 403);
    await env.DB.prepare("UPDATE traspasos SET estado='confirmado', confirmado_por=?, confirmado_en=?, seq=? WHERE uuid=?").bind(leg(yo), ahoraLima(), await reservarSeq(env, 1), uuid).run();
    await auditar(env, yo.nombre, 'traspaso_confirmar', `${uuid} · S/ ${t.monto}`);
    return { uuid, estado: 'confirmado' };
  }
  async function traspasoAnular(env, yo, uuid, b) {
    exigirMando(yo);
    const motivo = String(b.motivo || '').trim(); if (motivo.length < 5) throw new ErrorApi('Escribe el motivo de la anulación.');
    const t = await env.DB.prepare('SELECT * FROM traspasos WHERE uuid=?').bind(uuid).first(); if (!t) throw new ErrorApi('Traspaso no encontrado', 'NO_EXISTE', 404);
    if (t.estado === 'anulado') throw new ErrorApi('Ya estaba anulado.');
    await env.DB.prepare("UPDATE traspasos SET estado='anulado', motivo=?, seq=? WHERE uuid=?").bind((t.motivo ? t.motivo + ' | ' : '') + 'Anulado: ' + motivo.slice(0, 200), await reservarSeq(env, 1), uuid).run();
    await auditar(env, yo.nombre, 'traspaso_anular', `${uuid} · ${motivo}`);
    return { uuid, estado: 'anulado' };
  }

  /* ═════════ Calendario ═════════ */
  async function calendario(env, yo, url) {
    exigirMando(yo);
    const mes = url.searchParams.get('mes') || hoy().slice(0, 7); if (!/^\d{4}-\d{2}$/.test(mes)) throw new ErrorApi('Mes no válido');
    const viajes = (await env.DB.prepare('SELECT id, substr(fecha,1,10) d, origen, destino, estado, operador, placa FROM viajes WHERE substr(fecha,1,7)=? ORDER BY fecha').bind(mes).all()).results;
    const cierres = (await env.DB.prepare("SELECT id, substr(fecha,1,10) d, operador, estado, diferencia, diferencia_final, efectivo_declarado, efectivo_recibido, digital_sistema, yape_verificado_por, cerrado_por FROM cierres WHERE substr(fecha,1,7)=? AND estado IN ('cerrado','verificado')").bind(mes).all()).results;
    const movs = (await env.DB.prepare(`SELECT substr(fecha,1,10) d, usuario, COUNT(*) n, COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto END),0) ing, COALESCE(SUM(CASE WHEN tipo='egreso' THEN monto END),0) egr
      FROM movimientos WHERE estado='activo' AND substr(fecha,1,7)=? GROUP BY d, usuario`).bind(mes).all()).results;
    const abiertos = (await env.DB.prepare("SELECT id, substr(fecha,1,10) d, origen, destino, operador FROM viajes WHERE estado='abierto'").all()).results;
    return { mes, hoy: hoy(), viajes, cierres: cierres.map(c => ({ ...c, diferencia_efectiva: r2(c.estado === 'verificado' && c.diferencia_final !== null && c.diferencia_final !== '' ? c.diferencia_final : c.diferencia) })), movimientos: movs, viajes_abiertos: abiertos };
  }
  async function viajeCerrar(env, yo, id, b) {
    exigirMando(yo);
    const v = await env.DB.prepare('SELECT * FROM viajes WHERE id=?').bind(id).first(); if (!v) throw new ErrorApi('Viaje no encontrado', 'NO_EXISTE', 404);
    if (v.estado !== 'abierto') throw new ErrorApi('Ese viaje ya está cerrado.');
    const motivo = String(b.motivo || '').trim(); if (motivo.length < 5) throw new ErrorApi('Escribe por qué se cierra.');
    await env.DB.prepare("UPDATE viajes SET estado='cerrado', hora_llegada=COALESCE(NULLIF(hora_llegada,''), ?), observacion=?, seq=? WHERE id=?")
      .bind(ahoraLima().slice(11, 16), (v.observacion ? v.observacion + ' | ' : '') + `Cerrado por ${yo.nombre}: ${motivo.slice(0, 200)}`, await reservarSeq(env, 1), id).run();
    await auditar(env, yo.nombre, 'viaje_cerrar', `${v.origen} → ${v.destino} · ${dia(v.fecha)} · ${motivo}`);
    return { id };
  }

  /** ¿La caja de esa persona ese día ya está cerrada? Lo usa el registro para no meter dinero en un día ya rendido. */
  async function diaCerrado(env, legado, fecha) { return !!(await cierreDe(env, legado, dia(fecha))); }

  async function rutas(env, yo, req, url) {
    const p = url.pathname, m = req.method, cuerpo = () => req.json().catch(() => ({}));
    if (p === '/api/caja' && m === 'GET') return estado(env, yo, url);
    if (p === '/api/caja/resumen' && m === 'GET') return resumenDia(env, yo, url);
    if (p === '/api/caja/cierres' && m === 'GET') return cierresListar(env, yo, url);
    if (p === '/api/caja/cerrar' && m === 'POST') return cerrar(env, yo, await cuerpo());
    if (p === '/api/caja/verificar' && m === 'POST') { exigirMando(yo); return verificarEfectivo(env, yo, await cuerpo(), false); }
    if (p === '/api/caja/verificar-yape' && m === 'POST') { exigirMando(yo); return verificarYape(env, yo, await cuerpo(), false); }
    if (p === '/api/caja/reabrir' && m === 'POST') return reabrir(env, yo, await cuerpo());
    if (p === '/api/cuentas' && m === 'GET') return cuentas(env, yo);
    if (p === '/api/traspasos' && m === 'POST') return traspasoCrear(env, yo, await cuerpo());
    let r = p.match(/^\/api\/traspasos\/([\w-]+)\/(confirmar|anular)$/);
    if (r && m === 'POST') return r[2] === 'confirmar' ? traspasoConfirmar(env, yo, r[1]) : traspasoAnular(env, yo, r[1], await cuerpo());
    if (p === '/api/calendario' && m === 'GET') return calendario(env, yo, url);
    r = p.match(/^\/api\/viajes\/([\w-]+)\/cerrar$/);
    if (r && m === 'POST') return viajeCerrar(env, yo, r[1], await cuerpo());
    return undefined;
  }
  async function saldosCuentas(env) {
    const out = [];
    for (const c of await cuentasActivas(env)) out.push({ clave: c.clave, nombre: c.nombre, dueno: c.dueno, transitoria: verdad(c.transitoria), saldo: await saldoCuenta(env, c.clave) });
    return out;
  }
  return { rutas, diaCerrado, arqueo, leg, saldosCuentas };
}
