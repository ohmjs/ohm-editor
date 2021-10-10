<template>
  <transition name="fade">
    <div id="editorOverlay" v-show="editing">
      <div id="exampleEditor" :class="classObj">
        <div class="header flex-row">
          <div class="title">{{ editMode }} example</div>
          <button class="outline-btn" @mousedown.prevent @click="stopEditing">
            Done
          </button>
        </div>

        <div class="toolbar">
          <div class="contents flex-row">
            <label>Start rule:</label>
            <select id="startRuleDropdown" v-model="startRule">
              <option
                v-for="option in startRuleOptions()"
                :key="option.value"
                :value="option.value"
                :class="{needed: false /* TODO */}"
              >
                {{ option.text }}
              </option>
            </select>
            <div
              v-if="startRuleError"
              class="errorIcon"
              :title="startRuleError"
            >
              ⚠️
            </div>
            <div class="gap"></div>
            <thumbs-up-button
              :showThumbsUp="example.shouldMatch"
              @click.native="$emit('thumbClick')"
            />
          </div>
        </div>
        <div class="editorWrapper"></div>
      </div>
    </div>
  </transition>
</template>

<script>
/* global CodeMirror */

'use strict';

const domUtil = require('../domUtil');
const ohmEditor = require('../ohmEditor');

module.exports = {
  name: 'example-editor',
  components: {
    'thumbs-up-button': require('./thumbs-up-button.vue').default,
  },
  props: {
    example: {type: Object, required: true},
    status: {type: Object},
    grammar: {type: Object},
  },
  data() {
    return {
      editing: false,
      editMode: '',
      showPlaceholder: false,
    };
  },
  computed: {
    classObj() {
      // Hide parse errors while the placeholder text is visible.
      return this.showPlaceholder ? 'hideInputErrors' : '';
    },
    commonStartRuleOptions() {
      const options = [{text: '(default)', value: ''}];
      if (this.grammar) {
        Object.keys(this.grammar.rules).forEach(function (ruleName) {
          options.push({text: ruleName, value: ruleName});
        });
      }
      return options;
    },
    startRuleError() {
      return this.status && this.status.err && this.status.err.message;
    },
    startRule: {
      get() {
        return this.example.startRule;
      },
      set(newVal) {
        this.$emit('setStartRule', newVal);
      },
    },
  },
  watch: {
    showPlaceholder(newVal) {
      ohmEditor.ui.inputEditor.setOption(
        'placeholder',
        newVal ? 'Text to match' : ''
      );
    },
  },
  mounted() {
    const self = this;
    const editorContainer = domUtil.$('#exampleContainer .editorWrapper');
    const editor = (ohmEditor.ui.inputEditor = CodeMirror(editorContainer, {
      extraKeys: {
        Esc(cm) {
          self.stopEditing();
        },
      },
    }));
    ohmEditor.emit('init:inputEditor', editor);
  },
  methods: {
    startEditing(optMode) {
      this.editing = true;
      this.editMode = optMode || 'Edit';

      this.showPlaceholder = this.editMode === 'Add';

      // When adding a new example, show placeholder text only until the user types something,
      // rather than whenever the editor is empty (which is the default behaviour).
      if (this.showPlaceholder) {
        const self = this;
        ohmEditor.ui.inputEditor.on('change', function handler(cm) {
          self.showPlaceholder = false;
          cm.off('change', handler);
        });
      }

      // Focus the editor and set the cursor to the end.
      this.$nextTick(function () {
        const cm = ohmEditor.ui.inputEditor;
        cm.focus();
        cm.setCursor(cm.lineCount(), 0);
        cm.refresh();
      });
    },
    stopEditing() {
      this.editing = false;
    },
    // An array of objects representing the options to show in #startRuleDropdown.
    startRuleOptions() {
      const ex = this.example;
      const options = this.commonStartRuleOptions;

      // Ensure the example's start rule always appears in the dropdown, even if the
      // rule no longer appears in the grammar.
      for (let i = 0; i < options.length; ++i) {
        if (options[i].value === ex.startRule) {
          return options;
        }
      }
      return [{text: ex.startRule, value: ex.startRule}].concat(options);
    },
  },
};
</script>
