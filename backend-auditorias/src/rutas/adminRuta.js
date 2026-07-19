const express = require("express");
const router = express.Router();

const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");
const pool = require("../config/bd");

router.get("/pendientes", verifyToken, authorizeRoles("admin"), async (req,res)=>{
  const result = await pool.query(
    `SELECT
  u.id,
  u.nombre,
  u.apellido,
  u.email,
  u.titulo_trabajo,
  u.empresa_id,
  e.nombre AS empresa_nombre
FROM usuarios u
LEFT JOIN empresas e
  ON u.empresa_id = e.id
WHERE u.estado = 'pendiente'
ORDER BY u.id DESC`
  );

  res.json(result.rows);
});

router.get("/usuarios", verifyToken, authorizeRoles("admin"), async (req, res) => {
  const result = await pool.query(
    `SELECT
      u.id,
      u.nombre,
      u.apellido,
      u.email,
      u.rol,
      u.activo,
      u.estado,
      u.titulo_trabajo,
      u.empresa_id,
      e.nombre AS empresa_nombre
    FROM usuarios u
    LEFT JOIN empresas e
      ON u.empresa_id = e.id
    WHERE u.estado = 'aprobado'
      AND u.activo = true
      AND u.rol <> 'admin'
    ORDER BY u.id DESC`
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

router.put("/desactivar/:id", verifyToken, authorizeRoles("admin"), async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `UPDATE usuarios
     SET activo = false
     WHERE id = $1
       AND rol <> 'admin'
     RETURNING id`,
    [id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ message: "Usuario no encontrado o no desactivable" });
  }

  res.json({ message: "Usuario desactivado" });
});

module.exports = router;
