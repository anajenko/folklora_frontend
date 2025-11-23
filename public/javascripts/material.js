document.addEventListener("DOMContentLoaded", () => {
    const materialContainer = document.getElementById("material-container");
    const addForm = document.getElementById("add-material-form");

    // --- FILE INPUT LISTENER ---
    const fileInput = document.getElementById('slika');
    const fileLabel = document.querySelector('.custom-file-label');

    fileInput.addEventListener('change', () => {
        fileLabel.textContent = fileInput.files.length
            ? fileInput.files[0].name
            : 'Izberi datoteko z naprave';
    });

    // --- DRAG & DROP HANDLER ---
    function handleLabelDrop(e, materialCard) {
        e.preventDefault();

        const labelId = e.dataTransfer.getData('text/plain'); // the label id
        const labelName = e.dataTransfer.getData('label-name'); // the label name

        if (!labelId || !labelName) return;

        // Append label to material card visually
        const labelsContainer = materialCard.querySelector('.material-labels');
        if (labelsContainer) {
            // Prevent duplicate labels
            const existing = Array.from(labelsContainer.children).some(span => span.textContent === labelName);
            if (!existing) {
                const span = document.createElement('span');
                span.classList.add('material-label');
                span.textContent = labelName;
                labelsContainer.appendChild(span);
            }
        }

        // Optionally: send to backend to save the label on this material
        fetch(`http://localhost:3000/api/labele/dodaj/${materialCard.dataset.id}/${labelId}`, { method: 'POST' });
    }

    async function loadMaterial() {
        const materials = await fetchJSON('http://localhost:3000/api/datoteke/');

        // Clear container ONCE
        materialContainer.innerHTML = '';

        // Create fragment (fast, no glitch)
        const frag = document.createDocumentFragment();

        // Pre-fetch all labels for all materials
        const labelsMap = {};
        await Promise.all(
            materials.map(async (m) => {
                try {
                    labelsMap[m.id] = await fetchJSON(`http://localhost:3000/api/labele/datoteka/${m.id}`);
                } catch (err) {
                    labelsMap[m.id] = [];
                    console.error("Napaka pri nalaganju label:", err);
                }
            })
        );

        // Build all cards in memory (no DOM writes yet)
        for (const m of materials) {
            const div = document.createElement('div');
            div.classList.add('material-card');
            div.dataset.id = m.id;

            const labelsHTML = (labelsMap[m.id] || [])
                .map(l => `<span class="material-label" data-id="${l.id}">${l.naziv}</span>`)
                .join(' ');

            div.innerHTML = `
                <h3>${m.ime}</h3>
                <div class="material-content">
                    <img src="/datoteke/${m.id}" alt="${m.ime}" draggable="false">
                </div>
                <div class="material-labels">${labelsHTML}</div>
                <button data-id="${m.id}" class="delete-x">&times;</button>
            `;

            // Disable dragging the image
            div.querySelector('img').addEventListener('dragstart', e => e.preventDefault());

            // Drag & Drop
            div.addEventListener('dragover', e => e.preventDefault());
            div.addEventListener('drop', e => handleLabelDrop(e, div));

            // PREPEND into fragment (newest first)
            frag.prepend(div);
        }

        // Add everything to the DOM AT ONCE → no glitch
        materialContainer.appendChild(frag);
    }

    addForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(addForm);

        try {
            const res = await fetch('http://localhost:3000/api/datoteke/', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            alert(data.message);
            addForm.reset();
            fileLabel.textContent = 'Izberi datoteko z naprave';
            loadMaterial();
        } catch (err) {
            alert('Napaka: ' + err.message);
        }
    });

    // Delete material
    materialContainer.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-x")) {
            const id = e.target.dataset.id;
            await fetch(`http://localhost:3000/api/datoteke/${id}`, { method: 'DELETE' });
            loadMaterial();
        }
    });

    loadMaterial();
});
