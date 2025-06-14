/** @jest-environment jsdom */

const calendarUtils = require("../calendar-utils");
global.calendarUtils = calendarUtils;

const {
  getSecondBusinessDay,
  getFixPpt,
  generateRequest,
  toggleLeg1Fields,
  toggleLeg2Fields,
} = require("../main");

document.body.innerHTML = '<select id="calendarType"></select>';
document.getElementById("calendarType").value = "gregorian";

function setupDom() {
  document.body.innerHTML += `
    <input type="radio" name="company" value="Alcast Brasil" checked>
    <input type="radio" name="company" value="Alcast Trading">
    <select id="tradeType-0"><option value="Swap">Swap</option><option value="Forward">Forward</option></select>
    <input type="checkbox" id="syncPpt-0">
    <input id="qty-0" />
    <input type="radio" name="side1-0" value="buy" checked>
    <input type="radio" name="side1-0" value="sell">
    <select id="type1-0"><option value="">Select</option><option value="AVG">AVG</option><option value="AVGInter">AVG Period</option><option value="Fix">Fix</option><option value="C2R">C2R (Cash)</option></select>
    <select id="month1-0"><option>January</option><option>February</option><option>July</option><option>October</option></select>
    <select id="year1-0"><option>2025</option></select>
    <input id="startDate-0" type="date" />
    <input id="endDate-0" type="date" />
    <input id="fixDate1-0" />
    <input id="startDate2-0" type="date" />
    <input id="endDate2-0" type="date" />
    <input type="radio" name="side2-0" value="buy">
    <input type="radio" name="side2-0" value="sell" checked>
    <select id="type2-0"><option value="">Select</option><option value="AVG">AVG</option><option value="AVGInter">AVG Period</option><option value="Fix">Fix</option><option value="C2R">C2R (Cash)</option></select>
    <select id="month2-0"><option>February</option><option>July</option><option>October</option></select>
    <select id="year2-0"><option>2025</option></select>
    <input id="fixDate-0" />
    <p id="output-0"></p>
    <textarea id="final-output"></textarea>
  `;
}

