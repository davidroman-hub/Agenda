/**
 * El modal de edición de tareas y los tipos. Lo importante: una tarea ANTIGUA (sin tipo) que se edita
 * no se guarda hasta que el usuario elige un tipo o «Sin tipo» a propósito ("interceptación"); una
 * tarea nueva toma el tipo de la pestaña activa; y sin tipos creados no hay nada que decidir.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, default: () => null }));
jest.mock("../services/exact-alarm-service", () => ({ promptForExactAlarmsOnce: jest.fn() }));
jest.mock("../services/attachments-service", () => ({
  pickAndStoreAttachment: jest.fn(),
  attachmentExists: jest.fn(() => true),
  openAttachment: jest.fn(),
  shareAttachment: jest.fn(),
  getAttachmentUri: jest.fn(() => null),
  deleteStoredFiles: jest.fn(),
  listStoredFileNames: jest.fn(() => []),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("expo-image", () => ({ Image: "ExpoImage" }));

import React from "react";
import { Alert, Text, TextInput, TouchableOpacity } from "react-native";
import TestRenderer, { act, ReactTestInstance, ReactTestRenderer } from "react-test-renderer";
import TaskEditModal from "../components/agendaComponents/bookFragments/TaskEditModal";
import useTaskTypesStore from "../stores/task-types-store";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tCommon = (key: string) => key;
const mounted: ReactTestRenderer[] = [];

async function renderModal(props: Partial<React.ComponentProps<typeof TaskEditModal>> = {}) {
  const onSave = jest.fn();
  const onCancel = jest.fn();
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      <TaskEditModal
        visible
        tCommon={tCommon}
        date="2026-09-20"
        lineNumber={1}
        completed={false}
        toggleTaskCompletion={jest.fn()}
        onSave={onSave}
        onCancel={onCancel}
        {...props}
      />
    );
  });
  mounted.push(renderer);
  return { root: renderer.root, onSave, onCancel };
}

afterEach(async () => {
  await act(async () => {
    while (mounted.length) mounted.pop()!.unmount();
  });
  jest.restoreAllMocks();
});

const texts = (root: ReactTestInstance) =>
  root
    .findAllByType(Text)
    .map((node) => node.props.children)
    .flat(Infinity)
    .filter((child) => typeof child === "string");
const buttonWithText = (root: ReactTestInstance, text: string) => {
  const found = root.findAllByType(TouchableOpacity).filter((node) => node.findAllByType(Text).some((t) => t.props.children === text));
  if (found.length === 0) throw new Error(`No hay botón «${text}»`);
  return found[0];
};
const press = async (root: ReactTestInstance, text: string) => {
  await act(async () => {
    buttonWithText(root, text).props.onPress();
  });
};

let workId = "";
let homeId = "";

beforeEach(() => {
  useTaskTypesStore.setState({ types: [], activeFilter: "all" });
});

// Crea los tipos «Trabajo» y «Casa» y devuelve sus ids
function createTypes() {
  useTaskTypesStore.getState().addType("Trabajo");
  useTaskTypesStore.getState().addType("Casa");
  [workId, homeId] = useTaskTypesStore.getState().types.map((type) => type.id);
}

describe("tarea antigua (sin tipo) con tipos creados: se intercepta al guardar", () => {
  beforeEach(createTypes);

  it("no se guarda hasta elegir un tipo, y avisa", async () => {
    const { root, onSave } = await renderModal({ initialText: "Tarea vieja", initialTypeId: null });

    // Antes de intentar guardar, el aviso es discreto; tras intentarlo, se marca en rojo
    expect(texts(root)).toContain("taskTypes.chooseType");
    await press(root, "buttons.save");

    expect(onSave).not.toHaveBeenCalled();
    const hint = root.findAllByType(Text).find((node) => node.props.children === "taskTypes.chooseType")!;
    expect(JSON.stringify(hint.props.style)).toContain("#D32F2F");
  });

  it("tampoco si el campo ni siquiera existe (tipo ausente, como en los datos antiguos)", async () => {
    const { root, onSave } = await renderModal({ initialText: "Tarea vieja" });
    await press(root, "buttons.save");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("elegir un tipo la deja guardar, con ese tipo", async () => {
    const { root, onSave } = await renderModal({ initialText: "Tarea vieja", initialTypeId: null });
    await press(root, "Casa");
    await press(root, "buttons.save");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toBe("Tarea vieja");
    expect(onSave.mock.calls[0][3]).toBe(homeId);
  });

  it("elegir «Sin tipo» a propósito también la deja guardar, y se guarda sin tipo (null)", async () => {
    const { root, onSave } = await renderModal({ initialText: "Tarea vieja", initialTypeId: null });
    await press(root, "taskTypes.noType");
    await press(root, "buttons.save");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][3]).toBeNull();
  });

  it("una vez elegido el tipo, el aviso desaparece", async () => {
    const { root } = await renderModal({ initialText: "Tarea vieja", initialTypeId: null });
    await press(root, "buttons.save");
    await press(root, "Trabajo");
    expect(texts(root)).not.toContain("taskTypes.chooseType");
  });

  it("una tarea con un tipo que ya se borró cuenta como antigua: hay que elegir otro", async () => {
    const { root, onSave } = await renderModal({ initialText: "Huérfana", initialTypeId: "tipo-que-ya-no-existe" });
    await press(root, "buttons.save");
    expect(onSave).not.toHaveBeenCalled();
    expect(texts(root)).toContain("taskTypes.chooseType");
  });
});

describe("tarea que ya tiene tipo", () => {
  beforeEach(createTypes);

  it("se guarda directamente, conservando su tipo", async () => {
    const { root, onSave } = await renderModal({ initialText: "Con tipo", initialTypeId: workId });
    await press(root, "buttons.save");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][3]).toBe(workId);
    expect(texts(root)).not.toContain("taskTypes.chooseType");
  });

  it("se puede cambiar a otro tipo", async () => {
    const { root, onSave } = await renderModal({ initialText: "Con tipo", initialTypeId: workId });
    await press(root, "Casa");
    await press(root, "buttons.save");
    expect(onSave.mock.calls[0][3]).toBe(homeId);
  });
});

describe("tarea nueva", () => {
  beforeEach(createTypes);

  it("toma el tipo de la pestaña activa", async () => {
    useTaskTypesStore.getState().setActiveFilter(homeId);
    const { root, onSave } = await renderModal({ initialText: "" });
    await act(async () => {
      root.findByType(TextInput).props.onChangeText("Nueva");
    });
    await press(root, "buttons.save");

    expect(onSave.mock.calls[0][3]).toBe(homeId);
  });

  it("sin pestaña de tipo activa (Todas), queda sin tipo y no se pide elegir", async () => {
    const { root, onSave } = await renderModal({ initialText: "" });
    await act(async () => {
      root.findByType(TextInput).props.onChangeText("Nueva");
    });
    expect(texts(root)).not.toContain("taskTypes.chooseType");
    await press(root, "buttons.save");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][3]).toBeNull();
  });
});

describe("sin tipos creados", () => {
  it("no hay selector de tipo y una tarea antigua se guarda sin más, sin tipo", async () => {
    const { root, onSave } = await renderModal({ initialText: "Vieja", initialTypeId: null });

    expect(texts(root)).not.toContain("taskTypes.typeLabel");
    expect(texts(root)).not.toContain("taskTypes.noType");
    await press(root, "buttons.save");

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][3]).toBeNull();
  });
});

describe("el selector de tipo", () => {
  beforeEach(createTypes);

  it("ofrece «Sin tipo» y cada tipo creado", async () => {
    const { root } = await renderModal({ initialText: "Con tipo", initialTypeId: workId });
    for (const label of ["taskTypes.noType", "Trabajo", "Casa"]) expect(texts(root)).toContain(label);
  });

  it("el tipo de la tarea aparece elegido", async () => {
    const { root } = await renderModal({ initialText: "Con tipo", initialTypeId: workId });
    expect(buttonWithText(root, "Trabajo").props.accessibilityState.selected).toBe(true);
    expect(buttonWithText(root, "Casa").props.accessibilityState.selected).toBe(false);
  });
});

describe("guardar y cancelar", () => {
  it("con el texto vacío avisa y no guarda", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const { root, onSave } = await renderModal({ initialText: "" });
    await press(root, "buttons.save");

    expect(alert).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("guarda el texto sin espacios de más", async () => {
    const { root, onSave } = await renderModal({ initialText: "" });
    await act(async () => {
      root.findByType(TextInput).props.onChangeText("   con espacios   ");
    });
    await press(root, "buttons.save");
    expect(onSave.mock.calls[0][0]).toBe("con espacios");
  });

  it("cancelar avisa a quien lo abrió y no guarda", async () => {
    createTypes();
    const { root, onSave, onCancel } = await renderModal({ initialText: "Tarea vieja", initialTypeId: null });
    await press(root, "buttons.cancel");
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
