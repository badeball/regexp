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

interface NonCapturingGroup {
  type: "non-capturing-group";
  name?: string;
  child: Expression;
}

interface CapturingGroup {
  type: "capturing-group";
  name?: string;
  child: Expression;
}

interface Union {
  type: "union";
  left: Token;
  right: Token;
}

export type Token =
  | Repeatable
  | Word
  | NonCapturingGroup
  | CapturingGroup
  | Union;

export type Expression = Token[];

export class Parser {
  private lexer: Iterator<LexerToken>;

  constructor(lexer: Iterator<LexerToken>) {
    this.lexer = lexer;
  }

  parse() {
    return this.parseTokenList();
  }

  parseTokenList(until?: string) {
    const expression: Expression = [];

    let el: IteratorResult<LexerToken>;

    const parseToken = (token: LexerToken) => {
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
      } else if (token.value === "(?:") {
        expression.push({
          type: "non-capturing-group",
          child: this.parseTokenList(")"),
        });
      } else if (token.value === "(") {
        expression.push({
          type: "capturing-group",
          child: this.parseTokenList(")"),
        });
      } else if (token.value === "|") {
        const next = this.lexer.next();

        if (next.done) {
          throw new Error("Unexpected end of string");
        }

        expression[expression.length - 1] = {
          type: "union",
          left: expression[expression.length - 1],
          right: (parseToken(next.value), expression.pop()),
        };
      } else {
        throw new Error("Urecognized token " + token.value);
      }
    };

    while ((el = this.lexer.next()).done === false) {
      const { value: token } = el;

      if (token.value === until) {
        return expression;
      }

      parseToken(token);
    }

    if (until) {
      throw new Error("Unexpected end of string, expecting " + until);
    }

    return expression;
  }
}
