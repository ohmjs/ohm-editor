const template = `
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
            <select
              id="startRuleDropdown"
              :value="startGrammarAndRule"
              :key="startRuleDropdownKey"
              @change="handleStartRuleDropdownChange"
            >
              <template v-for="item in startRuleOptions">
                <optgroup
                  v-if="item.options"
                  :key="item.value"
                  :label="item.text"
                >
                  <!-- prettier-ignore -->
                  <option
                    v-for="opt in item.options"
                    :key="opt.value"
                    :value="opt.value"
                  >{{ opt.text}}</option>
                </optgroup>
                <!-- prettier-ignore -->
                <option v-else :key="item.value" :value="item.value" selected
                  >{{ item.text }}</option>
              </template>
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
`;

/* global CodeMirror */

import * as domUtil from '../domUtil.js';
import ohmEditor from '../ohmEditor.js';
import ThumbsUpButton from './thumbs-up-button.js';

import Vue from 'vue/dist/vue.esm.mjs';

const toOptValue = (grammarName, startRule) =>
  `${grammarName || ''}.${startRule || ''}`;

export default Vue.component('example-editor', {
  name: 'example-editor',
  template,
  components: {
    'thumbs-up-button': ThumbsUpButton,
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
      startRuleDropdownKey: 0,
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
    startGrammarAndRule() {
      const {selectedGrammar, startRule} = this.example;
      const ans = toOptValue(selectedGrammar || '', startRule || '');
      return ans;
    },
    // Returns the text and value for a top-level <option> element (not nested inside an
    // <optgroup>).
    // The top-level option has two main purposes:
    // - it lets us represent both the optgroup and option text (e.g. 'MyGrammar ▸ AddExp')
    //   in a single, selected option.
    // - it gives us a place to show the currently-selected grammar / start rule, even if
    //   they are longer present in the grammar pane.
    // If the top-level option is present, it's always selected and disabled.
    topLevelOption() {
      const {selectedGrammar, startRule} = this.example;
      const ruleLabel = startRule || '(default)';
      return {
        text: selectedGrammar ? `${selectedGrammar} ▸ ${ruleLabel}` : ruleLabel,
        value: toOptValue(selectedGrammar, startRule),
      };
    },
    startRuleOptions() {
      const grammarNames = Object.keys(this.grammars || {});
      const optgroups = grammarNames.map(name => ({
        text: name,
        value: name,
        options: this.startRuleOptionsForGrammar(name),
      }));

      const {topLevelOption} = this;

      // To avoid colliding with the `topLevelOption.value`, append '!'
      // to the value, which is detected and removed by the change handler.
      optgroups.forEach(({options}) =>
        options.forEach(opt => {
          if (opt.value === topLevelOption.value) {
            opt.value = `${opt.value}!`;
          }
        })
      );
      return [topLevelOption, ...optgroups];
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
    handleStartRuleDropdownChange(e) {
      let {value} = e.target;

      // Strip off any trailing '!', which can be added to avoid value collisions.
      if (value.endsWith('!')) {
        value = value.slice(0, -1);
      }

      const [grammarName, startRule] = value.split('.');
      this.$emit('setGrammarAndStartRule', grammarName, startRule);

      // Ensure the start rule dropdown is re-rendered. We need to force this for
      // the case where the top-level option is shows "MyGrammar > MyStartRule",
      // and the user selects "MyStartRule" in the dropdown. Since that doesn't
      // change the value, it results in the closed <select> button showing
      // "MyStartRule", but we want it to show "MyGrammar > MyStartRule"
      this.startRuleDropdownKey += 1;
    },
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
      this.$nextTick(() => {
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
    startRuleOptionsForGrammar(grammarName) {
      const options = [{text: '(default)', value: toOptValue(grammarName, '')}];

      const g = this.grammars[grammarName];
      if (g) {
        for (const ruleName of Object.keys(g.rules)) {
          options.push({
            text: ruleName,
            value: toOptValue(grammarName, ruleName),
          });
        }
      }
      return options;
    },
  },
});
