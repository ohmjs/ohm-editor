<template>
  <div id="stepControls" class="flex-row" @keydown="handleKeyDown">
    <button class="outline-btn" title="Jump to beginning"
            :disabled="!canGoToStart" @click.prevent="goToStart">
      <img src="../images/start.png" width="18">
    </button>
    <button class="outline-btn" title="Step back"
            :disabled="!canGoBack" @click.prevent="stepBack">
      <img src="../images/backward.png" width="18">
    </button>
    <button class="outline-btn" title="Step forwards"
            :disabled="!canGoForward" @click.prevent="stepForward">
      <img src="../images/forward.png" width="18">
    </button>
    <button class="outline-btn" title="Jump to end"
            :disabled="!canGoToEnd" @click.prevent="goToEnd">
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
/* eslint-disable no-invalid-this */
'use strict';

const TraceElementWalker = require('../TraceElementWalker');

const Position = {
  START: {},
  END: {},
};

function getVM(el) {
  return el && el.__vue__;
}

// Exports
// -------

module.exports = {
  name: 'step-controls',
  data: function() {
    return {
      rootEl: null,
      canGoToStart: true,
      canGoBack: true,
      canGoForward: false,
      canGoToEnd: false,

      // NOTE: This object is exposed to the entire parse tree as 'injectedStepState'.
      stepState: {
        currentParseStep: '',
        isAtEnd: false,
        exiting: false,

        // Incremented each time the current parse step moves more than a single step.
        jumpCount: 0,
      },
    };
  },
  methods: {
    reset: function(rootEl) {
      this.rootEl = rootEl;
      this._initializeWalker(Position.END);
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
    _initializeWalker: function(initialPos) {
      this._treeWalker = new TraceElementWalker(this.rootEl, {
        startAtEnd: initialPos === Position.END,
      });
      this._updateStepState(true);
    },
    _doStep: function(forward) {
      const curr = getVM(this._treeWalker.currentNode);
      if (curr) {
        // If necessary, expand the node before stepping into it.
        this._maybeExpand(curr, this._treeWalker, forward);
      }

      // Use $nextTick to ensure the DOM reflects the effect of _maybeExpand().
      this.$nextTick(function() {
        if (forward) {
          this._treeWalker.nextNode();
        } else {
          this._treeWalker.previousNode();
        }
        this._updateStepState();
      });
    },
    _maybeExpand: function(node, walker, forward) {
      if (node.isLeaf || !node.collapsed) {
        return;
      }
      const needsExpansion = forward ? !walker.exitingCurrentNode : walker.exitingCurrentNode;
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
    // Updates `this.stepState` based on the current state of the treewalker. Should be
    // called whenever the treewalker's currentNode changes.
    // If `optDidJump` is true, the current parse step moved by more than a single step.
    _updateStepState: function(optDidJump) {
      const curr = getVM(this._treeWalker.currentNode);
      if (curr && curr.id !== this.stepState.currentParseStep) {
        // When returning to a node that was expanded for stepping, re-collapse it.
        this._maybeRecollapse(curr);
      }
      const isAtEnd = this._treeWalker.isAtEnd;
      this.stepState.currentParseStep = curr ? curr.id : '';
      this.stepState.isAtEnd = isAtEnd;
      this.stepState.exiting = this._treeWalker.exitingCurrentNode;
      if (optDidJump) {
        this.stepState.jumpCount++;
      }

      this.canGoToEnd = this.canGoForward = !isAtEnd;
      this.canGoToStart = this.canGoBack = curr || isAtEnd;
    },
    goToStart: function() {
      this._initializeWalker(Position.START);
    },
    stepBack: function() {
      if (this.canGoBack) {
        this._doStep(false);
      }
    },
    stepForward: function() {
      if (this.canGoForward) {
        this._doStep(true);
      }
    },
    goToEnd: function() {
      this._initializeWalker(Position.END);
    },
    stepInto: function(node) {
      this._treeWalker.stepInto(node);
      this._updateStepState(true);
    },
    stepOut: function(node) {
      this._treeWalker.stepOut(node);
      this._updateStepState(true);
    },
  },
};
</script>
