import fs from "node:fs";
import path from "node:path";

// React Native ignora un color mal escrito en silencio (no falla, solo no se ve): "#rgb(255, 215, 0)"
// mezcla el formato hexadecimal con el funcional. Los válidos son "#ffd700", "rgb(255, 215, 0)" o
// "rgba(255, 215, 0, 0.1)".
const root = path.join(__dirname, "..");
const SOURCE_DIRS = ["app", "components", "hooks", "constants", "widgets"];
const INVALID_COLOR = /["'`]#rgba?\(/;

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

describe("formatos de color", () => {
  it("ningún archivo del código mezcla '#' con rgb()/rgba()", () => {
    const offenders = SOURCE_DIRS.map((dir) => path.join(root, dir))
      .filter((dir) => fs.existsSync(dir))
      .flatMap(sourceFiles)
      .flatMap((file) =>
        fs
          .readFileSync(file, "utf8")
          .split("\n")
          .flatMap((line, index) =>
            INVALID_COLOR.test(line) ? [`${path.relative(root, file)}:${index + 1}  ${line.trim()}`] : []
          )
      );

    expect(offenders).toEqual([]);
  });
});
