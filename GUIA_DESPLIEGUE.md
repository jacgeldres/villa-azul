# Villa Azul · v5.3.0 — Guía de despliegue

Un solo proyecto en Cloudflare sirve la app y la API. Se configura **una vez**; después, cada versión nueva es arrastrar los archivos a GitHub.

## Una sola vez (unos 15 minutos)

1. **GitHub.** Crea una cuenta en github.com si no tienes. Botón **New repository** → nombre `villa-azul` → **Private** → Create.
   Pulsa **uploading an existing file** y arrastra **el contenido** de esta carpeta (`wrangler.jsonc`, `src/`, `public/`, esta guía). Commit.
2. **Base de datos.** En dash.cloudflare.com → **Storage & Databases → D1 → Create database** → nombre `villa-azul` → Create.
   Copia el **Database ID**.
3. **Pega el ID.** En GitHub abre `wrangler.jsonc` → lápiz ✏️ → reemplaza `PEGA-AQUI-EL-ID-DE-TU-BASE-D1` por el ID → Commit.
4. **Conectar.** En Cloudflare → **Workers & Pages → Create → Import a repository** → elige `villa-azul` → deja los valores que propone → **Deploy**.
   Al terminar te da la dirección, del tipo `villa-azul.<tu-cuenta>.workers.dev`.
5. **Primer ingreso.** Abre la dirección → entra como **Marielena (2525)** → **Más → Importar datos** → sube el Excel descargado de tu Google Sheet.
   La tabla de comprobación debe salir toda con ✓ y las sumas de ingresos y gastos iguales.
6. **En cada teléfono:** abre la dirección en Chrome (Android) o Safari (iPhone) → menú → **Agregar a pantalla de inicio**.

Las tablas se crean solas la primera vez que se abre la app. No hace falta consola.

## Actualizar a la v5.3 · Regla de espera para el cliente

Sube a GitHub `src/` y `public/`. No cambia la base de datos (sigue en la **versión 14**). Comprueba en Mi perfil: **Villa Azul v5.3.0 · base de datos v14**.

**Cómo funciona (taxi y transporte privado):**
- **Horas de espera incluidas:** las que escribes en la cotización van dentro del precio, con el margen elegido. El cliente solo lee «Incluye hasta 3 horas de espera».
- **Sin horas incluidas:** el cliente lee «Le esperamos hasta 30 minutos sin costo».
- **Pasado ese tiempo:** «cada hora adicional de espera es S/ 10» (sin margen: es para que respeten la hora, no para ganar).
- **Tope:** «Si la espera pasa de 2 horas adicionales, coordinamos un nuevo horario». Protege la salida a Trujillo.

La regla aparece en el formulario («Así lo verá el cliente»), en el enlace de la cotización y en el mensaje de WhatsApp. Se ajusta en **Cotizador → Parámetros → Espera**. Cada cotización guarda la regla con la que se envió: si después cambias los parámetros, las ya enviadas no cambian.

**En la operación:** Jorge avisa por WhatsApp apenas llega al punto de recojo; ese mensaje marca la hora desde la que corre la espera.

## Actualizar a la v5.2.1 · Km vacíos sin doble conteo y espera a S/ 10

Sube a GitHub `src/` y `public/`. Al primer uso la base pasa sola a la **versión 14**. Comprueba en Mi perfil: **Villa Azul v5.2.1 · base de datos v14**.

- **Km vacíos:** si el grupo sale de Angasmarca, los tramos vacíos los pone solo el recorrido elegido y ya no se pueden sumar otra vez a mano. Las casillas de km vacíos solo aparecen cuando el grupo sale de otro pueblo, con el nombre de cada lugar.
- **Tramos a la vista:** debajo de los peajes se listan los movimientos de la van (en naranja los que hace vacía) y el total de km.
- **Hora de espera:** S/ 10 por hora (Parámetros → Van). El margen elegido se aplica encima, como al resto de costos.
- **iPhone:** la casilla «Fecha del servicio» ya no se sale de la tarjeta.

## Actualizar a la v5.2 · Cotizador con km vacíos y pantalla fija

Sube a GitHub `src/` y `public/` (cambian `src/cotizador.js`, `src/worker.js`, `public/app.js`, `public/index.html`, `public/cotizacion.html`, `public/js/cotizar.mjs` y `public/sw.js`). La carpeta `pruebas/` es opcional.
Al primer uso la base pasa sola a la **versión 13**. Comprueba en Mi perfil: **Villa Azul v5.2.0 · base de datos v13**.

