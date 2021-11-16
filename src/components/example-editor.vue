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
            <select id="startRuleDropdown" v-model="startGrammarAndRule">
              <optgroup
                v-for="grammarOpt in grammarOptions()"
                :key="grammarOpt.value"
                :label="grammarOpt.text">
                <option
                  v-for="ruleOpt in startRuleOptions(grammarOpt.value)"
                  :key="ruleOpt.value"
                  :value="ruleOpt.value"
                  :class="{needed: false /* TODO */}"
                >{{ ruleOpt.text }}</option>
              </optgroup>
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

import domUtil from '../domUtil';
import ohmEditor from '../ohmEditor';

export default {
  name: 'example-editor',
  components: {
    'thumbs-up-button':
      require('./thumbs-up-button.vue').default ||
      require('./thumbs-up-button.vue'),
  },
  props: {
    example: {type: Object, required: true},
    status: {type: Object},
    grammars: {type: Object},
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
    startRuleError() {
      return this.status && this.status.err && this.status.err.message;
    },
    startGrammarAndRule: {
      get() {
        const { selectedGrammar, startRule } = this.example;
        return selectedGrammar ? `${selectedGrammar}.${startRule}` : '';
      },
      set(newVal) {
        this.$emit('setStartGrammarAndRule', newVal);
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
    grammarOptions() {
      return Object.keys(this.grammars || {}).map(name => {
        return { text: name, value: name}
      });
    },
    // An array of objects representing the options to show in #startRuleDropdown.
    startRuleOptions(grammarName) {
      let options = [{text: '(default)', value: `${grammarName}.`}];

      const g = this.grammars[grammarName];
      if (g) {
        for (const ruleName of Object.keys(g.rules)) {
          options.push({text: ruleName, value: `${grammarName}.${ruleName}` });
        }
      }
      // Make sure an option exists that matches the currently selected start rule.
      const { selectedGrammar, startRule } = this.example;
      if (selectedGrammar && selectedGrammar === grammarName) {
        if (!options.some(({ value }) => value === this.startGrammarAndRule)) {
          options = [{text: startRule, value: this.startGrammarAndRule}, ...options];
        }
      }
      return options;
    },
  },
};
</script>
