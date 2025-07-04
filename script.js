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