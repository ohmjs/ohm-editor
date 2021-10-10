<style src="./example-list.css"></style>

<template>
  <div id="exampleContainer">
    <div id="userExampleContainer">
      <div class="section-head flex-row">
        <h2>Examples</h2>
        <button class="outline-btn" @click="handleAddClick">+&nbsp;Add</button>
      </div>

      <div class="contents">
        <ul id="exampleList">
          <li v-for="(ex, id) in exampleValues" :id="id" :key="id" :class="classesForExample(id)"
              @mousedown="handleMouseDown"
              @dblclick="handleDblClick">
            <code>{{ ex.text }}</code>
            <div class="startRule">{{ ex.startRule }}</div>
            <thumbs-up-button
              :showThumbsUp="ex.shouldMatch"
              @click.native="toggleShouldMatch(id)" />
            <div
              class="delete"
              @mousedown.stop
              @click="handleDeleteClick"><span>&#x2715;</span></div>
          </li>
        </ul>
        <example-editor ref="exampleEditor"
            :grammar="grammar()"
            :example="selectedExampleOrEmpty"
            :status="selectedExampleStatus"
            @setStartRule="handleSetStartRule"
            @thumbClick="handleEditorThumbClick">
        </example-editor>
      </div>
    </div>
  </div>
</template>

<script>
'use strict';

const ohmEditor = require('../ohmEditor');
const domUtil = require('../domUtil');
const localStorage = require('global/window').localStorage;

let idCounter = 0;

// Helpers
// -------

function uniqueId() {
  return 'example' + idCounter++;
}

// Exports
// -------

module.exports = {
  name: 'example-list',
  components: {
    'example-editor': require('./example-editor.vue').default,
    'thumbs-up-button': require('./thumbs-up-button.vue').default,
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
      return ex || {text: '', startRule: '', shouldMatch: true};
    },
  },
  watch: {
    selectedId(id) {
      // Update the inputEditor contents whenever the selected example changes.
      const example = this.getSelected();

      this._isSelectionChanging = true;
      ohmEditor.ui.inputEditor.setValue(example ? example.text : '');
      this._isSelectionChanging = false;

      this.$nextTick(function() {ohmEditor.ui.inputEditor.focus();});

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
    grammar() {
      return this._grammar;
    },
    setGrammar(newVal) {
      this._grammar = newVal;

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
      const id = e.target.closest('li.example').id;
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
    handleSetStartRule(newVal) {
      this.setStartRule(this.selectedId, newVal);
    },
    handleEditorThumbClick() {
      this.toggleShouldMatch(this.selectedId);
    },

    indicatePendingInput(id) {
      return this.isInputPending && this.selectedId === id;
    },

    // Add a new example to the list, and return its ID.
    // Every example added to the list must go through this function!
    addExample(optData) {
      const id = uniqueId();
      this.$set(this.exampleValues, id, {
        text: '',
        startRule: '',
        shouldMatch: true,
      });

      this._watchExample(id, this.updateExampleStatus);
      this.selectedId = id;

      ohmEditor.examples.emit('add:example', id);

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
    setExample(id, text, optStartRule, optShouldMatch) {
      if (!(id in this.exampleValues)) {
        throw new Error(id + ' is not a valid example id');
      }

      const example = this.exampleValues[id];
      const oldValue = Object.assign({}, example);
      const newValue = {
        text,
        startRule: optStartRule || '',
        shouldMatch: optShouldMatch == null ? true : optShouldMatch,
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

    setStartRule(id, ruleName) {
      this.exampleValues[id].startRule = ruleName;
    },

    // Restore the examples from localStorage or the given object.
    restoreExamples(key /* orExamples */) {
      let examples = [];
      if (typeof key === 'string') {
        const value = localStorage.getItem(key);
        if (value) {
          examples = JSON.parse(value);
        } else {
          examples = domUtil.$$('#sampleExamples pre').map(function(elem) {
            return {text: elem.textContent, startRule: '', shouldMatch: true};
          });
        }
      } else {
        examples = key;
      }

      const newExampleValues = {};

      const self = this;
      examples.forEach(function(ex) {
        const id = self.addExample();
        if (!ex.hasOwnProperty('shouldMatch')) {
          ex.shouldMatch = true;
        }
        newExampleValues[id] = ex;
      });
      this.exampleValues = newExampleValues;

      // Select the first example.
      this.selectedId = Object.keys(newExampleValues)[0] || null;
    },

    // Save the current contents of all examples to localStorage.
    saveExamples() {
      const data = JSON.stringify(Object.keys(this.exampleValues).map(this.getExample));
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
      if (this._grammar) {
        const example = this.getExample(id);
        let status;
        try {
          const matched = this._grammar.match(example.text, example.startRule).succeeded();
          status = {
            className: matched === example.shouldMatch ? 'pass' : 'fail',
          };
        } catch (e) {
          status = {className: 'fail', err: e};
        }
        this.$set(this.exampleStatus, id, status);
      } else {
        this.$delete(this.exampleStatus, id);
      }
    },

    // Watch for changes to the example with the given id. When any of its data changes,
    // `callback` will be called with the example id as its only argument.
    _watchExample(id, callback) {
      const opts = {deep: true};
      const unwatch = this.$watch('exampleValues.' + id, function(newVal, oldVal) {
        callback(id);
        if (newVal == null) {
          unwatch();
        }
      }, opts);
    },
  },
  created() {
    // This is not a data property because we don't want Vue to observe its internals.
    this._grammar = null;
  },
  mounted() {
    this.restoreExamples('examples');

    const self = this;
    ohmEditor.addListener('change:grammar', function(source) {
      self.setGrammar(null);
    });
    ohmEditor.addListener('parse:grammar', function(matchResult, grammar, err) {
      self.setGrammar(grammar);
    });
    ohmEditor.addListener('change:inputEditor', function(source) {
      // Don't indicate that input is pending if the user just changed the selected example.
      if (!self._isSelectionChanging) {
        self.isInputPending = true;
      }
    });
    ohmEditor.addListener('change:input', function(source) {
      self.isInputPending = false;
      const ex = self.getSelected();
      if (ex) {
        ex.text = source;
      }
    });
  },
};
</script>
