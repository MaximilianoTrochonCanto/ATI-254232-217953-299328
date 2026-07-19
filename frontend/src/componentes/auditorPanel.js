import { useState } from "react";
import ListaAuditorias from "./listaAuditorias";
import NuevaAuditoria from "./nuevaAuditoria";
import ReclamoInforme from "./reclamoInforme";
import ReportesAuditorias from "./reportesAuditorias";

export default function AuditorPanel({ logout }) {
  const [seccion, setSeccion] = useState("mis-auditorias");
  const [menuOpen, setMenuOpen] = useState(false);

  const cambiarSeccion = (nuevaSeccion) => {
    setSeccion(nuevaSeccion);
    setMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        ☰
      </button>

      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
        ></div>
      )}

      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <h2>Panel Auditor</h2>

        <button
          className={seccion === "mis-auditorias" ? "active" : ""}
          onClick={() => cambiarSeccion("mis-auditorias")}
        >
          Mis auditorías
        </button>

        <button
          className={seccion === "nueva" ? "active" : ""}
          onClick={() => cambiarSeccion("nueva")}
        >
          Nueva auditoría/evaluación
        </button>

        <button
          className={seccion === "reclamos" ? "active" : ""}
          onClick={() => cambiarSeccion("reclamos")}
        >
          Reclamos / Informes
        </button>

        <button
          className={seccion === "reportes" ? "active" : ""}
          onClick={() => cambiarSeccion("reportes")}
        >
          Reportes
        </button>

        <button className="logout-button" onClick={logout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="admin-content">
        {seccion === "mis-auditorias" && (
          <ListaAuditorias modo="auditor" logout={logout} />
        )}

        {seccion === "nueva" && <NuevaAuditoria />}

        {seccion === "reclamos" && <ReclamoInforme modo="auditor" logout={logout} />}

        {seccion === "reportes" && (
          <ReportesAuditorias modo="auditor" logout={logout} />
        )}
      </main>
    </div>
  );
}
