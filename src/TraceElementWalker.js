/* global NodeFilter */

// Similar to a DOM TreeWalker (https://developer.mozilla.org/en-US/docs/Web/API/TreeWalker),
// but specialized for walking our parse trees. It visits only labeled PExpr nodes, and it
// it visits interior nodes (i.e., `.pexpr.labeled:not(.leaf)` nodes) on the way in AND on
// the way out -- even if they have no actual children. Whereas, the regular TreeWalker just
// does a standard pre-order traversal.
function TraceElementWalker(root, optConfig) {
  const config = optConfig || {};

  this._root = root;
  this._walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode(node) {
        return node.classList.contains('pexpr') &&
          node.classList.contains('labeled')
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    }
  );
  this.isAtEnd = !!config.startAtEnd;
  this.currentNode = null;
  this.exitingCurrentNode = false;

  // "End" means the next position past the last node. After intializing, a call to
  // previousNode() will move the walker back to the last node.
  if (config.startAtEnd) {
    // Find last sibling of first node.
    this._walker.nextNode();
    while (this._walker.nextSibling() != null);
  }
}

TraceElementWalker.prototype._isInInitialState = function () {
  return this._walker.currentNode === this._root;
};

// Advance to the next node using pre-order traversal. But, unlike the regular TreeWalker, visit
// interior nodes twice -- once going in, and once coming out.
TraceElementWalker.prototype.nextNode = function () {
  // Case 1: Entering an interior node or the first node.
  if (
    !this.exitingCurrentNode &&
    (this._isOnInteriorNode() || this._isInInitialState())
  ) {
    const oldCurrentNode = this.currentNode;
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
    this.isAtEnd = true;
  }

  return this.currentNode;
};

TraceElementWalker.prototype._isOnInteriorNode = function () {
  const node = this.currentNode;
  return node && !node.classList.contains('leaf');
};

TraceElementWalker.prototype.previousNode = function () {
  // Case 1: Entering an interior node (or the first node) backwards
  if (this.exitingCurrentNode) {
    const oldCurrentNode = this.currentNode;
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
  if (this.isAtEnd) {
    this.isAtEnd = false;
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

// Make `node` the walker's current node, as if we are just stepping into it.
TraceElementWalker.prototype.stepInto = function (node) {
  this.currentNode = this._walker.currentNode = node;
  this.exitingCurrentNode = false;
  this.isAtEnd = false;
};

// Make `node` the walker's current node, as if we are just stepping out of it.
TraceElementWalker.prototype.stepOut = function (node) {
  this.stepInto(node);
  this.exitingCurrentNode = this._isOnInteriorNode();
};

module.exports = TraceElementWalker;
