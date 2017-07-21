/* global Node, NodeFilter */

'use strict';

var domUtil = require('./domUtil');

// Helpers
// -------

function followsInDocument(a, b) {
  return b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING;
}

// TraceElementWalker
// ------------------

// Similar to a DOM TreeWalker (https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker),
// but specialized for walking our parse trees. It visits only labeled PExpr nodes, and it
// it visits interior nodes (i.e., `.pexpr.labeled:not(.leaf)` nodes) on the way in AND on
// the way out -- even if they have no actual children. Whereas, the regular TreeWalker just
// does a standard pre-order traversal.
function TraceElementWalker(root) {
  this._root = root;
  this._walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: function(node) {
      return node.classList.contains('pexpr') && node.classList.contains('labeled')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
    }
  });
  this._isAtEnd = false;
  this._furthest = this._root;
  this.currentNode = null;
  this.exitingCurrentNode = false;
}

TraceElementWalker.prototype._isInInitialState = function() {
  return this._walker.currentNode === this._root;
};

// Advance to the next node using pre-order traversal. But, unlike the regular TreeWalker, visit
// interior nodes twice -- once going in, and once coming out.
TraceElementWalker.prototype.nextNode = function() {
  // Case 1: Entering an interior node or the first node.
  if (!this.exitingCurrentNode && (this._isOnInteriorNode() || this._isInInitialState())) {
    var oldCurrentNode = this.currentNode;
    if ((this.currentNode = this._walker.firstChild()) != null) {
      this.exitingCurrentNode = false;
    } else {
      // The interior node has no actual children. Stay on the same node, but now we are exiting.
      this.currentNode = oldCurrentNode;
      this.exitingCurrentNode = true;
    }
    return this.currentNode;
  }

  // Case 2: Leaving an interior or leaf node.
  if ((this.currentNode = this._walker.nextSibling()) != null) {
    this.exitingCurrentNode = false;
  } else {
    this.currentNode = this._walker.parentNode();
    this.exitingCurrentNode = this.currentNode != null;
  }

  if (!this.currentNode) {
    this._isAtEnd = true;
  } else if (followsInDocument(this.currentNode, this._furthest)) {
    this._furthest = this.currentNode;
  }

  return this.currentNode;
};

TraceElementWalker.prototype._isOnInteriorNode = function() {
  var node = this.currentNode;
  return node && !node.classList.contains('leaf');
};

TraceElementWalker.prototype.previousNode = function() {
  // Case 1: Entering an interior node (or the first node) backwards
  if (this.exitingCurrentNode) {
    var oldCurrentNode = this.currentNode;
    if ((this.currentNode = this._walker.lastChild()) != null) {
      this.exitingCurrentNode = this._isOnInteriorNode();
    } else {
      // The interior node has no actual children. Stay on the same node, but now we are entering.
      this.currentNode = oldCurrentNode;
      this.exitingCurrentNode = false;
    }
    return this.currentNode;
  }

  // Case 2: Going back to an interior or leaf node.
  if (this._isAtEnd) {
    this._isAtEnd = false;
    this.currentNode = this._walker.currentNode;
    this.exitingCurrentNode = this._isOnInteriorNode();
  } else if ((this.currentNode = this._walker.previousSibling()) != null) {
    this.exitingCurrentNode = this._isOnInteriorNode();
  } else {
    this.currentNode = this._walker.parentNode();
    this.exitingCurrentNode = false;
  }

  // If we reached the beginning, reset to the initial state.
  if (!this.currentNode) {
    this._walker.currentNode = this._root;
  }

  return this.currentNode;
};

TraceElementWalker.prototype.forEachAncestor = function(cb) {
  var node = this.currentNode;
  while (node &&
      (node = domUtil.closestElementMatching('.pexpr.labeled', node.parentNode)) != null) {
    cb(node);
  }
};

TraceElementWalker.prototype.forEachPastFurthest = function(cb) {
  var oldCurrent = this._walker.currentNode;
  this._walker.currentNode = this._furthest;
  while (this._walker.nextNode()) {
    cb(this._walker.currentNode);
  }
  this._walker.currentNode = oldCurrent;
};

module.exports = TraceElementWalker;