**Márgenes.** Quedan en **Mínimo 30 %, Recomendado 40 % y Alto 50 %**, siempre sobre el precio (con 40 %, el costo es el 60 % del precio). Se cambian en Cotizador → Parámetros → Precios.

**Recorrido (km vacíos).** Al cotizar eliges cómo se mueve la van:
- **Ida y vuelta:** lleva al grupo, lo espera o se queda, y lo trae.
- **Solo ida:** deja (o recoge) y vuelve vacía a Angasmarca.
- **Dejar y recoger otro día:** 2 salidas; en cada una hay un tramo vacío. Cuenta 2 jornadas del conductor.

Los km vacíos pagan diésel, conductor por km y desgaste, igual que los km con pasajeros, y los peajes del tramo vacío también se cobran. Se llenan solos con las rutas conocidas («De Angasmarca al origen» y «Del destino a Angasmarca»); si el grupo sale de otro pueblo, se suma el tramo vacío hasta el recojo. Si la app no conoce una distancia, avisa para que la escribas.

**Indicadores nuevos en el cotizador:** km vacíos y su % del recorrido, salidas, diésel en soles, precio por pasajero por tramo, y precio y costo por km.

**Pantalla.** Los botones ya no se salen de su espacio y la app no se agranda con dos dedos ni se corre de lado. Si un iPhone sigue mostrando la versión anterior, cierra la app y ábrela de nuevo.

**Cotizaciones anteriores:** no cambian sus precios. Al editarlas, elige el recorrido y se recalculan con los km vacíos.

## Actualizar a la v5.1 · Checklist solo de salida, regularización y datos de la v7.2

Sube a GitHub **todo**: `wrangler.jsonc` (el cron ahora corre **cada 15 minutos**), `src/` y `public/` (archivo nuevo: `hiace-lateral.jpg`).
Al primer uso la base pasa sola a la **versión 12**. Comprueba en Mi perfil: **Villa Azul v5.1.0 · base de datos v12**.

**Se carga solo al actualizar** (de la app v7.2, sin duplicar si ya lo habías cargado a mano):
- SOAT Pacífico - Interseguro, póliza 594838248, vigente del 23/03/2026 al 23/03/2027.
- Tarjeta de circulación 001-004464 · EMPRESA DE TRANSPORTE JIMAR S.A.C. · Cert. HV 130004897 · Part. Reg. TEAC-043 · vence 08/01/2029.
- Revisión técnica: «Aún no exigible» hasta el 01/01/2028 (según la v7.2; **verifica la fecha con el MTC** y corrígela en Documentos).
- Mantenimientos: 14/04/2026 (105,000 km, AUTONORT Trujillo), 05/07/2026 (110,394 km), 11/08/2026 (115,957 km, aceite y filtros).

**Historial de checklists:** Unidad → Inspecciones → «Importar Excel» → elige `Checklist_Hiace_T7V359.xlsx`. Entran los 53 checklists (06/07 al 12/10) y se abren las novedades que nunca se regularizaron. Se puede repetir sin duplicar.

**Qué vas a ver al importar (es lo que dicen los datos):**
- **Mantenimiento vencido:** tocaba a los 120,957 km y la última lectura es 122,079 km. Si hubo un servicio después del 11/08, regístralo en Mantenimiento; si no, prográmalo ya.
- **11 novedades por regularizar**, todas con el plazo vencido: freno de mano («cable roto»), extintor vencido, botiquín, alarma de retroceso, chaleco, cocodrilos, eslinga, inflador, arrancador, Starlink y neblineros.
- La unidad aparecerá **NO APTA** por el freno de mano, el extintor y el botiquín (observaciones en ítems críticos sin regularizar). Para destrabar: resuélvelas, mándalas a reparación con fecha de compromiso o fija solo el compromiso (Novedades → «Seleccionar varias»).

**Reglas de la v5.1**
- El checklist es **solo de salida** y se hace **entre 1 hora y 30 minutos antes de salir** (configurable en Mantenimiento → Reglas). Antes de esa hora la app no lo deja empezar.
- Ruta regular: Jorge indica a qué hora sale. Excursión: se usa la hora registrada de la excursión.
- Una excursión pasa a «En ruta» solo con un checklist apto de esa ventana (+30 min de tolerancia por demoras). Un administrador puede salir igual dejando el motivo.
- Plazos para regularizar: crítico 2 días, alto 7, medio 15, bajo 30. Una observación en ítem crítico con el plazo vencido deja la unidad NO APTA (se puede desactivar en Reglas).

