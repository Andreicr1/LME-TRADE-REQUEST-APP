/** @jest-environment jsdom */

const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById('calendarType').value = 'gregorian';

const {
  parseInputDate,
  getSecondBusinessDay,
  getLastBusinessDay,
  getFixPpt,
  getFirstBusinessDay,
  updateEndDateMin,
  updateAvgRestrictions,
  setMinDates,
} = require('../main');

describe('parseInputDate', () => {
  test('parses yyyy-mm-dd string', () => {
    const d = parseInputDate('2025-06-15');
    expect(d).toEqual(new Date(2025, 5, 15));
  });

  test('returns null for empty string', () => {
    expect(parseInputDate('')).toBeNull();
  });
});

describe('business day helpers', () => {
  test('getSecondBusinessDay returns formatted date', () => {
    const res = getSecondBusinessDay(2025, 0);
    expect(res).toBe('04/02/25');
  });

  test('getFixPpt computes two business days after fix date', () => {
    const res = getFixPpt('02/01/25');
    expect(res).toBe('06/01/25');
  });

  test('getLastBusinessDay finds month end', () => {
    const res = getLastBusinessDay(2025, 0);
    expect(res).toBe('31/01/25');
  });
});

describe('date restrictions', () => {
  test('updateEndDateMin sets min correctly', () => {
    document.body.innerHTML +=
      '<input type="date" id="startDate-0"><input type="date" id="endDate-0">';
    const start = document.getElementById('startDate-0');
    const end = document.getElementById('endDate-0');
    start.value = '2025-05-10';
    updateEndDateMin(0, 1);
    expect(end.min).toBe('2025-05-11');
  });

  test('updateAvgRestrictions disables earlier months', () => {
    document.body.innerHTML += `
      <select id="type1-0"><option value="">Select</option><option value="AVG">AVG</option><option value="AVGInter">AVGInter</option></select>
      <select id="type2-0"><option value="">Select</option><option value="AVG">AVG</option><option value="AVGInter">AVGInter</option></select>
      <input type="date" id="endDate2-0">
      <select id="month1-0"><option>January</option><option>February</option><option>March</option></select>
      <select id="year1-0"><option>2025</option><option>2026</option></select>
    `;
    document.getElementById('type1-0').value = 'AVG';
    document.getElementById('type2-0').value = 'AVGInter';
    document.getElementById('endDate2-0').value = '2025-02-15';
    updateAvgRestrictions(0);
    const opts = document.getElementById('month1-0').options;
    expect(opts[0].disabled).toBe(true);
    expect(opts[1].disabled).toBe(false);
  });

  test('setMinDates sets proper minimum dates', () => {
    document.body.innerHTML += `
      <input type="date" id="fixDate1-0">
      <input type="date" id="fixDate-0">
      <input type="date" id="startDate-0">
      <input type="date" id="endDate-0">
      <input type="date" id="startDate2-0">
      <input type="date" id="endDate2-0">
    `;
    setMinDates(0);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const first = getFirstBusinessDay(now.getFullYear(), now.getMonth());
    const firstIso = calendarUtils.parseDate(first, 'gregorian').toISOString().split('T')[0];
    ['fixDate1-0','fixDate-0'].forEach(id => {
      expect(document.getElementById(id).min).toBe(today);
    });
    ['startDate-0','endDate-0','startDate2-0','endDate2-0'].forEach(id => {
      expect(document.getElementById(id).min).toBe(firstIso);
    });
  });
});
