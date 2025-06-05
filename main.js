const lmeHolidays = {
2025: ["2025-01-01", "2025-03-18", "2025-04-21", "2025-05-05", "2025-05-26", "2025-08-25", "2025-12-25", "2025-12-26"],
2026: ["2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-26"]
};

async function loadHolidayData() {
  try {
    const res = await fetch('https://www.gov.uk/bank-holidays.json');
    const data = await res.json();
    const events = data['england-and-wales'].events;
    events.forEach(({date}) => {
      const year = date.slice(0, 4);
      if (!lmeHolidays[year]) lmeHolidays[year] = [];
      if (!lmeHolidays[year].includes(date)) lmeHolidays[year].push(date);
    });
  } catch (err) {
    console.error('Failed to load holiday data:', err);
  }
}

// Keeps track of the next trade index to ensure unique IDs
let nextIndex = 0;

function getCalendarType() {
  const sel = document.getElementById('calendarType');
  return sel ? sel.value : 'gregorian';
}

function formatDate(date) {
  return calendarUtils.formatDate(date, getCalendarType());
}

function parseDate(str) {
  return calendarUtils.parseDate(str, getCalendarType());
}

function getSecondBusinessDay(year, month) {
const holidays = lmeHolidays[year] || [];
let date = new Date(year, month, 1);
let count = 0;
while (count < 2) {
const isoDate = date.toISOString().split('T')[0];
const day = date.getDay();
if (day !== 0 && day !== 6 && !holidays.includes(isoDate)) count++;
if (count < 2) date.setDate(date.getDate() + 1);
}
return formatDate(date);
}

function getFixPpt(dateFix) {
  if (!dateFix) throw new Error('Please provide a fixing date.');
  const date = parseDate(dateFix);
  if (!date) throw new Error('Fixing date is invalid.');
  const holidays = lmeHolidays[date.getFullYear()] || [];
  let count = 0;
  while (count < 2) {
    date.setDate(date.getDate() + 1);
    const isoDate = date.toISOString().split('T')[0];
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidays.includes(isoDate)) count++;
  }
  return formatDate(date);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function populateYearOptions(selectId, start, count) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const year = start + i;
    const opt = document.createElement('option');
    opt.value = year;
    opt.textContent = year;
    select.appendChild(opt);
  }
}

