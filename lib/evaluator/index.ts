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

type ConsumptionResult = string[] | null;

export function consume(
  input: string,
  expression: Expression
): ConsumptionResult;

export function consume(
  input: string,
  expression: Expression
): ConsumptionResult {
  // console.log("Testing", input, "with", expression);

  if (input.length === 0) {
    return null;
  }

  if (expression.length > 1) {
    const [token, ...rest] = expression;

    let matches = consume(input, [token]);

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
    case "quantifier": {
      const matches = new Set<string>();

      let x = 1;

      let submatches = consume(input, [token.child]);

      // console.log("Submatches", submatches);

      if (token.min <= 1 && submatches !== null) {
        for (const submatch of submatches) {
          matches.add(submatch);
        }
      }

      while (
        submatches !== null &&
        (token.max === null || x < token.max) &&
        (submatches =
          submatches.flatMap((submatch) => {
            return (
              consume(input.slice(submatch.length), [token.child]) ?? []
            ).map((match) => submatch + match);
          }) ?? []).length > 0
      ) {
        // console.log("Submatches", submatches);
        if (
          (token.min === null || x >= token.min) &&
          (token.max === null || x <= token.max)
        ) {
          for (const submatch of submatches) {
            matches.add(submatch);
          }
        }
        x++;
      }

      // This makes it greedy by default.
      const result = Array.from(matches.values()).toSorted(
        (a, b) => b.length - a.length
      );

      if (token.min === 0) {
        // console.log("Result", [...result, ""]);
        return [...result, ""];
      } else {
        // console.log("Result", result);
        return result;
      }
    }
    case "non-capturing-group": {
      return consume(input, token.child);
    }
    case "union": {
      const left = consume(input, [token.left]) ?? [];
      const right = consume(input, [token.right]) ?? [];

      return left.concat(...right);
    }
    default:
      throw new Error("Unrecognized token type: " + token.type);
  }
}

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

        // console.log("Match", match);

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
      case "quantifier": {
        let matches = consume(input, [token]);

        // console.log("Matches", matches);

        if (matches === null) {
          if (token.repeat === "one-or-more") {
            return null;
          } else {
            return {
              match: "",
              groups: [],
            };
          }
        }

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
