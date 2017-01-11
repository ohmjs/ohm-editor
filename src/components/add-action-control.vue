<template>
  <div v-if="loaded" class="addNew">
    <div class="addition">
      <textarea v-model="value" @click.stop.prevent="showSuggestions"
                @input="showSuggestions"
                @keydown.esc.stop.prevent="selectSuggestion"
                @keydown.enter.stop.prevent="selectSuggestion"
                @keydown.up.stop.prevent="toPrevSuggestion"
                @keydown.down.stop.prevent="toNextSuggestion">
      </textarea>
      <button @click="selectSuggestion">add</button>
    </div>
    <suggestion-list v-if="show" :prefix="value"></suggestion-list>
  </div>
</template>

<script>
  /* global window */
  'use strict';

  var ohmEditor = require('../ohmEditor');
  window.onclick = function() {
    ohmEditor.semanticsContainer.emit('hide:suggestions');
  };

  var suggestionList = require('./suggestion-list.vue');

  module.exports = {
    components: {
      'suggestion-list': suggestionList
    },
    data: function() {
      return {
        loaded: false,
        show: false,
        value: ''
      };
    },
    mounted: function() {
      var self = this;
      ohmEditor.semantics.addListener('select:operation', function(operationName, optArgs) {
        self.loaded = true;
      });

      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.loaded = false;
      });

      ohmEditor.semanticsContainer.addListener('hide:suggestions', function() {
        self.show = false;
      });
    },
    methods: {
      showSuggestions: function(event) {
        this.show = true;
        ohmEditor.semanticsContainer.emit('show:suggestions', this.value);
      },
      selectSuggestion: function(event) {
        this.value = '';
        this.show = false;
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
