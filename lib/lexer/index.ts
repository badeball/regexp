const lexer = new RegExp(
  [
    "\\w",
    "\\d",
    "\\+",
    "\\*",
    "\\?",
    "\\{",
    "\\,",
    "\\}",
    "\\(\\?:",
    "\\(",
    "\\)",
    "\\|",
  ].join("|"),
  "g"
);

export interface Token {
  value: string;
  position: number;
}

export class Lexer {
  private tokens: Token[];

  constructor(expression: string) {
    const match = expression.match(lexer);

    if (match === null) {
      throw new Error("Invalid character at position 0");
    }

    if (match.join("") !== expression) {
      var position = 0;

      for (var i = 0; i < match.length; i++) {
        if (expression.indexOf(match[i]) !== position) {
          break;
        }

        position += match[i].length;
      }

      throw new Error("Invalid character at position " + position);
    }

    this.tokens = match.map(function (token) {
      return {
        value: token,
        position: 0,
      };
    });

    this.tokens.reduce(function (previousToken, nextToken) {
      nextToken.position = previousToken.position + previousToken.value.length;
      return nextToken;
    });
  }

  [Symbol.iterator](): Iterator<Token> {
    let position = 0;

    const self = this;

    return {
      next() {
        if (position < self.tokens.length) {
          return {
            done: false,
            value: self.tokens[position++],
          };
        } else {
          return {
            done: true,
            value: undefined,
          };
        }
      },
    };
  }
}
