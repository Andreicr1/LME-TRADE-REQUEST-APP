const solarlunarMock = {
  solar2lunar: jest.fn((y, m, d) => ({ lDay: d, lMonth: m, lYear: y })),
  lunar2solar: jest.fn((y, m, d) => ({ cYear: y, cMonth: m, cDay: d }))
};

global.solarlunar = solarlunarMock;

const {
  formatDateGregorian,
  parseDateGregorian,
  formatDateChinese,
  parseDateChinese
} = require('../calendar-utils');

describe('Gregorian utilities', () => {
  test('formatDateGregorian and parseDateGregorian round trip', () => {
    const date = new Date(2023, 0, 5);
    const str = formatDateGregorian(date);
    expect(str).toBe('05/01/23');
    const parsed = parseDateGregorian(str);
    expect(parsed).toEqual(date);
  });

  test('parseDateGregorian invalid', () => {
    expect(parseDateGregorian('bogus')).toBeNull();
  });
});

describe('Chinese utilities', () => {
  test('formatDateChinese uses solarlunar', () => {
    const date = new Date(2023, 4, 15);
    expect(formatDateChinese(date)).toBe('15/05/23');
  });

  test('parseDateChinese uses solarlunar', () => {
    const date = parseDateChinese('05/03/23');
    expect(date).toEqual(new Date(2023, 2, 5));
  });
});
