/** @jest-environment jsdom */

const { updateMonthOptions } = require('../main');

describe('updateMonthOptions', () => {
  test('hides past months when current year is selected', () => {
    const currentYear = new Date().getFullYear();
    document.body.innerHTML = `
      <select id="month1-0">
        <option>January</option>
        <option>February</option>
        <option>March</option>
        <option>April</option>
        <option>May</option>
        <option>June</option>
        <option>July</option>
        <option>August</option>
        <option>September</option>
        <option>October</option>
        <option>November</option>
        <option>December</option>
      </select>
      <select id="year1-0">
        <option>${currentYear}</option>
        <option>${currentYear + 1}</option>
      </select>`;
    document.getElementById('year1-0').value = String(currentYear);
    updateMonthOptions(0, 1);
    const curMonth = new Date().getMonth();
    const opts = document.getElementById('month1-0').options;
    for (let i = 0; i < curMonth; i++) {
      expect(opts[i].hidden).toBe(true);
    }
    for (let i = curMonth; i < opts.length; i++) {
      expect(opts[i].hidden).toBe(false);
    }

    document.getElementById('year1-0').value = String(currentYear + 1);
    updateMonthOptions(0, 1);
    for (let i = 0; i < opts.length; i++) {
      expect(opts[i].hidden).toBe(false);
    }
  });

  test('selects next valid month when current selection becomes hidden', () => {
    const currentYear = new Date().getFullYear();
    const curMonth = new Date().getMonth();
    document.body.innerHTML = `
      <select id="month2-0">
        <option>January</option>
        <option>February</option>
        <option>March</option>
        <option>April</option>
        <option>May</option>
        <option>June</option>
        <option>July</option>
        <option>August</option>
        <option>September</option>
        <option>October</option>
        <option>November</option>
        <option>December</option>
      </select>
      <select id="year2-0">
        <option>${currentYear}</option>
      </select>`;
    const monthSel = document.getElementById('month2-0');
    monthSel.value = 'January';
    updateMonthOptions(0, 2);
    const expected = monthSel.options[Math.max(curMonth, 0)].textContent;
    expect(monthSel.value).toBe(expected);
  });
});
