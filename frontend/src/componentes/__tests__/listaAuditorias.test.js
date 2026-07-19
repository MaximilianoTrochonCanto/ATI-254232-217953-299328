import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ListaAuditorias from "../listaAuditorias";

jest.mock("../detalleAuditoria", () => ({ auditoriaId, volver }) => (
  <div>
    <span>Detalle seleccionado {auditoriaId}</span>
    <button onClick={volver}>Regresar</button>
  </div>
));

const response = (body, status = 200) => Promise.resolve({
  ok: status === 200,
  status,
  json: async () => body,
});

beforeEach(() => {
  localStorage.setItem("token", "token-lista");
  global.fetch = jest.fn();
});

test("lista auditorias del usuario y permite abrir su detalle", async () => {
  fetch
    .mockImplementationOnce(() => response([{ id: 2, nombre: "Empresa QA" }]))
    .mockImplementationOnce(() => response([{
      id: 9,
      plantilla_nombre: "Auditoría cámaras de congelado",
      empresa_nombre: "Empresa QA",
      estado: "finalizada",
      fecha: "2026-07-18",
      lugar: "Comedor",
    }]));

  render(<ListaAuditorias modo="auditor" logout={jest.fn()} />);

  expect(await screen.findByText("Auditoría cámaras de congelado")).toBeInTheDocument();
  expect(screen.getByText("18/07/2026")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Ver auditoría/i }));
  expect(screen.getByText("Detalle seleccionado 9")).toBeInTheDocument();
});

test("aplica filtros de empresa y fechas en modo administrador", async () => {
  fetch
    .mockImplementationOnce(() => response([{ id: 2, nombre: "Empresa QA" }]))
    .mockImplementationOnce(() => response([]))
    .mockImplementationOnce(() => response([]));

  render(<ListaAuditorias modo="admin" logout={jest.fn()} />);
  await screen.findByText(/No se encontraron auditorías/i);

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
  const dates = document.querySelectorAll('input[type="date"]');
  fireEvent.change(dates[0], { target: { value: "2026-07-01" } });
  fireEvent.change(dates[1], { target: { value: "2026-07-31" } });
  fireEvent.click(screen.getByRole("button", { name: /Aplicar filtros/i }));

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(fetch.mock.calls[2][0]).toContain("empresa_id=2");
  expect(fetch.mock.calls[2][0]).toContain("fecha_desde=2026-07-01");
  expect(fetch.mock.calls[2][0]).toContain("fecha_hasta=2026-07-31");
});

test("cierra la sesion ante una respuesta 401", async () => {
  const logout = jest.fn();
  fetch
    .mockImplementationOnce(() => response([], 401))
    .mockImplementationOnce(() => response([], 401));
  render(<ListaAuditorias logout={logout} />);
  await waitFor(() => expect(logout).toHaveBeenCalled());
});
