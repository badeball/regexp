import { describe, test } from "node:test";
import { deepEqual } from "node:assert/strict";
import { inspect } from "node:util";

import { Lexer } from "./lexer/index.ts";
import { Parser } from "./parser/index.ts";
import { consume } from "./evaluator/index.ts";

describe("Lexer", () => {
  const example = (input: string, expression: string, expected: string[]) => {
    test(`input ${inspect(input)}, expression ${inspect(expression)}`, () => {
      const lexer = new Lexer(expression);
      const parser = new Parser(lexer[Symbol.iterator]());
      const actual = consume(input, parser.parse());
      // console.log("actual", actual);
      deepEqual(actual, expected);
    });
  };

  example("a", "a", ["a"]);
  example("aa", "a+", ["aa", "a"]);
  example("aa", "a*", ["aa", "a", ""]);
  example("aaa", "a*a", ["aaa", "aa", "a"]);

  example("a", "b*", [""]);
  example("a", "b*a", ["a"]);
  example("a", "b*a*", ["a", ""]);
});
