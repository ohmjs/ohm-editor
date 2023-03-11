const template = `
  <div id="exampleContainer">
    <div id="userExampleContainer">
      <div class="section-head flex-row">
        <h2>Examples</h2>
        <button class="outline-btn" @click="handleAddClick">+&nbsp;Add</button>
      </div>

      <div class="contents">
        <ul id="exampleList">
          <li
            v-for="(ex, id) in exampleValues"
            :id="id"
            :key="id"
            :class="classesForExample(id)"
            @mousedown="handleMouseDown"
            @dblclick="handleDblClick"
          >
            <code>{{ ex.text }}</code>
            <div class="startRule">{{ getStartRuleLabel(ex) }}</div>
            <thumbs-up-button
              :showThumbsUp="ex.shouldMatch"
              @click.native="toggleShouldMatch(id)"
            />
            <div class="delete" @mousedown.stop @click="handleDeleteClick">
              <span>&#x2715;</span>
            </div>
          </li>
        </ul>
        <example-editor
          ref="exampleEditor"
          :grammars="grammars()"
          :example="selectedExampleOrEmpty"
          :status="selectedExampleStatus"
          @setGrammarAndStartRule="handleSetGrammarAndStartRule"
          @thumbClick="handleEditorThumbClick"
        >
        </example-editor>
      </div>
    </div>
  </div>
`;

import * as domUtil from '../domUtil.js';
import ExampleEditor from './example-editor.js';
import ohmEditor from '../ohmEditor.js';
import ThumbsUpButton from './thumbs-up-button.js';

import Vue from 'vue/dist/vue.esm.mjs';

let idCounter = 0;

// Helpers
// -------

function uniqueId() {
  return 'example' + idCounter++;
}

const EXAMPLE_DEFAULTS = {
  text: '',
  startRule: '',
  selectedGrammar: '',
  shouldMatch: true,
};

// Exports
// -------

