let lmeHolidays = {};
let nextIndex = 0;

// Variáveis globais para confirmação
let confirmCallback = null;
let activeTradeIndex = null;

// Carregar holidays.json local primeiro
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
  // Resetar contador para garantir que inicia com Trade 1
  nextIndex = 0;
  console.log("🚀 Sistema inicializando - nextIndex resetado para 0");
  
  // Verificar se elementos essenciais existem
  const tradesContainer = document.getElementById("trades");
  const finalOutput = document.getElementById("final-output");
  
  if (!tradesContainer) {
    console.error("❌ Elemento 'trades' não encontrado!");
    return;
  }
  
  if (!finalOutput) {
    console.error("❌ Elemento 'final-output' não encontrado!");
    return;
  }
  
  loadHolidayData().finally(() => {
    console.log("📅 Holiday data carregado, adicionando primeiro trade...");
    
    // Limpar container primeiro (caso tenha algo)
    tradesContainer.innerHTML = "";
    
    // Adicionar apenas UM trade
    addTrade();
    console.log(`✅ Trade ${nextIndex-1} adicionado`);
    
    // Configurar event listeners do modal
    const ok = document.getElementById("confirmation-ok");
    const cancel = document.getElementById("confirmation-cancel");
    if (ok) ok.addEventListener("click", confirmModal);
    if (cancel) cancel.addEventListener("click", cancelModal);
    
    // Event listener para company change
    document
      .querySelectorAll("input[name='company']")
      .forEach((el) => el.addEventListener("change", updateFinalOutput));
      
    console.log("✅ Sistema inicializado completamente");
  });
};

// Funções de formatação de data
function formatDate(date) {
  if (!date) return '';
  
  // Garantir que temos um objeto Date
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  if (isNaN(date.getTime())) return '';
  
  // Formato DD/MM/YYYY
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return `${day}/${month}/${year}`;
}

function parseDate(str) {
  if (!str) return null;
  
  // Tentar diferentes formatos
  let date;
  
  // Formato DD/MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      date = new Date(year, month, day);
    }
  }
  // Formato YYYY-MM-DD (ISO)
  else if (str.includes('-')) {
    date = new Date(str);
  }
  // Outros formatos
  else {
    date = new Date(str);
  }
  
  return isNaN(date.getTime()) ? null : date;
}

function getCalendarType() {
  return "gregorian"; // Fixo para gregorian
}

/**
 * Fetches the latest UK bank holidays and merges them with the local
 * `lmeHolidays` object so offline requests still have up‑to‑date data.
 *
 * @returns {Promise<void>} Resolves once the remote data has been processed.
 */
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

/**
 * Returns the second business day of the month following the provided month.
 *
 * Weekends and any dates in `lmeHolidays` are skipped when counting
 * business days.
 *
 * @param {number} year - The reference year.
 * @param {number} month - Zero‑based reference month.
 * @returns {string} Formatted date string for the second business day.
 */
