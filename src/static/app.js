document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // registro para actualizar tarjetas tras signup
  const activityElements = new Map();

  // helper reutilizable para iniciales
  function initialsFromEmail(email) {
    const local = email.split("@")[0] || "";
    const parts = local.split(/[._\-]/).filter(Boolean);
    const initials = (parts.length ? parts : [local]).map(p => p[0]).slice(0, 2).join("");
    return initials.toUpperCase();
  }

  // Crea un elemento de lista para un participante con el botón "X" y su manejador
  function createParticipantListItem(activityName, email, elems) {
    const li = document.createElement("li");
    li.className = "participant";
    li.innerHTML = `<span class="avatar">${initialsFromEmail(email)}</span><span class="participant-email" title="${email}">${email}</span><button class="remove-btn" aria-label="Remove ${email}">✕</button>`;
    const removeBtn = li.querySelector(".remove-btn");
    removeBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!confirm(`Eliminar a ${email} de "${activityName}"?`)) return;
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );
        const result = await response.json();
        if (response.ok) {
          // Quitar elemento del DOM
          li.remove();
          // Actualizar contador de plazas y mensaje vacío
          const elemsRef = elems || activityElements.get(activityName);
          if (elemsRef) {
            const current = parseInt(elemsRef.spotsEl.textContent, 10);
            if (!isNaN(current)) {
              elemsRef.spotsEl.textContent = current + 1;
            }
            // Si ya no hay items, mostrar "Sin participantes"
            if (elemsRef.participantsListEl.children.length === 0) {
              elemsRef.participantsEmptyEl.classList.remove("hidden");
            }
          }
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
        } else {
          messageDiv.textContent = result.detail || "Error eliminando participante";
          messageDiv.className = "error";
        }
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 5000);
      } catch (error) {
        messageDiv.textContent = "Failed to remove participant. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error removing participant:", error);
      }
    });
    return li;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and registry
      activitiesList.innerHTML = "";
      activityElements.clear();

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityName = name;

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>

          <div class="participants-section">
            <div class="participants-header">
              <strong>Participantes</strong>
            </div>
            <ul class="participants-list" aria-hidden="false"></ul>
            <div class="participants-empty">Sin participantes</div>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Referencias para actualizar luego
        const participantsListEl = activityCard.querySelector(".participants-list");
        const participantsEmptyEl = activityCard.querySelector(".participants-empty");
        const spotsEl = activityCard.querySelector(".spots-left");

        // Inicializar lista de participantes
        participantsListEl.innerHTML = "";
        if (details.participants.length === 0) {
          participantsEmptyEl.classList.remove("hidden");
        } else {
          participantsEmptyEl.classList.add("hidden");
          details.participants.forEach((email) => {
            const li = createParticipantListItem(name, email, { participantsListEl, participantsEmptyEl, spotsEl });
            participantsListEl.appendChild(li);
          });
        }

        activityElements.set(name, { participantsListEl, participantsEmptyEl, spotsEl });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Actualizar la tarjeta en el DOM sin recargar
        const elems = activityElements.get(activity);
        if (elems) {
          // añadir participante visualmente
          const li = createParticipantListItem(activity, email, elems);
          elems.participantsListEl.appendChild(li);

          // ocultar mensaje "Sin participantes" si estaba visible
          elems.participantsEmptyEl.classList.add("hidden");

          // decrementar plazas mostradas (sin bajar de 0)
          const current = parseInt(elems.spotsEl.textContent, 10);
          if (!isNaN(current)) {
            elems.spotsEl.textContent = Math.max(0, current - 1);
          }
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
