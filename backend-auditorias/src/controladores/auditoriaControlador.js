const pool = require("../config/bd");
const PDFDocument = require("pdfkit");
const zlib = require("zlib");

const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const soloFecha = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  return new Date(fecha).toLocaleDateString("es-UY");
};

const corregirTextoCriterio = (texto = "") =>
  String(texto).replace(/l[áa]caros/gi, (valor) =>
    valor[0] === valor[0].toUpperCase() ? "Límites" : "límites"
  );

const quitarCriteriosDuplicados = (criterios = []) => {
  const vistos = new Set();
  return criterios.filter((criterio) => {
    const numero = String(criterio.numero || "").trim().toLowerCase();
    const texto = corregirTextoCriterio(criterio.texto).trim().toLowerCase();
    const clave = numero || texto || String(criterio.id);
    if (vistos.has(clave)) return false;
    vistos.add(clave);
    criterio.texto = corregirTextoCriterio(criterio.texto);
    return true;
  });
};

const limitarProporcion = (valor) =>
  Math.min(1, Math.max(0, Number(valor) || 0));

// Replica la celda N239 de Evaluacion Servicio de Alimentacion V10 (julio 2026).
const calcularEvaluacionServicioV10 = (valores = {}) => {
  const v = (nombre) => limitarProporcion(valores[nombre]);
  const limpieza =
    (v("bioluminiscencia") * 0.25 +
      v("microbiologiaSuperficie") * 0.25 +
      v("auditoriaPoes") * 0.25 +
      v("higieneGeneral") * 0.25 -
      v("reclamosLimpieza") * 0.25 -
      v("observacionesLimpieza") * 0.3 -
      v("noConformidadesLimpieza") * 0.7) *
    0.15;
  const inocuidad =
    (v("auditoriaHaccp") * 0.5 +
      v("camarasYSecos") * 0.3 +
      v("cumplimientoBpm") * 0.2 -
      v("reclamosInocuidad") * 0.25 -
      v("observacionesInocuidad") * 0.3 -
      v("noConformidadesInocuidad") * 0.7) *
    0.25;
  const informes =
    (v("informesObservacion") +
      v("informesNoConformidad") -
      v("respuestasObservacion") -
      v("respuestasNoConformidad")) *
    -0.25;
  const documentacion =
    (v("capacitacionesYCharlas") * 0.5 + v("documentacion") * 0.5) * 0.05;
  const comedor =
    (v("menuComedor") * 0.25 +
      v("servicioComedor") * 0.4 +
      v("planContingencia") * 0.35 -
      v("reclamosComedor") * 0.25 -
      v("observacionesComedor") * 0.3 -
      v("noConformidadesComedor") * 0.7) *
    0.2;
  const viandas =
    (v("menuViandas") * 0.45 +
      v("servicioViandas") * 0.55 -
      v("reclamosViandas") * 0.25 -
      v("observacionesViandas") * 0.3 -
      v("noConformidadesViandas") * 0.7) *
    0.2;
  const turnoNoche =
    (v("evaluacionTurnoNoche") -
      v("reclamosTurnoNoche") * 0.25 -
      v("observacionesTurnoNoche") * 0.3 -
      v("noConformidadesTurnoNoche") * 0.7) *
    0.05;
  const accidentes = v("accidentesTrabajo") * -0.1;
  const syso =
    (v("capacitacionesSyso") * 0.5 +
      v("evaluacionTareas") * 0.5 -
      v("reclamosSyso") * 0.25 -
      v("observacionesSyso") * 0.3 -
      v("noConformidadesSyso") * 0.7) *
    0.1;
  const plazos = v("incumplimientoPlazos") * -0.1;
  const componentes = {
    limpieza,
    inocuidad,
    informes,
    documentacion,
    comedor,
    viandas,
    turnoNoche,
    accidentes,
    syso,
    plazos,
  };
  const proporcion = Object.values(componentes).reduce(
    (total, valor) => total + valor,
    0
  );

  return {
    porcentaje: Math.round(proporcion * 10000) / 100,
    componentes: Object.fromEntries(
      Object.entries(componentes).map(([nombre, valor]) => [
        nombre,
        Math.round(valor * 10000) / 100,
      ])
    ),
    version: "V10 Julio 2026",
  };
};

const sectoresHigieneGeneral = [
  "Recepcion",
  "Almacenamiento viveres secos",
  "Almacenamiento refrigerado y congelado",
  "Desinfeccion",
  "Produccion: cocina caliente/panaderia/pasteleria",
  "Ambiente controlado",
  "Servicio/atencion al cliente",
  "Lavado de vajilla/equipos/utensilios",
  "Almacenamiento de residuos",
  "Sectores de transito y de apoyo",
  "Libre de gluten",
  "Vestuarios y banos femenino/masculino",
  "Vehiculo/s de transporte",
];

