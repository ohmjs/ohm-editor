/* eslint-env browser */
/* global Vue */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohm, root.ohmEditor, root.CodeMirror);
  }
})(this, function(ohm, ohmEditor, CodeMirror) {

  function copyWithoutDuplicates(array) {
    var noDuplicates = [];
    array.forEach(function(entry) {
      if (noDuplicates.indexOf(entry) < 0) {
        noDuplicates.push(entry);
      }
    });
    return noDuplicates;
  }

  // Get the list of rules that start with given prefix.
  function retrieveMatchedRules(prefix) {
    var ruleDict = ohmEditor.grammar.rules;
    return Object.keys(ruleDict).filter(function(rule) {
      return rule.startsWith(prefix);
    });
  }

  // TODO: clean up.
  // Get the list of arguments for action of the specified rule.
  function getArgDisplayList(ruleExpr) {
    var argDisplayList = [];

    var iterOp = '';
    var lookaheadOp = '';
    if (ruleExpr instanceof ohm.pexprs.Iter) {
      // Treat `Iter` expression as an iteration on each of its sub-expression,
      // i.e.  `("a" "b")+` shown as `"a"+ "b"+`
      iterOp = ruleExpr.operator;
      ruleExpr = ruleExpr.expr;
    } else if (ruleExpr instanceof ohm.pexprs.Lookahead) {
      // Treat `Lookahead` expression as a lookahead on each of its sub-expression,
      // i.e. `&("a" "b")` shown as `&"a" &"b"`
      lookaheadOp = '&';
      ruleExpr = ruleExpr.expr;
    }

    if (ruleExpr instanceof ohm.pexprs.Seq) {
      ruleExpr.factors.forEach(function(factor) {
        var factorDisplayList = getArgDisplayList(factor).map(function(display) {
          return lookaheadOp + display + iterOp;
        });
        argDisplayList = argDisplayList.concat(factorDisplayList);
      });
    } else if (ruleExpr instanceof ohm.pexprs.Alt) {
      // Handle the `Alt` expression the same way as the `toArgNameList`, i.e.
      // split each list into columns, and combine argument displays for the same column
      // as a single argument.
      var termArgDisplayLists = ruleExpr.terms.map(function(term) {
        return getArgDisplayList(term);
      });
      var numArgs = termArgDisplayLists[0].length;
      for (var colIdx = 0; colIdx < numArgs; colIdx++) {
        var col = [];
        for (var rowIdx = 0; rowIdx < ruleExpr.terms.length; rowIdx++) {
          col.push(termArgDisplayLists[rowIdx][colIdx]);
        }
        var uniqueNames = copyWithoutDuplicates(col).join('|');
        if (lookaheadOp || iterOp) {
          uniqueNames = lookaheadOp + '(' + uniqueNames + ')' + iterOp;
        }
        argDisplayList.push(uniqueNames);
      }
    } else if (!(ruleExpr instanceof ohm.pexprs.Not)) {
      // We skip `Not` as it won't be a semantics action function argument.
      argDisplayList.push(lookaheadOp + ruleExpr.toDisplayString() + iterOp);
    }
    return argDisplayList;
  }

  var bus = new Vue();

  // Hack to let both mouseover and up&down arrow both work for suggestion list
  bus.$data.mousePos = {x: 0, y: 0};
  bus.$data.isScrolled = false;
  window.onmousemove = function(event) {
    var preMousePos = bus.$data.mousePos;
    var currMousePos = {x: event.screenX, y: event.screenY};
    bus.$data.isScrolled = currMousePos.x === preMousePos.x && currMousePos.y === preMousePos.y;
    bus.$data.mousePos = currMousePos;
  };

  Vue.component('action-addtion', {
    template: [
      '<div class=addition>',
      ' <textarea v-model="value" @click="showSuggestions" @blur="hideSuggestions"',
      '           @keydown.esc="select" @keydown.enter="select"',
      '           @keydown.up.stop.prevent="preEntry"',
      '           @keydown.down.stop.prevent="nextEntry">',
      ' </textarea>',
      ' <button>add</button>',
      '</div>'
    ].join(''),
    data: function() {
      return {
        value: ''
      };
    },
    methods: {
      showSuggestions: function(event) {
        bus.$emit('showSuggestions', this.value);
      },
      hideSuggestions: function() {
        bus.$emit('hideSuggestions');
      },
      select: function(event) {
        event.preventDefault();
        // handleEntrySelection();
        this.value = '';
        bus.$emit('selectSuggestion');
      },
      preEntry: function(event) {
        bus.$emit('highlightPreEntry');
      },
      nextEntry: function(event) {
        bus.$emit('highlightNextEntry');
      }
    }
  });

  Vue.component('suggestion-entry', {
    template: [
      '<div class="entry" :class="[type, {selected: isSelected}]" :id="id"',
      '     @mouseover="highlight" @mousedown="select">',
      '   {{ name }}',
      ' <span class="case" v-if="extra && extra.length > 0">{{ extra }}</span>',
      '</div>'
    ].join(''),
    props: ['type', 'name', 'extra', 'id', 'index'],
    data: function() {
      return {
        isSelected: false
      };
    },
    methods: {
      highlight: function(event) {
        var self = this;
        this.$nextTick(function() {
          if (!bus.$data.isScrolled) {
            bus.$emit('highlightEntry', self.index);
          }
        });
      },
      select: function() {
        bus.$emit('addEditor', this.type, this.id);
      }
    },
    created: function() {
      if (this.index === 0) {
        this.isSelected = true;
      }

      var self = this;
      bus.$on('selectSuggestion', function() {
        if (self.isSelected) {
          bus.$emit('addEditor', self.type, self.id);
        }
      });
      bus.$on('highlightEntry', function(idx) {
        self.isSelected = idx === self.index;
        if (self.isSelected) {
          self.$el.scrollIntoView(false);
        }
      });
      bus.$on('highlightPreEntry', function() {
        if (self.isSelected) {
          var idx = self.index;
          self.$nextTick(function() {
            bus.$emit('highlightEntry', self.$el.previousSibling ? idx - 1 : idx);
          });
        }
      });
      bus.$on('highlightNextEntry', function() {
        if (self.isSelected) {
          var idx = self.index;
          self.$nextTick(function() {
            bus.$emit('highlightEntry', self.$el.nextSibling ? idx + 1 : idx);
          });
        }
      });
    }
  });

  Vue.component('suggestion-list', {
    template: [
      '<div id="suggestions" v-show="showing">',
      ' <suggestion-entry :type="suggestion.type" :name="suggestion.name"',
      '                   :extra="suggestion.extra" :id="suggestion.id" :index="index"',
      '                   v-for="(suggestion, index) in suggestions">',
      ' </suggestion-entry>',
      '</div>'
    ].join(''),
    data: function() {
      return {
        suggestions: [],
        showing: false
      };
    },
    methods: {
      update: function(prefix) {
        var suggestionList = this.suggestions = [];
        // If the prefix is not empty, add an entry to the list that represent
        // a helper function named as the prefix.
        if (prefix) {
          suggestionList.push({
            type: 'helper',
            name: prefix,
            extra: 'a helper function',
            id: prefix
          });
        }

        // Add all the rules that started with the prefix to the suggestion list.
        var matchedRules = retrieveMatchedRules(prefix);
        matchedRules.forEach(function(ruleKey) {
          var ruleParts = ruleKey.split('_');
          suggestionList.push({
            type: 'rule',
            name: ruleParts[0],
            extra: ruleParts[1],
            id: ruleKey
          });
        });
      }
    },
    created: function() {
      var self = this;
      bus.$on('showSuggestions', function(prefix) {
        self.showing = true;
        self.update(prefix);
      });
      bus.$on('hideSuggestions', function() {
        self.showing = false;
      });
    }
  });

  Vue.component('block', {
    template: [
      '<div class="block">',
      ' <div class="display" @click="toggle">{{ displayName }}</div>',
      ' <div class="real" contenteditable="true" v-show="showing">',
      '   {{ realName }}',
      ' </div>',
      '<div>'
    ].join(''),
    props: ['displayName', 'realName'],
    data: function() {
      return {
        showing: false
      };
    },
    methods: {
      toggle: function() {
        this.showing = !this.showing;
      }
    },
    created: function() {
      this.showing = this.displayName !== this.realName;
    }
  });

  Vue.component('editor', {
    template: [
      '<div class="editor" :class="[type]">',
      ' <div class="rule">',
      '   <div class="cstNodeName">{{ id }}</div>',
      '   <div class="blocks">',
      '    <block :displayName="block.display" :realName="block.real" v-for="block in blocks">',
      '    </block>',
      '   </div>',
      ' </div>',
      ' <div class="body" ref="body"></div>',
      '</div>'
    ].join(''),
    props: ['type', 'id', 'operation'],
    data: function() {
      return {
        codemirror: undefined,
        blocks: []
      };
    },
    methods: {
      saveAction: function() {
        var body = this.codemirror.getValue();
        var args = this.blocks.map(function(block) {
          return block.real;
        });
        ohmEditor.semantics.emit('save:action', this.operation, this.id, args, body);
      }
    },
    created: function() {
      var self = this;
      var ruleKey = this.id;
      var action = ohmEditor.semantics.getAction(this.operation, ruleKey);
      var bodyContent = action ? action._actionBody : '';

      var argList = action ? action._actionArguments :
        ohmEditor.grammar.rules[ruleKey].body.toArgumentNameList(1);
      var argDisplayList = getArgDisplayList(ohmEditor.grammar.rules[ruleKey].body);
      argDisplayList.forEach(function(argDisplay, idx) {
        // TODO: Real arg display, idx matching
        var block = {
          display: argDisplay,
          real: argList[idx]
        };
        self.blocks.push(block);
      });

      this.$nextTick(function() {
        var cm = self.codemirror = CodeMirror(self.$refs.body, {
          value: bodyContent
        });
        cm.setOption('extraKeys', {
          'Cmd-S': function() {
            bus.$emit('saveAction');
            self.$nextTick(function() {
              ohmEditor.parseTree.refresh(self.operation);
            });
          },
          'Ctrl-S': function() {
            bus.$emit('saveAction');
            self.$nextTick(function() {
              ohmEditor.parseTree.refresh(self.operation);
            });
          }
        });
        cm.setCursor({line: cm.lineCount()});
        cm.refresh();
        cm.focus();
      });

      bus.$on('saveAction', this.saveAction);
      bus.$on('focusEditor', function(type, id) {
        if (self.id === id && self.type === type) {
          self.$nextTick(function() {
            self.$el.focus();
            self.codemirror.setCursor({line: self.codemirror.lineCount()});
            self.codemirror.refresh();
            self.codemirror.focus();
          });
        }
      });
    }
  });

  Vue.component('semantics-body', {
    template: [
      '<div class="flex-fix">',
      ' <div class="editorWrapper">',
      ' <action-addtion v-show="loaded"></action-addtion>',
      ' <suggestion-list></suggestion-list>',
      ' <div is="editor" :type="child.type" :id="child.id" :operation="child.operation"',
      '      v-for="child in children"></div>',
      ' </div>',
      '</div>'
    ].join(''),
    data: function() {
      return {
        children: [],
        loaded: false,
        operation: undefined
      };
    },
    methods: {
      updateChildern: function() {
        var children = this.children = [];
        var operation = this.operation;
        this.loaded = true;
        // check if rule/helper
        var actionDict = ohmEditor.semantics.getActionDict(operation);
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
    },
    created: function() {
      var self = this;
      ohmEditor.semantics.addListener('select:operation', function(operationName) {
        self.operation = operationName;
        self.updateChildern();
      });
      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.loaded = false;
        self.children = [];
      });
      bus.$on('addEditor', function(type, id) {
        var hasEditor = self.children.filter(function(child) {
          return child.type === type && child.id === id;
        });
        if (hasEditor.length > 0) {
          bus.$emit('focusEditor', type, id);
          return;
        }
        self.children.push({
          type: type,
          id: id,
          operation: self.operation
        });
        bus.$emit('hideSuggestions');
      });

      ohmEditor.parseTree.addListener('cmdOrCtrlClick:traceElement', function(wrapper) {
        bus.$emit('addEditor', 'rule', wrapper._traceNode.bindings[0].ctorName);
      });
    }
  });
});
