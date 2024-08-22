// Check if the user has a dark mode preference saved
const savedDarkMode = localStorage.getItem("dark-mode");

if (savedDarkMode === "enabled") {
  document.body.classList.add("dark-mode");
}

const toggleButton = document.getElementById("dark-mode-toggle");
const body = document.body;

toggleButton.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  const isDarkMode = body.classList.contains("dark-mode");

  if (isDarkMode) {
    localStorage.setItem("dark-mode", "enabled");
    toggleButton.textContent = "Light Mode";
  } else {
    localStorage.setItem("dark-mode", "disabled");
    toggleButton.textContent = "Dark Mode";
  }
});

if (document.body.classList.contains("dark-mode")) {
  toggleButton.textContent = "Light Mode";
} else {
  toggleButton.textContent = "Dark Mode";
}
