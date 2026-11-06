export const MASTER_STORE_SLOTS = [
  { label: '9:00 AM – 11:00 AM', startHour: 9, endHour: 11 },
  { label: '11:00 AM – 1:00 PM', startHour: 11, endHour: 13 },
  { label: '2:00 PM – 4:00 PM', startHour: 14, endHour: 16 },
  { label: '4:00 PM – 6:00 PM', startHour: 16, endHour: 18 },
  { label: '6:00 PM – 8:00 PM', startHour: 18, endHour: 20 },
  { label: '8:00 PM – 10:00 PM', startHour: 20, endHour: 22 },
];

export function getDynamicScheduleDays(now = new Date()) {
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDec = currentHour + currentMinute / 60;

  // A slot is available today only if it starts at least 15 minutes in the future
  const todaySlots = MASTER_STORE_SLOTS
    .filter((slot) => currentDec < slot.startHour - 0.25)
    .map((s) => s.label);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = [];

  // Today (only if future slots are still open today)
  if (todaySlots.length > 0) {
    days.push({
      id: 'Today',
      dayLabel: 'Today',
      dateLabel: `${now.getDate()} ${monthNames[now.getMonth()]}`,
      slots: todaySlots,
    });
  }

  // Tomorrow (always all store operating slots)
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  days.push({
    id: 'Tomorrow',
    dayLabel: 'Tomorrow',
    dateLabel: `${tomorrow.getDate()} ${monthNames[tomorrow.getMonth()]}`,
    slots: MASTER_STORE_SLOTS.map((s) => s.label),
  });

  // Day 2
  const day2 = new Date(now);
  day2.setDate(now.getDate() + 2);
  const day2Name = dayNames[day2.getDay()];
  days.push({
    id: `${day2Name}, ${day2.getDate()} ${monthNames[day2.getMonth()]}`,
    dayLabel: day2Name,
    dateLabel: `${day2.getDate()} ${monthNames[day2.getMonth()]}`,
    slots: MASTER_STORE_SLOTS.map((s) => s.label),
  });

  // Day 3 (if today had no slots, keep 3 full days available)
  if (todaySlots.length === 0) {
    const day3 = new Date(now);
    day3.setDate(now.getDate() + 3);
    const day3Name = dayNames[day3.getDay()];
    days.push({
      id: `${day3Name}, ${day3.getDate()} ${monthNames[day3.getMonth()]}`,
      dayLabel: day3Name,
      dateLabel: `${day3.getDate()} ${monthNames[day3.getMonth()]}`,
      slots: MASTER_STORE_SLOTS.map((s) => s.label),
    });
  }

  return days;
}
