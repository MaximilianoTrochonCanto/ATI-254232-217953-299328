const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");

const {
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
} = require("../controladores/auditoriaControlador");

const upload = require("../middlewares/uploadMiddleware");

router.post(
  "/archivo",
  verifyToken,
  upload.single("archivo"),
  crearAuditoriaConArchivo
);


router.get("/plantillas", verifyToken, listarPlantillas);
router.get("/plantillas/:id/criterios", verifyToken, obtenerCriteriosPorPlantilla);

router.get("/mias", verifyToken, obtenerMisAuditorias);
router.get("/todas", verifyToken, authorizeRoles("admin"), obtenerTodasAuditorias);
router.get("/reportes", verifyToken, obtenerReportesAuditorias);

router.post("/", verifyToken, crearAuditoria);
router.post("/:id/respuestas", verifyToken, guardarRespuestas);

// Esta siempre al final
router.get("/:id/pdf", verifyToken, descargarAuditoriaPDF);
router.get("/:id/docx", verifyToken, descargarAuditoriaDOCX);
router.get("/:id", verifyToken, obtenerAuditoriaCompleta);


module.exports = router;
