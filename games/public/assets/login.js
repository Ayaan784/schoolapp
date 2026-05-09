const form = document.querySelector("#login-form");
const message = document.querySelector("#login-message");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "Checking password...";

  const formData = new FormData(form);
  const password = formData.get("password");

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const result = await response.json();

    if (result.ok) {
      window.location.href = "/";
      return;
    }

    message.textContent = result.message || "That did not work. Try again.";
  } catch {
    message.textContent = "Could not reach the login server.";
  }
});
