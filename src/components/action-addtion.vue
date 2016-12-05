<template>
  <div class="addition">
    <textarea v-model="value" @click="showSuggestions" @blur="hideSuggestions"
              @keydown.esc.stop.prevent="selectSuggestion"
              @keydown.enter.stop.prevent="selectSuggestion"
              @keydown.up.stop.prevent="toPrevSuggestion"
              @keydown.down.stop.prevent="toNextSuggestion">
    </textarea>
    <button>add</button>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    data: function() {
      return {
        value: ''
      };
    },
    updated: function() {
      ohmEditor.semanticsContainer.emit('show:suggestions', this.value);
    },
    methods: {
      showSuggestions: function(event) {
        ohmEditor.semanticsContainer.emit('show:suggestions', this.value);
      },
      hideSuggestions: function() {
        ohmEditor.semanticsContainer.emit('hide:suggestions');
      },
      selectSuggestion: function(event) {
        this.value = '';
        ohmEditor.semanticsContainer.emit('select:suggestion', 'current');
      },
      toPrevSuggestion: function(event) {
        ohmEditor.semanticsContainer.emit('select:suggestion', 'previous');
      },
      toNextSuggestion: function(event) {
        ohmEditor.semanticsContainer.emit('select:suggestion', 'next');
      }
    }
  };
</script>
