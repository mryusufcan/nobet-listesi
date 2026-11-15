/* Nöbet Listesi — bağımlılıksız, tek dosyalık statik uygulama.
   Tüm veri tarayıcının localStorage alanında tutulur; sunucuya hiçbir şey gönderilmez. */
"use strict";

/* ---------- Sabitler ---------- */
const KEY = "nobet-listesi-static-v1";
const CORRUPT_KEY = `${KEY}:bozuk`;
const THEME_KEY = "nobet-theme";
const SHEET_ID = "10-i9GBdUwCZ2XWA1IylaA5V5EgxPQG3BzGmemyJT-5I";

const DEFAULT_DAILY_HOURS = 5.83;
const DEFAULT_SHIFT_HOURS = 7;
const WEEKLY_MAX = 6;
const MIN_YEAR = 2024;
const MAX_YEAR = 2100;

const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DEVICES = ["MR", "BT", "RÖNT-PORT", "RÖNTGEN", "RÖNT-MAMO"];
const SHIFT_LABELS = [["morning", "Sabah"], ["evening", "Akşam"], ["night", "Gece"]];
const SLOT_LABELS = {
  m0: "MR sabah",
  m1: "BT sabah",
  m2: "RÖNT-PORT sabah",
  m3: "RÖNTGEN sabah",
  m4: "RÖNT-MAMO sabah",
  e0: "Akşam 1",
  e1: "Akşam 2",
  n0: "Gece",
};

const FIXED_HOLIDAYS = ["01-01", "04-23", "05-01", "05-19", "07-15", "08-30", "10-29"];
// 2026 dini/dini olmayan hareketli tatiller (Arefe dahil); yeni yıl için buraya ekleyin.
const MOVABLE_HOLIDAYS = { 2026: ["2026-03-19", "2026-03-20", "2026-03-21", "2026-05-26", "2026-05-27", "2026-05-28", "2026-05-29"] };

const today = new Date();

/* ---------- Küçük yardımcılar ---------- */
const $ = (selector) => document.querySelector(selector);

/** HTML'e basılan her metin buradan geçmeli: adlar ve yedek dosyası dışarıdan gelir. */
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

/** crypto.randomUUID yalnız güvenli bağlamda vardır; eski tarayıcı ve file:// için yedek. */
function uid() {
  const uuid = globalThis.crypto?.randomUUID;
  if (typeof uuid === "function") return uuid.call(globalThis.crypto);
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    copyStatus("Kayıt yapılamadı: tarayıcı depolaması kapalı ya da dolu.", true);
  }
}

function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth() {
  return new Date(state.year, state.month, 0).getDate();
}

function weekKeyOf(date) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() - ((value.getDay() || 7) - 1));
  return dateKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

function holidaySet(year) {
  return new Set([...FIXED_HOLIDAYS.map((date) => `${year}-${date}`), ...(MOVABLE_HOLIDAYS[year] || [])]);
}

function workTargets(year, month) {
  const holidays = holidaySet(year);
  const totalDays = new Date(year, month, 0).getDate();
  let sundays = 0;
  let officialHolidays = 0;
  for (let day = 1; day <= totalDays; day += 1) {
    const iso = dateKey(year, month, day);
    if (new Date(`${iso}T00:00:00`).getDay() === 0) sundays += 1;
    else if (holidays.has(iso)) officialHolidays += 1;
  }
  return { totalDays, sundays, officialHolidays, workDays: totalDays - sundays - officialHolidays };
}

function leaveSet(date) {
  return new Set(state.leaves.filter((item) => (item.start || item.date) <= date && date <= (item.end || item.date)).map((item) => item.staffId));
}

function count(plan, id, role) {
  return plan.days.reduce((total, day) => total + (day[role].includes(id) ? 1 : 0), 0);
}

function name(id) {
  return state.staff.find((person) => person.id === id)?.name || "—";
}

const byName = (a, b) => a.name.localeCompare(b.name, "tr");

const dateLabel = (date) => {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
};

