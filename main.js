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
    const useSamePPT1 = document.getElementById(`samePpt1-${index}`)?.checked;
    const useSamePPT2 = document.getElementById(`samePpt2-${index}`)?.checked;
    // Determine which leg is averaging to compute its PPT
    let avgMonth, avgYear;
    if (leg1Type.startsWith("AVG")) {
      avgMonth = month;
      avgYear = year;
    } else if (leg2Type.startsWith("AVG")) {
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
    const showPptAvg =
      (leg2Type === "Fix" && dateFix2Raw && !useSamePPT2) ||
      (leg1Type === "Fix" && dateFix1Raw && !useSamePPT1);
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
      if (showPptAvg) leg1 += ` ppt ${pptDateAVG}`;
    } else if (leg1Type === "Fix" && leg2Type === "AVG") {
      if (useSamePPT1) {
        leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
      } else {
        if (!dateFix1Raw) throw new Error("Please provide a fixing date.");
        const d = parseDate(dateFix1);
        if (!d) throw new Error("Fixing date is invalid.");
        if (lastBizDate && d > lastBizDate)
          throw new Error(`Fixing date must be on or before ${lastBizDay}.`);
        leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ${dateFix1}, ppt ${pptDateAVG}`;
      }
    } else {
      let pptFixLeg1;
      if (useSamePPT1) {
        leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
      } else {
        try {
          pptFixLeg1 = getFixPpt(dateFix1);
        } catch (err) {
          err.fixInputId = `fixDate1-${index}`;
          throw err;
        }
        leg1 = `${capitalize(leg1Side)} ${q} mt Al USD ppt ${pptFixLeg1}`;
      }
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
      if (showPptAvg) leg2 += ` ppt ${pptDateAVG}`;
    } else if (leg2Type === "Fix" && leg1Type === "AVG") {
      if (useSamePPT2) {
        leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
      } else {
        if (!dateFix2Raw) throw new Error("Please provide a fixing date.");
        const d = parseDate(dateFix2);
        if (!d) throw new Error("Fixing date is invalid.");
        if (lastBizDate && d > lastBizDate)
          throw new Error(`Fixing date must be on or before ${lastBizDay}.`);
        leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ${dateFix2}, ppt ${pptDateAVG}`;
      }
    } else if (leg2Type === "Fix") {
      let pptFix;
      if (useSamePPT2) {
        leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${pptDateAVG}`;
      } else {
        try {
          pptFix = getFixPpt(dateFix2);
        } catch (err) {
          err.fixInputId = `fixDate-${index}`;
          throw err;
        }
        leg2 = `${capitalize(leg2Side)} ${q} mt Al USD ppt ${pptFix}`;
      }
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

    const result = `LME Request: ${leg1} and ${leg2} against`;
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
  const finalOutput = Array.from(allOutputs)
    .map((el) => el.textContent.trim())
    .filter((t) => t)
    .join("\n");
  document.getElementById("final-output").value = finalOutput;
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
  const samePpt = document.getElementById(`samePpt1-${index}`);
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

  if (samePpt && samePpt.parentElement) {
    const showChk = val === "Fix" && type2 === "AVG";
    samePpt.parentElement.style.display = showChk ? "" : "none";
    if (!showChk) samePpt.checked = false;
    if (showChk && samePpt.checked) {
      const month = document.getElementById(`month2-${index}`).value;
      const year = parseInt(document.getElementById(`year2-${index}`).value);
      const monthIdx = new Date(`${month} 1, ${year}`).getMonth();
      const lastStr = getLastBusinessDay(year, monthIdx);
      const date = parseDate(lastStr);
      if (fixInput) fixInput.value = date.toISOString().split("T")[0];
    }
  }
}

function toggleLeg2Fields(index) {
  const type1 = document.getElementById(`type1-${index}`)?.value;
  const type2Sel = document.getElementById(`type2-${index}`);
  const fixInput = document.getElementById(`fixDate-${index}`);
  const samePpt = document.getElementById(`samePpt2-${index}`);
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
    if (type2 !== "Fix" && type2 !== "C2R") fixInput.value = "";
  }

  if (samePpt && samePpt.parentElement) {
    const showChk = type1 === "AVG" && type2 === "Fix";
    samePpt.parentElement.style.display = showChk ? "" : "none";
    if (!showChk) samePpt.checked = false;

    if (showChk && samePpt.checked) {
      const avgLeg = type1 === "AVG" ? 1 : 2;
      const month = document.getElementById(`month${avgLeg}-${index}`).value;
      const year = parseInt(
        document.getElementById(`year${avgLeg}-${index}`).value,
      );
      const monthIdx = new Date(`${month} 1, ${year}`).getMonth();
      const lastStr = getLastBusinessDay(year, monthIdx);
      const date = parseDate(lastStr);
      if (fixInput) fixInput.value = date.toISOString().split("T")[0];
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

function buildConfirmationText(index) {
  const qtyInput = document.getElementById(`qty-${index}`);
  const q = parseFloat(qtyInput.value);
  if (!isFinite(q) || q <= 0) throw new Error("Quantidade inválida.");

  const side1 = document.querySelector(
    `input[name='side1-${index}']:checked`,
  ).value;
  const side2 = document.querySelector(
    `input[name='side2-${index}']:checked`,
  ).value;
  const type1 = document.getElementById(`type1-${index}`)?.value || "AVG";
  const type2 = document.getElementById(`type2-${index}`)?.value || "AVG";

  const month1 = document.getElementById(`month1-${index}`)?.value;
  const year1 = parseInt(document.getElementById(`year1-${index}`)?.value);
  const month2 = document.getElementById(`month2-${index}`)?.value;
  const year2 = parseInt(document.getElementById(`year2-${index}`)?.value);
  const sDate1 = document.getElementById(`startDate-${index}`)?.value;
  const eDate1 = document.getElementById(`endDate-${index}`)?.value;
  const sDate2 = document.getElementById(`startDate2-${index}`)?.value;
  const eDate2 = document.getElementById(`endDate2-${index}`)?.value;
  const fix1Raw = document.getElementById(`fixDate1-${index}`)?.value || "";
  const fix2Raw = document.getElementById(`fixDate-${index}`)?.value || "";

  const fix1 = fix1Raw ? formatDate(parseInputDate(fix1Raw)) : "";
  const fix2 = fix2Raw ? formatDate(parseInputDate(fix2Raw)) : "";

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

  const monthPt = (m) => {
    const idx = monthNames.indexOf(m);
    return idx >= 0 ? monthsPt[idx] : m;
  };

  const gerund = (s) => (s === "buy" ? "comprando" : "vendendo");

  const detail = (type, opts) => {
    switch (type) {
      case "AVG":
        return `a média dos preços diários do alumínio no mês de ${monthPt(opts.month)} de ${opts.year}`;
      case "AVGInter":
        return `a média dos preços de alumínio entre os dias ${formatDate(parseInputDate(opts.start))} e ${formatDate(parseInputDate(opts.end))}`;
      case "Fix":
        return `com preço fixado em ${opts.fix}`;
      case "C2R":
        return `no contrato C2R com fixing em ${opts.fix}`;
      default:
        return "";
    }
  };

  const part1 = `${gerund(side1)} ${q} toneladas de alumínio ${detail(type1, {
    month: month1,
    year: year1,
    start: sDate1,
    end: eDate1,
    fix: fix1,
  })}`;
  const part2 = `${gerund(side2)} ${detail(type2, {
    month: month2,
    year: year2,
    start: sDate2,
    end: eDate2,
    fix: fix2,
  })}`;

  let ppt = "";
  let avgMonth, avgYear;
  if (type1.startsWith("AVG")) {
    avgMonth = month1;
    avgYear = year1;
  } else if (type2.startsWith("AVG")) {
    avgMonth = month2;
    avgYear = year2;
  }
  if (avgMonth) {
    const idx = new Date(`${avgMonth} 1, ${avgYear}`).getMonth();
    ppt = getSecondBusinessDay(avgYear, idx);
  } else if (fix1Raw) {
    ppt = getFixPpt(fix1 ? fix1 : "");
  } else if (fix2Raw) {
    ppt = getFixPpt(fix2 ? fix2 : "");
  }

  return `Você está ${part1} e ${part2}.$${ppt ? ` A liquidação financeira será em ${ppt}.` : ""}`.replace(
    "$",
    "",
  );
}

let pendingIndex = null;

function openConfirmModal(index) {
  try {
    const text = buildConfirmationText(index);
    const modal = document.getElementById("confirm-modal");
    const msg = document.getElementById("confirm-text");
    if (msg) msg.textContent = text;
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("block");
    }
    pendingIndex = index;
  } catch (err) {
    const out = document.getElementById(`output-${index}`);
    if (out) out.textContent = err.message;
  }
}

function closeConfirmModal() {
  const modal = document.getElementById("confirm-modal");
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("block");
  }
  pendingIndex = null;
}

function confirmModal() {
  if (pendingIndex !== null) {
    generateRequest(pendingIndex);
  }
  closeConfirmModal();
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
  document
    .getElementById(`samePpt1-${index}`)
    .addEventListener("change", () => toggleLeg1Fields(index));
  document
    .getElementById(`samePpt2-${index}`)
    .addEventListener("change", () => toggleLeg2Fields(index));
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
    year1.addEventListener("change", () => updateAvgRestrictions(index));
  if (year2)
    year2.addEventListener("change", () => updateAvgRestrictions(index));
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
    const ok = document.getElementById("confirm-ok");
    const cancel = document.getElementById("confirm-cancel");
    if (ok) ok.addEventListener("click", confirmModal);
    if (cancel) cancel.addEventListener("click", closeConfirmModal);
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
    openConfirmModal,
    closeConfirmModal,
    confirmModal,
    setMinDates,
    updateEndDateMin,
    updateAvgRestrictions,
  };
}
