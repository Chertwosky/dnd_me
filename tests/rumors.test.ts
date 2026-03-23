import test from "node:test";
import assert from "node:assert/strict";

import { extractRumorsFromText, sanitizeRumorList } from "../lib/rumors.ts";

test("sanitizeRumorList keeps only five non-empty strings", () => {
  assert.deepEqual(
    sanitizeRumorList([" один ", "", "два", 3, "три", "четыре", "пять", "шесть"]),
    ["один", "два", "три", "четыре", "пять"],
  );
});

test("extractRumorsFromText reads JSON payload", () => {
  assert.deepEqual(
    extractRumorsFromText('{"rumors":["a","b","c","d","e"]}'),
    ["a", "b", "c", "d", "e"],
  );
});

test("extractRumorsFromText falls back to plain-text list", () => {
  assert.deepEqual(
    extractRumorsFromText(`1. Первый
2. Второй
- Третий
* Четвёртый
5) Пятый`),
    ["Первый", "Второй", "Третий", "Четвёртый", "Пятый"],
  );
});
