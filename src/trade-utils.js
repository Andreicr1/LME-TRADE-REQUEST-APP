(function(root){
  'use strict';
  const calendarUtils = root.calendarUtils || require('../calendar-utils');

  let lmeHolidays = {};

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    const fs = require('fs');
    const path = require('path');
    try {
      const file = path.join(__dirname, '..', 'holidays.json');
      lmeHolidays = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      console.error('Failed to read holidays.json:', err);
    }
  } else {
    fetch('holidays.json')
      .then(res => res.json())
      .then(data => { lmeHolidays = data; })
      .catch(err => console.error('Failed to load holidays.json:', err));
  }

  async function loadHolidayData(){
    try {
      const res = await fetch('https://www.gov.uk/bank-holidays.json');
      const data = await res.json();
      const events = data['england-and-wales'].events;
      events.forEach(({date}) => {
        const year = date.slice(0,4);
        if(!lmeHolidays[year]) lmeHolidays[year] = [];
        if(!lmeHolidays[year].includes(date)) lmeHolidays[year].push(date);
      });
    } catch(err){
      console.error('Failed to load holiday data:', err);
    }
  }

  function parseInputDate(value){
    if(!value) return null;
    const parts = value.split('-').map(Number);
    if(parts.length !== 3) return null;
    const [y,m,d] = parts;
    return new Date(y, m-1, d);
  }

  function capitalize(s){
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  const monthNames = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];

  function getSecondBusinessDay(year, month){
    const holidays = lmeHolidays[year] || [];
    let date = new Date(year, month+1, 1);
    let count = 0;
    while(count < 2){
      const iso = date.toISOString().split('T')[0];
      const day = date.getDay();
      if(day !== 0 && day !== 6 && !holidays.includes(iso)) count++;
      if(count < 2) date.setDate(date.getDate()+1);
    }
    return calendarUtils.formatDateGregorian(date);
  }

  function getFixPpt(dateFix){
    if(!dateFix) throw new Error('Please provide a fixing date.');
    const date = calendarUtils.parseDateGregorian(dateFix);
    if(!date) throw new Error('Fixing date is invalid.');
    const holidays = lmeHolidays[date.getFullYear()] || [];
    let count = 0;
    while(count < 2){
      date.setDate(date.getDate()+1);
      const iso = date.toISOString().split('T')[0];
      const day = date.getDay();
      if(day !== 0 && day !== 6 && !holidays.includes(iso)) count++;
    }
    return calendarUtils.formatDateGregorian(date);
  }

  const utils = {
    loadHolidayData,
    parseInputDate,
    getSecondBusinessDay,
    getFixPpt,
    capitalize,
    monthNames
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = utils;
  } else {
    root.tradeUtils = utils;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