describe("generateRequest", () => {
  beforeEach(() => {
    document.body.innerHTML = '<select id="calendarType"></select>';
    document.getElementById("calendarType").value = "gregorian";
    setupDom();
  });

  test("creates AVG request text", () => {
    document.getElementById("qty-0").value = "10";
    document.getElementById("type2-0").value = "AVG";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Buy 10 mt Al AVG January 2025 Flat and Sell 10 mt Al AVG February 2025 Flat against",
    );
  });

  test("creates Fix request text", () => {
    document.getElementById("qty-0").value = "5";
    document.getElementById("type2-0").value = "Fix";
    document.getElementById("fixDate-0").value = "2025-01-02";
    toggleLeg2Fields(0);
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Sell 5 mt Al USD ppt 04/02/25 and Buy 5 mt Al AVG January 2025 Flat against",
    );
  });

  test("uses AVG PPT date on Fix leg", () => {
    document.getElementById("qty-0").value = "8";
    document.getElementById("type1-0").value = "Fix";
    document.getElementById("type2-0").value = "AVG";
    document.getElementById("month2-0").value = "February";
    document.getElementById("year2-0").value = "2025";
    toggleLeg1Fields(0);
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Buy 8 mt Al USD ppt 04/03/25 and Sell 8 mt Al AVG February 2025 Flat against",
    );
  });

  test("uses AVG PPT date on second Fix leg", () => {
    document.getElementById("qty-0").value = "12";
    document.getElementById("type1-0").value = "AVG";
    document.getElementById("type2-0").value = "Fix";
    document.getElementById("month1-0").value = "October";
    document.getElementById("year1-0").value = "2025";
    toggleLeg2Fields(0);
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Sell 12 mt Al USD ppt 04/11/25 and Buy 12 mt Al AVG October 2025 Flat against",
    );
  });

  test("creates C2R request text", () => {
    document.getElementById("qty-0").value = "7";
    document.getElementById("type2-0").value = "C2R";
    document.getElementById("fixDate-0").value = "2025-01-02";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Sell 7 mt Al C2R 02/01/25 ppt 06/01/25 and Buy 7 mt Al AVG January 2025 Flat against",
    );
  });

  test("creates AVGInter request text", () => {
    document.getElementById("qty-0").value = "5";
    document.getElementById("type1-0").value = "AVGInter";
    document.getElementById("startDate-0").value = "2025-09-01";
    document.getElementById("endDate-0").value = "2025-09-10";
    document.getElementById("type2-0").value = "AVG";
    document.getElementById("month2-0").value = "October";
    document.getElementById("year2-0").value = "2025";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Buy 5 mt Al Fixing AVG 01/09/25 to 10/09/25, ppt 04/11/25 and Sell 5 mt Al AVG October 2025 Flat against",
    );
  });

  test("creates AVG vs AVGInter text", () => {
    document.getElementById("qty-0").value = "4";
    document.getElementById("type1-0").value = "AVG";
    document.getElementById("month1-0").value = "January";
    document.getElementById("year1-0").value = "2025";
    document.getElementById("type2-0").value = "AVGInter";
    document.getElementById("startDate2-0").value = "2025-02-20";
    document.getElementById("endDate2-0").value = "2025-02-25";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Buy 4 mt Al AVG January 2025 Flat and Sell 4 mt Al Fixing AVG 20/02/25 to 25/02/25, ppt 04/02/25 against",
    );
  });

  test("shows error for non-numeric quantity", () => {
    document.getElementById("qty-0").value = "abc";
    document.getElementById("type2-0").value = "AVG";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe("Please enter a valid quantity.");
  });

  test("shows error for negative quantity", () => {
    document.getElementById("qty-0").value = "-3";
    document.getElementById("type2-0").value = "AVG";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe("Quantity must be greater than zero.");
  });

  test("requires fixing date when needed", () => {
    document.getElementById("qty-0").value = "5";
    document.getElementById("type2-0").value = "C2R";
    document.getElementById("fixDate-0").value = "";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe("Please provide a fixing date.");
  });

  test("ignores manual fix date when paired with AVG", () => {
    document.getElementById("qty-0").value = "5";
    document.getElementById("type1-0").value = "AVG";
    document.getElementById("type2-0").value = "Fix";
    document.getElementById("month1-0").value = "January";
    document.getElementById("year1-0").value = "2025";
    document.getElementById("fixDate-0").value = "2025-02-02";
    toggleLeg2Fields(0);
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Sell 5 mt Al USD ppt 04/02/25 and Buy 5 mt Al AVG January 2025 Flat against",
    );
  });

  test("creates single leg forward AVG request", () => {
    document.getElementById("tradeType-0").value = "Forward";
    document.getElementById("qty-0").value = "6";
    document.getElementById("type1-0").value = "AVG";
    document.getElementById("month1-0").value = "January";
    document.getElementById("year1-0").value = "2025";
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe("LME Request: Buy 6 mt Al AVG January 2025 Flat");
  });

  test("forward with two legs sync PPT", () => {
    document.getElementById("tradeType-0").value = "Forward";
    document.querySelector("input[name='side2-0'][value='buy']").checked = true;
    document.getElementById("qty-0").value = "5";
    document.getElementById("type1-0").value = "AVGInter";
    document.getElementById("startDate-0").value = "2025-05-16";
    document.getElementById("endDate-0").value = "2025-05-19";
    document.getElementById("type2-0").value = "AVG";
    document.getElementById("month2-0").value = "July";
    document.getElementById("year2-0").value = "2025";
    document.getElementById("syncPpt-0").checked = true;
    generateRequest(0);
    const out = document.getElementById("output-0").textContent;
    expect(out).toBe(
      "LME Request: Buy 5 mt Al Fixing AVG 16/05/25 to 19/05/25, ppt 04/08/25\n" +
        "LME Request: Buy 5 mt Al AVG July 2025 Flat"
    );
  });

  test("final output includes selected company", () => {
    document.getElementById("qty-0").value = "10";
    document.getElementById("type2-0").value = "AVG";
    generateRequest(0);
    const finalOut = document.getElementById("final-output").value;
    expect(finalOut).toBe(
      "For Alcast Brasil Account -\nLME Request: Buy 10 mt Al AVG January 2025 Flat and Sell 10 mt Al AVG February 2025 Flat against"
    );
  });
});

describe("business day helpers", () => {
  test("getSecondBusinessDay returns formatted date", () => {
    expect(getSecondBusinessDay(2025, 0)).toBe("04/02/25");
  });

  test("getFixPpt computes two business days after fix date", () => {
    expect(getFixPpt("02/01/25")).toBe("06/01/25");
  });
});
