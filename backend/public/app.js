let isLogin = true;

function toggleAuth(e) {
  e.preventDefault();
  isLogin = !isLogin;
  document.getElementById("auth-title").textContent = isLogin
    ? "Login"
    : "Register";
  document.getElementById("toggle-auth").textContent = isLogin
    ? "Don't have an account? Register"
    : "Already have an account? Login";
  document.getElementById("auth-error").classList.add("hidden");
}

async function handleAuth() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("auth-error");

  const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");
    showDashboard(data.user);
  } catch (err) {
    errorEl.textContent = "Something went wrong";
    errorEl.classList.remove("hidden");
  }
}

function showDashboard(user) {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("user-email").textContent = user.email;
  loadUrls();
}

async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("dashboard").classList.add("hidden");
}

async function shortenUrl() {
  const url = document.getElementById("long-url").value;
  const errorEl = document.getElementById("shorten-error");
  const resultEl = document.getElementById("shorten-result");

  try {
    const res = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error;
      errorEl.classList.remove("hidden");
      resultEl.classList.add("hidden");
      return;
    }

    errorEl.classList.add("hidden");
    const shortUrl =
      data.short_url || `${window.location.origin}/${data.short_code}`;
    resultEl.innerHTML = `Short URL: <a href="${shortUrl}" target="_blank" class="short-url">${shortUrl}</a>`;
    resultEl.classList.remove("hidden");
    document.getElementById("long-url").value = "";
    loadUrls(); // Refresh the list
  } catch (err) {
    errorEl.textContent = "Something went wrong";
    errorEl.classList.remove("hidden");
  }
}

async function loadUrls() {
  const listEl = document.getElementById("url-list");

  try {
    const res = await fetch("/api/urls");
    const data = await res.json();

    if (!res.ok) {
      listEl.innerHTML = "<li>Failed to load URLs</li>";
      return;
    }

    if (data.urls.length === 0) {
      listEl.innerHTML = "<li>No URLs yet. Create your first one above!</li>";
      return;
    }

    listEl.innerHTML = data.urls
      .map(
        (url) => `
      <li>
        <a href="/${url.short_code}" target="_blank" class="short-url">/${url.short_code}</a>
        → ${url.original_url.substring(0, 50)}${url.original_url.length > 50 ? "..." : ""}
        <span class="clicks">(${url.total_clicks} clicks)</span>
      </li>
    `,
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = "<li>Error loading URLs</li>";
  }
}

// Check if already logged in on page load
async function checkSession() {
  try {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      showDashboard(data.user);
    }
  } catch {
    // Not logged in, show auth form
  }
}

checkSession();