const sheetUrl = () => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit${state.month === 11 ? "#gid=1484533958" : state.month === 10 ? "#gid=1637754608" : ""}`;

function download(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Durum ---------- */
/** Uygulamanın gerçek kadrosu: 10 rotasyon personeli + Radyoloji Sorumlusu (son çare joker, yalnız sabah MR). */
function defaultRoster() {
  const rotation = ["Abdullah Tecen", "Ercan Kurt", "Fatih Karabulut", "Kutay Hoş", "Yusuf Can Özdemir", "Mert Aslan", "Bahar Yarenoğlu", "Damlanur Köksalan", "Hazal Kaşıkcı", "Sedanur Demir"]
    .map((name, index) => ({ id: uid(), name, gender: index < 6 ? "male" : "female", night: name !== "Mert Aslan" }));
  rotation.push({ id: uid(), name: "Hüseyin Arıkan", gender: "male", night: false, joker: true, allowed: { shifts: ["morning"], devices: ["MR"] } });
  return rotation;
}

function createState() {
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    staff: defaultRoster(),
    leaves: [],
    plan: null,
    locks: {},
    dailyHours: DEFAULT_DAILY_HOURS,
    shiftHours: DEFAULT_SHIFT_HOURS,
  };
}

function sampleStaff() {
  return [
    { name: "Örnek Personel 1", gender: "female" },
    { name: "Örnek Personel 2", gender: "female" },
    { name: "Örnek Personel 3", gender: "male" },
    { name: "Örnek Personel 4", gender: "male" },
  ].map((person) => ({ id: uid(), name: person.name, gender: person.gender, night: true }));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStaffItem(item) {
  if (!isPlainObject(item)) throw new Error("personel kaydı nesne değil");
  const nameValue = typeof item.name === "string" ? item.name.trim() : "";
  if (!nameValue) throw new Error("personel adı boş");
  const genderValue = item.gender === "male" ? "male" : "female";
  const person = {
    id: typeof item.id === "string" && item.id ? item.id : uid(),
    name: nameValue,
    gender: genderValue,
    night: item.night !== false,
  };
  if (item.joker === true) person.joker = true;
  if (isPlainObject(item.allowed)) {
    const shifts = Array.isArray(item.allowed.shifts) ? item.allowed.shifts.filter((key) => SHIFT_LABELS.some(([nameKey]) => nameKey === key)) : [];
    const devices = Array.isArray(item.allowed.devices) ? item.allowed.devices.filter((key) => DEVICES.includes(key)) : [];
    person.allowed = { shifts: [...new Set(shifts)], devices: [...new Set(devices)] };
  }
  return person;
}

function normalizePlan(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.days) || !raw.days.length) return null;
  const days = raw.days.map((day) => {
    if (!isPlainObject(day) || typeof day.date !== "string") throw new Error("çizelge günü geçersiz");
    const morning = Array.isArray(day.morning) ? day.morning.slice(0, DEVICES.length) : [];
    while (morning.length < DEVICES.length) morning.push(null);
    return {
      date: day.date,
      weekday: Number(day.weekday),
      morning: morning.map((value) => (typeof value === "string" && value ? value : null)),
      evening: (Array.isArray(day.evening) ? day.evening : []).map((value) => (typeof value === "string" && value ? value : null)),
      night: (Array.isArray(day.night) ? day.night : []).map((value) => (typeof value === "string" && value ? value : null)),
      forced: day.forced === true,
    };
  });
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    days,
    forced: raw.forced === true,
    approved: raw.approved === true,
  };
}

/** Dışarıdan gelen her veri buradan geçer; geçmezse mevcut durum bozulmadan kalır. */
function normalizeState(raw) {
  if (!isPlainObject(raw)) throw new Error("veri bir nesne değil");
  if (!Array.isArray(raw.staff)) throw new Error("personel listesi eksik");

  const staff = raw.staff.map(normalizeStaffItem);
  const seen = new Set();
  staff.forEach((person) => {
    if (seen.has(person.id)) person.id = uid();
    seen.add(person.id);
  });

  const year = Number(raw.year);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) throw new Error("yıl geçersiz");
  const month = Number(raw.month);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error("ay geçersiz");

  const staffIds = new Set(staff.map((person) => person.id));
  const leaves = (Array.isArray(raw.leaves) ? raw.leaves : [])
    .filter((item) => isPlainObject(item) && staffIds.has(item.staffId))
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : uid(),
      staffId: item.staffId,
      start: String(item.start || item.date || ""),
      end: String(item.end || item.start || item.date || ""),
    }))
    .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.start) && /^\d{4}-\d{2}-\d{2}$/.test(item.end));

  const locks = {};
  if (isPlainObject(raw.locks)) {
    Object.entries(raw.locks).forEach(([cellKey, value]) => {
      if (typeof value === "string") locks[cellKey] = value;
    });
  }

  const plan = normalizePlan(raw.plan);
  const dailyHours = Number(raw.dailyHours);
  const shiftHours = Number(raw.shiftHours);

  return {
    year,
    month,
    staff,
    leaves,
    plan,
    locks,
    dailyHours: Number.isFinite(dailyHours) && dailyHours >= 1 && dailyHours <= 12 ? dailyHours : DEFAULT_DAILY_HOURS,
    shiftHours: Number.isFinite(shiftHours) && shiftHours >= 1 && shiftHours <= 12 ? shiftHours : DEFAULT_SHIFT_HOURS,
  };
}

function loadState() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    raw = null;
  }
  if (!raw) return createState();
  try {
    return normalizeState(JSON.parse(raw));
  } catch (error) {
    // Bozuk kayıt uygulamayı kilitlemesin: yedeğe alıp temiz başla.
    try {
      localStorage.setItem(CORRUPT_KEY, raw);
      localStorage.removeItem(KEY);
    } catch (storageError) {
      /* depolama kapalıysa sessiz geç */
    }
    return createState();
  }
}

let state = loadState();

/* ---------- Yetkiler ---------- */
function ensureAllowed(person) {
  if (!person.allowed) {
    person.allowed = {
      shifts: person.night === false ? ["morning", "evening"] : ["morning", "evening", "night"],
      devices: [...DEVICES],
    };
  }
  if (person.gender !== "female") person.allowed.devices = person.allowed.devices.filter((device) => device !== "RÖNT-MAMO");
  return person.allowed;
}

const can = (person, group, key) => ensureAllowed(person)[group].includes(key);
const autoStaff = () => state.staff.filter((person) => !person.manualOnly && !person.joker);
const activePlan = () => (state.plan && state.plan.year === state.year && state.plan.month === state.month ? state.plan : null);

state.staff.forEach(ensureAllowed);
state.staff.sort(byName);

/* ---------- Bildirim ---------- */
function copyStatus(message, warn) {
  const element = $("#copy-status");
  element.textContent = message;
  element.classList.toggle("warn", Boolean(warn));
  element.hidden = !message;
}

/* ---------- Çizelge ---------- */
function weekSlots(planDays) {
  const byDate = new Map(planDays.map((day) => [day.date, day]));
  return [...new Set(planDays.map((day) => weekKeyOf(day.date)))].map((key) => {
    const [year, month, day] = key.split("-").map(Number);
    const days = Array.from({ length: 7 }, (_, index) => {
      const value = new Date(year, month - 1, day + index);
      return byDate.get(dateKey(value.getFullYear(), value.getMonth() + 1, value.getDate())) || null;
    });
    return { start: key, days };
  });
}

function generate() {
  const plan = { year: state.year, month: state.month, days: [], forced: false, approved: false };
  const pool = [...autoStaff()]
    .map((person) => [Math.random(), person])
    .sort((a, b) => a[0] - b[0])
    .map(([, person]) => person);
  let priorNight = null;
  let priorEvening = new Set();
  const weekly = new Map();
  const isLocked = (date, slot) => state.locks?.[`${date}|${slot}`] !== undefined;

  for (let number = 1; number <= daysInMonth(); number += 1) {
    const date = dateKey(state.year, state.month, number);
    const weekday = new Date(`${date}T00:00:00`).getDay();
    const unavailable = leaveSet(date);
    const assigned = new Set();
    const week = weekKeyOf(date);
    const weekCount = (id) => weekly.get(`${week}:${id}`) || 0;

    // Zorunlu slot boş kalmaz: sırasıyla haftalık sınır, yetki/dinlenme ve son çare esnetilir.
    const choose = (role, filter = () => true, device = null, strict = false) => {
      const allowed = (person) => !unavailable.has(person.id) && !assigned.has(person.id) && can(person, "shifts", role) && filter(person);
      let choices = pool.filter((person) => allowed(person) && priorNight !== person.id && !(role === "morning" && priorEvening.has(person.id)) && weekCount(person.id) < WEEKLY_MAX);
      let forced = false;
      // strict: dinlenme kuralını esnetmeyiz, yalnız haftalık sınır esner; kimse yoksa slot boş kalır.
      if (strict) {
        if (!choices.length) {
          choices = pool.filter((person) => allowed(person) && priorNight !== person.id && !(role === "morning" && priorEvening.has(person.id)));
          forced = choices.length > 0;
        }
        if (!choices.length) return { id: null, forced: false };
      }
      if (!choices.length) {
        choices = pool.filter((person) => allowed(person) && !(role === "morning" && priorEvening.has(person.id)) && weekCount(person.id) < WEEKLY_MAX);
        if (choices.length) forced = true;
      }
      if (!choices.length) {
        choices = pool.filter((person) => allowed(person) && priorNight !== person.id);
        if (choices.length) forced = true;
      }
      if (!choices.length) {
        choices = pool.filter(allowed);
        if (choices.length) forced = true;
      }
      if (!choices.length) {
        choices = state.staff.filter((person) => person.joker && weekday !== 0 && weekday !== 6 && !unavailable.has(person.id) && !assigned.has(person.id) && can(person, "shifts", role) && filter(person));
      }
      if (!choices.length) return { id: null, forced: false };
      const deviceIndex = device ? DEVICES.indexOf(device) : -1;
      const deviceCount = (id) => (deviceIndex < 0 ? 0 : plan.days.reduce((total, day) => total + (day.morning[deviceIndex] === id ? 1 : 0), 0));
      choices.sort((a, b) => {
        const ac = count(plan, a.id, role);
        const bc = count(plan, b.id, role);
        const at = count(plan, a.id, "morning") + count(plan, a.id, "evening") + count(plan, a.id, "night");
        const bt = count(plan, b.id, "morning") + count(plan, b.id, "evening") + count(plan, b.id, "night");
        return deviceIndex < 0 ? at - bt || ac - bc : deviceCount(a.id) - deviceCount(b.id) || at - bt || ac - bc;
      });
      const choice = choices[0];
      assigned.add(choice.id);
      weekly.set(`${week}:${choice.id}`, weekCount(choice.id) + 1);
      return { id: choice.id, forced };
    };

    const manual = (slot, role, filter = () => true, device = null, strict = false) => {
      const value = state.locks?.[`${date}|${slot}`];
      if (value === undefined) {
        const pick = choose(role, filter, device, strict);
        if (pick.forced) {
          dayForced = true;
          plan.forced = true;
        }
        return pick.id;
      }
      if (!value || !state.staff.some((person) => person.id === value)) return null;
      assigned.add(value);
      weekly.set(`${week}:${value}`, weekCount(value) + 1);
      return value;
    };

    const morning = DEVICES.map(() => null);
    const evening = [];
    const night = [];
    let dayForced = false;
    const morningDevices = weekday === 0 ? ["MR"] : DEVICES;
    // MAMO kadınlar arasında eşit dağılsın: günün ilk ataması MAMO (boş kalırsa diğerleri etkilenmez).
    const order = [...morningDevices].sort((a, b) => (b === "RÖNT-MAMO") - (a === "RÖNT-MAMO"));
    for (const device of order) {
      const index = DEVICES.indexOf(device);
      morning[index] = manual(`m${index}`, "morning", (person) => can(person, "devices", device) && (device !== "RÖNT-MAMO" || person.gender === "female"), device, device === "RÖNT-MAMO");
    }
    for (let slot = 0; slot < (weekday === 0 ? 1 : 2); slot += 1) evening.push(manual(`e${slot}`, "evening"));
    night.push(manual("n0", "night"));
    plan.days.push({ date, weekday, morning, evening, night, forced: dayForced });
    priorNight = night[0];
    priorEvening = new Set(evening.filter(Boolean));
  }

  // MAMO kadınlar arasında en fazla 1 fark kalana dek taşınır; taşınan kişinin eksiği aşağıdaki taban döngüsünde kapanır.
  const mamoIndex = DEVICES.indexOf("RÖNT-MAMO");
  const mamoCount = (id) => plan.days.filter((day) => day.morning[mamoIndex] === id).length;
  const weekLoad = (date, id) => plan.days.filter((day) => weekKeyOf(day.date) === weekKeyOf(date) && [...day.morning, ...day.evening, ...day.night].includes(id)).length;
  for (let pass = 0; pass < 200; pass += 1) {
    const women = state.staff.filter((person) => !person.joker && person.gender === "female" && can(person, "devices", "RÖNT-MAMO") && can(person, "shifts", "morning"));
    if (women.length < 2) break;
    const high = women.reduce((a, b) => (mamoCount(a.id) >= mamoCount(b.id) ? a : b));
    const targets = women.filter((person) => person.id !== high.id && mamoCount(high.id) - mamoCount(person.id) >= 2).sort((a, b) => mamoCount(a.id) - mamoCount(b.id));
    let moved = false;
    for (const low of targets) {
      const index = plan.days.findIndex((day, position) => {
        if (day.morning[mamoIndex] !== high.id || day.weekday === 0 || isLocked(day.date, `m${mamoIndex}`)) return false;
        if ([...day.morning, ...day.evening, ...day.night].includes(low.id) || leaveSet(day.date).has(low.id)) return false;
        if (weekLoad(day.date, low.id) >= WEEKLY_MAX) return false;
        const previous = plan.days[position - 1];
        return !previous || (previous.night[0] !== low.id && !previous.evening.includes(low.id));
      });
      if (index < 0) continue;
      plan.days[index].morning[mamoIndex] = low.id;
      moved = true;
      break;
    }
    if (!moved) {
      // Boş gün yoksa: hedef o gün başka cihazda çalışıyorsa cihazlar takas edilir (ikisi de vardiyada kalır).
      for (const low of targets) {
        const index = plan.days.findIndex((day) => {
          if (day.morning[mamoIndex] !== high.id || day.weekday === 0) return false;
          if (leaveSet(day.date).has(low.id) || leaveSet(day.date).has(high.id)) return false;
          const slot = day.morning.findIndex((value, position) => position !== mamoIndex && value === low.id);
          if (slot < 0) return false;
          if (isLocked(day.date, `m${slot}`) || isLocked(day.date, `m${mamoIndex}`)) return false;
          return can(high, "devices", DEVICES[slot]);
        });
        if (index < 0) continue;
        const day = plan.days[index];
        const slot = day.morning.findIndex((value, position) => position !== mamoIndex && value === low.id);
        day.morning[slot] = high.id;
        day.morning[mamoIndex] = low.id;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  // Aylık hedef saatin altında kalanları RÖNTGEN'e ekle, taban dolduysa RÖNTGEN fazlasını çıkar.
  const shiftHours = Number(state.shiftHours) || DEFAULT_SHIFT_HOURS;
  const daily = Number(state.dailyHours) || DEFAULT_DAILY_HOURS;
  const monthHours = workTargets(state.year, state.month).workDays * daily;
  const floorHours = monthHours - 5;
  const holidays = holidaySet(state.year);
  const away = new Map();
  const totals = new Map();
  plan.days.forEach((day) => {
    away.set(day.date, leaveSet(day.date));
    [...day.morning, ...day.evening, ...day.night].filter(Boolean).forEach((id) => totals.set(id, (totals.get(id) || 0) + 1));
  });
  const leaveCredit = (id) => plan.days.filter((day) => day.weekday !== 0 && !holidays.has(day.date) && away.get(day.date).has(id)).length * daily;
  const gap = (id) => (totals.get(id) || 0) * shiftHours + leaveCredit(id) - floorHours;
  const weekOf = (day) => weekKeyOf(day.date);
  const bump = (id, week, delta) => {
    totals.set(id, Math.max(0, (totals.get(id) || 0) + delta));
    if (delta < 0) weekly.set(`${week}:${id}`, Math.max(0, (weekly.get(`${week}:${id}`) || 1) - 1));
    else weekly.set(`${week}:${id}`, (weekly.get(`${week}:${id}`) || 0) + 1);
  };
  const eligible = (person, day, index) => {
    if (day.weekday === 0) return false;
    if ([...day.morning, ...day.evening, ...day.night].includes(person.id)) return false;
    if (away.get(day.date).has(person.id)) return false;
    if (!can(person, "shifts", "morning") || !can(person, "devices", "RÖNTGEN")) return false;
    const previous = plan.days[index - 1];
    if (previous && (previous.night[0] === person.id || previous.evening.includes(person.id))) return false;
    return (weekly.get(`${weekOf(day)}:${person.id}`) || 0) < WEEKLY_MAX;
  };
  const short = () => autoStaff().filter((person) => gap(person.id) < 0).sort((a, b) => gap(a.id) - gap(b.id));

  let moved = true;
  let passes = 0;
  while (moved && passes++ < 200) {
    moved = false;
    for (const person of short()) {
      for (const [index, day] of plan.days.entries()) {
        if (gap(person.id) >= 0) break;
        if (isLocked(day.date, "m3")) continue;
        if (!eligible(person, day, index)) continue;
        const occupant = day.morning[3] ? state.staff.find((item) => item.id === day.morning[3]) : null;
        if (occupant && gap(occupant.id) - shiftHours < 0) continue;
        if (occupant) bump(occupant.id, weekOf(day), -1);
        day.morning[3] = person.id;
        bump(person.id, weekOf(day), 1);
        moved = true;
      }
    }
  }
  plan.days.forEach((day) => {
    if (isLocked(day.date, "m3")) return;
    const id = day.morning[3];
    if (!id) return;
    if (gap(id) - shiftHours < 0) return;
    day.morning[3] = null;
    totals.set(id, (totals.get(id) || 0) - 1);
  });

  state.plan = plan;
  persist();
  render();

  const kept = Object.keys(state.locks || {}).length;
  const jokers = [...new Set(plan.days.flatMap((day) => day.morning).filter(Boolean))]
    .map((id) => state.staff.find((person) => person.id === id))
    .filter((person) => person?.joker)
    .map((person) => person.name);
  if (jokers.length) copyStatus(`Radyoloji Sorumlusu ${jokers.join(", ")} ${plan.days.length} günlük çizelgede zorunlu olarak MR'a yazıldı.${kept ? ` ${kept} manuel hücre korundu.` : ""}`);
  else if (kept) copyStatus(`${kept} manuel hücre korundu.`);
}

