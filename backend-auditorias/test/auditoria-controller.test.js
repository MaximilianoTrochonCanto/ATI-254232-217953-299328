const assert = require("node:assert/strict");
const test = require("node:test");

const { loadFresh, mockPool, mockResponse } = require("./helpers");

const poolPath = "../src/config/bd";
const controllerPath = "../src/controladores/auditoriaControlador";

test("replica las ponderaciones globales de Evaluacion de Servicio V10", () => {
  const { calcularEvaluacionServicioV10 } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const completo = calcularEvaluacionServicioV10({
    bioluminiscencia: 1,
    microbiologiaSuperficie: 1,
    auditoriaPoes: 1,
    higieneGeneral: 1,
    auditoriaHaccp: 1,
    camarasYSecos: 1,
    cumplimientoBpm: 1,
    capacitacionesYCharlas: 1,
    documentacion: 1,
    menuComedor: 1,
    servicioComedor: 1,
    planContingencia: 1,
    menuViandas: 1,
    servicioViandas: 1,
    evaluacionTurnoNoche: 1,
    capacitacionesSyso: 1,
    evaluacionTareas: 1,
  });
  assert.equal(completo.porcentaje, 100);
  assert.equal(completo.componentes.inocuidad, 25);
  assert.equal(completo.componentes.comedor, 20);

  const conDescuentos = calcularEvaluacionServicioV10({
    ...Object.fromEntries(
      [
        "bioluminiscencia", "microbiologiaSuperficie", "auditoriaPoes",
        "higieneGeneral", "auditoriaHaccp", "camarasYSecos",
        "cumplimientoBpm", "capacitacionesYCharlas", "documentacion",
        "menuComedor", "servicioComedor", "planContingencia",
        "menuViandas", "servicioViandas", "evaluacionTurnoNoche",
        "capacitacionesSyso", "evaluacionTareas",
      ].map((nombre) => [nombre, 1])
    ),
    informesObservacion: 1,
    respuestasObservacion: 0.25,
    accidentesTrabajo: 1,
    incumplimientoPlazos: 0.5,
  });
  assert.equal(conDescuentos.porcentaje, 66.25);
});

test("Evaluacion V10 limita entradas fuera de rango y expone sus componentes", () => {
  const { calcularEvaluacionServicioV10 } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const resultado = calcularEvaluacionServicioV10({
    bioluminiscencia: 2,
    microbiologiaSuperficie: -1,
    auditoriaPoes: "0.5",
    accidentesTrabajo: 3,
  });

  assert.equal(resultado.version, "V10 Julio 2026");
  assert.equal(resultado.componentes.limpieza, 5.63);
  assert.equal(resultado.componentes.accidentes, -10);
  assert.equal(resultado.porcentaje, -4.38);
});

test("calculo simple excluye no verificables y nunca baja de cero", () => {
  const { calcularPuntajeAuditoria } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const resultado = calcularPuntajeAuditoria(
    [
      { puntuacion: 3, puntaje_maximo: 3, no_verificable: false },
      { puntuacion: 0, puntaje_maximo: 3, no_verificable: true },
    ],
    150,
    "Auditoria general"
  );

  assert.equal(resultado.porcentajeBase, 100);
  assert.equal(resultado.porcentajeFinal, 0);
  assert.equal(resultado.metodoCalculo, "promedio_simple");
});

test("calcula BPM con ponderaciones 20, 35 y 45 del documento de referencia", () => {
  const { calcularPuntajeAuditoria } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const respuestas = Array.from({ length: 72 }, (_, index) => ({
    orden: index + 1,
    puntuacion: 3,
    puntaje_maximo: 3,
  }));

  const completo = calcularPuntajeAuditoria(
    respuestas,
    0,
    "Buenas prácticas en general, trazabilidad, PC y PCC"
  );
  assert.equal(completo.porcentajeBase, 100);
  assert.equal(completo.metodoCalculo, "bpm_20_35_45");

  [61, 62, 63, 64, 65, 69, 70, 71, 72].forEach((orden) => {
    respuestas[orden - 1].puntuacion = 0;
  });
  const sinCriticos = calcularPuntajeAuditoria(
    respuestas,
    0,
    "BPM, trazabilidad, PC y PCC"
  );
  assert.equal(sinCriticos.porcentajeBase, 55);
});

