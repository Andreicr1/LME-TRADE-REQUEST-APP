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

  tradesContainer.appendChild(div);

  requestAnimationFrame(() => div.classList.remove("opacity-0"));

  const currentYear = new Date().getFullYear();
  populateYearOptions(`year1-${index}`, currentYear, 3);
  populateYearOptions(`year2-${index}`, currentYear, 3);

  toggleLeg1Fields(index);
  toggleLeg2Fields(index);

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
}

// Função para atualizar saída final
function updateFinalOutput() {
  const allOutputs = document.querySelectorAll("[id^='output-']");
  const lines = Array.from(allOutputs)
    .map((el) => el.textContent.trim())
    .filter((t) => t);

  const company = document.querySelector("input[name='company']:checked")?.value;

  if (company && lines.length) {
    lines.unshift(`${company} Execution Instruction`);
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

module.exports = {
  loadHolidayData,
  addTrade,
  populateYearOptions,
  toggleLeg1Fields,
  toggleLeg2Fields,
  updateFinalOutput,
  copyAll,
  sendEmail
};
