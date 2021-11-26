/* global document */

const KeyCode = {
  ENTER: 13,
  ESC: 27,
};

// Hide the context menus when Esc or Enter is pressed, any click happens, or another
// context menu is brought up.
document.addEventListener('click', hideContextMenus);
document.addEventListener('contextmenu', hideContextMenus);
document.addEventListener('keydown', function (e) {
  if (e.keyCode === KeyCode.ESC || e.keyCode === KeyCode.ENTER) {
    hideContextMenus();
  }
});

function hideContextMenus() {
  const menus = document.querySelectorAll('.contextMenu');
  Array.prototype.forEach.call(menus, function (menu) {
    menu.hidden = true;
  });
}

function assert(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

export function $(sel) {
  return document.querySelector(sel);
}

export function $$(sel) {
  return Array.prototype.slice.call(document.querySelectorAll(sel));
}

export function clearAll(classSelector) {
  assert(classSelector[0] === '.', "Expected a selector beginning with '.'");
  const className = classSelector.slice(1);
  const nodes = document.querySelectorAll(classSelector);
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.remove(className);
  }
}

export function createElement(sel, optContent) {
  const parts = sel.split('.');
  let tagName = parts[0];
  if (tagName.length === 0) {
    tagName = 'div';
  }

  const el = document.createElement(tagName);
  el.className = parts.slice(1).join(' ');
  if (optContent) {
    el.textContent = optContent;
  }
  return el;
}

export function closestElementMatching(sel, startEl) {
  let el = startEl;
  while (el != null) {
    if (el.matches(sel)) {
      return el;
    }
    el = el.parentElement;
  }
}

// Add an event handler to `el` that is removed right after it runs.
export function once(el, eventType, cb) {
  el.addEventListener(eventType, function handler(e) {
    cb(e);
    el.removeEventListener(eventType, handler);
  });
}

export function toggleClasses(el, map) {
  for (const k in map) {
    if (Object.prototype.hasOwnProperty.call(map, k)) {
      el.classList.toggle(k, !!map[k]);
    }
  }
}

// Permanently add a menu item to the context menu.
// `menuId` is the value use as the 'id' attribute of the context menu.
// `id` is the value to use as the 'id' attribute of the DOM node.
// `label` is the text label of the item.
// `onClick` is a function to use as the onclick handler for the item.
// If an item with the same id was already added, then the old item will be updated
// with the new values from `label`, `enabled`, and `onClick`.
export function addMenuItem(menuId, id, label, enabled, onClick) {
  const itemList = document.querySelector('#' + menuId + ' ul');
  let li = itemList.querySelector('#' + id);
  if (!li) {
    li = itemList.appendChild(createElement('li'));
    li.id = id;
  }
  // Set the label.
  li.innerHTML = '<label></label>';
  li.firstChild.innerHTML = label;

  li.classList.toggle('disabled', !enabled);
  if (enabled) {
    li.onclick = onClick;
  }
  return li;
}
