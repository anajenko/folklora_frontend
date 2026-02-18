document.addEventListener("DOMContentLoaded", () => {
    const kontejner_labele = document.getElementById("labels-container");
    const forma_labele = document.getElementById("add-label-form");
    const kontejner_kosi = document.getElementById("material-container");

    let observer; // MutationObserver to attach drop listeners

    // --- Load labels into sidebar ---
    async function naloziLabele() {
        kontejner_labele.innerHTML = '';
        try {
            const labele = await fetchJSON('http://localhost:3000/api/labele/');
            const grupirano = {};

            const imena_grup = {
                'pokrajina': 'Pokrajina',
                'tip_oblacila': 'Tip oblačila',
                'spol': 'Spol',
                'velikost': 'Velikost',
                'drugo': 'Drugo'
            };

            labele.forEach(l => {
                if (!grupirano[l.tip]) grupirano[l.tip] = [];
                grupirano[l.tip].push(l);
            });

            for (const tip of Object.keys(grupirano)) {
                const tipDiv = document.createElement('div');
                tipDiv.classList.add('label-group');

                const grupe = document.createElement('div');
                grupe.classList.add('tip-bullet');
                 // Use mapped name or fallback to original
                const prikazano_ime = imena_grup[tip] || tip;
                grupe.innerHTML = `<strong>${prikazano_ime}:</strong>`;

                const grupa = document.createElement('div');
                grupa.classList.add('labels-line');

                grupirano[tip].forEach(l => {
                    const labela_znacka = document.createElement('span');
                    labela_znacka.classList.add('material-label');
                    labela_znacka.setAttribute('draggable', true);
                    labela_znacka.dataset.id = l.id;
                    labela_znacka.textContent = l.naziv;

                    grupa.appendChild(labela_znacka);
                });

                tipDiv.appendChild(grupe);
                tipDiv.appendChild(grupa);
                kontejner_labele.appendChild(tipDiv);
            }
        } catch (err) {
            console.error('Napaka pri nalaganju label:', err);
        }
    }

    // --- Drag start for labels ---
    kontejner_labele.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('material-label')) {
            e.dataTransfer.setData("text/plain", e.target.dataset.id);
            e.dataTransfer.setData("label-name", e.target.textContent.replace('Delete','').trim());
            e.dataTransfer.effectAllowed = "move";
        }
    });

    // --- Add new label ---
    forma_labele.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(forma_labele);
        const data = Object.fromEntries(formData.entries());
        try {
            await fetchJSON('http://localhost:3000/api/labele/', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) 
            });
            forma_labele.reset();
            naloziLabele();
        } catch (err) {
            alert(err.message);
        }
    });

    // --- Remove label from material card on click ---
    kontejner_kosi.addEventListener("click", async (e) => {
        const labelSpan = e.target.closest('.material-label');
        if (!labelSpan) return;

        // Ignore if the click was on the "delete-label" button (for global labels)
        if (e.target.classList.contains("delete-label")) return;

        const materialCard = labelSpan.closest('.material-card');
        if (!materialCard) return;

        const materialId = materialCard.dataset.id;
        const labelId = labelSpan.dataset.id;

        if (!materialId || !labelId) return;

        const imeKosa = materialCard.dataset.ime;
        const nazivLabele = labelSpan.dataset.naziv || labelSpan.textContent;

        const potrdi = confirm(
            `Ali res želite odstraniti labelo "${nazivLabele}" iz kosa "${imeKosa}"?`
        );
        if (!potrdi) {
            return; // uporabnik je kliknil Cancel
        }

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
    function omogociDropNaKos() {
        // Disconnect observer to avoid infinite loop
        observer.disconnect();

        const kartice = document.querySelectorAll('.material-card');

        kartice.forEach(card => {
            const klon = card.cloneNode(true);
            card.parentNode.replaceChild(klon, card);
        });

        document.querySelectorAll('.material-card').forEach(kartica => {
            kartica.addEventListener('dragover', e => e.preventDefault());

            kartica.addEventListener('drop', async (e) => {
                e.preventDefault();

                const labelaId = e.dataTransfer.getData("text/plain");
                const labelaNaziv = e.dataTransfer.getData("label-name");
                const kosId = kartica.dataset.id;

                if (!labelaId || !kosId) return;

                try {
                    await fetchJSON(`http://localhost:3000/api/kosi/${kosId}/labele/${labelaId}`, { method: "POST" });

                    const labeleDiv = kartica.querySelector('.material-labels');

                    // Prevent duplicate label UI
                    if (![...labeleDiv.children].some(lbl => lbl.textContent === labelaNaziv)) {
                        const novaLabela = document.createElement('span');
                        novaLabela.classList.add('material-label');
                        novaLabela.dataset.id = labelaId; // <-- important
                        novaLabela.textContent = labelaNaziv;
                        labeleDiv.appendChild(novaLabela);
                    }
                } catch (err) {
                    console.error(err);
                    alert(err.message);
                }
            });
        });

        // Resume observing
        observer.observe(kontejner_kosi, { childList: true });
    }

    const kontejner_smetnjak = document.getElementById('trash-container');

    kontejner_smetnjak.addEventListener('dragover', (e) => {
        e.preventDefault(); // allow drop
        kontejner_smetnjak.classList.add('dragover');
    });

    kontejner_smetnjak.addEventListener('dragleave', () => {
        kontejner_smetnjak.classList.remove('dragover');
    });

    kontejner_smetnjak.addEventListener('drop', async (e) => {
        e.preventDefault();
        kontejner_smetnjak.classList.remove('dragover');

        const labelId = e.dataTransfer.getData('text/plain');
        if (!labelId) return;

        // Check if the label is still attached to any material
        const labelaVUporabi = Array.from(document.querySelectorAll('.material-card .material-label'))
            .some(span => span.dataset.id == labelId);

        if (labelaVUporabi) {
            alert("Brisanje labele ni mogoče, ker obstajajo kosi, ki so označeni z njo. Odstranite labelo iz kosov in poskusite ponovno.");
            return; // stop deletion
        }

        try {
            // DELETE label from database
            const res = await fetchJSON(`http://localhost:3000/api/labele/${labelId}`, { method: 'DELETE', skipJson: true });
        
            // Reload labels
            naloziLabele();
            alert('Labela je bila uspešno izbrisana!');
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });

    // --- Initial load ---
    naloziLabele();

    // MutationObserver ensures newly loaded materials are drop targets
    observer = new MutationObserver(omogociDropNaKos);
    observer.observe(kontejner_kosi, { childList: true });
});
