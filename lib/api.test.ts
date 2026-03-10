import { describe, test } from "node:test";
import { deepEqual } from "node:assert/strict";
import { inspect } from "node:util";

import { RegExp } from "./api/index.ts";

describe("API", () => {
  describe("RegExp.test()", () => {
    const example = (expr: string, input: string) => {
      test(`expression ${inspect(expr)} with ${inspect(input)}`, () => {
        const expected = new globalThis.RegExp(expr).test(input);
        const actual = new RegExp(expr).test(input);
        deepEqual(actual, expected);
      });
    };

    example("ab*c", "ac");
    example("ab*c", "abc");
    example("ab*c", "abbc");
    example("ab+c", "abc");
    example("ab+c", "abbc");
    example("ab+b", "abb");
    example("a(?:b)c", "abc");
  });

  describe("RegExp.exec()", () => {
    const example = (expr: string, input: string) => {
      test(`expression ${inspect(expr)} with ${inspect(input)}`, () => {
        const expected = new globalThis.RegExp(expr).exec(input);
        const actual = new RegExp(expr).exec(input);
        deepEqual(actual, expected);
      });
    };

    example("a(b)c", "abc");
    example("a(?:b)c", "abc");
    example("a|b", "a");
    example("a|b", "b");
    example("a*a", "a");
    example("a*a", "aa");
  });
});