**Avisos (siempre hay uno):** 30 min antes de que se abra el checklist · cuando se abre (1 h antes) · si a los 30 min antes aún no está · a los administradores si la van salió sin checklist · resumen diario de novedades por regularizar · cada crítica que vence su plazo · documentos (30, 15, 7, 1 día y vencido) · mantenimiento próximo o vencido.
En el teléfono de Jorge, toca «Activar recordatorios en este teléfono» una vez: los avisos también salen como notificación mientras la app esté abierta o en segundo plano.

## Actualizar a la v5.0 · Unidad y checklist (reemplaza la app «Checklist Hiace T7V359» v7.2)

Sube a GitHub **todo**: `wrangler.jsonc` (trae la revisión diaria de las 7:00 a. m.), `src/` (archivo nuevo: `flota.js`) y `public/` (archivos nuevos: `js/unidad.js` y `js/plantilla-checklist.json`).
Al primer uso la base pasa sola a la **versión 11**. Comprueba en Mi perfil: **Villa Azul v5.0.0 · base de datos v11**.

**Primer día (10 minutos, un administrador):**
1. Más → **Unidad y checklist** → **Documentos**: carga SOAT, tarjeta de circulación, revisión técnica, licencia de Jorge, seguro, tarjeta de propiedad y extintor, **con su foto**. Así Jorge los muestra en un control aunque no tenga señal.
2. **Mantenimiento** → «Registrar el último servicio» (fecha, km y taller). Desde ahí se calcula el próximo: cada 5,000 km o 180 días, lo que llegue primero (se cambia en «Reglas de la unidad»).
3. Jorge abre la app con señal una vez: el checklist y los documentos quedan guardados en su teléfono.
4. La app anterior (Google Sheets) queda solo como archivo histórico: ya no se usa.

**Quién hace qué**

| Persona | Qué ve | Qué hace |
|---|---|---|
| Jorge (operador) | Pestaña **Checklist**: estado de la unidad, documentos a bordo, mantenimiento, novedades abiertas y sus checklists | Checklist **pre-ruta** antes de cada salida larga u oficial y **post-ruta** al llegar. Funciona sin señal. |
| Marielena, Yenner, Superadmin | Más → **Unidad y checklist** (y la tira de estado arriba del Panel) | Revisan checklists, gestionan novedades, cargan documentos, registran mantenimientos, fijan reglas y ven indicadores |

**Reglas que corrigen la v7.2**
- La aptitud la calcula el servidor: **falla en ítem crítico** o **SOAT, tarjeta de circulación, revisión técnica o licencia vencidos** = **NO APTA**, aunque el checklist diga «Bien».
- Una **excursión** solo pasa a «En ruta» con un pre-ruta **apto** de las últimas 12 h. Si falta o salió no apta, un administrador puede salir igual escribiendo el motivo (queda en auditoría y avisa al equipo). Se puede cambiar a «Solo avisar» en Reglas.
- Un **kilometraje imposible** (menor al último o con un salto mayor a 900 km por día) se guarda marcado y no cuenta para el mantenimiento hasta que un administrador lo valida o corrige.
- Las **novedades** son problemas con historia: se abren con un checklist, pasan a «En reparación» y se cierran solas cuando un checklist posterior marca el ítem «Bien» (o con el mantenimiento que las resuelve). Si vuelven a fallar en 30 días cuentan como reincidencia.
- Fecha y hora en hora de Lima; los reportes semanales ya no se corren un día.
- Sin claves en el código: se entra con el PIN de Villa Azul.

**Avisos (campana):** NO APTA o con fallas (administradores) · km dudoso (administradores) · documentos a los 30, 15, 7 y 1 día y al vencer (todos) · mantenimiento próximo o vencido (todos) · excursión que sale hoy o mañana sin pre-ruta (todos).

**Indicadores** (Unidad → Indicadores, 7/30/90/365 días): salidas con pre-ruta, disponibilidad, índice de aptitud, ciclos pre+post completos, tiempo de reparación, novedades abiertas, reincidencia, tiempo de llenado y checklists exprés (< 3 min), resultados por semana, lo que más se repite, novedades por zona, km recorridos y costo de mantenimiento por km.

## Actualizar a la v4.3.1

Sube a GitHub `src/` y `public/`. La base sigue en la **versión 10**. Comprueba en Mi perfil: **Villa Azul v4.3.1 · base de datos v10**.

