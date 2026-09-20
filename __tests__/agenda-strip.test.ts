import { getStripTabs } from "../utils/agenda-strip";
import { FILTER_ALL, FILTER_NONE } from "../utils/task-types";

const types = [{ id: "trabajo" }, { id: "casa" }];

describe("getStripTabs sin tipos", () => {
  it("hay una sola pestaña de tareas ('agenda'), para poder volver desde las notas", () => {
    expect(getStripTabs({ types: [], hasUntyped: true, filter: FILTER_ALL, section: "agenda" })).toEqual([
      { filter: FILTER_ALL, kind: "agenda", selected: true },
    ]);
  });

  it("en las notas, ninguna pestaña de tareas está marcada", () => {
    const tabs = getStripTabs({ types: [], hasUntyped: false, filter: FILTER_ALL, section: "notes" });
    expect(tabs).toHaveLength(1);
    expect(tabs[0].selected).toBe(false);
  });

  it("un filtro que quedó apuntando a un tipo borrado no rompe nada", () => {
    const tabs = getStripTabs({ types: [], hasUntyped: false, filter: "tipo-borrado", section: "agenda" });
    expect(tabs).toEqual([{ filter: FILTER_ALL, kind: "agenda", selected: true }]);
  });
});

describe("getStripTabs con tipos", () => {
  it("Todas, Sin tipo (si hay tareas sin tipo) y una por tipo, en orden", () => {
    const tabs = getStripTabs({ types, hasUntyped: true, filter: FILTER_ALL, section: "agenda" });
    expect(tabs.map((tab) => tab.kind)).toEqual(["all", "none", "type", "type"]);
    expect(tabs.map((tab) => tab.typeId)).toEqual([undefined, undefined, "trabajo", "casa"]);
  });

  it("'Sin tipo' no aparece si no hay tareas sin tipo, salvo que sea la activa", () => {
    expect(getStripTabs({ types, hasUntyped: false, filter: FILTER_ALL, section: "agenda" }).map((tab) => tab.kind)).toEqual(["all", "type", "type"]);
    expect(getStripTabs({ types, hasUntyped: false, filter: FILTER_NONE, section: "agenda" }).map((tab) => tab.kind)).toContain("none");
  });

  it("marca solo la pestaña del filtro activo", () => {
    const tabs = getStripTabs({ types, hasUntyped: true, filter: "casa", section: "agenda" });
    expect(tabs.filter((tab) => tab.selected).map((tab) => tab.typeId)).toEqual(["casa"]);
  });

  it("en las notas no hay ninguna marcada, aunque hubiera un filtro activo", () => {
    const tabs = getStripTabs({ types, hasUntyped: true, filter: "casa", section: "notes" });
    expect(tabs.some((tab) => tab.selected)).toBe(false);
  });

  it("al volver a la agenda vuelve a estar marcada la del filtro", () => {
    const inNotes = getStripTabs({ types, hasUntyped: false, filter: "trabajo", section: "notes" });
    const back = getStripTabs({ types, hasUntyped: false, filter: "trabajo", section: "agenda" });
    expect(inNotes.some((tab) => tab.selected)).toBe(false);
    expect(back.find((tab) => tab.selected)?.typeId).toBe("trabajo");
  });
});