function getSecondBusinessDay(year, month) {
  const nextMonth = new Date(year, month + 1, 1);
  let businessDayCount = 0;
  let currentDate = new Date(nextMonth);
  const holidays = lmeHolidays[nextMonth.getFullYear()] || [];

  while (businessDayCount < 2) {
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    const isHoliday = holidays.includes(currentDate.toISOString().split("T")[0]);

    if (!isWeekend && !isHoliday) {
      businessDayCount++;
    }

    if (businessDayCount < 2) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return formatDate(currentDate);
}

/**
 * Returns the last business day of the specified month.
 *
 * Weekends and any dates in `lmeHolidays` are skipped.
 *
 * @param {number} year - The year.
 * @param {number} month - Zero‑based month.
 * @returns {string} Formatted date string for the last business day.
 */
function getLastBusinessDay(year, month) {
  const lastDay = new Date(year, month + 1, 0);
  const holidays = lmeHolidays[year] || [];

  while (lastDay.getDate() > 0) {
    const isWeekend = lastDay.getDay() === 0 || lastDay.getDay() === 6;
    const isHoliday = holidays.includes(lastDay.toISOString().split("T")[0]);

    if (!isWeekend && !isHoliday) {
      break;
    }

    lastDay.setDate(lastDay.getDate() - 1);
  }

  return formatDate(lastDay);
}

/**
 * Given a fixing date in DD/MM/YYYY format, returns the PPT date,
 * which is typically the same date unless it falls on a weekend
 * or UK bank holiday, in which case it returns the previous business day.
 *
 * @param {string} fixingDateStr - The fixing date in DD/MM/YYYY format.
 * @returns {string} The PPT date in DD/MM/YYYY format.
 * @throws {Error} If the fixing date is invalid or falls on a weekend/holiday.
 */
function getFixPpt(fixingDateStr) {
  const fixingDate = parseDate(fixingDateStr);
  if (!fixingDate || isNaN(fixingDate.getTime())) {
    throw new Error("Invalid fixing date provided.");
  }

  const holidays = lmeHolidays[fixingDate.getFullYear()] || [];
  let current = new Date(fixingDate);
  let added = 0;

  while (added < 2) {
    current.setDate(current.getDate() + 1);
    const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    const isHoliday = holidays.includes(current.toISOString().split("T")[0]);
    if (!isWeekend && !isHoliday) {
      added++;
    }
  }

  return formatDate(current);
}

/**
 * Helper to parse input date strings in various formats.
 *
 * @param {string} dateStr - The date string to parse.
 * @returns {Date|null} A Date object, or null if parsing fails.
 */
function parseInputDate(dateStr) {
  if (!dateStr) return null;
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Try DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // Fallback to native parsing
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param {string} str - The string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Populates year options for a select element.
 *
 * @param {string} selectId - The ID of the select element.
 * @param {number} startYear - The starting year.
 * @param {number} count - The number of years to include.
 */
function populateYearOptions(selectId, start, count) {
  const select = document.getElementById(selectId);
  if (!select) {
    console.log(`⚠️ Select não encontrado: ${selectId}`);
    return;
  }
  
  console.log(`📅 Populando ${selectId} com anos ${start} a ${start + count - 1}`);
  
  select.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const year = start + i;
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    if (i === 0) opt.selected = true; // Selecionar primeiro ano
    select.appendChild(opt);
  }
  
  console.log(`✅ Anos populados em ${selectId}: ${select.options.length} opções`);
}

// Modal functions
function showConfirmationPopup(text, callback) {
  console.log("📋 Mostrando modal de confirmação");
  
  const modal = document.getElementById("confirmation-modal");
  const msg = document.getElementById("confirmation-text");
  
  if (!modal) {
    console.error("❌ Modal não encontrado: confirmation-modal");
    // Executar callback diretamente se modal não existe
    if (callback) callback();
    return;
  }
  
  if (!msg) {
    console.error("❌ Texto do modal não encontrado: confirmation-text");
  } else {
    msg.textContent = text;
  }
  
  // Salvar callback
  confirmCallback = callback;
  
  // Mostrar modal
  modal.classList.remove("hidden");
  console.log("✅ Modal exibido");
}

function closeConfirmationPopup() {
  const modal = document.getElementById("confirmation-modal");
  if (modal) modal.classList.add("hidden");
  confirmCallback = null;
  activeTradeIndex = null;
}

function confirmModal() {
  console.log("✅ Modal confirmado - executando callback");
  
  // Fechar modal primeiro
  const modal = document.getElementById("confirmation-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  
  // Executar callback se existir
  if (typeof confirmCallback === "function") {
    console.log("🎯 Executando callback de confirmação");
    try {
      confirmCallback();
      console.log("✅ Callback executado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao executar callback:", error);
      alert("Erro ao gerar trade request: " + error.message);
    }
  } else {
    console.log("⚠️ Nenhum callback definido");
  }
  
  // Limpar variáveis
  confirmCallback = null;
  activeTradeIndex = null;
}

function cancelModal() {
  console.log("❌ Modal cancelado");
  
  // Fechar modal
  const modal = document.getElementById("confirmation-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
  
  // Limpar trade se index ativo existir
  if (activeTradeIndex !== null) {
    console.log(`🧹 Limpando dados do trade ${activeTradeIndex}`);
    clearTrade(activeTradeIndex);
  }
  
  // Limpar variáveis
  confirmCallback = null;
  activeTradeIndex = null;
}

function openConfirmModal(index) {
  console.log(`📋 Abrindo modal de confirmação para trade ${index}`);
  
  try {
    // Salvar index ativo
    activeTradeIndex = index;
    
    // Construir texto de confirmação
    const text = buildConfirmationText(index);
    console.log(`📝 Texto de confirmação: ${text}`);
    
    // Mostrar popup com callback para generateRequest
    showConfirmationPopup(text, () => {
      console.log(`🎯 Callback executado - gerando request para trade ${index}`);
      generateRequest(index);
    });
    
  } catch (err) {
    console.error(`❌ Erro ao abrir modal para trade ${index}:`, err);
    const out = document.getElementById(`output-${index}`);
    if (out) out.textContent = err.message;
    
    // Limpar variáveis em caso de erro
    activeTradeIndex = null;
  }
}

function buildConfirmationText(index) {
  const qtyInput = document.getElementById(`qty-${index}`);
  const q = parseFloat(qtyInput.value);
  if (!isFinite(q) || q <= 0) throw new Error("Quantidade inválida.");

  const trade = {
    qty: q,
    side1: document.querySelector(`input[name='side1-${index}']:checked`).value,
    side2: document.querySelector(`input[name='side2-${index}']:checked`).value,
    type1: document.getElementById(`type1-${index}`)?.value || "AVG",
    type2: document.getElementById(`type2-${index}`)?.value || "AVG",
    month1: document.getElementById(`month1-${index}`)?.value,
    year1: parseInt(document.getElementById(`year1-${index}`)?.value),
    month2: document.getElementById(`month2-${index}`)?.value,
    year2: parseInt(document.getElementById(`year2-${index}`)?.value),
    start1: document.getElementById(`startDate-${index}`)?.value,
    end1: document.getElementById(`endDate-${index}`)?.value,
    start2: document.getElementById(`startDate2-${index}`)?.value,
    end2: document.getElementById(`endDate2-${index}`)?.value,
    fix1: document.getElementById(`fixDate1-${index}`)?.value,
    fix2: document.getElementById(`fixDate-${index}`)?.value,
    orderType1: document.getElementById(`orderType1-${index}`)?.value,
    orderType2: document.getElementById(`orderType2-${index}`)?.value,
    limitPrice1: document.getElementById(`limitPrice1-${index}`)?.value,
    limitPrice2: document.getElementById(`limitPrice2-${index}`)?.value,
    validity1: document.getElementById(`orderValidity1-${index}`)?.value,
    validity2: document.getElementById(`orderValidity2-${index}`)?.value,
    orderText1: getOrderTypeText ? getOrderTypeText(index, 1) : "",
    orderText2: getOrderTypeText ? getOrderTypeText(index, 2) : "",
  };

  return generateConfirmationMessage(trade);
}

function generateConfirmationMessage(trade) {
  const {
    qty,
    type1,
    type2,
    start1,
    end1,
    month1,
    year1,
    start2,
    end2,
    month2,
    year2,
    side1,
    side2,
    fix1,
    fix2,
    orderType1,
    orderType2,
    limitPrice1,
    limitPrice2,
    validity1,
    validity2,
    orderText1,
    orderText2,
  } = trade;

  let pptDate = "";
  if (type1 === "AVG") {
    const idx = new Date(`${month1} 1, ${year1}`).getMonth();
    pptDate = getSecondBusinessDay(year1, idx);
  } else if (type2 === "AVG") {
    const idx = new Date(`${month2} 1, ${year2}`).getMonth();
    pptDate = getSecondBusinessDay(year2, idx);
  } else if (type1 === "AVGInter" || type2 === "AVGInter") {
    const endStr = end1 || end2;
    const d = parseInputDate(endStr);
    pptDate = d ? getFixPpt(formatDate(d)) : "";
  } else if (end1 || end2) {
    const d = parseInputDate(end1 || end2);
    pptDate = d ? formatDate(d) : "";
  }

  const sideStr1 = side1 === "buy" ? "comprando" : "vendendo";
  const sideStr2 = side2 === "sell" ? "vendendo" : "comprando";

  const leg1 = readableLeg(type1, qty, start1, end1, month1, year1, fix1, orderText1);
  const leg2 = readableLeg(type2, qty, start2, end2, month2, year2, fix2, orderText2);

  const fixTypes = ["Fix", "C2R"];
  const avgTypes = ["AVG", "AVGInter", "AVGPeriod"];

  let firstLeg = leg1;
  let secondLeg = leg2;
  let firstSide = sideStr1;
  let secondSide = sideStr2;
  let firstType = type1;
  let secondType = type2;

  if (
    fixTypes.includes(type2) &&
    avgTypes.includes(type1) &&
    !fixTypes.includes(type1)
  ) {
    firstLeg = leg2;
    secondLeg = leg1;
    firstSide = sideStr2;
    secondSide = sideStr1;
    firstType = type2;
    secondType = type1;
  }

  let orderText = "";
  if (fixTypes.includes(type1) && !fixTypes.includes(type2)) {
    orderText = getOrderConfirmationText(
      orderType1,
      side1,
      limitPrice1,
      validity1,
    );
  } else if (fixTypes.includes(type2) && !fixTypes.includes(type1)) {
    orderText = getOrderConfirmationText(
      orderType2,
      side2,
      limitPrice2,
      validity2,
    );
  }

  let baseLine;
  if (fixTypes.includes(secondType) && !fixTypes.includes(firstType)) {
    baseLine = `Você está ${firstSide} ${firstLeg}, e ${secondSide} ${secondLeg}, ppt ${pptDate}.`;
  } else {
    baseLine = `Você está ${firstSide} ${firstLeg}, ppt ${pptDate}, e ${secondSide} ${secondLeg}.`;
  }

  if (orderText) {
    return `${baseLine}\nOrdem ${orderText}. Confirma?`;
  }
  return `${baseLine} Confirma?`;
}

function readableLeg(type, qty, start, end, month, year, fix, orderText = "") {
  switch (type) {
    case "Fix":
      if (fix) {
        let base = `${qty} toneladas de Al com preço fixado em ${formatDate(
          parseInputDate(fix),
        )}`;
        if (orderText) base += orderText;
        return base;
      }
      return `${qty} toneladas de Al com preço fixado${orderText}`;
    case "C2R":
      return `${qty} toneladas de Al com preço fixo em dinheiro${orderText}`;
    case "AVG":
      return `${qty} toneladas de Al pela média de ${monthNamePt(month).toLowerCase()}/${year}`;
    case "AVGInter":
    case "AVGPeriod":
      return `${qty} toneladas de Al fixando a média de ${formatDate(parseInputDate(start))} a ${formatDate(parseInputDate(end))}`;
    default:
      return "";
  }
}

function monthNamePt(m) {
  const monthsPt = [
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
  const idx = monthNames.indexOf(m);
  return idx >= 0 ? monthsPt[idx] : m;
}

function formatValidityPt(val) {
  if (!val) return "";
  switch (val) {
    case "Day":
      return "válida até o final do dia";
    case "GTC":
      return "válida até ser cancelada";
    case "Until Further Notice":
      return "válida até novo aviso";
    default:
      return `válida por ${val.toLowerCase().replace('hours', 'horas')}`;
  }
}

function getOrderConfirmationText(type, side, limit, validity) {
  if (!type) return "";
  let base;
  switch (type) {
    case "Resting":
      base = `resting (${side === "buy" ? "melhor oferta no book" : "melhor bid no book"})`;
      break;
    case "At Market":
      base = "at market";
      break;
    case "Limit":
      base = limit ? `limit ${limit}` : "limit";
      break;
    case "Range":
      base = "range";
      break;
    default:
      base = type.toLowerCase();
  }
  const valText = formatValidityPt(validity);
  return valText ? `${base} ${valText}` : base;
}

/**
 * Builds the text for a single trade request using the values from the form.
 *
 * Validation errors are displayed in the relevant fields and a message is
 * shown in the output element when invalid data is encountered.
 *
 * @param {number} index - Trade block index to read values from.
 */
function generateRequest(index) {
  const outputEl = document.getElementById(`output-${index}`);
  try {
    const qtyInput = document.getElementById(`qty-${index}`);
    const q = parseFloat(qtyInput.value);
    if (!isFinite(q)) {
      qtyInput.classList.add("border-red-500");
      if (outputEl) outputEl.textContent = "Please enter a valid quantity.";
      qtyInput.focus();
      return;
    }
    if (q <= 0) {
      qtyInput.classList.add("border-red-500");
      if (outputEl)
        outputEl.textContent = "Quantity must be greater than zero.";
      qtyInput.focus();
      return;
    }
    qtyInput.classList.remove("border-red-500");
    const tradeType =
      document.getElementById(`tradeType-${index}`)?.value || "Swap";
    const syncPpt = document.getElementById(`syncPpt-${index}`)?.checked;
    const leg1Side = document.querySelector(
      `input[name='side1-${index}']:checked`,
    ).value;
    const leg1Type = document.getElementById(`type1-${index}`)?.value || "AVG";
    const month = document.getElementById(`month1-${index}`).value;
    const year = parseInt(document.getElementById(`year1-${index}`).value);
    const startDateRaw =
      document.getElementById(`startDate-${index}`)?.value || "";
    const endDateRaw = document.getElementById(`endDate-${index}`)?.value || "";
    const leg2Side = document.querySelector(
      `input[name='side2-${index}']:checked`,
    ).value;
    const leg2Type = document.getElementById(`type2-${index}`).value;
    const month2 = document.getElementById(`month2-${index}`).value;
    const year2 = parseInt(document.getElementById(`year2-${index}`).value);
    const fixInputLeg1 = document.getElementById(`fixDate1-${index}`);
    const fixInput = document.getElementById(`fixDate-${index}`);
    const dateFix1Raw = fixInputLeg1 ? fixInputLeg1.value : "";
    const dateFix2Raw = fixInput.value;
    const dateFix1 = dateFix1Raw ? formatDate(parseInputDate(dateFix1Raw)) : "";
    const dateFix2 = dateFix2Raw ? formatDate(parseInputDate(dateFix2Raw)) : "";
    if (fixInputLeg1) fixInputLeg1.classList.remove("border-red-500");
    fixInput.classList.remove("border-red-500");
    
    // Determine which leg is averaging to compute its PPT
    let avgMonth, avgYear;
    if (leg1Type === "AVG") {
      avgMonth = month;
      avgYear = year;
    } else if (leg2Type === "AVG") {
      avgMonth = month2;
      avgYear = year2;
    }
    const monthIndex = avgMonth
      ? new Date(`${avgMonth} 1, ${avgYear}`).getMonth()
      : 0;
    const pptDateAVG = avgMonth
      ? getSecondBusinessDay(avgYear, monthIndex)
      : "";
    const lastBizDay = avgMonth ? getLastBusinessDay(avgYear, monthIndex) : "";
    const lastBizDate = lastBizDay ? parseDate(lastBizDay) : null;

    let leg1;
    let ppt1 = "";
    const showPptAvgFix =
      (leg2Type === "Fix" && dateFix2Raw && !fixInput.readOnly) ||
      (leg1Type === "Fix" && dateFix1Raw && !(fixInputLeg1 && fixInputLeg1.readOnly));
    const showPptAvgInter =
      (leg1Type === "AVGInter" && leg2Type === "AVG") ||
      (leg2Type === "AVGInter" && leg1Type === "AVG");
    const showPptAvg = showPptAvgFix || showPptAvgInter;
    
    if (leg1Type === "AVG") {
      leg1 = `${capitalize(leg1Side)} ${q} mt Al AVG ${month} ${year}`;
      leg1 += ` Flat`;
      ppt1 = pptDateAVG;
    } else if (leg1Type === "AVGInter") {
      const start = parseInputDate(startDateRaw);
      const end = parseInputDate(endDateRaw);
      if (!start || !end)
        throw new Error("Start and end dates are required for AVG Period.");
      const startStr = formatDate(start);
      const endStr = formatDate(end);
      leg1 = `${capitalize(leg1Side)} ${q} mt Al Fixing AVG ${startStr} to ${endStr}`;
      ppt1 = pptDateAVG;
      if (showPptAvg) {
        leg1 += `${showPptAvgInter ? "," : ""} ppt ${ppt1}`;
      }
    } else if (leg1Type === "Fix" && leg2Type === "AVG") {
      ppt1 = pptDateAVG;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 1) : "";
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD${orderTypeText} ppt ${ppt1}`;
      
    } else if (leg1Type === "Fix" && leg2Type === "AVGInter") {
      const end = parseInputDate(document.getElementById(`endDate2-${index}`)?.value || "");
      if (!end) throw new Error("End date is required for AVG Period.");
      const ppt = getFixPpt(formatDate(end));
      ppt1 = ppt;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 1) : "";
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD${orderTypeText} ppt ${ppt1}`;
      
    } else if (leg1Type === "Fix") {
      if (!dateFix1Raw) throw new Error("Please provide a fixing date.");
      let pptFixLeg1;
      try {
        pptFixLeg1 = getFixPpt(dateFix1);
      } catch (err) {
        err.fixInputId = `fixDate1-${index}`;
        throw err;
      }
      ppt1 = pptFixLeg1;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 1) : "";
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ${dateFix1}${orderTypeText}, ppt ${ppt1}`;
      
    } else {
      leg1 = `${capitalize(leg1Side)} ${q} mt Al ${leg1Type}`;
    }
    
    let leg2;
    let ppt2 = "";
    if (leg2Type === "AVG") {
      leg2 = `${capitalize(leg2Side)} ${q} mt Al AVG ${month2} ${year2}`;
      leg2 += ` Flat`;
      ppt2 = pptDateAVG;
    } else if (leg2Type === "AVGInter") {
      const start = parseInputDate(
        document.getElementById(`startDate2-${index}`)?.value || "",
      );
      const end = parseInputDate(
        document.getElementById(`endDate2-${index}`)?.value || "",
      );
      if (!start || !end)
        throw new Error("Start and end dates are required for AVGInter.");
      const sStr = formatDate(start);
      const eStr = formatDate(end);
      leg2 = `${capitalize(leg2Side)} ${q} mt Al Fixing AVG ${sStr} to ${eStr}`;
      ppt2 = pptDateAVG;
      if (showPptAvg) {
        leg2 += `${showPptAvgInter ? "," : ""} ppt ${ppt2}`;
      }
    } else if (leg2Type === "Fix" && leg1Type === "AVG") {
      ppt2 = pptDateAVG;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 2) : "";
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD${orderTypeText} ppt ${ppt2}`;
      
    } else if (leg2Type === "Fix" && leg1Type === "AVGInter") {
      const end = parseInputDate(document.getElementById(`endDate-${index}`)?.value || "");
      if (!end) throw new Error("End date is required for AVG Period.");
      const ppt = getFixPpt(formatDate(end));
      ppt2 = ppt;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 2) : "";
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD${orderTypeText} ppt ${ppt2}`;
      
    } else if (leg2Type === "Fix") {
      if (!dateFix2Raw) throw new Error("Please provide a fixing date.");
      let pptFix;
      try {
        pptFix = getFixPpt(dateFix2);
      } catch (err) {
        err.fixInputId = `fixDate-${index}`;
        throw err;
      }
      ppt2 = pptFix;
      
      // ADICIONAR: Order Type para Fix
      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 2) : "";
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ${dateFix2}${orderTypeText}, ppt ${ppt2}`;
      
    } else if (leg2Type === "C2R") {
      if (!dateFix2Raw) throw new Error("Please provide a fixing date.");
      let pptFix;
      try {
        pptFix = getFixPpt(dateFix2);
      } catch (err) {
        err.fixInputId = `fixDate-${index}`;
        throw err;
      }
      ppt2 = pptFix;

      const orderTypeText = getOrderTypeText ? getOrderTypeText(index, 2) : "";
      leg2 = `${capitalize(leg2Side)} ${q} mt Al C2R${orderTypeText} ${dateFix2} ppt ${pptFix}`;
    }

    const fixTypes = ["Fix", "C2R"];
    const avgTypes = ["AVG", "AVGInter", "AVGPeriod"];
    let firstLeg = leg1;
    let secondLeg = leg2;
    let instr1 = getExecutionInstruction(index, 1, leg1Side);
    let instr2 = getExecutionInstruction(index, 2, leg2Side);
    if (
      fixTypes.includes(leg2Type) &&
      avgTypes.includes(leg1Type) &&
      !fixTypes.includes(leg1Type)
    ) {
      firstLeg = leg2;
      secondLeg = leg1;
      const tmp = instr1;
      instr1 = instr2;
      instr2 = tmp;
    }

    const lines = [];
    if (tradeType === "Swap") {
      lines.push(`LME Request: ${firstLeg} and ${secondLeg} against`);
      if (instr1) lines.push(instr1);
      if (instr2 && instr2 !== instr1) lines.push(instr2);
    } else {
      if (secondLeg) {
        if (syncPpt && ppt1 && ppt2) {
          const d1 = parseDate(ppt1);
          const d2 = parseDate(ppt2);
          let latest = ppt1;
          if (d1 && d2 && d2 > d1) latest = ppt2;
          firstLeg = firstLeg.replace(ppt1, latest);
          secondLeg = secondLeg.replace(ppt2, latest);
        }
        lines.push(`LME Request: ${firstLeg}`);
        if (instr1) lines.push(instr1);
        lines.push(`LME Request: ${secondLeg}`);
        if (instr2) lines.push(instr2);
      } else {
        lines.push(`LME Request: ${firstLeg}`);
        if (instr1) lines.push(instr1);
      }
    }
    const result = lines.join("\n");
    if (outputEl) outputEl.textContent = result;
    updateFinalOutput();
  } catch (e) {
    console.error("Error generating request:", e);
    if (/Fixing date/.test(e.message)) {
      const id = e.fixInputId || `fixDate-${index}`;
      const fixField = document.getElementById(id);
      if (fixField) {
        fixField.classList.add("border-red-500");
        fixField.focus();
      }
    }
    if (outputEl) outputEl.textContent = e.message;
  }
}

// Toggle Order Type Fields
function toggleOrderTypeFields(index, leg) {
  try {
    console.log(`🔧 Toggle order type fields - Trade ${index}, Leg ${leg}`);
    
    const orderTypeSel = document.getElementById(`orderType${leg}-${index}`);
    const limitField = document.getElementById(`limitField${leg}-${index}`);
    const rangeFields = document.getElementById(`rangeFields${leg}-${index}`);
    const validityField = document.getElementById(`validityField${leg}-${index}`);
    
    if (!orderTypeSel) {
      console.log(`⚠️ Order type select não encontrado: orderType${leg}-${index}`);
      return;
    }
    
    const orderType = orderTypeSel.value;
    console.log(`📋 Order type atual: ${orderType}`);
    
    // Hide all fields first
    if (limitField) limitField.style.display = "none";
    if (rangeFields) rangeFields.style.display = "none";
    if (validityField) validityField.style.display = "none";
    
    // Show relevant fields
    if (orderType === "Limit" && limitField) {
      limitField.style.display = "";
      console.log(`✅ Mostrando campo Limit para trade ${index} leg ${leg}`);
    } else if (orderType === "Range" && rangeFields) {
      rangeFields.style.display = "";
      console.log(`✅ Mostrando campos Range para trade ${index} leg ${leg}`);
    }
    if (orderType !== "At Market" && validityField) {
      validityField.style.display = "";
    }
    // At Market and Resting don't show additional fields
    
  } catch (error) {
    console.error(`❌ Erro ao toggle order type fields:`, error);
  }
}

// Get Order Type Text for trade request
function getOrderTypeText(index, leg) {
  try {
    const orderTypeSel = document.getElementById(`orderType${leg}-${index}`);
    if (!orderTypeSel) return "";

    const orderType = orderTypeSel.value;
    const validitySel = document.getElementById(`orderValidity${leg}-${index}`);
    let validityText = "";
    if (orderType !== "At Market" && validitySel) {
      let val = validitySel.value || "Day";
      if (val === "Until Further Notice") {
        validityText = `valid until Further Notice`;
      } else {
        validityText = `valid for ${val}`;
      }
    }

    switch (orderType) {
      case "At Market":
        return " At Market";
      case "Limit":
        const limitPrice = document.getElementById(`limitPrice${leg}-${index}`)?.value;
        const baseLimit = limitPrice ? ` Limit ${limitPrice}` : " Limit";
        return validityText ? `${baseLimit}, ${validityText}` : baseLimit;
      case "Range":
        const rangeFrom = document.getElementById(`rangeFrom${leg}-${index}`)?.value;
        const rangeTo = document.getElementById(`rangeTo${leg}-${index}`)?.value;
        if (rangeFrom && rangeTo) {
          const baseRange = ` Range ${rangeFrom} to ${rangeTo}`;
          return validityText ? `${baseRange}, ${validityText}` : baseRange;
        } else if (rangeFrom || rangeTo) {
          const baseRange = ` Range ${rangeFrom || rangeTo}`;
          return validityText ? `${baseRange}, ${validityText}` : baseRange;
        }
        return validityText ? ` Range, ${validityText}` : " Range";
      case "Resting":
        return validityText ? ` Resting, ${validityText}` : " Resting";
      default:
        return "";
    }
  } catch (error) {
    console.error(`❌ Erro ao obter order type text:`, error);
    return "";
  }
}

// Build Execution Instruction line based on order type settings
function getExecutionInstruction(index, leg, side) {
  try {
    const typeSel = document.getElementById(`type${leg}-${index}`);
    if (!typeSel) return "";
    const legType = typeSel.value;
    if (legType !== "Fix" && legType !== "C2R") return "";

    const orderTypeSel = document.getElementById(`orderType${leg}-${index}`);
    if (!orderTypeSel) return "";
    const orderType = orderTypeSel.value;

    const validitySel = document.getElementById(`orderValidity${leg}-${index}`);
    let validity = "Day";
    if (orderType !== "At Market" && validitySel) {
      validity = validitySel.value || "Day";
    } else if (orderType === "At Market" && validitySel && validitySel.value) {
      validity = validitySel.value;
    }

    if (validity === "Until Further Notice") {
      validity = "Until Further Notice";
    }

    const capSide = capitalize(side);

    switch (orderType) {
      case "Limit": {
        const limit = document.getElementById(`limitPrice${leg}-${index}`)?.value;
        const pricePart = limit ? ` @ USD ${limit}` : "";
        return `Execution Instruction: Please work this order as a Limit${pricePart} for the ${capSide} side, valid for ${validity}.`;
      }
      case "Range": {
        const from = document.getElementById(`rangeFrom${leg}-${index}`)?.value;
        const to = document.getElementById(`rangeTo${leg}-${index}`)?.value;
        let rangePart = "";
        if (from && to) {
          rangePart = ` between USD ${from} and ${to}`;
        } else if (from || to) {
          rangePart = ` around USD ${from || to}`;
        }
        return `Execution Instruction: Please work this order as a Range${rangePart} for the ${capSide} side, valid for ${validity}.`;
      }
      case "Resting":
        return `Execution Instruction: Please work this order posting as the best bid/offer in the book for the ${capSide} side, valid for ${validity}.`;
      case "At Market":
        return `Execution Instruction: Please work this order At Market for the ${capSide} side, valid for ${validity}.`;
      default:
        return "";
    }
  } catch (err) {
    console.error("Failed to build execution instruction:", err);
    return "";
  }
}

function toggleLeg1Fields(index) {
  const typeSel = document.getElementById(`type1-${index}`);
  const type2 = document.getElementById(`type2-${index}`)?.value;
  const monthWrap = document.getElementById(`avgFields1-${index}`);
  const startInput = document.getElementById(`startDate-${index}`);
  const endInput = document.getElementById(`endDate-${index}`);
  const fixInput = document.getElementById(`fixDate1-${index}`);
  const orderTypeFields = document.getElementById(`orderType1Fields-${index}`);
  
  if (!typeSel) return;

  const val = typeSel.value;
  
  // Toggle AVG fields (mês e ano)
  if (monthWrap) monthWrap.style.display = val === "AVG" ? "" : "none";
  
  // Toggle AVG Period fields
  if (startInput && startInput.parentElement)
    startInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  if (endInput && endInput.parentElement)
    endInput.parentElement.style.display = val === "AVGInter" ? "" : "none";
  
  // Toggle Fix/C2R fields
  if (fixInput && fixInput.parentElement) {
    fixInput.parentElement.style.display =
      val === "Fix" || val === "C2R" ? "" : "none";
    if (val !== "Fix" && val !== "C2R") {
      fixInput.value = "";
      fixInput.readOnly = false;
    } else {
      fixInput.readOnly = false;
      if (val === "Fix" && type2 === "AVG") {
        const month = document.getElementById(`month2-${index}`).value;
        const year = parseInt(document.getElementById(`year2-${index}`).value);
        const monthIdx = new Date(`${month} 1, ${year}`).getMonth();
        const lastStr = getLastBusinessDay(year, monthIdx);
        const date = parseDate(lastStr);
        fixInput.value = date.toISOString().split("T")[0];
        fixInput.readOnly = true;
      } else if (val === "Fix" && type2 === "AVGInter") {
        const endVal = document.getElementById(`endDate2-${index}`)?.value;
        if (endVal) {
          fixInput.value = endVal;
          fixInput.readOnly = true;
        }
      }
    }
  }
  
  // IMPORTANTE: Toggle Order Type fields para Fix/C2R
  if (orderTypeFields) {
    const shouldShow = val === "Fix" || val === "C2R";
    orderTypeFields.style.display = shouldShow ? "" : "none";
    console.log(`Order Type Leg1 ${shouldShow ? 'mostrado' : 'escondido'} para trade ${index}`);
    
    // Inicializar visibility dos subcampos quando mostrar
    if (shouldShow) {
      setTimeout(() => toggleOrderTypeFields(index, 1), 50);
    }
  }
}

function toggleLeg2Fields(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2Sel = document.getElementById(`type2-${index}`);
  const fixInput = document.getElementById(`fixDate-${index}`);
  const monthWrap = document.getElementById(`avgFields2-${index}`);
  const startInput = document.getElementById(`startDate2-${index}`);
  const endInput = document.getElementById(`endDate2-${index}`);
  const orderTypeFields = document.getElementById(`orderType2Fields-${index}`);
  
  if (!type2Sel) return;

  const type2 = type2Sel.value;

  // Toggle AVG fields (mês e ano)
  if (monthWrap) monthWrap.style.display = type2 === "AVG" ? "" : "none";
  
  // Toggle AVG Period fields
  if (startInput && startInput.parentElement)
    startInput.parentElement.style.display = type2 === "AVGInter" ? "" : "none";
  if (endInput && endInput.parentElement)
    endInput.parentElement.style.display = type2 === "AVGInter" ? "" : "none";

  // Toggle Fix/C2R fields
  if (fixInput && fixInput.parentElement) {
    fixInput.parentElement.style.display =
      type2 === "Fix" || type2 === "C2R" ? "" : "none";
    if (type2 !== "Fix" && type2 !== "C2R") {
      fixInput.value = "";
      fixInput.readOnly = false;
    } else {
      fixInput.readOnly = false;
      if (type2 === "Fix" && type1 === "AVG") {
        const month = document.getElementById(`month1-${index}`).value;
        const year = parseInt(document.getElementById(`year1-${index}`).value);
        const monthIdx = new Date(`${month} 1, ${year}`).getMonth();
        const lastStr = getLastBusinessDay(year, monthIdx);
        const date = parseDate(lastStr);
        fixInput.value = date.toISOString().split("T")[0];
        fixInput.readOnly = true;
      } else if (type2 === "Fix" && type1 === "AVGInter") {
        const endVal = document.getElementById(`endDate-${index}`)?.value;
        if (endVal) {
          fixInput.value = endVal;
          fixInput.readOnly = true;
        }
      }
    }
  }
  
  // IMPORTANTE: Toggle Order Type fields para Fix/C2R
  if (orderTypeFields) {
    const shouldShow = type2 === "Fix" || type2 === "C2R";
    orderTypeFields.style.display = shouldShow ? "" : "none";
    console.log(`Order Type Leg2 ${shouldShow ? 'mostrado' : 'escondido'} para trade ${index}`);
    
    // Inicializar visibility dos subcampos quando mostrar
    if (shouldShow) {
      setTimeout(() => toggleOrderTypeFields(index, 2), 50);
    }
  }
}

function addTrade() {
  const index = nextIndex++;
  const template = document.getElementById("trade-template");
  const clone = template.content.cloneNode(true);
  
  // Assign unique IDs (including the new Leg 1 fixing date field)
  clone.querySelectorAll("[id]").forEach((el) => {
    const baseId = el.id.replace(/-\d+$/, "");
    el.id = `${baseId}-${index}`;
    if (el.name) el.name = el.name.replace(/-\d+$/, `-${index}`);
  });
  clone.querySelectorAll("[name]:not([id])").forEach((el) => {
    el.name = el.name.replace(/-\d+$/, `-${index}`);
  });
  clone.querySelector("[id^='output-']").id = `output-${index}`;
  
  const title = clone.querySelector(".trade-title");
  if (title) title.textContent = `Trade ${index + 1}`;
  
  // IMPORTANTE: Usar onclick ao invés de event listeners
  clone
    .querySelector("button[name='generate']")
    .setAttribute("onclick", `openConfirmModal(${index})`);
  clone
    .querySelector("button[name='clear']")
    .setAttribute("onclick", `clearTrade(${index})`);
  clone
    .querySelector("button[name='remove']")
    .setAttribute("onclick", `removeTrade(${index})`);
    
  const div = document.createElement("div");
  div.id = `trade-${index}`;
  div.className = "trade-block opacity-0 transition-opacity duration-300";
  div.appendChild(clone);
  
  const trades = document.getElementById("trades");
  if (trades) {
    trades.appendChild(div);
    requestAnimationFrame(() => div.classList.remove("opacity-0"));
  }
  
  const currentYear = new Date().getFullYear();
  populateYearOptions(`year1-${index}`, currentYear, 3);
  populateYearOptions(`year2-${index}`, currentYear, 3);
  updateMonthOptions(index, 1);
  updateMonthOptions(index, 2);
  setMinDates(index);
  updateEndDateMin(index, 1);
  updateEndDateMin(index, 2);
  updateAvgRestrictions(index);
  
  // Event listeners para campos
  document.getElementById(`type1-${index}`).addEventListener("change", () => {
    toggleLeg1Fields(index);
    toggleLeg2Fields(index);
    updateAvgRestrictions(index);
  });
  document.getElementById(`type2-${index}`).addEventListener("change", () => {
    toggleLeg2Fields(index);
    updateAvgRestrictions(index);
  });
  
  // Event listeners para Order Type
  const orderType1 = document.getElementById(`orderType1-${index}`);
  const orderType2 = document.getElementById(`orderType2-${index}`);

  if (orderType1) {
    orderType1.addEventListener("change", () => {
      console.log(`🔄 OrderType1 changed to: ${orderType1.value}`);
      toggleOrderTypeFields(index, 1);
    });
    console.log(`✅ OrderType1 listener added for trade ${index}`);
  }

  if (orderType2) {
    orderType2.addEventListener("change", () => {
      console.log(`🔄 OrderType2 changed to: ${orderType2.value}`);
      toggleOrderTypeFields(index, 2);
    });
    console.log(`✅ OrderType2 listener added for trade ${index}`);
  }
  
  const start1 = document.getElementById(`startDate-${index}`);
  const end1 = document.getElementById(`endDate-${index}`);
  const start2 = document.getElementById(`startDate2-${index}`);
  const end2 = document.getElementById(`endDate2-${index}`);
  if (start1)
    start1.addEventListener("change", () => updateEndDateMin(index, 1));
  if (start2)
    start2.addEventListener("change", () => updateEndDateMin(index, 2));
  if (end1) end1.addEventListener("change", () => updateAvgRestrictions(index));
  if (end2) end2.addEventListener("change", () => updateAvgRestrictions(index));
  
  const year1 = document.getElementById(`year1-${index}`);
  const year2 = document.getElementById(`year2-${index}`);
  if (year1)
    year1.addEventListener("change", () => {
      updateMonthOptions(index, 1);
      updateAvgRestrictions(index);
    });
  if (year2)
    year2.addEventListener("change", () => {
      updateMonthOptions(index, 2);
      updateAvgRestrictions(index);
    });
    
  // Inicializar campos corretamente
  toggleLeg1Fields(index);
  toggleLeg2Fields(index);
  
  // Inicializar Order Type fields se Fix estiver selecionado
  setTimeout(() => {
    const type1 = document.getElementById(`type1-${index}`)?.value;
    const type2 = document.getElementById(`type2-${index}`)?.value;
    
    if (type1 === "Fix") {
      toggleOrderTypeFields(index, 1);
    }
    if (type2 === "Fix") {
      toggleOrderTypeFields(index, 2);
    }
  }, 100);
  
  document.querySelectorAll(`input[name='side1-${index}']`).forEach((r) => {
    r.addEventListener("change", () => syncLegSides(index, 1));
  });
  document.querySelectorAll(`input[name='side2-${index}']`).forEach((r) => {
    r.addEventListener("change", () => syncLegSides(index, 2));
  });
  syncLegSides(index);

  renumberTrades();
}

function clearTrade(index) {
  const inputs = document.querySelectorAll(
    `#trade-${index} input, #trade-${index} select`,
  );
  inputs.forEach((input) => {
    if (input.type === "radio") input.checked = input.defaultChecked;
    else if (input.type === "checkbox") input.checked = false;
    else input.value = input.defaultValue;
  });
  document.getElementById(`output-${index}`).textContent = "";
  updateFinalOutput();
  syncLegSides(index);
}

function removeTrade(index) {
  console.log(`🗑️ Tentando remover trade ${index}`);
  
  // Usar confirm nativo do JavaScript
  const confirmed = confirm("Remove this trade?");
  if (!confirmed) {
    console.log("❌ Remoção cancelada pelo usuário");
    return;
  }
  
  const trade = document.getElementById(`trade-${index}`);
  if (trade) {
    console.log(`✅ Removendo trade ${index}`);
    trade.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => {
      trade.remove();
      updateFinalOutput();
      renumberTrades();
      console.log(`🗑️ Trade ${index} removido`);
    }, 300);
  } else {
    console.log(`⚠️ Trade ${index} não encontrado para remoção`);
  }
}

