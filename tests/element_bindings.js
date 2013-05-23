// Copyright 2013 Google Inc.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

suite('Element Bindings', function() {

  // Note: DOMNodeInserted/Removed only fire in webkit if the node is rooted in
  // document. This is just an attachment point so that tests will pass in
  // webkit.
  var testDiv;

  setup(function() {
    testDiv = document.body.appendChild(document.createElement('div'));
  });

  teardown(function() {
    document.body.removeChild(testDiv);
  });

  function dispatchEvent(type, target) {
    var event = document.createEvent('Event');
    event.initEvent(type, true, false);
    target.dispatchEvent(event);
    Platform.performMicrotaskCheckpoint();
  }

  test('Text', function() {
    var text = document.createTextNode('hi');
    var model = {a: 1, b: 2};
    text.textContent = '{{a}} and {{b}}';
    HTMLTemplateElement.bindAllMustachesFrom_(text, model);
    Platform.performMicrotaskCheckpoint();

    assert.strictEqual('1 and 2', text.data);

    model.a = 3;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('3 and 2', text.data);
  });

  test('SimpleBinding', function() {
    var el = document.createElement('div');
    var model = {a: '1'};
    el.bind('foo', model, 'a');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('1', el.getAttribute('foo'));

    model.a = '2';
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('2', el.getAttribute('foo'));

    model.a = 232.2;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('232.2', el.getAttribute('foo'));

    model.a = 232;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('232', el.getAttribute('foo'));

    model.a = null;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('null', el.getAttribute('foo'));

    model.a = undefined;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('', el.getAttribute('foo'));
  });

  test('SimpleBindingWithDashes', function() {
    var el = document.createElement('div');
    var model = {a: '1'};
    el.bind('foo-bar', model, 'a');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('1', el.getAttribute('foo-bar'));

    model.a = '2';
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('2', el.getAttribute('foo-bar'));
  });

  test('SimpleBindingWithComment', function() {
    var el = document.createElement('div');
    el.innerHTML = '<!-- Comment -->';
    var model = {a: '1'};
    el.bind('foo-bar', model, 'a');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('1', el.getAttribute('foo-bar'));

    model.a = '2';
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('2', el.getAttribute('foo-bar'));
  });

  test('PlaceHolderBindingText', function() {
    var model = {
      adj: 'cruel',
      noun: 'world'
    };

    var el = document.createElement('div');
    el.textContent = 'dummy';
    el.firstChild.textContent = 'Hello {{ adj }} {{noun}}!';
    HTMLTemplateElement.bindAllMustachesFrom_(el, model);

    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('Hello cruel world!', el.textContent);

    model.adj = 'happy';
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('Hello happy world!', el.textContent);
  });

  test('InputElementTextBinding', function() {
    var model = {val: 'ping'};

    var el = document.createElement('input');
    el.bind('value', model, 'val');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('ping', el.value);

    el.value = 'pong';
    dispatchEvent('input', el);
    assert.strictEqual('pong', model.val);

    // Try a deep path.
    model = {
      a: {
        b: {
          c: 'ping'
        }
      }
    };

    el.bind('value', model, 'a.b.c');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('ping', el.value);

    el.value = 'pong';
    dispatchEvent('input', el);
    assert.strictEqual('pong', PathObserver.getValueAtPath(model, 'a.b.c'));

    // Start with the model property being absent.
    delete model.a.b.c;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('', el.value);

    el.value = 'pong';
    dispatchEvent('input', el);
    assert.strictEqual('pong', PathObserver.getValueAtPath(model, 'a.b.c'));
    Platform.performMicrotaskCheckpoint();

    // Model property unreachable (and unsettable).
    delete model.a.b;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('', el.value);

    el.value = 'pong';
    dispatchEvent('input', el);
    assert.strictEqual(undefined, PathObserver.getValueAtPath(model, 'a.b.c'));
  });

  test('InputElementCheckbox', function() {
    var model = {val: true};

    var el = document.createElement('input');
    testDiv.appendChild(el);
    el.type = 'checkbox';
    el.bind('checked', model, 'val');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(true, el.checked);

    model.val = false;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(false, el.checked);

    el.click();
    assert.strictEqual(true, model.val);

    el.click();
    assert.strictEqual(false, model.val);

    el.addEventListener('click', function() {
      assert.strictEqual(true, model.val);
    });
    el.addEventListener('change', function() {
      assert.strictEqual(true, model.val);
    });

    var event = document.createEvent('MouseEvent');
    event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    el.dispatchEvent(event);
  });

  test('InputElementCheckbox - binding updated on click', function() {
    var model = {val: true};

    var el = document.createElement('input');
    testDiv.appendChild(el);
    el.type = 'checkbox';
    el.bind('checked', model, 'val');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(true, el.checked);

    el.addEventListener('click', function() {
      assert.strictEqual(false, model.val);
    });

    var event = document.createEvent('MouseEvent');
    event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    el.dispatchEvent(event);
  });

  test('InputElementCheckbox - binding updated on change', function() {
    var model = {val: true};

    var el = document.createElement('input');
    testDiv.appendChild(el);
    el.type = 'checkbox';
    el.bind('checked', model, 'val');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(true, el.checked);

    el.addEventListener('change', function() {
      assert.strictEqual(false, model.val);
    });

    var event = document.createEvent('MouseEvent');
    event.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false,
        false, false, false, 0, null);
    el.dispatchEvent(event);
  });

  test('InputElementRadio', function() {
    var model = {val1: true, val2: false, val3: false, val4: true};
    var RADIO_GROUP_NAME = 'test';

    var container = document.body.appendChild(document.createElement('div'));

    var el1 = container.appendChild(document.createElement('input'));
    el1.type = 'radio';
    el1.name = RADIO_GROUP_NAME;
    el1.bind('checked', model, 'val1');

    var el2 = container.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    el2.bind('checked', model, 'val2');

    var el3 = container.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    el3.bind('checked', model, 'val3');

    var el4 = container.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = 'othergroup';
    el4.bind('checked', model, 'val4');

    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(true, el1.checked);
    assert.strictEqual(false, el2.checked);
    assert.strictEqual(false, el3.checked);
    assert.strictEqual(true, el4.checked);

    model.val1 = false;
    model.val2 = true;
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(false, el1.checked);
    assert.strictEqual(true, el2.checked);
    assert.strictEqual(false, el3.checked);
    assert.strictEqual(true, el4.checked);

    el1.checked = true;
    dispatchEvent('change', el1);
    assert.strictEqual(true, model.val1);
    assert.strictEqual(false, model.val2);
    assert.strictEqual(false, model.val3);
    assert.strictEqual(true, model.val4);

    el3.checked = true;
    dispatchEvent('change', el3);
    assert.strictEqual(false, model.val1);
    assert.strictEqual(false, model.val2);
    assert.strictEqual(true, model.val3);
    assert.strictEqual(true, model.val4);

    document.body.removeChild(container);
  });

  test('InputElementRadioMultipleForms', function() {
    var model = {val1: true, val2: false, val3: false, val4: true};
    var RADIO_GROUP_NAME = 'test';

    var container = document.body.appendChild(document.createElement('div'));
    var form1 = container.appendChild(document.createElement('form'));
    var form2 = container.appendChild(document.createElement('form'));

    var el1 = form1.appendChild(document.createElement('input'));
    el1.type = 'radio';
    el1.name = RADIO_GROUP_NAME;
    el1.bind('checked', model, 'val1');

    var el2 = form1.appendChild(document.createElement('input'));
    el2.type = 'radio';
    el2.name = RADIO_GROUP_NAME;
    el2.bind('checked', model, 'val2');

    var el3 = form2.appendChild(document.createElement('input'));
    el3.type = 'radio';
    el3.name = RADIO_GROUP_NAME;
    el3.bind('checked', model, 'val3');

    var el4 = form2.appendChild(document.createElement('input'));
    el4.type = 'radio';
    el4.name = RADIO_GROUP_NAME;
    el4.bind('checked', model, 'val4');

    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(true, el1.checked);
    assert.strictEqual(false, el2.checked);
    assert.strictEqual(false, el3.checked);
    assert.strictEqual(true, el4.checked);

    el2.checked = true;
    dispatchEvent('change', el2);
    assert.strictEqual(false, model.val1);
    assert.strictEqual(true, model.val2);

    // Radio buttons in form2 should be unaffected
    assert.strictEqual(false, model.val3);
    assert.strictEqual(true, model.val4);

    el3.checked = true;
    dispatchEvent('change', el3);
    assert.strictEqual(true, model.val3);
    assert.strictEqual(false, model.val4);

    // Radio buttons in form1 should be unaffected
    assert.strictEqual(false, model.val1);
    assert.strictEqual(true, model.val2);

    document.body.removeChild(container);
  });

  test('BindToChecked', function() {
    var div = document.createElement('div');
    testDiv.appendChild(div);
    var child = div.appendChild(document.createElement('div'));
    var input = child.appendChild(document.createElement('input'));
    input.type = 'checkbox';

    var model = {
      a: {
        b: false
      }
    };

    input.bind('checked', model, 'a.b');

    input.click();
    assert.isTrue(model.a.b);

    input.click();
    assert.isFalse(model.a.b);
  });

  test('Select selectedIndex', function() {
    var select = document.createElement('select');
    testDiv.appendChild(select);
    var option0 = select.appendChild(document.createElement('option'));
    var option1 = select.appendChild(document.createElement('option'));
    var option2 = select.appendChild(document.createElement('option'));

    var model = {
      val: 2
    };

    select.bind('selectedIndex', model, 'val');
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual(2, select.selectedIndex);

    select.selectedIndex = 1;
    dispatchEvent('change', select);
    assert.strictEqual(1, model.val);
  });

  test('MultipleReferences', function() {
    var el = document.createElement('div');
    var model = {foo: 'bar'};
    el.setAttribute('foo', '{{foo}} {{foo}}');
    HTMLTemplateElement.bindAllMustachesFrom_(el, model);
    Platform.performMicrotaskCheckpoint();
    assert.strictEqual('bar bar', el.getAttribute('foo'));
  });
});