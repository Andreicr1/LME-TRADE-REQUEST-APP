let lmeHolidays = {};

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

// Keeps track of the next trade index to ensure unique IDs
let nextIndex = 0;

function getCalendarType() {
  const sel = document.getElementById("calendarType");
  return sel ? sel.value : "gregorian";
}

function formatDate(date) {
  return calendarUtils.formatDate(date, getCalendarType());
}

function parseDate(str) {
  return calendarUtils.parseDate(str, getCalendarType());
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
  const holidays = lmeHolidays[year] || [];
  // start from the first day of the month following the reference month
  let date = new Date(year, month + 1, 1);
  let count = 0;
  while (count < 2) {
    const isoDate = date.toISOString().split("T")[0];
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidays.includes(isoDate)) count++;
    if (count < 2) date.setDate(date.getDate() + 1);
  }
  return formatDate(date);
}

/**
 * Computes the payment prompt date (PPT) for a given fixing date.
 *
 * The PPT is two business days after the fixing date and skips weekends and
 * holidays defined in `lmeHolidays`.
 *
 * @param {string} dateFix - Fixing date in formatted string form.
 * @returns {string} Formatted PPT date.
 * @throws {Error} If the fixing date is missing or invalid.
 */
function getFixPpt(dateFix) {
  if (!dateFix) throw new Error("Please provide a fixing date.");
  const date = parseDate(dateFix);
  if (!date) throw new Error("Fixing date is invalid.");
  const holidays = lmeHolidays[date.getFullYear()] || [];
  let count = 0;
  while (count < 2) {
    date.setDate(date.getDate() + 1);
    const isoDate = date.toISOString().split("T")[0];
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidays.includes(isoDate)) count++;
  }
  return formatDate(date);
}

/**
 * Determines the last business day of a given month.
 *
 * @param {number} year - Four digit year.
 * @param {number} month - Zero‑based month.
 * @returns {string} Formatted date string for the last business day.
 */
function getLastBusinessDay(year, month) {
  const holidays = lmeHolidays[year] || [];
  let date = new Date(year, month + 1, 0); // last day of month
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const isoDate = date.toISOString().split("T")[0];
    const day = date.getDay();
    if (day !== 0 && day !== 6 && !holidays.includes(isoDate)) break;
    date.setDate(date.getDate() - 1);
  }
  return formatDate(date);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function populateYearOptions(selectId, start, count) {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const year = start + i;
    const opt = document.createElement("option");
    opt.value = year;
    opt.textContent = year;
    select.appendChild(opt);
  }
}

/**
 * Converts an ISO date string in the form `yyyy-mm-dd` into a `Date` object.
 *
 * @param {string} value - The value from a `<input type="date">` field.
 * @returns {Date|null} Parsed `Date` instance or `null` for invalid input.
 */
