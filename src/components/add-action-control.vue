<template>
  <div v-if="loaded">
    <div class="addition">
      <textarea v-model="value" @click="showSuggestions"
                @input="showSuggestions"
                @keydown.esc.stop.prevent="selectSuggestion"
                @keydown.enter.stop.prevent="selectSuggestion"
                @keydown.up.stop.prevent="toPrevSuggestion"
                @keydown.down.stop.prevent="toNextSuggestion">
      </textarea>
      <button @click="selectSuggestion">add</button>
    </div>
    <suggestion-list v-if="show"></suggestion-list>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

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

      ohmEditor.semanticsContainer.addListener('create:editor', function(type, id) {
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