function emptyPlan() {
  const days = [];
  for (let number = 1; number <= daysInMonth(); number += 1) {
    const date = dateKey(state.year, state.month, number);
    const weekday = new Date(`${date}T00:00:00`).getDay();
    days.push({ date, weekday, morning: DEVICES.map(() => null), evening: Array(weekday === 0 ? 1 : 2).fill(null), night: [null], forced: false });
  }
  state.plan = { year: state.year, month: state.month, days, forced: false, approved: false };
  state.locks = {};
  persist();
  render();
}

function setCell(date, slot, id) {
  const plan = activePlan();
  if (!plan) return;
  const day = plan.days.find((item) => item.date === date);
  if (!day) return;
  if (slot[0] === "m") day.morning[Number(slot[1])] = id || null;
  else if (slot[0] === "e") day.evening[Number(slot[1])] = id || null;
  else day.night[0] = id || null;
  state.locks[`${date}|${slot}`] = id || "";
  persist();
  renderPlan();
  renderModalitySummary();
  renderHours();
}

/* ---------- Doğrulama ---------- */
function validate(plan) {
  const issues = [];
  let previousNight = null;
  let previousEvening = [];
  const weekly = new Map();
  for (const day of plan.days) {
    const ids = [...day.morning, ...day.evening, day.night[0]].filter(Boolean);
    if (new Set(ids).size !== ids.length) issues.push({ date: day.date, message: "Aynı personel aynı gün birden fazla vardiyada." });
    if (previousNight !== null && ids.includes(previousNight)) issues.push({ date: day.date, message: `${name(previousNight)} iki gün arka arkaya gece vardiyasında.` });
    if (day.morning.some((id) => previousEvening.includes(id))) issues.push({ date: day.date, message: "Akşam sonrası ertesi gün sabah dinlenme ihlali." });
    const away = leaveSet(day.date);
    ids.forEach((id) => {
      if (away.has(id)) issues.push({ date: day.date, message: `${name(id)} izinli/raporlu.` });
    });
    const requiredDevices = day.weekday === 0 ? [0] : [0, 1, 2, 4];
    const missingDevices = requiredDevices.filter((index) => !day.morning[index]).map((index) => DEVICES[index]);
    if (missingDevices.length) issues.push({ date: day.date, message: `Sabah eksik: ${missingDevices.join(", ")}.` });
    const expectedEvening = day.weekday === 0 ? 1 : 2;
    if (day.evening.filter(Boolean).length !== expectedEvening) issues.push({ date: day.date, message: `Akşam ${expectedEvening} kişi olmalı.` });
    if (!day.night[0]) issues.push({ date: day.date, message: "Gece vardiyası boş." });
    day.morning.forEach((id, index) => {
      const person = state.staff.find((item) => item.id === id);
      if (!person) return;
      if (!can(person, "shifts", "morning")) issues.push({ date: day.date, message: `${person.name} sabah vardiyasına uygun değil.` });
      if (!can(person, "devices", DEVICES[index])) issues.push({ date: day.date, message: `${person.name} · ${DEVICES[index]} yetkisi yok.` });
    });
    const mamo = state.staff.find((person) => person.id === day.morning[4]);
    if (mamo && mamo.gender !== "female") issues.push({ date: day.date, message: "Mamografiye erkek personel atandı." });
    day.evening.filter(Boolean).forEach((id) => {
      const person = state.staff.find((item) => item.id === id);
      if (person && !can(person, "shifts", "evening")) issues.push({ date: day.date, message: `${person.name} akşam vardiyasına uygun değil.` });
    });
    const nightPerson = state.staff.find((person) => person.id === day.night[0]);
    if (nightPerson && !can(nightPerson, "shifts", "night")) issues.push({ date: day.date, message: `${nightPerson.name} gece uygun değil.` });
    const key = weekKeyOf(day.date);
    const counts = weekly.get(key) || new Map();
    ids.forEach((id) => counts.set(id, (counts.get(id) || 0) + 1));
    weekly.set(key, counts);
    previousNight = day.night[0] || null;
    previousEvening = day.evening.filter(Boolean);
  }
  weekly.forEach((counts) => counts.forEach((value, id) => {
    if (value > WEEKLY_MAX) issues.push({ date: "", message: `${name(id)} bir haftada ${value} vardiyaya atandı.` });
  }));
  const hourShift = Number(state.shiftHours) || DEFAULT_SHIFT_HOURS;
  const hourDaily = Number(state.dailyHours) || DEFAULT_DAILY_HOURS;
  const hourTarget = workTargets(plan.year, plan.month).workDays * hourDaily;
  const hourHolidays = holidaySet(plan.year);
  const hourTotals = new Map();
  plan.days.forEach((day) => [...day.morning, ...day.evening, ...day.night].filter(Boolean).forEach((id) => hourTotals.set(id, (hourTotals.get(id) || 0) + 1)));
  autoStaff().forEach((person) => {
    const credit = plan.days.filter((day) => day.weekday !== 0 && !hourHolidays.has(day.date) && leaveSet(day.date).has(person.id)).length * hourDaily;
    const actual = (hourTotals.get(person.id) || 0) * hourShift + credit;
    if (actual < hourTarget - 5) issues.push({ date: "", message: `${person.name} hedefin 5 saatten fazla altında (${actual.toFixed(2)} / ${hourTarget.toFixed(2)} saat).` });
  });
  return issues;
}

