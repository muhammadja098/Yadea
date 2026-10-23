(function () {
  // mobile nav
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('mainnav');
  if (toggle && nav) toggle.addEventListener('click', function () { nav.classList.toggle('open'); });

  // hero slider
  var hero = document.querySelector('.hero');
  if (hero) {
    var slides = hero.querySelectorAll('.slide');
    var dots = hero.querySelectorAll('.hero-dots button');
    var i = 0, timer;
    function show(n) {
      if (!slides.length) return;
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
      dots.forEach(function (d, k) { d.classList.toggle('active', k === i); });
    }
    function play() { timer = setInterval(function () { show(i + 1); }, 6000); }
    function reset() { clearInterval(timer); play(); }
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); reset(); }); });
    var prev = hero.querySelector('.hero-nav .prev'), next = hero.querySelector('.hero-nav .next');
    if (prev) prev.addEventListener('click', function () { show(i - 1); reset(); });
    if (next) next.addEventListener('click', function () { show(i + 1); reset(); });
    show(0); play();
  }

  // tabs
  document.querySelectorAll('[data-tabs]').forEach(function (wrap) {
    var btns = wrap.querySelectorAll('.tabs button');
    var panels = wrap.querySelectorAll('.tab-panel');
    btns.forEach(function (b, k) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        b.classList.add('active');
        if (panels[k]) panels[k].classList.add('active');
      });
    });
  });

  // product gallery thumbs
  var main = document.getElementById('galleryMain');
  document.querySelectorAll('.pdp .thumbs img').forEach(function (t) {
    t.addEventListener('click', function () {
      if (main) main.src = t.src;
      document.querySelectorAll('.pdp .thumbs img').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
    });
  });

  // dealer filter (client side)
  var dl = document.getElementById('dealerList');
  if (dl) {
    var inputs = document.querySelectorAll('[data-dealer-filter]');
    function filter() {
      var q = (document.getElementById('dQ') || {}).value || '';
      var city = (document.getElementById('dCity') || {}).value || '';
      q = q.toLowerCase();
      var shown = 0;
      dl.querySelectorAll('.dealer-card').forEach(function (c) {
        var okQ = !q || c.dataset.search.indexOf(q) !== -1;
        var okC = !city || c.dataset.city === city;
        var vis = okQ && okC;
        c.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      var out = document.getElementById('dealerCount');
      if (out) out.textContent = shown;
    }
    inputs.forEach(function (el) { el.addEventListener('input', filter); el.addEventListener('change', filter); });
  }
})();