function parseInputDate(value) {
  if (!value) return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

function generateRequest(index) {
const outputEl = document.getElementById(`output-${index}`);
try {
const qtyInput = document.getElementById(`qty-${index}`);
  const q = parseFloat(qtyInput.value);
  if (!isFinite(q)) {
    qtyInput.classList.add('border-red-500');
    if (outputEl) outputEl.textContent = 'Please enter a valid quantity.';
    qtyInput.focus();
    return;
  }
  if (q <= 0) {
    qtyInput.classList.add('border-red-500');
    if (outputEl) outputEl.textContent = 'Quantity must be greater than zero.';
    qtyInput.focus();
    return;
  }
qtyInput.classList.remove('border-red-500');
const leg1Side = document.querySelector(`input[name='side1-${index}']:checked`).value;
const leg1Type = document.getElementById(`type1-${index}`)?.value || 'AVG';
const month = document.getElementById(`month1-${index}`).value;
const year = parseInt(document.getElementById(`year1-${index}`).value);
const leg2Side = document.querySelector(`input[name='side2-${index}']:checked`).value;
const leg2Type = document.getElementById(`type2-${index}`).value;
const fixInput = document.getElementById(`fixDate-${index}`);
const dateFixRaw = fixInput.value;
const dateFix = dateFixRaw ? formatDate(parseInputDate(dateFixRaw)) : '';
fixInput.classList.remove('border-red-500');
const useSamePPT = document.getElementById(`samePpt-${index}`).checked;
const monthIndex = new Date(`${month} 1, ${year}`).getMonth();
const pptDateAVG = getSecondBusinessDay(year, monthIndex);

let leg1;
if (leg1Type === 'AVG') {
  leg1 = `${capitalize(leg1Side)} ${q} mt Al AVG ${month} ${year} Flat`;
} else {
  const pptFixLeg1 = getFixPpt(dateFix);
  leg1 = `${capitalize(leg1Side)} ${q} mt Al Fix ppt ${pptFixLeg1}`;
}
let leg2;
if (leg2Type === 'AVG') {
const month2 = document.getElementById(`month2-${index}`).value;
const year2 = parseInt(document.getElementById(`year2-${index}`).value);
leg2 = `${capitalize(leg2Side)} ${q} mt Al AVG ${month2} ${year2} Flat`;
} else if (leg2Type === 'Fix') {
  let pptFix;
  if (useSamePPT) {
    pptFix = pptDateAVG;
  } else {
    pptFix = getFixPpt(dateFix);
  }
  leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${pptFix}`;
} else if (leg2Type === 'C2R') {
  const pptFix = getFixPpt(dateFix);
  leg2 = `${capitalize(leg2Side)} ${q} mt Al C2R ${dateFix} ppt ${pptFix}`;
}

  const result = `LME Request: ${leg1} and ${leg2} against`;
  if (outputEl) outputEl.textContent = result;
  updateFinalOutput();
} catch (e) {
  console.error("Error generating request:", e);
  if (/Fixing date/.test(e.message)) {
    const fixInput = document.getElementById(`fixDate-${index}`);
    if (fixInput) {
      fixInput.classList.add('border-red-500');
      fixInput.focus();
    }
  }
  if (outputEl) outputEl.textContent = e.message;
}
}

function clearTrade(index) {
const inputs = document.querySelectorAll(`#trade-${index} input, #trade-${index} select`);
inputs.forEach(input => {
if (input.type === 'radio') input.checked = input.defaultChecked;
else if (input.type === 'checkbox') input.checked = false;
else input.value = input.defaultValue;
});
document.getElementById(`output-${index}`).textContent = '';
updateFinalOutput();
syncLegSides(index);
}

function removeTrade(index) {
const trade = document.getElementById(`trade-${index}`);
if (trade) {
trade.remove();
updateFinalOutput();
 renumberTrades();
}
}

function renumberTrades() {
  document.querySelectorAll('.trade-title').forEach((el, i) => {
    el.textContent = `Trade ${i + 1}`;
  });
}

function updateFinalOutput() {
const allOutputs = document.querySelectorAll("[id^='output-']");
const finalOutput = Array.from(allOutputs).map(el => el.textContent.trim()).filter(t => t).join("\n");
document.getElementById('final-output').value = finalOutput;
}

function syncLegSides(index) {
const selected = document.querySelector(`input[name='side1-${index}']:checked`);
if (!selected) return;
const leg2Options = document.querySelectorAll(`input[name='side2-${index}']`);
leg2Options.forEach(opt => {
opt.disabled = opt.value === selected.value;
});
const leg2Checked = document.querySelector(`input[name='side2-${index}']:checked`);
if (leg2Checked && leg2Checked.disabled) {
leg2Options.forEach(opt => {
if (!opt.disabled) opt.checked = true;
});
}
}

async function copyAll() {
  const textarea = document.getElementById('final-output');
  const text = textarea.value.trim();
  if (!text) {
    alert('Nothing to copy.');
    textarea.focus();
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  } catch (err) {
    console.error('Failed to copy text:', err);
    alert('Failed to copy text');
  }
}

function addTrade() {
  const index = nextIndex++;
const template = document.getElementById('trade-template');
const clone = template.content.cloneNode(true);
clone.querySelectorAll('[id]').forEach(el => {
const baseId = el.id.replace(/-\d+$/, '');
el.id = `${baseId}-${index}`;
if (el.name) el.name = el.name.replace(/-\d+$/, `-${index}`);
});
clone.querySelectorAll('[name]:not([id])').forEach(el => {
el.name = el.name.replace(/-\d+$/, `-${index}`);
});
clone.querySelector("[id^='output-']").id = `output-${index}`;
 const title = clone.querySelector('.trade-title');
 if (title) title.textContent = `Trade ${index + 1}`;
  clone.querySelector("button[name='generate']").setAttribute('onclick', `generateRequest(${index})`);
  clone.querySelector("button[name='clear']").setAttribute('onclick', `clearTrade(${index})`);
  clone.querySelector("button[name='remove']").setAttribute('onclick', `removeTrade(${index})`);
const div = document.createElement('div');
div.id = `trade-${index}`;
div.className = 'trade-block';
  div.appendChild(clone);
  const trades = document.getElementById('trades');
  if (trades) {
    trades.appendChild(div);
  }
  const currentYear = new Date().getFullYear();
  populateYearOptions(`year1-${index}`, currentYear, 3);
  populateYearOptions(`year2-${index}`, currentYear, 3);
  document.querySelectorAll(`input[name='side1-${index}']`).forEach(r => {
  r.addEventListener('change', () => syncLegSides(index));
  });
  syncLegSides(index);

  renumberTrades();
}

window.onload = () => {
  loadHolidayData().finally(() => addTrade());
};
if ('serviceWorker' in navigator) {
navigator.serviceWorker.register("service-worker.js")
.catch(err => console.error("Service Worker registration failed:", err));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseInputDate,
    getSecondBusinessDay,
    getFixPpt,
    generateRequest
  };
}

