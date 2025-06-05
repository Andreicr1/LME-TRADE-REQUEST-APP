/** @jest-environment jsdom */

const calendarUtils = require("../calendar-utils");

global.calendarUtils = calendarUtils;

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById("calendarType").value = "gregorian";

const {
  toggleLeg1Fields,
  toggleLeg2Fields,
  getSecondBusinessDay,
} = require("../main");

beforeEach(() => {
  document.body.innerHTML = `
    <select id="calendarType"></select>
    <select id="type1-0"><option value="">Select</option><option value="AVG">AVG</option><option value="Fix">Fix</option><option value="AVGInter">AVGInter</option><option value="C2R">C2R</option></select>
    <div id="startWrap"><input type="date" id="startDate-0"></div>
    <div id="endWrap"><input type="date" id="endDate-0"></div>
    <div id="fix1Wrap"><input type="date" id="fixDate1-0"></div>
    <label id="sameWrap1"><input type="checkbox" id="samePpt1-0"></label>
    <select id="type2-0"><option value="">Select</option><option value="AVG">AVG</option><option value="Fix">Fix</option><option value="AVGInter">AVGInter</option><option value="C2R">C2R</option></select>
    <div id="startWrap2"><input type="date" id="startDate2-0"></div>
    <div id="endWrap2"><input type="date" id="endDate2-0"></div>
    <div id="fixWrap"><input type="date" id="fixDate-0"></div>
    <label id="sameWrap2"><input type="checkbox" id="samePpt2-0"></label>
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

test("Leg2 fields toggle and checkbox sets PPT", () => {
  document.getElementById("type1-0").value = "AVG";
  document.getElementById("type2-0").value = "Fix";
  const chk = document.getElementById("samePpt2-0");
  chk.checked = true;
  toggleLeg2Fields(0);
  expect(document.getElementById("fixDate-0").parentElement.style.display).toBe(
    "",
  );
  expect(chk.parentElement.style.display).toBe("");
  const ppt = getSecondBusinessDay(2025, 0);
  const date = calendarUtils.parseDateGregorian(ppt);
  expect(document.getElementById("fixDate-0").value).toBe(
    date.toISOString().split("T")[0],
  );
});
