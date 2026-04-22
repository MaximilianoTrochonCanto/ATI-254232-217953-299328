const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");
const {
  crearEmpresa,
  listarEmpresas,
  obtenerEmpresaPorId,
  actualizarEmpresa,
  desactivarEmpresa
} = require("../controladores/empresaControlador");

router.post("/", verifyToken, authorizeRoles("admin"), crearEmpresa);
router.get("/", verifyToken, listarEmpresas);
router.get("/:id", verifyToken, obtenerEmpresaPorId);
router.put("/:id", verifyToken, authorizeRoles("admin"), actualizarEmpresa);
router.delete("/:id", verifyToken, authorizeRoles("admin"), desactivarEmpresa);

module.exports = router;