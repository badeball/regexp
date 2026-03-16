import type { Token as LexerToken } from "../lexer/index.ts";

interface CommonQuantifiers {
  type: "quantifier";
  repeat: "none-or-one" | "none-or-more" | "one-or-more";
  child: Token;
}

interface ExactQuantifiers {
  type: "quantifier";
  repeat: "exact";
  child: Token;
  min?: number;
  max?: number;
}

type Quantifiers = CommonQuantifiers | ExactQuantifiers;

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
  | Quantifiers
  | Word
  | NonCapturingGroup
  | CapturingGroup
  | Union;

export type Expression = Token[];

const expectToken = (maybe: IteratorResult<LexerToken>): LexerToken => {
  if (maybe.done) {
    throw new Error("Unexpected end of string");
  }

  return maybe.value;
};

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
      } else if (token.value === "?") {
        expression[expression.length - 1] = {
          type: "quantifier",
          repeat: "none-or-one",
          child: expression[expression.length - 1],
        };
      } else if (token.value === "*") {
        expression[expression.length - 1] = {
          type: "quantifier",
          repeat: "none-or-more",
          child: expression[expression.length - 1],
        };
      } else if (token.value === "+") {
        expression[expression.length - 1] = {
          type: "quantifier",
          repeat: "one-or-more",
          child: expression[expression.length - 1],
        };
      } else if (token.value === "{") {
        let next = expectToken(this.lexer.next());

        if (next.value === ",") {
          const max = expectToken(this.lexer.next());

          if (/\d+/.test(max.value)) {
            expression[expression.length - 1] = {
              type: "quantifier",
              repeat: "exact",
              child: expression[expression.length - 1],
              min: null,
              max: parseInt(max.value, 10),
            };

            next = expectToken(this.lexer.next());

            if (next.value !== "}") {
              throw new Error("Unexpected token " + token.value);
            }
          } else {
            throw new Error("Unexpected token " + max.value);
          }
        } else if (/\d+/.test(next.value)) {
          const min = parseInt(next.value, 10);

          next = expectToken(this.lexer.next());

          if (next.value === "}") {
            expression[expression.length - 1] = {
              type: "quantifier",
              repeat: "exact",
              child: expression[expression.length - 1],
              min,
              max: min,
            };
          } else if (next.value === ",") {
            next = expectToken(this.lexer.next());

            if (next.value === "}") {
              expression[expression.length - 1] = {
                type: "quantifier",
                repeat: "exact",
                child: expression[expression.length - 1],
                min,
                max: null,
              };
            } else if (/\d+/.test(next.value)) {
              expression[expression.length - 1] = {
                type: "quantifier",
                repeat: "exact",
                child: expression[expression.length - 1],
                min,
                max: parseInt(next.value, 10),
              };

              next = expectToken(this.lexer.next());

              if (next.value !== "}") {
                throw new Error("Unexpected token " + token.value);
              }
            } else {
              throw new Error("Unexpected token " + token.value);
            }
          } else {
            throw new Error("Unexpected token " + token.value);
          }
        } else {
          throw new Error("Unexpected token " + token.value);
        }
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
        const next = expectToken(this.lexer.next());

        expression[expression.length - 1] = {
          type: "union",
          left: expression[expression.length - 1],
          right: (parseToken(next), expression.pop()),
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
