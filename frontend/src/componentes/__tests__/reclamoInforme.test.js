import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import ReclamoInforme from "../reclamoInforme";

beforeEach(() => {
  localStorage.setItem("token", "token-qa");
  global.fetch = jest.fn();
  process.env.REACT_APP_API_URL = "http://api.test";
});

function mockCargaInicial() {
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 1, nombre: "Empresa QA" }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 9, empresa_id: 1, fecha: "2026-07-06" }],
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
}

test("registra reclamo con archivo usando FormData", async () => {
  mockCargaInicial();
  fetch
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Reclamo / informe registrado correctamente." }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

  const { container } = render(<ReclamoInforme modo="admin" logout={jest.fn()} />);

  await waitFor(() =>
    expect(container.querySelector('form select option[value="1"]')).not.toBeNull()
  );

  const selects = container.querySelectorAll("form select");
  userEvent.selectOptions(selects[0], "1");
  userEvent.selectOptions(selects[2], "comedor");
  fireEvent.change(screen.getByPlaceholderText("Título del reclamo *"), {
    target: { value: "Reclamo QA" },
  });
  fireEvent.change(screen.getByPlaceholderText("Descripción del reclamo *"), {
    target: { value: "Descripcion QA" },
  });
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: {
      files: [new File(["contenido"], "reclamo.txt", { type: "text/plain" })],
    },
  });

  fireEvent.click(screen.getByRole("button", { name: "Guardar reclamo / informe" }));

  await screen.findByText("Reclamo / informe registrado correctamente.");

  const postCall = fetch.mock.calls[3];
  expect(postCall[0]).toBe("http://api.test/api/reclamos");
  expect(postCall[1].method).toBe("POST");
  expect(postCall[1].body).toBeInstanceOf(FormData);
  expect(postCall[1].body.get("archivo").name).toBe("reclamo.txt");
});

test("valida campos obligatorios antes de guardar reclamo", async () => {
  mockCargaInicial();

  render(<ReclamoInforme modo="auditor" logout={jest.fn()} />);

  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByRole("button", { name: "Guardar reclamo / informe" }));

  expect(await screen.findByText("Complete todos los campos obligatorios.")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(3);
});
