/* eslint-env jest */
/** @jest-environment jsdom */

import TraceElementWalker from '../src/TraceElementWalker';

function createTestDiv() {
  const doc = document;
  const div = doc.body.appendChild(doc.createElement('div'));
  div.innerHTML = `
    <p>
      <div id="node0" class="pexpr labeled" hidden>
        <p>
          <div class="pexpr">
            <div id="node1" class="pexpr labeled leaf"></div>
          </div>
          <div id="node2" class="pexpr labeled"></div>
        </p>
      </div>
      <div id="node4" class="pexpr labeled leaf"></div>
    </p>
  `;
  return div;
}

test('nextNode', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  // Ensure that it does an in-order traversal of the tree, ignoring any nodes
  // that don't have the 'pexpr' and 'labeled' classes (but not their children).
  expect(walker.nextNode()).toEqual(div.querySelector('#node0'));
  expect(walker.exitingCurrentNode).toBe(false);

  expect(walker.nextNode()).toEqual(div.querySelector('#node1'));
  expect(walker.exitingCurrentNode).toBe(false);

  // Since node2 is not marked as a leaf, it should get visited twice: once on the way
  // in, and once on the way out.
  expect(walker.nextNode()).toEqual(div.querySelector('#node2'));
  expect(walker.exitingCurrentNode).toBe(false);

  expect(walker.nextNode()).toEqual(div.querySelector('#node2'));
  expect(walker.exitingCurrentNode).toBe(true);

  expect(walker.nextNode()).toEqual(div.querySelector('#node0'));
  expect(walker.exitingCurrentNode).toBe(true);

  expect(walker.nextNode()).toEqual(div.querySelector('#node4'));
  expect(walker.exitingCurrentNode).toBe(false);

  expect(walker.nextNode()).toEqual(null);
  expect(walker.exitingCurrentNode).toBe(false);

  div.remove();
});

test('previousNode', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode().id !== 'node4'); // Go to last node
  expect(walker.currentNode).toEqual(div.querySelector('#node4'));
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.previousNode()).toEqual(div.querySelector('#node0'));
  expect(walker.exitingCurrentNode).toEqual(true);

  expect(walker.previousNode()).toEqual(div.querySelector('#node2'));
  expect(walker.exitingCurrentNode).toEqual(true);
  expect(walker.previousNode()).toEqual(div.querySelector('#node2'));
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.previousNode()).toEqual(div.querySelector('#node1'));
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.previousNode()).toEqual(div.querySelector('#node0'));
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.previousNode()).toEqual(null);
  expect(walker.exitingCurrentNode).toEqual(false);

  div.remove();
});

test('mixing nextNode and previousNode', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  walker.nextNode();
  expect(walker.previousNode()).toEqual(null);

  walker.nextNode();
  walker.nextNode();
  expect(walker.previousNode().id).toEqual('node0');

  walker.nextNode();

  // node2 gets visited twice (entering/leaving) because it doesn't have the 'leaf' class.
  expect(walker.nextNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(false);
  expect(walker.nextNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(true);

  expect(walker.previousNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(false);
  expect(walker.nextNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(true);

  expect(walker.nextNode().id).toEqual('node0');
  expect(walker.exitingCurrentNode).toEqual(true);

  expect(walker.nextNode().id).toEqual('node4');
  expect(walker.nextNode()).toEqual(null);

  div.remove();
});

test('startAtEnd option', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  expect(walker.previousNode().id).toEqual('node4');
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.nextNode()).toEqual(null);
  expect(walker.previousNode().id).toEqual('node4');
  expect(walker.exitingCurrentNode).toEqual(false);

  div.querySelector('#node4').remove();

  const walker2 = new TraceElementWalker(div, {startAtEnd: true});
  expect(walker2.previousNode().id).toEqual('node0');
  expect(walker2.exitingCurrentNode).toEqual(true);
  expect(walker2.nextNode()).toEqual(null);
  expect(walker2.previousNode().id).toEqual('node0');
  expect(walker2.exitingCurrentNode).toEqual(true);

  div.remove();
});

test('going backwards from end', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode());
  expect(walker.previousNode()).toEqual(div.querySelector('#node4'));

  walker.nextNode();
  walker.nextNode();
  expect(walker.previousNode()).toBe(div.querySelector('#node4'));
  expect(walker.previousNode()).toEqual(div.querySelector('#node0'));

  div.remove();
});

test('step into', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = (sel) => div.querySelector(sel);

  walker.stepInto($('#node0'));
  expect(walker.previousNode()).toEqual(null);

  walker.stepInto($('#node0'));
  expect(walker.currentNode.id).toEqual('node0');
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.nextNode().id).toEqual('node1');
  expect(walker.exitingCurrentNode).toEqual(false);

  expect(walker.nextNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(false);
  expect(walker.nextNode().id).toEqual('node2');
  expect(walker.exitingCurrentNode).toEqual(true);

  walker.stepInto($('#node1'));
  expect(walker.exitingCurrentNode).toEqual(false);
  expect(walker.nextNode().id).toEqual('node2');

  div.remove();
});

test('step into from end', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  const $ = (sel) => div.querySelector(sel);

  walker.stepInto($('#node0'));
  expect(walker.isAtEnd).toEqual(false);

  div.remove();
});

test('step out', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = (sel) => div.querySelector(sel);

  walker.stepOut($('#node0'));
  expect(walker.currentNode).toEqual($('#node0'));
  expect(walker.previousNode()).toEqual($('#node2'));

  walker.stepOut($('#node2'));
  expect(walker.currentNode).toEqual($('#node2'));
  expect(walker.exitingCurrentNode).toEqual(true);

  // node2 gets visited twice, so after stepping out, we are still on node2, but
  // not exiting this time.
  expect(walker.previousNode()).toEqual($('#node2'));
  expect(walker.exitingCurrentNode).toEqual(false);

  div.remove();
});
