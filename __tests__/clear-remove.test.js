/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');
const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

let addTrade, clearTrade, removeTrade;

function setupDom() {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const match = html.match(/<template id="trade-template">[\s\S]*?<\/template>/);
  document.body.innerHTML = `
    <select id="calendarType"></select>
    <div id="trades"></div>
    ${match[0]}
    <textarea id="final-output"></textarea>
  `;
  document.getElementById('calendarType').value = 'gregorian';
}

beforeEach(() => {
  jest.resetModules();
  ({ addTrade, clearTrade, removeTrade } = require('../src/ui-handlers'));
  setupDom();
});

test('clearTrade resets fields and output', () => {
  addTrade();
  document.getElementById('qty-0').value = '10';
  document.querySelector("input[name='side1-0'][value='sell']").checked = true;
  document.getElementById('type1-0').value = 'Fix';
  document.getElementById('fixDate1-0').value = '2025-01-15';
  document.getElementById('output-0').textContent = 'test';
  document.getElementById('final-output').value = 'test';

  clearTrade(0);

  expect(document.getElementById('qty-0').value).toBe('');
  expect(document.querySelector("input[name='side1-0'][value='buy']").checked).toBe(true);
  expect(document.getElementById('type1-0').value).toBe('');
  expect(document.getElementById('fixDate1-0').value).toBe('');
  expect(document.getElementById('output-0').textContent).toBe('');
  expect(document.getElementById('final-output').value).toBe('');
});

test('removeTrade deletes block and renumbers remaining trades', () => {
  addTrade();
  addTrade();

  expect(document.querySelectorAll('.trade-title')[1].textContent).toBe('Trade 2');

  removeTrade(0);

  expect(document.getElementById('trade-0')).toBeNull();
  const titles = Array.from(document.querySelectorAll('.trade-title')).map(el => el.textContent);
  expect(titles).toEqual(['Trade 1']);
});
