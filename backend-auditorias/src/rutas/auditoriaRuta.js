const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/autMiddleware");
const {
  listarPlantillas,
  obtenerCriteriosPorPlantilla,
  crearAuditoria,
  guardarRespuestas,
  obtenerAuditoriaCompleta
} = require("../controladores/auditoriaControlador");

router.get("/plantillas", verifyToken, listarPlantillas);
router.get("/plantillas/:id/criterios", verifyToken, obtenerCriteriosPorPlantilla);
router.post("/", verifyToken, crearAuditoria);
router.post("/:id/respuestas", verifyToken, guardarRespuestas);
router.get("/:id", verifyToken, obtenerAuditoriaCompleta);

module.exports = router;