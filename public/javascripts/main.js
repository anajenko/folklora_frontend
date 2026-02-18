async function fetchJSON(url, options = {}) {
    const zeton = localStorage.getItem('token');

    // Only add 'Content-Type: application/json' if not sending FormData
    const headers = {
        ...(options.skipJsonHeader ? {} : {'Content-Type': 'application/json'}),
        ...(options.headers || {})
    };

    if (zeton) {
        headers['Authorization'] = `Bearer ${zeton}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        // če token ne obstaja ali je potekel
        localStorage.removeItem('token');
        alert('Seja je potekla. Prosimo prijavite se ponovno.');
        window.location.href = '/prijava';
        return;
    }

    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;

        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch {
            // fallback if not JSON
        }

        throw new Error(errorMessage);
    }

    if (options.skipJson) return response; // just return the raw response
    return response.json();
}

document.addEventListener("DOMContentLoaded", () => {
    
    const uporabnikEl = document.getElementById('current-user');
    const labelaEl = uporabnikEl?.querySelector('.label');
    const up_imeEl = uporabnikEl?.querySelector('.username');
    const odjavaGumb = document.getElementById('logout-icon');

    const currentPath = window.location.pathname;

    if (currentPath === '/prijava' || currentPath === '/registracija') {
        if (uporabnikEl) uporabnikEl.style.display = 'none';
        if (odjavaGumb) odjavaGumb.style.display = 'none';
        return; // ne izvajamo ostale logike za header
    }

    const up_ime = localStorage.getItem('username');
    const zeton = localStorage.getItem('token');
    
    if (!zeton || !up_ime) {
        // Če ni prijavljenega uporabnika ali tokena, skrij elemente
        if (uporabnikEl) uporabnikEl.style.display = 'none';
        if (odjavaGumb) odjavaGumb.style.display = 'none';
        return;
    }

    // Prikaz uporabnika
    if (labelaEl) labelaEl.textContent = 'Prijavljeni uporabnik:'; // ali ostane prazno
    if (up_imeEl) up_imeEl.textContent = up_ime;
    if (odjavaGumb) odjavaGumb.style.display = 'inline-block';

    // Odjava
    odjavaGumb?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        window.location.href = '/prijava';
    });
});