// Register form
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();

    const tipUporabnika = e.target.querySelector('input[name="tip_uporabnika"]:checked');
    if (!tipUporabnika) {
        alert('Izberite tip uporabnika!');
        return;
    }

    const data = {
      uporabnisko_ime: e.target.uporabnisko_ime.value,
      geslo: e.target.geslo.value,
      tip_uporabnika: tipUporabnika.value
    };

    try {
      const res = await fetch('http://localhost:3000/api/uporabniki', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });

      const json = await res.json();
      
      if (res.ok) { // HTTP 200–299
        alert('Registracija uspešna! Prijavite se.');
        window.location.href = '/prijava';
      } else {
        alert(json.message || `Napaka: ${res.status}`);
      }
    } catch (err) {
      console.error(err);
      alert('Napaka pri registraciji!');
    }
  });
}

// Login form
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    
    const data = {
      uporabnisko_ime: e.target.uporabnisko_ime.value,
      geslo: e.target.geslo.value
    };

    try {
      const res = await fetch('http://localhost:3000/api/uporabniki/prijava', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
      });

      const json = await res.json();
      if (res.ok) { // HTTP 200–299
        // Shrani JWT v localStorage
        localStorage.setItem('token', json.token);
        localStorage.setItem('username', json.uporabnisko_ime);
        window.location.href = '/'; // index page
      } else {
        alert(json.message || 'Napaka pri prijavi!');
      }
    } catch (err) {
      console.error(err);
      alert('Napaka povezave s strežnikom!');
    }
  });
}