function updateFinalOutput() {
  const allOutputs = document.querySelectorAll("[id^='output-']");
  const lines = Array.from(allOutputs)
    .map((el) => el.textContent.trim())
    .filter((t) => t);
  
  const company = document.querySelector("input[name='company']:checked")?.value;
  
  if (company && lines.length) {
    lines.unshift(`For ${company} Account -`);
  }
  
  document.getElementById("final-output").value = lines.join("\n");
}

function syncLegSides(index, changedLeg) {
  const leg1 = document.querySelector(`input[name='side1-${index}']:checked`);
  const leg2 = document.querySelector(`input[name='side2-${index}']:checked`);
  if (!leg1 || !leg2) return;

  if (changedLeg === 1) {
    const opposite = leg1.value === "buy" ? "sell" : "buy";
    const other = document.querySelector(
      `input[name='side2-${index}'][value='${opposite}']`,
    );
    if (other) other.checked = true;
  } else if (changedLeg === 2) {
    const opposite = leg2.value === "buy" ? "sell" : "buy";
    const other = document.querySelector(
      `input[name='side1-${index}'][value='${opposite}']`,
    );
    if (other) other.checked = true;
  } else {
    const opposite = leg1.value === "buy" ? "sell" : "buy";
    const other = document.querySelector(
      `input[name='side2-${index}'][value='${opposite}']`,
    );
    if (other) other.checked = true;
  }
}

