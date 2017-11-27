/* global document */

'use strict';

const TraceElementWalker = require('../src/TraceElementWalker');
const test = require('tape');

function createTestDiv() {
  const doc = document;
  const div = doc.body.appendChild(doc.createElement('div'));
  div.innerHTML = [
    '<p>',
    '  <div id="node0" class="pexpr labeled" hidden>',
    '    <p>',
    '      <div class="pexpr">',
    '        <div id="node1" class="pexpr labeled leaf"></div>',
    '      </div>',
    '      <div id="node2" class="pexpr labeled"></div>',
    '    </p>',
    '  </div>',
    '  <div id="node4" class="pexpr labeled leaf"></div>',
    '</p>'
  ].join('');

  return div;
}

test('nextNode', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  // Ensure that it does an in-order traversal of the tree, ignoring any nodes
  // that don't have the 'pexpr' and 'labeled' classes (but not their children).
  t.equal(walker.nextNode(), div.querySelector('#node0'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode(), div.querySelector('#node1'));
  t.equal(walker.exitingCurrentNode, false);

  // Since node2 is not marked as a leaf, it should get visited twice: once on the way
  // in, and once on the way out.
  t.equal(walker.nextNode(), div.querySelector('#node2'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode(), div.querySelector('#node2'));
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.nextNode(), div.querySelector('#node0'));
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.nextNode(), div.querySelector('#node4'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode(), null);
  t.equal(walker.exitingCurrentNode, false);

  div.remove();

  t.end();
});

test('previousNode', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode().id !== 'node4'); // Go to last node
  t.equal(walker.currentNode, div.querySelector('#node4'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.previousNode(), div.querySelector('#node0'));
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.previousNode(), div.querySelector('#node2'));
  t.equal(walker.exitingCurrentNode, true);
  t.equal(walker.previousNode(), div.querySelector('#node2'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.previousNode(), div.querySelector('#node1'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.previousNode(), div.querySelector('#node0'));
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.previousNode(), null);
  t.equal(walker.exitingCurrentNode, false);

  div.remove();

  t.end();
});

test('mixing nextNode and previousNode', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  walker.nextNode();
  t.equal(walker.previousNode(), null);

  walker.nextNode();
  walker.nextNode();
  t.equal(walker.previousNode().id, 'node0');

  walker.nextNode();

  // node2 gets visited twice (entering/leaving) because it doesn't have the 'leaf' class.
  t.equal(walker.nextNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, false);
  t.equal(walker.nextNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.previousNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, false);
  t.equal(walker.nextNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.nextNode().id, 'node0');
  t.equal(walker.exitingCurrentNode, true);

  t.equal(walker.nextNode().id, 'node4');
  t.equal(walker.nextNode(), null);

  div.remove();

  t.end();
});

test('startAtEnd option', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  t.equal(walker.previousNode().id, 'node4');
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode(), null);
  t.equal(walker.previousNode().id, 'node4');
  t.equal(walker.exitingCurrentNode, false);

  div.querySelector('#node4').remove();

  const walker2 = new TraceElementWalker(div, {startAtEnd: true});
  t.equal(walker2.previousNode().id, 'node0');
  t.equal(walker2.exitingCurrentNode, true);
  t.equal(walker2.nextNode(), null);
  t.equal(walker2.previousNode().id, 'node0');
  t.equal(walker2.exitingCurrentNode, true);

  div.remove();

  t.end();
});

test('going backwards from end', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  while (walker.nextNode());
  t.equal(walker.previousNode(), div.querySelector('#node4'));

  walker.nextNode();
  walker.nextNode();
  t.equal(walker.previousNode(), div.querySelector('#node4'), "can't go past end");
  t.equal(walker.previousNode(), div.querySelector('#node0'));

  div.remove();

  t.end();
});

test('step into', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = sel => div.querySelector(sel);

  walker.stepInto($('#node0'));
  t.equal(walker.previousNode(), null);

  walker.stepInto($('#node0'));
  t.equal(walker.currentNode.id, 'node0');
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode().id, 'node1');
  t.equal(walker.exitingCurrentNode, false);

  t.equal(walker.nextNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, false);
  t.equal(walker.nextNode().id, 'node2');
  t.equal(walker.exitingCurrentNode, true);

  walker.stepInto($('#node1'));
  t.equal(walker.exitingCurrentNode, false);
  t.equal(walker.nextNode().id, 'node2');

  div.remove();

  t.end();
});

test('step into from end', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div, {startAtEnd: true});

  const $ = sel => div.querySelector(sel);

  walker.stepInto($('#node0'));
  t.equal(walker.isAtEnd, false);

  div.remove();

  t.end();
});

test('step out', t => {
  const div = createTestDiv();
  const walker = new TraceElementWalker(div);

  const $ = sel => div.querySelector(sel);

  walker.stepOut($('#node0'));
  t.equal(walker.currentNode, $('#node0'));
  t.equal(walker.previousNode(), $('#node2'));

  walker.stepOut($('#node2'));
  t.equal(walker.currentNode, $('#node2'));
  t.equal(walker.exitingCurrentNode, true);

  // node2 gets visited twice, so after stepping out, we are still on node2, but
  // not exiting this time.
  t.equal(walker.previousNode(), $('#node2'));
  t.equal(walker.exitingCurrentNode, false);

  div.remove();

  t.end();
});
