function createProject() {
    const name = document.getElementById("projectNameInput")?.value.trim();
  
    if (!name) {
      alert("Please enter a project name.");
      return;
    }
  
    fetch("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
            window.location.href = `/project/${encodeURIComponent(data.slug)}`;
        } else {
          alert(data.error || "Project creation failed.");
        }
      })
      .catch(err => {
        console.error("❌ Error creating project:", err);
        alert("Server error. Try again.");
      });
  }
  