function renumberTrades() {
  document.querySelectorAll(".trade-title").forEach((el, i) => {
    el.textContent = `Trade ${i + 1}`;
  });
}

function setMinDates(index) {
  const today = new Date().toISOString().split("T")[0];
  const inputs = [
    `startDate-${index}`,
    `endDate-${index}`,
    `startDate2-${index}`,
    `endDate2-${index}`,
    `fixDate1-${index}`,
    `fixDate-${index}`,
  ];
  inputs.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.min = today;
  });
}

function updateEndDateMin(index, leg) {
  const startId = leg === 1 ? `startDate-${index}` : `startDate2-${index}`;
  const endId = leg === 1 ? `endDate-${index}` : `endDate2-${index}`;
  const start = document.getElementById(startId);
  const end = document.getElementById(endId);
  if (start && end && start.value) {
    const d = new Date(start.value);
    d.setDate(d.getDate() + 1);
    end.min = d.toISOString().split("T")[0];
  }
}

function updateMonthOptions(index, leg) {
  const monthId = leg === 1 ? `month1-${index}` : `month2-${index}`;
  const yearId = leg === 1 ? `year1-${index}` : `year2-${index}`;
  const monthSelect = document.getElementById(monthId);
  const yearSelect = document.getElementById(yearId);

  if (!monthSelect || !yearSelect) return;

  const selectedYear = parseInt(yearSelect.value);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  monthSelect.innerHTML = "";

  monthNames.forEach((month, i) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    if (selectedYear === currentYear && i < currentMonth) {
      option.hidden = true;
    }
    monthSelect.appendChild(option);
  });

  const firstVisible = Array.from(monthSelect.options).findIndex(
    (opt) => !opt.hidden,
  );
  if (firstVisible >= 0) {
    monthSelect.selectedIndex = firstVisible;
  }
}

