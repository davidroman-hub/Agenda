import {
  getBackAngle,
  getFrontAngle,
  getLeafFlip,
  getLeafShade,
  isFrontFacing,
  positiveModulo,
} from "../utils/page-turn";

describe("getLeafFlip", () => {
  it("hacia delante la hoja va de la derecha (0) a la izquierda (1)", () => {
    expect(getLeafFlip(0, "next")).toBe(0);
    expect(getLeafFlip(0.25, "next")).toBe(0.25);
    expect(getLeafFlip(1, "next")).toBe(1);
  });

  it("hacia atrás es el mismo giro al revés: empieza sobre la izquierda y acaba sobre la derecha", () => {
    expect(getLeafFlip(0, "prev")).toBe(1);
    expect(getLeafFlip(0.25, "prev")).toBe(0.75);
    expect(getLeafFlip(1, "prev")).toBe(0);
  });
});

describe("ángulos de las dos caras de la hoja", () => {
  it("la cara delantera gira de 0 a -180 (el borde libre viene hacia el usuario)", () => {
    expect(getFrontAngle(0)).toBeCloseTo(0, 10); // (-180 * 0 es -0, que con toBe fallaría)
    expect(getFrontAngle(0.5)).toBe(-90);
    expect(getFrontAngle(1)).toBe(-180);
  });

  it("la trasera gira de 180 a 0, así queda derecha cuando la hoja aterriza a la izquierda", () => {
    expect(getBackAngle(0)).toBe(180);
    expect(getBackAngle(0.5)).toBe(90);
    expect(getBackAngle(1)).toBe(0);
  });

  it("las dos caras están siempre a 180° una de otra (la trasera es el reverso de la delantera)", () => {
    for (let flip = 0; flip <= 1; flip += 0.1) {
      expect(getBackAngle(flip) - getFrontAngle(flip)).toBeCloseTo(180, 10);
    }
  });
});

describe("isFrontFacing", () => {
  it("se ve la cara delantera hasta la vertical y la trasera después", () => {
    expect(isFrontFacing(0)).toBe(true);
    expect(isFrontFacing(0.49)).toBe(true);
    expect(isFrontFacing(0.5)).toBe(false);
    expect(isFrontFacing(1)).toBe(false);
  });
});

describe("getLeafShade", () => {
  it("no hay sombra con la hoja plana, en ninguno de los dos lados", () => {
    expect(getLeafShade(0, 0.4)).toBeCloseTo(0, 10);
    expect(getLeafShade(1, 0.4)).toBeCloseTo(0, 10);
  });

  it("es máxima con la hoja de canto y simétrica a los dos lados", () => {
    expect(getLeafShade(0.5, 0.4)).toBeCloseTo(0.4, 10);
    expect(getLeafShade(0.25, 0.4)).toBeCloseTo(getLeafShade(0.75, 0.4), 10);
  });
});

describe("positiveModulo", () => {
  it("con valores positivos es el resto normal", () => {
    expect(positiveModulo(0, 30)).toBe(0);
    expect(positiveModulo(10, 30)).toBe(10);
    expect(positiveModulo(95, 30)).toBe(5);
  });

  it("con scroll negativo (rebote de iOS) sigue dando un resto entre 0 y el módulo", () => {
    expect(positiveModulo(-10, 30)).toBe(20);
    expect(positiveModulo(-30, 30)).toBeCloseTo(0, 10);
  });
});
