let lmeHolidays = {};
let nextIndex = 0;

// Variáveis globais para confirmação
let confirmCallback = null;
let activeTradeIndex = null;

// Carregar holidays.json local ou remoto
if (typeof window === "undefined" || typeof fetch === "undefined") {
  const fs = require("fs");
  const path = require("path");
  try {
    const file = path.join(__dirname, "holidays.json");
    lmeHolidays = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error("Failed to read holidays.json:", err);
  }
} else {
  fetch("holidays.json")
    .then((res) => res.json())
    .then((data) => {
      lmeHolidays = data;
    })
    .catch((err) => console.error("Failed to load holidays.json:", err));
}

window.onload = () => {
  nextIndex = 0;
  console.log("🚀 Sistema inicializando - nextIndex resetado para 0");

  const tradesContainer = document.getElementById("trades");
  const finalOutput = document.getElementById("final-output");

  if (!tradesContainer || !finalOutput) {
    console.error("❌ Elementos essenciais não encontrados!");
    return;
  }

  loadHolidayData().finally(() => {
    console.log("📅 Holiday data carregado, adicionando primeiro trade...");
    tradesContainer.innerHTML = ""; // Limpar o container de trades
    addTrade(); // Adicionar o primeiro trade automaticamente
    console.log(`✅ Trade ${nextIndex - 1} adicionado`);

    const ok = document.getElementById("confirmation-ok");
    const cancel = document.getElementById("confirmation-cancel");
    if (ok) ok.addEventListener("click", confirmModal);
    if (cancel) cancel.addEventListener("click", cancelModal);

    document
      .querySelectorAll("input[name='company']")
      .forEach((el) => el.addEventListener("change", updateFinalOutput));

    console.log("✅ Sistema inicializado completamente");
  });

  // Garantir que o container de trades esteja visível
  if (tradesContainer) {
    tradesContainer.style.display = "block";
  }
};
document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('.dropdown-content');
  dropdowns.forEach(dropdown => {
    if (!dropdown.contains(event.target) && !dropdown.previousElementSibling.contains(event.target)) {
      dropdown.classList.add('hidden');
    }
  });
});

function toggleTemplateDropdown(button) {
  const dropdown = button.nextElementSibling;
  dropdown.classList.toggle('hidden');
}

function addTemplateTrade(type, clickedElement) {
  const tradeCard = clickedElement.closest('.trade-card');
  if (!tradeCard) return;

  const tradeTypeSelect = tradeCard.querySelector('select[id^="tradeType"]');

  const leg1Buy = tradeCard.querySelector('input[name^="side1"][value="buy"]');
  const leg1Sell = tradeCard.querySelector('input[name^="side1"][value="sell"]');
  const leg1PriceType = tradeCard.querySelector('select[id^="type1"]');

  const leg2Buy = tradeCard.querySelector('input[name^="side2"][value="buy"]');
  const leg2Sell = tradeCard.querySelector('input[name^="side2"][value="sell"]');
  const leg2PriceType = tradeCard.querySelector('select[id^="type2"]');

  // Resetar os radio buttons
  if (leg1Buy) leg1Buy.checked = false;
  if (leg1Sell) leg1Sell.checked = false;
  if (leg2Buy) leg2Buy.checked = false;
  if (leg2Sell) leg2Sell.checked = false;

  // Sempre forçar Swap
  if (tradeTypeSelect) tradeTypeSelect.value = 'Swap';

const syncPptCheckbox = tradeCard.querySelector('input[id^="syncPpt"]');
if (syncPptCheckbox) {
  syncPptCheckbox.checked = true;
  syncPptCheckbox.dispatchEvent(new Event('change'));
}


  // Lógica por template
  if (type === 'queda') {
    if (leg1Buy) leg1Buy.checked = true;
    if (leg1PriceType) {
      leg1PriceType.value = 'AVG';
      leg1PriceType.dispatchEvent(new Event('change'));
    }

    if (leg2Sell) leg2Sell.checked = true;
    if (leg2PriceType) {
      leg2PriceType.value = 'Fix';
      leg2PriceType.dispatchEvent(new Event('change'));
    }
  }

  if (type === 'alta') {
    if (leg1Sell) leg1Sell.checked = true;
    if (leg1PriceType) {
      leg1PriceType.value = 'AVG';
      leg1PriceType.dispatchEvent(new Event('change'));
    }

    if (leg2Buy) leg2Buy.checked = true;
    if (leg2PriceType) {
      leg2PriceType.value = 'Fix';
      leg2PriceType.dispatchEvent(new Event('change'));
    }
  }

  if (type === 'spread') {
    if (leg1Buy) leg1Buy.checked = true;
    if (leg1PriceType) {
      leg1PriceType.value = 'AVG';
      leg1PriceType.dispatchEvent(new Event('change'));
    }

    if (leg2Sell) leg2Sell.checked = true;
    if (leg2PriceType) {
      leg2PriceType.value = 'AVG';
      leg2PriceType.dispatchEvent(new Event('change'));
    }
  }

  // Atualizar o texto do botão
  const dropdown = clickedElement.closest('.dropdown-content');
  const button = dropdown.previousElementSibling;
  if (button) {
    button.textContent = clickedElement.textContent + ' ▼';
  }

  // Fechar dropdown
  dropdown.classList.add('hidden');
}

// Função para carregar dados de feriados
async function loadHolidayData() {
  try {
    const res = await fetch("https://www.gov.uk/bank-holidays.json");
    const data = await res.json();
    const events = data["england-and-wales"].events;
    events.forEach(({ date }) => {
      const year = date.slice(0, 4);
      if (!lmeHolidays[year]) lmeHolidays[year] = [];
      if (!lmeHolidays[year].includes(date)) lmeHolidays[year].push(date);
    });
  } catch (err) {
    console.error("Failed to load holiday data:", err);
  }
}

