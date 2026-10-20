document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("activity-search");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("activity-sort");
  let activitiesData = {};

  function getStartTime(schedule) {
    const match = schedule.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);

    if (!match) {
      return Number.MAX_SAFE_INTEGER;
    }

    let hours = Number(match[1]) % 12;
    const minutes = Number(match[2] || 0);
    if (match[3].toUpperCase() === "PM") {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  function renderActivities() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const matchingActivities = Object.entries(activitiesData)
      .filter(([name, details]) => {
        const matchesCategory = !selectedCategory || details.category === selectedCategory;
        const searchableText = `${name} ${details.description} ${details.schedule} ${details.category}`.toLowerCase();
        return matchesCategory && searchableText.includes(searchTerm);
      })
      .sort(([nameA, detailsA], [nameB, detailsB]) => {
        if (sortSelect.value === "schedule") {
          return getStartTime(detailsA.schedule) - getStartTime(detailsB.schedule) || nameA.localeCompare(nameB);
        }

        return nameA.localeCompare(nameB);
      });

    activitiesList.innerHTML = "";
    if (matchingActivities.length === 0) {
      activitiesList.innerHTML = "<p class=\"empty-state\">No activities match your filters.</p>";
      return;
    }

    matchingActivities.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;
      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : "<p><em>No participants yet</em></p>";

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p class="activity-category">${details.category}</p>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">${participantsHTML}</div>
      `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      activitiesData = await response.json();

      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      Object.keys(activitiesData).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortSelect.addEventListener("change", renderActivities);

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
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
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
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
