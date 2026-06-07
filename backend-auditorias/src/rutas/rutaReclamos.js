const express = require("express");
const multer = require("multer");
const pool = require("../config/bd");

const router = express.Router();

const upload = multer({
  dest: "uploads/reclamos/",
});

router.post("/", upload.single("archivo"), async (req, res) => {
  try {
    const {
      empresa_id,
      auditoria_id,
      servicio,
      titulo,
      descripcion,
      gravedad,
      observaciones,
    } = req.body;

    if (!empresa_id || !servicio || !titulo || !descripcion) {
      return res.status(400).json({
        message: "Faltan campos obligatorios.",
      });
    }

    const descuentos = {
      baja: 2,
      media: 5,
      alta: 10,
      critica: 20,
    };

    const descuento_puntaje = descuentos[gravedad] || 0;
    const archivo_url = req.file ? req.file.path : null;

    const resultado = await pool.query(
      `INSERT INTO reclamos
      (
        empresa_id,
        auditoria_id,
        servicio,
        titulo,
        descripcion,
        gravedad,
        estado,
        observaciones,
        archivo_url,
        descuento_puntaje
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        empresa_id,
        auditoria_id || null,
        servicio,
        titulo,
        descripcion,
        gravedad,
        "pendiente",
        observaciones || "",
        archivo_url,
        descuento_puntaje,
      ]
    );

    res.status(201).json({
      message: "Reclamo registrado correctamente.",
      reclamo: resultado.rows[0],
    });
  } catch (error) {
    console.error("Error al registrar reclamo:", error);

    res.status(500).json({
      message: "Error al registrar reclamo.",
    });
  }
});

module.exports = router;