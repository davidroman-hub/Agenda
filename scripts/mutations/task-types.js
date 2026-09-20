// Tipos de tarea y pestañas (Fase 1): lógica pura, store, borrado de un tipo y filtros
const { m } = require("./_helpers");

const U = "utils/task-types.ts";
const UT = "__tests__/task-types.test.ts";
const S = "stores/task-types-store.ts";
const ST = "__tests__/task-types-store.test.ts";
const SVC = "services/task-types-service.ts";
const TASKS = "stores/agenda-tasks-store.ts";
const FILTERS_T = "__tests__/task-types-filtering.test.ts";
const MODAL = "components/agendaComponents/bookFragments/TaskEditModal.tsx";
const PICKER = "components/agendaComponents/bookFragments/TaskTypePicker.tsx";
const MODAL_T = "__tests__/task-edit-modal.test.tsx";

module.exports = [
  // --- a qué tipo pertenece una tarea y qué filtro se aplica (utils/task-types.ts)
  m(U, "if (!task.typeId) return null;", "", UT, "una tarea sin tipo devuelve undefined en vez de null"),
  m(U, "if (knownTypeIds && !knownTypeIds.has(task.typeId)) return null;", "", UT, "una tarea con un tipo borrado sigue contando como de ese tipo"),
  m(U, "if (filter === FILTER_ALL) return true;", "", UT, "«Todas» esconde las tareas sin tipo"),
  m(U, "return filter === FILTER_NONE ? typeId === null : typeId === filter;", "return filter === FILTER_NONE ? typeId !== null : typeId === filter;", UT, "«Sin tipo» enseña justo las tareas con tipo"),
  m(U, "if (filter === FILTER_ALL || filter === FILTER_NONE) return filter;", "", UT, "«Todas» y «Sin tipo» se toman por un tipo borrado"),
  m(U, "return knownTypeIds.has(filter) ? filter : FILTER_ALL;", "return filter;", UT, "un filtro apuntando a un tipo borrado no vuelve a «Todas»"),
  m(U, '.trim().replace(/\\s+/g, " ").slice(0, MAX_TASK_TYPE_NAME_LENGTH)', '.trim().replace(/\\s+/g, " ")', UT, "el nombre de un tipo no tiene límite de largo"),
  m(U, '.replace(/\\s+/g, " ")', "", UT, "los espacios repetidos de un nombre no se colapsan"),
  m(U, '    .normalize("NFD")\n    .replace(/[̀-ͯ]/g, "")\n', "", UT, "«Trábajo» y «Trabajo» cuentan como nombres distintos"),
  m(U, ".toLocaleLowerCase();", ";", UT, "«Trabajo» y «trabajo» cuentan como nombres distintos"),
  m(U, "type.id !== exceptId && comparable", "comparable", UT, "al renombrar, un tipo choca con su propio nombre"),
  m(U, "TASK_TYPE_COLORS.find((color) => !used.has(color)) ??", "", UT, "un tipo nuevo repite un color aunque haya libres"),
  m(U, "TASK_TYPE_COLORS[types.length % TASK_TYPE_COLORS.length]", "TASK_TYPE_COLORS[0]", UT, "al acabarse los colores, siempre se reparte el primero"),
  m(U, "if (task && resolveTaskTypeId(task, knownTypeIds) === null) return true;", "if (task && task.typeId == null) return true;", UT, "una tarea con un tipo borrado no cuenta como «sin tipo»"),
  m(U, "if (task?.typeId === typeId) count++;", "if (task) count++;", UT, "se cuentan tareas de otros tipos al borrar un tipo"),
  m(U, "if (isNewTask) return known.has(activeFilter) ? activeFilter : null;", "if (isNewTask) return null;", UT, "una tarea nueva no toma el tipo de la pestaña activa"),
  m(U, "if (current) return current;", "", UT, "una tarea con tipo pierde su tipo al editarla"),
  m(U, "return types.length > 0 ? undefined : null;", "return null;", UT, "una tarea antigua sin tipo no obliga a elegir uno al guardar"),
  m(U, "if (types.length === 0) return [];", "", FILTERS_T, "la tira de tipos se ve aunque no exista ningún tipo"),
  m(U, "if (hasUntyped || filter === FILTER_NONE) tabs.push", "if (hasUntyped) tabs.push", FILTERS_T, "«Sin tipo» desaparece estando activa"),
  m(U, "if (hasUntyped || filter === FILTER_NONE) tabs.push", "if (true) tabs.push", FILTERS_T, "«Sin tipo» aparece aunque no haya tareas sin tipo"),

  // --- filtro visual de líneas (filterVisibleLines): nunca debe esconder líneas libres
  m(U, "return !task || matchesTypeFilter(task, filter, knownTypeIds);", "return !!task && matchesTypeFilter(task, filter, knownTypeIds);", FILTERS_T, "el filtro esconde las líneas libres (podrían pisarse tareas ocultas)"),
  m(U, "return !task || matchesTypeFilter(task, filter, knownTypeIds);", "return !task || matchesTypeFilter(task, FILTER_ALL, knownTypeIds);", FILTERS_T, "el filtro visual no filtra nada"),
  m("components/agendaComponents/pastTasks/pastTasksFilters/filterUtils.ts", "if (!matchesTypeFilter(task, typeFilter, knownTypeIds)) return false;", "", FILTERS_T, "las tareas pasadas ignoran el filtro por tipo"),

  // --- store de tipos (stores/task-types-store.ts)
  m(S, 'if (!cleanName) return { ok: false, reason: "empty" };\n        if (types.length', "if (types.length", ST, "se puede crear un tipo sin nombre"),
  m(S, 'if (types.length >= MAX_TASK_TYPES) return { ok: false, reason: "limit" };', 'if (types.length > MAX_TASK_TYPES) return { ok: false, reason: "limit" };', ST, "se puede pasar del máximo de tipos"),
  m(S, 'if (isTypeNameTaken(types, cleanName)) return { ok: false, reason: "taken" };', "", ST, "se pueden crear dos tipos con el mismo nombre"),
  m(S, 'if (!existing) return { ok: false, reason: "notFound" };', "", ST, "se puede renombrar un tipo que no existe"),
  m(S, "if (isTypeNameTaken(types, cleanName, id))", "if (isTypeNameTaken(types, cleanName))", ST, "no se puede cambiar un tipo a mayúsculas o acentos distintos de su propio nombre"),
  m(S, "if (!TASK_TYPE_COLORS.includes(color as (typeof TASK_TYPE_COLORS)[number])) return;", "", ST, "se acepta un color que no es de la paleta"),
  m(S, "activeFilter: state.activeFilter === id ? FILTER_ALL : state.activeFilter,", "activeFilter: state.activeFilter,", ST, "al borrar el tipo activo la pestaña activa queda apuntando a un tipo inexistente"),
  m(S, "partialize: (state) => ({ types: state.types }),", "partialize: (state) => state,", ST, "la pestaña activa se guarda en disco (la app debe abrir siempre en «Todas»)"),

  // --- modal de edición: interceptación de tareas antiguas y selector (task-edit-modal.test.tsx)
  m(MODAL, `      if (typeChoice === undefined) {
        setTypeError(true);
        return;
      }`, "", MODAL_T, "una tarea antigua sin tipo se guarda sin interceptarla"),
  m(MODAL, "      if (typeChoice === undefined) {\n        setTypeError(true);\n        return;", "      if (typeChoice === undefined) {\n        return;", MODAL_T, "al intentar guardar sin tipo no se avisa"),
  m(MODAL, "onSave(trimmedText, reminderString, finalRepeatOption, typeChoice, attachments);", "onSave(trimmedText, reminderString, finalRepeatOption, null, attachments);", MODAL_T, "el tipo elegido no se envía al guardar"),
  m(MODAL, "isNewTask: !initialText,", "isNewTask: false,", MODAL_T, "una tarea nueva pide elegir tipo como si fuera antigua"),
  m(MODAL, "{types.length > 0 && (", "{true && (", MODAL_T, "el selector de tipo sale aunque no haya tipos"),
  m(PICKER, "value === null, null, () => onChange(null))}", "value === null, null, () => undefined)}", MODAL_T, "elegir «Sin tipo» no hace nada"),
  m(PICKER, "() => onChange(type.id))", "() => onChange(null))", MODAL_T, "elegir un tipo lo deja sin tipo"),
  m(PICKER, "value === type.id, type.color", "value !== type.id, type.color", MODAL_T, "el tipo elegido no aparece marcado"),

  // --- borrar un tipo sin borrar sus tareas (services/task-types-service.ts, stores/agenda-tasks-store.ts)
  m(SVC, "useAgendaTasksStore.getState().clearTaskType(typeId);", "", ST, "al borrar un tipo sus tareas quedan apuntando a un tipo inexistente"),
  m(SVC, "useTaskTypesStore.getState().removeType(typeId);", "", ST, "borrar un tipo no lo quita"),
  m(TASKS, "if (task?.typeId === typeId) {", "if (task) {", ST, "borrar un tipo deja sin tipo a las tareas de los demás tipos"),
];
