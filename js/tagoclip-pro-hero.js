// Hero animation for /tagoclip-pro: the real plugin UI (demos/tagoclip-pro-ui,
// a plain-browser build of TagoClipPro/ui) driven by a timeline through the
// UI's own mock seam, window.__tagoMock. The scope inside the iframe is the
// UI's synthetic drum loop run through JS copies of the real curves, so what
// moves on screen follows the knob values. It is a demo, not engine output.
//
// Everything hangs on TIMELINE: one row per parameter, keyframes as
// [seconds, value]. Changing the choreography means editing numbers here.
(function () {
  "use strict";

  var LOOP_S = 20;

  // Parameter ids and ranges from TagoClipPro/ui/src/params.ts.
  // curve: 0 fruity, 1 brick, 2 silky. ceiling: above 0.05 means off.
  // mono_low: normalised 0..1, 20 * 20^v Hz, below 0.03 is off.
  var TIMELINE = {
    drive_db:        [[0, 0], [1.0, 0], [4.0, 5], [16.5, 5], [19.0, 0]],
    threshold_steps: [[0, 100], [4.5, 100], [6.5, 92], [16.5, 92], [19.0, 100]],
    curve:           [[0, 0], [7.0, 1], [9.0, 2], [11.0, 0]],
    ceiling:         [[0, 0.1], [11.5, 0.1], [11.6, -0.2], [13.5, -1.0], [16.5, -1.0], [18.5, -0.2], [18.6, 0.1]],
    mono_low:        [[0, 0], [14.0, 0], [15.5, 0.6], [16.5, 0.6], [18.5, 0]]
  };
  // Rows that jump instead of gliding (choice parameters).
  var STEPPED = { curve: true };
  // Frame shown when motion is reduced: everything engaged.
  var STILL_T = 15.8;

  function ease(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }

  function valueAt(keys, t, stepped) {
    if (t <= keys[0][0]) return keys[0][1];
    for (var i = 1; i < keys.length; i++) {
      var a = keys[i - 1], b = keys[i];
      if (t < b[0]) {
        if (stepped) return a[1];
        return a[1] + (b[1] - a[1]) * ease((t - a[0]) / (b[0] - a[0]));
      }
    }
    return keys[keys.length - 1][1];
  }

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // One loop per demo frame: #tb-pro-ui on the product page, any
  // iframe[data-tb-pro-demo] elsewhere (the home page). On the home page the
  // dc-runtime renders the frame after this script runs and may replace it
  // after hydration, so frames are picked up by a scan, not once at load.
  function attach(frame) {
  function boot() {
    var w = frame.contentWindow;
    var m = w && w.__tagoMock;
    if (!frame.isConnected) return;
    if (!m || !m.params || !m.params.drive_db) { setTimeout(boot, 100); return; }

    var last = {};
    function apply(t) {
      for (var id in TIMELINE) {
        var p = m.params[id];
        if (!p) continue;
        // Continuous on purpose, also for threshold (integer steps in the
        // plugin) and ceiling (0.1 dB steps): rounded, the knobs climbed in
        // visible stairs. The readouts round for display on their own.
        var v = valueAt(TIMELINE[id], t, !!STEPPED[id]);
        if (last[id] !== v) { p.setScaled(v); last[id] = v; }
      }
    }

    // Meters: derived from the same scope columns the UI draws, so the bars
    // and the waveform never disagree. Six numbers per bin: inMax, inMin,
    // outMax, outMin, outRms, tpGrDb. "in" is after drive, the meter wants
    // the plugin input, so drive comes back off.
    var peakIn = 0, peakOut = 0;
    m.scopeListeners.add(function (bins) {
      for (var i = 0; i + 5 < bins.length; i += 6) {
        peakIn = Math.max(peakIn, Math.abs(bins[i]), Math.abs(bins[i + 1]));
        peakOut = Math.max(peakOut, Math.abs(bins[i + 2]), Math.abs(bins[i + 3]));
      }
    });
    function db(x) { return x > 1e-6 ? 20 * Math.log10(x) : -120; }
    function pushLevels() {
      var drive = m.params.drive_db.getScaled();
      var ceil = m.params.ceiling.getScaled();
      var inDb = db(peakIn) - drive;
      var outDb = db(peakOut);
      var tp = ceil > 0.05 ? outDb : Math.min(outDb, ceil);
      m.levels({ in: Math.pow(10, inDb / 20), out: Math.pow(10, Math.min(outDb, tp) / 20), gr: Math.min(0, outDb - db(peakIn)), tp: tp });
      peakIn = 0; peakOut = 0;
    }

    if (reduced) { apply(STILL_T); return; }

    var visible = true, start = performance.now(), pausedAt = 0, raf = 0, levelTimer = 0;
    function tick(now) {
      apply(((now - start) / 1000) % LOOP_S);
      raf = requestAnimationFrame(tick);
    }
    function run() {
      if (raf) return;
      start += performance.now() - (pausedAt || performance.now());
      raf = requestAnimationFrame(tick);
      levelTimer = setInterval(pushLevels, 33);
    }
    function stop() {
      if (!raf) return;
      cancelAnimationFrame(raf); raf = 0;
      clearInterval(levelTimer);
      pausedAt = performance.now();
    }
    function sync() { (visible && !document.hidden) ? run() : stop(); }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; sync(); }).observe(frame);
    }
    document.addEventListener("visibilitychange", sync);
    sync();
  }

  boot();
  }

  function scan() {
    var frames = document.querySelectorAll("#tb-pro-ui, iframe[data-tb-pro-demo]");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].__tbBooted) continue;
      frames[i].__tbBooted = true;
      attach(frames[i]);
    }
  }
  scan();
  setInterval(scan, 1000);
})();
