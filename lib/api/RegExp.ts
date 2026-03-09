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
}
