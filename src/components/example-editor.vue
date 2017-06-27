<template>
  <transition name="fade">
    <div id="editorOverlay" v-show="editing">
      <div id="exampleEditor" :class="classObj">
        <div class="header">
          <div class="title">{{ editMode }} example</div>
          <input type="button" value="Done" @click="stopEditing">
        </div>

        <div class="toolbar">
          <div class="contents">
            <label>Start rule:</label>
            <select id="startRuleDropdown" v-model="startRule">
              <option v-for="option in startRuleOptions()" :key="option.value" :value="option.value"
                      :class="{needed: false /* TODO */}">{{ option.text }}
              </option>
            </select>
            <div v-if="startRuleError" class="errorIcon" :title="startRuleError">⚠️</div>
            <div class="gap"></div>
            <thumbs-up-button :showThumbsUp="example.shouldMatch" @click.native="toggleShouldMatch(example.id)" />
          </div>
        </div>
        <div class="editorWrapper"></div>
        <div id="neededExamples">
          <ul class="exampleGeneratorUI hidden"></ul>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
  /* global CodeMirror */

  'use strict';

  var domUtil = require('../domUtil');
  var ohmEditor = require('../ohmEditor');

  module.exports = {
    name: 'example-editor',
    components: {
      'thumbs-up-button': require('./thumbs-up-button.vue')
    },
    props: {
      example: {type: Object, required: true},
      status: {type: Object},
      grammar: {type: Object}
    },
    data: function() {
      return {
        editing: false,
        editMode: '',
        showPlaceholder: false
      };
    },
    computed: {
      classObj: function() {
        // Hide parse errors while the placeholder text is visible.
        return this.showPlaceholder ? 'hideInputErrors' : '';
      },
      commonStartRuleOptions: function() {
        var options = [{text: '(default)', value: ''}];
        if (this.grammar) {
          Object.keys(this.grammar.rules).forEach(function(ruleName) {
            options.push({text: ruleName, value: ruleName});
          });
        }
        return options;
      },
      startRuleError: function() {
        return this.status && this.status.err && this.status.err.message;
      },
      startRule: {
        get: function() {
          return this.example.startRule;
        },
        set: function(newVal) {
          this.$emit('setStartRule', newVal);
        }
      }
    },
    watch: {
      showPlaceholder: function(newVal) {
        ohmEditor.ui.inputEditor.setOption('placeholder', newVal ? 'Text to match' : '');
      }
    },
    mounted: function() {
      var self = this;
      var editorContainer = domUtil.$('#exampleContainer .editorWrapper');
      var editor = ohmEditor.ui.inputEditor = CodeMirror(editorContainer, {
        extraKeys: {
          Esc: function(cm) { self.stopEditing(); }
        }
      });
      ohmEditor.emit('init:inputEditor', editor);
    },
    methods: {
      startEditing: function(optMode) {
        this.editing = true;
        this.editMode = optMode || 'Edit';

        this.showPlaceholder = this.editMode === 'Add';

        // When adding a new example, show placeholder text only until the user types something,
        // rather than whenever the editor is empty (which is the default behaviour).
        if (this.showPlaceholder) {
          var self = this;
          ohmEditor.ui.inputEditor.on('change', function handler(cm) {
            self.showPlaceholder = false;
            cm.off('change', handler);
          });
        }

        // Focus the editor and set the cursor to the end.
        this.$nextTick(function() {
          var cm = ohmEditor.ui.inputEditor;
          cm.focus();
          cm.setCursor(cm.lineCount(), 0);
          cm.refresh();
        });
      },
      stopEditing: function() {
        this.editing = false;
      },
      // An array of objects representing the options to show in #startRuleDropdown.
      startRuleOptions: function() {
        var ex = this.example;
        var options = this.commonStartRuleOptions;

        // Ensure the example's start rule always appears in the dropdown, even if the
        // rule no longer appears in the grammar.
        for (var i = 0; i < options.length; ++i) {
          if (options[i].value === ex.startRule) {
            return options;
          }
        }
        return [{text: ex.startRule, value: ex.startRule}].concat(options);
      }
    }
  };
</script>
