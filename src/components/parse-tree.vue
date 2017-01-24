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

  var cmUtil = require('../cmUtil');
  var domUtil = require('../domUtil');
  var isLeaf = require('../traceUtil').isLeaf;
  var ohmEditor = require('../ohmEditor');

  var expandedInput = require('./expanded-input.vue');
  var parseResults = require('./parse-results.vue');

  var ANTICLOCKWISE_OPEN_CIRCLE_ARROW = '\u21BA';

  var inputMark;
  var grammarMark;
  var defMark;

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
      'parse-results': parseResults
    },
    props: {
      rootTrace: Object
    },
    data: function() {
      return {
        zoomTrace: null,
        previewedZoomTrace: null
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
      }
    },
    mounted: function() {
      window.addEventListener('resize', this.$refs.expandedInput.update);

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

        var menuDiv = domUtil.$('#parseTreeMenu');
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
  };
</script>
