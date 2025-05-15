async function loadProjects() {
    const list = document.getElementById("project-list");
    if (!list) return;
  
    try {
      const res = await fetch("/projects");
      const projects = await res.json();
  
      list.innerHTML = "";
  
      projects.forEach(p => {
        const link = document.createElement("a");
        link.href = `/project/${encodeURIComponent(p.slug)}`;
        link.textContent = p.name;
        link.className = "block px-3 py-1 rounded hover:bg-gray-200 text-sm text-gray-700 truncate";
        list.appendChild(link);
      });
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
  }
  
  document.addEventListener("DOMContentLoaded", loadProjects);
  