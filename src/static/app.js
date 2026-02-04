document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Preserve current selected activity and reset select options to avoid duplicates
      const prevSelected = activitySelect.value;
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsContainer = document.createElement("div");
        participantsContainer.className = "participants";

        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants";
        participantsContainer.appendChild(participantsTitle);

        const participantsListDiv = document.createElement("div");
        participantsListDiv.className = "participants-list";

        const participants = Array.isArray(details.participants) ? details.participants : [];

        if (participants.length > 0) {
          const maxAvatars = 5;
          participants.forEach((p, idx) => {
            if (idx < maxAvatars) {
              const item = document.createElement("div");
              item.className = "participant-item";

              const avatar = document.createElement("span");
              avatar.className = "participant-avatar";
              // Generate initials from email/name segments
              const initials = (p || "")
                .split(/[\s@._-]+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(s => s[0].toUpperCase())
                .join("");
              avatar.textContent = initials || "?";
              avatar.title = p;

              // Remove button (X)
              const removeBtn = document.createElement("button");
              removeBtn.className = "participant-remove";
              removeBtn.type = "button";
              removeBtn.title = `Remove ${p} from ${name}`;
              removeBtn.textContent = "×";
              removeBtn.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!confirm(`Remove ${p} from ${name}?`)) return;
                await removeParticipant(name, p);
              });

              item.appendChild(avatar);
              item.appendChild(removeBtn);
              participantsListDiv.appendChild(item);
            }
          });

          if (participants.length > maxAvatars) {
            const more = document.createElement("span");
            more.className = "participant-more";
            more.textContent = `+${participants.length - maxAvatars}`;
            more.title = participants.slice(maxAvatars).join(", ");
            participantsListDiv.appendChild(more);
          }
        } else {
          const none = document.createElement("p");
          none.className = "participants-none";
          none.textContent = "No participants yet";
          participantsListDiv.appendChild(none);
        }

        participantsContainer.appendChild(participantsListDiv);
        activityCard.appendChild(participantsContainer);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Restore previous selection if still available
      if (prevSelected && activities.hasOwnProperty(prevSelected)) {
        activitySelect.value = prevSelected;
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Remove a participant from an activity
  async function removeParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      const result = await response.json();
      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");
        // Refresh the activities list to reflect changes
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Failed to remove participant";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
      setTimeout(() => messageDiv.classList.add("hidden"), 4000);
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error removing participant:", error);
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
        // Refresh activities list so the new participant appears immediately
        await fetchActivities();
        signupForm.reset();
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
