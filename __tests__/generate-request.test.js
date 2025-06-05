/** @jest-environment jsdom */

const calendarUtils = require('../calendar-utils');
global.calendarUtils = calendarUtils;

const { getSecondBusinessDay, getFixPpt, generateRequest } = require('../main');

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById('calendarType').value = 'gregorian';

function setupDom() {
  document.body.innerHTML += `
    <input id="qty-0" />
    <input type="radio" name="side1-0" value="buy" checked>
    <input type="radio" name="side1-0" value="sell">
    <select id="type1-0"><option value="AVG">AVG</option><option value="Fix">Fix</option></select>
    <select id="month1-0"><option>January</option><option>February</option></select>
    <select id="year1-0"><option>2025</option></select>
    <input type="radio" name="side2-0" value="buy">
    <input type="radio" name="side2-0" value="sell" checked>
    <select id="type2-0"><option value="Fix">Fix</option><option value="C2R">C2R</option><option value="AVG">AVG</option></select>
    <select id="month2-0"><option>February</option></select>
    <select id="year2-0"><option>2025</option></select>
    <input id="fixDate-0" />
    <input type="checkbox" id="samePpt-0" />
    <p id="output-0"></p>
    <textarea id="final-output"></textarea>
  `;
}

describe('generateRequest', () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="calendarType"></select>';
    document.getElementById('calendarType').value = 'gregorian';
    setupDom();
  });

  test('creates AVG request text', () => {
    document.getElementById('qty-0').value = '10';
    document.getElementById('type2-0').value = 'AVG';
    generateRequest(0);
    const out = document.getElementById('output-0').textContent;
    expect(out).toBe('LME Request: Buy 10 mt Al AVG January 2025 Flat and Sell 10 mt Al AVG February 2025 Flat against');
  });

  test('creates Fix request text', () => {
    document.getElementById('qty-0').value = '5';
    document.getElementById('type2-0').value = 'Fix';
    document.getElementById('fixDate-0').value = '2025-01-02';
    generateRequest(0);
    const out = document.getElementById('output-0').textContent;
    expect(out).toBe('LME Request: Buy 5 mt Al AVG January 2025 Flat and Sell 5 mt Al USD ppt 06-01-25 against');
  });

  test('creates C2R request text', () => {
    document.getElementById('qty-0').value = '7';
    document.getElementById('type2-0').value = 'C2R';
    document.getElementById('fixDate-0').value = '2025-01-02';
    generateRequest(0);
    const out = document.getElementById('output-0').textContent;
    expect(out).toBe('LME Request: Buy 7 mt Al AVG January 2025 Flat and Sell 7 mt Al C2R 02-01-25 ppt 06-01-25 against');
  });
});

describe('business day helpers', () => {
  test('getSecondBusinessDay returns formatted date', () => {
    expect(getSecondBusinessDay(2025, 0)).toBe('03-01-25');
  });

  test('getFixPpt computes two business days after fix date', () => {
    expect(getFixPpt('02-01-25')).toBe('06-01-25');
  });
});