const criteriosBaseHigieneGeneral = [
  "La infraestructura del sector es adecuada? (Materiales lavables, no porosos; sin roturas, oxido ni grietas; uniones selladas; etc.)",
  "Las condiciones de higiene y orden del sector en general son adecuadas o permiten definir que la suciedad existente se debe a consecuencias propias de las tareas del sector del turno en cuestion?",
  "Las condiciones de higiene y/u orden del lavamanos y su area es adecuada?",
  "El funcionamiento de dispensadores, canilla o secador es adecuado?",
  "Disponen de los productos necesarios para el lavado de manos?",
  "Las condiciones de higiene del recipiente de basura son adecuadas?",
  "La bolsa esta colocada de forma adecuada y con capacidad para mas almacenamiento de residuos?",
  "El recipiente de basura se encuentra tapado correctamente?",
  "Las condiciones de higiene de los implementos de limpieza son adecuadas?",
  "Las condiciones de higiene de los equipos en general son adecuadas?",
];

const criteriosVehiculoHigieneGeneral = [
  "La infraestructura del/los vehiculos es adecuada? (Materiales lavables, no porosos; sin roturas, oxido ni grietas; uniones selladas; etc.)",
  "Las condiciones de higiene y orden del/los vehiculos en general son adecuadas?",
  "Las condiciones de higiene de los implementos de limpieza son adecuadas?",
  "Las condiciones de higiene de los equipos en general son adecuadas?",
];

const obtenerCriteriosHigieneGeneral = (plantillaId) => {
  let orden = 1;

  return sectoresHigieneGeneral.flatMap((sector, sectorIndex) => {
    const textos =
      sectorIndex === sectoresHigieneGeneral.length - 1
        ? criteriosVehiculoHigieneGeneral
        : criteriosBaseHigieneGeneral;

    return textos.map((texto, criterioIndex) => ({
      plantilla_id: Number(plantillaId),
      numero: `${sectorIndex + 1}.${criterioIndex + 1}`,
      texto,
      seccion: sector,
      puntaje_maximo: 3,
      orden: orden++,
    }));
  });
};

