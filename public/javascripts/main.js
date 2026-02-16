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
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    if (options.skipJson) return response; // just return the raw response
    return response.json();
}