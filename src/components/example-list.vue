<style src="./example-list.css"></style>
<template>
  <div id="exampleContainer">
    <div id="userExampleContainer">
      <h2>Examples
        <input id="addExampleButton" type="button" value="+"></input>
      </h2>
      <ul id="exampleList"></ul>
      <div id="exampleBottom" class="flex-fix">
        <div class="editorWrapper"></div>
        <div id="neededExamples">
          <ul class="exampleGeneratorUI hidden"></ul>
        </div>
      </div>
    </div>
    <div id="exampleSplitter" class="splitter vertical disabled"></div>
  </div>
</div>
</template>
<script>
  /* eslint-env browser */
  /* global CodeMirror */

  'use strict';

  var ohmEditor = require('../ohmEditor');
  var domUtil = require('../domUtil');

  var idCounter = 0;

  // Helpers
  // -------

  function uniqueId() {
    return 'example-' + idCounter++;
  }

  function getListEl(exampleId) {
    return domUtil.$('#' + exampleId);
  }

  // Exports
  // -------

  module.exports = {
    name: 'example-list',
    props: [],
    data: function() {
      return {
        selectedId: -1,
        exampleValues: Object.create(null)
      };
    },
    methods: {
      handleSave: function(cm) {
        var id = this.selectedId;
        if (id !== -1) {
          var selectEl = domUtil.$('#startRuleDropdown');
          var value = cm.getValue();
          var startRule = selectEl && selectEl.options[selectEl.selectedIndex].value;
          var shouldMatch = this.exampleValues[id].shouldMatch;
          this.setExample(id, value, startRule, shouldMatch);
          this.saveExamples();
        }
      },
      initializeInputEditor: function() {
        ohmEditor.ui.inputEditor = CodeMirror(domUtil.$('#exampleContainer .editorWrapper'));

        // Hide the inputEditor by default, only showing it when there is a selected example.
        ohmEditor.ui.inputEditor.getWrapperElement().hidden = true;

        ohmEditor.ui.inputEditor.setOption('extraKeys', {
          'Cmd-S': this.handleSave,
          'Ctrl-S': this.handleSave
        });
        ohmEditor.emit('init:inputEditor', ohmEditor.ui.inputEditor);
      },
      // Add a new example to the list, and return its ID.
      addExample: function() {
        var li = domUtil.createElement('li.example');
        var id = li.id = uniqueId();
        li.onmousedown = this.handleMouseDown;

        var codeEl = li.appendChild(domUtil.createElement('code'));
        var exampleTextEl = codeEl.appendChild(domUtil.createElement('span.code'));
        var startRuleEl = codeEl.appendChild(domUtil.createElement('span.startRule'));

        exampleTextEl.onmousedown = this.handleMouseDown;
        startRuleEl.onmousedown = this.handleMouseDown;

        this.exampleValues[id] = {
          text: '',
          startRule: null
        };

        var self = this;
        var sign = li.appendChild(domUtil.createElement('div.sign'));
        sign.onmousedown = function(e) {
          e.stopPropagation();  // Prevent selection.
        };
        sign.onclick = function() {
          var example = this.exampleValues[id];
          example.shouldMatch = !example.shouldMatch;  // Toggle value.

          this.setExample(id, example.text, example.startRule, example.shouldMatch);
          this.saveExamples();
        };
        this.exampleValues[id].shouldMatch = true;

        var del = li.appendChild(domUtil.createElement('div.delete'));
        del.innerHTML = '&#x2716;';
        del.onmousedown = function(e) {
          e.stopPropagation();  // Prevent selection.
        };
        del.onclick = function() {
          var elToSelect = li.previousSibling || li.nextSibling;
          li.remove();
          delete this.exampleValues[id];
          self.saveExamples();
          if (self.selectedId === id) {
            self.setSelected(elToSelect ? elToSelect.id : -1);
          }

          ohmEditor.examples.emit('remove:example', id);
        };

        domUtil.$('#exampleContainer ul').appendChild(li);
        ohmEditor.ui.inputEditor.focus();

        ohmEditor.examples.emit('add:example', id);

        return id;
      },

      // Return the contents of the example with the given id.
      getExample: function(id) {
        if (!(id in this.exampleValues)) {
          throw new Error(id + ' is not a valid example id');
        } else {
          return this.exampleValues[id];
        }
      },

      getExamples: function() {
        return this.exampleValues;
      },

      // Set the contents of an example the given id to `value`.
      setExample: function(id, text, optStartRule, shouldMatch) {
        if (!(id in this.exampleValues)) {
          throw new Error(id + ' is not a valid example id');
        }

        var startRule = optStartRule || null;
        var oldValue = this.exampleValues[id];
        var value = this.exampleValues[id] = {
          text: text,
          startRule: startRule,
          shouldMatch: shouldMatch
        };

        var listItem = getListEl(id);
        var code = listItem.querySelector('code > span.code');
        var startRuleEl = listItem.querySelector('code > span.startRule');
        var sign = listItem.querySelector('div.sign');

        code.startRule = startRule;
        code.parentElement.classList.remove('pass', 'fail');
        setTimeout(this.checkExample.bind(this, id), 0);
        if (value.text.length > 0) {
          code.textContent = text;
        } else {
          code.innerHTML = '&nbsp;';
        }

        if (startRule !== null) {
          startRuleEl.textContent = startRule;
        } else {
          startRuleEl.textContent = '';
        }

        if (value.shouldMatch) {
          sign.innerHTML = '&#x1F44D;';
          sign.setAttribute('title', 'Example should pass');
        } else {
          sign.innerHTML = '&#x1F44E;';
          sign.setAttribute('title', 'Example should fail');
        }

        ohmEditor.examples.emit('set:example', id, oldValue, value);
      },

      getSelected: function() {
        if (this.selectedId !== -1) {
          return this.exampleValues[this.selectedId];
        } else {
          return null;
        }
      },

      // Select the example with the given id.
      setSelected: function(id) {
        var el;
        var value = {
          text: '',
          startRule: null
        };
        var inputEditor = ohmEditor.ui.inputEditor;
        if (id !== -1) {
          value = this.getExample(id);
          el = getListEl(id);
        }
        this.selectedId = id;

        inputEditor.setValue(value.text);

        // Update the DOM.
        var current = domUtil.$('#exampleContainer .selected');
        if (current !== el) {
          if (current) {
            current.classList.remove('selected');
          }
          if (el) {
            el.classList.add('selected');
          }
        }

        inputEditor.getWrapperElement().hidden = !el;
        inputEditor.focus();

        ohmEditor.examples.emit('set:selected', id);
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
              return {
                text: elem.textContent,
                startRule: null
              };
            });
          }
        } else {
          examples = key;
        }

        // remove previous examples
        var self = this;
        domUtil.$$('#exampleContainer ul li.example').forEach(function(li) {
          delete self.exampleValues[li.id];
          li.remove();
        });

        examples.forEach(function(ex) {
          if (!ex.hasOwnProperty('shouldMatch')) {
            ex.shouldMatch = true;
          }
          self.setExample(self.addExample(), ex.text, ex.startRule, ex.shouldMatch);
        });

        // Select the first example.
        var firstEl = domUtil.$('#exampleList li:first-child');
        var firstId = firstEl ? firstEl.id : -1;
        this.setSelected(firstId);
      },

      // Save the current contents of all examples to localStorage.
      saveExamples: function() {
        var self = this;
        localStorage.setItem('examples', JSON.stringify(
          Object.keys(this.exampleValues).map(function(key) {
            return self.exampleValues[key];
          })
        ));
      },
      handleMouseDown: function(e) {
        var li = e.target.closest('li.example');
        this.setSelected(li.id);
      },
      checkExample: function(id) {
        var example;
        try {
          example = this.getExample(id);
        } catch (e) {
          return;  // TODO: Handle this in a better way.
        }
        var text = example.text;
        var startRule = example.startRule;
        var el = getListEl(id);
        var succeeded;
        try {
          var matchResult = ohmEditor.grammar.match(text, startRule);
          succeeded = matchResult.succeeded();
        } catch (e) {
          succeeded = false;
        }
        el.classList.toggle('pass', succeeded === example.shouldMatch);
        el.classList.toggle('fail', !succeeded === example.shouldMatch);
      }
    },
    mounted: function() {
      this.initializeInputEditor();

      var self = this;
      domUtil.$('#addExampleButton').onclick = function(e) {
        self.setSelected(self.addExample());
      };
      this.restoreExamples('examples');

      ohmEditor.addListener('parse:grammar', function(matchResult, grammar, err) {
        Object.keys(self.exampleValues).forEach(function(id) {
          var el = getListEl(id);
          if (err) {
            el.classList.remove('pass', 'fail');
          } else {
            self.checkExample(id);
          }
        });
      });
    }
  };
</script>
