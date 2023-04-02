/* eslint-env browser */

// Initializes a splitter element by patching the DOM and installing event handlers.
// `target` is the element whose width or height is adjusted by the splitter.
// `setSplit` is a callback which takes two arguments, indicating the desired ratio
// between the two elements.
export function initializeSplitter(splitter, isVertical, setSplit) {
  const handle = document.createElement('div');
  handle.classList.add('handle');
  splitter.appendChild(handle);

  let dragging = false;
  
  // This is assumed to be the element that the splitter divides.
  const parentEl = splitter.parentElement;

  const dragOverlay = document.querySelector('#dragOverlay');

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
      setSplit(pos, innerSize - pos);
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
    setSplit(-1, -1);
    e.preventDefault();
  };
}
