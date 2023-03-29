/* eslint-env browser */

function toStorageKey(el, suffix) {
  return 'splitter-' + el.id + '-' + suffix;
}

// Initializes a splitter element by patching the DOM and installing event handlers.
// `target` is the element whose width or height is adjusted by the splitter.
export function initializeSplitter(splitter, target) {
  const handle = document.createElement('div');
  handle.classList.add('handle');
  splitter.appendChild(handle);

  const isVertical = splitter.classList.contains('vertical');
  let dragging = false;
  const parentEl = splitter.parentElement;

  const dragOverlay = document.querySelector('#dragOverlay');

  // Set the size of the splitter element's preceding sibling to the given value.
  function setSiblingSize(value) {
    const body = document.querySelector('body');
    const prop = isVertical ? 'width' : 'height';
    const className = isVertical ? 'columnsResized' : 'rowsResized';
    if (value === '') {
      target.style[prop] = value;
      body.classList.remove(className);
    } else {
      target.style[prop] = value;
      body.classList.add(className);
    }
    if (splitter.id) {
      localStorage.setItem(toStorageKey(splitter, 'prev'), value);
    }
  }

  handle.onmousedown = function (e) {
    if (!splitter.classList.contains('disabled')) {
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
