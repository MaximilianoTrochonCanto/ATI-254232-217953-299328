import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReportesAuditorias from "../reportesAuditorias";

const response = (body, status = 200) => Promise.resolve({
  ok: status === 200,
  status,
  json: async () => body,
});

beforeEach(() => {
  localStorage.setItem("token", "token-reportes");
  global.fetch = jest.fn();
  window.URL.createObjectURL = jest.fn(() => "blob:csv");
  window.URL.revokeObjectURL = jest.fn();
});

test("calcula y presenta el resumen anual ponderado", async () => {
  fetch.mockImplementationOnce(() => response({
    anios: [2026],
    reportes: [
      { empresa_id: 2, empresa_nombre: "Empresa QA", anio: 2026, mes: 6, cantidad_auditorias: 1, promedio: 80, promedio_base: 84, cantidad_reclamos: 1, descuento_reclamos_total: 4 },
      { empresa_id: 2, empresa_nombre: "Empresa QA", anio: 2026, mes: 7, cantidad_auditorias: 3, promedio: 100, promedio_base: 100, cantidad_reclamos: 0, descuento_reclamos_total: 0 },
    ],
  }));

  render(<ReportesAuditorias modo="auditor" logout={jest.fn()} />);

  expect(await screen.findByText("95%")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.getByLabelText(/Reporte de Mis auditorías/i)).toBeInTheDocument();
});

test("descarga el reporte visible como CSV", async () => {
  fetch.mockImplementationOnce(() => response({
    anios: [2026],
    reportes: [{ empresa_id: 2, empresa_nombre: "Empresa QA", anio: 2026, mes: 7, cantidad_auditorias: 1, promedio: 84, promedio_base: 86, cantidad_reclamos: 1, descuento_reclamos_total: 2 }],
  }));
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<ReportesAuditorias modo="auditor" logout={jest.fn()} />);
  await screen.findByLabelText(/Reporte de Mis auditorías/i);

  fireEvent.click(screen.getByRole("button", { name: /Descargar reporte/i }));

  expect(window.URL.createObjectURL).toHaveBeenCalled();
  expect(click).toHaveBeenCalled();
  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:csv");
});

test("muestra el error entregado por el servidor", async () => {
  fetch.mockImplementationOnce(() => response({ message: "Reporte no disponible" }, 500));
  render(<ReportesAuditorias modo="auditor" logout={jest.fn()} />);
  expect(await screen.findByText("Reporte no disponible")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText(/Cargando reportes/i)).not.toBeInTheDocument());
});
