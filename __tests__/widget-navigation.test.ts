import { requestTaskFromWidget } from "../services/widget-navigation";
import useBookNavigationStore from "../stores/book-navigation-store";

beforeEach(() => {
  useBookNavigationStore.setState({ target: null });
});

describe("requestTaskFromWidget", () => {
  it("pide abrir la tarea en su día", () => {
    expect(requestTaskFromWidget("2026-09-22", "t1")).toBe(true);

    expect(useBookNavigationStore.getState().target).toMatchObject({ date: "2026-09-22", taskId: "t1" });
  });

  it.each([
    ["sin fecha", undefined, "t1"],
    ["fecha mal formada", "22/09/2026", "t1"],
    ["sin id", "2026-09-22", undefined],
    ["id vacío", "2026-09-22", ""],
    ["parámetros repetidos (array)", ["2026-09-22"], "t1"],
  ])("%s: no pide ninguna tarea", (_name, date, id) => {
    expect(requestTaskFromWidget(date, id)).toBe(false);

    expect(useBookNavigationStore.getState().target).toBeNull();
  });
});