function openExternalSite() {
  const url = 'https://portal.lmelive.com/CommodityGroup/MetalSummary?commodityGroupCode=NFG';  
  const features = 'width=1540,height=900,scrollbars=yes,resizable=yes';
  const newWindow = window.open(url, '_blank', features);

  if (newWindow) {
    newWindow.focus();
  } else {
    alert('O navegador bloqueou o pop-up. Libere os pop-ups para este site.');
  }
}

function closeIframeModal() {
  document.getElementById('iframe-modal').classList.add('hidden');
  document.getElementById('external-iframe').src = '';
}


// Função para adicionar um novo trade
function addTrade() {
  const index = nextIndex++;
  const template = document.getElementById("trade-template");
  const tradesContainer = document.getElementById("trades");

  if (!template || !tradesContainer) {
    console.error("❌ Template ou container de trades não encontrado!");
    return;
  }

  const clone = template.content.cloneNode(true);

  clone.querySelectorAll("[id]").forEach((el) => {
    const baseId = el.id.replace(/-\d+$/, "");
    el.id = `${baseId}-${index}`;
    if (el.name) el.name = el.name.replace(/-\d+$/, `-${index}`);
  });

  clone.querySelectorAll("[name]:not([id])").forEach((el) => {
    el.name = el.name.replace(/-\d+$/, `-${index}`);
  });

  const title = clone.querySelector(".trade-title");
  if (title) title.textContent = `Trade ${index + 1}`;

  const div = document.createElement("div");
  div.id = `trade-${index}`;
  div.className = "trade-block opacity-0 transition-opacity duration-300";
  div.appendChild(clone);

  // Garantir existência dos campos de fixing date
  const legs = div.querySelectorAll(".leg-section");
  if (legs[0] && !div.querySelector(`#fixDate1-${index}`)) {
    const inp = document.createElement("input");
    inp.type = "date";
    inp.id = `fixDate1-${index}`;
    legs[0].appendChild(inp);
  }
  if (legs[1] && !div.querySelector(`#fixDate-${index}`)) {
    const inp2 = document.createElement("input");
    inp2.type = "date";
    inp2.id = `fixDate-${index}`;
    legs[1].appendChild(inp2);
  }

  tradesContainer.appendChild(div);

  renumberTrades();

  requestAnimationFrame(() => div.classList.remove("opacity-0"));

  const currentYear = new Date().getFullYear();
  populateYearOptions(`year1-${index}`, currentYear, 3);
  populateYearOptions(`year2-${index}`, currentYear, 3);

  setMinDates(index);
  updateMonthOptions(index, 1);
  updateMonthOptions(index, 2);

  toggleLeg1Fields(index);
  toggleLeg2Fields(index);

  attachTradeHandlers(index);

  // --- Início do bloco de sincronização Month/Year da Leg 1 com FixDate da Leg 2 ---
  const month1Sel = document.getElementById(`month1-${index}`);
  const year1Sel = document.getElementById(`year1-${index}`);
  const fixDate2 = document.getElementById(`fixDate-${index}`);
  const syncPptCheckbox = document.getElementById(`syncPpt-${index}`);

  function updateFixDate2() {
    if (syncPptCheckbox?.checked) {
      const month = month1Sel?.value;
      const year = year1Sel?.value;
      if (month && year) {
        const last = getLastBusinessDay(Number(year), MONTHS.indexOf(month));
        const d = calendarUtils.parseDate(last, currentCalendar());
        if (fixDate2) fixDate2.value = d.toISOString().split('T')[0];
      }
    }
  }

  if (month1Sel) month1Sel.addEventListener('change', updateFixDate2);
  if (year1Sel) year1Sel.addEventListener('change', updateFixDate2);
  // --- Fim do bloco ---

  console.log(`✅ Trade ${index} adicionado com sucesso`);
}

// Função para popular opções de ano
function populateYearOptions(selectId, startYear, count) {
  const select = document.getElementById(selectId);
  if (!select) {
    console.log(`⚠️ Select não encontrado: ${selectId}`);
    return;
  }

  select.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const year = startYear + i;
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    if (i === 0) opt.selected = true;
    select.appendChild(opt);
  }
}

// Funções para alternar campos de Leg 1 e Leg 2
function toggleLeg1Fields(index) {
  const typeSel = document.getElementById(`type1-${index}`);
  const monthWrap = document.getElementById(`avgFields1-${index}`);
  const startInput = document.getElementById(`startDate-${index}`);
  const endInput = document.getElementById(`endDate-${index}`);
  const fixInput = document.getElementById(`fixDate1-${index}`);

  if (!typeSel) return;

  const val = typeSel.value;

  if (monthWrap) monthWrap.style.display = val === "AVG" ? "" : "none";
  if (startInput && startInput.parentElement)
    startInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  if (endInput && endInput.parentElement)
    endInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  if (fixInput && fixInput.parentElement)
    fixInput.parentElement.style.display =
      val === "Fix" || val === "C2R" ? "" : "none";

  if (fixInput) {
    const type2 = document.getElementById(`type2-${index}`)?.value;
    if (val === "Fix" && type2 === "AVGInter") {
      const end = document.getElementById(`endDate2-${index}`)?.value;
      if (end) fixInput.value = end;
    }
  }

  toggleOrderFields(index, 1);
}

