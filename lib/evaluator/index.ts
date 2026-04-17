import { inspect } from "node:util";

import type {
  Word,
  Quantifier,
  Union,
  NodeList,
  Node,
} from "../parser/index.ts";
import { assert, ensure } from "../helpers.ts";

interface EmptyMatch {
  type: "empty";
  match: "";
  next?: MatchTree;
}

interface WordMatch {
  type: "word";
  node: Word;
  match: string;
  next?: MatchTree;
}

interface QuantifierMatch {
  type: "quantifier";
  node: Quantifier;
  match: string;
  next?: MatchTree;
}

type MatchTree = EmptyMatch | WordMatch | QuantifierMatch;

interface EvaluationResult {
  match: string;
  groups: {
    match: string;
    start: number;
    name?: string;
  }[];
}

const combineResults = (
  a: EvaluationResult,
  b: EvaluationResult | null,
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

export interface QuantifierState {
  type: "quantifier";
  node: Quantifier;
  iterations: number;
}

export interface UnionState {
  type: "union";
  node: Union;
  direction: "left" | "right";
}

export type NodeState = QuantifierState | UnionState;

export function generateStatefulNodes(
  nodes: NodeList,
  partialStates: NodeState[],
): NodeState[] {
  const states: NodeState[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "capturing-group":
        return generateStatefulNodes(node.children, partialStates);
      case "non-capturing-group":
        return generateStatefulNodes(node.children, partialStates);
      case "quantifier":
        {
          const state = partialStates.shift() ?? {
            type: "quantifier",
            node,
            iterations: node.greedy
              ? (node.max ?? MAX_ITERATIONS)
              : (node.min ?? 0),
          };

          assert(
            state.type === "quantifier",
            "Expected to have a quantifier state",
          );

          states.push(state);

          for (let i = 0; i < state.iterations; i++) {
            states.push(...generateStatefulNodes([node.child], partialStates));
          }
        }
        break;
      case "union":
        {
          const state = partialStates.shift() ?? {
            type: "union",
            node,
            direction: "left",
          };

          assert(state.type === "union", "Expected to have a quantifier state");

          states.push(state);

          states.push(
            ...generateStatefulNodes([node.left], partialStates),
            ...generateStatefulNodes([node.right], partialStates),
          );
        }
        break;
      case "word":
        break;
    }
  }

  return states;
}

export function continueNodeState(state: NodeState) {
  switch (state.type) {
    case "quantifier":
      if (state.node.greedy) {
        state.iterations -= 1;
      } else {
        state.iterations += 1;
      }
      break;
    case "union":
      state.direction = "right";
      break;
  }
}

const MAX_ITERATIONS = 10;

export function isAtLastState(state: NodeState) {
  switch (state.type) {
    case "quantifier":
      if (state.node.greedy) {
        return state.iterations === (state.node.min ?? 0);
      } else {
        return state.iterations === (state.node.max ?? MAX_ITERATIONS);
      }
    case "union":
      return state.direction === "right";
  }
}

export function resolveStatefulNode(node: Node, state: NodeState): NodeList {
  switch (node.type) {
    case "quantifier": {
      assert(
        state.type === "quantifier",
        "Expected to find a quantifier state",
      );

      const nodes = [];

      for (let i = 0; i < state.iterations; i++) {
        nodes.push(node.child);
      }

      return nodes;
    }
    case "union": {
      assert(state.type === "union", "Expected to find a union state");

      if (state.direction === "left") {
        return [node.left];
      } else {
        return [node.right];
      }
    }
    default:
      throw new Error("Unexpected node type: " + node.type);
  }
}

export function _iterateStatesByOne(states: NodeState[], i: number) {
  if (isAtLastState(states[i])) {
    states.pop();
    _iterateStatesByOne(states, i - 1);
  } else {
    continueNodeState(states[i]);
  }
}

export function iterateStatesByOne(states: NodeState[]) {
  _iterateStatesByOne(states, states.length - 1);
}

export function consumeUsingState(
  input: string,
  nodes: NodeList,
  states: NodeState[],
  position = 0,
): EvaluationResult | null {
  if (nodes.length === 0) {
    return {
      match: "",
      groups: [],
    };
  }

  const [node, ...rest] = nodes;

  switch (node.type) {
    case "capturing-group": {
      const match = consumeUsingState(input, node.children, states, position);

      if (match) {
        match.groups.push({
          match: match.match,
          start: position,
        });

        const length = match.match.length;

        return combineResults(
          match,
          consumeUsingState(
            input.slice(length),
            rest,
            states,
            position + length,
          ),
        );
      } else {
        return null;
      }
    }
    case "non-capturing-group": {
      const match = consumeUsingState(input, node.children, states, position);

      if (match) {
        const length = match.match.length;

        return combineResults(
          match,
          consumeUsingState(
            input.slice(length),
            rest,
            states,
            position + length,
          ),
        );
      } else {
        return null;
      }
    }
    case "quantifier":
    case "union": {
      const resolvedNodes = resolveStatefulNode(node, states.shift()!);

      // console.log("resolved nodes", resolvedNodes);

      const match = consumeUsingState(input, resolvedNodes, states, position);

      if (match) {
        const length = match.match.length;

        return combineResults(
          match,
          consumeUsingState(
            input.slice(length),
            rest,
            states,
            position + length,
          ),
        );
      } else {
        return null;
      }
    }
    case "word": {
      if (input[0] === node.character) {
        const consumedRest = consumeUsingState(
          input.slice(1),
          rest,
          states,
          position + 1,
        );

        // console.log("rest", rest);
        // console.log("consumed rest", consumedRest);

        return combineResults(
          {
            match: input[0],
            groups: [],
          },
          consumedRest,
        );
      } else {
        return null;
      }
    }
    case "alternative": {
      if (
        node.nodes.some((alternative) => {
          switch (alternative.type) {
            case "word":
              const match = input[0] === alternative.character;

              return node.negated ? !match : match;
            case "range":
              const start = alternative.left.character.charCodeAt(0);
              const end = alternative.right.character.charCodeAt(0);
              const actual = input.charCodeAt(0);
              const inside = actual >= start && actual <= end;

              return node.negated ? !inside : inside;
            default:
              throw new Error("Unrecognized node type: " + node.type);
          }
        })
      ) {
        return {
          match: input[0],
          groups: [],
        };
      } else {
        return null;
      }
    }
    default:
      throw new Error("Unrecognized node type: " + node.type);
  }
}

export class Evaluator {
  private expression: NodeList;

  constructor(expression: NodeList) {
    // console.log(expression);
    this.expression = expression;
  }

  evaluate(input: string): EvaluationResult | null {
    let states = generateStatefulNodes(this.expression, []);

    let match: EvaluationResult | null;

    let i = 0;

    // console.log("states", states);

    while (
      (match = consumeUsingState(input, this.expression, states.slice(), 0)) ===
      null
    ) {
      const allPermutationsExhausted = states.every((state) =>
        isAtLastState(state),
      );

      // console.log({ allPermutationsExhausted })

      if (allPermutationsExhausted) {
        break;
      }

      iterateStatesByOne(states);

      // console.log("partialStates", states);

      states = generateStatefulNodes(this.expression, states);

      // console.log("states", states);

      if (i++ === 20) {
        throw new Error("Noo!!!");
      }
    }

    return match;
  }
}
