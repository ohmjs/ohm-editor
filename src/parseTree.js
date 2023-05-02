/* eslint-env browser */

import CheckedEmitter from 'checked-emitter';
import Vue from 'vue/dist/vue.common.js';

import ParseTree from './components/parse-tree.vue';
import ohmEditor from './ohmEditor.js';

const parseTree = (ohmEditor.parseTree = new CheckedEmitter());
parseTree.vue = new Vue({
  data: {
    parsing: false,
    trace: null,
  },
  el: '#visualizerContainer',
  components: {
    'parse-tree': ParseTree,
  },
  template: `
    <div id="visualizerContainer">
      <div class="section-head flex-row">
        <h2>Parse</h2>
      </div>
      <parse-tree :rootTrace="trace" />
      <div v-show="parsing" class="overlay"></div>
    </div>
  `,
  methods: {
    onEdit(cm) {
      this.parsing = true;
    },
  },
  mounted() {
    ohmEditor.addListener('change:inputEditor', this.onEdit);
    ohmEditor.addListener('change:grammarEditor', this.onEdit);

    // Refresh the parse tree after attempting to parse the input.
    ohmEditor.addListener('parse:input', (matchResult, trace) => {
      this.parsing = false;
      this.trace = Object.freeze(trace);
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
