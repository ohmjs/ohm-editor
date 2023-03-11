import 'global-jsdom/register';

import { test } from 'uvu';
import * as assert from 'uvu/assert';

import TraceElementWalker from '../src/TraceElementWalker.js';

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
  assert.equal(walker.nextNode(), div.querySelector('#node0'));
  assert.is(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode(), div.querySelector('#node1'));
  assert.is(walker.exitingCurrentNode, false);

  // Since node2 is not marked as a leaf, it should get visited twice: once on the way
  // in, and once on the way out.
  assert.equal(walker.nextNode(), div.querySelector('#node2'));
  assert.is(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode(), div.querySelector('#node2'));
  assert.is(walker.exitingCurrentNode, true);

  assert.equal(walker.nextNode(), div.querySelector('#node0'));
  assert.is(walker.exitingCurrentNode, true);

  assert.equal(walker.nextNode(), div.querySelector('#node4'));
  assert.is(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode(), null);
  assert.is(walker.exitingCurrentNode, false);

  div.remove();
});

test('previousNode', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode().id !== 'node4'); // Go to last node
  assert.equal(walker.currentNode, div.querySelector('#node4'));
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.previousNode(), div.querySelector('#node0'));
  assert.equal(walker.exitingCurrentNode, true);

  assert.equal(walker.previousNode(), div.querySelector('#node2'));
  assert.equal(walker.exitingCurrentNode, true);
  assert.equal(walker.previousNode(), div.querySelector('#node2'));
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.previousNode(), div.querySelector('#node1'));
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.previousNode(), div.querySelector('#node0'));
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.previousNode(), null);
  assert.equal(walker.exitingCurrentNode, false);

  div.remove();
});

test('mixing nextNode and previousNode', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  walker.nextNode();
  assert.equal(walker.previousNode(), null);

  walker.nextNode();
  walker.nextNode();
  assert.equal(walker.previousNode().id, 'node0');

  walker.nextNode();

  // node2 gets visited twice (entering/leaving) because it doesn't have the 'leaf' class.
  assert.equal(walker.nextNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, false);
  assert.equal(walker.nextNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, true);

  assert.equal(walker.previousNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, false);
  assert.equal(walker.nextNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, true);

  assert.equal(walker.nextNode().id, 'node0');
  assert.equal(walker.exitingCurrentNode, true);

  assert.equal(walker.nextNode().id, 'node4');
  assert.equal(walker.nextNode(), null);

  div.remove();
});

test('startAtEnd option', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  assert.equal(walker.previousNode().id, 'node4');
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode(), null);
  assert.equal(walker.previousNode().id, 'node4');
  assert.equal(walker.exitingCurrentNode, false);

  div.querySelector('#node4').remove();

  const walker2 = new TraceElementWalker(div, {startAtEnd: true});
  assert.equal(walker2.previousNode().id, 'node0');
  assert.equal(walker2.exitingCurrentNode, true);
  assert.equal(walker2.nextNode(), null);
  assert.equal(walker2.previousNode().id, 'node0');
  assert.equal(walker2.exitingCurrentNode, true);

  div.remove();
});

test('going backwards from end', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode());
  assert.equal(walker.previousNode(), div.querySelector('#node4'));

  walker.nextNode();
  walker.nextNode();
  assert.is(walker.previousNode(), div.querySelector('#node4'));
  assert.equal(walker.previousNode(), div.querySelector('#node0'));

  div.remove();
});

test('step into', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = sel => div.querySelector(sel);

  walker.stepInto($('#node0'));
  assert.equal(walker.previousNode(), null);

  walker.stepInto($('#node0'));
  assert.equal(walker.currentNode.id, 'node0');
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode().id, 'node1');
  assert.equal(walker.exitingCurrentNode, false);

  assert.equal(walker.nextNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, false);
  assert.equal(walker.nextNode().id, 'node2');
  assert.equal(walker.exitingCurrentNode, true);

  walker.stepInto($('#node1'));
  assert.equal(walker.exitingCurrentNode, false);
  assert.equal(walker.nextNode().id, 'node2');

  div.remove();
});

test('step into from end', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  const $ = sel => div.querySelector(sel);

  walker.stepInto($('#node0'));
  assert.equal(walker.isAtEnd, false);

  div.remove();
});

test('step out', () => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = sel => div.querySelector(sel);

  walker.stepOut($('#node0'));
  assert.equal(walker.currentNode, $('#node0'));
  assert.equal(walker.previousNode(), $('#node2'));

  walker.stepOut($('#node2'));
  assert.equal(walker.currentNode, $('#node2'));
  assert.equal(walker.exitingCurrentNode, true);

  // node2 gets visited twice, so after stepping out, we are still on node2, but
  // not exiting this time.
  assert.equal(walker.previousNode(), $('#node2'));
  assert.equal(walker.exitingCurrentNode, false);

  div.remove();
});

test.run();
