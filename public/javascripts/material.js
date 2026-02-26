document.addEventListener("DOMContentLoaded", () => {
    const kontejner_kosi = document.getElementById("material-container");
    const forma_kosi = document.getElementById("add-material-form");

    // --- FILE INPUT LISTENER ---
    const datotekaInput = document.getElementById('slika');
    const datotekaLabel = document.querySelector('.custom-file-label');

    datotekaInput.addEventListener('change', () => {
        datotekaLabel.textContent = datotekaInput.files.length
            ? datotekaInput.files[0].name
            : 'Izberi .jpg ali .jpeg datoteko z naprave';
    });

    // --- DRAG & DROP HANDLER ---
    function handleLabelDrop(e, materialCard) {
        e.preventDefault();

        const labelaId = e.dataTransfer.getData('text/plain'); // the label id
        const labelaNaziv = e.dataTransfer.getData('label-name'); // the label name

        if (!labelaId || !labelaNaziv) return;

        // Append label to material card visually
        const kontejner_labele = materialCard.querySelector('.material-labels');
        if (kontejner_labele) {
            // Prevent duplicate labels
            const obstojeci = Array.from(kontejner_labele.children).some(span => span.textContent === labelaNaziv);
            if (!obstojeci) {
                const znacka = document.createElement('span');
                znacka.classList.add('material-label');
                znacka.textContent = labelaNaziv;
                kontejner_labele.appendChild(znacka);
            }
        }

        // Optionally: send to backend to save the label on this material
        fetchJSON(`http://localhost:3000/api/labele/dodaj/${materialCard.dataset.id}/${labelaId}`, { method: 'POST' });
    }

    async function naloziKartice() {
        const kosi = await fetchJSON('http://localhost:3000/api/kosi/');

        // Clear container ONCE
        kontejner_kosi.innerHTML = '';

        // Create fragment (fast, no glitch)
        const frag = document.createDocumentFragment();

        // Pre-fetch all labels for all materials
        const mapiraneLabele = {};
        await Promise.all(
            kosi.map(async (m) => {
                try {
                    mapiraneLabele[m.id] = await fetchJSON(`http://localhost:3000/api/labele/kos/${m.id}`);
                } catch (err) {
                    mapiraneLabele[m.id] = [];
                    console.error("Napaka pri nalaganju label:", err);
                }
            })
        );

        // Build all cards in memory (no DOM writes yet)
        for (const m of kosi) {
            const div = document.createElement('div');
            div.classList.add('material-card');
            div.dataset.id = m.id;
            div.dataset.ime = m.ime;
            if (m.poskodovano === 1) {
                div.classList.add('poskodovano');
            }

            const labelsHTML = (mapiraneLabele[m.id] || [])
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

            let hasCommentIcon = false;

            try {
                const komentarji = await fetchJSON(`http://localhost:3000/api/kosi/${m.id}/komentarji`);
                if (komentarji.length > 0) {
                    const icon = document.createElement("img");
                    icon.src = "/images/comment.png";
                    icon.alt = "Komentarji";
                    icon.title = "Kos ima komentarje";
                    icon.classList.add("comment-icon");
                    div.appendChild(icon);
                    hasCommentIcon = true; 
                }
                
            } catch (err) {
                console.error("Napaka pri preverjanju komentarjev:", err);
            }

            if (m.poskodovano === 1) {
                const damageIcon = document.createElement("img");
                damageIcon.src = "/images/needle.png";
                damageIcon.alt = "Poskodovano";
                damageIcon.title = "Kos je poškodovan";
                damageIcon.classList.add("damage-icon");
                
                // Place it **next to comment icon** in the left corner
                // If there's a comment icon, place damage icon next to it
                if (hasCommentIcon) {
                    div.appendChild(damageIcon);
                } else {
                    // If no comment icon, it should take the comment icon's spot
                    damageIcon.style.left = "8px"; // same as comment-icon left
                    div.appendChild(damageIcon);
                }
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
        kontejner_kosi.appendChild(frag);
    }

    forma_kosi.addEventListener("submit", async (e) => {
        e.preventDefault();

        // Preverimo, ali je izbrana datoteka
        const fileInput = forma_kosi.querySelector('input[type="file"]');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Za uvoz kosa je potrebno izbrati datoteko z naprave.');
            return; // ustavi submit
        }
        
        const formData = new FormData(forma_kosi);

        try {
            const data = await fetchJSON('http://localhost:3000/api/kosi/', { method: 'POST', body: formData, skipJsonHeader: true });
            
            alert(data.message);
            forma_kosi.reset();
            if (datotekaLabel) datotekaLabel.textContent = 'Izberi .jpg ali .jpeg datoteko z naprave';
            naloziKartice();
        } catch (err) {
            alert(err.message);
        }
    });

    // Delete material
    kontejner_kosi.addEventListener("click", async (e) => {
        const gumb = e.target.closest(".delete-x");
        if (!gumb) return;

        const id = gumb.dataset.id;

        const kartica = gumb.closest('.material-card');
        const karticaLabele = kartica.querySelectorAll('.material-label');
        const imaLabele = karticaLabele.length > 0;

        try {
            // preverimo komentarje
            const komentarji = await fetchJSON(`http://localhost:3000/api/kosi/${id}/komentarji`);
            const imaKomentarje = komentarji.length > 0;

            // sestavimo sporočilo
            let potrdi = "Ali ste prepričani, da želite izbrisati kos?";

            if (imaLabele || imaKomentarje) {
                potrdi = 
                    "Kos ima dodane komentarje ali labele.\n\n" +
                    "V primeru, da izbrišete kos, se bodo izbrisali tudi vsi komentarji oz. povezave z labelami.\n" +
                    "Ali želite vseeno nadaljevati z brisanjem kosa?";
            }

            const confirmed = confirm(potrdi);
            if (!confirmed) return;

            // Če je potrjeno, izbrišemo kos
            await fetchJSON(`http://localhost:3000/api/kosi/${id}`, { method: 'DELETE', skipJson: true });
            naloziKartice();

        } catch (err) {
            alert(err.message);
        }
    });

    naloziKartice();
});
