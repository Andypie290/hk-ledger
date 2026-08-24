// Lightweight DOM stub: runs app.js init + save + renderAll to catch runtime errors.
function makeClassList() {
  return {
    add() {}, remove() {}, toggle() {}, contains() { return false; }
  };
}

function makeElement() {
  return {
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    title: '',
    dataset: {},
    classList: makeClassList(),
    handlers: {},
    addEventListener(type, fn) { (this.handlers[type] = this.handlers[type] || []).push(fn); },
    querySelector() { return makeElement(); },
    querySelectorAll() { return []; }
  };
}

const elements = {};
function getElement(sel) {
  if (!elements[sel]) elements[sel] = makeElement();
  return elements[sel];
}

const store = {};
global.window = {
  addEventListener() {},
  scrollTo() {}
};
global.document = {
  readyState: 'complete',
  querySelector(sel) { return getElement(sel); },
  querySelectorAll() { return []; },
  addEventListener() {},
  createElement() { return makeElement(); },
  body: { appendChild() {}, removeChild() {} }
};
global.localStorage = {
  getItem(key) { return store[key] || null; },
  setItem(key, val) { store[key] = String(val); }
};
global.navigator = {};

require('../app.js');

const amount = getElement('#amountInput');
const note = getElement('#noteInput');
amount.value = '32.5';
note.value = 'MTR 八达通充值';
getElement('#saveBtn').handlers.click[0]();

const saved = JSON.parse(store['hkledger.v1']);
if (!saved || saved.records.length !== 1) throw new Error('record was not saved');
if (saved.records[0].amount !== 32.5 || saved.records[0].currency !== 'HKD') throw new Error('record data wrong');
if (saved.records[0].category !== 'dining') throw new Error('default category wrong');

if (!getElement('#kpiTotal').textContent.includes('32.50')) throw new Error('kpi total not rendered');
if (!getElement('#donutBox').innerHTML.includes('<svg')) throw new Error('donut not rendered');
if (!getElement('#monthBars').innerHTML.includes('vbar')) throw new Error('month bars not rendered');
if (!getElement('#weekdayBars').innerHTML.includes('hbar')) throw new Error('weekday bars not rendered');
if (!getElement('#categoryManager').innerHTML.includes('餐饮')) throw new Error('category manager not rendered');

console.log('smoke test passed');
console.log('records:', saved.records.length);
console.log('kpi:', getElement('#kpiTotal').textContent);
