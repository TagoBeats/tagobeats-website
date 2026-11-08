// Floating feedback button for the plugin pages. Include with
//   <script src="js/tago-feedback.js" data-product="tagoclip-pro" defer></script>
// data-product preselects the plugin (tagoclip-pro, tagoclip, tagopitch).
// Posts to /api/feedback. Brings its own styles, so it looks the same on every
// page. Clicks are handled by delegation on the document, the same pattern as
// the other scripts on this site.
(function () {
  "use strict";

  var script = document.currentScript;
  var preset = (script && script.getAttribute("data-product")) || "other";

  var css = [
    ".tbf-btn{position:fixed;z-index:70;left:16px;bottom:calc(16px + env(safe-area-inset-bottom));display:flex;align-items:center;gap:8px;padding:11px 14px;border-radius:999px;border:1px solid rgba(236,231,222,0.18);background:rgba(20,18,16,0.96);color:#ECE7DE;font:500 10.5px/1 'Martian Mono',ui-monospace,monospace;letter-spacing:0.16em;cursor:pointer;box-shadow:0 14px 34px -14px rgba(0,0,0,0.9);transition:border-color .2s,color .2s,bottom .4s cubic-bezier(.2,.8,.2,1)}",
    ".tbf-btn:hover{border-color:#00FDDC;color:#00FDDC}",
    ".tbf-btn i{width:6px;height:6px;border-radius:50%;background:#00FDDC;box-shadow:0 0 8px rgba(0,253,220,0.8)}",
    // On the Pro page the sticky buy bar sits at the bottom on phones: move up.
    "@media (max-width:900px){.tb-sticky-on .tbf-btn{bottom:calc(92px + env(safe-area-inset-bottom))}}",
    ".tbf-panel{position:fixed;z-index:71;left:16px;bottom:calc(68px + env(safe-area-inset-bottom));width:min(360px,calc(100vw - 32px));padding:20px;border-radius:12px;background:linear-gradient(160deg,#221F1B,#141210);box-shadow:0 0 0 1px rgba(236,231,222,0.12),0 30px 70px -20px rgba(0,0,0,0.95);font-family:'Archivo',system-ui,sans-serif;color:#ECE7DE;opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity .25s,transform .25s}",
    ".tbf-open .tbf-panel{opacity:1;transform:none;pointer-events:auto}",
    "@media (max-width:900px){.tb-sticky-on .tbf-panel{bottom:calc(144px + env(safe-area-inset-bottom))}}",
    ".tbf-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}",
    ".tbf-head b{font:500 10.5px/1 'Martian Mono',ui-monospace,monospace;letter-spacing:0.2em;color:#00FDDC}",
    ".tbf-x{background:none;border:0;color:rgba(236,231,222,0.5);font-size:20px;line-height:1;cursor:pointer;padding:0 2px}",
    ".tbf-sub{margin:0 0 14px;font-size:13.5px;line-height:1.5;color:rgba(236,231,222,0.62)}",
    ".tbf-panel select,.tbf-panel textarea,.tbf-panel input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;border-radius:4px;border:1px solid rgba(236,231,222,0.14);background:#0E0D0C;color:#ECE7DE;font:15px/1.45 'Archivo',system-ui,sans-serif}",
    ".tbf-panel textarea{min-height:96px;resize:vertical}",
    ".tbf-panel select:focus,.tbf-panel textarea:focus,.tbf-panel input:focus{outline:none;border-color:rgba(0,253,220,0.6)}",
    ".tbf-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;opacity:0}",
    ".tbf-send{width:100%;padding:14px;border:0;border-radius:3px;background:#00FDDC;color:#0A0908;font:800 13px/1 'Archivo',system-ui,sans-serif;letter-spacing:0.12em;cursor:pointer}",
    ".tbf-send[disabled]{opacity:.5;cursor:default}",
    ".tbf-msg{margin:10px 0 0;font:500 11px/1.5 'Martian Mono',ui-monospace,monospace;letter-spacing:0.08em;color:rgba(236,231,222,0.62)}",
    ".tbf-msg.ok{color:#00FDDC}.tbf-msg.err{color:#ECE7DE}",
    "@media (prefers-reduced-motion:reduce){.tbf-btn,.tbf-panel{transition:none}}"
  ].join("\n");

  var opts = [["tagoclip-pro", "TagoClip Pro"], ["tagoclip", "TagoClip"], ["tagopitch", "TagoPitch"], ["other", "Something else"]]
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === preset ? " selected" : "") + ">" + o[1] + "</option>"; })
    .join("");

  var root = document.createElement("div");
  root.className = "tbf";
  root.innerHTML =
    '<style>' + css + '</style>' +
    '<button type="button" class="tbf-btn" aria-expanded="false" aria-controls="tbf-panel"><i></i>FEEDBACK</button>' +
    '<form class="tbf-panel" id="tbf-panel" role="dialog" aria-label="Send feedback" novalidate>' +
      '<div class="tbf-head"><b>FEEDBACK</b><button type="button" class="tbf-x" aria-label="Close">×</button></div>' +
      '<p class="tbf-sub">Bug, idea, or just how it sounds. Every message reaches me directly.</p>' +
      '<select name="product" aria-label="Plugin">' + opts + '</select>' +
      '<textarea name="message" required maxlength="2000" placeholder="What\'s on your mind?" aria-label="Message"></textarea>' +
      '<input type="email" name="email" placeholder="Email, only if you want a reply" aria-label="Email (optional)" autocomplete="email">' +
      '<input type="text" name="website" class="tbf-hp" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button type="submit" class="tbf-send">SEND</button>' +
      '<p class="tbf-msg" aria-live="polite"></p>' +
    '</form>';
  document.body.appendChild(root);

  var btn = root.querySelector(".tbf-btn");
  var form = root.querySelector(".tbf-panel");
  var msg = root.querySelector(".tbf-msg");

  function setOpen(open) {
    root.classList.toggle("tbf-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) setTimeout(function () { form.message.focus(); }, 50);
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest(".tbf-btn")) { setOpen(!root.classList.contains("tbf-open")); return; }
    if (e.target.closest(".tbf-x")) { setOpen(false); return; }
    if (root.classList.contains("tbf-open") && !e.target.closest(".tbf")) setOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && root.classList.contains("tbf-open")) setOpen(false);
  });

  document.addEventListener("submit", function (e) {
    if (e.target !== form) return;
    e.preventDefault();
    var send = form.querySelector(".tbf-send");
    msg.className = "tbf-msg";
    if (form.message.value.trim().length < 3) { msg.textContent = "Write a few words first."; return; }
    send.disabled = true;
    msg.textContent = "Sending…";
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: form.product.value,
        message: form.message.value,
        email: form.email.value,
        website: form.website.value,
        page: location.pathname
      })
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; });
    }).then(function (res) {
      if (!res.ok) throw new Error(res.d.error || "Could not send.");
      form.message.value = "";
      msg.className = "tbf-msg ok";
      msg.textContent = form.email.value ? "Got it, thanks. I'll get back to you." : "Got it, thanks!";
      setTimeout(function () { setOpen(false); msg.textContent = ""; }, 2600);
    }).catch(function (err) {
      msg.className = "tbf-msg err";
      msg.textContent = (err && err.message) || "Could not send. Mail info@tagobeats.com instead.";
    }).then(function () { send.disabled = false; });
  });
})();
