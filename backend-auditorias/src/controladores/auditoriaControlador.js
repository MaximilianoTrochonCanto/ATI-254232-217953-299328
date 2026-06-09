const pool = require("../config/bd");
const PDFDocument = require("pdfkit");

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

    const result = await pool.query(
      `SELECT * FROM criterios
       WHERE plantilla_id = $1
       ORDER BY orden ASC`,
      [id]
    );

    res.json(result.rows);
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

    for (const r of respuestas) {
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

    res.json({ message: "Respuestas guardadas correctamente." });
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

    const respuestas = await pool.query(
      `SELECT r.*, c.texto, c.seccion, c.numero, c.puntaje_maximo
       FROM respuestas r
       JOIN criterios c ON r.criterio_id = c.id
       WHERE r.auditoria_id = $1
       ORDER BY c.orden ASC`,
      [id]
    );

    res.json({
      auditoria: auditoria.rows[0],
      respuestas: respuestas.rows,
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
        e.nombre AS empresa_nombre,
        CONCAT(u.nombre, ' ', u.apellido) AS auditor_nombre
      FROM auditorias a
      JOIN plantillas p ON a.plantilla_id = p.id
      JOIN empresas e ON a.empresa_id = e.id
      JOIN usuarios u ON a.usuario_id = u.id
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
        c.puntaje_maximo
      FROM respuestas r
      JOIN criterios c ON r.criterio_id = c.id
      WHERE r.auditoria_id = $1
      ORDER BY c.orden ASC
      `,
      [id]
    );

    const respuestas = respuestasResult.rows;

    const puntajeObtenido = respuestas.reduce(
      (acc, r) => acc + (r.puntuacion || 0),
      0
    );

    const puntajeMaximo = respuestas.reduce((acc, r) => {
      if (r.no_verificable) return acc;
      return acc + (r.puntaje_maximo || 2);
    }, 0);

    const porcentaje =
      puntajeMaximo > 0
        ? Math.round((puntajeObtenido / puntajeMaximo) * 100)
        : 0;

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
      `Fecha: ${new Date(auditoria.fecha).toLocaleDateString()}`
    );
    doc.text(`Lugar: ${auditoria.lugar || "-"}`);
    doc.text(`Estado: ${auditoria.estado}`);
    doc.text(`Resultado: ${porcentaje}%`);

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

    doc.end();
  } catch (error) {
    console.error("Error al generar PDF:", error);
    res.status(500).json({
      message: "Error interno al generar PDF.",
    });
  }
};

module.exports = {
  listarPlantillas,
  obtenerCriteriosPorPlantilla,
  crearAuditoria,
  guardarRespuestas,
  obtenerAuditoriaCompleta,
  obtenerMisAuditorias,
  obtenerTodasAuditorias,
  crearAuditoriaConArchivo,
  descargarAuditoriaPDF
};

