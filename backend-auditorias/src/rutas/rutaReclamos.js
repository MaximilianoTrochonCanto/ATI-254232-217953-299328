const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/bd");
const verifyToken = require("../middlewares/autMiddleware");

const router = express.Router();
const reclamosUploadPath = path.join("uploads", "reclamos");
const reclamosUploadDir = path.resolve(process.cwd(), reclamosUploadPath);
const descuentosPorGravedad = {
  reclamo: 2,
  informe_observacion: 8,
  informe_no_conformidad: 15,
  baja: 2,
  media: 5,
  alta: 10,
  critica: 20,
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdir(reclamosUploadDir, { recursive: true }, (error) => {
      cb(error, reclamosUploadPath);
    });
  },
  filename: (req, file, cb) => {
    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`);
  },
});

const upload = multer({
  storage,
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const esAdmin = req.user.rol === "admin";
    const params = [];

    let where = "WHERE 1 = 1";

    if (!esAdmin) {
      where += ` AND a.usuario_id = $1`;
      params.push(req.user.id);
    }

    const result = await pool.query(
      `SELECT
        r.*,
        e.nombre AS empresa_nombre,
        a.fecha AS auditoria_fecha,
        p.nombre AS plantilla_nombre,
        CONCAT(u.nombre, ' ', u.apellido) AS auditor_nombre
      FROM reclamos r
      JOIN empresas e ON r.empresa_id = e.id
      LEFT JOIN auditorias a ON r.auditoria_id = a.id
      LEFT JOIN plantillas p ON a.plantilla_id = p.id
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ${where}
      ORDER BY r.fecha_creacion DESC, r.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar reclamos:", error);
    res.status(500).json({
      message: "Error al listar reclamos.",
    });
  }
});

router.get("/:id/adjunto", verifyToken, async (req, res) => {
  try {
    const esAdmin = req.user.rol === "admin";
    const result = await pool.query(
      `SELECT
        r.archivo_url,
        a.usuario_id
      FROM reclamos r
      LEFT JOIN auditorias a ON r.auditoria_id = a.id
      WHERE r.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Reclamo no encontrado." });
    }

    const reclamo = result.rows[0];

    if (!esAdmin && Number(reclamo.usuario_id) !== Number(req.user.id)) {
      return res.status(403).json({ message: "No autorizado." });
    }

    if (!reclamo.archivo_url) {
      return res.status(404).json({ message: "El reclamo no tiene adjunto." });
    }

    const uploadsRoot = path.resolve(process.cwd(), "uploads");
    const filePath = path.resolve(process.cwd(), reclamo.archivo_url);

    if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Adjunto no encontrado." });
    }

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(filePath)}"`
    );
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error al obtener adjunto de reclamo:", error);
    res.status(500).json({
      message: "Error al obtener adjunto.",
    });
  }
});

router.post("/", verifyToken, upload.single("archivo"), async (req, res) => {
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

    const descuento_puntaje = descuentosPorGravedad[gravedad] || 0;
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
      message: "Reclamo / informe registrado correctamente.",
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
