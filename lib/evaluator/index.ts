import { inspect } from "node:util";
import type { Expression } from "../parser/index.ts";

export class Evaluator {
  private expression: Expression;

  constructor(expression: Expression) {
    this.expression = expression;
  }

  evaluate(input: string): string | null {
    let position = 0;

    // console.log(inspect(this.expression));

    for (const node of this.expression) {
      if (node.type === "word") {
        if (input[position] === node.character) {
          position++;
        } else {
          return null;
        }
      } else if (node.type === "repeatable") {
        if (node.repeat === "none-or-more") {
          let match: string;

          while (
            (match = new Evaluator([node.child]).evaluate(
              input.slice(position)
            ))
          ) {
            position += match.length;
          }
        } else {
          let match = new Evaluator([node.child]).evaluate(
            input.slice(position)
          );

          if (match === null) {
            return null;
          } else {
            position += match.length;
          }

          while (
            (match = new Evaluator([node.child]).evaluate(
              input.slice(position)
            ))
          ) {
            position += match.length;
          }
        }
      }
    }

    return input.slice(0, position);
  }
}
