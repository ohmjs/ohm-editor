<template>
  <div class="opName" v-bind:class="{selected: select}"
       @click="toggleSelection">{{ title }}</div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['title', 'operation', 'args'],
    data: function() {
      return {
        select: false
      };
    },
    mounted: function() {
      var el = this.$el;
      var self = this;
      ohmEditor.semanticsContainer.addListener('toggle:semanticsButton', function(target) {
        self.select = el === target;
        if (self.select) {
          ohmEditor.semantics.operation = self.operation;
          ohmEditor.semantics.emit('select:operation', self.operation, self.args);
        }
      });

      ohmEditor.addListener('parse:input', function(matchResult, trace) {
        if (self.select) {
          ohmEditor.semantics.emit('render:semanticResult', trace, self.operation, self.args);
        }
      });
    },
    methods: {
      toggleSelection: function() {
        ohmEditor.semanticsContainer.emit('toggle:semanticsButton',
          !this.select ? this.$el : undefined);
        if (!this.select) {
          ohmEditor.semantics.operation = undefined;
          ohmEditor.semantics.emit('clear:semanticsEditorWrapper');
        }
      }
    }
  };
</script>
