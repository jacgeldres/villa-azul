// Prueba de la bitácora de tanqueo: node pruebas/combustible.prueba.mjs (debe terminar en «OK combustible»).
import { armarCiclos, resumir, precioReciente, KML_KMGAL } from '../src/combustible.js';

const falla = (t, ...x) => { console.error('FALLA:', t, ...x); process.exit(1); };
const T = (id, fecha, km, gal, monto, lleno, extra = {}) => ({ id, fecha, km, galones: gal, monto, lleno, reseteo: lleno ? 1 : null, estado: 'activa', tipo: 'carga', ...extra });

// 1. Lleno → parcial → lleno: los galones de la parcial cuentan para el tanque.
const F = [
  { id: 'ref', tipo: 'lectura', fecha: '2026-11-26 21:37:00', km: 124991, galones: 0, monto: 0, lleno: 0, tablero_kml: 7.6, estado: 'activa' },
  T('a', '2026-11-28 07:00:00', 125100, 9, 153, 1),
  T('b', '2026-11-29 18:00:00', 125300, 4, 68, 0),
  T('c', '2026-11-30 19:00:00', 125472, 9, 154.8, 1, { tablero_kml: 8.1 }),
];
const { ciclos, abierto } = armarCiclos(F);
if (ciclos.length !== 1) falla('un ciclo', ciclos.length);
const c = ciclos[0];
if (c.km !== 372 || c.galones !== 13 || c.kmgal !== 28.6 || c.cargas !== 2) falla('ciclo a→c', c);
if (c.tablero_kmgal !== Math.round(8.1 * KML_KMGAL * 10) / 10 || c.desvio_tablero !== 7) falla('tablero', c.tablero_kmgal, c.desvio_tablero);
if (Math.abs(c.soles_km - 222.8 / 372) > 0.001) falla('S/ por km', c.soles_km);
if (!abierto || abierto.id !== 'c' || abierto.gal_despues !== 0) falla('abierto', abierto);

// 2. Sin reseteo en el tanque anterior: el km/L del tablero no vale.
const F2 = [T('a', '2026-12-01 07:00:00', 1000, 10, 170, 1, { reseteo: 0 }), T('b', '2026-12-03 07:00:00', 1300, 10, 170, 1, { tablero_kml: 8 })];
if (armarCiclos(F2).ciclos[0].tablero_kmgal !== null) falla('tablero sin reset');

// 3. Ciclos dudosos no cuentan: salto de km, rendimiento imposible.
const F3 = [T('a', '2026-12-01 07:00:00', 1000, 10, 170, 1), T('b', '2026-12-02 07:00:00', 1010, 10, 170, 1), T('c', '2026-12-03 07:00:00', 1310, 10, 170, 1, { km_alerta: 'salto' }), T('d', '2026-12-04 07:00:00', 1600, 10, 170, 1)];
const c3 = armarCiclos(F3).ciclos;
if (c3[0].valido || c3[1].valido || c3[2].valido) falla('dudosos', c3.map(x => [x.valido, x.motivo]));

// 4. Resumen ponderado (km totales ÷ galones totales) y ventana.
const F4 = [T('a', '2026-11-01 07:00:00', 0, 10, 170, 1), T('b', '2026-11-05 07:00:00', 300, 10, 170, 1), T('c', '2026-11-09 07:00:00', 600, 12, 204, 1), T('d', '2026-11-12 07:00:00', 870, 9, 153, 1)];
const r = resumir(armarCiclos(F4).ciclos, '2026-11-27');
if (r.n !== 3 || r.km !== 870 || r.galones !== 31 || r.kmgal !== 28.1) falla('resumen', r);
if (resumir(armarCiclos(F4).ciclos, '2027-06-01') !== null) falla('ventana de 120 días');

// 4b. Un tanque atípico (carga sin anotar) no mueve el promedio.
const F4b = [...F4, T('e', '2026-11-16 07:00:00', 1470, 12, 204, 1)];
const r4b = resumir(armarCiclos(F4b).ciclos, '2026-11-27');
if (r4b.atipicos !== 1 || r4b.n !== 3) falla('atípico', r4b);

// 5. Precio del grifo: mediana de las últimas 3 cargas.
const p = precioReciente([T('a', '2026-11-20 07:00:00', 1, 10, 170, 1), T('b', '2026-11-22 07:00:00', 2, 10, 175, 1), T('c', '2026-11-25 07:00:00', 3, 10, 168, 1)], '2026-11-27');
if (p.valor !== 17 || p.n !== 3) falla('precio', p);

// 6. Anulados y lecturas no entran.
if (armarCiclos([T('a', '2026-12-01 07:00:00', 1000, 10, 170, 1), T('b', '2026-12-02 07:00:00', 1300, 10, 170, 1, { estado: 'anulada' })]).ciclos.length !== 0) falla('anulado');

console.log('Tanque de ejemplo:', c.km, 'km ÷', c.galones, 'gal =', c.kmgal, 'km/gal (', c.kml, 'km/L ) · tablero', c.tablero_kmgal, 'km/gal (+' + c.desvio_tablero + '%)');
console.log('OK combustible');