function toggleLeg2Fields(index) {
  const typeSel = document.getElementById(`type2-${index}`);
  const monthWrap = document.getElementById(`avgFields2-${index}`);
  const startInput = document.getElementById(`startDate2-${index}`);
  const endInput = document.getElementById(`endDate2-${index}`);
  const fixInput = document.getElementById(`fixDate-${index}`);

  if (!typeSel) return;

  const val = typeSel.value;

  if (monthWrap) monthWrap.style.display = val === "AVG" ? "" : "none";
  if (startInput && startInput.parentElement)
    startInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  if (endInput && endInput.parentElement)
    endInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  if (fixInput && fixInput.parentElement)
    fixInput.parentElement.style.display =
      val === "Fix" || val === "C2R" ? "" : "none";

  if (fixInput) {
    const type1 = document.getElementById(`type1-${index}`)?.value;
    if (val === "Fix" && type1 === "AVG") {
      const month = document.getElementById(`month1-${index}`)?.value;
      const year = document.getElementById(`year1-${index}`)?.value;
      if (month && year) {
        const last = getLastBusinessDay(Number(year), MONTHS.indexOf(month));
        const d = calendarUtils.parseDate(last, currentCalendar());
        fixInput.value = d.toISOString().split("T")[0];
        fixInput.readOnly = true;
      }
    } else if (val === "Fix" && type1 === "AVGInter") {
      const end = document.getElementById(`endDate-${index}`)?.value;
      if (end) fixInput.value = end;
      fixInput.readOnly = false;
    } else {
      fixInput.readOnly = false;
    }
  }

  toggleOrderFields(index, 2);
}

function toggleOrderFields(index, leg) {
  const type = document.getElementById(`type${leg}-${index}`)?.value;
  const orderWrap = document.getElementById(`orderType${leg}-${index}`)?.parentElement;
  const validityWrap = document.getElementById(`orderValidity${leg}-${index}`)?.parentElement;
  const limitWrap = document.getElementById(`limitPrice${leg}-${index}`)?.parentElement;

  const showOrder = type === "Fix" || type === "C2R";

  if (orderWrap) orderWrap.style.display = showOrder ? "" : "none";

  const orderType = document.getElementById(`orderType${leg}-${index}`)?.value;
  if (validityWrap)
    validityWrap.style.display = showOrder && orderType && orderType !== "At Market" ? "" : "none";
  if (limitWrap)
    limitWrap.style.display = showOrder && orderType === "Limit" ? "" : "none";
}

function syncSides(index, changedLeg) {
  const buy1 = document.querySelector(
    `input[name='side1-${index}'][value='buy']`
  );
  const sell1 = document.querySelector(
    `input[name='side1-${index}'][value='sell']`
  );
  const buy2 = document.querySelector(
    `input[name='side2-${index}'][value='buy']`
  );
  const sell2 = document.querySelector(
    `input[name='side2-${index}'][value='sell']`
  );
  if (!buy1 || !sell1 || !buy2 || !sell2) return;

  if (changedLeg === 1) {
    if (buy1.checked) sell2.checked = true;
    else if (sell1.checked) buy2.checked = true;
  } else if (changedLeg === 2) {
    if (buy2.checked) sell1.checked = true;
    else if (sell2.checked) buy1.checked = true;
  }
}

// Função para atualizar saída final
function updateFinalOutput() {
  const allOutputs = document.querySelectorAll("[id^='output-']");
  const lines = Array.from(allOutputs)
    .map((el) => el.textContent.trim())
    .filter((t) => t);

  const company = document.querySelector("input[name='company']:checked")?.value;

  if (company && lines.length) {
    lines.unshift(`For ${company} Account:`);
  }

  document.getElementById("final-output").value = lines.join("\n");
}

// Função para copiar todos os trades
async function copyAll() {
  const textarea = document.getElementById("final-output");
  const text = textarea.value.trim();
  if (!text) {
    alert("Nothing to copy.");
    textarea.focus();
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard");
  } catch (err) {
    console.error("Failed to copy text:", err);
    alert("Failed to copy text");
  }
}

// Função para enviar e-mail
function sendEmail() {
  const textarea = document.getElementById("final-output");
  const text = textarea.value.trim();
  if (!text) {
    alert("Nothing to send.");
    textarea.focus();
    return;
  }

  const recipient = "hamburgdesk@StoneX.com";
  const subject = "LME Trade Request";
  const body = encodeURIComponent(text);

  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
}

// ---------- Utility Helpers ----------

function parseInputDate(str) {
  if (!str) return null;
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function isBusinessDay(date) {
  const iso = date.toISOString().slice(0, 10);
  const day = date.getDay();
  const year = String(date.getFullYear());
  const holidays = lmeHolidays[year] || [];
  return day !== 0 && day !== 6 && !holidays.includes(iso);
}

function currentCalendar() {
  return document.getElementById("calendarType")?.value || "gregorian";
}

function getSecondBusinessDay(year, month) {
  let d = new Date(year, month + 1, 1);
  let count = 0;
  while (true) {
    if (isBusinessDay(d)) count++;
    if (count === 2) break;
    d.setDate(d.getDate() + 1);
  }
  return calendarUtils.formatDate(d, currentCalendar());
}

function getLastBusinessDay(year, month) {
  let d = new Date(year, month + 1, 0);
  while (!isBusinessDay(d)) d.setDate(d.getDate() - 1);
  return calendarUtils.formatDate(d, currentCalendar());
}

function getFixPpt(fixStr) {
  const date = calendarUtils.parseDate(fixStr, currentCalendar());
  if (!date) return "";
  let d = new Date(date);
  let cnt = 0;
  while (cnt < 2) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) cnt++;
  }
  return calendarUtils.formatDate(d, currentCalendar());
}

