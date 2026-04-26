const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");
const pool = require("../config/bd");

router.get("/pendientes", verifyToken, authorizeRoles("admin"), async (req,res)=>{
  const result = await pool.query(
    "SELECT id,nombre,email,rol,estado FROM usuarios WHERE estado='pendiente'"
  );

  res.json(result.rows);
});

router.put("/aprobar/:id", verifyToken, authorizeRoles("admin"), async (req,res)=>{
  const { id } = req.params;

  await pool.query(
    `UPDATE usuarios
     SET estado='aprobado', activo=true
     WHERE id=$1`,
    [id]
  );

  res.json({ message: "Usuario aprobado" });
});

router.put("/rechazar/:id", verifyToken, authorizeRoles("admin"), async (req,res)=>{
  const { id } = req.params;

  await pool.query(
    `UPDATE usuarios
     SET estado='rechazado', activo=false
     WHERE id=$1`,
    [id]
  );

  res.json({ message: "Usuario rechazado" });
});

module.exports = router;