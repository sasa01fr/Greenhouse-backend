const { startWatering } = require("./hydroponicsController");

// Check schedule every minute
setInterval(() => {
  const now = new Date();
  const day = now.toLocaleString("en-us", { weekday: "long" }).toLowerCase();
  const time = now.toTimeString().slice(0, 5);

  if (!global.schedule?.enabled) return;
  const todaySlots = global.schedule.days?.[day] || [];

  todaySlots.forEach(slot => {
    if (slot.time === time) {
      console.log(`⏰ Auto-watering triggered for ${slot.duration}s`);
      startWatering({ body: { duration: slot.duration } }, { json: () => {} }, "auto");
    }
  });
}, 60000);
