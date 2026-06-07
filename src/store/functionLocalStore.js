export const FUNCTION_STORAGE_KEYS = {
  functionPage: "dukou:functionPage:v1",
  dynamics: "dukou:dynamics:v1",
  mailbox: "dukou:mailbox:v1",
  reminders: "dukou:reminders:v1",
  schedule: "dukou:schedule:v1",
  cycle: "dukou:cycle:v1",
  reviews: "dukou:reviews:v1",
};

const EMPTY_FUNCTION_PAGE_STATE = {
  favoriteMailIds: [],
  reviewFilter: "all",
  reviewSortMode: "created",
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJson(key) {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

function removeItem(key) {
  if (canUseLocalStorage()) {
    window.localStorage.removeItem(key);
  }
}

function readArray(key, fallback) {
  const value = readJson(key);
  return Array.isArray(value) ? value : clone(fallback);
}

function readObject(key, fallback) {
  const value = readJson(key);
  return value && typeof value === "object" && !Array.isArray(value) ? value : clone(fallback);
}

function normalizeNumber(value, fallback, min = 1) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? Math.round(number) : fallback;
}

export function getTodayDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToDateString(dateString, days) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return getTodayDateString(date);
}

export function getDaysBetweenDateStrings(startDate, endDate) {
  if (!startDate || !endDate) return null;

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  if (!startYear || !startMonth || !startDay || !endYear || !endMonth || !endDay) {
    return null;
  }

  const start = Date.UTC(startYear, startMonth - 1, startDay);
  const end = Date.UTC(endYear, endMonth - 1, endDay);
  return Math.round((end - start) / 86400000);
}

export function calculateCycleProfile(profile = {}, todayDate = getTodayDateString()) {
  const lastStartDate = profile.lastStartDate || "";
  const cycleDays = normalizeNumber(profile.cycleDays, 28, 21);
  const periodLengthDays = normalizeNumber(profile.periodLengthDays, 5);
  const lutealPhaseDays = 14;

  if (!lastStartDate) {
    return {
      ...profile,
      lastStartDate: "",
      cycleDays,
      periodLengthDays,
      predictedNextStartDate: "",
      daysUntilNextStart: null,
      predictedOvulationDate: "",
      daysUntilOvulation: null,
      currentStatus: "unset",
    };
  }

  let predictedNextStartDate = addDaysToDateString(lastStartDate, cycleDays);
  let daysUntilNextStart = getDaysBetweenDateStrings(todayDate, predictedNextStartDate);

  while (daysUntilNextStart !== null && daysUntilNextStart < 0) {
    predictedNextStartDate = addDaysToDateString(predictedNextStartDate, cycleDays);
    daysUntilNextStart = getDaysBetweenDateStrings(todayDate, predictedNextStartDate);
  }

  let predictedOvulationDate = addDaysToDateString(predictedNextStartDate, -lutealPhaseDays);
  let daysUntilOvulation = getDaysBetweenDateStrings(todayDate, predictedOvulationDate);

  if (daysUntilOvulation !== null && daysUntilOvulation < 0) {
    predictedOvulationDate = addDaysToDateString(predictedNextStartDate, cycleDays - lutealPhaseDays);
    daysUntilOvulation = getDaysBetweenDateStrings(todayDate, predictedOvulationDate);
  }

  const daysFromLastStart = getDaysBetweenDateStrings(lastStartDate, todayDate);
  const cycleOffset =
    daysFromLastStart === null ? null : ((daysFromLastStart % cycleDays) + cycleDays) % cycleDays;
  const isInPeriod = cycleOffset !== null && cycleOffset < periodLengthDays;
  const currentStatus = isInPeriod
    ? "period"
    : daysUntilNextStart !== null && daysUntilNextStart <= 7
      ? "near"
      : "set";

  return {
    ...profile,
    lastStartDate,
    cycleDays,
    periodLengthDays,
    predictedNextStartDate,
    daysUntilNextStart,
    predictedOvulationDate,
    daysUntilOvulation,
    currentStatus,
  };
}

export function loadFunctionPageState(fallback = EMPTY_FUNCTION_PAGE_STATE) {
  return {
    ...EMPTY_FUNCTION_PAGE_STATE,
    ...readObject(FUNCTION_STORAGE_KEYS.functionPage, fallback),
  };
}

export function saveFunctionPageState(value) {
  writeJson(FUNCTION_STORAGE_KEYS.functionPage, {
    ...EMPTY_FUNCTION_PAGE_STATE,
    ...(value || {}),
  });
}

export function loadDynamics(fallback = []) {
  return readArray(FUNCTION_STORAGE_KEYS.dynamics, fallback);
}

export function saveDynamics(value) {
  writeJson(FUNCTION_STORAGE_KEYS.dynamics, Array.isArray(value) ? value : []);
}

export function loadMailbox(fallback = []) {
  return readArray(FUNCTION_STORAGE_KEYS.mailbox, fallback);
}

export function saveMailbox(value) {
  writeJson(FUNCTION_STORAGE_KEYS.mailbox, Array.isArray(value) ? value : []);
}

export function loadReminders(fallback = []) {
  return readArray(FUNCTION_STORAGE_KEYS.reminders, fallback);
}

export function saveReminders(value) {
  writeJson(FUNCTION_STORAGE_KEYS.reminders, Array.isArray(value) ? value : []);
}

export function loadSchedule(fallback = []) {
  return readArray(FUNCTION_STORAGE_KEYS.schedule, fallback);
}

export function saveSchedule(value) {
  writeJson(FUNCTION_STORAGE_KEYS.schedule, Array.isArray(value) ? value : []);
}

export function loadCycleProfile(fallback = {}) {
  return calculateCycleProfile(readObject(FUNCTION_STORAGE_KEYS.cycle, fallback));
}

export function saveCycleProfile(value) {
  writeJson(FUNCTION_STORAGE_KEYS.cycle, calculateCycleProfile(value));
}

export function loadReviews(fallback = []) {
  return readArray(FUNCTION_STORAGE_KEYS.reviews, fallback);
}

export function saveReviews(value) {
  writeJson(FUNCTION_STORAGE_KEYS.reviews, Array.isArray(value) ? value : []);
}

export function clearFunctionLocalStore() {
  Object.values(FUNCTION_STORAGE_KEYS).forEach(removeItem);
}

export function resetFunctionLocalStore(defaults = {}) {
  saveFunctionPageState(defaults.functionPage || EMPTY_FUNCTION_PAGE_STATE);
  saveDynamics(defaults.dynamics || []);
  saveMailbox(defaults.mailbox || []);
  saveReminders(defaults.reminders || []);
  saveSchedule(defaults.schedule || []);
  saveCycleProfile(defaults.cycle || {});
  saveReviews(defaults.reviews || []);
}
