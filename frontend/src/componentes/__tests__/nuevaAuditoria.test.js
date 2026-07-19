import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import NuevaAuditoria from "../nuevaAuditoria";

jest.mock("../auditoriaArchivo", () => ({ plantillaSeleccionada }) => <div>Archivo {plantillaSeleccionada.nombre}</div>);
jest.mock("../capacitacionesEvaluacion", () => () => <div>Capacitaciones especiales</div>);
jest.mock("../cumplimientoMenu", () => ({ tipoServicio }) => <div>Menú especial {tipoServicio}</div>);

const plantillas = [
  { id: 9, nombre: "Auditoría cámaras de congelado", categoria: "inocuidad", descripcion: "Cámaras", tipo: "formulario" },
  { id: 20, nombre: "Evaluación documental", categoria: "servicios", descripcion: "Archivo", tipo: "archivo" },
];
const empresas = [{ id: 2, nombre: "Empresa QA" }];
const criterios = [{ id: 91, numero: 1, texto: "Temperatura adecuada?", seccion: "General", puntaje_maximo: 3 }];
const response = (body, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body });

beforeEach(() => {
  localStorage.setItem("token", "token-nueva");
  global.fetch = jest.fn()
    .mockImplementationOnce(() => response(plantillas))
    .mockImplementationOnce(() => response(empresas));
});

test("carga plantillas, filtra por categoria y obtiene criterios", async () => {
  fetch.mockImplementationOnce(() => response(criterios));
  render(<NuevaAuditoria />);

  fireEvent.click(screen.getByRole("button", { name: /Inocuidad/i }));
  expect(await screen.findByText("Auditoría cámaras de congelado")).toBeInTheDocument();
  expect(screen.queryByText("Evaluación documental")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Usar plantilla/i }));
  expect(await screen.findByText(/Temperatura adecuada/i)).toBeInTheDocument();
  expect(fetch.mock.calls[2][0]).toContain("/plantillas/9/criterios");
});

test("guarda auditoria y respuestas mostrando el resumen final", async () => {
  fetch
    .mockImplementationOnce(() => response(criterios))
    .mockImplementationOnce(() => response({ auditoria: { id: 50 } }))
    .mockImplementationOnce(() => response({ puntaje: { porcentajeFinal: 100 } }));
  render(<NuevaAuditoria />);
  fireEvent.click(screen.getByRole("button", { name: /Inocuidad/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Usar plantilla/i }));
  await screen.findByText(/Temperatura adecuada/i);

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
  fireEvent.change(screen.getByPlaceholderText(/Lugar \/ sector/i), { target: { value: "Cámara 1" } });
  fireEvent.click(screen.getByRole("radio", { name: "3" }));
  fireEvent.change(screen.getByPlaceholderText("Observaciones"), { target: { value: "Conforme" } });
  fireEvent.click(screen.getByRole("button", { name: /Guardar auditoría/i }));

  expect(await screen.findByText(/Auditoría registrada/i)).toBeInTheDocument();
  expect(screen.getByText("Empresa QA")).toBeInTheDocument();
  expect(screen.getByText("100%")).toBeInTheDocument();
  const body = JSON.parse(fetch.mock.calls[4][1].body);
  expect(body.respuestas[0]).toEqual(expect.objectContaining({ criterio_id: 91, puntuacion: 3, observacion: "Conforme" }));
});

test("deriva plantillas de archivo al formulario especializado", async () => {
  render(<NuevaAuditoria />);
  fireEvent.click(screen.getByRole("button", { name: /Servicios/i }));
  fireEvent.click(await screen.findByRole("button", { name: /Usar plantilla/i }));
  expect(screen.getByText("Archivo Evaluación documental")).toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
});
