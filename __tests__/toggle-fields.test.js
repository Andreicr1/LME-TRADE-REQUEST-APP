/** @jest-environment jsdom */

const calendarUtils = require("../calendar-utils");

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById("calendarType").value = "gregorian";

const {
  toggleLeg1Fields,
  toggleLeg2Fields,
  getLastBusinessDay,
} = require("../main");

beforeEach(() => {
  document.body.innerHTML = `
    <select id="calendarType"></select>
    <select id="type1-0"><option value="">Select</option><option value="AVG">AVG</option><option value="Fix">Fix</option><option value="AVGInter">AVGInter</option><option value="C2R">C2R</option></select>
    <div id="startWrap"><input type="date" id="startDate-0"></div>
    <div id="endWrap"><input type="date" id="endDate-0"></div>
    <div id="fix1Wrap"><input type="date" id="fixDate1-0"></div>
    <select id="type2-0"><option value="">Select</option><option value="AVG">AVG</option><option value="Fix">Fix</option><option value="AVGInter">AVGInter</option><option value="C2R">C2R</option></select>
    <div id="startWrap2"><input type="date" id="startDate2-0"></div>
    <div id="endWrap2"><input type="date" id="endDate2-0"></div>
    <div id="fixWrap"><input type="date" id="fixDate-0"></div>
    <select id="month1-0"><option>January</option></select>
    <select id="year1-0"><option>2025</option></select>
    <select id="month2-0"><option>January</option></select>
    <select id="year2-0"><option>2025</option></select>
  `;
  document.getElementById("calendarType").value = "gregorian";
});

test("Leg1 fix fields toggle with price type", () => {
  document.getElementById("type1-0").value = "Fix";
  toggleLeg1Fields(0);
  expect(
    document.getElementById("fixDate1-0").parentElement.style.display,
  ).toBe("");
  document.getElementById("type1-0").value = "AVG";
  toggleLeg1Fields(0);
  expect(
    document.getElementById("fixDate1-0").parentElement.style.display,
  ).toBe("none");
});

test("Leg2 fields toggle autocompletes fix date", () => {
  document.getElementById("type1-0").value = "AVG";
  document.getElementById("type2-0").value = "Fix";
  toggleLeg1Fields(0);
  toggleLeg2Fields(0);
  const input = document.getElementById("fixDate-0");
  expect(input.parentElement.style.display).toBe("");
  expect(input.readOnly).toBe(true);
  const last = getLastBusinessDay(2025, 0);
  const date = calendarUtils.parseDateGregorian(last);
  expect(input.value).toBe(date.toISOString().split("T")[0]);
});

test("Fix leg gets end date from AVGInter leg1", () => {
  document.getElementById("type1-0").value = "AVGInter";
  document.getElementById("endDate-0").value = "2025-06-15";
  document.getElementById("type2-0").value = "Fix";
  toggleLeg1Fields(0);
  toggleLeg2Fields(0);
  const input = document.getElementById("fixDate-0");
  expect(input.value).toBe("2025-06-15");
});

test("Fix leg1 gets end date from AVGInter leg2", () => {
  document.getElementById("type1-0").value = "Fix";
  document.getElementById("type2-0").value = "AVGInter";
  document.getElementById("endDate2-0").value = "2025-07-20";
  toggleLeg1Fields(0);
  toggleLeg2Fields(0);
  const input = document.getElementById("fixDate1-0");
  expect(input.value).toBe("2025-07-20");
});
