/* eslint-env browser */
/* global CheckedEmitter, Vue, d3, ohm */

'use strict';

var cmUtil = require('./cmUtil');
var domUtil = require('./domUtil');
var ohmEditor = require('./ohmEditor');

var ArrayProto = Array.prototype;
var $ = domUtil.$;

var UnicodeChars = {
  ANTICLOCKWISE_OPEN_CIRCLE_ARROW: '\u21BA',
  HORIZONTAL_ELLIPSIS: '\u2026',
  MIDDLE_DOT: '\u00B7'
};

var inputMark;
var grammarMark;
var defMark;

var nextNodeId = 0;

function getFreshNodeId() {
  return 'node-' + nextNodeId++;
}

function isRectInViewport(rect) {
  return rect.right > 0 && rect.left < window.innerWidth;
}

function clearMarks() {
  inputMark = cmUtil.clearMark(inputMark);
  grammarMark = cmUtil.clearMark(grammarMark);
  defMark = cmUtil.clearMark(defMark);
  ohmEditor.ui.grammarEditor.getWrapperElement().classList.remove('highlighting');
  ohmEditor.ui.inputEditor.getWrapperElement().classList.remove('highlighting');
}

// D3 Helpers
// ----------

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

// Trace element helpers
// ---------------------

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

// Return true if the trace element `el` should be collapsed by default.
function shouldTraceElementBeCollapsed(traceNode, context) {
  // Don't collapse unlabeled nodes (they can't be expanded), nodes with a collapsed ancestor,
  // or leaf nodes.
  if (context.collapsed || isLeaf(traceNode)) {
    return false;
  }

  // Collapse uppermost failure nodes.
  if (!traceNode.succeeded) {
    return true;
  }

  return context.syntactic && !isSyntactic(traceNode);
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

// Return true if `traceNode` should be treated as a leaf node in the parse tree.
function isLeaf(traceNode) {
  var pexpr = traceNode.expr;
  if (isPrimitive(pexpr)) {
    return true;
  }
  if (pexpr instanceof ohm.pexprs.Apply) {
    // If the rule body has no source, treat its implementation as opaque.
    var body = ohmEditor.grammar.rules[pexpr.ruleName].body;
    if (!body.source) {
      return true;
    }
  }
  if (isLRBaseCase(traceNode)) {
    return true;
  }
  return traceNode.children.length === 0;
}

function isPrimitive(expr) {
  return expr instanceof ohm.pexprs.Terminal ||
         expr instanceof ohm.pexprs.Range ||
         expr instanceof ohm.pexprs.UnicodeChar;
}

function isLRBaseCase(traceNode) {
  // If the children are exactly `[undefined]`, it's the base case for left recursion.
  // TODO: Figure out a better way to handle this when generating traces.
  return traceNode.children.length === 1 && traceNode.children[0] == null;
}

function hasVisibleLeftRecursion(traceNode) {
  return ohmEditor.options.showFailures && traceNode.terminatingLREntry != null;
}

function couldZoom(currentRootTrace, traceNode) {
  return currentRootTrace !== traceNode &&
         traceNode.succeeded &&
         !isLeaf(traceNode);
}

// trace-label component
// ---------------------

Vue.component('trace-label', {
  props: {
    traceNode: {type: Object, required: true},
    minWidth: {type: String, required: true}
  },
  computed: {
    extraInfo: function() {
      if (isLRBaseCase(this.traceNode)) {
        return '[LR]';
      }
    },
    inlineRuleNameParts: function() {
      var ruleName = this.traceNode.expr.ruleName;
      if (ruleName) {
        return ruleName.split('_');
      }
    },
    labelData: function() {
      if (this.traceNode.terminatesLR) {
        return {text: '[Grow LR]'};
      }
      if (this.inlineRuleNameParts) {
        return {
          text: this.inlineRuleNameParts[0],
          caseName: this.inlineRuleNameParts[1]
        };
      }
      var fullText = this.traceNode.displayString;

      // Truncate the label if it is too long, and show the full label in the tooltip.
      if (fullText.length > 20 && fullText.indexOf(' ') >= 0) {
        return {
          text: fullText.slice(0, 20) + UnicodeChars.HORIZONTAL_ELLIPSIS,
          tooltip: fullText
        };
      }
      return {text: fullText};
    }
  },
  methods: {
    emitHover: function() {
      this.$emit('hover');
    },
    emitUnhover: function() {
      this.$emit('unhover');
    },
    onClick: function(e) {
      var isPlatformMac = /Mac/.test(navigator.platform);
      var modifierKey = isPlatformMac ? e.metaKey : e.ctrlKey;

      if (e.altKey && !(e.shiftKey || e.metaKey)) {
        this.$emit('click', 'alt');
      } else if (modifierKey && !(e.altKey || e.shiftKey)) {
        this.$emit('click', 'cmd');
      } else {
        this.$emit('click');
      }
      e.preventDefault();
    },
    onContextMenu: function(e) {
      this.$emit('showContextMenu', {
        x: e.clientX,
        y: e.clientY - 6,
        traceNode: this.traceNode
      });
      e.stopPropagation();
      e.preventDefault();
    }
  },
  template: [
    '<div class="label" :title="labelData.tooltip" :style="{minWidth: minWidth}"',
    '     @mouseover="emitHover" @mouseout="emitUnhover" @click="onClick($event)"',
    '     @contextmenu="onContextMenu($event)">{{',
    '  labelData.text',
    '}}<span v-if="labelData.caseName" class="caseName">{{ labelData.caseName }}</span>',
    '<span v-if="extraInfo" class="info">{{ extraInfo }}</span>',
    '</div>'
  ].join('')
});

// trace-element component
// -----------------------

Vue.component('trace-element', {
  props: {
    traceNode: {type: Object, required: true},
    measureInputText: {type: Function},
    isInVBox: {type: Boolean},

    // from parent element
    context: {type: Object},

    // from currentLR
    currentLR: {type: Object, default: Object},
    eventHandlers: {type: Object}
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
    classObj: function() {
      var obj = {
        disclosure: this.labeled && this.isInVBox
      };
      var ctorName = this.traceNode.ctorName;
      if (ctorName) {
        obj[ctorName.toLowerCase()] = true;
      }

      obj.collapsed = this.labeled &&
        this.context &&
        shouldTraceElementBeCollapsed(this.traceNode, this.context);
      obj.failed = !this.traceNode.succeeded;
      obj.labeled = this.labeled;
      obj.leaf = this.isLeaf;
      return obj;
    },
    children: function() {
      if (this.collapsed) {
        return null;
      }

      var children = [];
      var self = this;
      this.traceNode.children.forEach(function(node) {
        // Don't show or recurse into nodes that failed, unless "Show failures" is enabled.
        if ((!node.succeeded && !ohmEditor.options.showFailures) ||
            (node.isImplicitSpaces && !ohmEditor.options.showSpaces)) {
          return;
        }
        // Don't bother showing whitespace nodes that didn't consume anything.
        var isWhitespace = node.expr.ruleName === 'spaces';
        if (isWhitespace && node.source.contents.length === 0) {
          return;
        }

        var traceElement = {
          traceNode: node,
          context: {
            parent: self,
            collapsed: self.collapsed,
            syntactic: self.labeled ? isSyntactic(node.expr) :
                                      self.context && self.context.syntactic,
            vbox: self.vbox
          },
          isInVBox: self.context ? self.context.vbox : false,
          currentLR: self.currentLR
        };
        children.push(traceElement);
      });
      return children;
    },
    minWidth: function() {
      return this.measureInputText(this.traceNode.source.contents) + 'px';
    }
  },
  data: function() {
    return {collapsed: false};
  },
  template: [
    '<div class="pexpr" :class="classObj" id="id">',
    '  <div v-if="labeled" class="self">',
    '    <trace-label :traceNode="traceNode" :minWidth="minWidth"',
    '                 @hover="onHover" @unhover="onUnhover" @click="onClick"',
    '                 @showContextMenu="onShowContextMenu" />',
    '  </div>',
    '  <div v-if="!isLeaf" ref="children"',
    '       class="children" :class="{vbox: vbox}"',
    '       :hidden="classObj.collapsed">',
    '    <trace-element v-for="child in children"',
    '                   :id="child.id" :traceNode="child.traceNode" :context="child.context"',
    '                   :currentLR="child.currentLR" :measureInputText="measureInputText"',
    '                   :isInVBox="child.isInVBox" :eventHandlers="eventHandlers">',
    '    </trace-element>',
    '  </div>',
    '</div>'
  ].join(''),
  mounted: function() {
    var el = this.$el;
    el._traceNode = this.traceNode;

    ohmEditor.parseTree.emit('create:traceElement', el, el._traceNode);
    if (this.classObj.collapsed) {
      ohmEditor.parseTree.emit('collapse:traceElement', el);
    }

    if (!this.isLeaf) {
      // On the next tick, children will be mounted.
      this.$nextTick(function() {
        ohmEditor.parseTree.emit('exit:traceElement', el, el._traceNode);
      });
    }
  },
  created: function() {
    this.initializeCollapsedState();
  },
  updated: function() {
    if (this.traceNode !== this.$el._traceNode) {
      this.$el._traceNode = this.traceNode;
      this.initializeCollapsedState();
    }
  },
  methods: {
    initializeCollapsedState: function() {
      this.collapsed = this.labeled &&
        this.context &&
        shouldTraceElementBeCollapsed(this.traceNode, this.context);
    },
    onHover: function() {
      var grammarEditor = ohmEditor.ui.grammarEditor;
      var inputEditor = ohmEditor.ui.inputEditor;

      var source = this.traceNode.source;
      var pexpr = this.traceNode.expr;

      // TODO: Can `source` ever be undefine/null here?
      if (source) {
        inputMark = cmUtil.markInterval(inputEditor, source, 'highlight', false);
        inputEditor.getWrapperElement().classList.add('highlighting');
      }
      if (pexpr.source) {
        grammarMark = cmUtil.markInterval(grammarEditor, pexpr.source, 'active-appl', false);
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
      // Caution: direct DOM manipulation here!
      // TODO: Consider using Vue.js <transition> wrapper element.
      var children = this.$refs.children;
      this.setCollapsed(!children.hidden);
    },
    // Hides or shows the children of `el`, which is a div.pexpr.
    setCollapsed: function(collapse, optDurationInMs) {
      if (!collapse && !this.children) {
        this.collapsed = collapse;
      }

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

      var self = this;
      this.$nextTick(function() {
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
    }
  }
});

// parse-results component
// -----------------------

Vue.component('parse-results', {
  props: {
    trace: {required: true},
    measureInputText: {type: Function, required: true},

    // An object {node: traceNode, class: string} that indicates a node to be highlighted,
    // and the class it should be given to indicate the highlight.
    highlightNode: {type: Object}
  },
  computed: {
    // Vue event handlers that are attached to each TraceElement component instance.
    pexprEventHandlers: function() {
      var self = this;
      return {
        showContextMenu: this.onShowContextMenu,
        hover: function() { self.emitUpdateExpandedInput(); },
        unhover: function() { self.emitUpdateExpandedInput(); },
        updateExpandedInput: this.emitUpdateExpandedInput
      };
    }
  },
  methods: {
    // To make it easier to navigate around the parse tree, handle mousewheel events
    // and translate vertical overscroll into horizontal movement. I.e., when scrolled all
    // the way down, further downwards scrolling instead moves to the right -- and similarly
    // with up and left.
    onWheel: function(e) {
      var el = this.$el;
      var overscroll;
      var scrollingDown = e.deltaY > 0;

      if (scrollingDown) {
        var scrollBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
        overscroll = e.deltaY - scrollBottom;
        if (overscroll > 0) {
          this.scrollLeft += overscroll;
        }
      } else {
        overscroll = el.scrollTop + e.deltaY;
        if (overscroll < 0) {
          this.scrollLeft += overscroll;
        }
      }
    },
    onScroll: function() {
      this.emitUpdateExpandedInput();
    },
    onShowContextMenu: function(data) {
      this.$emit('showContextMenu', data);
    },
    emitUpdateExpandedInput: function() {
      var args = Array.prototype.slice.call(arguments);
      this.$emit.apply(this, ['updateExpandedInput'].concat(args));
    }
  },
  render: function(createElement) {
    if (!this.trace) {
      return createElement('div');
    }
    var rootTraceElement = createElement('trace-element', {
      props: {
        traceNode: this.trace,
        isInVBox: false,
        currentLR: {},
        measureInputText: this.measureInputText,
        eventHandlers: this.pexprEventHandlers
      }
    });
    var rootContainer = createElement('div', {
      domProps: {id: 'parseResults'},
      on: {
        wheel: this.onWheel,
        scroll: this.onScroll
      }
    }, [rootTraceElement]);

    ohmEditor.parseTree.emit('render:parseTree', this.trace);
    this.$nextTick(function() {
      this.$emit('updateExpandedInput');
    });
    return rootContainer;
  }
});

// expanded-input component
// ------------------------

Vue.component('expanded-input', {
  computed: {
    canvasEl: function() {
      return this.$el.querySelector('canvas');
    },
    inputCtx: function() {
      return this.canvasEl.getContext('2d');
    }
  },
  template: [
    '<div id="expandedInputWrapper">',
    '  <div id="sizer">&nbsp;</div>',
    '  <canvas id="expandedInput" width="1" height="1"></canvas>',
    '</div>'
  ].join(''),
  mounted: function() {
    this.update();
  },
  methods: {
    getPixelRatio: function() {
      return window.devicePixelRatio || 1;
    },

    // Updates the size of the canvas to exactly cover the #sizer element.
    // As a side effect, the contents of the canvas are cleared.
    updateCanvasSize: function() {
      var el = this.canvasEl;
      var sizer = this.$el.querySelector('#sizer');
      var pixelRatio = this.getPixelRatio();
      el.width = sizer.offsetWidth * pixelRatio;
      el.height = sizer.offsetHeight * pixelRatio;
      el.style.width = sizer.offsetWidth + 'px';
      el.style.height = sizer.offsetHeight + 'px';
    },
    update: function(optAnimatingEl, isCollapsing, t) {
      this.updateCanvasSize();

      // If a parse tree node is currently being hovered, highlight it. If not, highlight
      // the node that has .zoomBorder, if one exists.
      var hovered = $('.pexpr > .self:hover');
      var highlightEl = hovered ? hovered.parentNode : $('.zoomBorder');

      // If there is an animating element, crossfade its input with the input of its
      // descendents -- fade in when collapsing, fade out when expanding.
      var animatingElAlpha = 0;
      if (optAnimatingEl) {
        animatingElAlpha = isCollapsing ? t : 1 - t;
      }

      var root = $('.pexpr');
      var firstFailedEl = domUtil.$('#parseResults > .pexpr > .children > .pexpr.failed');

      var self = this;
      (function renderInput(el, isAncestorAnimating) {
        var rect = el.getBoundingClientRect();

        // Skip anything that falls outside the viewport, and any failed nodes apart
        // from the first top-level failure.
        if (!isRectInViewport(rect) ||
            (el.classList.contains('failed') && el !== firstFailedEl)) {
          return;
        }

        if (el === highlightEl) {
          self.renderHighlight(el);
        }

        if (el.classList.contains('leaf') || el.classList.contains('collapsed')) {
          if (el === firstFailedEl) {
            self.renderFailedInputText(el, rect);
          } else {
            var alpha = isAncestorAnimating ? 1 - animatingElAlpha : 1;
            self.renderInputText(self.getConsumedInput(el), rect, alpha);
          }
        } else {
          // Is `el` currently animating?
          var isAnimating = el === optAnimatingEl;

          // Render the input of the animating element, even though it's not a leaf.
          if (isAnimating) {
            self.renderInputText(self.getConsumedInput(el), rect, animatingElAlpha);
          }

          // Ask the subtrees to render.
          var children = el.lastChild.childNodes;
          ArrayProto.forEach.call(children, function(childEl) {
            renderInput(childEl, isAnimating || isAncestorAnimating);
          });
        }
      })(root, false);
    },

    measureText: function(text) {
      // Always update the font before measuring -- devicePixelRatio may have changed.
      this.inputCtx.font = 16 * this.getPixelRatio() + 'px Menlo, Monaco, monospace';
      return this.inputCtx.measureText(text).width / this.getPixelRatio();
    },

    renderInputText: function(text, rect, optAlpha) {
      var textWidth = this.measureText(text);
      var letterPadding = (rect.right - rect.left - textWidth) / text.length / 2;
      var charWidth = textWidth / text.length;

      this.inputCtx.fillStyle = 'rgba(51, 51, 51, ' + (optAlpha == null ? 1 : optAlpha) + ')';
      this.inputCtx.textBaseline = 'top';

      var baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      var x = rect.left - baseRect.left;
      for (var i = 0; i < text.length; i++) {
        x += letterPadding;
        this.inputCtx.fillText(text[i], x * this.getPixelRatio(), 0);
        x += charWidth + letterPadding;
      }
      return x <= window.innerWidth;
    },

    renderFailedInputText: function(el, rect) {
      var text = el._traceNode.inputStream.sourceSlice(el._traceNode.pos);
      var baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      var renderRect = {
        bottom: rect.bottom,
        left: rect.left - baseRect.left,
        right: rect.left - baseRect.left + this.measureText(text),
        top: rect.top
      };
      this.renderInputText(text, renderRect, 0.5);
    },

    renderHighlight: function(el) {
      var elBounds = el.getBoundingClientRect();
      var pixelRatio = this.getPixelRatio();
      var baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      var rect = {
        x: (elBounds.left - baseRect.left) * pixelRatio,
        y: 0,
        width: (elBounds.right - elBounds.left) * pixelRatio,
        height: $('#expandedInput').height
      };
      this.inputCtx.fillStyle = '#B5D5FF';
      this.inputCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
    },

    getConsumedInput: function(el) {
      if (el._traceNode) {
        return el._traceNode.source.contents;
      }
    }
  }
});

var parseTreeVue = new Vue({
  el: '#parseTree',
  data: {
    rootTrace: null,
    zoomTrace: null,
    previewedZoomTrace: null
  },
  computed: {
    zoomButtonLabel: function() {
      return UnicodeChars.ANTICLOCKWISE_OPEN_CIRCLE_ARROW;
    },
    showZoomButton: function() {
      return this.zoomTrace || this.previewedZoomTrace;
    },
    currentRootTrace: function() {
      return this.zoomTrace || this.rootTrace;
    },
    zoomHighlight: function() {
      if (this.previewedZoomTrace) {
        return {node: this.previewedZoomTrace, class: 'zoomBorder'};
      }
    }
  },
  template: [
    '<div id="parseTree">',
    '  <button v-if="showZoomButton" id="zoomOutButton" type="button"',
    '          @click="zoomOut" @mouseover="previewZoom" @mouseout="unpreviewZoom">{{',
    '      zoomButtonLabel',
    '  }}</button>',
    '  <div id="visualizerBody">',
    '    <expanded-input ref="expandedInput" />',
    '    <parse-results :trace="currentRootTrace" :highlightNode="zoomHighlight"',
    '                   :measureInputText="measureInputText"',
    '                   @showContextMenu="showContextMenu"',
    '                   @updateExpandedInput="updateExpandedInput"/>',
    '  </div>',
    '</div>'
  ].join(''),
  mounted: function() {
    window.addEventListener('resize', this.$refs.expandedInput.update);
  },
  methods: {
    zoom: function(traceNode) {
      this.zoomTrace = traceNode;
      clearMarks();
    },
    zoomOut: function() {
      this.zoomTrace = this.previewedZoomTrace = null;
    },
    previewZoom: function() {
      this.previewedZoomTrace = this.zoomTrace;
      this.zoomTrace = null;
    },
    unpreviewZoom: function() {
      this.zoomTrace = this.previewedZoomTrace;
      this.previewedZoomTrace = null;
    },
    showContextMenu: function(data) {
      var zoomEnabled = couldZoom(this.rootTrace, data.traceNode);

      var menuDiv = $('#parseTreeMenu');
      menuDiv.style.left = data.x + 'px';
      menuDiv.style.top = data.y + 'px';
      menuDiv.hidden = false;

      var self = this;
      domUtil.addMenuItem('parseTreeMenu', 'getInfoItem', 'Get Info', false);
      domUtil.addMenuItem('parseTreeMenu', 'zoomItem', 'Zoom to Node', zoomEnabled, function() {
        self.zoom(data.traceNode);
      });
      ohmEditor.parseTree.emit('contextMenu', data.el, data.traceNode);
    },
    updateExpandedInput: function(/* ...args */) {
      this.$refs.expandedInput.update.apply(null, arguments);
    },
    measureInputText: function(text) {
      return this.$refs.expandedInput.measureText(text);
    }
  }
});

var parseTree = ohmEditor.parseTree = new CheckedEmitter();
parseTree.vue = parseTreeVue;

// When the user makes a change in either editor, show the bottom overlay to indicate
// that the parse tree is out of date.
function showBottomOverlay(changedEditor) {
  $('#bottomSection .overlay').style.width = '100%';
}
ohmEditor.addListener('change:inputEditor', showBottomOverlay);
ohmEditor.addListener('change:grammarEditor', showBottomOverlay);

ohmEditor.addListener('peek:ruleDefinition', function(ruleName) {
  if (ohmEditor.grammar.rules.hasOwnProperty(ruleName)) {
    var defInterval = ohmEditor.grammar.rules[ruleName].source;
    if (defInterval) {
      var grammarEditor = ohmEditor.ui.grammarEditor;
      defMark = cmUtil.markInterval(grammarEditor, defInterval, 'active-definition', true);
      cmUtil.scrollToInterval(grammarEditor, defInterval);
    }
  }
});

ohmEditor.addListener('unpeek:ruleDefinition', clearMarks);

// Refresh the parse tree after attempting to parse the input.
ohmEditor.addListener('parse:input', function(matchResult, trace) {
  $('#bottomSection .overlay').style.width = 0;  // Hide the overlay.
  $('#semantics').hidden = !ohmEditor.options.semantics;
  parseTree.vue.rootTrace = Object.freeze(trace);
});

/*
parseTree.refresh = function() {
  clearMarks();
  refreshParseTree(rootTrace);
};
*/
parseTree.setTraceElementCollapsed = function(el, collapsed, optDuration) {
  el.__vue__.setCollapsed(collapsed, optDuration);
};
parseTree.registerEvents({
  // Emitted when a new trace element `el` is created for `traceNode`.
  'create:traceElement': ['el', 'traceNode'],

  // Emitted when all of a trace element's subtrees have been created.
  'exit:traceElement': ['el', 'traceNode'],

  // Emitted when a trace element is expanded or collapsed.
  'expand:traceElement': ['el'],
  'collapse:traceElement': ['el'],

  // Emitted when the contextMenu for the trace element of `traceNode` is about to be shown.
  'contextMenu': ['target', 'traceNode'],

  // Emitted before start rendering the parse tree
  'render:parseTree': ['traceNode'],

  // Emitted after cmd/ctrl + 'click' on a label
  'cmdOrCtrlClick:traceElement': ['wrapper']
});
