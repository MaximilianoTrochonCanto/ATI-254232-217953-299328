const pool = require("../config/bd");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Registro
const register = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: "Nombre, email y password son obligatorios" });
    }

    const rolesValidos = ["admin", "auditor"];

    if (rol && !rolesValidos.includes(rol)) {
      return res.status(400).json({
      message: "Rol inválido. Solo se permite admin o auditor",
    });
}

    const userExists = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(409).json({ message: "El email ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO usuarios
      (nombre, email, password, rol, activo, estado)
      VALUES ($1,$2,$3,$4,false,'pendiente')
       RETURNING id, nombre, email, rol, activo`,
      [nombre, email, hashedPassword, rol || "auditor"]
    );

    res.status(201).json({
      message: "Solicitud enviada correctamente. Aguarde aprobación del administrador.",
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y password son obligatorios",
      });
    }

    // Buscar usuario SOLO por email
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    const user = result.rows[0];

    // Validar password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Credenciales inválidas",
      });
    }

    // Validar estado
    if (user.estado === "pendiente") {
      return res.status(403).json({
        message:
          "Su cuenta se encuentra pendiente de aprobación por un administrador.",
      });
    }

    if (user.estado === "rechazado") {
      return res.status(403).json({
        message:
          "Su solicitud fue rechazada. Contacte al administrador.",
      });
    }

    if (!user.activo) {
      return res.status(403).json({
        message: "Cuenta deshabilitada.",
      });
    }

    // Token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        rol: user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login exitoso",
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({
      message: "Error interno del servidor",
    });
  }
};

module.exports = {
  register,
  login,
  };