function updateEndDateMin(index, leg) {
  const start = document.getElementById(`startDate${leg === 2 ? "2" : ""}-${index}`);
  const end = document.getElementById(`endDate${leg === 2 ? "2" : ""}-${index}`);
  if (!start || !end || !start.value) return;
  const d = parseInputDate(start.value);
  if (!d) return;
  d.setDate(d.getDate() + 1);
  end.min = d.toISOString().split("T")[0];
}

function updateAvgRestrictions(index) {
  const t1 = document.getElementById(`type1-${index}`)?.value;
  const t2 = document.getElementById(`type2-${index}`)?.value;
  if (t1 !== "AVG" || t2 !== "AVGInter") return;
  const endStr = document.getElementById(`endDate2-${index}`)?.value;
  const monthSel = document.getElementById(`month1-${index}`);
  const yearSel = document.getElementById(`year1-${index}`);
  if (!endStr || !monthSel || !yearSel) return;
  const end = parseInputDate(endStr);
  if (!end) return;
  const endMonth = end.getMonth();
  const endYear = end.getFullYear();
  const selectedYear = Number(yearSel.value);
  Array.from(monthSel.options).forEach((opt, i) => {
    opt.disabled = selectedYear === endYear && i < endMonth;
  });
}

function syncFixWithAvgInter(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2 = document.getElementById(`type2-${index}`)?.value;
  const end1 = document.getElementById(`endDate-${index}`)?.value;
  const end2 = document.getElementById(`endDate2-${index}`)?.value;
  const fix1 = document.getElementById(`fixDate1-${index}`);
  const fix2 = document.getElementById(`fixDate-${index}`);

  if ((type1 === "AVGInter") && (type2 === "Fix" || type2 === "C2R") && end1 && fix2) {
    fix2.value = end1;
  }
  if ((type2 === "AVGInter") && (type1 === "Fix" || type1 === "C2R") && end2 && fix1) {
    fix1.value = end2;
  }
}

function getFirstBusinessDay(year, month) {
  let d = new Date(year, month, 1);
  while (!isBusinessDay(d)) d.setDate(d.getDate() + 1);
  return calendarUtils.formatDate(d, currentCalendar());
}

function setMinDates(index) {
  const todayIso = new Date().toISOString().split("T")[0];
  const now = new Date();
  const firstBizStr = getFirstBusinessDay(now.getFullYear(), now.getMonth());
  const firstBizDate = calendarUtils.parseDate(firstBizStr, currentCalendar());
  const firstIso = firstBizDate.toISOString().split("T")[0];

  [`fixDate1-${index}`, `fixDate-${index}`].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.min = todayIso;
  });

  [
    `startDate-${index}`,
    `endDate-${index}`,
    `startDate2-${index}`,
    `endDate2-${index}`,
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.min = firstIso;
  });
}

function updateMonthOptions(index, leg) {
  const monthSel = document.getElementById(`month${leg}-${index}`);
  const yearSel = document.getElementById(`year${leg}-${index}`);
  if (!monthSel || !yearSel) return;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const year = Number(yearSel.value);
  const opts = Array.from(monthSel.options);
  opts.forEach((opt, i) => {
    opt.hidden = year === curYear && i < curMonth;
  });
  if (monthSel.options[monthSel.selectedIndex].hidden) {
    const next = opts.find((o) => !o.hidden);
    if (next) monthSel.value = next.textContent;
  }
}

// ---------- Trading Functions ----------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function legPpt(month, year) {
  const idx = MONTHS.indexOf(month);
  if (idx === -1) return "";
  return getSecondBusinessDay(Number(year), idx);
}

