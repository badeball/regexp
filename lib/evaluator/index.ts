import { inspect } from "node:util";

import type { Expression, Token } from "../parser/index.ts";

interface EvaluationResult {
  match: string;
  groups: {
    match: string;
    start: number;
    name?: string;
  }[];
}

export const consume = (
  input: string,
  expression: Expression
): string[] | null => {
  // console.log("Testing", input, "with", expression);
  if (input.length === 0) {
    return null;
  }

  if (expression.length > 1) {
    const [token, ...rest] = expression;

    let matches: string[] = consume(input, [token]);

    //console.log("matches", matches);

    for (let i = 0; i < rest.length; i++) {
      matches = matches.flatMap((match) => {
        const subMatch = consume(input.slice(match.length), [rest[i]]);

        //console.log("subMatch", subMatch);

        return subMatch === null ? [] : subMatch.map((el) => match + el);
      });
    }

    //console.log("matches afterwards", matches);

    return matches;
  }

  const [token] = expression;

  switch (token.type) {
    case "word":
      if (input[0] === token.character) {
        return [input[0]];
      } else {
        return null;
      }
    case "repeatable": {
      const matches = new Set<string>();

      let i = 0;
      let match: string[] | null;

      while ((match = consume(input.slice(i), [token.child])) !== null) {
        // console.log(match);
        for (const el of match) {
          // console.log("Adding", input.slice(0, i) + match);
          matches.add(input.slice(0, i) + match);
        }
        i++;
      }

      // This makes it greedy by default.
      const result = Array.from(matches.values()).toSorted(
        (a, b) => b.length - a.length
      );

      if (token.repeat === "none-or-more") {
        // console.log(result);
        return [...result, ""];
      } else {
        return result.length > 0 ? result : null;
      }
    }
    case "union": {
    }
    default:
      throw new Error("Unrecognized token type: " + token.type);
  }
};

const combineResults = (
  a: EvaluationResult,
  b: EvaluationResult | null
): EvaluationResult | null => {
  if (b === null) {
    return null;
  } else {
    return {
      match: a.match + b.match,
      groups: [...a.groups, ...b.groups],
    };
  }
};

export class Evaluator {
  private expression: Expression;

  constructor(expression: Expression) {
    this.expression = expression;
  }

  evaluate(input: string, position: number = 0): EvaluationResult | null {
    const [token, ...rest] = this.expression;

    if (!token) {
      return {
        match: "",
        groups: [],
      };
    }

    switch (token.type) {
      case "word": {
        const match = consume(input, [token]);

        if (match) {
          return combineResults(
            {
              match: match[0],
              groups: [],
            },
            new Evaluator(rest).evaluate(input.slice(1), position + 1)
          );
        } else {
          return null;
        }
      }
      case "repeatable": {
        let matches = consume(input, [token]);

        const results = matches.map((match) => {
          return combineResults(
            {
              match: match,
              groups: [],
            },
            new Evaluator(rest).evaluate(
              input.slice(match.length),
              position + match.length
            )
          );
        });

        return results.find((result) => result !== null) ?? null;
      }
      case "non-capturing-group": {
        let matches = consume(input, token.child);

        const results = matches.map((match) => {
          return combineResults(
            {
              match: match,
              groups: [],
            },
            new Evaluator(rest).evaluate(
              input.slice(match.length),
              position + match.length
            )
          );
        });

        return results.find((result) => result !== null) ?? null;
      }
      case "capturing-group": {
        let matches = consume(input, token.child);

        const results = matches.map((match) => {
          return combineResults(
            {
              match: match,
              groups: [
                {
                  match,
                  start: position,
                },
              ],
            },
            new Evaluator(rest).evaluate(
              input.slice(match.length),
              position + match.length
            )
          );
        });

        return results.find((result) => result !== null) ?? null;
      }
      case "union": {
        let matches = [
          ...(consume(input, [token.left]) ?? []),
          ...(consume(input, [token.right]) ?? []),
        ];

        const results = matches.map((match) => {
          return combineResults(
            {
              match: match,
              groups: [],
            },
            new Evaluator(rest).evaluate(
              input.slice(match.length),
              position + match.length
            )
          );
        });

        return results.find((result) => result !== null) ?? null;
      }
      default:
        throw new Error("Unrecognized token type: " + token.type);
    }
  }

  // evaluate(input: string): string[] | null {
  //   let position = 0;

  //   const captured: string[] = [];

  //   // console.log(inspect(this.expression));

  //   for (const node of this.expression) {
  //     if (node.type === "word") {
  //       if (input[position] === node.character) {
  //         position++;
  //       } else {
  //         return null;
  //       }
  //     } else if (node.type === "repeatable") {
  //       if (node.repeat === "none-or-more") {
  //         let match: string[];

  //         while (
  //           (match = new Evaluator([node.child]).evaluate(
  //             input.slice(position)
  //           ))
  //         ) {
  //           position += match.length;
  //         }
  //       } else {
  //         let match = new Evaluator([node.child]).evaluate(
  //           input.slice(position)
  //         );

  //         if (match === null) {
  //           return null;
  //         } else {
  //           position += match.length;
  //         }

  //         while (
  //           (match = new Evaluator([node.child]).evaluate(
  //             input.slice(position)
  //           ))
  //         ) {
  //           position += match.length;
  //         }
  //       }
  //     } else if (node.type === "non-capturing-group") {
  //       let match = new Evaluator(node.child).evaluate(input.slice(position));

  //       if (match === null) {
  //         return null;
  //       } else {
  //         position += match.length;
  //       }
  //     } else if (node.type === "capturing-group") {
  //       let match = new Evaluator(node.child).evaluate(input.slice(position));

  //       if (match === null) {
  //         return null;
  //       } else {
  //         captured.push(...match);
  //         position += match.length;
  //       }
  //     } else if (node.type === "union") {
  //       let match = new Evaluator([node.left]).evaluate(input.slice(position));

  //       if (match) {
  //         position += match.length;
  //       } else {
  //         match = new Evaluator([node.right]).evaluate(input.slice(position));

  //         if (match) {
  //           position += match.length;
  //         } else {
  //           return null;
  //         }
  //       }
  //     } else {
  //       throw new Error("Unrecognized token type: " + node.type);
  //     }
  //   }

  //   return [input.slice(0, position), ...captured];
  // }
}
