/** @jest-environment jsdom */

const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById('calendarType').value = 'gregorian';

const { buildConfirmationText } = require('../main');

function setupDom() {
  document.body.innerHTML += `
    <input id="qty-0" />
    <input type="radio" name="side1-0" value="buy" checked>
    <input type="radio" name="side1-0" value="sell">
    <select id="type1-0"><option value="AVG">AVG</option><option value="Fix">Fix</option></select>
    <select id="month1-0"><option>January</option></select>
    <select id="year1-0"><option>2025</option></select>
    <input id="startDate-0" />
    <input id="endDate-0" />
    <input type="radio" name="side2-0" value="buy">
    <input type="radio" name="side2-0" value="sell" checked>
    <select id="type2-0"><option value="AVG">AVG</option><option value="Fix">Fix</option></select>
    <select id="month2-0"><option>February</option></select>
    <select id="year2-0"><option>2025</option></select>
    <input id="startDate2-0" />
    <input id="endDate2-0" />
  `;
}

describe('buildConfirmationText', () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="calendarType"></select>';
    document.getElementById('calendarType').value = 'gregorian';
    setupDom();
  });

  test('uses AVG month from leg1 when leg1 is AVG', () => {
    document.getElementById('qty-0').value = '5';
    document.getElementById('type1-0').value = 'AVG';
    document.getElementById('type2-0').value = 'Fix';
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está comprando 5 toneladas de Al pela média de janeiro/2025, ppt 04/02/25, e vendendo 5 toneladas de Al com preço fixado. Confirma?'
    );
  });

  test('uses AVG month from leg2 when leg2 is AVG', () => {
    document.getElementById('qty-0').value = '3';
    document.getElementById('type1-0').value = 'Fix';
    document.getElementById('type2-0').value = 'AVG';
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está comprando 3 toneladas de Al com preço fixado, ppt 04/03/25, e vendendo 3 toneladas de Al pela média de fevereiro/2025. Confirma?'
    );
  });
});