function generateRequest(index) {
  const qtyStr = document.getElementById(`qty-${index}`)?.value || "";
  const qty = parseFloat(qtyStr);
  const output = document.getElementById(`output-${index}`);
  if (!output) return;
  if (!Number.isFinite(qty)) {
    output.textContent = "Please enter a valid quantity.";
    updateFinalOutput();
    return;
  }
  if (qty <= 0) {
    output.textContent = "Quantity must be greater than zero.";
    updateFinalOutput();
    return;
  }

  const tradeType = document.getElementById(`tradeType-${index}`)?.value || "Swap";
  const syncPpt = document.getElementById(`syncPpt-${index}`)?.checked;

  const side1 = document.querySelector(`input[name='side1-${index}']:checked`)?.value || "buy";
  const side2 = document.querySelector(`input[name='side2-${index}']:checked`)?.value || "sell";
  const type1 = document.getElementById(`type1-${index}`)?.value || "AVG";
  const type2 = document.getElementById(`type2-${index}`)?.value || "";

  const month1 = document.getElementById(`month1-${index}`)?.value || MONTHS[new Date().getMonth()];
  const year1 = document.getElementById(`year1-${index}`)?.value || String(new Date().getFullYear());
  const month2 = document.getElementById(`month2-${index}`)?.value || MONTHS[new Date().getMonth() + 1];
  const year2 = document.getElementById(`year2-${index}`)?.value || String(new Date().getFullYear());

  const start1 = parseInputDate(document.getElementById(`startDate-${index}`)?.value);
  const end1 = parseInputDate(document.getElementById(`endDate-${index}`)?.value);
  let fix1 = parseInputDate(document.getElementById(`fixDate1-${index}`)?.value);
  const start2 = parseInputDate(document.getElementById(`startDate2-${index}`)?.value);
  const end2 = parseInputDate(document.getElementById(`endDate2-${index}`)?.value);
  let fix2 = parseInputDate(document.getElementById(`fixDate-${index}`)?.value);

  const orderType1 = document.getElementById(`orderType1-${index}`)?.value;
  const orderType2 = document.getElementById(`orderType2-${index}`)?.value;
  let validity1 = document.getElementById(`orderValidity1-${index}`)?.value;
  let validity2 = document.getElementById(`orderValidity2-${index}`)?.value;
  const limit1 = document.getElementById(`limitPrice1-${index}`)?.value;
  const limit2 = document.getElementById(`limitPrice2-${index}`)?.value;

  if (orderType1 && orderType1 !== "At Market" && !validity1) {
    validity1 = "Day";
    const sel = document.getElementById(`orderValidity1-${index}`);
    if (sel) sel.value = "Day";
  }
  if (orderType2 && orderType2 !== "At Market" && !validity2) {
    validity2 = "Day";
    const sel = document.getElementById(`orderValidity2-${index}`);
    if (sel) sel.value = "Day";
  }

  let ppt1 = "";
  let ppt2 = "";
  if (type1 === "AVG") ppt1 = legPpt(month1, year1);
  if (type2 === "AVG") ppt2 = legPpt(month2, year2);
  if (type1 === "AVGInter" && end1)
    ppt1 = getFixPpt(calendarUtils.formatDate(end1, currentCalendar()));
  if (type2 === "AVGInter" && end2)
    ppt2 = getFixPpt(calendarUtils.formatDate(end2, currentCalendar()));

  if ((type1 === "Fix" || type1 === "C2R") && fix1)
    ppt1 = getFixPpt(calendarUtils.formatDate(fix1, currentCalendar()));
  if ((type2 === "Fix" || type2 === "C2R") && fix2)
    ppt2 = getFixPpt(calendarUtils.formatDate(fix2, currentCalendar()));

  if ((type1 === "C2R" && !fix1) || (type2 === "C2R" && !fix2)) {
    output.textContent = "Please provide a fixing date.";
    updateFinalOutput();
    return;
  }

  if (type1 === "AVGInter" && (type2 === "Fix" || type2 === "C2R") && end1) {
    fix2 = end1;
    if (syncPpt) ppt2 = ppt1;
  }

  if (type2 === "AVGInter" && (type1 === "Fix" || type1 === "C2R") && end2) {
    fix1 = end2;
    if (syncPpt) ppt1 = ppt2;
  }

  if (type1 === "Fix" && type2 === "AVG") {
    ppt1 = ppt2;
    fix1 = null;
  }
  if (type2 === "Fix" && type1 === "AVG") {
    ppt2 = ppt1;
    fix2 = null;
  }
  if (syncPpt && type1 === "AVGInter") ppt2 = ppt1;
  if (syncPpt && type2 === "AVGInter") ppt1 = ppt2;

  function legText(side, type, month, year, start, end, fixDate, ppt) {
    const s = side === "buy" ? "Buy" : "Sell";
    let txt = `${s} ${qty} mt Al `;
    if (type === "AVG") {
      txt += `AVG ${month} ${year} Flat`;
      return txt;
    }
    if (type === "AVGInter") {
      const ss = calendarUtils.formatDate(start, currentCalendar());
      const ee = calendarUtils.formatDate(end, currentCalendar());
      txt += `Fixing AVG ${ss} to ${ee}, ppt ${ppt}`;
      return txt;
    }
    if (type === "Fix") {
      if (fixDate) {
        const f = calendarUtils.formatDate(fixDate, currentCalendar());
        txt += `USD fixing on ${f}`;
      } else {
        txt += "USD";
      }
      if (ppt) txt += ` ppt ${ppt}`;
      return txt;
    }
    if (type === "C2R") {
      const f = calendarUtils.formatDate(fixDate, currentCalendar());
      const p = ppt || getFixPpt(f);
      txt += `C2R ${f} ppt ${p}`;
      return txt;
    }
    return txt.trim();
  }

  let l1 = legText(side1, type1, month1, year1, start1, end1, fix1, ppt1);
  let l2 = legText(side2, type2, month2, year2, start2, end2, fix2, ppt2);

  if (type1 === "Fix" && orderType1 === "Resting" && !fix1 && type2 === "AVG") {
    l2 += `, ppt ${ppt1}`;
  }
  if (type2 === "Fix" && orderType2 === "Resting" && !fix2 && type1 === "AVG") {
    l1 += `, ppt ${ppt2}`;
  }

  let text = "";
  if (tradeType === "Forward" && syncPpt && type1 && type2) {
    text = `LME Request: ${l1}\nLME Request: ${l2}`;
  } else if (!type2 || tradeType === "Forward" && !type2) {
    text = `LME Request: ${l1}`;
  } else {
    const fixTypes = ["Fix", "C2R"];
    if (fixTypes.includes(type1) && !fixTypes.includes(type2)) text = `LME Request: ${l1} and ${l2} against`;
    else if (fixTypes.includes(type2) && !fixTypes.includes(type1)) text = `LME Request: ${l2} and ${l1} against`;
    else text = `LME Request: ${l1} and ${l2} against`;
  }



  if (orderType1 === "Limit" || orderType1 === "Resting") {
    text += `\nExecution Instruction: ${buildExecutionInstruction(orderType1, side1, validity1, limit1)}`;
  } else if (orderType2 === "Limit" || orderType2 === "Resting") {
    text += `\nExecution Instruction: ${buildExecutionInstruction(orderType2, side2, validity2, limit2)}`;
  }

  let payoffText = "";
  const companyName = (document.querySelector("input[name='company']:checked")?.value || "").split(" ")[0];
  if ((type1 === "Fix" || type1 === "C2R") && (type2 === "AVG" || type2 === "AVGInter")) {
    const avgInfo = type2 === "AVG" ? { type: "AVG", month: month2, year: year2 } : { type: "AVGInter", start: start2, end: end2 };
    payoffText = buildExpectedPayoff(side1, avgInfo, companyName);
  } else if ((type2 === "Fix" || type2 === "C2R") && (type1 === "AVG" || type1 === "AVGInter")) {
    const avgInfo = type1 === "AVG" ? { type: "AVG", month: month1, year: year1 } : { type: "AVGInter", start: start1, end: end1 };
    payoffText = buildExpectedPayoff(side2, avgInfo, companyName);
  }
  if (payoffText) text += `\n${payoffText}`;


  output.textContent = text.trim();
  updateFinalOutput();
}

