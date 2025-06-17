/** @jest-environment jsdom */

const calendarUtils = require('../calendar-utils');

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById('calendarType').value = 'gregorian';

const { buildConfirmationText } = require('../main');

function setupDom() {
  document.body.innerHTML += `
    <select id="tradeType-0"><option value="Swap">Swap</option><option value="Forward">Forward</option></select>
    <input type="checkbox" id="syncPpt-0">
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
      'Você está vendendo 5 toneladas de Al com preço fixado, ppt 04/02/25, e comprando 5 toneladas de Al pela média de janeiro/2025. Confirma?'
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

  test('handles AVGInter versus Fix ordering', () => {
    document.getElementById('qty-0').value = '5';
    const typeSel = document.getElementById('type1-0');
    typeSel.appendChild(new Option('AVGInter', 'AVGInter'));
    typeSel.value = 'AVGInter';
    document.getElementById('startDate-0').value = '2025-06-16';
    document.getElementById('endDate-0').value = '2025-06-19';
    document.getElementById('type2-0').value = 'Fix';
    const fixInput = document.createElement('input');
    fixInput.id = 'fixDate-0';
    document.body.appendChild(fixInput);
    document.getElementById('fixDate-0').value = '2025-06-19';
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está vendendo 5 toneladas de Al com preço fixado em 19/06/25, ppt 23/06/25, e comprando 5 toneladas de Al fixando a média de 16/06/25 a 19/06/25. Confirma?'
    );
  });

  test('includes order type details in Portuguese', () => {
    document.getElementById('qty-0').value = '3';
    document.querySelector("input[name='side1-0'][value='sell']").checked = true;
    document.querySelector("input[name='side2-0'][value='buy']").checked = true;
    document.getElementById('type1-0').value = 'AVG';
    document.getElementById('type2-0').value = 'Fix';
    const orderType = document.createElement('select');
    orderType.id = 'orderType2-0';
    orderType.innerHTML = '<option value="Resting" selected>Resting</option>';
    document.body.appendChild(orderType);
    const validity = document.createElement('select');
    validity.id = 'orderValidity2-0';
    validity.innerHTML = '<option value="3 Hours" selected>3 Hours</option>';
    document.body.appendChild(validity);
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está comprando 3 toneladas de Al com preço fixado Resting, ppt 04/02/25, e vendendo 3 toneladas de Al pela média de janeiro/2025.\nOrdem resting (melhor oferta no book) válida por 3 horas. Confirma?'
    );
  });

  test('formats limit order confirmation in Portuguese', () => {
    document.getElementById('qty-0').value = '2';
    document.querySelector("input[name='side1-0'][value='sell']").checked = true;
    document.querySelector("input[name='side2-0'][value='buy']").checked = true;
    document.getElementById('type1-0').value = 'AVG';
    document.getElementById('type2-0').value = 'Fix';
    const orderType = document.createElement('select');
    orderType.id = 'orderType2-0';
    orderType.innerHTML = '<option value="Limit" selected>Limit</option>';
    document.body.appendChild(orderType);
    const validity = document.createElement('select');
    validity.id = 'orderValidity2-0';
    validity.innerHTML = '<option value="3 Hours" selected>3 Hours</option>';
    document.body.appendChild(validity);
    const limit = document.createElement('input');
    limit.id = 'limitPrice2-0';
    limit.value = '2520';
    document.body.appendChild(limit);
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está comprando 2 toneladas de Al com preço fixado Limit 2520, ppt 04/02/25, e vendendo 2 toneladas de Al pela média de janeiro/2025.\nOrdem limit @ USD 2.520,00 / mt válida por 3 horas. Confirma?'
    );
  });

  test('omits order instructions for market orders', () => {
    document.getElementById('qty-0').value = '4';
    document.getElementById('type1-0').value = 'AVG';
    document.getElementById('type2-0').value = 'Fix';
    const orderType = document.createElement('select');
    orderType.id = 'orderType2-0';
    orderType.innerHTML = '<option value="At Market" selected>At Market</option>';
    document.body.appendChild(orderType);
    const validity = document.createElement('select');
    validity.id = 'orderValidity2-0';
    validity.innerHTML = '<option value="Day" selected>Day</option>';
    document.body.appendChild(validity);
    const text = buildConfirmationText(0);
    expect(text).toBe(
      'Você está vendendo 4 toneladas de Al com preço fixado, ppt 04/02/25, e comprando 4 toneladas de Al pela média de janeiro/2025. Confirma?'
    );
  });
});