/* ---------- Görünüm ---------- */
function forgetStaff(id) {
  if (!state.plan) return;
  state.plan.days.forEach((day) => {
    day.morning = day.morning.map((value) => (value === id ? null : value));
    day.evening = day.evening.map((value) => (value === id ? null : value));
    day.night = day.night.map((value) => (value === id ? null : value));
  });
  Object.keys(state.locks).forEach((cellKey) => {
    if (state.locks[cellKey] === id) delete state.locks[cellKey];
  });
}

function renderLeaves() {
  const select = $("#leave-staff");
  select.innerHTML = state.staff.map((person) => `<option value="${esc(person.id)}">${esc(person.name)}</option>`).join("");
  const list = $("#leave-list");
  const range = (item) => {
    const start = item.start || item.date;
    const end = item.end || item.date;
    return start === end ? start : `${start} – ${end}`;
  };
  list.innerHTML = state.leaves.map((item) => `<div class="leave-item"><span>${esc(name(item.staffId))} · ${esc(range(item))}</span><button class="secondary" data-id="${esc(item.id)}">Sil</button></div>`).join("") || "<span class='muted'>Kayıtlı izin/rapor yok.</span>";
  list.querySelectorAll("button").forEach((button) => {
    button.onclick = () => {
      state.leaves = state.leaves.filter((item) => item.id !== button.dataset.id);
      persist();
      render();
    };
  });
}

