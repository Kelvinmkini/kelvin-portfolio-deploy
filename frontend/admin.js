const tokenKey = "kelvin_admin_token";

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const contentForm = document.getElementById("contentForm");
const contentTable = document.getElementById("contentTable");
const messagesTable = document.getElementById("messagesTable");
const formTitle = document.getElementById("formTitle");
const saveContentBtn = document.getElementById("saveContentBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function imageSrc(image) {
  if (!image) {
    return "";
  }

  if (image.startsWith("http://kelvin-portfolio-backend-lm1z.onrender.com")) {
    return image.replace("http://", "https://");
  }

  return image;
}

function getToken() {
  return localStorage.getItem(tokenKey);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`
  };
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  loadAdminData();
}

function showLogin() {
  loginSection.classList.remove("hidden");
  dashboardSection.classList.add("hidden");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const status = document.getElementById("loginStatus");

  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: loginForm.username.value,
        password: loginForm.password.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    localStorage.setItem(tokenKey, data.token);
    loginForm.reset();
    status.textContent = "";
    showDashboard();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(tokenKey);
  showLogin();
});

async function loadAdminData() {
  await Promise.all([
    loadContent(),
    loadMessages()
  ]);
}

async function loadContent() {
  const response = await fetch(`${API_URL}/api/content`);
  const content = await response.json();

  contentTable.innerHTML = content.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHtml(item.section)}</td>
      <td>${item.image ? `<img class="table-image" src="${escapeHtml(imageSrc(item.image))}" alt="">` : "No image"}</td>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.description)}</td>
      <td>
        <button type="button" class="edit-btn" data-id="${item.id}">Edit</button>
        <button type="button" class="danger-btn delete-btn" data-id="${item.id}">Delete</button>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const item = content.find((row) => row.id == button.dataset.id);
      editContent(item);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteContent(button.dataset.id);
    });
  });
}

async function loadMessages() {
  const response = await fetch(`${API_URL}/api/messages`, {
    headers: authHeaders()
  });

  if (response.status === 401) {
    localStorage.removeItem(tokenKey);
    showLogin();
    return;
  }

  const messages = await response.json();

  messagesTable.innerHTML = messages.map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.email)}</td>
      <td>${escapeHtml(item.message)}</td>
      <td>${new Date(item.created_at).toLocaleString()}</td>
      <td>
        <button type="button" class="danger-btn" onclick="deleteMessage(${item.id})">Delete</button>
      </td>
    </tr>
  `).join("");
}

contentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = contentForm.id.value;
  const formData = new FormData(contentForm);

  const method = id ? "PUT" : "POST";
  const url = id
    ? `${API_URL}/api/content/${id}`
    : `${API_URL}/api/content`;

  const response = await fetch(url, {
    method,
    headers: authHeaders(),
    body: formData
  });

  if (!response.ok) {
    alert("Saving content failed. Please login again or check backend.");
    return;
  }

  resetContentForm();
  loadContent();
});

window.editContent = function editContent(item) {
  contentForm.id.value = item.id;
  contentForm.oldImage.value = item.image || "";
  contentForm.section.value = item.section;
  contentForm.title.value = item.title;
  contentForm.description.value = item.description;

  formTitle.textContent = "Update Portfolio Content";
  saveContentBtn.textContent = "Update Content";
  cancelEditBtn.classList.remove("hidden");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

function resetContentForm() {
  contentForm.reset();
  contentForm.id.value = "";
  contentForm.oldImage.value = "";

  formTitle.textContent = "Add Portfolio Content";
  saveContentBtn.textContent = "Add Content";
  cancelEditBtn.classList.add("hidden");
}

cancelEditBtn.addEventListener("click", resetContentForm);

window.deleteContent = async function deleteContent(id) {
  if (!confirm("Delete this content?")) {
    return;
  }

  await fetch(`${API_URL}/api/content/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  loadContent();
};

window.deleteMessage = async function deleteMessage(id) {
  if (!confirm("Delete this message?")) {
    return;
  }

  await fetch(`${API_URL}/api/messages/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  loadMessages();
};

if (getToken()) {
  showDashboard();
} else {
  showLogin();
}