function buildExecutionInstruction(type, side, validity, price) {
  if (type === "Limit") {
    return `Please work this order as a Limit @ USD ${price} for the Fixed price, valid for ${validity}.`;
  }
  if (type === "Resting") {
    const dir = side === "buy" ? "offer" : "bid";
    return `Please work this order posting as the best ${dir} in the book for the fixed price, valid for ${validity}.`;
  }
  return "";
}

function buildExpectedPayoff(fixedSide, avgInfo, company) {
  if (!fixedSide || !avgInfo) return "";
  const [higherAction, lowerAction] =
    fixedSide === "sell" ? ["pays", "receives"] : ["receives", "pays"];
  if (avgInfo.type === "AVG") {
    return `Expected Payoff:\nIf official Monthly Average of ${avgInfo.month} ${avgInfo.year} is higher than the Fixed Price, ${company} ${higherAction} the difference. If the average is lower, ${company} ${lowerAction} the difference.`;
  }
  const s = calendarUtils.formatDate(avgInfo.start, currentCalendar());
  const e = calendarUtils.formatDate(avgInfo.end, currentCalendar());
  return `Expected Payoff:\nIf average of official prices between ${s} and ${e} is higher than the Fixed Price, ${company} ${higherAction} the difference. If the average is lower, ${company} ${lowerAction} the difference.`;
}

function ptExecutionInstruction(type, side, validity, price) {
  if (type === "Limit") {
    const formatted = Number(price).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const v = (validity || "").replace("Hours", "horas");
    return `Ordem limit @ USD ${formatted} / mt válida por ${v.toLowerCase()}.`;
  }
  if (type === "Resting") {
    const desc = side === "buy" ? "melhor oferta no book" : "melhor oferta";
    const v = (validity || "").replace("Hours", "horas");
    return `Ordem resting (${desc}) válida por ${v.toLowerCase()}.`;
  }
  return "";
}

function buildConfirmationText(index) {
  const qty = document.getElementById(`qty-${index}`)?.value;
  const side1 = document.querySelector(`input[name='side1-${index}']:checked`)?.value || "buy";
  const side2 = document.querySelector(`input[name='side2-${index}']:checked`)?.value || "sell";
  const type1 = document.getElementById(`type1-${index}`)?.value || "AVG";
  const type2 = document.getElementById(`type2-${index}`)?.value || "AVG";
  const month1 = document.getElementById(`month1-${index}`)?.value || MONTHS[new Date().getMonth()];
  const year1 = document.getElementById(`year1-${index}`)?.value || String(new Date().getFullYear());
  const month2 = document.getElementById(`month2-${index}`)?.value || MONTHS[new Date().getMonth() + 1];
  const year2 = document.getElementById(`year2-${index}`)?.value || String(new Date().getFullYear());
  const start1 = parseInputDate(document.getElementById(`startDate-${index}`)?.value);
  const end1 = parseInputDate(document.getElementById(`endDate-${index}`)?.value);
  const fix1 = parseInputDate(document.getElementById(`fixDate1-${index}`)?.value);
  const start2 = parseInputDate(document.getElementById(`startDate2-${index}`)?.value);
  const end2 = parseInputDate(document.getElementById(`endDate2-${index}`)?.value);
  const fix2 = parseInputDate(document.getElementById(`fixDate-${index}`)?.value);
  const orderType1 = document.getElementById(`orderType1-${index}`)?.value;
  const orderType2 = document.getElementById(`orderType2-${index}`)?.value;
  const validity1 = document.getElementById(`orderValidity1-${index}`)?.value;
  const validity2 = document.getElementById(`orderValidity2-${index}`)?.value;
  const limit1 = document.getElementById(`limitPrice1-${index}`)?.value;
  const limit2 = document.getElementById(`limitPrice2-${index}`)?.value;

  const pptAvg1 = legPpt(month1, year1);
  const pptAvg2 = legPpt(month2, year2);
  let pptFix1 = fix1 ? getFixPpt(calendarUtils.formatDate(fix1, currentCalendar())) : pptAvg2;
  let pptFix2 = fix2 ? getFixPpt(calendarUtils.formatDate(fix2, currentCalendar())) : pptAvg1;

  function sidePt(val) { return val === "buy" ? "comprando" : "vendendo"; }

  function fixLeg(side, date, ppt, orderType, validity, limit) {
    let part = `${sidePt(side)} ${qty} toneladas de Al com preço fixado`;
    if (orderType === "Limit") part += ` Limit ${limit}`;
    else if (orderType === "Resting") part += " Resting";
    else if (date) part += ` em ${calendarUtils.formatDate(date, currentCalendar())}`;
    part += `, ppt ${ppt}`;
    return part;
  }

  function avgLeg(side, month, year) {
    const idx = MONTHS.indexOf(month);
    const mpt = MONTHS_PT[idx] || month.toLowerCase();
    return `${sidePt(side)} ${qty} toneladas de Al pela média de ${mpt}/${year}`;
  }

  function avgInterLeg(side, start, end) {
    const s = calendarUtils.formatDate(start, currentCalendar());
    const e = calendarUtils.formatDate(end, currentCalendar());
    return `${sidePt(side)} ${qty} toneladas de Al fixando a média de ${s} a ${e}`;
  }

  let part1 = "";
  let part2 = "";
  let instr = "";

  if (type1 === "Fix" && type2 !== "Fix") {
    part1 = fixLeg(side1, fix1, pptFix1, orderType1, validity1, limit1);
    part2 = type2 === "AVG" ? avgLeg(side2, month2, year2) : avgInterLeg(side2, start2, end2);
    if (orderType1) instr = ptExecutionInstruction(orderType1, side1, validity1, limit1);
  } else if (type2 === "Fix" && type1 !== "Fix") {
    part1 = fixLeg(side2, fix2, pptFix2, orderType2, validity2, limit2);
    part2 = type1 === "AVG" ? avgLeg(side1, month1, year1) : avgInterLeg(side1, start1, end1);
    if (orderType2) instr = ptExecutionInstruction(orderType2, side2, validity2, limit2);
  } else {
    part1 = avgLeg(side1, month1, year1);
    part2 = avgLeg(side2, month2, year2);
  }

  let txt = `Você está ${part1}, e ${part2}.`;
  if (instr) txt += `\n${instr}`;
  txt += " Confirma?";
  return txt;
}

