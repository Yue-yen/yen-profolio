// Entrance motion for project pages.
// Content stays visible when this file does not run, and when the user
// prefers reduced motion. Movement is opacity plus transform only.
(function () {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  // A reload otherwise restores the last reading position. Overview sits
  // above that position and was transparent until scrolled back into view.
  if (history.scrollRestoration) history.scrollRestoration = "manual";

  document.documentElement.classList.add("js");

  var timer = 0;
  var tries = 0;
  var didPin = false;

  function pinTop() {
    if (didPin) return;
    didPin = true;
    if (window.scrollY) window.scrollTo(0, 0);
  }

  window.addEventListener("pageshow", pinTop);

  function pageNode() {
    var page = document.querySelector("#dc-root .page-project");
    if (!page || page.closest("x-dc")) return null;
    return page;
  }

  function inView(el) {
    var rect = el.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function show(el, delay) {
    el.style.setProperty("--reveal-delay", delay + "ms");
    el.classList.add("is-in");
  }

  function setup(page) {
    var hero = page.querySelector(".case-slot--hero");
    var heroFigure = hero ? hero.closest("figure") : null;
    var first = page.querySelector(".case-section");
    var intro = [];
    var pending = [];

    page.querySelectorAll(".case-kicker, .case-title").forEach(function (el) {
      intro.push({ el: el, delay: 0 });
    });

    var meta = page.querySelector(".case-meta");
    if (meta) intro.push({ el: meta, delay: 160 });

    if (first) {
      if (heroFigure && first.contains(heroFigure)) {
        Array.prototype.forEach.call(first.children, function (child) {
          if (child !== heroFigure) intro.push({ el: child, delay: 320 });
        });
      } else {
        intro.push({ el: first, delay: 320 });
      }
    }

    if (heroFigure) {
      if (inView(heroFigure)) intro.push({ el: heroFigure, delay: 520 });
      else pending.push(heroFigure);
    }

    page.querySelectorAll(".case-section").forEach(function (section) {
      if (section === first) return;
      if (inView(section)) intro.push({ el: section, delay: 700 });
      else pending.push(section);
    });

    var next = page.querySelector(".case-next");
    if (next) {
      if (inView(next)) intro.push({ el: next, delay: 700 });
      else pending.push(next);
    }

    var footer = page.querySelector(".site-footer");
    if (footer) pending.push(footer);

    var all = intro.map(function (item) { return item.el; }).concat(pending);
    all.forEach(function (el) {
      el.classList.remove("is-in");
      el.classList.add("reveal");
    });

    if (!all.length || getComputedStyle(all[0]).opacity !== "0") {
      all.forEach(function (el) { el.classList.remove("reveal"); });
      return false;
    }

    void page.offsetWidth;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        intro.forEach(function (item) { show(item.el, item.delay); });
      });
    });

    if (page.__revealIO) page.__revealIO.disconnect();
    if (!pending.length) return true;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        show(entry.target, 0);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

    pending.forEach(function (el) { io.observe(el); });
    page.__revealIO = io;
    return true;
  }

  function kick() {
    var page = pageNode();
    if (!page) return;
    var title = page.querySelector(".case-title");
    if (!title) return;
    if (page.dataset.revealArmed === "1" && title.classList.contains("reveal")) return;
    pinTop();
    if (setup(page)) page.dataset.revealArmed = "1";
    else if (tries < 40) {
      tries += 1;
      schedule();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(kick, 80);
  }

  new MutationObserver(function (records) {
    var wiped = records.some(function (record) {
      if (record.type !== "attributes" || record.attributeName !== "class") return false;
      var had = (record.oldValue || "").split(/\s+/).indexOf("reveal") !== -1;
      var has = record.target.classList && record.target.classList.contains("reveal");
      return had && !has;
    });
    if (wiped) {
      var page = pageNode();
      if (page) delete page.dataset.revealArmed;
    }
    schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
    attributeOldValue: true
  });

  schedule();
})();