**Portal /viaja en celulares (Android y iPhone):**
- «Viajeros» y el calendario abren en cualquier teléfono, también en iPhone con iOS antiguo y dentro de Facebook o Instagram.
- **Máximo 15 viajeros con asiento** (adultos + niños). Los bebés van en brazos y no cuentan. Al llegar a 15 aparece el enlace a WhatsApp para grupos grandes. El servidor también lo valida.
- El formulario aparece al instante aunque la señal sea lenta; los destinos y los días ocupados llegan después.
- La página ya no se sale de la pantalla en celulares de 320–360 px y no hace zoom al tocar «+» seguido.

## Actualizar a la v4.3

Sube a GitHub **todo** `src/` (hay un archivo nuevo: `solicitudes.js`) y `public/` (página nueva: `viaja.html`).
Al primer uso la base pasa sola a la **versión 10**. Comprueba en Mi perfil: **Villa Azul v4.3.0 · base de datos v10**.

**WhatsApp de la empresa:** al migrar queda en **+51 990 587 558** (Parámetros del cotizador → WhatsApp de la empresa). Es el número que ven los clientes en el portal, en la cotización y en el QR.

**Portal para clientes `/viaja`:** el cliente elige excursión o transporte privado, ida y vuelta o solo ida, fechas en el calendario,
viajeros (adultos, niños y bebés), lugar de recojo, punto de llegada, si la van hace recorrido dentro de la ciudad y el servicio que prefiere.
Al enviar recibe un pase con su código **SOL-0001** y un enlace para seguir su solicitud.
En el calendario ve marcados los días en que la van ya tiene otro viaje (puede pedirlos igual) y los feriados.

**El flujo del equipo** (Más → **Solicitudes de viaje**):
1. Llega el aviso a la campana: «Nueva solicitud SOL-…». Al abrirla queda **En revisión** a tu nombre.
2. **Armar cotización**: el cotizador se abre con todo puesto (cliente, ruta, días y noches, viajeros, fecha, notas). Revisa km y precios y guarda.
3. En la cotización: **Enviar por WhatsApp**. Hasta ese momento el cliente no ve precios (los borradores no se muestran).
4. El cliente elige Estándar o Premium desde su enlace: aviso para todos y la solicitud pasa a **Aceptada**.
5. **Crear la excursión** desde la cotización, como siempre.

**Indicadores:** por atender (y cuánto espera la más antigua), tiempo de respuesta (meta 2 h), conversión de 90 días,
flujo por etapa, destinos más pedidos, por dónde llegan (QR, WhatsApp, Facebook…) y meses de viaje pedidos.

**Compartir con un toque:** arriba del **Panel** y de **Solicitudes** está la barra «Comparte tu portal de viajes»:
WhatsApp (elige contacto o grupo), Facebook (publica con la imagen de Villa Azul), «Copiar para Instagram o TikTok», QR y, en el celular, «Más opciones» (incluye Estados de WhatsApp).
Cada botón marca su canal solo. «Editar mensaje» cambia el texto que acompaña al enlace (se guarda en ese teléfono).
Si Facebook muestra una vista previa vieja, pega el enlace en developers.facebook.com/tools/debug y pulsa «Volver a extraer».

**QR:** en Solicitudes → **QR y enlace** se descarga o imprime el QR con el logo, del portal o del chat de WhatsApp.
También vienen listos en la carpeta `material-impreso/` (no se sube a GitHub). Para medir otros canales usa el enlace con `?src=`:
`/viaja?src=fb` (Facebook), `?src=ig` (Instagram), `?src=tt` (TikTok), `?src=wa` (estados de WhatsApp).

## Actualizar a la v4.2.1

Sube a GitHub `src/` y `public/`. No cambia la base de datos: sigue en la **versión 9**.
Comprueba en Mi perfil: **Villa Azul v4.2.1 · base de datos v9**.

**WiFi por viaje:** el WiFi del Premium se cobra **por pasajero y por viaje**, igual si el viaje dura 1 o 4 días. Valor inicial S/ 10 (Parámetros → Servicio Premium → WiFi a bordo).
Es un precio fijo: el margen no se aplica sobre él. El refrigerio sigue siendo 1 por pasajero **por día**.
Las cotizaciones ya guardadas no cambian; el nuevo cálculo se aplica al crear o editar una cotización.

## Actualizar a la v4.2