function renderRisk() {
  const element = $("#risk");
  if (!state.staff.length) {
    element.innerHTML = `<div class="risk-card good"><strong>Gece kapsam analizi</strong><br>Personel eklendiğinde hesaplanır.</div>`;
    return;
  }
  const risks = [];
  for (let day = 1; day <= daysInMonth(); day += 1) {
    const date = dateKey(state.year, state.month, day);
    const unavailable = leaveSet(date);
    const candidates = autoStaff().filter((person) => can(person, "shifts", "night") && !unavailable.has(person.id)).length;
    if (candidates < 3) risks.push(`${date}: ${candidates} gece adayı`);
  }
  element.innerHTML = `<div class="risk-card ${risks.length ? "" : "good"}"><strong>${risks.length ? "Gece kapsam riski" : "Gece kapsam analizi"}</strong><br>${risks.length ? esc(risks.join(" · ")) : "Mevcut izinler ve gece uygunluklarıyla kritik gün görünmüyor."}</div>`;
}

function renderPlan() {
  const area = $("#schedule");
  const approval = $("#approval");
  const printTitle = $("#print-title");
  const plan = activePlan();

  if (!plan) {
    const hasOther = Boolean(state.plan);
    area.innerHTML = hasOther
      ? `<p class='muted'>${esc(months[state.plan.month - 1])} ${esc(state.plan.year)} çizelgesi kayıtlı; seçili ay için henüz çizelge yok. “Liste oluştur” düğmesini kullanın.</p>`
      : "<p class='muted'>Liste oluştur düğmesini kullanın.</p>";
    $("#issues").innerHTML = "";
    approval.hidden = true;
    printTitle.textContent = "";
    return;
  }

  approval.hidden = !plan.forced;
  $("#approve-forced").checked = plan.approved;
  $("#plan-caption").textContent = `${months[state.month - 1]} ${state.year} · ${plan.days.length} gün · ${state.staff.length} personel`;
  $("#copy-open").href = sheetUrl();
  printTitle.textContent = `Radyoloji Nöbet Listesi · ${months[state.month - 1]} ${state.year}`;

  const optionCell = (person, value) => `<option value="${esc(person.id)}"${person.id === value ? " selected" : ""}>${esc(person.name)}</option>`;
  const selectCell = (day, value, cls, slot, pool = state.staff) => {
    if (!day) return '<td class="outside"></td>';
    const options = pool.map((person) => optionCell(person, value)).join("");
    const label = esc(`${SLOT_LABELS[slot] || slot} · ${dateLabel(day.date)}`);
    return `<td class="${cls}"><select class="cell" data-date="${esc(day.date)}" data-slot="${esc(slot)}" aria-label="${label}"><option value="">—</option>${options}</select></td>`;
  };
  const blank = (cls) => `<td class="${cls}"></td>`;
  const weeks = weekSlots(plan.days);

  area.innerHTML = weeks.map(({ start, days }) => {
    const head = days.map((day, index) => {
      if (day) return `<th scope="col">${WEEKDAYS[day.weekday]} ${dateLabel(day.date)}</th>`;
      const value = new Date(`${start}T00:00:00`);
      value.setDate(value.getDate() + index);
      return `<th scope="col" class="outside">${WEEKDAYS[value.getDay()]} ${dateLabel(dateKey(value.getFullYear(), value.getMonth() + 1, value.getDate()))}</th>`;
    }).join("");
    const morning = DEVICES.map((device, index) => {
      const shiftCell = index === 0 ? '<td class="shift morning" rowspan="5">08:00 - 16:00</td>' : "";
      const pool = index === 4 ? state.staff.filter((person) => person.gender === "female") : state.staff;
      const cells = days.map((day) => selectCell(day, day?.morning[index], "morning", `m${index}`, pool)).join("");
      return `<tr>${shiftCell}<td class="device morning">${esc(device)}</td>${cells}</tr>`;
    }).join("");
    const spare = `<tr><td class="shift spare">08:00 - 16:00</td><td class="device spare"></td>${days.map((day) => blank(day ? "spare" : "outside")).join("")}</tr>`;
    const evening1 = days.map((day) => selectCell(day, day?.evening[0], "evening", "e0")).join("");
    const evening2 = days.map((day) => (day?.weekday === 0 ? '<td class="evening"></td>' : selectCell(day, day?.evening[1], "evening", "e1"))).join("");
    const evening = `<tr><td class="shift evening" rowspan="2">16:00 - 24:00</td><td class="device evening"></td>${evening1}</tr><tr><td class="device evening"></td>${evening2}</tr>`;
    const night = `<tr><td class="shift night">24:00 - 08:00</td><td class="device night"></td>${days.map((day) => selectCell(day, day?.night[0], "night", "n0")).join("")}</tr>`;
    return `<table class="nobet"><thead><tr><th scope="col">Vardiya</th><th scope="col">Cihaz</th>${head}</tr></thead><tbody>${morning}${spare}${evening}${night}</tbody></table>`;
  }).join("");

  area.querySelectorAll("select.cell").forEach((item) => {
    item.onchange = () => setCell(item.dataset.date, item.dataset.slot, item.value);
  });
  renderIssues();
}

