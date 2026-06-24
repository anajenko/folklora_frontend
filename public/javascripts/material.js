document.addEventListener("DOMContentLoaded", () => {
    const kontejner_kosi = document.getElementById("material-container");
    const forma_kosi = document.getElementById("add-material-form");

    // --- FILE INPUT LISTENER ---
    const datotekaInput = document.getElementById('slika');
    const datotekaLabel = document.querySelector('.custom-file-label');

    // napis na polju za izbiro datoteke
    datotekaInput.addEventListener('change', () => {
        datotekaLabel.textContent = datotekaInput.files.length
            ? datotekaInput.files[0].name
            : 'Izberi .jpg ali .jpeg datoteko z naprave';
    });

    // --- DRAG & DROP HANDLER ---
    function handleLabelDrop(e, materialCard) {
        e.preventDefault();

        const labelaId = e.dataTransfer.getData('text/plain');
        const labelaNaziv = e.dataTransfer.getData('label-name');

        if (!labelaId || !labelaNaziv) return;

        // vizualno dodamo labelo na kos
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
        // v backendu dodamo labelo na kos <-- labels.js to uredi
    }

    async function naloziKartice() {
        const kosi = await fetchJSON('http://localhost:3000/api/kosi/');

        // Clear container
        kontejner_kosi.innerHTML = '';

        // Create fragment
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

        // Build all cards in memory 
        for (const m of kosi) {
            const div = document.createElement('div');
            div.classList.add('material-card');
            div.dataset.id = m.id;
            div.dataset.ime = m.ime;
            if (m.poskodovano === 1) {
                div.classList.add('poskodovano');
            } // dodamo css class

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

            let imaIkonoKomentarja = false;

            try {
                const komentarji = await fetchJSON(`http://localhost:3000/api/kosi/${m.id}/komentarji`);
                if (komentarji.length > 0) {
                    const icon = document.createElement("img");
                    icon.src = "/images/comment.png";
                    icon.alt = "Komentarji";
                    icon.title = "Kos ima komentarje";
                    icon.classList.add("comment-icon");
                    div.appendChild(icon);
                    imaIkonoKomentarja = true; 
                }
                
            } catch (err) {
                console.error("Napaka pri preverjanju komentarjev:", err);
            }

            if (m.poskodovano === 1) {
                const damageIcon = document.createElement("img");
                damageIcon.src = "/images/sew.png";
                damageIcon.alt = "Poskodovano";
                damageIcon.title = "Kos je poškodovan";
                damageIcon.classList.add("damage-icon");
                
                //lokacija: levo zgoraj (poleg ikone komentarja)
                if (imaIkonoKomentarja) {
                    div.appendChild(damageIcon);
                } else {
                    damageIcon.style.left = "8px";
                    div.appendChild(damageIcon);
                }
            }

            // Disable dragging the image
            div.querySelector('img').addEventListener('dragstart', e => e.preventDefault());

            // Drag & Drop
            div.addEventListener('dragover', e => e.preventDefault());
            div.addEventListener('drop', e => handleLabelDrop(e, div));

            frag.appendChild(div);
        }

        // vse kartice dodamo naenkrat v DOM → no glitch
        kontejner_kosi.appendChild(frag);
    }

    forma_kosi.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fileInput = forma_kosi.querySelector('input[type="file"]');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            alert('Za uvoz kosa je potrebno izbrati datoteko z naprave.');
            return;
        }
        
        const formData = new FormData(forma_kosi);

        try {
            const tip_uporabnika = localStorage.getItem("tip_uporabnika");
            if (tip_uporabnika !== "garderober/-ka") {
                alert("Žal nimaš pravic za dodajanje kosov. Kose lahko dodajajo samo uporabniki tipa: garderober/-ka.");
                return;
            }

            const data = await fetchJSON('http://localhost:3000/api/kosi/', { method: 'POST', body: formData, skipJsonHeader: true });
            
            alert(data.message); // Kos uspešno dodan
            forma_kosi.reset(); // počisti formo
            if (datotekaLabel) datotekaLabel.textContent = 'Izberi .jpg ali .jpeg datoteko z naprave';
            naloziKartice(); // da se prikaže še novo dodan kos
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
        const karticaLabele = kartica.querySelectorAll('.material-label'); // poiščemo vse labele na kartici
        const imaLabele = karticaLabele.length > 0;

        try {
            const tip_uporabnika = localStorage.getItem("tip_uporabnika");
            if (tip_uporabnika !== "garderober/-ka") {
                alert("Žal nimaš pravic za brisanje kosov. Kose lahko brišejo samo uporabniki tipa: garderober/-ka.");
                return;
            }

            const komentarji = await fetchJSON(`http://localhost:3000/api/kosi/${id}/komentarji`);
            const imaKomentarje = komentarji.length > 0;

            let potrdi = "Ali ste prepričani, da želite izbrisati kos?";

            if (imaLabele || imaKomentarje) {
                potrdi = 
                    "Kos ima dodane komentarje ali labele.\n\n" +
                    "V primeru, da izbrišete kos, se bodo izbrisali tudi vsi komentarji oz. povezave z labelami.\n" +
                    "Ali želite vseeno nadaljevati z brisanjem kosa?";
            }

            const confirmed = confirm(potrdi);
            if (!confirmed) return;

            // if confirmed
            await fetchJSON(`http://localhost:3000/api/kosi/${id}`, { method: 'DELETE', skipJson: true });
            naloziKartice();

        } catch (err) {
            alert(err.message);
        }
    });

    naloziKartice();
});
