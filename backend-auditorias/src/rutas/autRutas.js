const express = require("express");
const { register, login} = require("../controladores/autControlador");
const verifyToken = require("../middlewares/autMiddleware");
const authorizeRoles = require("../middlewares/rolMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);


router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Ruta protegida",
    user: req.user,
  });
});

router.get("/solo-admin", verifyToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Acceso concedido a admin" });
});

router.post("/logout", verifyToken, (req, res) => {
  res.json({
    message: "Sesión cerrada.",
  });
});

module.exports = router;