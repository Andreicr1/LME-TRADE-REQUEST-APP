/** @jest-environment jsdom */

const { updateFixDateVisibility } = require('../main');

describe('updateFixDateVisibility', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="trade-0">
        <select id="type1-0">
          <option value="AVGInter">AVGInter</option>
          <option value="Fix">Fix</option>
        </select>
        <select id="type2-0">
          <option value="AVG">AVG</option>
          <option value="Fix">Fix</option>
        </select>
        <div class="fix-date-container"></div>
      </div>`;
  });

  test('hides container when leg1 AVGInter and leg2 AVG', () => {
    document.getElementById('type1-0').value = 'AVGInter';
    document.getElementById('type2-0').value = 'AVG';
    updateFixDateVisibility(0);
    expect(document.querySelector('.fix-date-container').style.display).toBe('none');
  });

  test('shows container otherwise', () => {
    document.getElementById('type1-0').value = 'Fix';
    document.getElementById('type2-0').value = 'AVG';
    updateFixDateVisibility(0);
    expect(document.querySelector('.fix-date-container').style.display).toBe('');
  });
});
