/* eslint-env browser */
/* global CheckedEmitter, Vue */

'use strict';

var cmUtil = require('./cmUtil');
var domUtil = require('./domUtil');
var isLeaf = require('./traceUtil').isLeaf;
var ohmEditor = require('./ohmEditor');

var expandedInput = require('./components/expanded-input.vue');
var parseResults = require('./components/parse-results.vue');

var $ = domUtil.$;

var ANTICLOCKWISE_OPEN_CIRCLE_ARROW = '\u21BA';

var inputMark;
var grammarMark;
var defMark;

function clearMarks() {
  inputMark = cmUtil.clearMark(inputMark);
  grammarMark = cmUtil.clearMark(grammarMark);
  defMark = cmUtil.clearMark(defMark);
  ohmEditor.ui.grammarEditor.getWrapperElement().classList.remove('highlighting');
  ohmEditor.ui.inputEditor.getWrapperElement().classList.remove('highlighting');
}

// Trace element helpers
// ---------------------

function couldZoom(currentRootTrace, traceNode) {
  return currentRootTrace !== traceNode &&
         traceNode.succeeded &&
         !isLeaf(traceNode);
}

// parse-results
// -------------

var parseTreeVue = new Vue({
  el: '#parseTree',
  components: {
    'expanded-input': expandedInput,
    'parse-results': parseResults
  },
  data: {
    rootTrace: null,
    zoomTrace: null,
    previewedZoomTrace: null
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
    }
  },
  template: [
    '<div id="parseTree">',
    '  <button v-if="showZoomButton" id="zoomOutButton" type="button"',
    '          @click="zoomOut" @mouseover="previewZoom" @mouseout="unpreviewZoom">{{',
    '      zoomButtonLabel',
    '  }}</button>',
    '  <div id="visualizerBody">',
    '    <expanded-input ref="expandedInput" />',
    '    <parse-results :trace="currentRootTrace" :highlightNode="zoomHighlight"',
    '                   :measureInputText="measureInputText"',
    '                   @showContextMenu="showContextMenu"',
    '                   @updateExpandedInput="updateExpandedInput"/>',
    '  </div>',
    '</div>'
  ].join(''),
  mounted: function() {
    window.addEventListener('resize', this.$refs.expandedInput.update);
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
      var zoomEnabled = couldZoom(this.rootTrace, data.traceNode);

      var menuDiv = $('#parseTreeMenu');
      menuDiv.style.left = data.x + 'px';
      menuDiv.style.top = data.y + 'px';
      menuDiv.hidden = false;

      var self = this;
      domUtil.addMenuItem('parseTreeMenu', 'getInfoItem', 'Get Info', false);
      domUtil.addMenuItem('parseTreeMenu', 'zoomItem', 'Zoom to Node', zoomEnabled, function() {
        self.zoom(data.traceNode);
      });
      ohmEditor.parseTree.emit('contextMenu', data.el, data.traceNode);
    },
    updateExpandedInput: function(/* ...args */) {
      this.$refs.expandedInput.update.apply(null, arguments);
    },
    measureInputText: function(text) {
      return this.$refs.expandedInput.measureText(text);
    }
  }
});

var parseTree = ohmEditor.parseTree = new CheckedEmitter();
parseTree.vue = parseTreeVue;

// When the user makes a change in either editor, show the bottom overlay to indicate
// that the parse tree is out of date.
function showBottomOverlay(changedEditor) {
  $('#bottomSection .overlay').style.width = '100%';
}
ohmEditor.addListener('change:inputEditor', showBottomOverlay);
ohmEditor.addListener('change:grammarEditor', showBottomOverlay);

ohmEditor.addListener('peek:ruleDefinition', function(ruleName) {
  if (ohmEditor.grammar.rules.hasOwnProperty(ruleName)) {
    var defInterval = ohmEditor.grammar.rules[ruleName].source;
    if (defInterval) {
      var grammarEditor = ohmEditor.ui.grammarEditor;
      defMark = cmUtil.markInterval(grammarEditor, defInterval, 'active-definition', true);
      cmUtil.scrollToInterval(grammarEditor, defInterval);
    }
  }
});

ohmEditor.addListener('unpeek:ruleDefinition', clearMarks);

// Refresh the parse tree after attempting to parse the input.
ohmEditor.addListener('parse:input', function(matchResult, trace) {
  $('#bottomSection .overlay').style.width = 0;  // Hide the overlay.
  $('#semantics').hidden = !ohmEditor.options.semantics;
  parseTree.vue.rootTrace = Object.freeze(trace);
});

/*
parseTree.refresh = function() {
  clearMarks();
  refreshParseTree(rootTrace);
};
*/
parseTree.setTraceElementCollapsed = function(el, collapsed, optDuration) {
  el.__vue__.setCollapsed(collapsed, optDuration);
};
parseTree.registerEvents({
  // Emitted when a new trace element `el` is created for `traceNode`.
  'create:traceElement': ['el', 'traceNode'],

  // Emitted when all of a trace element's subtrees have been created.
  'exit:traceElement': ['el', 'traceNode'],

  // Emitted when a trace element is expanded or collapsed.
  'expand:traceElement': ['el'],
  'collapse:traceElement': ['el'],

  // Emitted when the contextMenu for the trace element of `traceNode` is about to be shown.
  'contextMenu': ['target', 'traceNode'],

  // Emitted before start rendering the parse tree
  'render:parseTree': ['traceNode'],

  // Emitted after cmd/ctrl + 'click' on a label
  'cmdOrCtrlClick:traceElement': ['wrapper']
});