function updateAvgRestrictions(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2 = document.getElementById(`type2-${index}`)?.value;

  if (type1 === "AVG" && type2 === "AVGInter") {
    const end = document.getElementById(`endDate2-${index}`)?.value;
    const monthSelect = document.getElementById(`month1-${index}`);
    if (end && monthSelect) {
      const endMonth = new Date(end).getMonth();
      Array.from(monthSelect.options).forEach((opt, i) => {
        opt.disabled = i < endMonth;
      });
    }
  } else if (type2 === "AVG" && type1 === "AVGInter") {
    const end = document.getElementById(`endDate-${index}`)?.value;
    const monthSelect = document.getElementById(`month2-${index}`);
    if (end && monthSelect) {
      const endMonth = new Date(end).getMonth();
      Array.from(monthSelect.options).forEach((opt, i) => {
        opt.disabled = i < endMonth;
      });
    }
  }
}

function generateAll() {
  for (let i = 0; i < nextIndex; i++) {
    if (document.getElementById(`trade-${i}`)) {
      generateRequest(i);
    }
  }
  updateFinalOutput();
}

async function copyAll() {
  const textarea = document.getElementById("final-output");
  const text = textarea.value.trim();
  if (!text) {
    alert("Nothing to copy.");
    textarea.focus();
    return;
  }

  const fallbackCopy = () => {
    const temp = document.createElement("textarea");
    temp.value = text;
    // Avoid scrolling to bottom on iOS
    temp.style.position = "fixed";
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    let successful = false;
    try {
      successful = document.execCommand("copy");
    } catch (err) {
      console.error("Fallback copy failed:", err);
    }
    document.body.removeChild(temp);
    return successful;
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard");
      return;
    } catch (err) {
      console.warn("Clipboard API failed, falling back:", err);
    }
  }

  if (fallbackCopy()) {
    alert("Copied to clipboard");
  } else {
    alert("Failed to copy text");
  }
}

