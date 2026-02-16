document.addEventListener("DOMContentLoaded", () => {
    const labelsContainer = document.getElementById("labels-container");
    const addLabelForm = document.getElementById("add-label-form");
    const materialContainer = document.getElementById("material-container");

    let observer; // MutationObserver to attach drop listeners

    /*// --- Helper: fetch JSON with error handling ---
    async function fetchJSON(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error((await res.json()).message || res.statusText);
        return res.json();
    }*/

    // --- Load labels into sidebar ---
    async function loadLabels() {
        labelsContainer.innerHTML = '';
        try {
            const labels = await fetchJSON('http://localhost:3000/api/labele/');
            const grouped = {};

            // Map internal tip names to display names
            const tipNames = {
                'pokrajina': 'Pokrajina',
                'tip_oblacila': 'Tip oblačila',
                'spol': 'Spol',
                'velikost': 'Velikost',
                'drugo': 'Drugo'
            };

            labels.forEach(l => {
                if (!grouped[l.tip]) grouped[l.tip] = [];
                grouped[l.tip].push(l);
            });

            for (const tip of Object.keys(grouped)) {
                const tipDiv = document.createElement('div');
                tipDiv.classList.add('label-group');

                const bullet = document.createElement('div');
                bullet.classList.add('tip-bullet');
                 // Use mapped name or fallback to original
                const displayName = tipNames[tip] || tip;
                bullet.innerHTML = `<strong>${displayName}:</strong>`;

                const labelsLine = document.createElement('div');
                labelsLine.classList.add('labels-line');

                grouped[tip].forEach(l => {
                    const labelSpan = document.createElement('span');
                    labelSpan.classList.add('material-label');
                    labelSpan.setAttribute('draggable', true);
                    labelSpan.dataset.id = l.id;
                    labelSpan.textContent = l.naziv;

                    labelsLine.appendChild(labelSpan);
                });

                tipDiv.appendChild(bullet);
                tipDiv.appendChild(labelsLine);
                labelsContainer.appendChild(tipDiv);
            }
        } catch (err) {
            console.error('Napaka pri nalaganju label:', err);
        }
    }

    // --- Drag start for labels ---
    labelsContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('material-label')) {
            e.dataTransfer.setData("text/plain", e.target.dataset.id);
            e.dataTransfer.setData("label-name", e.target.textContent.replace('Delete','').trim());
            e.dataTransfer.effectAllowed = "move";
        }
    });

    // --- Add new label ---
    addLabelForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(addLabelForm);
        const data = Object.fromEntries(formData.entries());
        try {
            await fetchJSON('http://localhost:3000/api/labele/', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) 
            });
            addLabelForm.reset();
            loadLabels();
        } catch (err) {
            alert('Napaka pri dodajanju labele: ' + err.message);
        }
    });

    // --- Remove label from material card on click ---
    materialContainer.addEventListener("click", async (e) => {
        const labelSpan = e.target.closest('.material-label');
        if (!labelSpan) return;

        // Ignore if the click was on the "delete-label" button (for global labels)
        if (e.target.classList.contains("delete-label")) return;

        const materialCard = labelSpan.closest('.material-card');
        if (!materialCard) return;

        const materialId = materialCard.dataset.id;
        const labelId = labelSpan.dataset.id;

        if (!materialId || !labelId) return;

        try {
            // DELETE request to remove label from material
            const res = await fetchJSON(`http://localhost:3000/api/kosi/${materialId}/labele/${labelId}`, { method: 'DELETE', skipJson: true });

            // Remove label from UI
            labelSpan.remove();
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    // --- Enable drag/drop on material cards ---
    function enableDropOnMaterials() {
        // Disconnect observer to avoid infinite loop
        observer.disconnect();

        const cards = document.querySelectorAll('.material-card');

        cards.forEach(card => {
            const clone = card.cloneNode(true);
            card.parentNode.replaceChild(clone, card);
        });

        document.querySelectorAll('.material-card').forEach(card => {
            card.addEventListener('dragover', e => e.preventDefault());

            card.addEventListener('drop', async (e) => {
                e.preventDefault();

                const labelId = e.dataTransfer.getData("text/plain");
                const labelName = e.dataTransfer.getData("label-name");
                const materialId = card.dataset.id;

                if (!labelId || !materialId) return;

                try {
                    await fetchJSON(`http://localhost:3000/api/kosi/${materialId}/labele/${labelId}`, { method: "POST" });

                    const labelsDiv = card.querySelector('.material-labels');

                    // Prevent duplicate label UI
                    if (![...labelsDiv.children].some(lbl => lbl.textContent === labelName)) {
                        const newLabel = document.createElement('span');
                        newLabel.classList.add('material-label');
                        newLabel.dataset.id = labelId; // <-- important
                        newLabel.textContent = labelName;
                        labelsDiv.appendChild(newLabel);
                    }
                } catch (err) {
                    console.error(err);
                    alert("Napaka pri dodajanju labele: " + err.message);
                }
            });
        });

        // Resume observing
        observer.observe(materialContainer, { childList: true });
    }

    const trashContainer = document.getElementById('trash-container');

    trashContainer.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
        trashContainer.classList.add('dragover');
    });

    trashContainer.addEventListener('dragleave', () => {
        trashContainer.classList.remove('dragover');
    });

    trashContainer.addEventListener('drop', async (e) => {
        e.preventDefault();
        trashContainer.classList.remove('dragover');

        const labelId = e.dataTransfer.getData('text/plain');
        if (!labelId) return;

        // Check if the label is still attached to any material
        const labelInUse = Array.from(document.querySelectorAll('.material-card .material-label'))
            .some(span => span.dataset.id == labelId);

        if (labelInUse) {
            alert("Brisanje labele ni mogoče, ker obstajajo kosi, ki so označeni z njo. Odstranite labelo iz kosov in poskusite ponovno.");
            return; // stop deletion
        }

        try {
            // DELETE label from database
            const res = await fetchJSON(`http://localhost:3000/api/labele/${labelId}`, { method: 'DELETE', skipJson: true });
        
            // Reload labels
            loadLabels();
            alert('Labela je bila uspešno izbrisana!');
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    // --- Initial load ---
    loadLabels();

    // MutationObserver ensures newly loaded materials are drop targets
    observer = new MutationObserver(enableDropOnMaterials);
    observer.observe(materialContainer, { childList: true });
});
