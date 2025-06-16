(function(root){
  'use strict';
  const solar = root.solarlunar;

  function formatDateGregorian(date){
    const d = String(date.getDate()).padStart(2,'0');
    const m = String(date.getMonth()+1).padStart(2,'0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  }

  function parseDateGregorian(str){
    if (typeof str !== 'string') return null;
    const match = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!match) return null;
    const day = parseInt(match[1],10);
    const month = parseInt(match[2],10)-1;
    const year = 2000 + parseInt(match[3],10);
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day){
      return null;
    }
    return d;
  }

  function formatDateChinese(date){
    if (!solar) return formatDateGregorian(date);
    const lunar = solar.solar2lunar(date.getFullYear(), date.getMonth()+1, date.getDate());
    const d = String(lunar.lDay).padStart(2,'0');
    const m = String(lunar.lMonth).padStart(2,'0');
    const y = String(lunar.lYear).slice(-2);
    return `${d}/${m}/${y}`;
  }

  function parseDateChinese(str){
    if (!solar || typeof str !== 'string') return null;
    const match = str.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
    if (!match) return null;
    const day = parseInt(match[1],10);
    const month = parseInt(match[2],10);
    const year = 2000 + parseInt(match[3],10);
    const res = solar.lunar2solar(year, month, day);
    if (!res || !res.cYear) return null;
    return new Date(res.cYear, res.cMonth-1, res.cDay);
  }

  function formatDate(date, type){
    return type === 'chinese' ? formatDateChinese(date) : formatDateGregorian(date);
  }

  function parseDate(str, type){
    return type === 'chinese' ? parseDateChinese(str) : parseDateGregorian(str);
  }

  const utils = {
    formatDateGregorian,
    parseDateGregorian,
    formatDateChinese,
    parseDateChinese,
    formatDate,
    parseDate
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
  } else {
    root.calendarUtils = utils;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
