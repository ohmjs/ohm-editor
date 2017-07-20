<template>
  <div id="stepControls" class="flex-row">
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

  module.exports = {
    name: 'step-controls',
    data: function() {
      return {
        canGoToStart: false,
        canGoBack: true,
        canGoForward: true,
        canGoToEnd: true
      };
    },
    created: function() {
      this.reset();
    },
    methods: {
      _updateCurrentParseStep: function() {
        domUtil.clearAll('.currentParseStep');
        domUtil.clearAll('.undecided');

        var el = this._treeWalker.currentNode;
        if (el) {
          el.classList.add('currentParseStep');
          el.hidden = false;

          var isDecided = el.classList.contains('leaf') || this._treeWalker.exitingCurrentNode;
          el.classList.toggle('undecided', !isDecided);
        }
        this._treeWalker.forEachAncestor(function(node) {
          node.hidden = false;
          node.classList.add('undecided');
        });
      },
      reset: function() {
        this._treeWalker = null;
      },
      goToStart: function() {
      },
      stepBack: function() {
        var prev = this._treeWalker.currentNode;
        this._treeWalker.previousNode();
        if (prev) {
          prev.hidden = true;
        }
        this._updateCurrentParseStep();
      },
      stepForward: function() {
        var self = this;
        function doStep() {
          self._treeWalker.nextNode();
          self._updateCurrentParseStep();
        }

        if (this._treeWalker == null) {
          // Initialize tree walker and hide everything.
          this._treeWalker = new TraceElementWalker(domUtil.$('#visualizerBody'));
          domUtil.$$('.pexpr.labeled').forEach(function(el) { el.hidden = true; });
        }

        var curr = this._treeWalker.currentNode;

        // Expand collapsed nodes before trying to step into them, because the children
        // might not be created yet.
        if (curr && curr.classList.contains('collapsed')) {
          curr.__vue__.setCollapsed(false, 0);
          this.$nextTick(doStep);
        } else {
          doStep();
        }
      },
      goToEnd: function() {

      }
    }
  };
</script>
