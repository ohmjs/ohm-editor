<style src="./example-list.css"></style>

<template>
  <div id="exampleContainer">
    <div id="userExampleContainer">
      <h2>Examples</h2>

      <ul id="exampleList">
        <li v-for="(ex, id) in exampleValues" :id="id" :key="id" :class="classesForExample(id)"
            @mousedown.prevent="handleMouseDown">
          <code>{{ ex.text }}</code>
          <div class="startRule">{{ ex.startRule }}</div>
          <div class="sign" @click.prevent="handleSignClick">
            <span v-if="ex.shouldMatch" title="Example should pass">&#x1F44D;</span>
            <span v-else title="Example should fail">&#x1F44E;</span>
          </div>
          <div class="delete" @mousedown.prevent @click.prevent="handleDeleteClick"><span>&#x2715;</span></div>
        </li>
      </ul>
      <a id="addExampleLink" href="#" @click.prevent="handleAddClick">+ Add example</a>

      <div id="exampleBottom" class="flex-fix">
        <!-- Use a v-for just to bind `ex` to the currently-selected example. -->
        <div v-for="ex in selectedExampleAsArray" key="header" class="header">
          <div class="header-contents">
            <label>Start rule:</label>
            <select id="startRuleDropdown" v-model="ex.startRule">
              <option v-for="option in startRuleOptionsForExample(ex)" :key="option.value" :value="option.value"
                      :class="{needed: false /* TODO */}">{{ option.text }}
              </option>
            </select>
          </div>
        </div>
        <div v-show="selectedId" class="editorWrapper"></div>
        <div id="neededExamples">
          <ul class="exampleGeneratorUI hidden"></ul>
        </div>
      </div>
    </div>
    <div id="exampleSplitter" class="splitter vertical disabled"></div>
  </div>
</template>

<script>
  /* global CodeMirror */

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
    props: [],
    data: function() {
      return {
        grammar: null,
        selectedId: null,
        exampleValues: Object.create(null),

        // Maps an example id to a string: either 'pass' or 'fail'.
        exampleStatus: Object.create(null),

        // Indicates that the user is editing an example, but the change hasn't been committed yet.
        isInputPending: false
      };
    },
    computed: {
      commonStartRuleOptions: function() {
        var options = [{text: '(default)', value: ''}];
        if (this.grammar) {
          Object.keys(this.grammar.rules).forEach(function(ruleName) {
            options.push({text: ruleName, value: ruleName});
          });
        }
        return options;
      },
      selectedExampleAsArray: function() {
        return this.selectedId ? [this.exampleValues[this.selectedId]] : [];
      }
    },
    watch: {
      grammar: function() {
        // Re-check all the examples.
        Object.keys(this.exampleValues).forEach(this.updateExampleStatus);
      },
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
      classesForExample: function(id) {
        var pendingUpdate = this.indicatePendingInput(id);
        var classes = {
          example: true,
          selected: this.selectedId === id,
          pendingUpdate: pendingUpdate
        };
        // Add a class for the example status (either "pass" or "fail").
        if (id in this.exampleStatus && !pendingUpdate) {
          classes[this.exampleStatus[id]] = true;
        }
        return classes;
      },
      // An array of objects representing the options to show in #startRuleDropdown.
      startRuleOptionsForExample: function(ex) {
        var options = this.commonStartRuleOptions;

        // Ensure the example's start rule always appears in the dropdown, even if the
        // rule no longer appears in the grammar.
        if (!options.find(function(opt) { return opt.value === ex.startRule; })) {
          options.unshift({text: ex.startRule, value: ex.startRule});
        }
        return options;
      },
      handleAddClick: function(e) {
        this.addExample();
      },
      handleSignClick: function(e) {
        var id = e.target.closest('li.example').id;
        this.toggleShouldMatch(id);
      },
      handleDeleteClick: function(e) {
        var li = e.target.closest('li.example');
        this.deleteExample(li.id);
      },
      handleMouseDown: function(e) {
        var li = e.target.closest('li.example');
        this.selectedId = li.id;
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

        ohmEditor.ui.inputEditor.focus();
        ohmEditor.examples.emit('add:example', id);

        return id;
      },

      deleteExample: function(id, optListEl) {
        var li = optListEl || this.$el.querySelector('#' + id);
        var elToSelect = li.previousSibling || li.nextSibling;
        this.$delete(this.exampleValues, id);

        if (this.selectedId === id) {
          this.setSelected(elToSelect ? elToSelect.id : null);
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
        if (this.grammar) {
          var example = this.getExample(id);
          var status;
          try {
            var matched = this.grammar.match(example.text, example.startRule).succeeded();
            status = matched === example.shouldMatch ? 'pass' : 'fail';
          } catch (e) {
            status = 'fail';
          }
          this.$set(this.exampleStatus, id, status);
        } else {
          this.$delete(this.exampleStatus, id);
        }
      },

      _initializeInputEditor: function() {
        var editor = ohmEditor.ui.inputEditor =
            CodeMirror(domUtil.$('#exampleContainer .editorWrapper'));
        ohmEditor.emit('init:inputEditor', editor);
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
    mounted: function() {
      this._initializeInputEditor();
      this.restoreExamples('examples');

      var self = this;
      ohmEditor.addListener('change:grammar', function(source) {
        self.grammar = null;
      });
      ohmEditor.addListener('parse:grammar', function(matchResult, grammar, err) {
        self.grammar = grammar;
      });
      ohmEditor.addListener('change:inputEditor', function(source) {
        // Don't indicate that input is pending if the user just changed the selected example.
        if (!self._isSelectionChanging) {
          self.isInputPending = true;
        }
      });
      ohmEditor.addListener('change:input', function(source) {
        self.isInputPending = false;
        self.getSelected().text = source;
      });
    }
  };
</script>
