// TagoClip Pro teaser for the free plugin pages: a slim bar on top of every
// page view, plus a clickable card with the animated Pro UI wherever the page
// has <div data-tb-pro-teaser="tagoclip|tagopitch"></div>.
// Load it before js/tagoclip-pro-hero.js (both deferred), so the hero script
// finds the card's iframe[data-tb-pro-demo] and animates it.
(function () {
  "use strict";

  // End of the Moonbase "Launch price" discount (4.12. US west coast). Sale
  // wording disappears on its own after that. Keep in step with
  // js/tagoclip-pro-cta.js and the "-40%" text there.
  var INTRO_END = Date.parse("2026-12-05T08:00:00Z");
  var left = INTRO_END - Date.now();
  var sale = left > 0;
  // Names the date instead of counting days, same as js/tagoclip-pro-cta.js.
  var daysText = left <= 86400000 ? "LAST DAY" : "ENDS DEC 4";

  var css = [
    ".tbt-bar{position:fixed;top:0;left:0;right:0;z-index:60;height:38px;display:flex;align-items:center;justify-content:center;gap:12px;padding:0 16px;background:#0E0D0C;border-bottom:1px solid rgba(0,253,220,0.28);font:500 11px/1 'Space Mono','Martian Mono',ui-monospace,monospace;letter-spacing:0.16em;color:#ECE7DE;text-decoration:none;white-space:nowrap;overflow:hidden}",
    ".tbt-bar:hover .tbt-arrow{transform:translateX(4px)}",
    ".tbt-new{padding:4px 7px;border-radius:2px;background:#00FDDC;color:#0A0908;font-weight:700;letter-spacing:0.12em}",
    ".tbt-bar b{font-weight:700;color:#00FDDC}",
    ".tbt-dim{color:rgba(236,231,222,0.55)}",
    ".tbt-arrow{color:#00FDDC;transition:transform .2s}",
    // Push the fixed nav below the bar.
    "body.tbt-has-bar nav{top:38px!important}",
    "@media (max-width:640px){.tbt-long{display:none}.tbt-bar{gap:9px;font-size:10px;letter-spacing:0.12em}}",

    ".tbt-card{display:flex;align-items:stretch;max-width:1100px;margin:clamp(48px,8vh,84px) auto 0;border-radius:12px;overflow:hidden;text-decoration:none;color:inherit;background:linear-gradient(160deg,#1E1B18,#141210);box-shadow:0 0 0 1px rgba(0,253,220,0.22),0 40px 90px -40px rgba(0,0,0,0.95);transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s}",
    ".tbt-card:hover{transform:translateY(-4px);box-shadow:0 0 0 1px rgba(0,253,220,0.5),0 46px 100px -40px rgba(0,0,0,0.95)}",
    ".tbt-ui{position:relative;flex:0 0 58%;aspect-ratio:1000/520;background:#0E0D0C}",
    ".tbt-ui iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}",
    ".tbt-copy{flex:1;min-width:0;padding:clamp(22px,3vw,36px);display:flex;flex-direction:column;justify-content:center}",
    ".tbt-eb{font:500 11px/1 'Space Mono','Martian Mono',ui-monospace,monospace;letter-spacing:0.24em;color:#00FDDC;margin-bottom:12px}",
    ".tbt-copy h2{margin:0 0 6px;font-size:clamp(28px,3vw,38px);font-weight:800;letter-spacing:-0.03em;line-height:0.95;color:#F2EEE6}",
    ".tbt-copy h2 span{color:#00FDDC}",
    ".tbt-tag{margin:0 0 10px;font-size:clamp(17px,1.6vw,20px);font-weight:700;color:#F2EEE6}",
    ".tbt-copy p{margin:0;font-size:15px;line-height:1.55;color:rgba(236,231,222,0.6)}",
    ".tbt-sale{display:inline-flex;align-self:flex-start;margin-top:16px;border:1px solid rgba(0,253,220,0.55);border-radius:3px;overflow:hidden;font:500 10px/1 'Space Mono','Martian Mono',ui-monospace,monospace;letter-spacing:0.16em;white-space:nowrap}",
    ".tbt-sale span{padding:7px 9px}",
    ".tbt-sale span:first-child{background:rgba(0,253,220,0.14);border-right:1px solid rgba(0,253,220,0.55);color:#00FDDC;font-weight:700;letter-spacing:0.04em}",
    ".tbt-sale span:last-child{color:#ECE7DE}",
    ".tbt-btn{align-self:flex-start;margin-top:18px;display:inline-flex;align-items:center;gap:10px;padding:15px 22px;border-radius:2px;background:#00FDDC;color:#0A0908;font-weight:800;font-size:13px;letter-spacing:0.1em;white-space:nowrap}",
    ".tbt-card:hover .tbt-btn span{transform:translateX(4px)}",
    ".tbt-btn span{transition:transform .2s}",
    "@media (max-width:820px){.tbt-card{flex-direction:column}.tbt-ui{flex:none;width:100%}}",

    // Motion, so the teaser is not missed. All of it stops under reduced motion.
    // Bar: a light sweep every few seconds, the NEW pill breathes.
    "@keyframes tbt-sweep{0%,70%{transform:translateX(-120%) skewX(-20deg)}100%{transform:translateX(320%) skewX(-20deg)}}",
    ".tbt-bar::after{content:'';position:absolute;top:0;bottom:0;left:0;width:30%;background:linear-gradient(90deg,transparent,rgba(0,253,220,0.22),transparent);animation:tbt-sweep 5s ease-in-out infinite;pointer-events:none}",
    "@keyframes tbt-pulse{0%,100%{box-shadow:0 0 0 0 rgba(0,253,220,0.55)}50%{box-shadow:0 0 0 5px rgba(0,253,220,0)}}",
    ".tbt-new{animation:tbt-pulse 2s ease-out infinite}",
    // Card: a teal light travelling around the edge.
    "@property --tbt-a{syntax:'<angle>';inherits:false;initial-value:0deg}",
    "@keyframes tbt-spin{to{--tbt-a:360deg}}",
    ".tbt-card{position:relative}",
    ".tbt-card::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--tbt-a),transparent 0deg,rgba(0,253,220,0.95) 50deg,transparent 110deg,transparent 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:tbt-spin 4.5s linear infinite;pointer-events:none;z-index:2}",
    // ...and the card breathes a teal glow (a blurred pseudo element would be
    // clipped by overflow:hidden, so this runs on the card's own shadow).
    "@keyframes tbt-glow{0%,100%{box-shadow:0 0 0 1px rgba(0,253,220,0.22),0 40px 90px -40px rgba(0,0,0,0.95),0 0 0 0 rgba(0,253,220,0)}50%{box-shadow:0 0 0 1px rgba(0,253,220,0.4),0 40px 90px -40px rgba(0,0,0,0.95),0 0 46px -6px rgba(0,253,220,0.38)}}",
    ".tbt-card{animation:tbt-glow 4.5s ease-in-out infinite}",
    // Entrance when it scrolls into view.
    ".tbt-card.tbt-pre{opacity:0;transform:translateY(28px)}",
    ".tbt-card.tbt-in{animation:tbt-in .9s cubic-bezier(.2,.8,.2,1) both,tbt-glow 4.5s ease-in-out .9s infinite}",
    "@keyframes tbt-in{0%{opacity:0;transform:translateY(28px)}60%{opacity:1;box-shadow:0 0 0 1px rgba(0,253,220,0.9),0 0 60px 0 rgba(0,253,220,0.35)}100%{opacity:1;transform:none}}",
    // Button: the same light sweep as the buy buttons on the Pro page.
    ".tbt-btn{position:relative;overflow:hidden;box-shadow:0 18px 40px -18px rgba(0,253,220,0.7)}",
    ".tbt-btn::before{content:'';position:absolute;top:0;bottom:0;left:0;width:40%;background:linear-gradient(120deg,transparent,rgba(255,255,255,.65),transparent);animation:tbt-sweep 4s ease-in-out 1s infinite;pointer-events:none}",

    "@media (prefers-reduced-motion:reduce){.tbt-card,.tbt-arrow,.tbt-btn span{transition:none}.tbt-bar::after,.tbt-btn::before,.tbt-card::before,.tbt-new,.tbt-card,.tbt-card.tbt-in{animation:none}.tbt-card.tbt-pre{opacity:1;transform:none}}"
  ].join("\n");

  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Bar
  var bar = document.createElement("a");
  bar.className = "tbt-bar";
  bar.href = "/tagoclip-pro";
  bar.innerHTML =
    '<span class="tbt-new">NEW</span>' +
    '<span>TAGOCLIP PRO IS OUT<span class="tbt-long tbt-dim"> · THE FL CLIPPER, EVERYWHERE</span></span>' +
    (sale ? '<span class="tbt-dim">·</span><b>−40%</b><span class="tbt-long tbt-dim">LAUNCH PRICE</span>' : "") +
    '<span class="tbt-arrow">→</span>';
  document.body.insertBefore(bar, document.body.firstChild);
  document.body.classList.add("tbt-has-bar");

  // Card
  var COPY = {
    tagoclip: "Everything you like about TagoClip, on a new engine: anti-aliased clipping that measures cleaner than the free 8x mode, a true peak ceiling and level-matched auto gain.",
    tagopitch: "From the maker of TagoPitch: the FL soft clip sound in every DAW, with a true peak ceiling and level-matched auto gain."
  };
  var slot = document.querySelector("[data-tb-pro-teaser]");
  if (slot) {
    var variant = slot.getAttribute("data-tb-pro-teaser");
    slot.outerHTML =
      '<a class="tbt-card" href="/tagoclip-pro" aria-label="TagoClip Pro, the FL clipper, everywhere">' +
        '<div class="tbt-ui"><iframe data-tb-pro-demo src="demos/tagoclip-pro-ui/index.html?embed=1" title="TagoClip Pro interface" tabindex="-1" aria-hidden="true" loading="lazy"></iframe></div>' +
        '<div class="tbt-copy">' +
          '<div class="tbt-eb">NEW · TAGO PLUGINS · PRO</div>' +
          '<h2>TagoClip <span>Pro</span></h2>' +
          '<div class="tbt-tag">The FL clipper, everywhere.</div>' +
          '<p>' + (COPY[variant] || COPY.tagoclip) + '</p>' +
          (sale ? '<div class="tbt-sale"><span>−40%</span><span>LAUNCH PRICE · ' + daysText + '</span></div>' : "") +
          '<span class="tbt-btn">SEE TAGOCLIP PRO <span>→</span></span>' +
        '</div>' +
      '</a>';

    // Slide in the first time the card reaches the viewport. Without
    // IntersectionObserver it simply stays visible.
    var card = document.querySelector(".tbt-card");
    if (card && "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      card.classList.add("tbt-pre");
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        card.classList.remove("tbt-pre");
        card.classList.add("tbt-in");
        io.disconnect();
      }, { threshold: 0.25 });
      io.observe(card);
    }
  }
})();
