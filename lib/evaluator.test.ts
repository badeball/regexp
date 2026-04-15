import { describe, test } from "node:test";
import { inspect } from "node:util";

import { Lexer } from "./lexer/index.ts";
import { Parser } from "./parser/index.ts";
import { generateStatefulNodes } from "./evaluator/index.ts";

describe("Lexer", () => {
  describe("findStatefulNodes()", () => {
    const example = (expression: string) => {
      test(`input ${inspect(expression)}`, (t) => {
        const lexer = new Lexer(expression);
        const parser = new Parser(lexer[Symbol.iterator]());
        const nodes = parser.parse();
        const actual = generateStatefulNodes(nodes, []);
        t.assert.snapshot(actual);
      });
    };

    example("a+b+");
    example("(a+b)+c");
    example("(a+)|(b+)");
  });
});
