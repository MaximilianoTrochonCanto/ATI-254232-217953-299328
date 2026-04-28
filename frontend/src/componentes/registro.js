import { useEffect, useState } from "react";



export default function Register({ onSwitch }) {
  const [passwordStrength, setPasswordStrength] = useState("");
  const [emailValido, setEmailValido] = useState(null);
    const [mostrarValidacionEmail, setMostrarValidacionEmail] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    confirmPassword: "",
    titulo_trabajo: "",
    empresa_id: "",
  });

  const [empresas, setEmpresas] = useState([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const limpiarMensajes = () => {
  setError("");
  setMensaje("");
};
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/empresas/publicas");
        const data = await res.json();

        if (res.ok) {
          setEmpresas(data);
        } else {
          setError(data.message || "No se pudieron cargar las empresas.");
        }
      } catch (error) {
        setError("Error al conectar con el servidor.");
      }
    };

    cargarEmpresas();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const nuevoForm = {
      ...form,
      [name]: value,
    };

    setForm(nuevoForm);

   limpiarMensajes();

    // EMAIL
    if (name === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      setEmailValido(emailRegex.test(value));
    }

    // PASSWORD FUERZA
    if (name === "password") {
      evaluarPassword(value);

      if (nuevoForm.confirmPassword) {
        setPasswordMatch(value === nuevoForm.confirmPassword);
      }
    }

    // CONFIRM PASSWORD
    if (name === "confirmPassword") {
      setPasswordMatch(value === nuevoForm.password);
    }
  };

  const evaluarPassword = (password) => {
    let score = 0;

    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&._\-#]/.test(password)) score++;

    if (score <= 2) {
      setPasswordStrength("Débil");
    } else if (score <= 4) {
      setPasswordStrength("Media");
    } else {
      setPasswordStrength("Fuerte");
    }
  };

  const validarFrontend = () => {
    if (
      !form.nombre ||
      !form.apellido ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.titulo_trabajo ||
      !form.empresa_id
    ) {
      return "Todos los campos son obligatorios.";
    }

    if (form.password !== form.confirmPassword) {
      return "Las contraseñas no coinciden.";
    }

    if (form.password.length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/;

    if (!passwordRegex.test(form.password)) {
      return "La contraseña debe incluir mayúscula, minúscula y número.";
    }

    return "";
  };

  const handleRegister = async () => {
   limpiarMensajes();

    const validationError = validarFrontend();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          empresa_id: Number(form.empresa_id),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje(data.message);
        setForm({
          nombre: "",
          apellido: "",
          email: "",
          password: "",
          confirmPassword: "",
          titulo_trabajo: "",
          empresa_id: "",
        });
      } else {
        setError(data.message || "No se pudo registrar la solicitud.");
      }
    } catch (error) {
      setError("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Solicitud de registro</h2>
      <p>Complete sus datos para solicitar acceso al sistema.</p>

      <input
        name="nombre"
        placeholder="Nombre"
        value={form.nombre}
        onChange={handleChange}
      />

      <input
        name="apellido"
        placeholder="Apellido"
        value={form.apellido}
        onChange={handleChange}
      />

      <input
  name="email"
  placeholder="Correo electrónico"
  value={form.email}
  onChange={(e) => {
    handleChange(e);
    setMostrarValidacionEmail(true);
  }}
  onBlur={() => setMostrarValidacionEmail(false)}
/>

      {form.email && mostrarValidacionEmail &&  (
        <p className={emailValido ? "success-message"  : "error-message"}>
          {emailValido ? "Email válido" : "Formato de email inválido"}          
        </p>
      )}

      <input
        name="titulo_trabajo"
        placeholder="Título o cargo laboral"
        value={form.titulo_trabajo}
        onChange={handleChange}
      />

      <select name="empresa_id" value={form.empresa_id} onChange={handleChange}>
        <option value="">Seleccione una empresa</option>
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nombre}
          </option>
        ))}
      </select>

      <input
        name="password"
        type="password"
        placeholder="Contraseña"
        value={form.password}
        onChange={handleChange}
      />

      {form.password && (
        <p
          className={
            passwordStrength === "Fuerte"
              ? "success-message"
              : passwordStrength === "Media"
                ? "warning-message"
                : "error-message"
          }
        >
          Seguridad: {passwordStrength}
        </p>
      )}

      <input
        name="confirmPassword"
        type="password"
        placeholder="Repetir contraseña"
        value={form.confirmPassword}
        onChange={handleChange}
      />

      {form.confirmPassword && (
        <p className={passwordMatch ? "success-message" : "error-message"}>
          {passwordMatch
            ? "Las contraseñas coinciden"
            : "Las contraseñas no coinciden"}
        </p>
      )}

      {error && <p className="error-message">{error}</p>}
      {mensaje && <p className="success-message">{mensaje}</p>}

      <button onClick={handleRegister} disabled={loading}>
        {loading ? "Enviando..." : "Enviar solicitud"}
      </button>

      <div className="switch" onClick={onSwitch}>
        Ya tengo cuenta
      </div>
    </div>
  );
}
