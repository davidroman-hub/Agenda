// react-test-renderer viene con jest-expo (versión exacta, la misma que React) pero sin tipos, y el
// proyecto no declara @types/react-test-renderer. Aquí solo van los que usan los tests de interfaz
// (__tests__/notes-ui.test.tsx y book-sections.test.tsx); si se necesitan más, o si algún día se
// añade @types/react-test-renderer, se borra este archivo.
declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestInstance {
    type: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    props: Record<string, any>;
    parent: ReactTestInstance | null;
    children: Array<ReactTestInstance | string>;
    find(predicate: (node: ReactTestInstance) => boolean): ReactTestInstance;
    findByType(type: unknown): ReactTestInstance;
    findAll(
      predicate: (node: ReactTestInstance) => boolean,
      options?: { deep: boolean }
    ): ReactTestInstance[];
    findAllByType(type: unknown, options?: { deep: boolean }): ReactTestInstance[];
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance;
    unmount(): void;
    update(element: ReactElement): void;
    toJSON(): unknown;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void | Promise<void>): Promise<void>;

  const TestRenderer: { create: typeof create; act: typeof act };
  export default TestRenderer;
}
