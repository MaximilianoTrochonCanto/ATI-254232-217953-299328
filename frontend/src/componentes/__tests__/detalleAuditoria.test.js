import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DetalleAuditoria from "../detalleAuditoria";

const detalle = {
  auditoria: {
    id: 9,
    plantilla_nombre: "Auditoría cámaras de congelado",
    empresa_nombre: "Empresa QA",
    auditor_nombre: "Auditora QA",
    fecha: "2026-07-18",
    lugar: "Comedor",
    estado: "finalizada",
  },
  respuestas: [
    {
      id: 1,
      texto: "Existe acción correctiva?",
      seccion: "General",
      puntuacion: 3,
      puntaje_maximo: 3,
      no_verificable: false,
      observacion: "Conforme",
    },
  ],
  reclamos: [],
  puntaje: { porcentajeBase: 100, descuentoReclamos: 0, porcentajeFinal: 100 },
};

const jsonResponse = (body, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => "application/json" },
  });

beforeEach(() => {
  localStorage.setItem("token", "token-qa");
  global.fetch = jest.fn();
  window.URL.createObjectURL = jest.fn(() => "blob:qa");
  window.URL.revokeObjectURL = jest.fn();
});

afterEach(() => jest.restoreAllMocks());

test("carga y presenta el detalle con resultado y fecha estables", async () => {
  fetch.mockImplementationOnce(() => jsonResponse(detalle));
  render(<DetalleAuditoria auditoriaId={9} volver={jest.fn()} logout={jest.fn()} />);

  expect(await screen.findByText("Auditoría cámaras de congelado")).toBeInTheDocument();
  expect(screen.getByText("18/07/2026")).toBeInTheDocument();
  expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/Existe acción correctiva\?/i)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/auditorias/9"),
    expect.objectContaining({ headers: { Authorization: "Bearer token-qa" } }),
  );
});

test("descarga DOCX con nombre de auditoria cuando el servidor responde correctamente", async () => {
  fetch
    .mockImplementationOnce(() => jsonResponse(detalle))
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      blob: async () => new Blob(["docx"], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
      headers: { get: () => "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    });
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<DetalleAuditoria auditoriaId={9} volver={jest.fn()} logout={jest.fn()} />);

  fireEvent.click(await screen.findByRole("button", { name: /Descargar DOCX editable/i }));

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[1][0]).toContain("/api/auditorias/9/docx");
  expect(click).toHaveBeenCalled();
  expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:qa");
});

test("informa claramente cuando la ruta DOCX no esta publicada", async () => {
  fetch
    .mockImplementationOnce(() => jsonResponse(detalle))
    .mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: { get: () => "text/html" },
    });
  render(<DetalleAuditoria auditoriaId={9} volver={jest.fn()} logout={jest.fn()} />);

  fireEvent.click(await screen.findByRole("button", { name: /Descargar DOCX editable/i }));

  expect(await screen.findByText(/todavía no está disponible en el servidor/i)).toBeInTheDocument();
});
