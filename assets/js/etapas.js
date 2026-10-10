/* ==========================================================================
   Método — motion "Etapas"
   Uma linha do tempo GSAP de 20 s, contada pela descida de uma criança no toboágua:
     gancho (0–3 s) → 01 (3–5,9) → 02 (5,9–8,6) → 03 (8,6–11,6) → 04 (11,6–14,6)
     → número (14,6–17,4) → assinatura (17,4–20)
   No site, o scroll controla o tempo (seção fixada, com suavização). Com ?render=etapas a página vira o
   palco do vídeo: motion/scripts/render-etapas.mjs avança quadro a quadro com window.__etapas.seek(t).
   16:9 e 9:16 usam a mesma linha do tempo; só o layout muda (CSS, @media max-aspect-ratio: 1/1).
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-etapas]");
  if (!root || typeof window.gsap === "undefined") return;
  var RENDER = /[?&]render=etapas\b/.test(location.search);
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!RENDER && (reduced || typeof window.ScrollTrigger === "undefined")) return;

  var et = root.querySelector("[data-et]");
  var $ = function (s) {
    return et.querySelector(s);
  };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || et).querySelectorAll(s));
  };

  root.classList.add("etapas--motion");
  if (RENDER) document.documentElement.classList.add("et-render");

  // textos das etapas: copiados da lista do site (uma fonte só para o conteúdo)
  var items = root.querySelectorAll(".etapas__steps li");
  $$("[data-et-step]").forEach(function (step, i) {
    var li = items[i];
    if (!li) return;
    var title = step.querySelector("[data-et-title]");
    li.querySelector("h3").textContent.trim().split(/\s+/).forEach(function (word, j) {
      if (j) title.appendChild(document.createTextNode(" "));
      var m = document.createElement("span");
      var w = document.createElement("span");
      m.className = "et-m";
      w.className = "et-w";
      w.textContent = word;
      m.appendChild(w);
      title.appendChild(m);
    });
    step.querySelector("[data-et-text]").textContent = li.querySelector("p").textContent.trim();
  });

  /* ---------- elementos ---------- */
  var cam = $("[data-et-cam]");
  var hook = $("[data-et-hook]");
  var words = $("[data-et-words]");
  var hookW = $$("[data-et-words] .et-w");
  var dot = $("[data-et-dot]");
  var tunnel = $("[data-et-tunnel]");
  var disks = $$("i", tunnel);
  var cream = $("[data-et-cream]");
  var v1 = $("[data-et-v1]");
  var fig1 = $("[data-et-fig1]");
  var sun = $("[data-et-sun]");
  var halos = $$("[data-et-halo]");
  var img1 = $("[data-et-img1]");
  var navy = $("[data-et-navy]");
  var fig2 = $("[data-et-fig2]");
  var img2 = $("[data-et-img2]");
  var sky = $("[data-et-sky]");
  var speed = $$("[data-et-speed] i");
  var fig3 = $("[data-et-fig3]");
  var fig4 = $("[data-et-fig4]");
  var img4 = $("[data-et-img4]");
  var pool = $("[data-et-pool]");
  var wave = $("[data-et-wave]");
  var splash = $("[data-et-splash]");
  var rings = $$("[data-et-ring]");
  var band = $("[data-et-band]");
  var steps = $$("[data-et-step]");
  var num = $("[data-et-num]");
  var numPanel = $("[data-et-num-panel]");
  var numInner = $("[data-et-num-inner]");
  var roll = $("[data-et-roll]");
  var rows = $$("[data-et-row]");
  var sign = $("[data-et-sign]");
  var signInner = $("[data-et-sign-inner]");
  var hud = $("[data-et-hud]");
  var segs = $$("[data-et-seg]");
  var INK = "#0b1a33";
  var D = 20;

  /* ---------- gotas (posições sorteadas com semente fixa: o vídeo e o site são idênticos) ---------- */
  function rng(a) {
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeDrops(box, n, seed, spread) {
    var r = rng(seed);
    var list = [];
    for (var i = 0; i < n; i++) {
      var d = document.createElement("i");
      var s = 0.35 + r() * 1.2;
      var a = -Math.PI / 2 + (r() - 0.5) * spread;
      var dist = 9 + r() * 22;
      d.className = "et-drop";
      d.style.setProperty("--s", s.toFixed(2));
      box.appendChild(d);
      // distâncias em --u; viram xPercent/yPercent do próprio tamanho da gota (independe da tela)
      list.push({ el: d, s: s, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist * 0.9, fall: 10 + r() * 18, delay: r() * 0.14, dur: 0.45 + r() * 0.35 });
    }
    return list;
  }
  var dropsA = makeDrops($('[data-et-drops="a"]'), 26, 7, Math.PI * 1.7);
  var dropsB = makeDrops($('[data-et-drops="b"]'), 30, 21, Math.PI * 1.2);
  var dropsC = makeDrops($('[data-et-drops="c"]'), 22, 33, Math.PI * 1.4);

  /* ---------- pontos que dependem do layout (recalculados no resize) ---------- */
  function offset(el, stop) {
    var x = 0;
    var y = 0;
    while (el && el !== stop) {
      x += el.offsetLeft;
      y += el.offsetTop;
      el = el.offsetParent;
    }
    return { x: x, y: y };
  }
  var dotX = 0;
  var dotY = 0;
  function layout() {
    // o ponto final de "sozinho." é a boca do túnel e a origem do zoom das palavras
    var d = offset(dot, words);
    dotX = d.x + dot.offsetWidth / 2;
    dotY = d.y + dot.offsetHeight / 2;
    words.style.transformOrigin = dotX + "px " + dotY + "px";
    var w = offset(words, hook);
    tunnel.style.left = w.x + dotX + "px";
    tunnel.style.top = w.y + dotY + "px";
    // 01 → 02: o azul-marinho abre a partir da boca do tubo
    var f1 = offset(fig1, et);
    navy.style.setProperty("--ox", f1.x + fig1.offsetWidth * 0.72 + "px");
    navy.style.setProperty("--oy", f1.y + fig1.offsetHeight * 0.31 + "px");
    // 03 → 04: o splash acontece onde ela cai na água
    var f3 = offset(fig3, et);
    var sx = f3.x + fig3.offsetWidth * 0.38;
    var sy = f3.y + fig3.offsetHeight * 0.66;
    splash.style.left = sx + "px";
    splash.style.top = sy + "px";
  }

  /* ---------- túnel: anéis em perspectiva (escala = k / profundidade) ---------- */
  var DISK = [
    ["#f6a21a", "#ef9312", "#d97b06"],
    ["#ffd24a", "#ffc531", "#e9a10f"],
  ];
  disks.forEach(function (d, i) {
    var c = i === disks.length - 1 ? ["#ffc531", "#ffc531", "#ffbd2e"] : DISK[i % 2];
    d.style.background = "radial-gradient(circle, " + c[0] + " 0%, " + c[1] + " 62%, " + c[2] + " 100%)";
  });
  // zoom exponencial: cada anel nasce no ponto final e cresce na mesma razão do anterior,
  // então vários anéis ficam visíveis ao mesmo tempo (profundidade de túnel)
  var tun = { u: 0 };
  var RATE = 9.8;
  var GAP = 0.055;
  function tunnelRender() {
    for (var i = 0; i < disks.length; i++) {
      var age = tun.u - i * GAP;
      var s = age <= 0 ? 0 : Math.min(13, 0.06 * Math.exp(RATE * age));
      disks[i].style.transform = "scale(" + s.toFixed(4) + ")";
    }
    // as palavras passam pela câmera antes dos anéis
    var fade = Math.min(1, Math.max(0, (tun.u - 0.12) / 0.3));
    words.style.transform = tun.u > 0 ? "scale(" + Math.exp(4.2 * tun.u).toFixed(4) + ")" : "";
    words.style.opacity = String(1 - fade);
  }

  /* ---------- linha do tempo ---------- */
  function inText(tl, step, t) {
    tl.fromTo(step.querySelector(".et-step__num .et-w"), { yPercent: 175 }, { yPercent: 0, duration: 0.9 }, t)
      .fromTo($$(".et-step__title .et-w", step), { yPercent: 165 }, { yPercent: 0, duration: 0.85, stagger: 0.055 }, t + 0.08)
      .fromTo(step.querySelector(".et-step__text"), { autoAlpha: 0, yPercent: 18 }, { autoAlpha: 1, yPercent: 0, duration: 0.9 }, t + 0.3);
  }
  function outText(tl, step, t) {
    tl.to(step.querySelector(".et-step__num .et-w"), { yPercent: -175, duration: 0.45, ease: "power3.in" }, t)
      .to($$(".et-step__title .et-w", step), { yPercent: -165, duration: 0.45, ease: "power3.in", stagger: 0.025 }, t)
      .to(step.querySelector(".et-step__text"), { autoAlpha: 0, yPercent: -12, duration: 0.4, ease: "power2.in" }, t);
  }
  function punch(tl, t, a) {
    // "empurrão" de câmera nos impactos
    tl.to(cam, { keyframes: [{ scale: 1 + a, duration: 0.07, ease: "power2.out" }, { scale: 1, duration: 0.7, ease: "expo.out" }] }, t);
  }
  function burst(tl, drops, t) {
    drops.forEach(function (d) {
      tl.fromTo(
        d.el,
        { xPercent: 0, yPercent: 0, scale: 0, autoAlpha: 1 },
        { xPercent: (d.dx / d.s) * 100, yPercent: (d.dy / d.s) * 100, scale: 1, duration: d.dur, ease: "power2.out" },
        t + d.delay
      ).to(d.el, { yPercent: ((d.dy + d.fall) / d.s) * 100, autoAlpha: 0, duration: 0.7, ease: "power2.in" }, t + d.delay + d.dur);
    });
  }

  function build() {
    var tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } });

    gsap.set([cream, v1, navy, sky, fig4, pool, splash, band, num, sign, hud, tunnel], { autoAlpha: 0 });
    gsap.set(hook, { autoAlpha: 1 });
    gsap.set(cam, { scale: 1 });
    gsap.set(hud, { color: INK });
    gsap.set(hookW, { transformOrigin: "0% 100%" });
    gsap.set(band, { skewX: -16, xPercent: 115 });
    gsap.set(fig1, { transformOrigin: "72% 31%" });
    gsap.set(segs, { scaleX: 0, transformOrigin: "0% 50%" });
    gsap.set($$(".et-step__num .et-w"), { yPercent: 175 });
    gsap.set($$(".et-step__title .et-w"), { yPercent: 165 });
    gsap.set($$(".et-step__text"), { autoAlpha: 0 });
    gsap.set($$("[data-et-mbar]"), { transformOrigin: "50% 100%" });
    gsap.set($$(".et-num__list i"), { transformOrigin: "0% 50%" });

    /* gancho: "Título não se vende sozinho." */
    tl.fromTo(hookW[0], { yPercent: 155, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 0.9 }, 0.12)
      .fromTo(hookW[1], { yPercent: 155, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 0.9 }, 0.36)
      .fromTo(hookW[2], { yPercent: 155, rotate: 5 }, { yPercent: 0, rotate: 0, duration: 0.9 }, 0.52)
      .fromTo(hookW[3], { yPercent: 155, rotate: 9, scale: 1.12 }, { yPercent: 0, rotate: 0, scale: 1, duration: 1.0, ease: "back.out(1.5)" }, 0.78)
      .fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(3)" }, 1.25)
      .to(hookW.slice(0, 3), { opacity: 0.34, duration: 0.6, ease: "power2.out" }, 1.55)
      .to(dot, { scale: 1.3, backgroundColor: "#ffc531", duration: 0.35, ease: "power2.out" }, 1.8)
      // o ponto vira a boca do tubo: mergulho em perspectiva
      .set(tunnel, { autoAlpha: 1 }, 2.0)
      .to(dot, { autoAlpha: 0, duration: 0.12, ease: "none" }, 2.04)
      .fromTo(tun, { u: 0 }, { u: 1, duration: 1.0, ease: "power1.in" }, 2.0);
    punch(tl, 1.02, 0.012);

    /* 01 · Conhecemos o empreendimento — o sol encolhe e revela a menina no topo */
    var t1 = 3.0;
    tl.set([cream, v1], { autoAlpha: 1 }, t1)
      .fromTo(sun, { scale: 5.5 }, { scale: 1, duration: 1.2, ease: "expo.inOut" }, t1)
      .to(hook, { autoAlpha: 0, duration: 0.25, ease: "none" }, t1)
      .fromTo(img1, { yPercent: 16, scale: 1.1, autoAlpha: 0 }, { yPercent: 0, scale: 1, autoAlpha: 1, duration: 1.3 }, t1 + 0.45)
      .fromTo(halos, { scale: 0.7, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.4, stagger: 0.12 }, t1 + 0.6)
      .to(halos, { rotate: function (i) { return i ? -24 : 40; }, duration: 3.2, ease: "none" }, t1 + 0.6)
      .set(hud, { autoAlpha: 1 }, t1 + 0.4)
      .fromTo(hud.children, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.8, stagger: 0.1 }, t1 + 0.45)
      .to(segs[0], { scaleX: 1, duration: 2.6, ease: "none" }, t1 + 0.5)
      .to(fig1, { scale: 1.04, duration: 1.75, ease: "none" }, t1 + 1.2);
    inText(tl, steps[0], t1 + 0.75);
    punch(tl, t1 + 1.02, 0.012);

    /* 02 · Alinhamos a proposta — mergulho no tubo, o azul abre e ela desce de braços abertos */
    var t2 = 5.9;
    outText(tl, steps[0], t2);
    tl.to(fig1, { scale: 7, duration: 0.8, ease: "power3.in" }, t2 + 0.05)
      .to(halos, { autoAlpha: 0, duration: 0.3, ease: "none" }, t2)
      .set(navy, { autoAlpha: 1 }, t2 + 0.4)
      .fromTo(navy, { "--r": "0%" }, { "--r": "150%", duration: 0.75, ease: "power2.inOut" }, t2 + 0.4)
      .set([cream, v1], { autoAlpha: 0 }, t2 + 1.2)
      .to(hud, { color: "#ffffff", duration: 0.3, ease: "none" }, t2 + 0.55)
      .fromTo(fig2, { scale: 0.2, rotate: -40, autoAlpha: 0 }, { scale: 1, rotate: 0, autoAlpha: 1, duration: 1.2 }, t2 + 0.55)
      .fromTo(img2, { rotate: -2, yPercent: 0 }, { rotate: 4, yPercent: -2.5, duration: 2.4, ease: "sine.inOut" }, t2 + 0.9)
      .to(segs[1], { scaleX: 1, duration: 2.3, ease: "none" }, t2 + 0.6);
    burst(tl, dropsA, t2 + 0.62);
    punch(tl, t2 + 0.62, 0.02);
    inText(tl, steps[1], t2 + 0.8);

    /* 03 · Preparamos a operação — a faixa do toboágua cruza a tela; ela sai do tubo */
    var t3 = 8.6;
    var mid = t3 + 0.55; // a faixa cobre a tela inteira aqui: troca de cena
    outText(tl, steps[1], t3);
    tl.set(band, { autoAlpha: 1 }, t3 + 0.05)
      .to(band, { xPercent: -115, duration: 1.0, ease: "power2.inOut" }, t3 + 0.05)
      .set(navy, { autoAlpha: 0 }, mid)
      .set(sky, { autoAlpha: 1 }, mid)
      .set(hud, { color: INK }, mid)
      .fromTo(fig3, { xPercent: 28 }, { xPercent: 0, duration: 1.3 }, mid)
      .fromTo(speed, { xPercent: 0, autoAlpha: 1 }, { xPercent: -560, duration: 0.95, ease: "power3.out", stagger: 0.045 }, mid - 0.05)
      .to(speed, { autoAlpha: 0, duration: 0.35, ease: "none", stagger: 0.045 }, mid + 0.4)
      .to(fig3, { xPercent: -3, duration: 1.95, ease: "none" }, mid + 1.3)
      .to(segs[2], { scaleX: 1, duration: 2.4, ease: "none" }, mid);
    punch(tl, mid + 0.05, 0.012);
    inText(tl, steps[2], t3 + 0.9);

    /* 04 · Acompanhamos e ajustamos — splash, a água sobe e ela volta à tona comemorando */
    var t4 = 11.6;
    outText(tl, steps[2], t4);
    tl.set(splash, { autoAlpha: 1 }, t4 + 0.1)
      .fromTo(rings, { scale: 0, autoAlpha: 1 }, { scale: function (i) { return i ? 4.2 : 3; }, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, t4 + 0.1)
      .to(fig3, { xPercent: -14, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, t4 + 0.15)
      .set(pool, { autoAlpha: 1 }, t4 + 0.2)
      .fromTo(pool, { yPercent: 100 }, { yPercent: 0, duration: 0.9 }, t4 + 0.2)
      .fromTo(wave, { xPercent: 0 }, { xPercent: -25, duration: 3.2, ease: "none" }, t4 + 0.2)
      .set(fig4, { autoAlpha: 1 }, t4 + 0.45)
      .fromTo(fig4, { yPercent: 38, scale: 0.86, rotate: -6 }, { yPercent: 0, scale: 1, rotate: 0, duration: 1.1, ease: "back.out(1.6)" }, t4 + 0.45)
      .to(img4, { yPercent: -2.2, rotate: 1.6, duration: 1.05, ease: "sine.inOut", repeat: 1, yoyo: true }, t4 + 1.5)
      .to(segs[3], { scaleX: 1, duration: 2.6, ease: "none" }, t4 + 0.3);
    burst(tl, dropsB, t4 + 0.1);
    burst(tl, dropsC, t4 + 0.6);
    punch(tl, t4 + 0.55, 0.018);
    inText(tl, steps[3], t4 + 0.6);

    /* número: 3 empreendimentos (dado do próprio site) */
    var t5 = 14.6;
    outText(tl, steps[3], t5);
    tl.to(hud, { autoAlpha: 0, duration: 0.35, ease: "none" }, t5)
      .set(num, { autoAlpha: 1 }, t5 + 0.05)
      .fromTo(numPanel, { yPercent: 100 }, { yPercent: -26, duration: 1.0, ease: "power3.inOut" }, t5 + 0.05)
      .set([sky, fig4, pool, splash, band], { autoAlpha: 0 }, t5 + 1.1)
      .fromTo(roll.parentNode, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: "none" }, t5 + 0.55)
      .fromTo(roll, { yPercent: 25 }, { yPercent: -75, duration: 1.3 }, t5 + 0.55)
      .fromTo($$(".et-num__label .et-w, .et-num__sub .et-w"), { yPercent: 155 }, { yPercent: 0, duration: 0.9, stagger: 0.12 }, t5 + 0.7)
      .fromTo($$(".et-num__list i"), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.out", stagger: 0.12 }, t5 + 0.9)
      .fromTo($$(".et-num__list .et-w"), { yPercent: 155 }, { yPercent: 0, duration: 0.9, stagger: 0.12 }, t5 + 0.98)
      .to(numInner, { scale: 1.03, duration: 1.8, ease: "none" }, t5 + 1.0);
    punch(tl, t5 + 0.75, 0.015);

    /* assinatura */
    var t6 = 17.4;
    tl.set(sign, { autoAlpha: 1 }, t6)
      .fromTo(sign, { "--r": "0%" }, { "--r": "150%", duration: 0.95, ease: "power3.inOut" }, t6)
      .to(numInner, { scale: 0.9, autoAlpha: 0.4, duration: 0.95, ease: "power3.inOut" }, t6)
      .set(num, { autoAlpha: 0 }, t6 + 1.0)
      .fromTo($$("[data-et-mring]"), { strokeDashoffset: 943 }, { strokeDashoffset: 0, duration: 1.2, ease: "power3.inOut", stagger: 0.12 }, t6 + 0.35)
      .fromTo($$("[data-et-mbar]"), { scaleY: 0 }, { scaleY: 1, duration: 0.9, stagger: 0.1 }, t6 + 0.7)
      .fromTo($("[data-et-word]"), { yPercent: 45, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 1.1 }, t6 + 1.05)
      .fromTo($("[data-et-url]"), { autoAlpha: 0, letterSpacing: "0.42em" }, { autoAlpha: 1, letterSpacing: "0.12em", duration: 1.3 }, t6 + 1.3)
      .fromTo(signInner, { scale: 0.96 }, { scale: 1.02, duration: D - t6, ease: "none" }, t6)
      .set({}, {}, D);

    return tl;
  }

  var tl = build();
  function render(t) {
    tl.time(t);
    tunnelRender();
  }
  var imgs = $$("img");

  /* ---------- modo render (vídeo) ---------- */
  if (RENDER) {
    imgs.forEach(function (img) {
      img.loading = "eager";
    });
    window.__etapas = {
      duration: D,
      seek: render,
      ready: Promise.all(
        [document.fonts ? document.fonts.ready : null].concat(
          imgs.map(function (img) {
            return img.decode().catch(function () {});
          })
        )
      ).then(function () {
        layout();
        render(0);
      }),
    };
    return;
  }

  /* ---------- site: o scroll controla o tempo ---------- */
  new IntersectionObserver(
    function (entries, io) {
      if (!entries[0].isIntersecting) return;
      imgs.forEach(function (img) {
        img.loading = "eager";
      });
      io.disconnect();
    },
    { rootMargin: "150% 0px" }
  ).observe(root);

  var T0 = 1.45; // as palavras do gancho entram enquanto a seção sobe; a seção fixa já com elas na tela
  var pre = 0;
  var pinned = 0;
  var target = 0;
  var cur = 0;
  function aim() {
    target = pinned > 0 ? T0 + pinned * (D - T0) : pre * T0;
  }
  ScrollTrigger.create({
    trigger: root,
    start: "top 70%",
    end: "top top",
    onUpdate: function (self) {
      pre = self.progress;
      aim();
    },
  });
  ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "+=640%",
    pin: true,
    anticipatePin: 1,
    onUpdate: function (self) {
      pinned = self.progress;
      aim();
    },
  });
  // os gatilhos de app.js foram criados antes: reordena para o espaço do pin valer para as seções de baixo
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  layout();
  render(0);
  gsap.ticker.add(function (time, dtMs) {
    var d = target - cur;
    if (Math.abs(d) < 0.0005) {
      if (d !== 0) {
        cur = target;
        render(cur);
      }
      return;
    }
    cur += d * (1 - Math.exp((-dtMs / 1000) * 6)); // segue o scroll com um leve atraso: movimento contínuo
    render(cur);
  });
  var relayout = function () {
    layout();
    render(cur);
  };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  window.addEventListener("resize", relayout);
})();
