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
            <thumbs-up-button :showThumbsUp="ex.shouldMatch" @click.native="toggleShouldMatch(id)" />
            <div class="delete" @mousedown.stop @click="handleDeleteClick"><span>&#x2715;</span></div>
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

  var ohmEditor = require('../ohmEditor');
  var domUtil = require('../domUtil');
  var localStorage = require('global/window').localStorage;

  var idCounter = 0;

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
      'example-editor': require('./example-editor.vue'),
      'thumbs-up-button': require('./thumbs-up-button.vue')
    },
    props: [],
    data: function() {
      return {
        selectedId: null,
        editing: false,
        editMode: '',
        exampleValues: Object.create(null),

        // Maps an example id to a string: either 'pass' or 'fail'.
        exampleStatus: Object.create(null),

        // Indicates that the user is editing an example, but the change hasn't been committed yet.
        isInputPending: false
      };
    },
    computed: {
      selectedExampleStatus: function() {
        return this.exampleStatus[this.selectedId];
      },
      selectedExampleOrEmpty: function() {
        var ex = this.getSelected();
        return ex || {text: '', startRule: '', shouldMatch: true};
      }
    },
    watch: {
      selectedId: function(id) {
        // Update the inputEditor contents whenever the selected example changes.
        var example = this.getSelected();

        this._isSelectionChanging = true;
        ohmEditor.ui.inputEditor.setValue(example ? example.text : '');
        this._isSelectionChanging = false;

        this.$nextTick(function() { ohmEditor.ui.inputEditor.focus(); });

        ohmEditor.examples.emit('set:selected', id);
      },
      exampleValues: {
        deep: true,
        handler: function(values) {
          this.saveExamples();
        }
      }
    },
    methods: {
      grammar: function() {
        return this._grammar;
      },
      setGrammar: function(newVal) {
        this._grammar = newVal;

        // Re-check all the examples.
        Object.keys(this.exampleValues).forEach(this.updateExampleStatus);

        this.$forceUpdate();
      },
      classesForExample: function(id) {
        var pendingUpdate = this.indicatePendingInput(id);
        var classes = {
          example: true,
          selected: this.selectedId === id,
          pendingUpdate: pendingUpdate
        };
        classes['flex-row'] = true;

        // Add a class for the example status (either "pass" or "fail").
        if (id in this.exampleStatus && !pendingUpdate) {
          classes[this.exampleStatus[id].className] = true;
        }
        return classes;
      },
      handleAddClick: function(e) {
        this.addExample();
        this.$refs.exampleEditor.startEditing('Add');
        e.preventDefault();
      },
      handleSignClick: function(e) {
        var id = e.target.closest('li.example').id;
        this.toggleShouldMatch(id);
      },
      handleDblClick: function(e) {
        this.$refs.exampleEditor.startEditing();
      },
      handleDeleteClick: function(e) {
        var li = e.target.closest('li.example');
        this.deleteExample(li.id);
        e.preventDefault();
      },
      handleMouseDown: function(e) {
        var li = e.target.closest('li.example');
        this.selectedId = li.id;
        e.preventDefault();
      },

      // Emitted from the example editor when the user chooses a start rule.
      handleSetStartRule: function(newVal) {
        this.setStartRule(this.selectedId, newVal);
      },
      handleEditorThumbClick: function() {
        this.toggleShouldMatch(this.selectedId);
      },

      indicatePendingInput: function(id) {
        return this.isInputPending && this.selectedId === id;
      },

      // Add a new example to the list, and return its ID.
      // Every example added to the list must go through this function!
      addExample: function(optData) {
        var id = uniqueId();
        this.$set(this.exampleValues, id, {
          text: '',
          startRule: '',
          shouldMatch: true
        });

        this._watchExample(id, this.updateExampleStatus);
        this.selectedId = id;

        ohmEditor.examples.emit('add:example', id);

        return id;
      },

      deleteExample: function(id, optListEl) {
        var li = optListEl || this.$el.querySelector('#' + id);
        var elToSelect = li.previousSibling || li.nextSibling;
        this.$delete(this.exampleValues, id);

        if (this.selectedId === id) {
          this.selectedId = elToSelect ? elToSelect.id : null;
        }
        ohmEditor.examples.emit('remove:example', id);
      },

      // Return the contents of the example with the given id.
      getExample: function(id) {
        if (!(id in this.exampleValues)) {
          throw new Error(id + ' is not a valid example id');
        }
        return this.exampleValues[id];
      },

      getExamples: function() {
        // Return a deep clone.
        return JSON.parse(JSON.stringify(this.exampleValues));
      },

      // Set the contents of an example with the given id to `value`.
      setExample: function(id, text, optStartRule, optShouldMatch) {
        if (!(id in this.exampleValues)) {
          throw new Error(id + ' is not a valid example id');
        }

        var example = this.exampleValues[id];
        var oldValue = Object.assign({}, example);
        var newValue = {
          text: text,
          startRule: optStartRule || '',
          shouldMatch: optShouldMatch == null ? true : optShouldMatch
        };

        Object.assign(example, newValue);
        ohmEditor.examples.emit('set:example', id, oldValue, newValue);
      },

      toggleShouldMatch: function(id) {
        var example = this.exampleValues[id];
        example.shouldMatch = !example.shouldMatch;
      },

      getSelected: function() {
        if (this.selectedId) {
          return this.exampleValues[this.selectedId];
        }
      },

      // Select the example with the given id.
      setSelected: function(id) {
        this.selectedId = id;
      },

      setStartRule: function(id, ruleName) {
        this.exampleValues[id].startRule = ruleName;
      },

      // Restore the examples from localStorage or the given object.
      restoreExamples: function(key /* orExamples */) {
        var examples = [];
        if (typeof key === 'string') {
          var value = localStorage.getItem(key);
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

        var newExampleValues = {};

        var self = this;
        examples.forEach(function(ex) {
          var id = self.addExample();
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
      saveExamples: function() {
        var data = JSON.stringify(Object.keys(this.exampleValues).map(this.getExample));
        localStorage.setItem('examples', data);
      },

      // Try to match the example given by `id` against the current grammar.
      // Automatically executed whenever anything in `this.examplesValues` changes.
      updateExampleStatus: function(id) {
        // If the example was deleted, delete its status as well.
        if (!(id in this.exampleValues)) {
          this.$delete(this.exampleStatus, id);
          return;
        }
        if (this._grammar) {
          var example = this.getExample(id);
          var status;
          try {
            var matched = this._grammar.match(example.text, example.startRule).succeeded();
            status = {
              className: matched === example.shouldMatch ? 'pass' : 'fail'
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
      _watchExample: function(id, callback) {
        var opts = {deep: true};
        var unwatch = this.$watch('exampleValues.' + id, function(newVal, oldVal) {
          callback(id);
          if (newVal == null) {
            unwatch();
          }
        }, opts);
      }
    },
    created: function() {
      // This is not a data property because we don't want Vue to observe its internals.
      this._grammar = null;
    },
    mounted: function() {
      this.restoreExamples('examples');

      var self = this;
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
        var ex = self.getSelected();
        if (ex) {
          ex.text = source;
        }
      });
    }
  };
</script>
