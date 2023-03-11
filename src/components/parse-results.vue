<script>
import ohmEditor from '../ohmEditor.js';
import traceElement from './trace-element.vue';

const EMPTY_LR_INFO = {};

// Exports
// -------

export default {
  name: 'parse-results',
  props: {
    trace: {required: true},
    measureInputText: {type: Function, required: true},

    // An object {node: traceNode, class: string} that indicates a node to be highlighted,
    // and the class it should be given to indicate the highlight.
    highlightNode: {type: Object},
  },
  computed: {
    // Vue event handlers that are attached to each TraceElement component instance.
    pexprEventHandlers() {
      const self = this;
      return {
        showContextMenu: this.onShowContextMenu,
        hover() {
          self.emitUpdateExpandedInput();
        },
        unhover() {
          self.emitUpdateExpandedInput();
        },
        updateExpandedInput: this.emitUpdateExpandedInput,
      };
    },
  },
  provide: {
    inSyntacticContext: false,
  },
  methods: {
    // To make it easier to navigate around the parse tree, handle mousewheel events
    // and translate vertical overscroll into horizontal movement. I.e., when scrolled all
    // the way down, further downwards scrolling instead moves to the right -- and similarly
    // with up and left.
    onWheel(e) {
      const el = this.$el;
      let overscroll;
      const scrollingDown = e.deltaY > 0;

      if (scrollingDown) {
        const scrollBottom = el.scrollHeight - el.clientHeight - el.scrollTop;
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
    onScroll() {
      this.emitUpdateExpandedInput();
    },
    onShowContextMenu(data) {
      this.$emit('showContextMenu', data);
    },
    emitUpdateExpandedInput(...args) {
      this.$emit('updateExpandedInput', ...args);
    },
  },
  render(createElement) {
    if (!this.trace) {
      return createElement('div');
    }
    const rootTraceElement = createElement(traceElement, {
      props: {
        id: 'node-0',
        traceNode: this.trace,
        isInVBox: false,
        currentLR: EMPTY_LR_INFO,
        measureInputText: this.measureInputText,
        eventHandlers: this.pexprEventHandlers,
      },
    });
    const rootContainer = createElement(
      'div',
      {
        domProps: {id: 'parseResults'},
        on: {
          wheel: this.onWheel,
          scroll: this.onScroll,
        },
      },
      [rootTraceElement]
    );

    ohmEditor.parseTree.emit('render:parseTree', this.trace);
    this.$nextTick(() => {
      this.$emit('updateExpandedInput');
    });
    return rootContainer;
  },
};
</script>
