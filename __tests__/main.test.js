/** @jest-environment jsdom */

const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById('calendarType').value = 'gregorian';

const { parseInputDate, getSecondBusinessDay, getFixPpt } = require('../main');

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
    expect(res).toBe('03-01-25');
  });

  test('getFixPpt computes two business days after fix date', () => {
    const res = getFixPpt('02-01-25');
    expect(res).toBe('06-01-25');
  });
});
