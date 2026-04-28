const express = require("express");
const router = express.Router();
const pool = require("../config/bd");
const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");
const {
  crearEmpresa,
  listarEmpresas,
  obtenerEmpresaPorId,
  actualizarEmpresa,
  desactivarEmpresa
} = require("../controladores/empresaControlador");

router.get("/publicas", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nombre FROM empresas WHERE activo = true ORDER BY nombre ASC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar empresas públicas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});


router.post("/", verifyToken, authorizeRoles("admin"), crearEmpresa);
router.get("/", verifyToken, listarEmpresas);
router.get("/:id", verifyToken, obtenerEmpresaPorId);
router.put("/:id", verifyToken, authorizeRoles("admin"), actualizarEmpresa);
router.delete("/:id", verifyToken, authorizeRoles("admin"), desactivarEmpresa);


module.exports = router;