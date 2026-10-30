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
      var a = new Audio(srcs[key]);
      a.preload = 'auto';
      players[key] = a;
    });
    var keys = Object.keys(players);
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
