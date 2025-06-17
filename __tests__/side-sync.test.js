/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');
const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

let addTrade;

function setupDom() {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const match = html.match(/<template id="trade-template">[\s\S]*?<\/template>/);
  document.body.innerHTML = `
    <select id="calendarType"></select>
    <div id="trades"></div>
    ${match[0]}
  `;
  document.getElementById('calendarType').value = 'gregorian';
}

beforeEach(() => {
  jest.resetModules();
  ({ addTrade } = require('../main'));
  setupDom();
});

test('side radio buttons stay opposite', () => {
  addTrade();
  const buy1 = document.querySelector("input[name='side1-0'][value='buy']");
  const sell1 = document.querySelector("input[name='side1-0'][value='sell']");
  const buy2 = document.querySelector("input[name='side2-0'][value='buy']");
  const sell2 = document.querySelector("input[name='side2-0'][value='sell']");

  expect(buy1.checked).toBe(true);
  expect(sell2.checked).toBe(true);

  sell1.checked = true;
  sell1.dispatchEvent(new Event('change', { bubbles: true }));
  expect(buy2.checked).toBe(true);

  sell2.checked = true;
  sell2.dispatchEvent(new Event('change', { bubbles: true }));
  expect(buy1.checked).toBe(true);
});
