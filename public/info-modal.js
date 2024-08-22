document.addEventListener("DOMContentLoaded", function () {
  const infoIcon = document.getElementById("info-icon");
  const infoModal = document.getElementById("info-modal");
  const closeInfo = document.getElementById("close-info");

  infoIcon.addEventListener("click", () => {
    infoModal.style.display = "block";
  });

  closeInfo.addEventListener("click", () => {
    infoModal.style.display = "none";
  });

  // Close the modal if the user clicks outside of it
  window.addEventListener("click", (event) => {
    if (event.target == infoModal) {
      infoModal.style.display = "none";
    }
  });
});
