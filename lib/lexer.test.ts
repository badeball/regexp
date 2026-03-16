import { describe, test } from "node:test";
import { deepEqual } from "node:assert/strict";
import { inspect } from "node:util";

import type { Token } from "./lexer/index.ts";
import { Lexer } from "./lexer/index.ts";

describe("Lexer", () => {
  const example = (input: string, expected: Token[]) => {
    test(`input ${inspect(input)}`, () => {
      const actual = Array.from(new Lexer(input));
      deepEqual(actual, expected);
    });
  };

  example("ab*c", [
    {
      value: "a",
      position: 0,
    },
    {
      value: "b",
      position: 1,
    },
    {
      value: "*",
      position: 2,
    },
    {
      value: "c",
      position: 3,
    },
  ]);

  example("ab+c", [
    {
      value: "a",
      position: 0,
    },
    {
      value: "b",
      position: 1,
    },
    {
      value: "+",
      position: 2,
    },
    {
      value: "c",
      position: 3,
    },
  ]);

  example("ab{0,1}c", [
    {
      value: "a",
      position: 0,
    },
    {
      value: "b",
      position: 1,
    },
    {
      value: "{",
      position: 2,
    },
    {
      value: "0",
      position: 3,
    },
    {
      value: ",",
      position: 4,
    },
    {
      value: "1",
      position: 5,
    },
    {
      value: "}",
      position: 6,
    },
    {
      value: "c",
      position: 7,
    },
  ]);

  example("a|b", [
    {
      value: "a",
      position: 0,
    },
    {
      value: "|",
      position: 1,
    },
    {
      value: "b",
      position: 2,
    },
  ]);

  example("a(?:b)c", [
    {
      value: "a",
      position: 0,
    },
    {
      value: "(?:",
      position: 1,
    },
    {
      value: "b",
      position: 4,
    },
    {
      value: ")",
      position: 5,
    },
    {
      value: "c",
      position: 6,
    },
  ]);
});
