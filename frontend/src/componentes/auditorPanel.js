import { useState } from "react";
import ListaAuditorias from "./listaAuditorias";
import NuevaAuditoria from "./nuevaAuditoria";
import ReclamoInforme from "./reclamoInforme";

export default function AuditorPanel({ logout }) {
  const [seccion, setSeccion] = useState("mis-auditorias");
  const [menuOpen, setMenuOpen] = useState(false);

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
          onClick={() => {
            setSeccion("mis-auditorias");
            setMenuOpen(false);
          }}
        >
          Mis auditorías
        </button>

        <button
          onClick={() => {
            setSeccion("nueva");
            setMenuOpen(false);
          }}
        >
          Nueva auditoría
        </button>

        <button
          onClick={() => {
            setSeccion("reclamos");
            setMenuOpen(false);
          }}
        >
          Reclamos / Informes
        </button>

        <button onClick={logout}>Logout</button>
      </aside>

      <main className="admin-content">
        {seccion === "mis-auditorias" && (
          <ListaAuditorias modo="auditor" logout={logout} />
        )}

        {seccion === "nueva" && <NuevaAuditoria />}

        {seccion === "reclamos" && <ReclamoInforme />}
      </main>
    </div>
  );
}