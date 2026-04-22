const pool = require("../config/bd");

const crearEmpresa = async (req, res) => {
  try {
    console.log(req.body)
    const { nombre, direccion } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: "El nombre es obligatorio" });
    }

    const existe = await pool.query(
      "SELECT * FROM empresas WHERE nombre = $1",
      [nombre]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ message: "La empresa ya existe" });
    }

    const result = await pool.query(
      `INSERT INTO empresas (nombre, direccion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, direccion || null]
    );

    res.status(201).json({
      message: "Empresa creada correctamente",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al crear empresa:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const listarEmpresas = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM empresas WHERE activo = true ORDER BY id ASC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error al listar empresas:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const obtenerEmpresaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM empresas WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener empresa:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const actualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion } = req.body;

    const result = await pool.query(
      `UPDATE empresas
       SET nombre = $1, direccion = $2
       WHERE id = $3
       RETURNING *`,
      [nombre, direccion || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    res.json({
      message: "Empresa actualizada correctamente",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar empresa:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

const desactivarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE empresas
       SET activo = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    res.json({
      message: "Empresa desactivada correctamente",
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error("Error al desactivar empresa:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

module.exports = {
  crearEmpresa,
  listarEmpresas,
  obtenerEmpresaPorId,
  actualizarEmpresa,
  desactivarEmpresa,
};