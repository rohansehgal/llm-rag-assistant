document.addEventListener("alpine:init", () => {
    Alpine.effect(() => {
      const list = document.getElementById("project-list");
      if (!list) return;
  
      fetch("/projects")
        .then(res => res.json())
        .then(projects => {
          list.innerHTML = "";
  
          projects.forEach(p => {
            const link = document.createElement("a");
            link.href = `/project/${encodeURIComponent(p.slug)}`;
            link.innerHTML = `
              <i data-lucide="folder" class="w-4 h-4 text-gray-500"></i>
              <span>${p.name}</span>
            `;
            link.className = "flex items-center gap-2 px-3 py-1 rounded hover:bg-gray-200 text-sm text-gray-700 truncate";
            list.appendChild(link);
          });
  
          if (window.lucide) {
            lucide.createIcons();
          }
        })
        .catch(err => {
          console.error("Failed to load projects:", err);
        });
    });
  });
  