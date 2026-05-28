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
} = require("../controladores/auditoriaControlador");

router.get("/plantillas", verifyToken, listarPlantillas);
router.get("/plantillas/:id/criterios", verifyToken, obtenerCriteriosPorPlantilla);

router.get("/mias", verifyToken, obtenerMisAuditorias);
router.get("/todas", verifyToken, authorizeRoles("admin"), obtenerTodasAuditorias);

router.post("/", verifyToken, crearAuditoria);
router.post("/:id/respuestas", verifyToken, guardarRespuestas);

// Esta siempre al final
router.get("/:id", verifyToken, obtenerAuditoriaCompleta);

module.exports = router;