/* ==========================================================================
   Hollanda Parques & Resorts — motion e interações
   GSAP (ScrollTrigger + SplitText) + Lenis. Sem build: carregado direto no HTML.
   ========================================================================== */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover)").matches;
  var hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var $ = function (s, c) {
    return (c || document).querySelector(s);
  };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };
  var isMobile = function () {
    return window.innerWidth < 768;
  };

  if (reduced) html.classList.add("reduced");
  if (!hasGSAP) html.classList.add("no-gsap");

  $$("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ------------------------------------------------------------------
     Vídeos: carregam só perto da tela e pausam fora dela
     ------------------------------------------------------------------ */
  function videoSrc(v) {
    return (isMobile() && v.dataset.srcMobile) || v.dataset.src;
  }
  function ensureSrc(v) {
    if (!v.getAttribute("src")) {
      v.src = videoSrc(v);
      v.load();
    }
  }
  var videoObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        var hoverOnly = v.hasAttribute("data-hover-video") && canHover;
        if (e.isIntersecting) {
          if (reduced) return;
          if (!hoverOnly) {
            ensureSrc(v);
            v.play().catch(function () {});
          }
        } else if (!v.paused) {
          v.pause();
        }
      });
    },
    { rootMargin: "300px 0px" }
  );
  $$("[data-video]").forEach(function (v) {
    videoObserver.observe(v);
  });
  $$("[data-hover-video]").forEach(function (v) {
    var host = v.closest("a, article") || v.parentElement;
    host.addEventListener("mouseenter", function () {
      if (reduced) return;
      ensureSrc(v);
      v.play().catch(function () {});
    });
    host.addEventListener("mouseleave", function () {
      v.pause();
    });
  });

  // mola amortecida em forma fechada (resposta ao degrau), usada como "ease" do GSAP: chega
  // rápido e passa do ponto no máximo ~1,5% com zeta 0,8 — nada de pulinhos
  function springEase(zeta) {
    var w = 6.2 / zeta;
    var wd = w * Math.sqrt(1 - zeta * zeta);
    return function (t) {
      if (t >= 1) return 1;
      return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
    };
  }

  /* ------------------------------------------------------------------
     Ferramenta "Monte sua apresentação" (funciona mesmo sem GSAP)
     ------------------------------------------------------------------ */
  var pitch = $("[data-pitch]");
  if (pitch) {
    var preview = $("[data-pitch-preview]", pitch);
    var toast = $("[data-pitch-toast]", pitch);
    var buildPitch = function () {
      var f = new FormData(pitch);
      var nome = String(f.get("nome") || "").trim();
      var cidade = String(f.get("cidade") || "").trim();
      var tipo = String(f.get("tipo"));
      var momento = String(f.get("momento")).toLowerCase();
      return (
        "Olá, equipe Hollanda! Quero apresentar " +
        (nome ? nome : "meu empreendimento") +
        (cidade ? " (" + cidade + ")" : "") +
        ".\n\n• Tipo: " +
        tipo +
        "\n• Momento do projeto: " +
        momento +
        "\n\nGostaria de conversar sobre a estruturação da operação comercial — planejamento de vendas, formação da equipe e captação de interessados. Qual o melhor caminho para começarmos?"
      );
    };
    var renderPitch = function () {
      preview.textContent = buildPitch();
    };
    pitch.addEventListener("input", renderPitch);
    pitch.addEventListener("change", renderPitch);
    renderPitch();
    // o botão vira um círculo carregando, depois ✓ e se abre num aviso; em seguida volta a ser
    // botão (uma forma só, com mola). Sem GSAP ou com "reduzir movimento", o aviso é só texto.
    var morphBtn = $("[data-morph]", pitch);
    var canMorph = morphBtn && window.gsap && !reduced;
    var busy = false;
    if (canMorph) toast.classList.add("is-sr");
    var morph = function (ok, long, short) {
      var label = $("[data-morph-label]", morphBtn);
      var icon = $("[data-morph-icon]", morphBtn);
      var wrap = $("[data-morph-wrap]", morphBtn);
      var msg = $("[data-morph-msg]", morphBtn);
      var full = morphBtn.getBoundingClientRect().width;
      var h = morphBtn.getBoundingClientRect().height;
      var measure = function (t) {
        msg.textContent = t;
        gsap.set(wrap, { width: "auto" });
        var w = wrap.getBoundingClientRect().width;
        gsap.set(wrap, { width: 0 });
        return w;
      };
      var mw = measure(long);
      if (mw + h + 28 > full) mw = measure(short);
      var sp = springEase(0.8);
      busy = true;
      morphBtn.classList.add("is-morphing");
      gsap.set(morphBtn, { width: full });
      gsap
        .timeline({
          onComplete: function () {
            gsap.set([morphBtn, label, icon, wrap, msg], { clearProps: "all" });
            morphBtn.classList.remove("is-morphing", "is-loading", "is-done", "is-error");
            busy = false;
          },
        })
        .to(label, { opacity: 0, filter: "blur(6px)", y: -4, duration: 0.18, ease: "power2.in" }, 0)
        .to(morphBtn, { width: h, duration: 0.6, ease: sp }, 0.05)
        .call(function () {
          morphBtn.classList.add("is-loading");
        }, null, 0.2)
        .fromTo(icon, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: sp }, 0.2)
        .call(function () {
          morphBtn.classList.remove("is-loading");
          morphBtn.classList.add(ok ? "is-done" : "is-error");
        }, null, 0.85)
        .to(morphBtn, { backgroundColor: "#ffffff", color: "#0b1a33", duration: 0.3, ease: "power1.out" }, 0.85)
        .to(morphBtn, { width: Math.min(full, mw + h + 28), duration: 0.65, ease: sp }, 1.15)
        .to(wrap, { width: mw, duration: 0.65, ease: sp }, 1.15)
        .fromTo(msg, { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.3 }, 1.3)
        // segura o aviso e volta a ser botão
        .to(msg, { opacity: 0, filter: "blur(6px)", duration: 0.2 }, 4.1)
        .to(wrap, { width: 0, duration: 0.5, ease: sp }, 4.2)
        .to(icon, { opacity: 0, scale: 0.6, duration: 0.25 }, 4.2)
        .to(morphBtn, { width: full, backgroundColor: "#ea8a10", color: "#0b1a33", duration: 0.6, ease: sp }, 4.25)
        .to(label, { opacity: 1, filter: "blur(0px)", y: 0, duration: 0.3 }, 4.6);
    };
    pitch.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var text = buildPitch();
      var done = function () {
        toast.textContent = "Roteiro copiado! Agora é só colar na conversa do Instagram.";
        if (canMorph) morph(true, "Copiado! Agora é só colar no Instagram.", "Roteiro copiado!");
        setTimeout(function () {
          toast.textContent = "";
        }, 5000);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, fallbackCopy);
      } else {
        fallbackCopy();
      }
      function fallbackCopy() {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          done();
        } catch (err) {
          toast.textContent = "Não foi possível copiar automaticamente — selecione o texto acima.";
          if (canMorph) morph(false, "Não deu para copiar — selecione o texto acima.", "Selecione o texto acima.");
        }
        document.body.removeChild(ta);
      }
    });
  }

  /* ------------------------------------------------------------------
     Menu mobile (sem GSAP também funciona)
     ------------------------------------------------------------------ */
  var menu = $("[data-menu]");
  var toggle = $("[data-menu-toggle]");
  var lenis = null;
  function setMenu(open) {
    html.classList.toggle("menu-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
    if (menu) menu.setAttribute("aria-hidden", String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open && hasGSAP && !reduced) {
      gsap.fromTo(
        ".menu__links a",
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: "expo.out", delay: 0.25 }
      );
    }
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!html.classList.contains("menu-open"));
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && html.classList.contains("menu-open")) setMenu(false);
  });

  /* ------------------------------------------------------------------
     Cor da barra do navegador no celular (meta theme-color): acompanha o
     que está no topo da tela — bege na capa, azul-marinho nas seções escuras
     ------------------------------------------------------------------ */
  var themeMeta = $('meta[name="theme-color"]');
  var themeTimer = 0;
  function themeColor() {
    themeTimer = 0;
    if (!themeMeta) return;
    var c = "#041a3a"; // nav de vidro, menu aberto e preloader são azul-marinho
    var bar = $("[data-nav]");
    var glassNav = bar && bar.classList.contains("is-scrolled") && !bar.classList.contains("is-hidden");
    if (!glassNav && !html.classList.contains("menu-open")) {
      var hit = document.elementsFromPoint(window.innerWidth / 2, 2).filter(function (el) {
        return !el.closest("[data-nav]");
      })[0];
      // na capa animada, passado o primeiro scroll, o topo já é água/céu escurecido
      var darkHero = hit && hit.closest("[data-hero]") && window.scrollY > 40;
      for (var el = hit; el && !darkHero && el !== html; el = el.parentElement) {
        var bg = getComputedStyle(el).backgroundColor;
        var ch = bg.match(/[\d.]+/g);
        if (ch && (ch.length < 4 || +ch[3] > 0.6)) {
          c = bg;
          break;
        }
      }
    }
    if (c !== themeMeta.getAttribute("content")) themeMeta.setAttribute("content", c);
  }
  function queueTheme() {
    if (!themeTimer) themeTimer = setTimeout(themeColor, 120);
  }
  window.addEventListener("scroll", queueTheme, { passive: true });
  window.addEventListener("resize", queueTheme);
  // menu abrindo/fechando e preloader saindo mudam o topo sem scroll
  new MutationObserver(queueTheme).observe(html, { attributes: true, attributeFilter: ["class"] });
  var loaderEl = $(".loader");
  if (loaderEl) new MutationObserver(queueTheme).observe(loaderEl.parentNode, { childList: true });
  queueTheme();

  /* ------------------------------------------------------------------
     Sem GSAP: remove o preloader e encerra aqui (site continua navegável)
     ------------------------------------------------------------------ */
  if (!hasGSAP) {
    var l = $(".loader");
    if (l) l.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  var canSplit = !!window.SplitText;

  /* ------------------------------------------------------------------
     Scroll suave (Lenis) sincronizado com o ScrollTrigger
     ------------------------------------------------------------------ */
  if (!reduced && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) {
      lenis.raf(t * 1000);
    });
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      if (html.classList.contains("menu-open")) setMenu(false);
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });
  });

  /* ------------------------------------------------------------------
     Navegação: vidro ao rolar, some ao descer e volta ao subir
     ------------------------------------------------------------------ */
  var nav = $("[data-nav]");
  if (nav) {
    var lastY = 0;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        var y = self.scroll();
        nav.classList.toggle("is-scrolled", y > 40);
        var down = y > lastY && y > window.innerHeight * 0.7;
        nav.classList.toggle("is-hidden", down && !html.classList.contains("menu-open"));
        lastY = y;
      },
    });
  }

  /* ------------------------------------------------------------------
     Helpers de texto
     ------------------------------------------------------------------ */
  function splitLines(el, opts) {
    if (!canSplit) return null;
    return SplitText.create(el, Object.assign({ type: "lines", mask: "lines", linesClass: "split-line" }, opts || {}));
  }

  // títulos que sobem linha a linha
  $$("[data-split]").forEach(function (el) {
    if (reduced || !canSplit) return;
    SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      onSplit: function (self) {
        // a parte cursiva (em.serif) "se escreve à mão" logo depois das linhas subirem
        $$("em.serif", el).forEach(function (em, k) {
          gsap.fromTo(
            em,
            { clipPath: "inset(-30% 104% -90% -10%)" },
            {
              clipPath: "inset(-30% -10% -90% -10%)",
              duration: 1.1,
              ease: "power2.inOut",
              delay: 0.35 + k * 0.2,
              clearProps: "clipPath",
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            }
          );
        });
        return gsap.from(self.lines, {
          yPercent: 165,
          duration: 1.3,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
          // terminada a entrada, desfaz as máscaras (nada fica cortado, nem a perna do "p" cursivo)
          onComplete: function () {
            self.revert();
          },
        });
      },
    });
  });

  // blocos que entram suavemente
  if (!reduced) {
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 90%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.08, overwrite: true });
      },
    });
  }

  // frase que "acende" palavra por palavra conforme o scroll (efeito Apple)
  $$("[data-scrub-words]").forEach(function (el) {
    if (reduced || !canSplit) return;
    var st = SplitText.create(el, { type: "words", wordsClass: "word" });
    gsap.fromTo(
      st.words,
      { opacity: 0.12 },
      {
        opacity: 1,
        ease: "none",
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 42%", scrub: true },
      }
    );
  });

  // faixa infinita que acelera com a velocidade do scroll
  $$("[data-marquee]").forEach(function (m) {
    var track = $(".marquee__track", m);
    if (!track || reduced) return;
    track.innerHTML += track.innerHTML;
    var tw = gsap.to(track, { xPercent: -50, repeat: -1, duration: 32, ease: "none" });
    tw.totalTime(tw.duration() * 50);
    var dir = 1;
    ScrollTrigger.create({
      trigger: m,
      start: "top bottom",
      end: "bottom top",
      onUpdate: function (self) {
        dir = self.direction;
        var boost = Math.min(Math.abs(self.getVelocity()) / 220, 6);
        gsap.to(tw, { timeScale: dir * (1 + boost), duration: 0.25, overwrite: true });
        gsap.to(tw, { timeScale: dir, duration: 1.4, delay: 0.25 });
      },
    });
  });

  // contadores
  $$("[data-count]").forEach(function (el) {
    var end = parseFloat(el.dataset.count);
    if (reduced) {
      el.textContent = end;
      return;
    }
    var o = { v: 0 };
    gsap.to(o, {
      v: end,
      duration: 2,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
      onUpdate: function () {
        el.textContent = Math.round(o.v);
      },
    });
  });

  /* ------------------------------------------------------------------
     Botões magnéticos + cursor contextual
     ------------------------------------------------------------------ */
  if (canHover && !reduced) {
    $$("[data-magnetic]").forEach(function (el) {
      var xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
      var yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.25);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("mouseleave", function () {
        xTo(0);
        yTo(0);
      });
    });

    var cursor = $(".cursor");
    if (cursor) {
      var label = $("[data-cursor-label]", cursor);
      var cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
      var cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
      window.addEventListener("mousemove", function (e) {
        cx(e.clientX);
        cy(e.clientY);
      });
      $$("[data-cursor]").forEach(function (el) {
        el.addEventListener("mouseenter", function () {
          label.textContent = el.dataset.cursor;
          cursor.classList.add("is-on");
        });
        el.addEventListener("mouseleave", function () {
          cursor.classList.remove("is-on");
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     FAQ com abertura suave
     ------------------------------------------------------------------ */
  $$(".faq__item").forEach(function (d) {
    var s = $("summary", d);
    var a = $(".faq__answer", d);
    s.addEventListener("click", function (e) {
      if (reduced) return;
      e.preventDefault();
      if (d.open) {
        gsap.to(a, {
          height: 0,
          duration: 0.5,
          ease: "power3.inOut",
          onComplete: function () {
            d.open = false;
            gsap.set(a, { clearProps: "height" });
            ScrollTrigger.refresh();
          },
        });
      } else {
        d.open = true;
        gsap.fromTo(
          a,
          { height: 0 },
          {
            height: "auto",
            duration: 0.7,
            ease: "expo.out",
            onComplete: function () {
              ScrollTrigger.refresh();
            },
          }
        );
      }
    });
  });

  /* ==================================================================
     HOME
     ================================================================== */
  var introTl = gsap.timeline({ paused: true });
  // títulos quebrados em linhas precisam das fontes carregadas (a fonte de título é mais larga que a reserva)
  var fontsReady = Promise.race([
    document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
    new Promise(function (r) {
      setTimeout(r, 1800);
    }),
  ]);

  var avifSupport = new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      resolve(img.width > 0);
    };
    img.onerror = function () {
      resolve(false);
    };
    img.src =
      "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });

  // Sequência de quadros: desenha o instante t (s) da montagem misturando os dois quadros
  // vizinhos, para o movimento ficar contínuo. Com WebGL (opts.gl) tudo é desenhado na placa de
  // vídeo; sem ele, num canvas 2D.
  // cfg = { d: duração, s: [[início, fps, quadros], ...] } (gerado por tools/make_hero.py)
  // opts.overlays: imagens paradas por cima com opacidade variável (capa, paradas e fecho);
  // opts.onDraw: avisado a cada desenho.
  function frameSequence(canvas, cfg, path, opts) {
    opts = opts || {};
    var gl = opts.gl || null;
    var ctx = null;
    var segs = [];
    var total = 0;
    cfg.s.forEach(function (sg) {
      segs.push({ t0: sg[0], fps: sg[1], i0: total });
      total += sg[2];
    });
    var frames = new Array(total);
    var wanted = 0;
    var drawn = -1;
    var dir = 1;
    var ready = function (img) {
      return img && img.complete && img.naturalWidth > 0;
    };
    var indexAt = function (t) {
      var sg = segs[0];
      for (var k = 1; k < segs.length; k++) if (t >= segs[k].t0) sg = segs[k];
      return Math.max(0, Math.min(total - 1, sg.i0 + (t - sg.t0) * sg.fps));
    };
    var nearest = function (i) {
      if (ready(frames[i])) return i;
      for (var d = 1; d < total; d++) {
        if (ready(frames[i - d])) return i - d;
        if (ready(frames[i + d])) return i + d;
      }
      return -1;
    };
    var cover = function (img, alpha) {
      var cw = canvas.width,
        ch = canvas.height,
        iw = img.naturalWidth,
        ih = img.naturalHeight;
      var sc = Math.max(cw / iw, ch / ih);
      ctx.globalAlpha = alpha;
      ctx.drawImage(img, (cw - iw * sc) / 2, (ch - ih * sc) / 2, iw * sc, ih * sc);
    };
    var render = function () {
      var i = Math.floor(wanted);
      var k = wanted - i;
      var a = nearest(i);
      // o quadro seguinte entra por cima na proporção em que o scroll já andou
      var b = k > 0.02 && a === i && ready(frames[i + 1]) ? i + 1 : -1;
      var over = null;
      var oa = 0;
      (opts.overlays || []).forEach(function (o) {
        var al = o.alpha();
        if (al > oa + 0.001 && ready(o.img)) {
          over = o.img;
          oa = al;
        }
      });
      if (a < 0 && !over) return;
      if (gl && gl.ok()) {
        gl.draw(a, a >= 0 ? frames[a] : null, b, b >= 0 ? frames[b] : null, k, over, oa);
        gl.prefetch(i, dir, frames);
      } else {
        if (!ctx) ctx = canvas.getContext("2d");
        canvas.style.visibility = "";
        if (a >= 0) {
          cover(frames[a], 1);
          if (b >= 0) cover(frames[b], k);
        } else {
          ctx.fillStyle = "#efe8dc";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        (opts.overlays || []).forEach(function (o) {
          if (o.alpha() > 0.001 && ready(o.img)) cover(o.img, o.alpha());
        });
        ctx.globalAlpha = 1;
      }
      drawn = wanted;
      if (opts.onDraw) opts.onDraw();
    };
    var load = function (i) {
      if (frames[i]) return;
      var img = new Image();
      img.decoding = "async";
      img.onload = function () {
        if (drawn < 0 || Math.abs(i - wanted) < 2) render();
      };
      img.src = path(i + 1);
      frames[i] = img;
    };
    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      if (ctx) ctx.imageSmoothingQuality = "high";
      if (gl) gl.resize(canvas.width, canvas.height);
      render();
    };
    return {
      seek: function (t) {
        var w = indexAt(t);
        if (w === drawn) return;
        if (w !== wanted) dir = w > wanted ? 1 : -1;
        wanted = w;
        render();
      },
      // carrega em ordem intercalada: um a cada 8, depois a cada 4, 2 e o resto (em internet
      // móvel lenta ou com economia de dados, para no "um a cada 2")
      loadAll: function () {
        var c = navigator.connection;
        var slow = c && (c.saveData || /(^|-)2g|3g/.test(c.effectiveType || ""));
        for (var step = 8; step >= (slow ? 2 : 1); step = step >> 1) for (var i = 0; i < total; i += step) load(i);
      },
      redraw: render,
      load: load,
      resize: resize,
    };
  }

  // Camada WebGL das sequências: desenha o quadro atual misturado ao seguinte e a imagem parada
  // por cima (capa, paradas, fecho), tudo na placa de vídeo. Os próximos quadros na direção da
  // rolagem são decodificados e enviados à placa antes de chegar a vez deles, e os já enviados
  // ficam guardados (voltar a rolagem não reenvia nada).
  // Água viva: a imagem é refratada como água. O mouse (ou o toque) deixa ondinhas, a troca de
  // cena passa por uma leve ondulação e, na capa parada, a água de baixo tremula sozinha.
  function glLayer(glCanvas) {
    var gl = glCanvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return null;
    var MAX = 10;
    var vs = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
    var fs = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "varying vec2 v;",
      "uniform sampler2D A, B, O;",
      "uniform vec2 R, sF, sO;",
      "uniform float k, oa, tm, fl, am;",
      "uniform vec4 D[" + MAX + "];",
      // "cover": a imagem preenche a tela cortando as sobras, como object-fit: cover
      "vec3 img(vec2 uv){",
      "  vec2 f = clamp((uv - 0.5) * sF + 0.5, 0.0, 1.0);",
      "  vec3 c = texture2D(A, f).rgb;",
      "  if (k > 0.0) c = mix(c, texture2D(B, f).rgb, k);",
      "  if (oa > 0.0) c = mix(c, texture2D(O, clamp((uv - 0.5) * sO + 0.5, 0.0, 1.0)).rgb, oa);",
      "  return c;",
      "}",
      "void main(){",
      "  vec2 asp = vec2(R.x / R.y, 1.0);",
      // cada gota (x, y, instante, força) é um anel de ondas que cresce e perde força;
      // g é a inclinação da superfície da água
      "  vec2 g = vec2(0.0);",
      "  for (int i = 0; i < " + MAX + "; i++) {",
      "    vec4 d = D[i];",
      "    float age = tm - d.z;",
      "    if (d.w <= 0.0 || age < 0.0 || age > 3.0) continue;",
      "    vec2 q = (v - d.xy) * asp;",
      "    float r = length(q) + 1e-4;",
      "    float x = r - age * 0.3;",
      "    float w = 0.05 + age * 0.04;",
      "    float env = exp(-x * x / (w * w) - age * 1.5) * d.w;",
      "    g += (64.0 * cos(x * 64.0) - 2.0 * x / (w * w) * sin(x * 64.0)) * env * 0.0009 * q / r;",
      "  }",
      // troca de cena: a imagem ondula como vista através de água em movimento
      "  vec2 wob = fl * 0.005 * vec2(sin(v.y * 9.0 + tm * 2.1) + 0.5 * sin(v.y * 23.0 - tm * 1.3), cos(v.x * 7.0 + tm * 1.7) + 0.5 * cos(v.x * 19.0 + tm * 1.1));",
      // capa parada: a água da parte de baixo tremula como reflexo de piscina (foto viva)
      "  float band = smoothstep(0.34, 0.2, v.y) * am;",
      "  wob.x += band * 0.0016 * sin(v.y * 150.0 + tm * 2.2 + sin(v.x * 6.0 + tm * 0.7) * 3.0);",
      "  vec2 off = g * 0.18 / asp + wob;",
      "  vec2 uv = v + off;",
      "  vec2 ca = off * 0.25 + fl * vec2(0.0012, 0.0);",
      "  vec3 col = dot(ca, ca) < 1e-10 ? img(uv) : vec3(img(uv + ca).r, img(uv).g, img(uv - ca).b);",
      // luz e sombra nas cristas (luz vindo do alto à esquerda) e um brilho na ponta
      "  col *= 1.0 + dot(g * 14.0, normalize(vec2(-0.5, 0.6))) * 0.3;",
      "  vec3 n = normalize(vec3(-g * 14.0, 1.0));",
      "  float spec = pow(max(dot(n, normalize(vec3(-0.5, 0.6, 0.62))), 0.0), 10.0);",
      "  gl_FragColor = vec4(col + spec * 0.35, 1.0);",
      "}",
    ].join("\n");
    var compile = function (type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    };
    var prog = gl.createProgram();
    try {
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      return null;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    var U = {};
    ["A", "B", "O", "R", "sF", "sO", "k", "oa", "tm", "fl", "am", "D"].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });
    gl.uniform1i(U.A, 0);
    gl.uniform1i(U.B, 1);
    gl.uniform1i(U.O, 2);
    var newTex = function (img) {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      if (img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([239, 232, 220]));
      return t;
    };
    var blank = newTex(null);
    // quadros já na placa (índice → textura), os mais antigos saem primeiro
    var KEEP = window.innerWidth < 768 ? 14 : 22;
    var texs = new Map();
    var overTex = new Map();
    var queue = [];
    var frameTex = function (i, img) {
      var t = texs.get(i);
      if (t) {
        texs.delete(i);
        texs.set(i, t);
        return t;
      }
      t = newTex(img);
      texs.set(i, t);
      while (texs.size > KEEP) {
        var old = texs.keys().next().value;
        gl.deleteTexture(texs.get(old));
        texs.delete(old);
      }
      return t;
    };
    var cur = { a: blank, b: blank, o: blank, k: 0, oa: 0, fa: 16 / 9, oas: 16 / 9 };
    var drops = new Float32Array(MAX * 4);
    var next = 0;
    var t0 = performance.now();
    var lastDrop = -10;
    var flow = 0;
    var flowTarget = 0;
    var ambient = 0;
    var dirty = false;
    var has = false;
    var lost = false;
    var now = function () {
      return (performance.now() - t0) / 1000;
    };
    glCanvas.addEventListener("webglcontextlost", function (e) {
      // sem WebGL a sequência volta para o canvas 2D, só sem as ondas
      e.preventDefault();
      lost = true;
      glCanvas.classList.remove("is-on");
    });
    return {
      ok: function () {
        return !lost;
      },
      draw: function (ai, imgA, bi, imgB, k, over, oa) {
        if (ai >= 0) {
          cur.a = frameTex(ai, imgA);
          cur.fa = imgA.naturalWidth / imgA.naturalHeight;
        }
        cur.b = bi >= 0 ? frameTex(bi, imgB) : cur.a;
        cur.k = bi >= 0 ? k : 0;
        if (over) {
          if (!overTex.has(over)) overTex.set(over, newTex(over));
          cur.o = overTex.get(over);
          cur.oas = over.naturalWidth / over.naturalHeight;
        }
        cur.oa = over ? oa : 0;
        if (ai < 0 && over) cur.a = cur.o;
        dirty = has = true;
      },
      // decodifica e envia à placa os próximos quadros na direção da rolagem (2 por quadro de tela)
      prefetch: function (i, dir, frames) {
        queue = [];
        for (var d = 1; d <= 8; d++) {
          var j = i + d * dir;
          if (frames[j] && frames[j].complete && frames[j].naturalWidth && !texs.has(j)) queue.push(j);
        }
        var j2 = i - dir;
        if (frames[j2] && frames[j2].complete && frames[j2].naturalWidth && !texs.has(j2)) queue.push(j2);
        this.frames = frames;
      },
      flow: function (v) {
        flowTarget = v;
      },
      ambient: function (v) {
        ambient = v;
      },
      drop: function (x, y, strength) {
        lastDrop = now();
        drops.set([x, y, lastDrop, strength], next * 4);
        next = (next + 1) % MAX;
      },
      resize: function (w, h) {
        glCanvas.width = w;
        glCanvas.height = h;
        gl.viewport(0, 0, w, h);
        dirty = has;
      },
      // chamado a cada quadro de tela: envia o que está na fila e só redesenha se algo mudou
      frame: function () {
        if (lost || !glCanvas.width) return;
        var self = this;
        for (var n = 0; n < 2 && queue.length; n++) {
          var j = queue.shift();
          var im = self.frames && self.frames[j];
          if (!im || texs.has(j)) continue;
          // decodifica fora da hora de desenhar (img.decode) e só então envia à placa
          if (im.decode && !im._ready) {
            if (!im._decoding) {
              im._decoding = true;
              im.decode().then(
                function () {
                  this._ready = true;
                }.bind(im),
                function () {
                  this._ready = true;
                }.bind(im)
              );
            }
            queue.push(j);
            continue;
          }
          frameTex(j, im);
        }
        if (!has) return;
        var t = now();
        flow += (flowTarget - flow) * 0.12;
        if (!dirty && t - lastDrop > 3.2 && flow < 0.002 && ambient < 0.01) return;
        dirty = false;
        var ca = glCanvas.width / glCanvas.height;
        var sc = function (ta) {
          return [Math.min(1, ca / ta), Math.min(1, ta / ca)];
        };
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, cur.a);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, cur.b);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, cur.o);
        gl.uniform2f(U.R, glCanvas.width, glCanvas.height);
        gl.uniform2fv(U.sF, sc(cur.fa));
        gl.uniform2fv(U.sO, sc(cur.oas));
        gl.uniform1f(U.k, cur.k);
        gl.uniform1f(U.oa, cur.oa);
        gl.uniform1f(U.tm, t);
        gl.uniform1f(U.fl, flow < 0.002 ? 0 : flow);
        gl.uniform1f(U.am, ambient);
        gl.uniform4fv(U.D, drops);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!glCanvas.classList.contains("is-on")) glCanvas.classList.add("is-on");
      },
    };
  }

  // ondinhas na camada WebGL: o mouse deixa um rastro de gotas, o clique (ou o toque) uma onda maior
  function ripples(el, glCanvas, layer) {
    var lastP = null;
    var toUv = function (x, y) {
      var r = glCanvas.getBoundingClientRect();
      return [(x - r.left) / r.width, 1 - (y - r.top) / r.height];
    };
    el.addEventListener("pointermove", function (e) {
      var L = layer();
      if (!L || e.pointerType === "touch") return;
      var t = performance.now();
      if (lastP) {
        var dx = e.clientX - lastP.x;
        var dy = e.clientY - lastP.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 36 && t - lastP.t < 120) return;
        var p = toUv(e.clientX, e.clientY);
        L.drop(p[0], p[1], Math.min(1, Math.max(0.3, (dist / Math.max(16, t - lastP.t)) * 0.9)));
      }
      lastP = { x: e.clientX, y: e.clientY, t: t };
    });
    el.addEventListener("pointerdown", function (e) {
      var L = layer();
      if (!L) return;
      var p = toUv(e.clientX, e.clientY);
      L.drop(p[0], p[1], e.pointerType === "touch" ? 1.4 : 1.8);
    });
  }

  // Ilha: pílula fixa que muda de forma conforme a seção. É sempre o mesmo elemento: a largura
  // anda com mola e o conteúdo troca com um leve desfoque. Na capa vira o progresso das frases,
  // nos empreendimentos um seletor com indicador "líquido", e no resto um atalho de contato.
  function setupIsland() {
    var el = $("[data-island]");
    if (!el || reduced || !window.gsap) return null;
    var sp = springEase(0.8);
    var layers = {};
    $$("[data-island-state]", el).forEach(function (l) {
      layers[l.dataset.islandState] = l;
    });
    var state = null;
    var heroOn = false;
    var heroChap = -1;
    var clubIdx = -1;
    var api = { heroGoto: null };
    gsap.set(el, { xPercent: -50, y: 24, scale: 0.92 });
    gsap.set($$("[data-island-state]", el), { xPercent: -50, yPercent: -50 });

    // indicador: a borda da frente vai com uma mola rápida e a de trás com uma lenta, então ele
    // estica na direção do movimento e se recolhe ao chegar
    var slide = function (track, target, pad, instant) {
      var ind = $("[data-island-ind]", track);
      var tr = track.getBoundingClientRect();
      var r = target.getBoundingClientRect();
      var L = r.left - tr.left - pad;
      var R = r.right - tr.left + pad;
      var curL = parseFloat(ind.style.getPropertyValue("--l")) || L;
      if (instant) {
        gsap.set(ind, { "--l": L + "px", "--r": R + "px" });
        return;
      }
      var right = L >= curL;
      gsap.to(ind, { "--r": R + "px", duration: right ? 0.42 : 0.7, ease: sp });
      gsap.to(ind, { "--l": L + "px", duration: right ? 0.7 : 0.42, ease: sp });
    };

    var show = function (name) {
      if (name === state) return;
      var prev = state && layers[state];
      state = name;
      var next = name && layers[name];
      // overwrite: true corta a troca anterior que ainda esteja animando (ex.: voltar do rodapé
      // direto ao topo passa por "hero" e logo some; sem isso a mola mais longa terminava por cima)
      Object.keys(layers).forEach(function (k) {
        var l = layers[k];
        if (l === next) return;
        if (l === prev) gsap.to(l, { autoAlpha: 0, filter: "blur(6px)", scale: 0.96, duration: 0.18, ease: "power2.in", overwrite: true });
        else gsap.set(l, { autoAlpha: 0, overwrite: true });
      });
      if (!next) {
        gsap.to(el, { autoAlpha: 0, y: 24, scale: 0.92, duration: 0.35, ease: "power2.in", overwrite: true });
        return;
      }
      var w = next.offsetWidth + 12;
      var first = !prev && +gsap.getProperty(el, "opacity") < 0.5;
      if (first) gsap.set(el, { width: w });
      gsap.to(el, { autoAlpha: 1, y: 0, scale: 1, width: w, duration: 0.6, ease: sp, overwrite: true });
      gsap.fromTo(
        next,
        { autoAlpha: 0, filter: "blur(6px)", scale: 0.96 },
        { autoAlpha: 1, filter: "blur(0px)", scale: 1, duration: 0.32, delay: prev ? 0.12 : 0.05, ease: "power2.out", overwrite: true }
      );
      // o indicador já entra no lugar certo
      if (name === "hero" && heroChap >= 0) slide($("[data-island-track]", next), $$(".island__dot", next)[heroChap], 7, true);
      if (name === "clubs" && clubIdx >= 0) slide($("[data-island-track]", next), $$(".island__tab", next)[clubIdx], 0, true);
    };

    var stack = $(".club-stack");
    var panels = $$("[data-club-panel]");
    var contact = $("#contato");
    var heroEl = $("[data-hero], [data-hero-b]");
    // some enquanto a pessoa preenche um campo (no celular ela cobriria o campo e o teclado)
    var typing = false;
    document.addEventListener("focusin", function (e) {
      typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
      pick();
    });
    document.addEventListener("focusout", function () {
      typing = false;
      setTimeout(pick, 50);
    });
    var pick = function () {
      if (typing || html.classList.contains("menu-open")) return show(null);
      var vh = window.innerHeight;
      if (heroEl && heroEl.getBoundingClientRect().bottom > vh * 0.5) return show(heroOn ? "hero" : null);
      if (contact && contact.getBoundingClientRect().top < vh * 0.6) return show("insta");
      if (stack) {
        var r = stack.getBoundingClientRect();
        if (r.top < vh * 0.55 && r.bottom > vh * 0.45) {
          var idx = 0;
          panels.forEach(function (p, i) {
            if (p.getBoundingClientRect().top <= vh * 0.5) idx = i;
          });
          if (idx !== clubIdx) {
            var first = clubIdx < 0 || state !== "clubs";
            clubIdx = idx;
            $$(".island__tab", layers.clubs).forEach(function (t, i) {
              t.classList.toggle("is-on", i === idx);
            });
            if (!first) slide($("[data-island-track]", layers.clubs), $$(".island__tab", layers.clubs)[idx], 0);
          }
          return show("clubs");
        }
      }
      show("talk");
    };

    // cliques: bolinhas levam à frase; abas levam ao empreendimento
    $$("[data-island-stop]", el).forEach(function (b) {
      b.addEventListener("click", function () {
        if (api.heroGoto) api.heroGoto(+b.dataset.islandStop);
      });
    });
    $$("[data-island-club]", el).forEach(function (b) {
      b.addEventListener("click", function () {
        var i = +b.dataset.islandClub;
        var top = stack.getBoundingClientRect().top + window.scrollY + i * panels[0].offsetHeight;
        if (lenis) lenis.scrollTo(top, { duration: 1.2 });
        else window.scrollTo({ top: top, behavior: "smooth" });
      });
    });
    if (lenis) lenis.on("scroll", pick);
    else window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", function () {
      state = null;
      pick();
    });
    api.heroState = function (on, chap) {
      heroOn = on;
      if (chap !== heroChap) {
        var had = heroChap >= 0 && state === "hero";
        heroChap = chap;
        $$(".island__dot", layers.hero).forEach(function (d, i) {
          d.setAttribute("aria-current", i === chap ? "step" : "false");
        });
        if (chap >= 0) slide($("[data-island-track]", layers.hero), $$(".island__dot", layers.hero)[chap], 7, !had);
      }
      pick();
    };
    api.pick = pick;
    setTimeout(pick, 600);
    return api;
  }

  var island = setupIsland();
  // a capa "opção B" (assets/js/hero-b.js) usa a mesma rolagem suave e a mesma ilha
  window.Hollanda = { lenis: lenis, island: island, introStarted: false };

  // Hero "O Mergulho": palavras sobem, "parques aquáticos." se escreve à mão e ganha a onda.
  // Ao rolar, o título sai, a gota cai, a coroa do respingo vira o toboágua, a piscina aparece
  // e a câmera sobe sobre o parque; as frases entram nos segundos marcados em data-in/data-out.
  var hero = $("[data-hero]");
  if (hero) {
    var heroIntro = $$("[data-hero-intro]");
    var heroWords = $$("[data-hero-title] .hw > span");
    var heroAccent = $("[data-hero-accent]");
    var heroWave = $(".hero__wave", hero);
    if (!reduced) {
      gsap.set(heroIntro, { opacity: 0, y: 26 });
      gsap.set(heroWords, { yPercent: 118, rotate: 5, transformOrigin: "0% 100%" });
      gsap.set(heroAccent, { clipPath: "inset(-30% 104% -90% -8%)" });
      gsap.set(heroWave, { clipPath: "inset(-200% 100% -200% 0%)" });
      introTl
        .fromTo("[data-hero-frame]", { scale: 1.12 }, { scale: 1, duration: 2.6, ease: "expo.out" }, 0)
        .to(heroWords, { yPercent: 0, rotate: 0, duration: 1.2, ease: "expo.out", stagger: 0.08 }, 0.15)
        .to(heroAccent, { clipPath: "inset(-30% -8% -90% -8%)", duration: 1.15, ease: "power2.inOut", clearProps: "clipPath" }, 0.55)
        .to(heroWave, { clipPath: "inset(-200% 0% -200% 0%)", duration: 0.8, ease: "power2.out", clearProps: "clipPath" }, 1.45)
        .to(heroIntro, { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.08 }, 0.7);

      var cfg = JSON.parse(hero.dataset.seq);
      // tela em pé (celular, tablet vertical) usa o recorte 9:16
      var portrait = window.innerWidth / window.innerHeight <= 1;
      var prefix = portrait ? "m" : "";
      var endStill = $("[data-hero-end-still]", hero);
      var poster = $("[data-hero-poster]", hero);
      var canvas2d = $("[data-hero-canvas]", hero);
      var liquidCanvas = $("[data-hero-liquid]", hero);
      var stations = (hero.dataset.stations || "").split(",").map(parseFloat).filter(isFinite);
      var layers = { capa: 1, end: 0 };
      stations.forEach(function (s, i) {
        layers["e" + i] = 0;
      });
      var estImgs = stations.map(function () {
        var im = new Image();
        im.decoding = "async";
        return im;
      });
      var seq, liquid;
      var syncLayers = function () {
        poster.style.opacity = layers.capa;
        endStill.style.opacity = layers.end;
        if (seq) seq.redraw();
        if (liquid) liquid.ambient(layers.capa);
      };
      // AVIF: quadros 1,5x mais nítidos com o mesmo peso; WebP menor para navegadores antigos
      avifSupport.then(function (avif) {
        var ext = avif ? ".avif" : ".webp";
        liquid = liquidCanvas ? glLayer(liquidCanvas) : null;
        if (liquid) {
          liquid.ambient(layers.capa);
          canvas2d.style.visibility = "hidden";
        }
        seq = frameSequence(
          canvas2d,
          cfg,
          function (n) {
            return "assets/video/mergulho/" + prefix + ("00" + n).slice(-3) + ext;
          },
          {
            overlays: [
              { img: poster, alpha: function () { return layers.capa; } },
              { img: endStill, alpha: function () { return layers.end; } },
            ].concat(
              estImgs.map(function (im, i) {
                return { img: im, alpha: function () { return layers["e" + i]; } };
              })
            ),
            gl: liquid,
          }
        );
        seq.load(0);
        seq.resize();
        seq.seek(st.t);
        poster.addEventListener("load", seq.redraw);
        endStill.addEventListener("load", seq.redraw);
        window.addEventListener("resize", seq.resize);
        setTimeout(function () {
          seq.loadAll();
          var big = window.innerWidth * (window.devicePixelRatio || 1) > 1700;
          endStill.src = "assets/video/mergulho/fim" + (portrait ? "-m" : big ? "" : "-1600") + ext;
          estImgs.forEach(function (im, i) {
            im.onload = seq.redraw;
            im.src = "assets/video/mergulho/est" + (i + 1) + (portrait ? "-m" : "") + ext;
          });
        }, 60);
      });

      // água viva: o mouse deixa ondinhas, o clique (ou o toque) uma onda maior
      ripples(hero, liquidCanvas, function () {
        return liquid;
      });
      // uma ondinha na água logo abaixo da gota, para mostrar que a imagem reage
      introTl.call(
        function () {
          if (liquid) liquid.drop(portrait ? 0.5 : 0.66, 0.16, 1.1);
        },
        null,
        1.9
      );
      // só desenha enquanto a hero está na tela (fixada pelo pin ou passando)
      gsap.ticker.add(function () {
        if (!liquid) return;
        var r = hero.getBoundingClientRect();
        if (r.bottom > 0 && r.top < window.innerHeight) liquid.frame();
      });
      // ondulação líquida perto de cada troca de cena (segundos em data-cuts)
      var cuts = (hero.dataset.cuts || "").split(",").map(parseFloat).filter(isFinite);

      // Rolagem por paradas: a capa segura um pouco, o vídeo anda até cada parada (data-stations,
      // segundos da montagem) e fica parado ali com a frase inteira e o quadro ampliado por IA.
      // As transições, onde a qualidade cai, só passam enquanto a pessoa rola: se ela parar no
      // meio de uma, a página desliza até a próxima parada (ver "encaixe" abaixo).
      var FALL = 4.5; // a queda da gota anda mais rápido que o resto
      var base = function (t) {
        return t <= FALL ? t * 0.5 : FALL * 0.5 + (t - FALL);
      };
      var baseInv = function (x) {
        return x <= FALL * 0.5 ? x / 0.5 : FALL + (x - FALL * 0.5);
      };
      var COVER = 0.9; // capa parada antes de a gota cair
      var PLATEAU = 1.6; // rolagem parada em cada estação
      var HOLD = 2.4; // fechamento com os 3 empreendimentos
      // posição na rolagem (unidades) do instante t do vídeo, contando as paradas antes dele
      var u = function (t) {
        var x = COVER + base(t);
        stations.forEach(function (s) {
          if (t > s + 1e-4) x += PLATEAU;
        });
        return x;
      };
      // instante do vídeo numa posição da rolagem (dentro de uma parada, fica parado nela)
      var tAt = function (pos) {
        var x = pos - COVER;
        if (x <= 0) return 0;
        for (var i = 0; i < stations.length; i++) {
          var b = base(stations[i]);
          if (x <= b) break;
          if (x <= b + PLATEAU) return stations[i];
          x -= PLATEAU;
        }
        return Math.min(cfg.d, baseInv(x));
      };
      var units = u(cfg.d) + HOLD;
      var st = { t: 0, pos: 0 };
      // centro de cada parada (as 4 frases e o fechamento), em unidades de rolagem
      var chapters = stations
        .map(function (s) {
          return u(s) + PLATEAU / 2;
        })
        .concat([u(cfg.d) + HOLD / 2]);
      var draw = function () {
        st.t = tAt(st.pos);
        if (seq) seq.seek(st.t);
        if (island) {
          var chap = -1;
          var best = 1e9;
          if (st.pos > COVER * 0.8) {
            chapters.forEach(function (c, i) {
              var d = Math.abs(st.pos - c);
              if (d < best) {
                best = d;
                chap = i;
              }
            });
          }
          island.heroState(st.pos > COVER * 0.8, chap);
        }
        if (liquid) {
          var f = 0;
          cuts.forEach(function (c) {
            var x = (st.t - c) / 0.45;
            f = Math.max(f, Math.exp(-x * x));
          });
          liquid.flow(f);
        }
      };
      var heroTl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: hero, start: "top top", end: "+=" + Math.round(units * 19) + "%", scrub: 0.15, pin: true },
      });
      heroTl
        .to(st, { pos: units, duration: units, onUpdate: draw }, 0)
        .to("[data-hero-content]", { yPercent: -14, autoAlpha: 0, ease: "power1.in", duration: 0.7 }, 0.1)
        .to(".hero__bar", { autoAlpha: 0, duration: 0.6 }, 0.1)
        .to(".hero__veil", { opacity: 0, duration: 1.4 }, 0.4)
        // a capa 2K some sobre o 1º quadro do vídeo (é a mesma imagem) e o fecho 2K entra no último
        .to(layers, { capa: 0, duration: u(0.9) - u(0.15), onUpdate: syncLayers }, u(0.15))
        .to(layers, { end: 1, duration: u(cfg.d) - u(cfg.d - 0.45), onUpdate: syncLayers }, u(cfg.d - 0.45))
        .to("[data-hero-scrim]", { opacity: 1, duration: 1.1 }, u(8.75))
        .to(".hero__progress", { opacity: 1, duration: 0.6 }, COVER)
        .fromTo("[data-hero-progress]", { scaleX: 0 }, { scaleX: 1, duration: u(cfg.d) - COVER }, COVER);
      // em cada parada o quadro do vídeo dá lugar à versão nítida (é a mesma imagem, ampliada)
      stations.forEach(function (s, i) {
        var at = u(s);
        var on = { duration: 0.25, onUpdate: syncLayers };
        var off = { duration: 0.25, onUpdate: syncLayers };
        on["e" + i] = 1;
        off["e" + i] = 0;
        heroTl.to(layers, on, at + 0.05).to(layers, off, at + PLATEAU - 0.3);
      });
      // cada frase chega antes da sua parada, fica inteira enquanto o vídeo está parado e sai depois
      $$("[data-beat]", hero).forEach(function (el) {
        var at = u(stations[parseInt(el.dataset.station, 10)]);
        heroTl
          .fromTo(el, { autoAlpha: 0, y: 70, filter: "blur(12px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "power2.out" }, at - 1.1)
          .to(el, { autoAlpha: 0, y: -70, filter: "blur(12px)", duration: 0.8, ease: "power2.in" }, at + PLATEAU + 0.35);
      });
      var end = $("[data-hero-end]", hero);
      if (end) {
        var tend = u(parseFloat(end.dataset.in));
        heroTl
          .fromTo(end, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, tend)
          .from($$(".eyebrow, .hero__end-title", end), { y: 60, autoAlpha: 0, filter: "blur(10px)", duration: 0.9, ease: "power2.out", stagger: 0.15 }, tend)
          .from($$(".hero__clubs li", end), { y: 40, autoAlpha: 0, duration: 0.7, ease: "power2.out", stagger: 0.12 }, tend + 0.5);
      }

      if (island) {
        island.heroGoto = function (i) {
          var trig = heroTl.scrollTrigger;
          var y = trig.start + (chapters[i] / units) * (trig.end - trig.start);
          if (lenis) lenis.scrollTo(y, { duration: 1.4 });
          else window.scrollTo({ top: y, behavior: "smooth" });
        };
      }

      // encaixe: se a rolagem parar no meio de uma transição, a página desliza até a próxima
      // parada no sentido em que a pessoa rolava (capa, as 4 frases e o fechamento)
      if (lenis) {
        var stops = [0].concat(
          stations.map(function (s) {
            return u(s) + PLATEAU / 2;
          }),
          [u(cfg.d) + HOLD / 2]
        );
        var resting = function (x) {
          if (x <= COVER + 0.05 || x >= u(cfg.d) - 0.05) return true;
          return stations.some(function (s) {
            var at = u(s);
            return x >= at - 0.05 && x <= at + PLATEAU + 0.05;
          });
        };
        var idle = null;
        var snapping = false;
        var dir = 1;
        var settle = function () {
          var trig = heroTl.scrollTrigger;
          var y = lenis.scroll;
          if (snapping || y <= trig.start + 1 || y >= trig.end - 1) return;
          var x = ((y - trig.start) / (trig.end - trig.start)) * units;
          if (resting(x)) return;
          var target = null;
          stops.forEach(function (s) {
            if (dir > 0 ? s > x && target === null : s < x) target = s;
          });
          if (target === null) return;
          var ty = trig.start + (target / units) * (trig.end - trig.start);
          var dur = Math.min(1.8, Math.max(0.7, (Math.abs(ty - y) / window.innerHeight) * 0.9));
          var done = function () {
            snapping = false;
          };
          snapping = true;
          lenis.scrollTo(ty, {
            duration: dur,
            easing: function (k) {
              return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            },
            onComplete: done,
          });
          setTimeout(done, dur * 1000 + 400);
        };
        lenis.on("scroll", function () {
          if (!snapping && lenis.direction) dir = lenis.direction;
          clearTimeout(idle);
          idle = setTimeout(settle, 180);
        });
      }

      // a imagem acompanha o mouse de leve (profundidade)
      if (canHover) {
        var heroFrame = $("[data-hero-frame]", hero);
        var hx = gsap.quickTo(heroFrame, "xPercent", { duration: 1.4, ease: "power3" });
        var hy = gsap.quickTo(heroFrame, "yPercent", { duration: 1.4, ease: "power3" });
        hero.addEventListener("mousemove", function (e) {
          hx((e.clientX / window.innerWidth - 0.5) * -1.6);
          hy((e.clientY / window.innerHeight - 0.5) * -1.6);
        });
      }
    }
  }

  // Mergulho: a câmera desce sobre a piscina e entra na água até o azul profundo dos Serviços
  // (120 quadros do filme "dive"; a sequência mistura quadros vizinhos como a da hero)
  var dive = $("[data-dive]");
  if (dive) {
    var diveSeq;
    var dv = { t: 0 };
    var divePortrait = window.innerWidth / window.innerHeight <= 1;
    var diveCanvas = $("[data-dive-canvas]", dive);
    var diveGlCanvas = $("[data-dive-gl]", dive);
    var diveGl = null;
    avifSupport.then(function (avif) {
      diveGl = diveGlCanvas ? glLayer(diveGlCanvas) : null;
      if (diveGl) diveCanvas.style.visibility = "hidden";
      diveSeq = frameSequence(
        diveCanvas,
        { d: 119, s: [[0, 1, 120]] },
        function (n) {
          return "assets/video/dive/" + (divePortrait ? "m" : "") + ("00" + n).slice(-3) + (avif ? ".avif" : ".webp");
        },
        { gl: diveGl }
      );
      diveSeq.resize();
      window.addEventListener("resize", diveSeq.resize);
      if (reduced) {
        dv.t = 60; // sem movimento: um quadro do meio, já dentro da água
        diveSeq.load(60);
        diveSeq.seek(60);
        return;
      }
      diveSeq.load(0);
      diveSeq.seek(dv.t);
      ScrollTrigger.create({ trigger: dive, start: "top 300%", once: true, onEnter: diveSeq.loadAll });
    });
    if (!reduced) {
      var diveTl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: dive, start: "top top", end: "+=320%", scrub: 0.15, pin: true },
      });
      diveTl
        .to(dv, {
          t: 119,
          duration: 1,
          onUpdate: function () {
            if (diveSeq) diveSeq.seek(dv.t);
          },
        }, 0)
        .to("[data-dive-progress]", { scaleX: 1, duration: 1 }, 0);
      $$("[data-dive-caption]", dive).forEach(function (c, i, arr) {
        var at = 0.05 + i * 0.31;
        diveTl.fromTo(c, { opacity: 0, y: 70, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.09, ease: "power2.out" }, at);
        // a última frase fica até o fim (senão sobra uma tela azul vazia)
        if (i < arr.length - 1) diveTl.to(c, { opacity: 0, y: -70, filter: "blur(10px)", duration: 0.09, ease: "power2.in" }, at + 0.2);
      });
    }
  }

  if (dive && !reduced) {
    ripples(dive, $("[data-dive-gl]", dive), function () {
      return diveGl;
    });
    gsap.ticker.add(function () {
      if (!diveGl) return;
      var r = dive.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) diveGl.frame();
    });
  }

  // Serviços: trilho horizontal fixado (desktop)
  var services = $("[data-services]");
  if (services && !reduced) {
    gsap.matchMedia().add("(min-width: 901px)", function () {
      var track = $("[data-services-track]", services);
      var dist = function () {
        return Math.max(0, track.scrollWidth - window.innerWidth);
      };
      var tween = gsap.to(track, {
        x: function () {
          return -dist();
        },
        ease: "none",
        scrollTrigger: {
          trigger: services,
          start: "top top",
          end: function () {
            return "+=" + dist();
          },
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      gsap.to("[data-services-progress]", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: services,
          start: "top top",
          end: function () {
            return "+=" + dist();
          },
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
      $$(".service", track).forEach(function (card) {
        gsap.fromTo(
          card,
          { opacity: 0.2, scale: 0.92 },
          {
            opacity: 1,
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 105%", end: "left 65%", scrub: true },
          }
        );
      });
    });
  }

  // Fotos com parallax (mosaico): a imagem desliza dentro da moldura
  if (!reduced) {
    $$("[data-parallax]").forEach(function (fig) {
      var k = parseFloat(fig.dataset.parallax) || 0.1;
      var im = $("img", fig);
      gsap.fromTo(
        im,
        { yPercent: -k * 60 },
        {
          yPercent: k * 60,
          ease: "none",
          scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    });
  }

  // Galerias horizontais dos clubes: fixa a seção e desliza as fotos (desktop).
  // As fotos andam mais que o scroll (0,6): galerias longas não cansam.
  $$("[data-hscroll]").forEach(function (sec) {
    if (reduced) return;
    gsap.matchMedia().add("(min-width: 901px)", function () {
      var track = $("[data-hscroll-track]", sec);
      var dist = function () {
        return Math.max(0, track.scrollWidth - window.innerWidth);
      };
      gsap.to(track, {
        x: function () {
          return -dist();
        },
        ease: "none",
        scrollTrigger: {
          trigger: sec,
          start: "top top",
          end: function () {
            return "+=" + Math.round(dist() * 0.6);
          },
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    });
  });

  // Empreendimentos: cartões que empilham (o anterior recua)
  var panels = $$("[data-club-panel]");
  if (panels.length && !reduced) {
    panels.forEach(function (p, i) {
      var inner = $(".club-panel__inner", p);
      gsap.from([$(".club-panel__tag", p), $(".club-panel__name", p), $(".club-panel__foot", p)], {
        y: 90,
        opacity: 0,
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: p, start: "top 55%", once: true },
      });
      gsap.fromTo(
        $(".club-panel__video", p),
        { scale: 1.3 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: p, start: "top bottom", end: "top top", scrub: true } }
      );
      if (i < panels.length - 1) {
        gsap.to(inner, {
          scale: 0.9,
          "--dim": 0.72,
          ease: "none",
          scrollTrigger: { trigger: panels[i + 1], start: "top bottom", end: "top top", scrub: true },
        });
      }
    });
  }

  // Método: o motion "Etapas" fica em assets/js/etapas.js (carregado depois deste arquivo).

  /* ==================================================================
     PÁGINAS DOS EMPREENDIMENTOS
     ================================================================== */
  var clubHero = $("[data-club-hero]");
  if (clubHero) {
    var nameEl = $(".club-hero__name", clubHero);
    var bits = $$("[data-club-intro]", clubHero);
    if (!reduced) {
      gsap.set(bits, { opacity: 0, y: 24 });
      gsap.set(nameEl, { autoAlpha: 0 });
      introTl
        .fromTo(".club-hero__media video", { scale: 1.25 }, { scale: 1, duration: 2.6, ease: "expo.out" }, 0)
        .to(bits, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.07 }, 0.5);
      fontsReady.then(function () {
        var nameLines = splitLines(nameEl);
        gsap.set(nameEl, { autoAlpha: 1 });
        introTl.from(nameLines ? nameLines.lines : nameEl, { yPercent: 165, duration: 1.5, ease: "expo.out", stagger: 0.12 }, 0.1);
      });

      // "atravessa" o nome: ele cresce e some, o vídeo aproxima
      gsap
        .timeline({ scrollTrigger: { trigger: clubHero, start: "top top", end: "bottom top", scrub: true } })
        .to(nameEl, { scale: 1.35, yPercent: -30, opacity: 0, ease: "none", transformOrigin: "0% 100%" }, 0)
        .to(".club-hero__media", { scale: 1.15, yPercent: 12, ease: "none" }, 0)
        .to(".club-hero__row, .chips", { opacity: 0, ease: "none", duration: 0.4 }, 0);
    }
  }

  // bento: entrada em cascata
  if (!reduced) {
    ScrollTrigger.batch(".tile", {
      start: "top 92%",
      once: true,
      onEnter: function (batch) {
        gsap.fromTo(batch, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: "expo.out", stagger: 0.08 });
      },
    });
  }

  // Um dia no clube: cena fixada, a luz do vídeo muda de manhã ao entardecer
  var day = $("[data-day]");
  if (day && !reduced) {
    var slides = $$("[data-day-slide]", day);
    var clock = $$("[data-day-clock] li", day);
    var vid = $(".day__media video", day);
    var looks = [
      "brightness(1.08) saturate(0.95) sepia(0) hue-rotate(-6deg)",
      "brightness(1.12) saturate(1.2) sepia(0) hue-rotate(0deg)",
      "brightness(0.82) saturate(1.25) sepia(0.4) hue-rotate(-14deg)",
    ];
    gsap.set(vid, { filter: looks[0] });
    gsap.set(slides[0], { opacity: 1 });
    var dayTl = gsap.timeline({
      scrollTrigger: {
        trigger: day,
        start: "top top",
        end: "+=" + slides.length * 85 + "%",
        scrub: 0.6,
        pin: true,
        onUpdate: function (self) {
          var idx = Math.min(slides.length - 1, Math.floor(self.progress * slides.length * 0.999));
          clock.forEach(function (li, j) {
            li.classList.toggle("is-on", j === idx);
          });
        },
      },
    });
    slides.forEach(function (s, i) {
      var at = i;
      // a primeira cena já chega com o texto (antes a seção entrava só com a imagem)
      if (i > 0) dayTl.fromTo(s, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, at + 0.05);
      if (i < slides.length - 1) {
        dayTl.to(s, { opacity: 0, y: -60, duration: 0.3, ease: "power2.in" }, at + 0.7);
        dayTl.to(vid, { filter: looks[Math.min(i + 1, looks.length - 1)], duration: 0.6, ease: "none" }, at + 0.55);
      }
    });
    dayTl.to(vid, { scale: 1.12, duration: slides.length, ease: "none" }, 0);
    if (clock[0]) clock[0].classList.add("is-on");
  }

  /* ------------------------------------------------------------------
     Preloader (só na primeira visita da sessão) e entrada da página
     ------------------------------------------------------------------ */
  var loader = $(".loader");
  var startIntro = function () {
    fontsReady.then(function () {
      introTl.play();
      window.Hollanda.introStarted = true;
      document.dispatchEvent(new Event("hollanda:intro"));
    });
  };
  if (!loader || reduced) {
    if (loader) loader.remove();
    startIntro();
  } else {
    var seen = false;
    try {
      seen = sessionStorage.getItem("hl-loader") === "1";
      sessionStorage.setItem("hl-loader", "1");
    } catch (err) {}
    if (seen || location.hash.length > 1) {
      loader.remove();
      startIntro();
    } else {
      if (lenis) lenis.stop();
      // monograma: os anéis laranja se desenham, as barras do H sobem, o nome aparece
      var rings = $$(".loader__ring", loader);
      var bars = $$(".loader__bar", loader);
      var ringLen = 2 * Math.PI * 150;
      gsap.set(rings, { strokeDasharray: ringLen, strokeDashoffset: ringLen });
      gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%", transformBox: "fill-box" });
      gsap.set(".loader__word", { opacity: 0, y: 14 });
      var heroPoster = $("[data-hero-poster]");
      var mediaReady = new Promise(function (resolve) {
        if (!heroPoster || (heroPoster.complete && heroPoster.naturalWidth)) return resolve();
        heroPoster.addEventListener("load", resolve, { once: true });
        heroPoster.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 2600);
      });
      var filled = new Promise(function (resolve) {
        gsap
          .timeline({ onComplete: resolve })
          .to(rings, { strokeDashoffset: 0, duration: 1.3, ease: "power3.inOut", stagger: 0.12 }, 0)
          .to(bars, { scaleY: 1, duration: 0.9, ease: "expo.out", stagger: 0.1 }, 0.35)
          .to(".loader__word", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out" }, 0.8);
      });
      Promise.all([mediaReady, filled]).then(function () {
        gsap
          .timeline()
          .to(".loader__mark, .loader__word", { opacity: 0, y: -24, duration: 0.5, ease: "power2.in", stagger: 0.05 })
          .to(
            loader,
            {
              yPercent: -100,
              borderRadius: "0 0 50% 50% / 0 0 22vh 22vh",
              duration: 1.15,
              ease: "expo.inOut",
              onComplete: function () {
                loader.remove();
                if (lenis) lenis.start();
              },
            },
            "-=0.1"
          )
          .add(startIntro, "-=0.7");
      });
    }
  }

  // recalcula após as fontes carregarem (linhas e alturas mudam)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      ScrollTrigger.refresh();
    });
  }
  window.addEventListener("load", function () {
    ScrollTrigger.refresh();
    // links como ../../#empreendimentos: os pins mudam a altura da página, então reposiciona
    var target = location.hash.length > 1 && $(location.hash);
    if (target) {
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
      else target.scrollIntoView();
    }
  });
})();
