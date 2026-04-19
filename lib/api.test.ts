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

    example("ab?c", "ac");
    example("ab?c", "abc");
    example("ab?c", "abbc");
    example("ab*c", "ac");
    example("ab*c", "abc");
    example("ab*c", "abbc");
    example("ab+c", "ac");
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
    example("a|b", "b");
    example("a*", "b");
    example("a*a", "a");
    example("a*a", "aa");
    example("a*?a", "aa");
    example("a+a", "a");
    example("a+a", "aa");
    example("a{1}a", "a");
    example("a{1}a", "aa");
    example("a{1,}a", "a");
    example("a{1,}a", "aa");
    example("a{1,}a", "aaa");
    // Why doesn't this match in JS?
    //  example("a{,1}a", "a");
    //  example("a{,1}a", "aa");
    //  example("a{,1}a", "aaa");
    example("a{1,2}a", "a");
    example("a{1,2}a", "aa");
    example("a{1,2}a", "aaa");
    example("a(?:b|c){1,2}d", "abd");
    example("a(?:b|c){1,2}d", "abbd");
    example("a(?:b|c){1,2}d", "acd");
    example("a(?:b|c){1,2}d", "accd");
    example("a(?:b|c){1,2}d", "abcd");
    example("a(?:b|c){1,2}d", "acbd");
    example("[a-c]", "a");
    example("[a-c]", "b");
    example("[a-c]", "c");
    example("[-a]", "a");
    example("[-a]", "-");
    example("[a-]", "a");
    example("[a-]", "-");
    example("[^a-c]", "a");
    example("[^a-c]", "d");
  });
});
