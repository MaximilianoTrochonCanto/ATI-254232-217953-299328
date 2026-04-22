require("dotenv").config();

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.rol) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ message: "No autorizado" });
    }

    next();
  };
};

module.exports = authorizeRoles;