export default Vue.component('example-list', {
  name: 'example-list',
  template,
  components: {
    'example-editor': ExampleEditor,
    'thumbs-up-button': ThumbsUpButton,
  },
  props: [],
  data() {
    return {
      selectedId: null,
      editing: false,
      editMode: '',
      exampleValues: Object.create(null),

      // Maps an example id to a string: either 'pass' or 'fail'.
      exampleStatus: Object.create(null),

      // Indicates that the user is editing an example, but the change hasn't been committed yet.
      isInputPending: false,
    };
  },
  computed: {
    selectedExampleStatus() {
      return this.exampleStatus[this.selectedId];
    },
    selectedExampleOrEmpty() {
      const ex = this.getSelected();
      return ex || {...EXAMPLE_DEFAULTS};
    },
  },
  watch: {
    selectedId(id) {
      // Update the inputEditor contents whenever the selected example changes.
      const example = this.getSelected();

      this._isSelectionChanging = true;
      ohmEditor.ui.inputEditor.setValue(example ? example.text : '');
      this._isSelectionChanging = false;

      this.$nextTick(() => {
        ohmEditor.ui.inputEditor.focus();
      });

      ohmEditor.examples.emit('set:selected', id);
    },
    exampleValues: {
      deep: true,
      handler(values) {
        this.saveExamples();
      },
    },
  },
  methods: {
    grammars() {
      return this._grammars;
    },
    setGrammars(newVal) {
      // Use `freeze` to prevent Vue from deeply observing the value.
      this._grammars = Object.freeze(newVal);

      // Re-check all the examples.
      Object.keys(this.exampleValues).forEach(this.updateExampleStatus);

      this.$forceUpdate();
    },
    classesForExample(id) {
      const pendingUpdate = this.indicatePendingInput(id);
      const classes = {
        example: true,
        selected: this.selectedId === id,
        pendingUpdate,
      };
      classes['flex-row'] = true;

      // Add a class for the example status (either "pass" or "fail").
      if (id in this.exampleStatus && !pendingUpdate) {
        classes[this.exampleStatus[id].className] = true;
      }
      return classes;
    },
    handleAddClick(e) {
      this.addExample();
      this.$refs.exampleEditor.startEditing('Add');
      e.preventDefault();
    },
    handleSignClick(e) {
      const {id} = e.target.closest('li.example');
      this.toggleShouldMatch(id);
    },
    handleDblClick(e) {
      this.$refs.exampleEditor.startEditing();
    },
    handleDeleteClick(e) {
      const li = e.target.closest('li.example');
      this.deleteExample(li.id);
      e.preventDefault();
    },
    handleMouseDown(e) {
      const li = e.target.closest('li.example');
      this.selectedId = li.id;
      e.preventDefault();
    },

    // Emitted from the example editor when the user chooses a start rule.
    handleSetGrammarAndStartRule(grammarName, startRule) {
      const {text, shouldMatch} = this.getSelected();
      this.setExample(
        this.selectedId,
        text,
        grammarName,
        startRule,
        shouldMatch
      );
    },
    handleEditorThumbClick() {
      this.toggleShouldMatch(this.selectedId);
    },

    indicatePendingInput(id) {
      return this.isInputPending && this.selectedId === id;
    },

    // Add a new example to the list, and return its ID.
    // Every example added to the list must go through this function!
    addExample() {
      const id = uniqueId();
      const grammar = ohmEditor.defaultGrammar();
      this.$set(this.exampleValues, id, {
        ...EXAMPLE_DEFAULTS,
        selectedGrammar: grammar ? grammar.name : '',
      });

      this._watchExample(id, this.updateExampleStatus);
      this.selectedId = id;

      ohmEditor.examples.emit('add:example', id);
      this.updateExampleStatus(id);

      return id;
    },

    deleteExample(id, optListEl) {
      const li = optListEl || this.$el.querySelector('#' + id);
      const elToSelect = li.previousSibling || li.nextSibling;
      this.$delete(this.exampleValues, id);

      if (this.selectedId === id) {
        this.selectedId = elToSelect ? elToSelect.id : null;
      }
      ohmEditor.examples.emit('remove:example', id);
    },

    // Return the contents of the example with the given id.
    getExample(id) {
      if (!(id in this.exampleValues)) {
        throw new Error(id + ' is not a valid example id');
      }
      return this.exampleValues[id];
    },

    getExamples() {
      // Return a deep clone.
      return JSON.parse(JSON.stringify(this.exampleValues));
    },

    // Set the contents of an example with the given id to `value`.
    setExample(id, text, grammar = '', startRule = '', shouldMatch = true) {
      if (!(id in this.exampleValues)) {
        throw new Error(id + ' is not a valid example id');
      }

      const example = this.exampleValues[id];
      const oldValue = Object.assign({}, example);
      const newValue = {
        text,
        selectedGrammar: grammar,
        startRule,
        shouldMatch,
      };
      Object.assign(example, newValue);
      ohmEditor.examples.emit('set:example', id, oldValue, newValue);
    },

    toggleShouldMatch(id) {
      const example = this.exampleValues[id];
      example.shouldMatch = !example.shouldMatch;
    },

    getSelected() {
      if (this.selectedId) {
        return this.exampleValues[this.selectedId];
      }
    },

    // Select the example with the given id.
    setSelected(id) {
      this.selectedId = id;
    },

    // Restore the examples from localStorage or the given object.
    restoreExamples(key /* orExamples */) {
      let examples = [];
      if (typeof key === 'string') {
        const value = localStorage.getItem(key);
        if (value) {
          examples = JSON.parse(value);
        } else {
          examples = domUtil.$$('#sampleExamples pre').map(elem => {
            return {
              ...EXAMPLE_DEFAULTS,
              text: elem.textContent,
            };
          });
        }
      } else {
        examples = key;
      }

      const newExampleValues = {};

      for (const ex of examples) {
        const id = this.addExample();
        // Some examples from localStorage may be missing keys, since the format has changed.
        // So we include default values here.
        newExampleValues[id] = {
          ...EXAMPLE_DEFAULTS,
          ...ex,
        };
      }
      this.exampleValues = newExampleValues;

      // Select the first example.
      this.selectedId = Object.keys(newExampleValues)[0] || null;
    },

    // Save the current contents of all examples to localStorage.
    saveExamples() {
      const data = JSON.stringify(
        Object.keys(this.exampleValues).map(this.getExample)
      );
      localStorage.setItem('examples', data);
    },

    // Try to match the example given by `id` against the current grammar.
    // Automatically executed whenever anything in `this.examplesValues` changes.
    updateExampleStatus(id) {
      // If the example was deleted, delete its status as well.
      if (!(id in this.exampleValues)) {
        this.$delete(this.exampleStatus, id);
        return;
      }
      if (this._grammars) {
        let status;
        const {text, selectedGrammar, startRule, shouldMatch} =
          this.getExample(id);
        const g = selectedGrammar
          ? this._grammars[selectedGrammar]
          : ohmEditor.defaultGrammar();
        if (g) {
          try {
            const matched = g.match(text, startRule).succeeded();
            status = {className: matched === shouldMatch ? 'pass' : 'fail'};
          } catch (e) {
            status = {className: 'fail', err: e};
          }
        } else {
          const message = selectedGrammar
            ? `Unknown grammar '${selectedGrammar}'`
            : 'No grammar defined';
          status = {
            className: 'fail',
            err: {message},
          };
        }
        this.$set(this.exampleStatus, id, status);
      } else {
        this.$delete(this.exampleStatus, id);
      }
    },
    getStartRuleLabel(example) {
      const {selectedGrammar, startRule} = example;
      return selectedGrammar
        ? `${selectedGrammar} ▸ ${startRule || '(default)'}`
        : startRule;
    },

    // Watch for changes to the example with the given id. When any of its data changes,
    // `callback` will be called with the example id as its only argument.
    _watchExample(id, callback) {
      const opts = {deep: true};
      const unwatch = this.$watch(
        'exampleValues.' + id,
        (newVal, oldVal) => {
          callback(id);
          if (newVal == null) {
            unwatch();
          }
        },
        opts
      );
    },
  },
  created() {
    // This is not a data property because we don't want Vue to observe its internals.
    this._grammar = null;
  },
  mounted() {
    this.restoreExamples('examples');

    const self = this;
    ohmEditor.addListener('change:grammars', source => {
      self.setGrammars(null);
    });
    ohmEditor.addListener('parse:grammars', (matchResult, grammars, err) => {
      self.setGrammars(grammars);
    });
    ohmEditor.addListener('change:inputEditor', source => {
      // Don't indicate that input is pending if the user just changed the selected example.
      if (!self._isSelectionChanging) {
        self.isInputPending = true;
      }
    });
    ohmEditor.addListener('change:input', source => {
      self.isInputPending = false;
      const ex = self.getSelected();
      if (ex) {
        ex.text = source;
      }
    });
  },
});
