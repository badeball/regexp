import type { Token as LexerToken } from "../lexer/index.ts";

interface Repeatable {
  type: "repeatable";
  repeat: "none-or-more" | "one-or-more";
  child: Token;
}

interface Word {
  type: "word";
  character: string;
}

interface CapturingGroup {
  type: "capturing-group";
  name?: string;
  child: Expression;
}

export type Token = Repeatable | Word | CapturingGroup;

export type Expression = Token[];

export class Parser {
  private lexer: Iterator<LexerToken>;

  constructor(lexer: Iterator<LexerToken>) {
    this.lexer = lexer;
  }

  parse(until?: string) {
    const expression: Expression = [];

    let el: IteratorResult<LexerToken>;

    while ((el = this.lexer.next()).done === false) {
      const { value: token } = el;

      // if (until && until === token.value) {
      //   return;
      // }

      if (/\w/.test(token.value)) {
        expression.push({
          type: "word",
          character: token.value,
        });
      } else if (token.value === "*") {
        expression[expression.length - 1] = {
          type: "repeatable",
          repeat: "none-or-more",
          child: expression[expression.length - 1],
        };
      } else if (token.value === "+") {
        expression[expression.length - 1] = {
          type: "repeatable",
          repeat: "one-or-more",
          child: expression[expression.length - 1],
        };
      } else if (token.value === "(") {
        expression.push({
          type: "capturing-group",
          child: new Parser(this.lexer).parse(")"),
        });
      } else if (token.value === ")") {
        if (until === token.value) {
          return expression;
        } else {
          throw new Error(
            "Invalid character at position " +
              token.position +
              ", expected " +
              until
          );
        }
      }
    }

    if (until) {
      throw new Error("Unexpected end of string, expecting " + until);
    }

    return expression;
  }
}