function parseInputDate(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

const monthNames = [
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

function updateMonthOptions(index, leg) {
  const monthSel = document.getElementById(`month${leg}-${index}`);
  const yearSel = document.getElementById(`year${leg}-${index}`);
  if (!monthSel || !yearSel) return;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const selectedYear = parseInt(yearSel.value, 10);
  const prev = monthSel.value;

  Array.from(monthSel.options).forEach((opt, idx) => {
    if (selectedYear === currentYear) {
      opt.hidden = idx < currentMonth;
    } else {
      opt.hidden = false;
    }
  });

  const valid = Array.from(monthSel.options).find(
    (o) => !o.hidden && o.value === prev,
  );
  if (valid) {
    monthSel.value = valid.value;
  } else {
    for (const opt of monthSel.options) {
      if (!opt.hidden) {
        monthSel.value = opt.value;
        break;
      }
    }
  }
}

function setMinDates(index) {
  const today = new Date().toISOString().split("T")[0];
  [
    `fixDate1-${index}`,
    `fixDate-${index}`,
    `startDate-${index}`,
    `endDate-${index}`,
    `startDate2-${index}`,
    `endDate2-${index}`,
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.min = today;
  });
}

function updateEndDateMin(index, leg) {
  const start = document.getElementById(
    `startDate${leg === 2 ? 2 : ""}-${index}`,
  );
  const end = document.getElementById(`endDate${leg === 2 ? 2 : ""}-${index}`);
  if (!start || !end) return;
  const d = parseInputDate(start.value);
  if (!d) return;
  d.setDate(d.getDate() + 1);
  end.min = d.toISOString().split("T")[0];
}

function clearMonthYearRestrictions(index, leg) {
  const monthSel = document.getElementById(`month${leg}-${index}`);
  const yearSel = document.getElementById(`year${leg}-${index}`);
  if (!monthSel || !yearSel) return;
  Array.from(monthSel.options).forEach((o) => (o.disabled = false));
  Array.from(yearSel.options).forEach((o) => (o.disabled = false));
}

function updateAvgRestrictions(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2 = document.getElementById(`type2-${index}`)?.value;
  let interLeg, avgLeg;
  if (type1 === "AVGInter" && type2 === "AVG") {
    interLeg = 1;
    avgLeg = 2;
  } else if (type2 === "AVGInter" && type1 === "AVG") {
    interLeg = 2;
    avgLeg = 1;
  } else {
    clearMonthYearRestrictions(index, 1);
    clearMonthYearRestrictions(index, 2);
    return;
  }

  const end = document.getElementById(
    `endDate${interLeg === 2 ? 2 : ""}-${index}`,
  );
  const monthSel = document.getElementById(`month${avgLeg}-${index}`);
  const yearSel = document.getElementById(`year${avgLeg}-${index}`);
  if (!end || !monthSel || !yearSel) return;
  const endDate = parseInputDate(end.value);
  if (!endDate) return;

  const limitYear = endDate.getFullYear();
  const limitMonth = endDate.getMonth();

  Array.from(yearSel.options).forEach((o) => {
    const yr = parseInt(o.value, 10);
    o.disabled = yr < limitYear;
  });

  if (parseInt(yearSel.value, 10) < limitYear)
    yearSel.value = String(limitYear);

  const selectedYear = parseInt(yearSel.value, 10);
  Array.from(monthSel.options).forEach((o, idx) => {
    o.disabled = selectedYear === limitYear && idx < limitMonth;
  });

  const currentIdx = monthNames.indexOf(monthSel.value);
  if (currentIdx < 0 || monthSel.options[currentIdx].disabled) {
    for (let i = limitMonth; i < monthSel.options.length; i++) {
      if (!monthSel.options[i].disabled) {
        monthSel.value = monthNames[i];
        break;
      }
    }
  }
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
    const showPptAvgFix =
      (leg2Type === "Fix" && dateFix2Raw && !fixInput.readOnly) ||
      (leg1Type === "Fix" && dateFix1Raw && !(fixInputLeg1 && fixInputLeg1.readOnly));
    const showPptAvgInter =
      (leg1Type === "AVGInter" && leg2Type === "AVG") ||
      (leg2Type === "AVGInter" && leg1Type === "AVG");
    const showPptAvg = showPptAvgFix || showPptAvgInter;
    if (leg1Type === "AVG") {
      leg1 = `${capitalize(leg1Side)} ${q} mt Al AVG ${month} ${year}`;
      leg1 += " Flat";
    } else if (leg1Type === "AVGInter") {
      const start = parseInputDate(startDateRaw);
      const end = parseInputDate(endDateRaw);
      if (!start || !end)
        throw new Error("Start and end dates are required for AVG Period.");
      const startStr = formatDate(start);
      const endStr = formatDate(end);
      leg1 = `${capitalize(leg1Side)} ${q} mt Al Fixing AVG ${startStr} to ${endStr}`;
      if (showPptAvg) leg1 += `${showPptAvgInter ? "," : ""} ppt ${pptDateAVG}`;
    } else if (leg1Type === "Fix" && leg2Type === "AVG") {
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
    } else if (leg1Type === "Fix" && leg2Type === "AVGInter") {
      const end = parseInputDate(document.getElementById(`endDate2-${index}`)?.value || "");
      if (!end) throw new Error("End date is required for AVG Period.");
      const ppt = getFixPpt(formatDate(end));
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ppt ${ppt}`;
    } else if (leg1Type === "Fix") {
      if (!dateFix1Raw) throw new Error("Please provide a fixing date.");
      let pptFixLeg1;
      try {
        pptFixLeg1 = getFixPpt(dateFix1);
      } catch (err) {
        err.fixInputId = `fixDate1-${index}`;
        throw err;
      }
      leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ${dateFix1}, ppt ${pptFixLeg1}`;
    } else {
      leg1 = `${capitalize(leg1Side)} ${q} mt Al ${leg1Type}`;
    }
    let leg2;
    if (leg2Type === "AVG") {
      leg2 = `${capitalize(leg2Side)} ${q} mt Al AVG ${month2} ${year2}`;
      leg2 += " Flat";
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
      if (showPptAvg) leg2 += `${showPptAvgInter ? "," : ""} ppt ${pptDateAVG}`;
    } else if (leg2Type === "Fix" && leg1Type === "AVG") {
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
    } else if (leg2Type === "Fix" && leg1Type === "AVGInter") {
      const end = parseInputDate(document.getElementById(`endDate-${index}`)?.value || "");
      if (!end) throw new Error("End date is required for AVG Period.");
      const ppt = getFixPpt(formatDate(end));
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${ppt}`;
    } else if (leg2Type === "Fix") {
      if (!dateFix2Raw) throw new Error("Please provide a fixing date.");
      let pptFix;
      try {
        pptFix = getFixPpt(dateFix2);
      } catch (err) {
        err.fixInputId = `fixDate-${index}`;
        throw err;
      }
      leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ${dateFix2}, ppt ${pptFix}`;
    } else if (leg2Type === "C2R") {
      let pptFix;
      try {
        pptFix = getFixPpt(dateFix2);
      } catch (err) {
        err.fixInputId = `fixDate-${index}`;
        throw err;
      }
      leg2 = `${capitalize(leg2Side)} ${q} mt Al C2R ${dateFix2} ppt ${pptFix}`;
    }

    const fixTypes = ["Fix", "C2R"];
    const avgTypes = ["AVG", "AVGInter", "AVGPeriod"];
    let firstLeg = leg1;
    let secondLeg = leg2;
    if (
      fixTypes.includes(leg2Type) &&
      avgTypes.includes(leg1Type) &&
      !fixTypes.includes(leg1Type)
    ) {
      firstLeg = leg2;
      secondLeg = leg1;
    }

    const result = `LME Request: ${firstLeg} and ${secondLeg} against`;
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
  if (!confirm("Remove this trade?")) return;
  const trade = document.getElementById(`trade-${index}`);
  if (trade) {
    trade.classList.add("opacity-0", "transition-opacity", "duration-300");
    setTimeout(() => {
      trade.remove();
      updateFinalOutput();
      renumberTrades();
    }, 300);
  }
}

function renumberTrades() {
  document.querySelectorAll(".trade-title").forEach((el, i) => {
    el.textContent = `Trade ${i + 1}`;
  });
}

function updateFinalOutput() {
  const allOutputs = document.querySelectorAll("[id^='output-']");
  const lines = Array.from(allOutputs)
    .map((el) => el.textContent.trim())
    .filter((t) => t);
  const company = document.querySelector("input[name='company']:checked")?.value;
  if (company && lines.length) lines.unshift(`${company} Request`);
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

/**
 * Shows or hides Leg&nbsp;1 fields based on the selected pricing type and
 * optionally populates the fixing date when using the averaging PPT.
 *
 * @param {number} index - Trade block index to update.
 */
function toggleLeg1Fields(index) {
  const typeSel = document.getElementById(`type1-${index}`);
  const type2 = document.getElementById(`type2-${index}`)?.value;
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
}

function toggleLeg2Fields(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2Sel = document.getElementById(`type2-${index}`);
  const fixInput = document.getElementById(`fixDate-${index}`);
  const monthWrap = document.getElementById(`avgFields2-${index}`);
  const startInput = document.getElementById(`startDate2-${index}`);
  const endInput = document.getElementById(`endDate2-${index}`);
  if (!type2Sel) return;

  const type2 = type2Sel.value;

  if (monthWrap) monthWrap.style.display = type2 === "AVG" ? "" : "none";
  if (startInput && startInput.parentElement)
    startInput.parentElement.style.display = type2 === "AVGInter" ? "" : "none";
  if (endInput && endInput.parentElement)
    endInput.parentElement.style.display = type2 === "AVGInter" ? "" : "none";

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

function readableLeg(type, qty, start, end, month, year, fix) {
  switch (type) {
    case "Fix":
      if (fix) {
        return `${qty} toneladas de Al com preço fixado em ${formatDate(
          parseInputDate(fix),
        )}`;
      }
      return `${qty} toneladas de Al com preço fixado`;
    case "C2R":
      return `${qty} toneladas de Al com preço fixo em dinheiro`;
    case "AVG":
      return `${qty} toneladas de Al pela média de ${monthNamePt(month).toLowerCase()}/${year}`;
    case "AVGInter":
    case "AVGPeriod":
      return `${qty} toneladas de Al fixando a média de ${formatDate(parseInputDate(start))} a ${formatDate(parseInputDate(end))}`;
    default:
      return "";
  }
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

  const leg1 = readableLeg(type1, qty, start1, end1, month1, year1, fix1);
  const leg2 = readableLeg(type2, qty, start2, end2, month2, year2, fix2);

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

  if (fixTypes.includes(secondType) && !fixTypes.includes(firstType)) {
    return `Você está ${firstSide} ${firstLeg}, e ${secondSide} ${secondLeg}, ppt ${pptDate}. Confirma?`;
  }

  return `Você está ${firstSide} ${firstLeg}, ppt ${pptDate}, e ${secondSide} ${secondLeg}. Confirma?`;
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
  };

  return generateConfirmationMessage(trade);
}

let confirmCallback = null;
let activeTradeIndex = null;

function showConfirmationPopup(text, callback) {
  const modal = document.getElementById("confirmation-modal");
  const msg = document.getElementById("confirmation-text");
  if (msg) msg.textContent = text;
  confirmCallback = callback;
  if (modal) modal.classList.remove("hidden");
}

function closeConfirmationPopup() {
  const modal = document.getElementById("confirmation-modal");
  if (modal) modal.classList.add("hidden");
  confirmCallback = null;
  activeTradeIndex = null;
}

function confirmModal() {
  if (typeof confirmCallback === "function") {
    confirmCallback();
  }
  closeConfirmationPopup();
}

function cancelModal() {
  if (activeTradeIndex !== null) {
    clearTrade(activeTradeIndex);
  }
  closeConfirmationPopup();
}

function openConfirmModal(index) {
  try {
    const text = buildConfirmationText(index);
    activeTradeIndex = index;
    showConfirmationPopup(text, () => generateRequest(index));
  } catch (err) {
    const out = document.getElementById(`output-${index}`);
    if (out) out.textContent = err.message;
  }
}

/**
 * Clones the trade template and inserts a new trade block into the page.
 *
 * Event listeners are attached to the newly created elements and default
 * values for year selections and date restrictions are applied.
 */
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
  document.getElementById(`type1-${index}`).addEventListener("change", () => {
    toggleLeg1Fields(index);
    toggleLeg2Fields(index);
    updateAvgRestrictions(index);
  });
  document.getElementById(`type2-${index}`).addEventListener("change", () => {
    toggleLeg2Fields(index);
    updateAvgRestrictions(index);
  });
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
  toggleLeg1Fields(index);
  toggleLeg2Fields(index);
  document.querySelectorAll(`input[name='side1-${index}']`).forEach((r) => {
    r.addEventListener("change", () => syncLegSides(index, 1));
  });
  document.querySelectorAll(`input[name='side2-${index}']`).forEach((r) => {
    r.addEventListener("change", () => syncLegSides(index, 2));
  });
  syncLegSides(index);

  renumberTrades();
}

window.onload = () => {
  loadHolidayData().finally(() => {
    addTrade();
    const ok = document.getElementById("confirmation-ok");
    const cancel = document.getElementById("confirmation-cancel");
    if (ok) ok.addEventListener("click", confirmModal);
    if (cancel) cancel.addEventListener("click", cancelModal);
    document
      .querySelectorAll("input[name='company']")
      .forEach((el) => el.addEventListener("change", updateFinalOutput));
  });
};
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
