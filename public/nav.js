function go(section) {
  const el = document.getElementById(section);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}
