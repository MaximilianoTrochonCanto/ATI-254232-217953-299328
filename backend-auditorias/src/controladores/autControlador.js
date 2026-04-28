const pool = require("../config/bd");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Registro
const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      password,
      confirmPassword,
      titulo_trabajo,
      empresa_id,
    } = req.body;

    if (!nombre || !apellido || !email || !password || !confirmPassword || !titulo_trabajo || !empresa_id) {
      return res.status(400).json({
        message: "Todos los campos son obligatorios.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: "El email ingresado no tiene un formato válido.",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Las contraseñas no coinciden.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 8 caracteres.",
      });
    }

    const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._\-#])[A-Za-z\d@$!%*?&._\-#]+$/;

if (!strongPasswordRegex.test(password)) {
  return res.status(400).json({
    message:
      "La contraseña debe incluir mayúscula, minúscula, número y carácter especial."
  });
}

    const empresaExiste = await pool.query(
      "SELECT id FROM empresas WHERE id = $1 AND activo = true",
      [empresa_id]
    );

    if (empresaExiste.rows.length === 0) {
      return res.status(400).json({
        message: "La empresa seleccionada no existe o no está activa.",
      });
    }

    const userExists = await pool.query(
      "SELECT id, estado FROM usuarios WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      const estado = userExists.rows[0].estado;

      if (estado === "pendiente") {
        return res.status(409).json({
          message: "Ya existe una solicitud pendiente para este email.",
        });
      }

      if (estado === "aprobado") {
        return res.status(409).json({
          message: "Ya existe una cuenta aprobada con este email.",
        });
      }

      if (estado === "rechazado") {
        return res.status(409).json({
          message: "Ya existe una solicitud rechazada con este email. Contacte al administrador.",
        });
      }

      return res.status(409).json({
        message: "El email ya está registrado.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      `INSERT INTO usuarios
      (nombre, apellido, email, password, rol, activo, estado, titulo_trabajo, empresa_id)
      VALUES ($1, $2, $3, $4, 'auditor', false, 'pendiente', $5, $6)
      RETURNING id, nombre, apellido, email, rol, activo, estado, titulo_trabajo, empresa_id`,
      [nombre, apellido, email, hashedPassword, titulo_trabajo, empresa_id]
    );

    res.status(201).json({
      message: "Solicitud enviada correctamente. Aguarde aprobación del administrador.",
      user: newUser.rows[0],
    });
  } catch (error) {
    console.error("Error en register:", error);
    res.status(500).json({
      message: "Error interno del servidor.",
    });
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