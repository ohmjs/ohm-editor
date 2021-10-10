/* global ohm */
'use strict';

// A primitive is any expression that should appear as a leaf in the parse tree.
function isPrimitive(grammar, expr) {
  // An application of a primitive rule is considered to be a primitive expression.
  if (expr instanceof ohm.pexprs.Apply && isPrimitiveRule(grammar, expr.ruleName)) {
    return true;
  }
  return expr instanceof ohm.pexprs.Range ||
         expr instanceof ohm.pexprs.Terminal ||
         expr instanceof ohm.pexprs.UnicodeChar;
}

// Primitive rules are ones whose body can't meaningfully be shown.
function isPrimitiveRule(grammar, ruleName) {
  return grammar.rules[ruleName].primitive;
}

function isLRBaseCase(traceNode) {
  // If the children are exactly `[undefined]`, it's the base case for left recursion.
  // TODO: Figure out a better way to handle this when generating traces.
  return traceNode.children.length === 1 && traceNode.children[0] == null;
}

// Return true if `traceNode` should be treated as a leaf node in the parse tree.
function isLeaf(grammar, traceNode) {
  if (isPrimitive(grammar, traceNode.expr)) {
    return true;
  }
  if (isLRBaseCase(traceNode)) {
    return true;
  }
  return traceNode.children.length === 0;
}

module.exports = {
  isLeaf,
  isLRBaseCase,
  isPrimitive,
  isPrimitiveRule,
};
