import { Evaluator } from "../evaluator/index.ts";
import { Lexer } from "../lexer/index.ts";
import { Parser } from "../parser/index.ts";

export class RegExp {
  public lastIndex = 0;
  private expression: string;

  constructor(expression: string) {
    this.expression = expression;
  }

  public test(input: string) {
    const lexer = new Lexer(this.expression);
    const parser = new Parser(lexer[Symbol.iterator]());
    const evaluator = new Evaluator(parser.parse());

    return evaluator.evaluate(input) !== null;
  }

  public exec(input: string) {
    for (let i = this.lastIndex; i < input.length; i++) {
      const lexer = new Lexer(this.expression);
      const parser = new Parser(lexer[Symbol.iterator]());
      const evaluator = new Evaluator(parser.parse());

      const match = evaluator.evaluate(input.slice(i));

      if (match !== null) {
        this.lastIndex = i + match[0].length;

        return Object.assign(match, {
          input,
          index: i,
          groups: undefined,
        });
      }
    }

    this.lastIndex = 0;

    return null;
  }
}