test("genera un DOCX editable incluso si faltan datos del usuario o empresa", async () => {
  const pool = mockPool([
    {
      rows: [{
        id: 9,
        plantilla_nombre: "Auditoría cámaras de congelado",
        empresa_nombre: "Empresa no disponible",
        auditor_nombre: "Usuario no disponible",
        fecha: "2026-07-18",
        estado: "finalizada",
      }],
    },
    {
      rows: [{
        id: 1,
        texto: "Existe acción correctiva?",
        seccion: "General",
        numero: 1,
        puntuacion: 3,
        puntaje_maximo: 3,
        orden: 1,
        no_verificable: false,
      }],
    },
    { rows: [] },
  ]);
  const { descargarAuditoriaDOCX } = loadFresh(controllerPath, {
    [poolPath]: pool,
  });
  const res = mockResponse();

  await descargarAuditoriaDOCX({ params: { id: "9" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(Buffer.isBuffer(res.body), true);
  assert.equal(res.body.subarray(0, 4).toString("hex"), "504b0304");
  assert.equal(
    res.headers["Content-Type"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  assert.equal(Number(res.headers["Content-Length"]), res.body.length);
});

test("crearAuditoria valida campos y usa el usuario autenticado", async () => {
  const { crearAuditoria: crearSinDatos } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const bad = mockResponse();
  await crearSinDatos({ body: {}, user: { id: 5 } }, bad);
  assert.equal(bad.statusCode, 400);

  const pool = mockPool([
    {
      rows: [
        {
          id: 12,
          plantilla_id: 1,
          empresa_id: 2,
          usuario_id: 5,
          estado: "borrador",
        },
      ],
    },
  ]);
  const { crearAuditoria } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await crearAuditoria(
    {
      body: {
        plantilla_id: 1,
        empresa_id: 2,
        lugar: "Cocina",
        observacion_general: "Observacion QA",
      },
      user: { id: 5 },
    },
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(pool.calls[0].params[2], 5);
  assert.equal(res.body.auditoria.id, 12);
});

test("guardarRespuestas reemplaza respuestas y finaliza auditoria", async () => {
  const pool = mockPool([
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
    {
      rows: [
        { puntuacion: 2, no_verificable: false, puntaje_maximo: 3 },
        { puntuacion: null, no_verificable: true, puntaje_maximo: 3 },
      ],
    },
  ]);
  const { guardarRespuestas } = loadFresh(controllerPath, { [poolPath]: pool });
  const res = mockResponse();

  await guardarRespuestas(
    {
      params: { id: 12 },
      body: {
        respuestas: [
          { criterio_id: 1, puntuacion: 2, observacion: "OK" },
          { criterio_id: 2, puntuacion: null, no_verificable: true },
        ],
      },
    },
    res
  );

  assert.equal(res.statusCode, 200);
  assert.match(pool.calls[0].sql, /DELETE FROM respuestas/);
  assert.match(pool.calls[3].sql, /estado = 'finalizada'/);
  assert.equal(res.body.puntaje.porcentajeFinal, 67);
});

test("guardarRespuestas rechaza payload que no sea lista", async () => {
  const { guardarRespuestas } = loadFresh(controllerPath, {
    [poolPath]: mockPool(),
  });
  const res = mockResponse();

  await guardarRespuestas(
    { params: { id: 1 }, body: { respuestas: "mal" } },
    res
  );

  assert.equal(res.statusCode, 400);
});

test("obtener auditorias respeta filtros de auditor y admin", async () => {
  const pool = mockPool([
    { rows: [{ id: 1, empresa_id: 3 }] },
    { rows: [{ id: 2, empresa_id: 4 }] },
  ]);
  const { obtenerMisAuditorias, obtenerTodasAuditorias } = loadFresh(
    controllerPath,
    { [poolPath]: pool }
  );

  const mias = mockResponse();
  await obtenerMisAuditorias(
    {
      user: { id: 9 },
      query: { empresa_id: 3, fecha_desde: "2026-01-01" },
    },
    mias
  );

  assert.equal(mias.body[0].id, 1);
  assert.deepEqual(pool.calls[0].params, [9, 3, "2026-01-01"]);

  const todas = mockResponse();
  await obtenerTodasAuditorias(
    { query: { empresa_id: 4, fecha_hasta: "2026-12-31" } },
    todas
  );

  assert.equal(todas.body[0].id, 2);
  assert.deepEqual(pool.calls[1].params, [4, "2026-12-31"]);
});

test("obtenerReportesAuditorias arma resumen mensual y anios disponibles", async () => {
  const pool = mockPool([
    {
      rows: [
        {
          empresa_id: 1,
          empresa_nombre: "Empresa QA",
          anio: 2026,
          mes: 7,
          cantidad_auditorias: 2,
          promedio: 95,
        },
      ],
    },
    { rows: [{ anio: 2026 }] },
  ]);
  const { obtenerReportesAuditorias } = loadFresh(controllerPath, {
    [poolPath]: pool,
  });
  const res = mockResponse();

  await obtenerReportesAuditorias(
    { user: { id: 3, rol: "admin" }, query: { anio: "2026" } },
    res
  );

  assert.deepEqual(res.body.anios, [2026]);
  assert.equal(res.body.reportes[0].promedio, 95);
  assert.match(pool.calls[0].sql, /reclamo_penalizaciones/);
  assert.match(pool.calls[0].sql, /descuento_reclamos_total/);
});
