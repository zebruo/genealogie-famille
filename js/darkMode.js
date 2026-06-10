function loadDarkModeScript() {
        const darkModeToggle = document.getElementById("dark-mode-toggle");
        const body = document.body;
        const darkMode = localStorage.getItem("darkMode") === "enabled";
        if (darkMode) {
          body.classList.add("dark-mode");
        }
        darkModeToggle.addEventListener("click", () => {
          body.classList.toggle("dark-mode");
          if (body.classList.contains("dark-mode")) {
            localStorage.setItem("darkMode", "enabled");
          } else {
            localStorage.removeItem("darkMode");
          }
        });
      }