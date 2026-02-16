/*async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
}*/

/*async function fetchJSON(url) {
    const token = localStorage.getItem('token');

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
    }

    return response.json();
}*/

async function fetchJSON(url, options = {}) {
    const token = localStorage.getItem('token');

    // Only add 'Content-Type: application/json' if not sending FormData
    const headers = {
        ...(options.skipJsonHeader ? {} : {'Content-Type': 'application/json'}),
        ...(options.headers || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
    const username = localStorage.getItem('username');
    const currentUserEl = document.getElementById('current-user');
    const labelEl = currentUserEl.querySelector('.label');
    const usernameEl = currentUserEl.querySelector('.username');
    const logoutBtn = document.getElementById('logout-icon');

    if (username) {
        labelEl.textContent = 'Prijavljeni uporabnik:';
        usernameEl.textContent = username;
        logoutBtn.style.display = 'inline-block';
    } else {
        labelEl.textContent = '';
        usernameEl.textContent = '';
        logoutBtn.style.display = 'none';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.href = '/prijava';
        });
    }
});