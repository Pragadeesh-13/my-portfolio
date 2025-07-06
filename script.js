const texts = [
  "Software Engineering student",
  "ML Enthusiast",
  "Full-stack Developer",
];

let count = 0,
  index = 0,
  isDeleting = false;

function type() {
  const element = document.getElementById("type-writer");
  const text = texts[count % texts.length];

  element.textContent = text.slice(0, index);

  if (!isDeleting) {
    index++;
    if (index > text.length) {
      isDeleting = true;
      setTimeout(type, 1000);
      return;
    }
  } else {
    index--;
    if (index === 0) {
      isDeleting = false;
      count++;
    }
  }

  setTimeout(type, isDeleting ? 50 : 100);
}
window.onload = type;

function updateAOSAnimation() {
  const ele = document.getElementById("left-col");
  const ele2 = document.getElementById("right-col");
  const ele3 = document.getElementById("bottom-col");

  if (window.innerWidth <= 960) {
    ele.setAttribute("data-aos", "fade-up");
    ele2.setAttribute("data-aos", "fade-up");
    ele3.setAttribute("data-aos", "fade-up");
  } else {
    ele.setAttribute("data-aos", "fade-right");
    ele2.setAttribute("data-aos", "fade-left");
    ele3.setAttribute("data-aos", "fade-up");
  }

  AOS.refresh();
}
document.addEventListener("DOMContentLoaded", () => {
  updateAOSAnimation();
  AOS.init({ once: false });
  change_colour();
  document
    .querySelectorAll(".nav-links[href='#home']")
    .forEach((link) => link.classList.add("nav-click"));
});

window.addEventListener("resize", updateAOSAnimation);

const mob = document.getElementById("mobile");
const ham = document.getElementById("ham-burg");
const body = document.body;
function show() {
  mob.classList.toggle("display");
}
const ele = document.querySelectorAll(".nav-links");
function change_colour() {
  ele.forEach((element) => {
    element.addEventListener("click", (e) => {
      ele.forEach((l) => l.classList.remove("nav-click"));
      element.classList.add("nav-click");
    });
  });
}
document.addEventListener("click", (e) => {
  const isHamburger = ham.contains(e.target);
  const isMobileNav = mob.contains(e.target);

  if (mob.classList.contains("display") && !isHamburger && !isMobileNav) {
    mob.classList.toggle("display");
  }
});

document.querySelectorAll(".mobile-nav .nav-links").forEach((link) => {
  link.addEventListener("click", () => {
    if (mob.classList.contains("display")) {
      mob.classList.toggle("display");
    }
  });
});
function simulateMobileHoverAnimation() {
  const cards = document.querySelectorAll(".hover-effect");

  cards.forEach((card) => {
    card.addEventListener("touchstart", () => {
      cards.forEach((c) => c.classList.remove("card-tap-animate"));

      card.classList.add("card-tap-animate");

      setTimeout(() => {
        card.classList.remove("card-tap-animate");
      }, 300);
    });
  });
}

simulateMobileHoverAnimation();
