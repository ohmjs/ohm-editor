<template>
  <div id="stepControls" class="flex-row" @keydown="handleKeyDown">
    <button class="outline-btn" :disabled="!canGoToStart" @click.prevent="goToStart">
      <img src="../images/start.png" width="18">
    </button>
    <button class="outline-btn" :disabled="!canGoBack" @click.prevent="stepBack">
      <img src="../images/backward.png" width="18">
    </button>
    <button class="outline-btn" :disabled="!canGoForward" @click.prevent="stepForward">
      <img src="../images/forward.png" width="18">
    </button>
    <button class="outline-btn" :disabled="!canGoToEnd" @click.prevent="goToEnd">
      <img src="../images/end.png" width="18">
    </button>
  </div>
</template>

<style>
  #stepControls {
    justify-content: right;
    margin-top: 8px;
  }
  #stepControls button {
    background-color: transparent;
    border: 0;
    border-radius: 3px;
    height: 17px;
    margin: 0;
    padding: 0;
    width: 16px;
  }
  #stepControls button > img {
    margin: -1px;
  }
  #stepControls button:active {
    background-color: rgba(2, 117, 216, 0.5);
    box-shadow: 0 0 0 2px rgba(2, 117, 216, 0.5);
    filter: brightness(85%);
  }
  #stepControls button:focus {
    background-color: rgba(2, 117, 216, 0.5);    
  }
  #stepControls button[disabled] {
    filter: grayscale(1.0);
    opacity: 0.7;
  }
  #stepControls button:not(:last-child) {
    margin-right: 4px;
  } 
</style>

<script>
  'use strict';

  var TraceElementWalker = require('../TraceElementWalker');
  var domUtil = require('../domUtil');

  var START = {};

  function getVM(el) {
    return el && el.__vue__;
  }

  // Exports
  // -------

  module.exports = {
    name: 'step-controls',
    data: function() {
      return {
        canGoToStart: true,
        canGoBack: true,
        canGoForward: false,
        canGoToEnd: false
      };
    },
    created: function() {
      this.reset();
    },
    methods: {
      reset: function() {
        this._treeWalker = null;
        this._expandedForStepping = {};
      },
      handleKeyDown: function(e) {
        switch (e.keyCode) {
          case 37: this.stepBack(); break;
          case 38: this.goToStart(); break;
          case 39: this.stepForward(); break;
          case 40: this.goToEnd(); break;
          default: return;
        }
        e.preventDefault();
      },
      _initializeWalker: function(initialNode, optAtExit) {
        var exiting = !!optAtExit;
        var walker = new TraceElementWalker(domUtil.$('#visualizerBody'));
        if (initialNode !== START) {
          // Walk until the requested node is reached.
          while (walker.nextNode() != null) {
            if (walker.currentNode === initialNode && walker.exitingCurrentNode === exiting) {
              break;
            }
            // As we step over nodes, mark them as decided and not hidden.
            var vm = getVM(walker.currentNode);
            vm.hiddenForStepping = false;
            vm.isUndecided = false;
          }
        }
        // Any nodes that have not yet been seen on the walk must be hidden.
        walker.forEachPastFurthest(function(node) {
          getVM(node).hiddenForStepping = true;
        });
        return walker;
      },
      _doStep: function(forward) {
        var curr = getVM(this._treeWalker.currentNode);
        if (curr) {
          // If necessary, expand the node before stepping into it.
          this._maybeExpand(curr, this._treeWalker, forward);

          curr.isCurrentParseStep = false;

          // When going backwards, hide the node if we're not moving to its subtree.
          if (!forward) {
            curr.hiddenForStepping = !this._treeWalker.exitingCurrentNode;
          }
        }

        // Use $nextTick to ensure the DOM reflects the effect of _maybeExpand().
        this.$nextTick(function() {
          var next = getVM(
              forward ? this._treeWalker.nextNode() : this._treeWalker.previousNode());
          if (next) {
            // When we step into a node, unhide it and mark it decided -- except interior
            // nodes, which are only decided when exiting the node (visiting on the way out).
            next.hiddenForStepping = false;
            next.isCurrentParseStep = true;
            next.isUndecided = !(next.isLeaf || this._treeWalker.exitingCurrentNode);

            // Each ancestor of the current parse node must be undecided.
            this._treeWalker.forEachAncestor(function(node) {
              getVM(node).isUndecided = true;
            });

            // When returning to a node that was expanded for stepping, re-collapse it.
            this._maybeRecollapse(next);
          }
          this.canGoBack = next || this._treeWalker._isAtEnd;
          this.canGoToStart = this.canGoBack;

          this.canGoForward = !this._treeWalker._isAtEnd;
          this.canGoToEnd = this.canGoForward;
        });
      },
      _maybeExpand: function(node, walker, forward) {
        if (node.isLeaf || !node.collapsed) {
          return;
        }
        var needsExpansion = forward ? !walker.exitingCurrentNode : walker.exitingCurrentNode;
        if (needsExpansion) {
          node.setCollapsed(false, 0);
          this._expandedForStepping[node.id] = true;
        }
      },
      _maybeRecollapse: function(node) {
        // NOTE: It doesn't matter which way we're going! If it's in this._expandedForStepping,
        // and `node` is the current parse step, then by definition we've left the subtree.
        if (this._expandedForStepping[node.id]) {
          node.setCollapsed(true, 0);
          delete this._expandedForStepping[node.id];
        }
      },
      goToStart: function() {
        this._treeWalker = this._initializeWalker(START);
        this.canGoBack = false;
        this.canGoForward = !this._treeWalker._isAtEnd;
      },
      stepBack: function() {
        if (!this.canGoBack) {
          return;
        }
        // By default, it's as if we're at the end, but initialize the walker lazily.
        if (this._treeWalker === null) {
          this.goToEnd();
        }
        this._doStep(false);
      },
      stepForward: function() {
        if (!this.canGoForward) {
          return;
        }
        this._doStep(true);
      },
      goToEnd: function() {
        this._treeWalker = this._initializeWalker(null);
      }
    }
  };
</script>
