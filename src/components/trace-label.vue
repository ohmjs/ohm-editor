<template>
  <div class="label" :title="labelData.tooltip" :style="{minWidth: minWidth}"
       @mouseover="emitHover" @mouseout="emitUnhover" @click="onClick($event)"
       @contextmenu="onContextMenu($event)">{{
    labelData.text
  }}<span v-if="labelData.caseName" class="caseName">{{ labelData.caseName }}</span>
    <span v-if="extraInfo" class="info">{{ extraInfo }}</span>
  </div>
</template>

<script>
/* global window */
'use strict';

const isLRBaseCase = require('../traceUtil').isLRBaseCase;

const HORIZONTAL_ELLIPSIS = '\u2026';

// Exports
// -------

module.exports = {
  name: 'trace-label',
  props: {
    traceNode: {type: Object, required: true},
    minWidth: {type: String, required: true},
  },
  computed: {
    extraInfo: function() {
      if (isLRBaseCase(this.traceNode)) {
        return '[LR]';
      }
    },
    inlineRuleNameParts: function() {
      const ruleName = this.traceNode.expr.ruleName;
      return ruleName ? ruleName.split('_') : [];
    },
    labelData: function() {
      if (this.traceNode.terminatesLR) {
        return {text: '[Grow LR]'};
      }
      if (this.inlineRuleNameParts.length > 1) {
        return {
          text: this.inlineRuleNameParts[0],
          caseName: this.inlineRuleNameParts[1],
        };
      }
      const fullText = this.traceNode.displayString;

      // Truncate the label if it is too long, and show the full label in the tooltip.
      if (fullText.length > 20 && fullText.indexOf(' ') >= 0) {
        return {
          text: fullText.slice(0, 20) + HORIZONTAL_ELLIPSIS,
          tooltip: fullText,
        };
      }
      return {text: fullText};
    },
  },
  methods: {
    emitHover: function() {
      this.$emit('hover');
    },
    emitUnhover: function() {
      this.$emit('unhover');
    },
    onClick: function(e) {
      const isPlatformMac = /Mac/.test(window.navigator.platform);
      const modifierKey = isPlatformMac ? e.metaKey : e.ctrlKey;

      if (e.altKey && !(e.shiftKey || e.metaKey)) {
        this.$emit('click', 'alt');
      } else if (modifierKey && !(e.altKey || e.shiftKey)) {
        this.$emit('click', 'cmd');
      } else {
        this.$emit('click');
      }
      e.preventDefault();
    },
    onContextMenu: function(e) {
      this.$emit('showContextMenu', {
        x: e.clientX,
        y: e.clientY - 6,
        traceNode: this.traceNode,
      });
      e.stopPropagation();
      e.preventDefault();
    },
  },
};
</script>
