<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');
  var traceElement = require('./trace-element.vue');

  // Exports
  // -------

  module.exports = {
    name: 'parse-results',
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
    mounted: function() {
      var self = this;
      ohmEditor.semantics.addListener('select:operation', function(operation) {
        ohmEditor.semantics.emit('render:semanticResult', self.trace, operation);
      });

      ohmEditor.semantics.addListener('update:results', function(operation) {
        ohmEditor.semantics.emit('render:semanticResult', self.trace, operation);
      });
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
      var rootTraceElement = createElement(traceElement, {
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
  };
</script>
