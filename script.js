(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d", { alpha: true });

  let points = [];
  let width = 0;
  let height = 0;

  const makePoints = (count) => {
    points = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.8 + 0.6
    }));
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    const density = Math.max(36, Math.floor((width * height) / 22000));
    makePoints(density);
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      ctx.beginPath();
      ctx.fillStyle = "rgba(130, 214, 255, 0.75)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < points.length; j += 1) {
        const q = points[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(130, 214, 255, ${0.12 - dist / 1200})`;
          ctx.lineWidth = 1;
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  };

  if (!reducedMotion) {
    resize();
    draw();
    window.addEventListener("resize", resize);
  }

  const revealNodes = document.querySelectorAll(".section-reveal");
  if (reducedMotion) {
    revealNodes.forEach((el) => el.classList.add("visible"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    revealNodes.forEach((el) => io.observe(el));
  }

  const navLinks = Array.from(document.querySelectorAll(".nav a"));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const syncActiveNav = () => {
    const offset = window.scrollY + window.innerHeight * 0.25;
    let currentSection = sections[0];

    sections.forEach((section) => {
      if (section.offsetTop <= offset) {
        currentSection = section;
      }
    });

    navLinks.forEach((link) => {
      const target = link.getAttribute("href");
      link.classList.toggle("active", currentSection && target === `#${currentSection.id}`);
    });
  };

  syncActiveNav();
  window.addEventListener("scroll", syncActiveNav, { passive: true });
})();
