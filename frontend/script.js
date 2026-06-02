const fallbackHeroImage = "uploads/1780351668_header_background.png";
const fallbackProfileImage = "uploads/1780354205_profile.JPG";
const fallbackSectionImages = {
  skill: "uploads/1780352207_skills.png",
  qualification: "uploads/1780352596_qualification.png",
  project: "uploads/1780353166_project.png"
};

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

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return image;
}

function cardTemplate(item) {
  const image = item.image || fallbackSectionImages[item.section];
  const imageHtml = image
    ? `<img src="${escapeHtml(imageSrc(image))}" alt="${escapeHtml(item.title)}">`
    : "";

  return `
    <div class="content-card">
      ${imageHtml}
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>
  `;
}

function projectTemplate(item) {
  const image = item.image || fallbackSectionImages[item.section];
  const imageHtml = image
    ? `<img src="${escapeHtml(imageSrc(image))}" alt="${escapeHtml(item.title)}">`
    : "";

  return `
    <div class="project-card">
      ${imageHtml}
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </div>
  `;
}

async function loadPortfolio() {
  try {
    const response = await fetch(`${API_URL}/api/content`);
    const content = await response.json();

    const headers = content.filter((item) => item.section === "header" && item.image);
    const profiles = content.filter((item) => item.section === "profile");
    const skills = content.filter((item) => item.section === "skill");
    const qualifications = content.filter((item) => item.section === "qualification");
    const projects = content.filter((item) => item.section === "project");

    const heroImage = headers[0]?.image || fallbackHeroImage;

    document.getElementById("hero").style.backgroundImage =
      `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url("${imageSrc(heroImage)}")`;

    const profileWithImage = profiles.find((item) => item.image);

    document.getElementById("profileImage").src =
      imageSrc(profileWithImage?.image || fallbackProfileImage);

    document.getElementById("profileContent").innerHTML = profiles.map((item) => `
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    `).join("");

    document.getElementById("skillsContent").innerHTML = skills.map(cardTemplate).join("");
    document.getElementById("qualificationsContent").innerHTML = qualifications.map(cardTemplate).join("");
    document.getElementById("projectsContent").innerHTML = projects.map(projectTemplate).join("");

    setupMagicScroll();
  } catch (error) {
    document.getElementById("profileContent").innerHTML =
      "<p>Unable to load portfolio content. Please check backend API.</p>";

    document.getElementById("hero").style.backgroundImage =
      `linear-gradient(rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.85)), url("${fallbackHeroImage}")`;

    setupMagicScroll();
  }
}

document.getElementById("contactForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const form = event.target;
  const status = document.getElementById("formStatus");

  const payload = {
    name: form.name.value,
    email: form.email.value,
    message: form.message.value
  };

  status.textContent = "Sending...";

  try {
    const response = await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Message failed");
    }

    form.reset();
    status.textContent = "Message sent successfully.";
  } catch (error) {
    status.textContent = "Message failed. Please check backend connection.";
  }
});

function setupMagicScroll() {
  const animatedItems = document.querySelectorAll(".hero, section, .content-card, .project-card");

  animatedItems.forEach((item) => {
    item.classList.add("magic-scroll");
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
        entry.target.classList.remove("hide-up");
      } else {
        entry.target.classList.remove("show");
        entry.target.classList.add("hide-up");
      }
    });
  }, {
    threshold: 0.15
  });

  animatedItems.forEach((item) => {
    observer.observe(item);
  });
}

loadPortfolio();
