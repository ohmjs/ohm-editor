/* global ohm */
'use strict';

var ohmEditor = require('./ohmEditor');

function isPrimitive(expr) {
  return expr instanceof ohm.pexprs.Terminal ||
         expr instanceof ohm.pexprs.Range ||
         expr instanceof ohm.pexprs.UnicodeChar;
}

function isLRBaseCase(traceNode) {
  // If the children are exactly `[undefined]`, it's the base case for left recursion.
  // TODO: Figure out a better way to handle this when generating traces.
  return traceNode.children.length === 1 && traceNode.children[0] == null;
}

// Return true if `traceNode` should be treated as a leaf node in the parse tree.
function isLeaf(traceNode) {
  var pexpr = traceNode.expr;
  if (isPrimitive(pexpr)) {
    return true;
  }
  if (pexpr instanceof ohm.pexprs.Apply) {
    // If the rule body has no source, treat its implementation as opaque.
    var body = ohmEditor.grammar.rules[pexpr.ruleName].body;
    if (!body.source) {
      return true;
    }
  }
  if (isLRBaseCase(traceNode)) {
    return true;
  }
  return traceNode.children.length === 0;
}

module.exports = {
  isLeaf: isLeaf,
  isLRBaseCase: isLRBaseCase,
  isPrimitive: isPrimitive
};
