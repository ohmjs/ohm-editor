<template>
  <div class="flex-fix">
    <div class="editorWrapper" v-if="loaded">
      <action-addtion></action-addtion>
      <suggestion-list v-if="showSuggestions"></suggestion-list>
      <semantic-editor v-for="child in children"
                       :type="child.type" :id="child.id" :operation="child.operation">
      </semantic-editor>
    </div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var actionAddtion = require('./action-addtion.vue');
  var suggestionList = require('./suggestion-list.vue');
  var semanticEditor = require('./semantic-editor.vue');
  
  module.exports = {
    components: {
      'action-addtion': actionAddtion,
      'suggestion-list': suggestionList,
      'semantic-editor': semanticEditor
    },
    data: function() {
      return {
        loaded: false,
        operation: undefined,
        children: [],
        showSuggestions: false
      };
    },
    mounted: function() {
      var self = this;

      ohmEditor.semantics.addListener('select:operation', function(operationName) {
        self.operation = operationName;
        self.populateChildren();
        self.loaded = true;
      });

      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.loaded = false;
        self.operation = '';
      });

      ohmEditor.semanticsContainer.addListener('create:editor', function(type, id) {
        var child = self.children.filter(function(child) {
          return child.type === type && child.id === id;
        })[0];
        if (!child) {
          self.children.push({
            type: type,
            id: id,
            operation: self.operation
          });
        }

        // TODO: focusing on the editor.
        // ohmEditor.semanticsContainer.emit('hide:suggestions');
        self.showSuggestions = false;
        self.$nextTick(function() {
          ohmEditor.semanticsContainer.emit('focus:editor', type, id);
        });
      });

      ohmEditor.semanticsContainer.addListener('show:suggestions', function(prefix) {
        self.showSuggestions = true;
      });
    },
    methods: {
      populateChildren: function() {
        var children = this.children = [];
        var operation = this.operation;
        var actionDict = ohmEditor.semantics.value._getActionDict(this.operation);
        if (!actionDict) {
          return;
        }

        Object.keys(actionDict).forEach(function(key) {
          var action = actionDict[key];
          if (!action || action._isDefault || key === '_default') {
            return;
          }
          var child = {
            type: 'rule',
            id: key,
            operation: operation
          };
          children.push(child);
        });
      }
    }
  };
</script>