function clearTrade(index) {
  console.log(`🧹 Limpando dados do trade ${index}`);

  // Limpar todos os inputs e selects dentro do trade
  const inputs = document.querySelectorAll(
    `#trade-${index} input, #trade-${index} select`
  );
  inputs.forEach((input) => {
    if (input.type === "radio") input.checked = input.defaultChecked;
    else if (input.type === "checkbox") input.checked = false;
    else input.value = input.defaultValue;
  });

  // Resetar campos de Leg 1 e Leg 2
  toggleLeg1Fields(index);
  toggleLeg2Fields(index);

  // Resetar botão de template para "Selecionar Template"
const templateButton = document.querySelector(`#trade-${index} .template-dropdown button`);
  if (templateButton) templateButton.textContent = 'Selecionar Template ▼';
  
  // Limpar saída gerada
  const outputEl = document.getElementById(`output-${index}`);
  if (outputEl) outputEl.textContent = "";



  // Atualizar saída final
  updateFinalOutput();

  console.log(`✅ Trade ${index} limpo e resetado`);
}

function renumberTrades() {
  document.querySelectorAll(".trade-block").forEach((block, i) => {
    const title = block.querySelector(".trade-title");
    if (title) title.textContent = `Trade ${i + 1}`;
  });
}

function removeTrade(index) {
  const el = document.getElementById(`trade-${index}`);
  if (!el) return;
  el.classList.add("opacity-0");
  setTimeout(() => {
    el.remove();
    renumberTrades();
    updateFinalOutput();
  }, 300);
}

function validateTrade(index) {
  const qty = parseFloat(document.getElementById(`qty-${index}`)?.value);
  if (!Number.isFinite(qty) || qty <= 0) {
    alert("Please enter a valid quantity.");
    return false;
  }

  const tradeType = document.getElementById(`tradeType-${index}`)?.value || "Swap";
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2 = document.getElementById(`type2-${index}`)?.value;
  if (!type1) {
    alert("Select price type for Leg 1.");
    return false;
  }
  if (tradeType !== "Forward" && !type2) {
    alert("Select price type for Leg 2.");
    return false;
  }

  const side1 = document.querySelector(`input[name='side1-${index}']:checked`)?.value;
  const side2 = document.querySelector(`input[name='side2-${index}']:checked`)?.value;
  if (side1 && side2 && side1 === side2 && type2) {
    alert("Legs cannot have the same side.");
    return false;
  }

  function checkFix(type, leg) {
    const orderType = document.getElementById(`orderType${leg}-${index}`)?.value;
    const validitySel = document.getElementById(`orderValidity${leg}-${index}`);
    let validity = validitySel?.value;
    const fix = document.getElementById(`${leg === 1 ? "fixDate1" : "fixDate"}-${index}`)?.value;
    if (orderType === "Limit" && !document.getElementById(`limitPrice${leg}-${index}`)?.value) {
      alert("Enter limit price.");
      return false;
    }
    if (orderType && orderType !== "At Market" && !validity) {
      validity = "Day";
      if (validitySel) validitySel.value = "Day";
    }
    if (type === "C2R" && !fix) {
      alert("Please provide a fixing date.");
      return false;
    }
    if (type === "Fix" && !fix && (!orderType || orderType === "At Market")) {
      alert("Please provide a fixing date.");
      return false;
    }
    return true;
  }

  if (type1 === "AVGInter") {
    if (!document.getElementById(`startDate-${index}`)?.value || !document.getElementById(`endDate-${index}`)?.value) {
      alert("Fill start and end dates for Leg 1.");
      return false;
    }
  }
  if (type2 === "AVGInter") {
    if (!document.getElementById(`startDate2-${index}`)?.value || !document.getElementById(`endDate2-${index}`)?.value) {
      alert("Fill start and end dates for Leg 2.");
      return false;
    }
  }

  if (type1 === "Fix" || type1 === "C2R") {
    if (!checkFix(type1, 1)) return false;
  }
  if (type2 === "Fix" || type2 === "C2R") {
    if (!checkFix(type2, 2)) return false;
  }

  return true;
}