function shareWhatsApp() {
  const textarea = document.getElementById("final-output");
  const text = textarea.value.trim();
  if (!text) {
    alert("Nothing to share.");
    textarea.focus();
    return;
  }
  const url = "https://wa.me/?text=" + encodeURIComponent(text);
  window.open(url, "_blank");
}

function sendEmail() {
  const textarea = document.getElementById("final-output");
  const text = textarea.value.trim();
  if (!text) {
    alert("Nothing to send.");
    textarea.focus();
    return;
  }

  const company = document.querySelector("input[name='company']:checked")?.value;
  
  // Remover o cabeçalho da empresa do texto original se existir
  let cleanText = text;
  if (company) {
    const companyHeaders = [
      "For Alcast Brasil Account -",
      "For Alcast Trading Account -"
    ];
    
    companyHeaders.forEach(header => {
      if (cleanText.startsWith(header)) {
        cleanText = cleanText.substring(header.length).trim();
      }
    });
  }

  // Criar a mensagem do e-mail
  let emailSubject = "LME Trade Request";
  let emailBody = "";
  
  if (company) {
    emailSubject = `LME Trade Request - ${company}`;
    emailBody = `For ${company} Account – please quote the following trade request:\n\n`;
  } else {
    emailBody = "Please quote the following trade request:\n\n";
  }
  
  emailBody += cleanText;
  emailBody += "\n\nPlease respond within 5 minutes.\n\nBest regards";

  // Criar o link mailto
  const recipient = "hamburgdesk@StoneX.com";
  const ccRecipients = [
    "paula.didiego@fazcapital.com.br",
    "andrei@previsecp.com",
    "brian.johnson@previsecp.com"
  ].join(",");
  const mailtoLink = `mailto:${recipient}?cc=${encodeURIComponent(ccRecipients)}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  
  // Abrir o cliente de e-mail
  window.location.href = mailtoLink;
}

function openHelp() {
  const modal = document.getElementById("help-modal");
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
}

function closeHelp() {
  const modal = document.getElementById("help-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
  }
}

// Debug function
function debugSystem() {
  console.log("🔍 Debug completo do sistema:");
  
  // Verificar estrutura básica
  console.log(`📊 nextIndex: ${nextIndex}`);
  console.log(`📋 lmeHolidays:`, Object.keys(lmeHolidays).length > 0 ? "✅ Carregado" : "❌ Vazio");
  
  // Verificar elementos DOM essenciais
  const tradesContainer = document.getElementById("trades");
  const finalOutput = document.getElementById("final-output");
  const template = document.getElementById("trade-template");
  
  console.log("🎯 Elementos DOM:", {
    tradesContainer: tradesContainer ? "✅" : "❌",
    finalOutput: finalOutput ? "✅" : "❌", 
    template: template ? "✅" : "❌"
  });
  
  // Verificar modal
  const modal = document.getElementById("confirmation-modal");
  const text = document.getElementById("confirmation-text");
  const okBtn = document.getElementById("confirmation-ok");
  const cancelBtn = document.getElementById("confirmation-cancel");
  
  console.log("📋 Modal elements:", {
    modal: modal ? "✅" : "❌",
    text: text ? "✅" : "❌",
    okBtn: okBtn ? "✅" : "❌",
    cancelBtn: cancelBtn ? "✅" : "❌"
  });
  
  // Verificar trades existentes
  const trades = document.querySelectorAll('[id^="trade-"]');
  console.log(`📋 Trades encontrados: ${trades.length}`);
  
  if (trades.length === 0) {
    console.log("⚠️ Nenhum trade encontrado - tentando adicionar um...");
    addTrade();
  }
  
  return {
    nextIndex,
    tradesCount: trades.length,
    modalExists: !!modal,
    finalOutputExists: !!finalOutput
  };
}

window.debugSystem = debugSystem;

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .catch((err) => console.error("Service Worker registration failed:", err));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseInputDate,
    getSecondBusinessDay,
    getLastBusinessDay,
    getFixPpt,
    generateRequest,
    toggleLeg1Fields,
    toggleLeg2Fields,
    syncLegSides,
    addTrade,
    clearTrade,
    removeTrade,
    generateAll,
    copyAll,
    shareWhatsApp,
    sendEmail,
    openHelp,
    closeHelp,
    buildConfirmationText,
    showConfirmationPopup,
    closeConfirmationPopup,
    confirmModal,
    openConfirmModal,
    setMinDates,
    updateEndDateMin,
    updateMonthOptions,
    updateAvgRestrictions,
  };
}
