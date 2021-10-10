/* eslint-env browser */

'use strict';

const CheckedEmitter = require('checked-emitter');
const Vue = require('vue').default;
const ohmEditor = require('./ohmEditor');

const parseTree = (ohmEditor.parseTree = new CheckedEmitter());
parseTree.vue = new Vue({
  data: {
    parsing: false,
    trace: null,
  },
  el: '#visualizerContainer',
  components: {
    'parse-tree': require('./components/parse-tree.vue').default,
  },
  template:
    '<div id="visualizerContainer">' +
    '  <parse-tree :rootTrace="trace" />' +
    '  <div v-show="parsing" class="overlay"></div>' +
    '</div>',
  methods: {
    onEdit(cm) {
      this.parsing = true;
    },
  },
  mounted() {
    ohmEditor.addListener('change:inputEditor', this.onEdit);
    ohmEditor.addListener('change:grammarEditor', this.onEdit);

    // Refresh the parse tree after attempting to parse the input.
    const self = this;
    ohmEditor.addListener('parse:input', function (matchResult, trace) {
      self.parsing = false;
      self.trace = Object.freeze(trace);
    });
  },
});

parseTree.setTraceElementCollapsed = function (el, collapsed, optDuration) {
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
  contextMenu: ['target', 'traceNode'],

  // Emitted before start rendering the parse tree
  'render:parseTree': ['traceNode'],

  // Emitted after cmd/ctrl + 'click' on a label
  'cmdOrCtrlClick:traceElement': ['wrapper'],
});
