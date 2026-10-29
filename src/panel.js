/**
 * Villa Azul · Panel con tendencias por día, mes y año, y motor de hallazgos (v4.0)
 * Cada hallazgo lleva SIEMPRE la cifra que lo provoca: sin evidencia no es un hallazgo, es una opinión.
 */
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const EXC_CAT = { adelanto: 'Excursiones: adelantos', saldo: 'Excursiones: saldos', pasaje: 'Excursiones: pasajes', otro_ingreso: 'Excursiones: otros',
  combustible: 'Combustible', peaje: 'Peajes', pago_conductor: 'Pago conductor', hospedaje_conductor: 'Hospedaje conductor', alimentacion_conductor: 'Alimentación conductor',
  cochera: 'Cochera', lavado: 'Lavado', mantenimiento: 'Mantenimiento', otro_gasto: 'Otros gastos' };

export function crearPanel(h) {
  const { ErrorApi, ahoraLima, exigirMando, saldosCuentas } = h;
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const pct = (a, b) => b ? Math.round((a - b) / Math.abs(b) * 1000) / 10 : null;
  const soles = (n) => 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const diasMes = (ym) => new Date(+ym.slice(0, 4), +ym.slice(5, 7), 0).getDate();
  const mesAnt = (ym) => { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 2, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };

  async function rangoDisponible(env) {
    const r = await env.DB.prepare(`SELECT MIN(f) mn, MAX(f) mx FROM (SELECT substr(fecha,1,10) f FROM movimientos WHERE estado='activo' UNION ALL SELECT substr(fecha,1,10) FROM exc_movimientos WHERE COALESCE(anulado,0)=0)`).first();
    return { min: r.mn, max: r.mx };
  }
  async function totales(env, desde, hasta, largo) {
    const ruta = (await env.DB.prepare(`SELECT substr(fecha,1,${largo}) b, tipo, SUM(monto) s FROM movimientos WHERE estado='activo' AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY b, tipo`).bind(desde, hasta).all()).results;
    const exc = (await env.DB.prepare(`SELECT substr(fecha,1,${largo}) b, tipo, SUM(monto) s FROM exc_movimientos WHERE COALESCE(anulado,0)=0 AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY b, tipo`).bind(desde, hasta).all()).results;
    return { ruta, exc };
  }
  const suma = (filas, tipo) => r2(filas.filter(f => f.tipo === tipo).reduce((s, f) => s + f.s, 0));

  async function panel(env, yo, url) {
    exigirMando(yo);
    const vista = ['dia', 'mes', 'anio'].includes(url.searchParams.get('vista')) ? url.searchParams.get('vista') : 'mes';
    const disp = await rangoDisponible(env), hoy = ahoraLima().slice(0, 10);
    const ultimo = disp.max && disp.max < hoy ? disp.max : hoy;
    let ref = url.searchParams.get('ref'), desde, hasta, largo, claves, etiquetas, prevDesde, prevHasta;
    if (vista === 'dia') {
      ref = /^\d{4}-\d{2}$/.test(ref || '') ? ref : ultimo.slice(0, 7);
      desde = ref + '-01'; hasta = ref + '-' + String(diasMes(ref)).padStart(2, '0'); largo = 10;
      claves = Array.from({ length: diasMes(ref) }, (_, i) => ref + '-' + String(i + 1).padStart(2, '0')); etiquetas = claves.map(k => String(+k.slice(8)));
      const pa = mesAnt(ref); prevDesde = pa + '-01'; prevHasta = pa + '-' + String(diasMes(pa)).padStart(2, '0');
    } else if (vista === 'mes') {
      ref = /^\d{4}$/.test(ref || '') ? ref : ultimo.slice(0, 4);
      desde = ref + '-01-01'; hasta = ref + '-12-31'; largo = 7;
      claves = MESES.map((_, i) => ref + '-' + String(i + 1).padStart(2, '0')); etiquetas = MESES.slice();
      prevDesde = (+ref - 1) + '-01-01'; prevHasta = (+ref - 1) + '-12-31';
    } else {
      const a0 = +(disp.min || hoy).slice(0, 4), a1 = +hoy.slice(0, 4);
      ref = null; desde = a0 + '-01-01'; hasta = a1 + '-12-31'; largo = 4;
      claves = Array.from({ length: a1 - a0 + 1 }, (_, i) => String(a0 + i)); etiquetas = claves.slice();
    }
    const t = await totales(env, desde, hasta, largo);
    const serie = (filas, tipo) => claves.map(k => r2(filas.filter(f => f.b === k && f.tipo === tipo).reduce((s, f) => s + f.s, 0)));
    const series = { ruta_ing: serie(t.ruta, 'ingreso'), ruta_egr: serie(t.ruta, 'egreso'), exc_ing: serie(t.exc, 'ingreso'), exc_egr: serie(t.exc, 'egreso') };
    series.utilidad = claves.map((_, i) => r2(series.ruta_ing[i] + series.exc_ing[i] - series.ruta_egr[i] - series.exc_egr[i]));
    const ing = r2(suma(t.ruta, 'ingreso') + suma(t.exc, 'ingreso')), egr = r2(suma(t.ruta, 'egreso') + suma(t.exc, 'egreso'));
    let prev = null;
    if (prevDesde) { const tp = await totales(env, prevDesde, prevHasta, 10); const pi = suma(tp.ruta, 'ingreso') + suma(tp.exc, 'ingreso'), pe = suma(tp.ruta, 'egreso') + suma(tp.exc, 'egreso'); prev = { ing: r2(pi), egr: r2(pe), util: r2(pi - pe) }; }
    const tot = { ing, egr, util: r2(ing - egr), margen: ing ? Math.round((ing - egr) / ing * 1000) / 10 : 0, ruta_ing: suma(t.ruta, 'ingreso'), exc_ing: suma(t.exc, 'ingreso'), prev,
      var_ing: prev ? pct(ing, prev.ing) : null, var_util: prev ? pct(ing - egr, prev.util) : null };

    // Donas: gastos por tipo e ingresos por concepto (ruta + excursiones)
    const nombres = {}; (await env.DB.prepare('SELECT clave, nombre FROM cat_egresos UNION ALL SELECT clave, nombre FROM cat_ingresos').all()).results.forEach(c => { nombres[c.clave] = c.nombre; });
    const catR = (await env.DB.prepare("SELECT tipo, categoria, SUM(monto) s FROM movimientos WHERE estado='activo' AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY tipo, categoria").bind(desde, hasta).all()).results;
    const catE = (await env.DB.prepare("SELECT tipo, categoria, SUM(monto) s FROM exc_movimientos WHERE COALESCE(anulado,0)=0 AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY tipo, categoria").bind(desde, hasta).all()).results;
    const agrupar = (tipo) => { const m = {}; catR.filter(c => c.tipo === tipo).forEach(c => { const n = nombres[c.categoria] || c.categoria; m[n] = (m[n] || 0) + c.s; });
      catE.filter(c => c.tipo === tipo).forEach(c => { const n = tipo === 'ingreso' ? 'Excursiones' : (EXC_CAT[c.categoria] || c.categoria); m[n] = (m[n] || 0) + c.s; });
      return Object.keys(m).map(k => ({ nombre: k, monto: r2(m[k]) })).sort((a, b) => b.monto - a.monto); };
    const egresos_cat = agrupar('egreso'), ingresos_cat = agrupar('ingreso');

    // Días de la semana: utilidad promedio de los días operados en ruta
    const diarios = (await env.DB.prepare(`SELECT substr(fecha,1,10) d, SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END) i, SUM(CASE WHEN tipo='egreso' THEN monto ELSE 0 END) e
      FROM movimientos WHERE estado='activo' AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY d HAVING i > 0`).bind(vista === 'anio' ? desde : (vista === 'dia' ? prevDesde : desde), hasta).all()).results;
    const sem = DIAS.map((d, i) => ({ dia: d, n: 0, util: 0, ing: 0 }));
    diarios.forEach(x => { const w = new Date(x.d + 'T12:00:00Z').getUTCDay(); sem[w].n++; sem[w].util += x.i - x.e; sem[w].ing += x.i; });
    const semana = [1, 2, 3, 4, 5, 6, 0].map(w => ({ dia: sem[w].dia, n: sem[w].n, util_prom: sem[w].n ? r2(sem[w].util / sem[w].n) : 0, ing_prom: sem[w].n ? r2(sem[w].ing / sem[w].n) : 0 }));

    // Rutas: por viaje, con su ocupación
    const cap = (await env.DB.prepare('SELECT COALESCE(MAX(capacidad),15) c FROM unidades').first()).c || 15;
    const rutasF = (await env.DB.prepare(`SELECT v.origen || ' → ' || v.destino ruta, COUNT(DISTINCT v.id) viajes,
        SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) ing, SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) egr,
        SUM(CASE WHEN m.categoria LIKE 'pasaje%' THEN COALESCE(m.cantidad,1) ELSE 0 END) pax
      FROM viajes v JOIN movimientos m ON m.viaje_id = v.id AND m.estado='activo' WHERE substr(v.fecha,1,10) BETWEEN ? AND ? GROUP BY ruta ORDER BY viajes DESC`).bind(desde, hasta).all()).results;
    const rutas = rutasF.map(x => ({ ruta: x.ruta, viajes: x.viajes, ing: r2(x.ing), egr: r2(x.egr), util: r2(x.ing - x.egr), util_viaje: r2((x.ing - x.egr) / x.viajes), pax_viaje: Math.round(x.pax / x.viajes * 10) / 10, ocupacion: Math.round(x.pax / (x.viajes * cap) * 100) }));
    const meses = (await env.DB.prepare("SELECT DISTINCT substr(fecha,1,7) m FROM movimientos WHERE estado='activo' UNION SELECT DISTINCT substr(fecha,1,7) FROM exc_movimientos ORDER BY m").all()).results.map(x => x.m);

    const hallazgos = await analizar(env, { vista, desde, hasta, tot, egresos_cat, semana, rutas, prevDesde, prevHasta, catR, nombres, cap });
    return { vista, ref, claves, etiquetas, series, totales: tot, egresos_cat, ingresos_cat, semana, rutas, hallazgos, meses, anios: [...new Set(meses.map(m => m.slice(0, 4)))], desde, hasta };
  }

  /* ═════════ Motor de hallazgos ═════════ */
  async function analizar(env, d) {
    const H = [], add = (nivel, titulo, evidencia, accion, ir) => H.push({ nivel, titulo, evidencia, accion, ir: ir || null });
    const t = d.tot, hoy = ahoraLima().slice(0, 10);
    // — Requiere decisión (operación, sin importar el periodo) —
    const hace45 = new Date(Date.now() - 50 * 864e5).toISOString().slice(0, 10);
    const sinCierre = (await env.DB.prepare(`SELECT COUNT(*) n FROM (SELECT DISTINCT substr(m.fecha,1,10) d, m.usuario u FROM movimientos m WHERE m.estado='activo' AND substr(m.fecha,1,10) BETWEEN ? AND ?
      AND NOT EXISTS (SELECT 1 FROM cierres c WHERE c.operador=m.usuario AND substr(c.fecha,1,10)=substr(m.fecha,1,10) AND c.estado IN ('cerrado','verificado')))`).bind(hace45, new Date(Date.now() - 29 * 3600000).toISOString().slice(0, 10)).first()).n;
    if (sinCierre) add('decision', `${sinCierre} caja(s) sin cerrar en las últimas semanas`, 'Días con registros y sin cierre: ese dinero no se ha rendido ni verificado.', 'Ciérralas desde el calendario o desde Caja.', 'calendario');
    const desc = await env.DB.prepare(`SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN estado='verificado' AND diferencia_final IS NOT NULL THEN diferencia_final ELSE diferencia END),0) s FROM cierres
      WHERE estado IN ('cerrado','verificado') AND substr(fecha,1,10) >= ? AND ABS(CASE WHEN estado='verificado' AND diferencia_final IS NOT NULL THEN diferencia_final ELSE diferencia END) >= 0.5`).bind(hace45).first();
    if (desc.n) add('decision', `${desc.n} cierre(s) con descuadre`, `Suman ${desc.s < 0 ? 'faltantes' : 'diferencias'} por ${soles(Math.abs(desc.s))} en las últimas semanas.`, 'Revisa cada uno con quien lo cerró; si se explica, deja la observación.', 'calendario');
    const abiertos = (await env.DB.prepare("SELECT origen, destino, substr(fecha,1,10) d FROM viajes WHERE estado='abierto' AND substr(fecha,1,10) < ?").bind(hoy).all()).results;
    abiertos.forEach(v => add('decision', `Viaje abierto desde el ${v.d}`, `${v.origen} → ${v.destino} sigue abierto.`, 'Ciérralo desde el calendario para que no se mezclen sus boletos con otros días.', 'calendario'));
    const vou = (await env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(monto),0) s FROM exc_vouchers WHERE estado='pendiente'").first());
    if (vou.n) add('decision', `${vou.n} voucher(s) de reservas por aprobar`, `${soles(vou.s)} declarados por pasajeros esperando confirmación.`, 'Yenner los revisa en Más → Por revisar.', 'revision');
    const rev = (await env.DB.prepare("SELECT COUNT(*) n FROM movimientos WHERE foto_id IS NOT NULL AND revisado_en IS NULL AND estado='activo'").first()).n;
    if (rev) add('decision', `${rev} comprobante(s) con foto por revisar`, 'Fotos de boletas o capturas de Yape que nadie ha marcado conformes.', 'Compara cada foto con su monto en Más → Por revisar.', 'revision');
    if (saldosCuentas) {
      const neg = (await saldosCuentas(env)).filter(c => c.transitoria && c.saldo < -0.5);
      neg.forEach(c => add('decision', `${c.nombre} en negativo: ${soles(c.saldo)}`, 'Se entregó o transfirió más dinero del que hay registrado en esa cuenta.', 'Casi siempre faltan registros de días sin cargar: regulariza desde el calendario.', 'calendario'));
    }
    const primero = (await env.DB.prepare("SELECT MIN(substr(fecha,1,10)) d FROM movimientos").first()).d;
    if (primero) {
      const desde60 = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10), ini = primero > desde60 ? primero : desde60;
      const conReg = new Set((await env.DB.prepare("SELECT DISTINCT substr(fecha,1,10) d FROM movimientos WHERE estado='activo' AND substr(fecha,1,10) >= ? UNION SELECT DISTINCT substr(fecha,1,10) FROM viajes WHERE substr(fecha,1,10) >= ?").bind(ini, ini).all()).results.map(x => x.d));
      let sinReg = 0; for (let f = new Date(ini + 'T12:00:00Z'); f.toISOString().slice(0, 10) < hoy; f = new Date(f.getTime() + 864e5)) if (!conReg.has(f.toISOString().slice(0, 10))) sinReg++;
      if (sinReg >= 3) add('decision', `${sinReg} días sin ningún registro en los últimos 60 días`, 'Si la van trabajó esos días, sus ingresos y gastos no están en el sistema y todos los indicadores salen incompletos.', 'Regulariza desde el calendario: registra a nombre de quien operó y cierra su caja.', 'calendario');
    }
    // — Lo negativo (del periodo) —
    if (t.ing || t.egr) {
      if (t.util < 0) add('negativo', 'El periodo cierra en pérdida', `Ingresos ${soles(t.ing)} y gastos ${soles(t.egr)}: ${soles(t.util)}.`, 'Mira en la dona qué gasto pesa más y compáralo con el periodo anterior.');
      else if (t.margen < 15) add('negativo', `Margen muy ajustado: ${t.margen}%`, `De cada S/ 100 cobrados quedan S/ ${Math.round(t.margen)}.`, 'Revisa tarifas en los tramos con menos pasajeros y los gastos variables por viaje.');
      if (t.var_util !== null && t.var_util <= -15 && t.prev && t.prev.util > 0) add('negativo', `La utilidad cayó ${Math.abs(t.var_util)}%`, `Pasó de ${soles(t.prev.util)} a ${soles(t.util)} frente al periodo anterior.`, 'Compara la dona de gastos de ambos periodos y la cantidad de días operados.');
    }
    if (d.prevDesde) {
      const prevCat = (await env.DB.prepare("SELECT categoria, SUM(monto) s FROM movimientos WHERE estado='activo' AND tipo='egreso' AND substr(fecha,1,10) BETWEEN ? AND ? GROUP BY categoria").bind(d.prevDesde, d.prevHasta).all()).results;
      const ant = {}; prevCat.forEach(c => { ant[c.categoria] = c.s; });
      const sube = d.catR.filter(c => c.tipo === 'egreso' && ant[c.categoria] && c.s - ant[c.categoria] >= 100 && pct(c.s, ant[c.categoria]) >= 30).sort((a, b) => (b.s - ant[b.categoria]) - (a.s - ant[a.categoria]))[0];
      if (sube) add('negativo', `${d.nombres[sube.categoria] || sube.categoria} subió ${pct(sube.s, ant[sube.categoria])}%`, `De ${soles(ant[sube.categoria])} a ${soles(sube.s)} frente al periodo anterior.`, 'Revisa si fue un gasto puntual o un nuevo costo fijo.');
    }
    const bajo = await env.DB.prepare("SELECT COUNT(*) n, COALESCE(SUM(diferencia),0) s FROM movimientos WHERE estado='activo' AND tipo='ingreso' AND diferencia < 0 AND substr(fecha,1,10) BETWEEN ? AND ?").bind(d.desde, d.hasta).first();
    if (bajo.n >= 3) add('negativo', `${bajo.n} cobros por debajo de la tarifa`, `Se dejaron de cobrar ${soles(Math.abs(bajo.s))} frente al tarifario.`, 'Si fue un descuento acordado, que quede anotado; si no, revisa con el operador.');
    const mant = d.egresos_cat.filter(c => /correctiv/i.test(c.nombre)).reduce((s, c) => s + c.monto, 0), prevMant = d.egresos_cat.filter(c => /preventiv/i.test(c.nombre)).reduce((s, c) => s + c.monto, 0);
    if (mant > 0 && mant > prevMant) add('negativo', 'El mantenimiento es más correctivo que preventivo', `Correctivo ${soles(mant)} frente a preventivo ${soles(prevMant)}.`, 'Arreglar cuando se rompe sale más caro: programa los cambios de aceite, filtros y frenos.');
    d.rutas.filter(r => r.viajes >= 3 && r.util < 0).forEach(r => add('negativo', `Ruta en pérdida: ${r.ruta}`, `${r.viajes} viajes, ${soles(r.util)} en total (${soles(r.util_viaje)} por viaje).`, 'Revisa la tarifa o junta pasajeros en menos viajes.'));
    const ag = d.catR.filter(c => c.tipo === 'ingreso' && /agencia/.test(c.categoria)).reduce((s, c) => s + c.s, 0), ps = d.catR.filter(c => c.tipo === 'ingreso' && /pasaje/.test(c.categoria)).reduce((s, c) => s + c.s, 0);
    if (ps && ag / ps > 0.4) add('negativo', `Dependencia de agencias: ${Math.round(ag / ps * 100)}% de los pasajes`, 'Cada pasaje de agencia paga comisión y no deja testigo independiente.', 'Impulsa la venta directa con el enlace de reservas.');
    // — Oportunidades —
    const sem = d.semana.filter(s => s.n >= 2).sort((a, b) => b.util_prom - a.util_prom);
    if (sem.length >= 3) {
      add('oportunidad', `Tu mejor día: ${sem[0].dia}`, `Deja en promedio ${soles(sem[0].util_prom)} por día (${sem[0].n} días operados).`, 'Asegura la salida ese día y úsalo para promocionar excursiones.');
      const peor = sem[sem.length - 1];
      add('oportunidad', `El día más flojo: ${peor.dia}`, `Promedio ${soles(peor.util_prom)} por día (${peor.n} días).`, peor.util_prom < 0 ? 'Evalúa no salir ese día o juntar pasajeros con otro horario.' : 'Buen día para mantenimiento preventivo o excursiones cortas.');
    }
    const mejorRuta = d.rutas.filter(r => r.viajes >= 3).sort((a, b) => b.util_viaje - a.util_viaje)[0];
    if (mejorRuta && mejorRuta.util_viaje > 0) add('oportunidad', `Ruta más rentable: ${mejorRuta.ruta}`, `${soles(mejorRuta.util_viaje)} por viaje y ${mejorRuta.pax_viaje} pasajes vendidos por viaje${mejorRuta.ocupacion > 100 ? ' (los tramos cortos venden el mismo asiento más de una vez)' : ` (${mejorRuta.ocupacion}% de ocupación)`}.`, 'Priorízala en los días de más demanda.');
    const ocup = d.rutas.reduce((s, r) => s + r.viajes, 0) ? Math.round(d.rutas.reduce((s, r) => s + r.pax_viaje * r.viajes, 0) / d.rutas.reduce((s, r) => s + r.viajes, 0) / d.cap * 100) : null;
    if (ocup !== null && ocup < 60) add('oportunidad', `Ocupación promedio: ${ocup}%`, `Cada asiento vacío cuesta lo mismo que uno lleno: el diésel ya se pagó.`, `Unos ${Math.ceil((0.75 - ocup / 100) * d.cap)} pasajeros más por viaje la llevarían a un nivel sano (75%).`);
    const exc = (await env.DB.prepare(`SELECT e.titulo, SUM(CASE WHEN m.tipo='ingreso' THEN m.monto ELSE 0 END) i, SUM(CASE WHEN m.tipo='egreso' THEN m.monto ELSE 0 END) g FROM excursiones e
      JOIN exc_movimientos m ON m.excursion_id=e.id AND COALESCE(m.anulado,0)=0 WHERE e.estado='finalizada' GROUP BY e.id`).all()).results.filter(x => x.i > 0);
    if (exc.length) { const mg = Math.round(exc.reduce((s, x) => s + (x.i - x.g), 0) / exc.reduce((s, x) => s + x.i, 0) * 100); add(mg >= 25 ? 'oportunidad' : 'negativo', `Las excursiones dejan ${mg}% de margen`, `${exc.length} excursión(es) finalizada(s): cobrado ${soles(exc.reduce((s, x) => s + x.i, 0))}.`, mg >= 25 ? 'Es más rentable que la ruta: vale la pena ofrecer más.' : 'Revisa el cotizador: el precio no está cubriendo bien los costos.', 'excursiones'); }
    const cot = await env.DB.prepare("SELECT SUM(CASE WHEN estado='aceptada' THEN 1 ELSE 0 END) a, SUM(CASE WHEN estado='rechazada' THEN 1 ELSE 0 END) r, SUM(CASE WHEN estado IN ('borrador','enviada') AND valida_hasta >= ? THEN 1 ELSE 0 END) p FROM cotizaciones").bind(hoy).first();
    if (cot && cot.p) add('oportunidad', `${cot.p} cotización(es) esperando respuesta`, 'Siguen vigentes y nadie ha confirmado.', 'Escribe al cliente antes de que venzan.', 'cotizador');
    if (cot && (cot.a + cot.r) >= 4) add('bien', `Aceptan ${Math.round(cot.a / (cot.a + cot.r) * 100)}% de tus cotizaciones`, `${cot.a} aceptadas y ${cot.r} rechazadas.`, cot.a / (cot.a + cot.r) < 0.3 ? 'Si casi todas se rechazan, compara tu precio con la competencia.' : 'Buena tasa: mantén el margen objetivo.');
    // — Cómo vamos —
    if (t.ing && t.util > 0 && t.margen >= 15) add('bien', `Margen sano: ${t.margen}%`, `Ingresos ${soles(t.ing)} y utilidad ${soles(t.util)}.`, 'Mantén el control de gastos variables.');
    if (t.var_util !== null && t.var_util >= 10) add('bien', `La utilidad subió ${t.var_util}%`, `Frente al periodo anterior (${soles(t.prev.util)}).`, 'Identifica qué cambió para repetirlo.');
    if (!t.ing && !t.egr) add('bien', 'Sin datos en este periodo', 'No hay ingresos ni gastos registrados.', 'Elige otro mes o año en el selector.');
    const orden = { decision: 0, negativo: 1, oportunidad: 2, bien: 3 };
    return H.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
  }

  async function rutas(env, yo, req, url) {
    if (url.pathname === '/api/panel' && req.method === 'GET') return panel(env, yo, url);
    return undefined;
  }
  return { rutas };
}
