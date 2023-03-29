/* eslint-env browser */

function toStorageKey(el, suffix) {
  return 'splitter-' + el.id + '-' + suffix;
}

// Initializes a splitter element by patching the DOM and installing event handlers.
function initializeSplitter(el) {
  const handle = document.createElement('div');
  handle.classList.add('handle');
  el.appendChild(handle);

  const isVertical = el.classList.contains('vertical');
  let dragging = false;
  const prevEl = el.previousElementSibling;
  const parentEl = el.parentElement;

  const dragOverlay = document.querySelector('#dragOverlay');

  // Set the size of the splitter element's preceding sibling to the given value.
  function setSiblingSize(value) {
    const body = document.querySelector('body');
    const prop = isVertical ? 'width' : 'height';
    const className = isVertical ? 'columnsResized': 'rowsResized';
    if (value === '') {
      prevEl.style[prop] = value;
      body.classList.remove(className);
    } else {
      prevEl.style[prop] = value;
      body.classList.add(className);
    }
    if (el.id) {
      localStorage.setItem(toStorageKey(el, 'prev'), value);
    }
  }

  handle.onmousedown = function (e) {
    if (!el.classList.contains('disabled')) {
      dragging = true;
      dragOverlay.style.display = 'block';
      dragOverlay.style.cursor = isVertical ? 'ew-resize' : 'ns-resize';
      e.preventDefault();
    }
  };
  window.addEventListener('mousemove', e => {
    const parentElBounds = parentEl.getBoundingClientRect();
    const relativeX = e.clientX - parentElBounds.left;
    const relativeY = e.clientY - parentElBounds.top;

    const innerSize = isVertical ? parentElBounds.width : parentElBounds.height;
    const pos = isVertical ? relativeX : relativeY;

    if (dragging && pos > 0 && pos < innerSize) {
      setSiblingSize(`${pos}px`);
      e.preventDefault();
      e.stopPropagation();
    }
  });
  window.addEventListener('mouseup', e => {
    dragging = false;
    dragOverlay.removeAttribute('style');
  });

  // Reset the sizes to 50% when the handle is double-clicked.
  handle.ondblclick = function (e) {
    setSiblingSize('');
  };
}

// Initialize all the splitters on the page.
// A splitter is a <div> that has the class '.splitter' and no children.
// If it also has the class '.vertical', it is a vertical splitter (i.e, it splits
// two columns). Otherwise, it is assumed to be a horizontal splitter.
const splitters = document.querySelectorAll('.splitter');
for (let i = 0; i < splitters.length; ++i) {
  initializeSplitter(splitters[i]);
}
