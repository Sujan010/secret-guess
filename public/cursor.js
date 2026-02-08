const outer = document.querySelector(".cursor-outer");
const inner = document.querySelector(".cursor-inner");

// Track mouse

// Hover grow
document.querySelectorAll("button, a, input, select").forEach((el) => {
  el.addEventListener("mouseenter", () => {
    document.body.classList.add("hover-grow");
  });
  el.addEventListener("mouseleave", () => {
    document.body.classList.remove("hover-grow");
  });
});

// Optional click pulse
document.addEventListener("mousedown", () => {
  outer.style.transform += " scale(0.8)";
});
document.addEventListener("mouseup", () => {
  outer.style.transform = outer.style.transform.replace(/ scale\(0\.8\)/, "");
});

let mouseX = 0,
  mouseY = 0,
  outerX = 0,
  outerY = 0;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  inner.style.left = mouseX + "px";
  inner.style.top = mouseY + "px";
});

function animateOuter() {
  outerX += (mouseX - outerX) * 0.15;
  outerY += (mouseY - outerY) * 0.15;

  outer.style.left = outerX + "px";
  outer.style.top = outerY + "px";

  requestAnimationFrame(animateOuter);
}
animateOuter();
