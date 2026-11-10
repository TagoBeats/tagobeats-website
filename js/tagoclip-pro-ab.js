(function () {
  // A/B player, same approach as /tagoclip: one play button, every variant
  // plays in lockstep and the chips only flip the mute flags, so switching
  // keeps the exact playback position and the curve is the only change.
  var SOURCES = {
    master: {
      dry: 'uploads_opt/audio/tagoclip-pro_dry.mp3',
      fruity: 'uploads_opt/audio/tagoclip-pro_fruity.mp3',
      silky: 'uploads_opt/audio/tagoclip-pro_silky.mp3',
      brick: 'uploads_opt/audio/tagoclip-pro_brick.mp3'
    }
  };

  document.querySelectorAll('[data-ab-player]').forEach(function (root) {
    var srcs = SOURCES[root.getAttribute('data-ab-id')];
    if (!srcs) return;
    var players = {};
    Object.keys(srcs).forEach(function (key) {
      // No source yet: new Audio(src) makes the browser fetch every file on
      // page load, played or not. arm() below hands the files over.
      var a = new Audio();
      a.preload = 'auto';
      players[key] = a;
    });
    var keys = Object.keys(players);
    // The files are fetched once the player is near the screen and the visitor
    // has done anything at all (scroll, touch, mouse, key), or on the first
    // press of play. Someone who opens the page and leaves pays nothing.
    var armed = false;
    function arm() {
      if (armed) return;
      armed = true;
      keys.forEach(function (k) { players[k].src = srcs[k]; });
    }
    var near = !('IntersectionObserver' in window), touched = false;
    function maybeArm() { if (near && touched) arm(); }
    if (!near) {
      var armIo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        near = true;
        armIo.disconnect();
        maybeArm();
      }, { rootMargin: '200px 0px' });
      armIo.observe(root);
    }
    ['scroll', 'pointerdown', 'pointermove', 'touchstart', 'keydown'].forEach(function (type) {
      window.addEventListener(type, function () { touched = true; maybeArm(); }, { once: true, passive: true });
    });
    var current = keys[0];
    var playing = false;
    var playBtn = root.querySelector('[data-ab-play]');
    var iconPlay = root.querySelector('[data-ab-icon-play]');
    var iconPause = root.querySelector('[data-ab-icon-pause]');
    var bar = root.querySelector('[data-ab-bar]');

    function applyMutes() {
      keys.forEach(function (k) { players[k].muted = (k !== current); });
    }

    function setIcon() {
      iconPlay.style.display = playing ? 'none' : 'block';
      iconPause.style.display = playing ? 'block' : 'none';
    }

    // Four elements drift apart over time; pull the others back onto the
    // audible one when they are off by more than a few milliseconds.
    function resync() {
      var t = players[current].currentTime;
      keys.forEach(function (k) {
        if (k !== current && Math.abs(players[k].currentTime - t) > 0.03) players[k].currentTime = t;
      });
    }

    function tick() {
      var a = players[current];
      if (a.duration) bar.style.width = (a.currentTime / a.duration * 100) + '%';
      if (playing) requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', function () {
      if (playing) {
        keys.forEach(function (k) { players[k].pause(); });
        playing = false;
      } else {
        arm();
        applyMutes();
        resync();
        keys.forEach(function (k) { players[k].play(); });
        playing = true;
        requestAnimationFrame(tick);
      }
      setIcon();
    });

    players[current].addEventListener('ended', function () {
      playing = false;
      keys.forEach(function (k) {
        players[k].pause();
        players[k].currentTime = 0;
      });
      bar.style.width = '0%';
      setIcon();
    });

    root.querySelectorAll('.tb-ab-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var next = chip.getAttribute('data-variant');
        if (next === current) return;
        current = next;
        resync();
        applyMutes();
        root.querySelectorAll('.tb-ab-chip').forEach(function (c) {
          c.setAttribute('data-active', c === chip ? '1' : '0');
        });
      });
    });
  });
})();