Sube a GitHub **todo**: `wrangler.jsonc`, `src/` y `public/`. Al primer uso la base pasa sola a la **versión 9**.
Comprueba en Mi perfil: **Villa Azul v4.2.0 · base de datos v9**.

**Jorge cotiza:** Viajes → **Cotizar un viaje** / **Mis cotizaciones**. Ve solo recorrido y precios (Estándar y Premium); no ve parámetros, costos, su pago, el bono ni el margen, y no puede cambiar precios.
**Diésel del día:** cada cotización tiene la casilla «Precio del diésel hoy»; antes de guardar se pide confirmarlo. Si alguien usa un precio distinto al de Parámetros, los administradores lo ven en el aviso.
**Bono del conductor:** en Parámetros → «Bono del conductor (viajes largos)» se fija desde cuántos km y cuánto por día (0 = apagado). En cada cotización un administrador puede escribir otro bono o 0.
**Avisos (campana arriba):** los administradores reciben cuando Jorge cotiza y cuando llega un voucher; todos reciben cuando un cliente acepta una cotización. Llegan al abrir la app y cada minuto mientras está abierta.

## Actualizar a la v4.1

Sube a GitHub **todo**: `wrangler.jsonc`, `src/` y `public/`. Al primer uso la base pasa sola a la **versión 8**.
Comprueba en Mi perfil: **Villa Azul v4.1.0 · base de datos v8**.

**Primera vez:** Más → Cotizador → **Parámetros** → revisa y guarda una vez (diésel, conductor por km, cochera, refrigerio, WiFi, WhatsApp de la empresa).
Después solo se tocan cuando suba el combustible o cambie el pago del conductor.

**Calcular km:** escribe origen y destino y pulsa «Calcular km». Usa primero las rutas que ya conoces (Angasmarca–Trujillo: 186 km, peaje solo al volver de Trujillo, S/ 8.80) y, si no la conoce, la calcula con OpenStreetMap. Verifica con «Ver en Google Maps»: al guardar la cotización, la ruta y sus peajes quedan recordados.

## Actualizar a la v4.0

Sube a GitHub **todo**: `wrangler.jsonc`, `src/` (ahora 5 archivos) y `public/` (nuevos: `cotizacion.html`, `js/cotizar.mjs` y dos archivos en `vendor/` para los gráficos).
Al primer uso la base pasa sola a la **versión 7**. Comprueba en Mi perfil: **Villa Azul v4.0.0 · base de datos v7**.

**Antes de cotizar por primera vez:** Más → Cotizador → **Parámetros**. Revisa los valores marcados «supuesto inicial»
(rendimiento de la Hiace, precio del diésel, viáticos, hospedaje, desgaste) y escribe el WhatsApp de la empresa.
Cuando registres excursiones con km de salida/llegada y galones, aparecerá el botón «Usar dato real».

**Salidas regulares con reserva y pago por enlace:** crea una excursión «Venta por asiento» con la fecha y hora de la salida,
el precio del pasaje y «Horas para pagar». Los pasajeros que pagan por el enlace llegan a Jorge marcados «Pagado» en su lista:
no se les cobra otra vez ni se registran en Registrar, así no se cuentan dos veces.

## Actualizar a la v3.2

Sube a GitHub **todo**: `wrangler.jsonc` (ya trae tu base de producción), `src/` y `public/` (hay una página nueva: `public/organizador.html`).
Al primer uso la base pasa sola a la **versión 6**. Comprueba en Mi perfil: **Villa Azul v3.2.0 · base de datos v6**.

**Dos enlaces por excursión**

| Enlace | Para quién | Dónde está |
|---|---|---|
| Enlace del grupo `/reservar?e=…` | Cada viajero: elige asiento y registra sus datos | Excursión → Resumen → «Enlace para tus clientes» · Jorge: pestaña Viajes |
| Enlace del organizador `/organizador?t=…` | El líder o quien contrata: registra a todos, aparta asientos, pega listas, corrige datos y paga | Excursión → Resumen → «Enlace del organizador» (privado) |

En una excursión por **contrato**, los viajeros no ven precios ni piden voucher: el organizador paga el adelanto y el saldo desde su panel, y Yenner lo aprueba.
Si el enlace del organizador se filtra: **Cambiar enlace** — el anterior deja de funcionar al instante.

## Actualizar a la v3.1