function renderIssues() {
  const plan = activePlan();
  if (!plan) {
    $("#issues").innerHTML = "";
    return;
  }
  const assigned = plan.days.some((day) => [...day.morning, ...day.evening, ...day.night].some(Boolean));
  if (!assigned) {
    $("#issues").innerHTML = "";
    return;
  }
  const issues = validate(plan);
  $("#issues").innerHTML = issues.length
    ? `<div class="issue-list"><strong>${issues.length} uyarı</strong><ul>${issues.map((item) => `<li>${item.date ? `${esc(item.date)} · ` : ""}${esc(item.message)}</li>`).join("")}</ul></div>`
    : "";
}

function renderModalitySummary() {
  const element = $("#modality-balance");
  const plan = activePlan();
  if (!plan) {
    element.innerHTML = "<p class='muted'>Çizelge oluşturulduğunda hesaplanır.</p>";
    return;
  }
  const rows = state.staff.map((person) => {
    const modalityCounts = DEVICES.map((_, index) => plan.days.reduce((total, day) => total + (day.morning[index] === person.id ? 1 : 0), 0));
    const morning = modalityCounts.reduce((sum, value) => sum + value, 0);
    const evening = count(plan, person.id, "evening");
    const night = count(plan, person.id, "night");
    return { name: person.name, modalityCounts, morning, evening, night, total: morning + evening + night };
  });
  const head = ["Personel", ...DEVICES, "Sabah toplamı", "Akşam", "Gece", "Toplam vardiya"]
    .map((label) => `<th scope="col">${esc(label)}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const counts = row.modalityCounts.map((value) => `<td>${value}</td>`).join("");
      return `<tr><td>${esc(row.name)}</td>${counts}<td>${row.morning}</td><td>${row.evening}</td><td>${row.night}</td><td>${row.total}</td></tr>`;
    })
    .join("");
  element.innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderHours() {
  const element = $("#hours");
  const daily = Number(state.dailyHours) || DEFAULT_DAILY_HOURS;
  const shiftHours = Number(state.shiftHours) || DEFAULT_SHIFT_HOURS;
  const target = workTargets(state.year, state.month);
  const targetHours = Number((target.workDays * daily).toFixed(2));
  $("#hours-caption").textContent = `${target.totalDays} gün − ${target.sundays} Pazar − ${target.officialHolidays} resmî tatil = ${target.workDays} iş günü × ${daily} saat = ${targetHours.toFixed(2)} saat`;
  const plan = activePlan();
  if (!plan) {
    element.innerHTML = "<p class='muted'>Çizelge oluşturulduğunda hesaplanır.</p>";
    return;
  }
  const holidays = holidaySet(state.year);
  const rows = autoStaff().map((person) => {
    const shifts = count(plan, person.id, "morning") + count(plan, person.id, "evening") + count(plan, person.id, "night");
    const credit = Number((plan.days.filter((day) => day.weekday !== 0 && !holidays.has(day.date) && leaveSet(day.date).has(person.id)).length * daily).toFixed(2));
    const actual = Number((shifts * shiftHours + credit).toFixed(2));
    return { person, shifts, credit, actual, diff: Number((actual - targetHours).toFixed(2)) };
  });
  const total = Number(rows.reduce((sum, row) => sum + row.actual, 0).toFixed(2));
  const diffTotal = Number((total - rows.length * targetHours).toFixed(2));
  const mark = (value) => (value < 0 ? "under" : value > 0 ? "over" : "");
  const head = ["Personel", "Vardiya", "İzin saati", "Fiilî saat", "Aylık hedef", "Fark"].map((label) => `<th scope="col">${esc(label)}</th>`).join("");
  const body = rows
    .map((row) => {
      const diff = `${row.diff > 0 ? "+" : ""}${row.diff.toFixed(2)}`;
      return `<tr><td>${esc(row.person.name)}</td><td>${row.shifts}</td><td>${row.credit.toFixed(2)}</td><td>${row.actual.toFixed(2)}</td><td>${targetHours.toFixed(2)}</td><td class="${mark(row.diff)}">${diff}</td></tr>`;
    })
    .join("");
  const foot = [
    `Toplam · ${rows.length} kişi`,
    rows.reduce((sum, row) => sum + row.shifts, 0),
    rows.reduce((sum, row) => sum + row.credit, 0).toFixed(2),
    total.toFixed(2),
    (rows.length * targetHours).toFixed(2),
    `${diffTotal > 0 ? "+" : ""}${diffTotal.toFixed(2)}`,
  ]
    .map((value, index) => `<td${index === 5 ? ` class="${mark(diffTotal)}"` : ""}>${value}</td>`)
    .join("");
  element.innerHTML = `<table class="hours"><thead><tr>${head}</tr></thead><tbody>${body}</tbody><tfoot><tr>${foot}</tr></tfoot></table>`;
}

function renderSkills() {
  const area = $("#skills");
  if (!state.staff.length) {
    area.innerHTML = "<p class='muted'>Henüz personel yok. “Personel ekle” ile başlayın, “Örnek kadro” ile deneyin ya da bir yedek dosyası içe aktarın.</p>";
    return;
  }
  area.innerHTML = `<table class="skills-table"><thead><tr><th scope="col">Personel</th>${SHIFT_LABELS.map(([, label]) => `<th scope="col">${esc(label)}</th>`).join("")}${DEVICES.map((device) => `<th scope="col">${esc(device)}</th>`).join("")}</tr></thead><tbody>${state.staff.map((person) => {
    const box = (group, key) => {
      const blocked = group === "devices" && key === "RÖNT-MAMO" && person.gender !== "female";
      return `<td><input type="checkbox" data-id="${esc(person.id)}" data-group="${esc(group)}" data-key="${esc(key)}"${can(person, group, key) && !blocked ? " checked" : ""}${blocked ? " disabled" : ""} aria-label="${esc(`${person.name} · ${key}`)}" title="${esc(blocked ? "Mamografi yalnız kadın personel" : key)}" /></td>`;
    };
    return `<tr class="${esc(person.gender)}" data-id="${esc(person.id)}"><th scope="row"><div class="staff-row"><input class="staff-name" value="${esc(person.name)}" aria-label="Personel adı" /><select class="staff-gender" aria-label="${esc(person.name)} cinsiyeti"><option value="female"${person.gender === "female" ? " selected" : ""}>Kadın</option><option value="male"${person.gender === "male" ? " selected" : ""}>Erkek</option></select><button type="button" class="remove secondary">Sil</button>${person.joker ? '<span class="staff-role">Radyoloji Sorumlusu · son çare MR</span>' : ""}</div></th>${SHIFT_LABELS.map(([key]) => box("shifts", key)).join("")}${DEVICES.map((device) => box("devices", device)).join("")}</tr>`;
  }).join("")}</tbody></table>`;
  const personOf = (element) => state.staff.find((item) => item.id === element.closest("tr").dataset.id);
  area.querySelectorAll(".staff-name").forEach((input) => {
    input.oninput = (event) => {
      const person = personOf(input);
      if (!person) return;
      person.name = event.target.value;
      persist();
      renderLeaves();
    };
    input.onchange = () => {
      state.staff.sort(byName);
      persist();
      render();
    };
  });
  area.querySelectorAll(".staff-gender").forEach((select) => {
    select.onchange = (event) => {
      const person = personOf(select);
      if (!person) return;
      person.gender = event.target.value;
      persist();
      renderSkills();
      if (state.plan) renderPlan();
    };
  });
  area.querySelectorAll(".remove").forEach((button) => {
    button.onclick = () => {
      const person = personOf(button);
      if (!person) return;
      forgetStaff(person.id);
      state.staff = state.staff.filter((item) => item.id !== person.id);
      state.leaves = state.leaves.filter((item) => item.staffId !== person.id);
      persist();
      render();
    };
  });
  area.querySelectorAll("input[type=checkbox]").forEach((input) => {
    input.onchange = () => {
      const person = state.staff.find((item) => item.id === input.dataset.id);
      if (!person) return;
      const group = input.dataset.group;
      const keys = ensureAllowed(person)[group];
      ensureAllowed(person)[group] = input.checked ? [...new Set([...keys, input.dataset.key])] : keys.filter((key) => key !== input.dataset.key);
      persist();
      if (state.plan) {
        renderPlan();
        renderHours();
      }
      renderRisk();
    };
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    /* depolama kapalıysa tema yalnız bu oturumda geçerli olur */
  }
  const label = theme === "dark" ? "Aydınlık temaya geç" : "Gece temasına geç";
  $("#theme-toggle").setAttribute?.("aria-label", label);
  $("#theme-toggle").title = label;
}

function render() {
  $("#year").value = state.year;
  $("#month").value = state.month;
  $("#daily-hours").value = state.dailyHours ?? DEFAULT_DAILY_HOURS;
  $("#shift-hours").value = state.shiftHours ?? DEFAULT_SHIFT_HOURS;
  renderLeaves();
  renderRisk();
  renderSkills();
  renderPlan();
  renderModalitySummary();
  renderHours();
}

/* ---------- E-Tablo / CSV ---------- */
// E-Tablo şablonu: her hafta bloğu tam 12 satır (başlık + 5 sabah + yedek + 2 akşam + gece + 2 boş); günler C..I.
// E-Tablodaki açılır liste adları BÜYÜK harf tutuyor; farklı yazım doğrulamayı "geçersiz" yapıyor.
function weekRows(plan) {
  const weeks = weekSlots(plan.days);
  const text = (value) => (value ? name(value).toLocaleUpperCase("tr") : "");
  const rows = [];
  weeks.forEach(({ days }) => {
    const blanks = () => [...days.map(() => "")];
    rows.push(["Vardiya", "Cihaz", ...days.map((day) => (day ? `${WEEKDAYS[day.weekday]} ${dateLabel(day.date)}` : ""))]);
    DEVICES.forEach((device, index) => rows.push(["08:00-16:00", device, ...days.map((day) => (day ? text(day.morning[index]) : ""))]));
    rows.push(["08:00-16:00", "", ...blanks()]);
    rows.push(["16:00-24:00", "", ...days.map((day) => (day ? text(day.evening[0]) : ""))]);
    rows.push(["", "", ...days.map((day) => (day ? text(day.evening[1]) : ""))]);
    rows.push(["24:00-08:00", "", ...days.map((day) => (day ? text(day.night[0]) : ""))]);
    rows.push(["", "", ...blanks()], ["", "", ...blanks()]);
  });
  return rows;
}

/** Excel/Sheets formül enjeksiyonunu ve bozuk tırnakları engeller. */
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function copySheet() {
  const plan = activePlan();
  if (!plan) {
    alert("Önce liste oluşturun.");
    return;
  }
  const tsv = weekRows(plan).map((row) => row.join("\t")).join("\n");
  $("#copy-open").href = sheetUrl();
  $("#copy-fallback").hidden = true;
  const done = () => copyStatus(`Panoya kopyalandı: ${tsv.split("\n").length} satır. "E-Tablo'yu aç" → A1 hücresi → Ctrl+Shift+V (yalnız değerler) yapıştır.`);
  copyStatus("Kopyalanıyor…");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(tsv).then(done).catch(() => {
      if (fallbackCopy(tsv)) done();
      else showCopyFallback(tsv);
    });
    return;
  }
  if (fallbackCopy(tsv)) done();
  else showCopyFallback(tsv);
}

function fallbackCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.focus();
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  area.remove();
  return ok;
}

function showCopyFallback(text) {
  $("#copy-text").value = text;
  $("#copy-open").href = sheetUrl();
  $("#copy-fallback").hidden = false;
  $("#copy-text").focus();
  $("#copy-text").select();
  copyStatus("Panoya kopyalanamadı — aşağıdaki metni elle kopyalayın.", true);
}

function csv() {
  const plan = activePlan();
  if (!plan) {
    alert("Önce liste oluşturun.");
    return;
  }
  const rows = weekRows(plan);
  const text = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  download(`nobet-${plan.year}-${plan.month}.csv`, new Blob([text], { type: "text/csv;charset=utf-8" }));
}

/* ---------- Olaylar ---------- */
const printDetailsState = () => document.querySelectorAll("details.panel");
let printOpenState = null;

months.forEach((monthName, index) => $("#month").insertAdjacentHTML("beforeend", `<option value="${index + 1}">${esc(monthName)}</option>`));

$("#year").onchange = (event) => {
  const year = Number(event.target.value);
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    event.target.value = state.year;
    return;
  }
  state.year = year;
  persist();
  render();
};

$("#month").onchange = (event) => {
  const month = Number(event.target.value);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    event.target.value = state.month;
    return;
  }
  state.month = month;
  persist();
  render();
};

$("#add-staff").onclick = () => {
  state.staff.push({ id: uid(), name: "Yeni personel", gender: "female", night: true });
  state.staff.sort(byName);
  persist();
  render();
};

$("#sample-staff").onclick = () => {
  const existing = new Set(state.staff.map((person) => person.name));
  const additions = sampleStaff().filter((person) => !existing.has(person.name));
  if (!additions.length) {
    copyStatus("Örnek kadro zaten ekli.", true);
    return;
  }
  state.staff.push(...additions);
  state.staff.sort(byName);
  persist();
  render();
  copyStatus(`${additions.length} örnek personel eklendi; adları düzenleyin veya silin.`);
};

$("#leave-form").onsubmit = (event) => {
  event.preventDefault();
  const start = $("#leave-start").value;
  const end = $("#leave-end").value || start;
  const staffId = $("#leave-staff").value;
  if (!start || !staffId) return;
  if (end < start) {
    alert("Bitiş tarihi başlangıçtan önce olamaz.");
    return;
  }
  state.leaves.push({ id: uid(), staffId, start, end });
  persist();
  render();
};

$("#generate").onclick = () => {
  if (!state.staff.length) {
    alert("Önce personel ekleyin veya bir yedek içe aktarın.");
    return;
  }
  if (!autoStaff().length) {
    alert("Otomatik atama için uygun personel yok (Radyoloji Sorumlusu rotasyona girmez).");
    return;
  }
  if (state.plan && !confirm("Liste yeniden üretilecek; elle yazdığınız hücreler korunacak. Devam?")) return;
  generate();
};

$("#empty-plan").onclick = () => {
  if (state.plan && !confirm("Çizelge boşaltılacak; elle yazdıklarınız ve korumalar silinecek. Devam?")) return;
  emptyPlan();
};

$("#unlock-cells").onclick = () => {
  if (!Object.keys(state.locks).length) {
    copyStatus("Korunan hücre yok.");
    return;
  }
  if (!confirm("Elle yazılan hücrelerin koruması kaldırılacak. Devam?")) return;
  state.locks = {};
  persist();
  copyStatus("Manuel hücre koruması kaldırıldı; sonraki üretim tüm hücreleri doldurur.");
};

$("#print-plan").onclick = () => window.print();

window.onbeforeprint = () => {
  const panels = printDetailsState();
  printOpenState = [...panels].map((panel) => panel.open);
  panels.forEach((panel) => {
    panel.open = true;
  });
};

window.onafterprint = () => {
  if (!printOpenState) return;
  printDetailsState().forEach((panel, index) => {
    if (printOpenState[index] !== undefined) panel.open = printOpenState[index];
  });
  printOpenState = null;
};

$("#daily-hours").onchange = (event) => {
  state.dailyHours = Number(event.target.value) || DEFAULT_DAILY_HOURS;
  persist();
  renderHours();
};

$("#shift-hours").onchange = (event) => {
  state.shiftHours = Number(event.target.value) || DEFAULT_SHIFT_HOURS;
  persist();
  renderHours();
};

$("#approve-forced").onchange = (event) => {
  if (state.plan) {
    state.plan.approved = event.target.checked;
    persist();
  }
};

$("#download-csv").onclick = csv;
$("#copy-sheet").onclick = copySheet;
$("#copy-retry").onclick = copySheet;

$("#export-data").onclick = () => {
  download("nobet-listesi-yedek.json", new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }));
};

$("#import-data").onchange = (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let next;
    try {
      next = normalizeState(JSON.parse(String(reader.result)));
    } catch (error) {
      alert(`Dosya okunamadı: ${error.message || "geçersiz yedek"}. Mevcut verileriniz korundu.`);
      copyStatus("İçe aktarma başarısız; mevcut veriler korundu.", true);
      return;
    }
    state = next;
    persist();
    render();
    copyStatus(`Yedek içe aktarıldı: ${state.staff.length} personel, ${state.leaves.length} izin kaydı.`);
  };
  reader.onerror = () => alert("Dosya okunamadı.");
  reader.readAsText(file);
};

$("#theme-toggle").onclick = () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");

// İlk açılışta kısa tanıtım turu; "nobet-tour" kaydı varsa bir daha gösterilmez.
const tourSteps = [
  { target: ".period", title: "Yıl ve ay", text: "Önce yılı ve ayı seçin, sonra \"Liste oluştur\"a basın. Kadro, izin ve dinlenme kuralları otomatik uygulanır." },
  { target: "#schedule", title: "Çizelge", text: "Her hücre bir açılır listedir; elle değiştirdiğiniz veya boşalttığınız hücreler sonraki üretimde korunur." },
  { target: ".modality-panel", title: "Modalite özeti", text: "Kişi başına MR, BT, RÖNT-PORT, RÖNTGEN ve RÖNT-MAMO dağılımı; MAMO kadınlar arasında eşit paylaşılır." },
  { target: ".schedule-actions", title: "E-Tablo'ya aktar", text: "Çizelgeyi panoya kopyalar; Google E-Tablo'da A1 hücresine Ctrl+Shift+V ile yapıştırın." }
];
let tourIndex = 0;
const tourSpot = () => document.querySelectorAll(".tour-spot");
const showTourStep = (index) => {
  tourIndex = index;
  const step = tourSteps[index];
  $("#tour-step").textContent = `${index + 1} / ${tourSteps.length}`;
  $("#tour-title").textContent = step.title;
  $("#tour-text").textContent = step.text;
  $("#tour-next").textContent = index === tourSteps.length - 1 ? "Bitir" : "Sonraki";
  tourSpot().forEach((element) => element.classList?.remove?.("tour-spot"));
  const target = $(step.target);
  if (target) {
    if (target.matches?.("details")) target.open = true;
    target.classList?.add?.("tour-spot");
    target.scrollIntoView?.({ block: "center" });
  }
  $("#tour").hidden = false;
};
const endTour = () => {
  $("#tour").hidden = true;
  tourSpot().forEach((element) => element.classList?.remove?.("tour-spot"));
  localStorage.setItem("nobet-tour", "1");
};
$("#tour-next").onclick = () => (tourIndex === tourSteps.length - 1 ? endTour() : showTourStep(tourIndex + 1));
$("#tour-skip").onclick = endTour;
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#tour").hidden) endTour();
});
if (!localStorage.getItem("nobet-tour")) showTourStep(0);

applyTheme(document.documentElement.dataset.theme || "light");
render();
