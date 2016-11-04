<template>
  <div class="resultBlock" :class="[classObj, {highlight: highlighting}]"
       @mouseover="highlight(true)" @mouseout="highlight(false)">
    <div class="value">{{ result }}</div>
    <div class="operation" v-if="multiResults">{{ operation }}</div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['result', 'operation', 'classId', 'classObj'],
    computed: {
      multiResults: function() {
        var semanticOperations = ohmEditor.semantics.getSemantics();
        var operationCount = Object.keys(semanticOperations.operations).length +
          Object.keys(semanticOperations.attributes).length;
        return this.result && this.result.args || operationCount > 1;
      }
    },
    data: function() {
      return {
        highlighting: false
      };
    },
    mounted: function() {
      var self = this;

      ohmEditor.semanticsContainer.addListener('hover:resultBlock',
        function(target, shouldHighlight) {
          if (target === self.classId) {
            self.highlighting = shouldHighlight;
          }
        });
    },
    methods: {
      highlight: function(shouldHighlight) {
        ohmEditor.semanticsContainer.emit('hover:resultBlock', this.classId, shouldHighlight);
      }
    }
  };
</script>