function openConfirmationModal(index) {
  const modal = document.getElementById("confirmation-modal");
  const textEl = document.getElementById("confirmation-text");
  if (!modal || !textEl) return;
  if (!validateTrade(index)) return;
  activeTradeIndex = index;
  textEl.textContent = buildConfirmationText(index);
  confirmCallback = () => generateRequest(index);
  modal.classList.remove("hidden");
}

function confirmModal() {
  document.getElementById("confirmation-modal")?.classList.add("hidden");
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
  activeTradeIndex = null;
}

function cancelModal() {
  document.getElementById("confirmation-modal")?.classList.add("hidden");
  if (activeTradeIndex !== null) clearTrade(activeTradeIndex);
  confirmCallback = null;
  activeTradeIndex = null;
}

function shareWhatsApp() {
  const text = document.getElementById("final-output")?.value.trim();
  if (!text) return;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function attachTradeHandlers(index) {
  const gen = document.querySelector(`#trade-${index} button[name='generate']`);
  const clr = document.querySelector(`#trade-${index} button[name='clear']`);
  const rm = document.querySelector(`#trade-${index} button[name='remove']`);
  if (gen) gen.addEventListener("click", () => openConfirmationModal(index));
  if (clr) clr.addEventListener("click", () => clearTrade(index));
  if (rm) rm.addEventListener("click", () => removeTrade(index));

  const type1 = document.getElementById(`type1-${index}`);
  if (type1)
    type1.addEventListener("change", () => {
      toggleLeg1Fields(index);
      updateAvgRestrictions(index);
      syncFixWithAvgInter(index);
    });

  const type2 = document.getElementById(`type2-${index}`);
  if (type2)
    type2.addEventListener("change", () => {
      toggleLeg2Fields(index);
      updateAvgRestrictions(index);
      syncFixWithAvgInter(index);
    });

  const order1 = document.getElementById(`orderType1-${index}`);
  if (order1)
    order1.addEventListener("change", () => toggleOrderFields(index, 1));

  const order2 = document.getElementById(`orderType2-${index}`);
  if (order2)
    order2.addEventListener("change", () => toggleOrderFields(index, 2));

  const side1Radios = document.querySelectorAll(`input[name='side1-${index}']`);
  side1Radios.forEach((r) =>
    r.addEventListener("change", () => syncSides(index, 1))
  );
  const side2Radios = document.querySelectorAll(`input[name='side2-${index}']`);
  side2Radios.forEach((r) =>
    r.addEventListener("change", () => syncSides(index, 2))
  );
  syncSides(index, 1);

  const sd1 = document.getElementById(`startDate-${index}`);
  if (sd1) sd1.addEventListener("change", () => updateEndDateMin(index, 1));

  const sd2 = document.getElementById(`startDate2-${index}`);
  if (sd2) sd2.addEventListener("change", () => updateEndDateMin(index, 2));

  const ed1 = document.getElementById(`endDate-${index}`);
  if (ed1) ed1.addEventListener("change", () => syncFixWithAvgInter(index));
  const ed2 = document.getElementById(`endDate2-${index}`);
  if (ed2)
    ed2.addEventListener("change", () => {
      updateAvgRestrictions(index);
      syncFixWithAvgInter(index);
    });

  const year1 = document.getElementById(`year1-${index}`);
  if (year1)
    year1.addEventListener("change", () => updateMonthOptions(index, 1));

  const year2 = document.getElementById(`year2-${index}`);
  if (year2)
    year2.addEventListener("change", () => updateMonthOptions(index, 2));
}

// Função para adicionar um novo Trade Card
function addTradeCard() {
  const tradeContainer = document.getElementById('trade-container'); // Container dos cards
  const tradeCards = tradeContainer.querySelectorAll('.trade-card'); // Seleciona todos os cards existentes
  const newTradeNumber = tradeCards.length + 1; // Define o número do novo card com base na quantidade atual

  const newTradeCard = document.createElement('div');
  newTradeCard.className = 'trade-card';
  newTradeCard.innerHTML = `
      <h3>Trade ${newTradeNumber}</h3>
      <!-- Conteúdo do card -->
      <button class="remove-trade" onclick="removeTradeCard(this)">Remove</button>
  `;
  tradeContainer.appendChild(newTradeCard);
}

// Função para remover um Trade Card
function removeTradeCard(button) {
  const tradeContainer = document.getElementById('trade-container');
  const tradeCard = button.closest('.trade-card'); // Encontra o card associado ao botão
  tradeContainer.removeChild(tradeCard);

  // Atualiza os números dos cards restantes
  resetTradeNumbers();
}

// Função para resetar os números dos Trade Cards
function resetTradeNumbers() {
  const tradeContainer = document.getElementById('trade-container');
  const tradeCards = tradeContainer.querySelectorAll('.trade-card');

  tradeCards.forEach((card, index) => {
      const title = card.querySelector('h3');
      title.textContent = `Trade ${index + 1}`; // Atualiza o número com base na posição atual
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    addTrade,
    populateYearOptions,
    toggleLeg1Fields,
    toggleLeg2Fields,
    updateFinalOutput,
    copyAll,
    sendEmail,
    parseInputDate,
    getSecondBusinessDay,
    getLastBusinessDay,
    getFixPpt,
    getFirstBusinessDay,
    updateEndDateMin,
    updateAvgRestrictions,
    setMinDates,
    updateMonthOptions,
    toggleOrderFields,
    generateRequest,
    buildExpectedPayoff,
    buildConfirmationText,
    clearTrade,
    removeTrade,
    openConfirmationModal,
    confirmModal,
    cancelModal,
    shareWhatsApp,
  };
}

