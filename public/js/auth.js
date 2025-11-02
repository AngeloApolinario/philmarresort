// public/js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector("#loginFormElem");
  const signupForm = document.querySelector("#signupFormElem");

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(loginForm).entries());
      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.redirected) return (window.location.href = res.url);

        if (res.ok) {
          alert("✅ Logged in successfully!");
          window.location.reload();
        } else {
          alert("❌ Login failed. Please check your credentials.");
        }
      } catch (err) {
        console.error("Login error:", err);
        window.location.href = "/login";
      }
    });
  }

  // Handle Signup
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(new FormData(signupForm).entries());
      try {
        const res = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.redirected) return (window.location.href = res.url);

        if (res.ok) {
          alert("🎉 Account created successfully!");
          window.location.reload();
        } else {
          alert("❌ Signup failed. Please try again.");
        }
      } catch (err) {
        console.error("Signup error:", err);
        window.location.href = "/signup";
      }
    });
  }
});
