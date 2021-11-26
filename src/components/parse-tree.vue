<template>
  <div id="parseTree">
    <button
      v-if="showZoomButton"
      id="zoomOutButton"
      type="button"
      @click="zoomOut"
      @mouseover="previewZoom"
      @mouseout="unpreviewZoom"
    >
      {{ zoomButtonLabel }}
    </button>
    <div id="visualizerBody">
      <expanded-input ref="expandedInput" />
      <parse-results
        :trace="currentRootTrace"
        :highlightNode="zoomHighlight"
        :measureInputText="measureInputText"
        @showContextMenu="showContextMenu"
        @updateExpandedInput="updateExpandedInput"
      />
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import * as cmUtil from '../cmUtil';
import * as domUtil from '../domUtil';
import {isLeaf} from '../traceUtil';
import ohmEditor from '../ohmEditor';

import expandedInput from './expanded-input.vue';
import parseResults from './parse-results.vue';

import StepControlsBase from './step-controls.vue';

const ANTICLOCKWISE_OPEN_CIRCLE_ARROW = '\u21BA';

let inputMark;
let grammarMark;
let defMark;

const StepControls = Vue.extend(StepControlsBase);

// Helpers
// -------

function couldZoom(currentRootTrace, traceNode) {
  return (
    currentRootTrace !== traceNode &&
    traceNode.succeeded &&
    !isLeaf(ohmEditor.grammar, traceNode)
  );
}

function clearMarks() {
  inputMark = cmUtil.clearMark(inputMark);
  grammarMark = cmUtil.clearMark(grammarMark);
  defMark = cmUtil.clearMark(defMark);
  ohmEditor.ui.grammarEditor
    .getWrapperElement()
    .classList.remove('highlighting');
  ohmEditor.ui.inputEditor.getWrapperElement().classList.remove('highlighting');
}

// Exports
// -------

export default {
  components: {
    'expanded-input': expandedInput,
    'parse-results': parseResults,
  },
  props: {
    rootTrace: Object,
  },
  data() {
    return {
      zoomTrace: null,
      previewedZoomTrace: null,
    };
  },
  computed: {
    zoomButtonLabel() {
      return ANTICLOCKWISE_OPEN_CIRCLE_ARROW;
    },
    showZoomButton() {
      return this.zoomTrace || this.previewedZoomTrace;
    },
    currentRootTrace() {
      return this.zoomTrace || this.rootTrace;
    },
    zoomHighlight() {
      if (this.previewedZoomTrace) {
        return {node: this.previewedZoomTrace, class: 'zoomBorder'};
      }
      return undefined;
    },
  },
  provide() {
    // Create the step controls here so that we can inject its state into the tree.
    this._stepControls = new StepControls({el: '#stepControls'});
    return {
      injectedStepState: this._stepControls.stepState,
      isPossiblyInvolvedInStepping: true,
    };
  },
  mounted() {
    window.addEventListener('resize', this.$refs.expandedInput.update);

    ohmEditor.addListener('peek:ruleDefinition', function (grammar, ruleName) {
      const cm = ohmEditor.ui.grammarEditor;
      const defInterval = grammar.rules[ruleName].source;

      // If the text in the grammar editor doesn't match the interval contents, then it's
      // an external rule, and this handler should ignore it.
      if (defInterval && cmUtil.containsInterval(cm, defInterval)) {
        defMark = cmUtil.markInterval(
          cm,
          defInterval,
          'active-definition',
          true
        );
        cmUtil.scrollToInterval(cm, defInterval);
      }
    });
    ohmEditor.addListener('unpeek:ruleDefinition', clearMarks);
    this.$nextTick(this.resetStepControls);
  },
  updated() {
    this.$nextTick(this.resetStepControls);
  },
  methods: {
    zoom(traceNode) {
      this.zoomTrace = traceNode;
      clearMarks();
    },
    zoomOut() {
      this.zoomTrace = this.previewedZoomTrace = null;
    },
    previewZoom() {
      this.previewedZoomTrace = this.zoomTrace;
      this.zoomTrace = null;
    },
    unpreviewZoom() {
      this.zoomTrace = this.previewedZoomTrace;
      this.previewedZoomTrace = null;
    },
    showContextMenu(data) {
      const zoomEnabled = couldZoom(this.rootTrace, data.traceNode);

      const menuDiv = domUtil.$('#parseTreeMenu');
      menuDiv.style.left = data.x + 'px';
      menuDiv.style.top = data.y + 'px';
      menuDiv.hidden = false;

      const self = this;
      domUtil.addMenuItem('parseTreeMenu', 'getInfoItem', 'Get Info', false);
      domUtil.addMenuItem(
        'parseTreeMenu',
        'stepInItem',
        'Step Into',
        true,
        function () {
          self._stepControls.stepInto(data.el);
        }
      );
      domUtil.addMenuItem(
        'parseTreeMenu',
        'stepOutItem',
        'Step Out',
        true,
        function () {
          self._stepControls.stepOut(data.el);
        }
      );
      domUtil.addMenuItem(
        'parseTreeMenu',
        'zoomItem',
        'Zoom to Node',
        zoomEnabled,
        function () {
          self.zoom(data.traceNode);
        }
      );
      ohmEditor.parseTree.emit('contextMenu', data.el, data.traceNode);
    },
    updateExpandedInput(...args) {
      this.$refs.expandedInput.update.apply(null, args);
    },
    measureInputText(text) {
      return this.$refs.expandedInput.measureText(text);
    },
    resetStepControls() {
      this._stepControls.reset(domUtil.$('#visualizerBody'));
    },
  },
};
</script>