const sincronizarCriteriosHigieneGeneral = async (plantillaId) => {
  const criteriosNuevos = obtenerCriteriosHigieneGeneral(plantillaId);
  const existentes = await pool.query(
    `SELECT id FROM criterios
     WHERE plantilla_id = $1
     ORDER BY orden ASC`,
    [plantillaId]
  );

  const sincronizados = [];

  for (let index = 0; index < criteriosNuevos.length; index++) {
    const criterio = criteriosNuevos[index];
    const existente = existentes.rows[index];

    if (existente) {
      const actualizado = await pool.query(
        `UPDATE criterios
         SET numero = $1, texto = $2, seccion = $3, puntaje_maximo = $4, orden = $5
         WHERE id = $6
         RETURNING *`,
        [
          criterio.numero,
          criterio.texto,
          criterio.seccion,
          criterio.puntaje_maximo,
          criterio.orden,
          existente.id,
        ]
      );
      sincronizados.push(actualizado.rows[0]);
    } else {
      const insertado = await pool.query(
        `INSERT INTO criterios
         (plantilla_id, numero, texto, seccion, puntaje_maximo, orden)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          plantillaId,
          criterio.numero,
          criterio.texto,
          criterio.seccion,
          criterio.puntaje_maximo,
          criterio.orden,
        ]
      );
      sincronizados.push(insertado.rows[0]);
    }
  }

  return sincronizados;
};

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const calcularCrc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const crearZipSimple = (archivos) => {
  const partes = [];
  const directorio = [];
  let offset = 0;

  archivos.forEach((archivo) => {
    const nombre = Buffer.from(archivo.nombre);
    const contenido = Buffer.isBuffer(archivo.contenido)
      ? archivo.contenido
      : Buffer.from(archivo.contenido);
    const comprimido = zlib.deflateRawSync(contenido);
    const crc = calcularCrc32(contenido);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comprimido.length, 18);
    local.writeUInt32LE(contenido.length, 22);
    local.writeUInt16LE(nombre.length, 26);
    local.writeUInt16LE(0, 28);

    partes.push(local, nombre, comprimido);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comprimido.length, 20);
    central.writeUInt32LE(contenido.length, 24);
    central.writeUInt16LE(nombre.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    directorio.push(central, nombre);
    offset += local.length + nombre.length + comprimido.length;
  });

  const directorioBuffer = Buffer.concat(directorio);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(0, 4);
  fin.writeUInt16LE(0, 6);
  fin.writeUInt16LE(archivos.length, 8);
  fin.writeUInt16LE(archivos.length, 10);
  fin.writeUInt32LE(directorioBuffer.length, 12);
  fin.writeUInt32LE(offset, 16);
  fin.writeUInt16LE(0, 20);

  return Buffer.concat([...partes, directorioBuffer, fin]);
};

const escaparXml = (valor = "") =>
  String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const parrafoDocx = (texto, negrita = false) =>
  `<w:p><w:r>${negrita ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escaparXml(texto)}</w:t></w:r></w:p>`;

const crearDocxAuditoria = ({ auditoria, respuestas, reclamos, puntaje }) => {
  const cuerpo = [
    parrafoDocx("Reporte de Auditoria", true),
    parrafoDocx(auditoria.plantilla_nombre || "", true),
    parrafoDocx(`Empresa: ${auditoria.empresa_nombre || "-"}`),
    parrafoDocx(`Auditor: ${auditoria.auditor_nombre || "-"}`),
    parrafoDocx(`Fecha: ${formatearFecha(auditoria.fecha)}`),
    parrafoDocx(`Lugar: ${auditoria.lugar || "-"}`),
    parrafoDocx(`Estado: ${auditoria.estado || "-"}`),
    parrafoDocx(`Resultado base: ${puntaje.porcentajeBase}%`),
    parrafoDocx(`Descuento reclamos/informes: -${puntaje.descuentoReclamos} pts`),
    parrafoDocx(`Resultado final: ${puntaje.porcentajeFinal}%`),
  ];

  if (auditoria.observacion_general) {
    cuerpo.push(parrafoDocx(`Observacion general: ${auditoria.observacion_general}`));
  }

  cuerpo.push(parrafoDocx("Detalle de respuestas", true));
  respuestas.forEach((respuesta, index) => {
    cuerpo.push(parrafoDocx(`${index + 1}. ${respuesta.texto}`, true));
    cuerpo.push(parrafoDocx(`Seccion: ${respuesta.seccion || "-"}`));
    cuerpo.push(
      parrafoDocx(
        `Puntuacion: ${
          respuesta.no_verificable ? "No verificable" : respuesta.puntuacion
        }`,
      ),
    );
    cuerpo.push(parrafoDocx(`Observacion: ${respuesta.observacion || "Sin observaciones"}`));
  });

  if (reclamos.length > 0) {
    cuerpo.push(parrafoDocx("Reclamos / informes vinculados", true));
    reclamos.forEach((reclamo, index) => {
      cuerpo.push(parrafoDocx(`${index + 1}. ${reclamo.titulo}`, true));
      cuerpo.push(parrafoDocx(`Tipo: ${String(reclamo.gravedad || "-").replace(/_/g, " ")}`));
      cuerpo.push(parrafoDocx(`Estado: ${reclamo.estado || "-"}`));
      cuerpo.push(parrafoDocx(`Descuento: -${Number(reclamo.descuento_puntaje) || 0} pts`));
      cuerpo.push(parrafoDocx(`Descripcion: ${reclamo.descripcion || "-"}`));
    });
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpo.join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;

  return crearZipSimple([
    {
      nombre: "[Content_Types].xml",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      nombre: "_rels/.rels",
      contenido:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      nombre: "word/document.xml",
      contenido: documentXml,
    },
  ]);
};

const ordenesPonderacionBpm = {
  20: new Set([3, ...Array.from({ length: 6 }, (_, i) => i + 18), ...Array.from({ length: 12 }, (_, i) => i + 32), 66, 67, 68]),
  35: new Set([1, 2, ...Array.from({ length: 14 }, (_, i) => i + 4), ...Array.from({ length: 8 }, (_, i) => i + 24), 44, 45, ...Array.from({ length: 12 }, (_, i) => i + 46), 58, 59, 60]),
  45: new Set([61, 62, 63, 64, 65, 69, 70, 71, 72]),
};

const esPlantillaBpmPonderada = (nombre = "") => {
  const normalizado = String(nombre)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    normalizado.includes("trazabilidad") &&
    (normalizado.includes("buenas practicas") || normalizado.includes("pcc"))
  );
};

const calcularPorcentajeBpm = (respuestas) => {
  const porOrden = new Map();
  respuestas.forEach((respuesta, index) => {
    const orden = Number(respuesta.orden) || index + 1;
    if (!porOrden.has(orden)) porOrden.set(orden, respuesta);
  });

  if (porOrden.size < 72) return null;

  return Object.entries(ordenesPonderacionBpm).reduce(
    (total, [peso, ordenes]) => {
      const obtenido = [...ordenes].reduce(
        (suma, orden) =>
          suma + (Number(porOrden.get(orden)?.puntuacion) || 0),
        0
      );
      const maximo = ordenes.size * 3;
      return total + (obtenido / maximo) * Number(peso);
    },
    0
  );
};

const calcularPuntajeAuditoria = (
  respuestas = [],
  descuentoReclamos = 0,
  plantillaNombre = respuestas[0]?.plantilla_nombre || ""
) => {
  const puntajeObtenido = respuestas.reduce(
    (acc, r) => acc + (Number(r.puntuacion) || 0),
    0
  );

  const puntajeMaximo = respuestas.reduce((acc, r) => {
    if (r.no_verificable) return acc;
    return acc + (Number(r.puntaje_maximo) || 2);
  }, 0);

  const porcentajePonderado = esPlantillaBpmPonderada(plantillaNombre)
    ? calcularPorcentajeBpm(respuestas)
    : null;
  const porcentajeBase = Math.round(
    porcentajePonderado ??
      (puntajeMaximo > 0 ? (puntajeObtenido / puntajeMaximo) * 100 : 0)
  );
  const descuento = Math.max(0, Number(descuentoReclamos) || 0);
  const porcentajeFinal = Math.max(0, Math.round(porcentajeBase - descuento));

  return {
    puntajeObtenido,
    puntajeMaximo,
    porcentajeBase,
    metodoCalculo:
      porcentajePonderado === null ? "promedio_simple" : "bpm_20_35_45",
    descuentoReclamos: descuento,
    porcentajeFinal,
  };
};

const obtenerReclamosPorAuditoria = async (auditoriaId) => {
  const result = await pool.query(
    `SELECT
       id,
       titulo,
       descripcion,
       gravedad,
       estado,
       descuento_puntaje,
       fecha_creacion
     FROM reclamos
     WHERE auditoria_id = $1
     ORDER BY fecha_creacion DESC, id DESC`,
    [auditoriaId]
  );

  return result.rows;
};

const listarPlantillas = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM plantillas WHERE activa = true ORDER BY categoria, nombre"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar plantillas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

const obtenerCriteriosPorPlantilla = async (req, res) => {
  try {
    const { id } = req.params;

    const plantilla = await pool.query("SELECT nombre FROM plantillas WHERE id = $1", [
      id,
    ]);
    const nombrePlantilla = String(plantilla.rows[0]?.nombre || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (nombrePlantilla.includes("condiciones de higiene en general")) {
      const criterios = await sincronizarCriteriosHigieneGeneral(id);
      return res.json(quitarCriteriosDuplicados(criterios));
    }

    const result = await pool.query(
      `SELECT * FROM criterios
       WHERE plantilla_id = $1
       ORDER BY orden ASC`,
      [id]
    );

    res.json(quitarCriteriosDuplicados(result.rows));
  } catch (error) {
    console.error("Error al obtener criterios:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

const crearAuditoria = async (req, res) => {
  try {
    const { plantilla_id, empresa_id, lugar, observacion_general } = req.body;
    const usuario_id = req.user.id;

    if (!plantilla_id || !empresa_id) {
      return res.status(400).json({
        message: "Plantilla y empresa son obligatorias.",
      });
    }

    const result = await pool.query(
      `INSERT INTO auditorias
       (plantilla_id, empresa_id, usuario_id, lugar, observacion_general)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [plantilla_id, empresa_id, usuario_id, lugar || null, observacion_general || null]
    );

    res.status(201).json({
      message: "Auditoría creada correctamente.",
      auditoria: result.rows[0],
    });
  } catch (error) {
    console.error("Error al crear auditoría:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

const guardarRespuestas = async (req, res) => {
  try {
    const { id } = req.params;
    const { respuestas } = req.body;

    if (!Array.isArray(respuestas)) {
      return res.status(400).json({
        message: "Las respuestas deben enviarse en formato de lista.",
      });
    }

    await pool.query("DELETE FROM respuestas WHERE auditoria_id = $1", [id]);

    const respuestasUnicas = Array.from(
      new Map(
        respuestas.map((respuesta) => [
          String(respuesta.criterio_id),
          respuesta,
        ])
      ).values()
    );

    for (const r of respuestasUnicas) {
      await pool.query(
        `INSERT INTO respuestas
         (auditoria_id, criterio_id, puntuacion, observacion, no_verificable)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          r.criterio_id,
          r.puntuacion,
          r.observacion || null,
          r.no_verificable || false,
        ]
      );
    }

    await pool.query(
      "UPDATE auditorias SET estado = 'finalizada' WHERE id = $1",
      [id]
    );

    const respuestasGuardadas = await pool.query(
      `SELECT r.puntuacion, r.no_verificable, c.puntaje_maximo, c.orden,
              p.nombre AS plantilla_nombre
       FROM respuestas r
       JOIN criterios c ON c.id = r.criterio_id
       JOIN auditorias a ON a.id = r.auditoria_id
       JOIN plantillas p ON p.id = a.plantilla_id
       WHERE r.auditoria_id = $1`,
      [id]
    );
    const puntaje = calcularPuntajeAuditoria(respuestasGuardadas.rows);

    res.json({ message: "Respuestas guardadas correctamente.", puntaje });
  } catch (error) {
    console.error("Error al guardar respuestas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

const obtenerAuditoriaCompleta = async (req, res) => {
  try {
    const { id } = req.params;

    const auditoria = await pool.query(
      `SELECT a.*, p.nombre AS plantilla_nombre, e.nombre AS empresa_nombre
       FROM auditorias a
       JOIN plantillas p ON a.plantilla_id = p.id
       JOIN empresas e ON a.empresa_id = e.id
       WHERE a.id = $1`,
      [id]
    );

    if (auditoria.rows.length === 0) {
      return res.status(404).json({
        message: "Auditoria no encontrada.",
      });
    }

    const respuestas = await pool.query(
      `SELECT r.*, c.texto, c.seccion, c.numero, c.puntaje_maximo, c.orden
       FROM respuestas r
       JOIN criterios c ON r.criterio_id = c.id
       WHERE r.auditoria_id = $1
       ORDER BY c.orden ASC`,
      [id]
    );

    const reclamos = await obtenerReclamosPorAuditoria(id);
    const descuentoReclamos = reclamos.reduce(
      (acc, reclamo) => acc + (Number(reclamo.descuento_puntaje) || 0),
      0
    );
    const puntaje = calcularPuntajeAuditoria(
      respuestas.rows,
      descuentoReclamos,
      auditoria.rows[0].plantilla_nombre
    );

    res.json({
      auditoria: {
        ...auditoria.rows[0],
        puntaje_base: puntaje.porcentajeBase,
        descuento_reclamos: puntaje.descuentoReclamos,
        puntaje_final: puntaje.porcentajeFinal,
      },
      respuestas: respuestas.rows,
      reclamos,
      puntaje,
    });
  } catch (error) {
    console.error("Error al obtener auditoría:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};


const obtenerMisAuditorias = async (req, res) => {
  try {
    const usuario_id = req.user.id;
    const { empresa_id, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT
        a.*,
        p.nombre AS plantilla_nombre,
        e.nombre AS empresa_nombre
      FROM auditorias a
      JOIN plantillas p ON a.plantilla_id = p.id
      JOIN empresas e ON a.empresa_id = e.id
      WHERE a.usuario_id = $1
    `;

    const params = [usuario_id];
    let index = 2;

    if (empresa_id) {
      query += ` AND a.empresa_id = $${index}`;
      params.push(empresa_id);
      index++;
    }

    if (fecha_desde) {
      query += ` AND a.fecha >= $${index}`;
      params.push(fecha_desde);
      index++;
    }

    if (fecha_hasta) {
      query += ` AND a.fecha <= $${index}`;
      params.push(fecha_hasta);
      index++;
    }

    query += ` ORDER BY a.fecha_creacion DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mis auditorías:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};

const obtenerTodasAuditorias = async (req, res) => {
  try {
    const { empresa_id, fecha_desde, fecha_hasta } = req.query;

    let query = `
      SELECT
        a.*,
        p.nombre AS plantilla_nombre,
        e.nombre AS empresa_nombre,
        CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre
      FROM auditorias a
      JOIN plantillas p ON a.plantilla_id = p.id
      JOIN empresas e ON a.empresa_id = e.id
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE 1 = 1
    `;

    const params = [];
    let index = 1;

    if (empresa_id) {
      query += ` AND a.empresa_id = $${index}`;
      params.push(empresa_id);
      index++;
    }

    if (fecha_desde) {
      query += ` AND a.fecha >= $${index}`;
      params.push(fecha_desde);
      index++;
    }

    if (fecha_hasta) {
      query += ` AND a.fecha <= $${index}`;
      params.push(fecha_hasta);
      index++;
    }

    query += ` ORDER BY a.fecha_creacion DESC`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener todas las auditorías:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};

const obtenerReportesAuditorias = async (req, res) => {
  try {
    const { empresa_id, anio } = req.query;
    const esAdmin = req.user.rol === "admin";

    let where = "WHERE a.estado = 'finalizada'";
    let yearsWhere = "WHERE a.estado = 'finalizada'";
    const params = [];
    const yearsParams = [];
    let index = 1;
    let yearsIndex = 1;

    if (!esAdmin) {
      where += ` AND a.usuario_id = $${index}`;
      params.push(req.user.id);
      index++;

      yearsWhere += ` AND a.usuario_id = $${yearsIndex}`;
      yearsParams.push(req.user.id);
      yearsIndex++;
    }

    if (empresa_id) {
      where += ` AND a.empresa_id = $${index}`;
      params.push(empresa_id);
      index++;

      yearsWhere += ` AND a.empresa_id = $${yearsIndex}`;
      yearsParams.push(empresa_id);
      yearsIndex++;
    }

    if (anio) {
      where += ` AND EXTRACT(YEAR FROM COALESCE(a.fecha::date, a.fecha_creacion::date))::int = $${index}`;
      params.push(Number(anio));
      index++;
    }

    const reportesResult = await pool.query(
      `
      WITH reclamo_penalizaciones AS (
        SELECT
          auditoria_id,
          SUM(COALESCE(descuento_puntaje, 0))::numeric AS descuento_reclamos,
          COUNT(*)::int AS cantidad_reclamos
        FROM reclamos
        WHERE auditoria_id IS NOT NULL
        GROUP BY auditoria_id
      ),
      auditoria_base AS (
        SELECT
          a.id,
          a.empresa_id,
          e.nombre AS empresa_nombre,
          EXTRACT(YEAR FROM COALESCE(a.fecha::date, a.fecha_creacion::date))::int AS anio,
          EXTRACT(MONTH FROM COALESCE(a.fecha::date, a.fecha_creacion::date))::int AS mes,
          SUM(COALESCE(r.puntuacion, 0))::numeric AS puntaje_obtenido,
          SUM(CASE WHEN r.id IS NULL OR r.no_verificable THEN 0 ELSE COALESCE(c.puntaje_maximo, 2) END)::numeric AS puntaje_maximo,
          BOOL_OR(
            LOWER(p.nombre) LIKE '%trazabilidad%' AND
            (LOWER(p.nombre) LIKE '%buenas pr_cticas%' OR LOWER(p.nombre) LIKE '%pcc%')
          ) AS es_bpm_ponderada,
          SUM(CASE WHEN c.orden IN (3,18,19,20,21,22,23,32,33,34,35,36,37,38,39,40,41,42,43,66,67,68) THEN COALESCE(r.puntuacion, 0) ELSE 0 END)::numeric AS bpm_grupo_20,
          SUM(CASE WHEN c.orden IN (1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,24,25,26,27,28,29,30,31,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60) THEN COALESCE(r.puntuacion, 0) ELSE 0 END)::numeric AS bpm_grupo_35,
          SUM(CASE WHEN c.orden IN (61,62,63,64,65,69,70,71,72) THEN COALESCE(r.puntuacion, 0) ELSE 0 END)::numeric AS bpm_grupo_45,
          COALESCE(rp.descuento_reclamos, 0)::numeric AS descuento_reclamos,
          COALESCE(rp.cantidad_reclamos, 0)::int AS cantidad_reclamos
        FROM auditorias a
        JOIN empresas e ON a.empresa_id = e.id
        JOIN plantillas p ON p.id = a.plantilla_id
        LEFT JOIN respuestas r ON r.auditoria_id = a.id
        LEFT JOIN criterios c ON r.criterio_id = c.id
        LEFT JOIN reclamo_penalizaciones rp ON rp.auditoria_id = a.id
        ${where}
        GROUP BY
          a.id,
          a.empresa_id,
          e.nombre,
          COALESCE(a.fecha::date, a.fecha_creacion::date),
          rp.descuento_reclamos,
          rp.cantidad_reclamos
      ),
      auditoria_porcentajes AS (
        SELECT
          id,
          empresa_id,
          empresa_nombre,
          anio,
          mes,
          descuento_reclamos,
          cantidad_reclamos,
          CASE
            WHEN es_bpm_ponderada THEN ROUND(
              (bpm_grupo_20 / 66) * 20 +
              (bpm_grupo_35 / 123) * 35 +
              (bpm_grupo_45 / 27) * 45,
              2
            )
            ELSE ROUND((puntaje_obtenido / puntaje_maximo) * 100, 2)
          END AS porcentaje_base
        FROM auditoria_base
        WHERE puntaje_maximo > 0
      ),
      auditoria_scores AS (
        SELECT
          *,
          GREATEST(
            0,
            ROUND(porcentaje_base - descuento_reclamos, 2)
          ) AS porcentaje
        FROM auditoria_porcentajes
      )
      SELECT
        empresa_id,
        empresa_nombre,
        anio,
        mes,
        COUNT(*)::int AS cantidad_auditorias,
        ROUND(AVG(porcentaje), 2) AS promedio,
        ROUND(AVG(porcentaje_base), 2) AS promedio_base,
        COALESCE(ROUND(SUM(descuento_reclamos), 2), 0) AS descuento_reclamos_total,
        COALESCE(SUM(cantidad_reclamos), 0)::int AS cantidad_reclamos
      FROM auditoria_scores
      GROUP BY empresa_id, empresa_nombre, anio, mes
      ORDER BY anio ASC, mes ASC, empresa_nombre ASC
      `,
      params
    );

    const aniosResult = await pool.query(
      `
      SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(a.fecha::date, a.fecha_creacion::date))::int AS anio
      FROM auditorias a
      ${yearsWhere}
      ORDER BY anio DESC
      `,
      yearsParams
    );

    res.json({
      anios: aniosResult.rows.map((row) => row.anio),
      reportes: reportesResult.rows,
    });
  } catch (error) {
    console.error("Error al obtener reportes de auditorías:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};

const crearAuditoriaConArchivo = async (req, res) => {
  try {
    const { plantilla_id, empresa_id, lugar, observaciones } = req.body;
    const usuario_id = req.user.id;

    if (!plantilla_id || !empresa_id) {
      return res.status(400).json({
        message: "Plantilla y empresa son obligatorias.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Debe adjuntar un archivo.",
      });
    }

    const auditoriaResult = await pool.query(
      `INSERT INTO auditorias
       (plantilla_id, empresa_id, usuario_id, lugar, observacion_general, estado)
       VALUES ($1, $2, $3, $4, $5, 'finalizada')
       RETURNING *`,
      [
        plantilla_id,
        empresa_id,
        usuario_id,
        lugar || null,
        observaciones || null,
      ]
    );

    const auditoria = auditoriaResult.rows[0];

    await pool.query(
      `INSERT INTO auditoria_archivos
       (auditoria_id, nombre_original, nombre_guardado, ruta_archivo, tipo_mime, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        auditoria.id,
        req.file.originalname,
        req.file.filename,
        req.file.path,
        req.file.mimetype,
        observaciones || null,
      ]
    );

    res.status(201).json({
      message: "Documento cargado correctamente.",
      auditoria,
    });
  } catch (error) {
    console.error("Error al crear auditoría con archivo:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
    });
  }
};

const descargarAuditoriaPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const auditoriaResult = await pool.query(
      `
      SELECT 
        a.*,
        p.nombre AS plantilla_nombre,
        COALESCE(e.nombre, 'Empresa no disponible') AS empresa_nombre,
        COALESCE(NULLIF(TRIM(CONCAT(u.nombre, ' ', u.apellido)), ''), 'Usuario no disponible') AS auditor_nombre
      FROM auditorias a
      JOIN plantillas p ON a.plantilla_id = p.id
      LEFT JOIN empresas e ON a.empresa_id = e.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = $1
      `,
      [id]
    );

    if (auditoriaResult.rows.length === 0) {
      return res.status(404).json({
        message: "Auditoría no encontrada.",
      });
    }

    const auditoria = auditoriaResult.rows[0];

    const respuestasResult = await pool.query(
      `
      SELECT 
        r.*,
        c.texto,
        c.seccion,
        c.numero,
        c.puntaje_maximo,
        c.orden
      FROM respuestas r
      JOIN criterios c ON r.criterio_id = c.id
      WHERE r.auditoria_id = $1
      ORDER BY c.orden ASC
      `,
      [id]
    );

    const respuestas = respuestasResult.rows;
    const reclamos = await obtenerReclamosPorAuditoria(id);
    const descuentoReclamos = reclamos.reduce(
      (acc, reclamo) => acc + (Number(reclamo.descuento_puntaje) || 0),
      0
    );
    const puntaje = calcularPuntajeAuditoria(
      respuestas,
      descuentoReclamos,
      auditoria.plantilla_nombre
    );

    const doc = new PDFDocument({ margin: 50 });

    const filename = `auditoria-${id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    doc
      .fontSize(20)
      .text("Reporte de Auditoría", { align: "center" });

    doc.moveDown();

    doc.fontSize(14).text(auditoria.plantilla_nombre, {
      align: "center",
    });

    doc.moveDown(2);

    doc.fontSize(12);

    doc.text(`Empresa: ${auditoria.empresa_nombre}`);
    doc.text(`Auditor: ${auditoria.auditor_nombre}`);
    doc.text(
      `Fecha: ${formatearFecha(auditoria.fecha)}`
    );
    doc.text(`Lugar: ${auditoria.lugar || "-"}`);
    doc.text(`Estado: ${auditoria.estado}`);
    doc.text(`Resultado base: ${puntaje.porcentajeBase}%`);
    doc.text(`Descuento reclamos/informes: -${puntaje.descuentoReclamos} pts`);
    doc.text(`Resultado final: ${puntaje.porcentajeFinal}%`);

    if (auditoria.observacion_general) {
      doc.moveDown();
      doc.text(`Observación general: ${auditoria.observacion_general}`);
    }

    doc.moveDown(2);

    doc.fontSize(16).text("Detalle de respuestas");
    doc.moveDown();

    respuestas.forEach((r, index) => {
      doc.fontSize(12).text(`${index + 1}. ${r.texto}`, {
        bold: true,
      });

      doc.fontSize(10).text(`Sección: ${r.seccion || "-"}`);
      doc.text(
        `Puntuación: ${
          r.no_verificable ? "No verificable" : r.puntuacion
        }`
      );
      doc.text(
        `Observación: ${r.observacion || "Sin observaciones"}`
      );

      doc.moveDown();

      if (doc.y > 700) {
        doc.addPage();
      }
    });

    if (reclamos.length > 0) {
      doc.addPage();
      doc.fontSize(16).text("Reclamos / informes vinculados");
      doc.moveDown();

      reclamos.forEach((reclamo, index) => {
        doc.fontSize(12).text(`${index + 1}. ${reclamo.titulo}`);
        doc.fontSize(10).text(`Gravedad: ${reclamo.gravedad || "-"}`);
        doc.text(`Estado: ${reclamo.estado || "-"}`);
        doc.text(`Descuento: -${Number(reclamo.descuento_puntaje) || 0} pts`);
        doc.text(`Descripcion: ${reclamo.descripcion || "-"}`);
        doc.moveDown();

        if (doc.y > 700) {
          doc.addPage();
        }
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    res.status(500).json({
      message: "Error interno al generar PDF.",
    });
  }
};

const descargarAuditoriaDOCX = async (req, res) => {
  try {
    const { id } = req.params;

    const auditoriaResult = await pool.query(
      `
      SELECT
        a.*,
        p.nombre AS plantilla_nombre,
        COALESCE(e.nombre, 'Empresa no disponible') AS empresa_nombre,
        COALESCE(NULLIF(TRIM(CONCAT(u.nombre, ' ', u.apellido)), ''), 'Usuario no disponible') AS auditor_nombre
      FROM auditorias a
      JOIN plantillas p ON a.plantilla_id = p.id
      LEFT JOIN empresas e ON a.empresa_id = e.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.id = $1
      `,
      [id]
    );

    if (auditoriaResult.rows.length === 0) {
      return res.status(404).json({
        message: "AuditorÃ­a no encontrada.",
      });
    }

    const auditoria = auditoriaResult.rows[0];

    const respuestasResult = await pool.query(
      `
      SELECT
        r.*,
        c.texto,
        c.seccion,
        c.numero,
        c.puntaje_maximo,
        c.orden
      FROM respuestas r
      JOIN criterios c ON r.criterio_id = c.id
      WHERE r.auditoria_id = $1
      ORDER BY c.orden ASC
      `,
      [id]
    );

    const respuestas = respuestasResult.rows;
    const reclamos = await obtenerReclamosPorAuditoria(id);
    const descuentoReclamos = reclamos.reduce(
      (acc, reclamo) => acc + (Number(reclamo.descuento_puntaje) || 0),
      0
    );
    const puntaje = calcularPuntajeAuditoria(
      respuestas,
      descuentoReclamos,
      auditoria.plantilla_nombre
    );
    const docx = crearDocxAuditoria({
      auditoria,
      respuestas,
      reclamos,
      puntaje,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="auditoria-${id}.docx"`
    );
    res.setHeader("Content-Length", docx.length);
    res.setHeader("Cache-Control", "no-store");
    res.send(docx);
  } catch (error) {
    console.error("Error al generar DOCX:", error);
    res.status(500).json({
      message: "Error interno al generar DOCX.",
    });
  }
};

module.exports = {
  calcularEvaluacionServicioV10,
  calcularPuntajeAuditoria,
  listarPlantillas,
  obtenerCriteriosPorPlantilla,
  crearAuditoria,
  guardarRespuestas,
  obtenerAuditoriaCompleta,
  obtenerMisAuditorias,
  obtenerTodasAuditorias,
  obtenerReportesAuditorias,
  crearAuditoriaConArchivo,
  descargarAuditoriaPDF,
  descargarAuditoriaDOCX
};

