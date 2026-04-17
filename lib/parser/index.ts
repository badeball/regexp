import type { Token as LexerToken } from "../lexer/index.ts";

export interface Quantifier {
  type: "quantifier";
  child: Node;
  greedy: boolean;
  min: number | null;
  max: number | null;
}

export interface Word {
  type: "word";
  character: string;
}

export interface NonCapturingGroup {
  type: "non-capturing-group";
  name?: string;
  children: NodeList;
}

export interface CapturingGroup {
  type: "capturing-group";
  name?: string;
  children: NodeList;
}

export interface Union {
  type: "union";
  left: Node;
  right: Node;
}

export type Node =
  | Quantifier
  | Word
  | NonCapturingGroup
  | CapturingGroup
  | Union;

export type NodeList = Node[];

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
    const expression: NodeList = [];

    let el: IteratorResult<LexerToken>;

    const parseToken = (token: LexerToken) => {
      if (/\w/.test(token.value)) {
        expression.push({
          type: "word",
          character: token.value,
        });
      } else if (token.value === "?") {
        const last = expression[expression.length - 1];

        if (last.type === "quantifier") {
          last.greedy = false;
        } else {
          expression[expression.length - 1] = {
            type: "quantifier",
            greedy: true,
            min: 0,
            max: 1,
            child: expression[expression.length - 1],
          };
        }
      } else if (token.value === "*") {
        expression[expression.length - 1] = {
          type: "quantifier",
          greedy: true,
          min: 0,
          max: null,
          child: expression[expression.length - 1],
        };
      } else if (token.value === "+") {
        expression[expression.length - 1] = {
          type: "quantifier",
          greedy: true,
          min: 1,
          max: null,
          child: expression[expression.length - 1],
        };
      } else if (token.value === "{") {
        let next = expectToken(this.lexer.next());

        if (next.value === ",") {
          const max = expectToken(this.lexer.next());

          if (/\d+/.test(max.value)) {
            expression[expression.length - 1] = {
              type: "quantifier",
              child: expression[expression.length - 1],
              greedy: true,
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
              child: expression[expression.length - 1],
              greedy: true,
              min,
              max: min,
            };
          } else if (next.value === ",") {
            next = expectToken(this.lexer.next());

            if (next.value === "}") {
              expression[expression.length - 1] = {
                type: "quantifier",
                child: expression[expression.length - 1],
                greedy: true,
                min,
                max: null,
              };
            } else if (/\d+/.test(next.value)) {
              expression[expression.length - 1] = {
                type: "quantifier",
                child: expression[expression.length - 1],
                greedy: true,
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
          children: this.parseTokenList(")"),
        });
      } else if (token.value === "(") {
        expression.push({
          type: "capturing-group",
          children: this.parseTokenList(")"),
        });
      } else if (token.value === "|") {
        const next = expectToken(this.lexer.next());

        expression[expression.length - 1] = {
          type: "union",
          left: expression[expression.length - 1],
          right: (parseToken(next), expression.pop()!),
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
