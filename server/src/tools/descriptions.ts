import { readFileSync } from "fs";
import { join } from "path";

const DIR = join(import.meta.dir, "descriptions");

export function loadDescription(name: string): string {
  return readFileSync(join(DIR, `${name}.txt`), "utf-8").trim();
}
