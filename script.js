const texts = [
  "Software Engineering student",
  "ML Enthusiast",
  "Full-stack Developer",
];

let count = 0, index = 0, isDeleting = false;

function type() {
  const element = document.getElementById("type-writer");
  const text = texts[count % texts.length];

  element.textContent = text.slice(0, index);

  if (!isDeleting) {
    index++;
    if (index > text.length) {
      isDeleting = true;
      setTimeout(type, 1000); // pause before deleting
      return;
    }
  } else {
    index--;
    if (index === 0) {
      isDeleting = false;
      count++;
    }
  }

  setTimeout(type, isDeleting ? 50 : 100); // speed
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

  AOS.refresh(); // Tell AOS to recheck DOM
}

document.addEventListener("DOMContentLoaded", () => {
  updateAOSAnimation();
  AOS.init({ once: false });
});

window.addEventListener("resize", updateAOSAnimation);


