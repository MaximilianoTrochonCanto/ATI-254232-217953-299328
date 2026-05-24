const pool = require("../config/bd");

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
      `SELECT r.*, c.texto, c.seccion, c.numero
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

module.exports = {
  listarPlantillas,
  obtenerCriteriosPorPlantilla,
  crearAuditoria,
  guardarRespuestas,
  obtenerAuditoriaCompleta,
};