`wrangler.jsonc` ya trae tu base de producción (`a6125133-772b-4d2a-98fd-74d07db870c2`). Sube a GitHub **todo**: `wrangler.jsonc`, `src/` y `public/` (incluida la carpeta nueva `public/vendor/`).
Si en Cloudflare tu Worker tiene otro nombre que «villa-azul», cambia solo `"name"` en `wrangler.jsonc` para que se actualice ese mismo Worker.
Al primer uso la base pasa sola a la **versión 5**. Comprueba en Mi perfil: **Villa Azul v3.1.0 · base de datos v5**.

**Reservas con pago**
1. Compartir el enlace (cualquiera, también Jorge desde la pestaña **Viajes**).
2. El pasajero elige asiento, paga por Yape y sube la captura con el número de operación. Recibe un enlace «Mi reserva».
3. Yenner (o Superadmin) revisa en **Más → Por revisar** o en la excursión → **Aprobar**. Los asientos pasan a «Pagado» y se registra el ingreso.
4. Se abre **Enviar boleto digital**: WhatsApp, SMS o Llamar, con el enlace del boleto (QR) de cada asiento.

## Actualizar a la v3.0 (caja diaria)

Sube a GitHub **todo** `src/` (ahora son 3 archivos: `worker.js`, `excursiones.js`, `caja.js`) y `public/`.
Al primer uso la base pasa sola a la **versión 4**. Comprueba en Mi perfil: **Villa Azul v3.0.0 · base de datos v4**.

**Quién hace qué en la caja**

| Persona | Cierra cajas | Verifica |
|---|---|---|
| Jorge | La suya | — |
| Marielena (función efectivo) | La suya y la de cualquiera | El efectivo recibido |
| Yenner (función Yape) | La suya y la de cualquiera | Los Yape recibidos |
| Superadmin | La de cualquiera | Efectivo y Yape |

La función se cambia en **Más → Usuarios → (persona) → Función en la caja**.

**Regularizar días atrasados:** Más → Calendario → toca un día marcado «sin registro» → **Registrar en este día**
(queda a nombre de quien operó, con tu nombre como quien lo registró) → **Ver la caja de este día** → Cerrar caja con motivo.

## Actualizar a la v2.1

Sube a GitHub **todo** `src/` y `public/` (reemplaza los archivos). Al primer uso, la base se actualiza sola a la **versión 3**: agrega columnas sin tocar los datos.
Para comprobarlo: Mi perfil → al pie debe decir **Villa Azul v2.1.0 · base de datos v3**.
Si un celular sigue mostrando una versión anterior, ciérralo y ábrelo dos veces.

**Reimportar el Excel** desde ahora solo agrega filas que falten: nunca deshace una corrección, anulación o foto hecha en la app.

## Cada versión nueva

Arrastra los archivos que cambien a GitHub → Commit. Cloudflare publica solo en uno o dos minutos.
Si algo sale mal: Cloudflare → tu Worker → **Deployments** → la versión anterior → **Rollback**.

## Usuarios iniciales

| Usuario | Rol | PIN |
|---|---|---|
| Jorge | Operador | 8888 |
| Marielena | Admin | 2525 |
| Yenner | Admin | 2525 |
| Superadmin | Superadmin (protegida) | 2525 |

Los PIN del Excel no se importan: valen estos. Marielena, Yenner y Superadmin cambian el suyo en **Mi perfil**. El PIN de Jorge solo lo cambia un administrador (**Más → Usuarios → Jorge → Restablecer PIN**).

## Excursiones (fase 2)

Solo para Marielena, Yenner y Superadmin: **Excursiones** en la barra inferior. Jorge no lo ve.

1. **Nueva excursión** → contrato (van completa) o venta por asiento.
2. **Abrir reservas** → **Compartir por WhatsApp**. El enlace tiene la forma `https://<tu-dirección>/reservar?e=CÓDIGO`.
3. Las reservas llegan solas y aparecen como **por confirmar**. En **Asientos** se confirman, se cobran o se liberan.
4. **Registrar salida (km)** → gastos con foto de la boleta en **Ingresos y gastos** (funciona sin señal) → **Registrar llegada (km)** → **Finalizar viaje**.

Las fotos de las boletas se guardan en la misma base de datos: no hay que configurar nada más en Cloudflare.

## Mientras no se migre la caja diaria

Excursiones ya se puede usar con clientes reales. Registrar, Caja y Cuentas siguen siendo de prueba: la caja diaria se sigue cerrando en la app actual hasta la fase 3.
Lo que se registre aquí durante las pruebas se limpia antes del corte definitivo.
