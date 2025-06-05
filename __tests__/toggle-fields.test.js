/** @jest-environment jsdom */

const { toggleLeg1Fields, toggleLeg2Fields } = require('../main');

describe('field visibility toggling', () => {
  let type1, type2,
    month1, year1, fix1, startDate, endDate,
    month2, year2, fix2, samePpt;

  beforeEach(() => {
    document.body.innerHTML = `
      <select id="type1-0">
        <option value="AVG">AVG</option>
        <option value="AVGInter">AVGInter</option>
        <option value="Fix">Fix</option>
      </select>
      <div id="m1"><select id="month1-0"></select></div>
      <div id="y1"><select id="year1-0"></select></div>
      <div id="sd"><input id="startDate-0"></div>
      <div id="ed"><input id="endDate-0"></div>
      <div id="f1"><input id="fixDate1-0"></div>

      <select id="type2-0">
        <option value="Fix">Fix</option>
        <option value="C2R">C2R</option>
        <option value="AVG">AVG</option>
      </select>
      <div id="m2"><select id="month2-0"></select></div>
      <div id="y2"><select id="year2-0"></select></div>
      <div id="f2"><input id="fixDate-0"></div>
      <label id="sppt"><input type="checkbox" id="samePpt-0" /></label>
    `;
    type1 = document.getElementById('type1-0');
    type2 = document.getElementById('type2-0');
    month1 = document.getElementById('month1-0');
    year1 = document.getElementById('year1-0');
    fix1 = document.getElementById('fixDate1-0');
    startDate = document.getElementById('startDate-0');
    endDate = document.getElementById('endDate-0');
    month2 = document.getElementById('month2-0');
    year2 = document.getElementById('year2-0');
    fix2 = document.getElementById('fixDate-0');
    samePpt = document.getElementById('samePpt-0');
  });

  test('leg1 AVG shows month/year and hides fix/start/end', () => {
    type1.value = 'AVG';
    toggleLeg1Fields(0);
    expect(month1.parentElement.style.display).toBe('');
    expect(year1.parentElement.style.display).toBe('');
    expect(fix1.parentElement.style.display).toBe('none');
    expect(startDate.parentElement.style.display).toBe('none');
    expect(endDate.parentElement.style.display).toBe('none');
  });

  test('leg1 Fix shows fix date only', () => {
    type1.value = 'Fix';
    toggleLeg1Fields(0);
    expect(month1.parentElement.style.display).toBe('none');
    expect(year1.parentElement.style.display).toBe('none');
    expect(fix1.parentElement.style.display).toBe('');
  });

  test('leg2 Fix shows fix date and checkbox when leg1 AVG', () => {
    type1.value = 'AVG';
    type2.value = 'Fix';
    toggleLeg1Fields(0);
    toggleLeg2Fields(0);
    expect(fix2.parentElement.style.display).toBe('');
    expect(month2.parentElement.style.display).toBe('none');
    expect(year2.parentElement.style.display).toBe('none');
    expect(samePpt.parentElement.style.display).toBe('');
  });

  test('leg2 AVG hides fix date and checkbox', () => {
    type2.value = 'AVG';
    toggleLeg2Fields(0);
    expect(month2.parentElement.style.display).toBe('');
    expect(year2.parentElement.style.display).toBe('');
    expect(fix2.parentElement.style.display).toBe('none');
    expect(samePpt.parentElement.style.display).toBe('none');
  });
});

