const express = require("express");
const { register, login } = require("../controladores/autControlador");
const verifyToken = require("../middlewares/autMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/profile", verifyToken, (req, res) => {
  res.json({
    message: "Ruta protegida",
    user: req.user,
  });
});

module.exports = router;