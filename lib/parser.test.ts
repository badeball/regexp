import { describe, test } from "node:test";
import { inspect } from "node:util";

import { Lexer } from "./lexer/index.ts";
import { Parser } from "./parser/index.ts";

describe("Parser", () => {
  const example = (input: string) => {
    test(`input ${inspect(input)}`, (t) => {
      const actual = new Parser(new Lexer(input)[Symbol.iterator]()).parse();
      t.assert.snapshot(actual);
    });
  };

  example("ab?c");
  example("ab*c");
  example("ab+c");
  example("ab{1}c");
  example("ab{1,}c");
  example("ab{,2}c");
  example("ab{1,2}c");
  example("ab{0,1}c");
  example("a(b)c");
  example("a(?:b)c");
  example("a(?:b|c)c");
  example("a|b");
  example("(a+)|(b+)");
});
