<template>
  <div id="parseTree">
    <button v-if="showZoomButton" id="zoomOutButton" type="button"
            @click="zoomOut" @mouseover="previewZoom" @mouseout="unpreviewZoom">{{
        zoomButtonLabel
    }}</button>
    <div id="visualizerBody">
      <expanded-input ref="expandedInput" />
      <parse-results :trace="currentRootTrace" :highlightNode="zoomHighlight"
                     :measureInputText="measureInputText"
                     @showContextMenu="showContextMenu"
                     @updateExpandedInput="updateExpandedInput"/>
    </div>
  </div>
</template>

<script>
/* global window */
'use strict';

const Vue = require('vue').default;
const cmUtil = require('../cmUtil');
const domUtil = require('../domUtil');
const isLeaf = require('../traceUtil').isLeaf;
const ohmEditor = require('../ohmEditor');

const expandedInput = require('./expanded-input.vue').default;
const parseResults = require('./parse-results.vue').default;

const ANTICLOCKWISE_OPEN_CIRCLE_ARROW = '\u21BA';

let inputMark;
let grammarMark;
let defMark;

const StepControls = Vue.extend(require('./step-controls.vue').default);

// Helpers
// -------

function couldZoom(currentRootTrace, traceNode) {
  return currentRootTrace !== traceNode &&
           traceNode.succeeded &&
           !isLeaf(ohmEditor.grammar, traceNode);
}

function clearMarks() {
  inputMark = cmUtil.clearMark(inputMark);
  grammarMark = cmUtil.clearMark(grammarMark);
  defMark = cmUtil.clearMark(defMark);
  ohmEditor.ui.grammarEditor.getWrapperElement().classList.remove('highlighting');
  ohmEditor.ui.inputEditor.getWrapperElement().classList.remove('highlighting');
}

// Exports
// -------

module.exports = {
  components: {
    'expanded-input': expandedInput,
    'parse-results': parseResults,
  },
  props: {
    rootTrace: Object,
  },
  data: function() {
    return {
      zoomTrace: null,
      previewedZoomTrace: null,
    };
  },
  computed: {
    zoomButtonLabel: function() {
      return ANTICLOCKWISE_OPEN_CIRCLE_ARROW;
    },
    showZoomButton: function() {
      return this.zoomTrace || this.previewedZoomTrace;
    },
    currentRootTrace: function() {
      return this.zoomTrace || this.rootTrace;
    },
    zoomHighlight: function() {
      if (this.previewedZoomTrace) {
        return {node: this.previewedZoomTrace, class: 'zoomBorder'};
      }
    },
  },
  provide: function() {
    // Create the step controls here so that we can inject its state into the tree.
    this._stepControls = new StepControls({el: '#stepControls'});
    return {
      injectedStepState: this._stepControls.stepState,
      isPossiblyInvolvedInStepping: true,
    };
  },
  mounted: function() {
    window.addEventListener('resize', this.$refs.expandedInput.update);

    ohmEditor.addListener('peek:ruleDefinition', function(ruleName) {
      if (ohmEditor.grammar.rules.hasOwnProperty(ruleName)) {
        const defInterval = ohmEditor.grammar.rules[ruleName].source;
        if (defInterval) {
          const grammarEditor = ohmEditor.ui.grammarEditor;
          defMark = cmUtil.markInterval(grammarEditor, defInterval, 'active-definition', true);
          cmUtil.scrollToInterval(grammarEditor, defInterval);
        }
      }
    });
    ohmEditor.addListener('unpeek:ruleDefinition', clearMarks);
    this.$nextTick(this.resetStepControls);
  },
  updated: function() {
    this.$nextTick(this.resetStepControls);
  },
  methods: {
    zoom: function(traceNode) {
      this.zoomTrace = traceNode;
      clearMarks();
    },
    zoomOut: function() {
      this.zoomTrace = this.previewedZoomTrace = null;
    },
    previewZoom: function() {
      this.previewedZoomTrace = this.zoomTrace;
      this.zoomTrace = null;
    },
    unpreviewZoom: function() {
      this.zoomTrace = this.previewedZoomTrace;
      this.previewedZoomTrace = null;
    },
    showContextMenu: function(data) {
      const zoomEnabled = couldZoom(this.rootTrace, data.traceNode);

      const menuDiv = domUtil.$('#parseTreeMenu');
      menuDiv.style.left = data.x + 'px';
      menuDiv.style.top = data.y + 'px';
      menuDiv.hidden = false;

      const self = this;
      domUtil.addMenuItem('parseTreeMenu', 'getInfoItem', 'Get Info', false);
      domUtil.addMenuItem('parseTreeMenu', 'stepInItem', 'Step Into', true, function() {
        self._stepControls.stepInto(data.el);
      });
      domUtil.addMenuItem('parseTreeMenu', 'stepOutItem', 'Step Out', true, function() {
        self._stepControls.stepOut(data.el);
      });
      domUtil.addMenuItem('parseTreeMenu', 'zoomItem', 'Zoom to Node', zoomEnabled, function() {
        self.zoom(data.traceNode);
      });
      ohmEditor.parseTree.emit('contextMenu', data.el, data.traceNode);
    },
    updateExpandedInput: function(...args) {
      this.$refs.expandedInput.update.apply(null, args);
    },
    measureInputText: function(text) {
      return this.$refs.expandedInput.measureText(text);
    },
    resetStepControls: function() {
      this._stepControls.reset(domUtil.$('#visualizerBody'));
    },
  },
};
</script>
