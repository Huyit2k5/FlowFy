import { Parser, type Values } from "expr-eval";

/**
 * Safe expression evaluator for workflow condition nodes.
 *
 * Replaces the previous `new Function(...)` approach, which allowed arbitrary
 * JavaScript execution (remote code execution). expr-eval parses a restricted
 * arithmetic/boolean/property grammar with NO access to:
 *   - Function constructor, eval, require, process, globalThis, window
 *   - prototype / __proto__ / constructor (assignment & function-def disabled)
 *   - any host object or side-effecting calls
 *
 * Supported: numbers, strings, booleans, null, arithmetic, comparisons
 * (== != < > <= >=), logical (&& || !), ternary, member access (a.b.c),
 * array index, and whitelisted math functions (abs, round, floor, ceil, min,
 * max, length, sqrt, ...).
 */

const parser = new Parser({
  allowMemberAccess: true,
  operators: {
    add: true,
    subtract: true,
    multiply: true,
    divide: true,
    remainder: true,
    comparison: true,
    logical: true,
    conditional: true,
    concatenate: true,
    in: true,
    power: true,
    // explicitly disabled (no side effects / no code injection):
    assignment: false,
    fndef: false,
    factorial: false,
    random: false,
    // useful math, all pure:
    abs: true, round: true, floor: true, ceil: true, trunc: true,
    sqrt: true, sign: true, min: true, max: true, length: true,
    sin: true, cos: true, tan: true,
    log: true, ln: true, log10: true, log2: true,
  },
});

/**
 * Normalize JS-style boolean operators to expr-eval syntax.
 * expr-eval uses `and`/`or`/`not` keywords, not `&&`/`||`/`!` for infix logic.
 * Only rewrites operators outside of quoted string literals.
 */
function normalizeExpression(expr: string): string {
  let out = "";
  let inString = false;
  let quote = "";
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    const prev = expr[i - 1];
    const next = expr[i + 1];
    if (inString) {
      out += ch;
      if (ch === quote && prev !== "\\") inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "&" && next === "&") { out += " and "; i++; continue; }
    if (ch === "|" && next === "|") { out += " or "; i++; continue; }
    // `!` as unary NOT (not part of != / !==)
    if (ch === "!" && next !== "=") { out += " not "; continue; }
    out += ch;
  }
  return out;
}

/**
 * Evaluate a condition expression against a scope of values.
 *
 * @param expression - e.g. "order.total > 5000000"
 * @param scope - map of variable name → value (usually node outputs)
 * @returns boolean result, or null if the expression is invalid (fail-closed)
 */
export function evalCondition(
  expression: string,
  scope: Record<string, unknown>
): boolean | null {
  if (!expression || !expression.trim()) return null;
  try {
    const result = parser.evaluate(normalizeExpression(expression), scope as Values);
    if (result === null || result === undefined) return null;
    return Boolean(result);
  } catch {
    return null;
  }
}

/**
 * Evaluate a boolean expression, coercing to a strict boolean.
 * Returns false on invalid expressions (fail-closed).
 */
export function evalConditionStrict(
  expression: string,
  scope: Record<string, unknown>
): boolean {
  return evalCondition(expression, scope) === true;
}
