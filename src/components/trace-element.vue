<template>
  <div class="pexpr" :class="classObj" id="id">
    <div v-if="labeled" class="self" :class="selfClassObj">
      <trace-label :traceNode="traceNode" :minWidth="minWidth"
                   @hover="onHover" @unhover="onUnhover" @click="onClick"
                   @showContextMenu="onShowContextMenu" />
      <semantics-result v-if="hasResult" :traceNode="traceNode"
                        @styleUpdate="updateSelfStyle"/>
    </div>
    <div v-if="!isLeaf" ref="children"
         class="children" :class="{vbox: vbox}"
         :hidden="collapsed">
      <trace-element v-for="child in childrenToRender"
                     :id="child.id" :traceNode="child.traceNode" :context="child.context"
                     :currentLR="child.currentLR" :measureInputText="measureInputText"
                     :isInVBox="child.isInVBox" :eventHandlers="eventHandlers"
                     :showResult="hasResult">
      </trace-element>
    </div>
  </div>
</template>

<script>
  /* global d3, ohm */
  'use strict';

  var $ = require('../domUtil').$;
  var cmUtil = require('../cmUtil');
  var isLeaf = require('../traceUtil').isLeaf;
  var ohmEditor = require('../ohmEditor');

  var traceLabel = require('./trace-label.vue');
  var semanticsResult = require('./semantics-result.vue');

  var nextNodeId = 0;

  // Helpers
  // -------

  function getFreshNodeId() {
    return 'node-' + nextNodeId++;
  }

  function currentHeightPx(optEl) {
    return (optEl || this).offsetHeight + 'px';
  }

  function tweenWithCallback(endValue, cb) {
    return function tween(d, i, a) {
      var interp = d3.interpolate(a, endValue);
      return function(t) {
        var stepValue = interp.call(this, t);
        cb(t);
        return stepValue;
      };
    };
  }

  function shouldNodeBeLabeled(traceNode) {
    var expr = traceNode.expr;

    // Don't label Seq and Alt nodes.
    if (expr instanceof ohm.pexprs.Seq || expr instanceof ohm.pexprs.Alt) {
      return false;
    }

    // Hide successful nodes that have no bindings.
    if (traceNode.succeeded && traceNode.bindings.length === 0) {
      return false;
    }

    return true;
  }

  function isAlt(expr) {
    return expr instanceof ohm.pexprs.Alt;
  }

  function isSyntactic(expr) {
    if (expr instanceof ohm.pexprs.Apply) {
      return expr.isSyntactic();
    }
    if (expr instanceof ohm.pexprs.Iter ||
        expr instanceof ohm.pexprs.Lookahead ||
        expr instanceof ohm.pexprs.Not) {
      return isSyntactic(expr.expr);
    }
    if (expr instanceof ohm.pexprs.Seq) {
      return expr.factors.some(isSyntactic);
    }
    return expr instanceof ohm.pexprs.Param;
  }

  /*
    When showing failures, the nodes representing the branches (choices) of an Alt node are
    stacked vertically. E.g., for a rule `width = pctWidth | pxWidth` where `pctWidth` fails,
    the nodes are layed out like this:

        width
        pctWidth
        pxWidth

    Since this could be confused with `pctWidth` being the parent node of `pxWidth`, we need
    to distinguish choice nodes visually when showing failures. This function returns true if
    `traceNode` is an Alt node whose children should be visually distinguished.
  */
  function hasVisibleChoice(traceNode) {
    if (isAlt(traceNode.expr) && ohmEditor.options.showFailures) {
      // If there's any failed child, we need to show multiple children.
      return traceNode.children.some(function(c) {
        return !c.succeeded;
      });
    }
    return false;
  }

  function hasVisibleLeftRecursion(traceNode) {
    return ohmEditor.options.showFailures && traceNode.terminatingLREntry != null;
  }

  function cloneObject(obj) {
    var newObj = Object.create(null);
    if (!obj) {
      return newObj;
    }
    Object.keys(obj).forEach(function(key) {
      newObj[key] = Array.prototype.slice.call(obj[key]);
    });
    return newObj;
  }

  // Exports
  // -------

  module.exports = {
    name: 'trace-element',
    components: {
      'trace-label': traceLabel,
      'semantics-result': semanticsResult
    },
    props: {
      traceNode: {type: Object, required: true},
      measureInputText: {type: Function},
      isInVBox: {type: Boolean},

      // from parent element
      context: {type: Object},

      eventHandlers: {type: Object},
      currentLR: {type: Object},

      showResult: {type: Boolean}
    },
    computed: {
      id: function() {
        return getFreshNodeId();
      },
      labeled: function() {
        return shouldNodeBeLabeled(this.traceNode);
      },
      vbox: function() {
        return hasVisibleChoice(this.traceNode) ||
               hasVisibleLeftRecursion(this.traceNode) ||
               (isAlt(this.traceNode.expr) && this.context && this.context.vbox);
      },
      isWhitespace: function() {
        return this.traceNode.ruleName === 'spaces';
      },
      isLeaf: function() {
        var leaf = isLeaf(this.traceNode);
        if (this.traceNode.isMemoized) {
          var memoKey = this.traceNode.expr.toMemoKey();
          var stack = this.currentLR[memoKey];
          if (stack && stack[stack.length - 1] === this.traceNode.pos) {
            leaf = true;
          }
        }
        return leaf;
      },
      initiallyCollapsed: function() {
        if (!this.labeled || this.isLeaf) {
          return false;
        }
        // Collapse uppermost failure nodes.
        if (!this.traceNode.succeeded) {
          return true;
        }
        // Collapse the non-syntactic nodes that are in syntactic contexts.
        return this.context.syntactic && !isSyntactic(this.traceNode);
      },
      classObj: function() {
        var obj = {
          disclosure: this.labeled && this.isInVBox
        };
        var ctorName = this.traceNode.ctorName;
        if (ctorName) {
          obj[ctorName.toLowerCase()] = true;
        }
        obj.collapsed = this.collapsed;
        obj.failed = !this.traceNode.succeeded;
        obj.labeled = this.labeled;
        obj.leaf = this.isLeaf;
        return obj;
      },
      // The children to actually be rendered in the DOM. By using a separate property, we can
      // defer calculation of the children until the first time the node is expanded.
      childrenToRender: function() {
        if (this.initiallyCollapsed && !this.hasUserToggledCollapsedState) {
          return null;
        }
        return this.children;
      },
      children: function() {
        var children = [];
        var self = this;

        this.traceNode.children.forEach(function(node) {
          // Don't show or recurse into nodes that failed, unless "Explain parse" is enabled.
          if ((!node.succeeded && !ohmEditor.options.showFailures) ||
              (node.isImplicitSpaces && !ohmEditor.options.showSpaces)) {
            return;
          }
          // Don't bother showing whitespace nodes that didn't consume anything.
          var isWhitespace = node.expr.ruleName === 'spaces';
          if (isWhitespace && node.source.contents.length === 0) {
            return;
          }

          var lrObj = cloneObject(self.currentLR);
          var traceElement = {
            traceNode: node,
            context: {
              syntactic: self.labeled ? isSyntactic(node.expr) :
                                        self.context && self.context.syntactic,
              vbox: self.vbox
            },
            isInVBox: self.vbox,
            currentLR: lrObj,
            showResult: self.hasResult
          };
          children.push(traceElement);
        });

        if (hasVisibleLeftRecursion(this.traceNode)) {
          var lrObj = cloneObject(self.currentLR);
          var memoKey = this.traceNode.expr.toMemoKey();
          var stack = lrObj[memoKey] || [];
          lrObj[memoKey] = stack;
          stack.push(this.traceNode.pos);
          children.push({
            traceNode: this.traceNode.terminatingLREntry,
            context: this.context,
            isInVBox: true,
            currentLR: lrObj,
            showResult: this.hasResult
          });
        }
        return children;
      },
      minWidth: function() {
        return this.measureInputText(this.traceNode.source.contents) + 'px';
      }
    },
    data: function() {
      return {
        collapsed: false,
        hasUserToggledCollapsedState: false,
        hasResult: this.showResult,
        selfClassObj: {}
      };
    },
    beforeMount: function() {
      this.initializeCollapsedState();
    },
    mounted: function() {
      var el = this.$el;
      el._traceNode = this.traceNode;

      ohmEditor.parseTree.emit('create:traceElement', el, el._traceNode);
      if (this.collapsed) {
        ohmEditor.parseTree.emit('collapse:traceElement', el);
      }

      if (!this.isLeaf) {
        // On the next tick, children will be mounted.
        this.$nextTick(function() {
          ohmEditor.parseTree.emit('exit:traceElement', el, el._traceNode);
        });
      }

      var self = this;
      ohmEditor.semantics.addListener('select:operation', function(operation) {
        self.hasResult = true;
      });

      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.hasResult = false;
        self.selfClassObj = {};
      });
    },
    beforeUpdate: function() {
      if (this.traceNode !== this.$el._traceNode) {
        this.initializeCollapsedState();
      }
    },
    updated: function() {
      this.$el._traceNode = this.traceNode;
    },
    methods: {
      initializeCollapsedState: function() {
        this.collapsed = this.initiallyCollapsed;
        this.hasUserToggledCollapsedState = false;
      },
      onHover: function() {
        var grammarEditor = ohmEditor.ui.grammarEditor;
        var inputEditor = ohmEditor.ui.inputEditor;

        var source = this.traceNode.source;
        var pexpr = this.traceNode.expr;

        // TODO: Can `source` ever be undefine/null here?
        if (source) {
          // inputMark = cmUtil.markInterval(inputEditor, source, 'highlight', false);
          inputEditor.getWrapperElement().classList.add('highlighting');
        }
        if (pexpr.source) {
          // grammarMark = cmUtil.markInterval(grammarEditor, pexpr.source, 'active-appl', false);
          grammarEditor.getWrapperElement().classList.add('highlighting');
          cmUtil.scrollToInterval(grammarEditor, pexpr.source);
        }
        var ruleName = pexpr.ruleName;
        if (ruleName) {
          ohmEditor.emit('peek:ruleDefinition', ruleName);
        }
        this.eventHandlers.hover();
      },
      onUnhover: function() {
        ohmEditor.emit('unpeek:ruleDefinition');
        this.eventHandlers.unhover();
      },
      onClick: function(modifier) {
        if (modifier === 'alt') {
          console.log(this.traceNode);  // eslint-disable-line no-console
        } else if (modifier === 'cmd') {
          // cmd/ctrl + click to open or close semantic editor
          ohmEditor.parseTree.emit('cmdOrCtrlClick:traceElement', this.$el);
        } else if (!isLeaf(this.traceNode)) {
          this.toggleCollapsed();
        }
      },
      onShowContextMenu: function(data) {
        data.el = this.$el;
        this.eventHandlers.showContextMenu(data);
      },
      toggleCollapsed: function() {
        this.setCollapsed(!this.collapsed);
      },
      // Hides or shows the children of `el`, which is a div.pexpr.
      setCollapsed: function(collapse, optDurationInMs) {
        this.collapsed = collapse;
        this.hasUserToggledCollapsedState = true;
        this.selfClassObj.tmpNextStep = this.collapsed && this.selfClassObj.optNextStep;

        var duration = optDurationInMs != null ? optDurationInMs : 500;
        var el = this.$el;

        function emitEvent() {
          el.classList.toggle('collapsed', collapse);
          ohmEditor.parseTree.emit((collapse ? 'collapse' : 'expand') + ':traceElement', el);
        }

        if (duration === 0) {
          el.lastChild.hidden = !collapse;
          emitEvent();
          el.lastChild.hidden = collapse;
          return;
        }

        // Caution: direct DOM manipulation here!
        // TODO: Consider using Vue.js <transition> wrapper element.
        var self = this;
        this.$nextTick(function() {
          // Temporarily toggle the visibility of the children, which is the pre-transition state.
          el.lastChild.hidden = !el.lastChild.hidden;

          var childrenSize = self.measureChildren();
          var newWidth = collapse ? self.measureLabel().width : childrenSize.width;
          d3.select(el)
            .transition().duration(duration)
            .styleTween('width', tweenWithCallback(newWidth + 'px', function(t) {
              self.eventHandlers.updateExpandedInput(el, collapse, t);
            }))
            .each('start', function() {
              this.style.width = this.offsetWidth + 'px';
            })
            .each('end', function() {
              // Remove the width and allow the flexboxes to adjust to the correct
              // size. If there is a glitch when this happens, we haven't calculated
              // `newWidth` correctly.
              this.style.width = '';
            });

          var height = collapse ? 0 : childrenSize.height;
          d3.select(el.lastChild)
              .style('height', currentHeightPx)
              .transition().duration(duration)
              .style('height', height + 'px')
              .each('start', function() {
                if (!collapse) {
                  emitEvent();
                  this.hidden = false;
                }
              })
              .each('end', function() {
                this.style.height = '';
                if (collapse) {
                  this.hidden = true;
                  emitEvent();
                }
                self.eventHandlers.updateExpandedInput();
              });
        });
      },
      measureLabel: function() {
        var tempWrapper = $('#measuringDiv .pexpr');
        var labelClone = this.$el.querySelector('.label').cloneNode(true);
        var clone = tempWrapper.appendChild(labelClone);
        var result = {
          width: clone.offsetWidth,
          height: clone.offsetHeight
        };
        tempWrapper.innerHTML = '';
        return result;
      },
      measureChildren: function() {
        var measuringDiv = $('#measuringDiv');
        var clone = measuringDiv.appendChild(this.$el.cloneNode(true));
        clone.style.width = '';
        var children = clone.lastChild;
        children.hidden = !children.hidden;
        var result = {
          width: children.offsetWidth,
          height: children.offsetHeight
        };
        measuringDiv.removeChild(clone);
        return result;
      },
      updateSelfStyle: function(classObj, optNextStep) {
        this.selfClassObj = classObj;
        if (this.collapsed) {
          this.selfClassObj.tmpNextStep = !!this.selfClassObj.optNextStep;
        }
      }
    }
  };
</script>
