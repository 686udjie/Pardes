/* Pardes app entry — initializes all modules on DOMContentLoaded */
document.addEventListener("DOMContentLoaded", function() {
  try {
    if (Pardes.Widgets) Pardes.Widgets.init();
  } catch (e) { console.error("Widgets init error", e); }

  try {
    if (Pardes.Customize) Pardes.Customize.init();
  } catch (e) { console.error("Customize init error", e); }

  try {
    if (Pardes.Background) Pardes.Background.init();
  } catch (e) { console.error("Background init error", e); }
});
