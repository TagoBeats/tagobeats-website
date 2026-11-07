// Buy prompts on /tagoclip-pro. Counts down the days left on the intro price,
// and shows the sticky buy button (in the nav on desktop, as a bottom bar on
// phone and tablet) once the hero buttons are scrolled away, but never while
// another buy button is on screen.
(function () {
  "use strict";

  // End of the Moonbase discount "Launch price" (validity.to, 4.12. US west
  // coast). The labels only show while Moonbase reports has_discount, so this
  // date only feeds the count. Move it along if the discount moves.
  var INTRO_END = Date.parse("2026-12-05T08:00:00Z");
  var left = INTRO_END - Date.now();
  var days = Math.ceil(left / 86400000);
  document.querySelectorAll("[data-tb-days]").forEach(function (el) {
    if (left <= 0) { el.style.display = "none"; return; }
    el.textContent = days <= 1 ? "LAST DAY" : days + " DAYS LEFT";
  });

  var hero = document.getElementById("tb-herobuy");
  if (!hero || !("IntersectionObserver" in window)) return;

  // Every state change happens when one of these enters or leaves the
  // viewport, so the observer alone is enough, no scroll listener needed.
  var blockers = [hero].concat([].slice.call(document.querySelectorAll("[data-tb-hides-sticky]")));
  var visible = [];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var i = visible.indexOf(e.target);
      if (e.isIntersecting && i < 0) visible.push(e.target);
      if (!e.isIntersecting && i >= 0) visible.splice(i, 1);
    });
    var pastHero = hero.getBoundingClientRect().bottom < 0;
    document.body.classList.toggle("tb-sticky-on", pastHero && visible.length === 0);
  });
  blockers.forEach(function (el) { io.observe(el); });
})();
