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

export function findStatefulNodes(nodes: NodeList): NodeState[] {
  const states: NodeState[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "capturing-group":
        return findStatefulNodes(node.children);
      case "non-capturing-group":
        return findStatefulNodes(node.children);
      case "quantifier":
        {
          states.push(...findStatefulNodes([node.child]), {
            type: "quantifier",
            node,
            iterations: node.max ?? MAX_ITERATIONS,
          });
        }
        break;
      case "union":
        {
          states.push(
            {
              type: "union",
              node,
              direction: "left",
            },
            ...findStatefulNodes([node.left]),
            ...findStatefulNodes([node.right]),
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
      state.iterations -= 1;
      break;
    case "union":
      state.direction = "right";
      break;
  }
}

export function resetNodeState(state: NodeState) {
  switch (state.type) {
    case "quantifier":
      state.iterations = state.node.max ?? MAX_ITERATIONS;
      break;
    case "union":
      state.direction = "left";
      break;
  }
}

const MAX_ITERATIONS = 10;

export function isAtLastState(state: NodeState) {
  switch (state.type) {
    case "quantifier":
      return state.iterations === (state.node.min ?? 0);
    case "union":
      return state.direction === "right";
  }
}

export function resolveStatefulNode(node: Node, states: NodeState[]): NodeList {
  switch (node.type) {
    case "quantifier":
      {
        const state = ensure(
          states.find((state) => state.node === node),
          "Expected to find a node state",
        );

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
      break;
    case "union": {
      const state = ensure(
        states.find((state) => state.node === node),
        "Expected to find a node state",
      );

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
    resetNodeState(states[i]);
    continueNodeState(states[i - 1]);
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
      const resolvedNodes = resolveStatefulNode(node, states);

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
  }
}

export class Evaluator {
  private expression: NodeList;

  constructor(expression: NodeList) {
    this.expression = expression;
  }

  evaluate(input: string, position: number = 0): EvaluationResult | null {
    const states = findStatefulNodes(this.expression);

    let match: EvaluationResult | null;

    while (
      (match = consumeUsingState(input, this.expression, states, 0)) === null
    ) {
      const allPermutationsExhausted = states.every((state) =>
        isAtLastState(state),
      );

      if (allPermutationsExhausted) {
        break;
      }

      iterateStatesByOne(states);
    }

    return match;
  }
}
