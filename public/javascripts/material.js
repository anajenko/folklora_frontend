document.addEventListener("DOMContentLoaded", () => {
    const materialContainer = document.getElementById("material-container");
    const addForm = document.getElementById("add-material-form");

    // --- FILE INPUT LISTENER ---
    const fileInput = document.getElementById('slika');
    const fileLabel = document.querySelector('.custom-file-label');

    fileInput.addEventListener('change', () => {
        fileLabel.textContent = fileInput.files.length
            ? fileInput.files[0].name
            : 'Izberi .jpg ali .jpeg datoteko z naprave';
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
        fetchJSON(`http://localhost:3000/api/labele/dodaj/${materialCard.dataset.id}/${labelId}`, { method: 'POST' });
    }

    async function loadMaterial() {
        const materials = await fetchJSON('http://localhost:3000/api/kosi/');

        // Clear container ONCE
        materialContainer.innerHTML = '';

        // Create fragment (fast, no glitch)
        const frag = document.createDocumentFragment();

        // Pre-fetch all labels for all materials
        const labelsMap = {};
        await Promise.all(
            materials.map(async (m) => {
                try {
                    labelsMap[m.id] = await fetchJSON(`http://localhost:3000/api/labele/kos/${m.id}`);
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
            div.dataset.ime = m.ime;

            const labelsHTML = (labelsMap[m.id] || [])
                .map(l => `<span class="material-label" data-id="${l.id}">${l.naziv}</span>`)
                .join(' ');

            div.innerHTML = `
                <h3>${m.ime}</h3>
                <div class="material-content">
                    <img src="http://localhost:3000/api/kosi/${m.id}" alt="${m.ime}" draggable="false">
                </div>
                <div class="material-labels">${labelsHTML}</div>
                <button data-id="${m.id}" class="delete-x">
                    <img src="images/delete-icon.png" alt="Delete" />
                </button>
            `;

            try {
                const komentarji = await fetchJSON(`http://localhost:3000/api/komentarji/kos/${m.id}`);
                if (komentarji.length > 0) {
                    const icon = document.createElement("img");
                    icon.src = "/images/comment.png";
                    icon.alt = "Komentarji";
                    icon.title = "Kos ima komentarje";
                    icon.classList.add("comment-icon");
                    div.appendChild(icon);
                }
            } catch (err) {
                console.error("Napaka pri preverjanju komentarjev:", err);
            }

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

        // Preverimo, ali je izbrana datoteka
        const fileInput = addForm.querySelector('input[type="file"]');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Za uvoz kosa je potrebno izbrati datoteko z naprave.');
            return; // ustavi submit
        }
        
        const formData = new FormData(addForm);

        try {
            const data = await fetchJSON('http://localhost:3000/api/kosi/', { method: 'POST', body: formData, skipJsonHeader: true });
            
            alert(data.message);
            addForm.reset();
            if (fileLabel) fileLabel.textContent = 'Izberi .jpg ali .jpeg datoteko z naprave';
            loadMaterial();
        } catch (err) {
            alert(err.message);
        }
    });

    // Delete material
    materialContainer.addEventListener("click", async (e) => {
        const button = e.target.closest(".delete-x");
        if (!button) return;

        const id = button.dataset.id;

        const materialCard = button.closest('.material-card');
        const materialLabels = materialCard.querySelectorAll('.material-label');
        const hasLabels = materialLabels.length > 0;

        try {
            // preverimo komentarje
            const komentarji = await fetchJSON(`http://localhost:3000/api/komentarji/kos/${id}`);
            const hasComments = komentarji.length > 0;

            // sestavimo sporočilo
            let confirmedMessage = "Ali ste prepričani, da želite izbrisati kos?";

            if (hasLabels || hasComments) {
                confirmedMessage = 
                    "Kos ima dodane komentarje ali labele.\n\n" +
                    "V primeru, da izbrišete kos, se bodo izbrisali tudi vsi komentarji oz. povezave z labelami.\n" +
                    "Ali želite vseeno nadaljevati z brisanjem kosa?";
            }

            const confirmed = confirm(confirmedMessage);
            if (!confirmed) return;

            // Če je potrjeno, izbrišemo kos
            await fetchJSON(`http://localhost:3000/api/kosi/${id}`, { method: 'DELETE', skipJson: true });
            loadMaterial();

        } catch (err) {
            alert(err.message);
        }
    });

    loadMaterial();
});
