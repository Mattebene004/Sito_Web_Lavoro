// ============================================================
// COSTANTI GLOBALI
// ============================================================
const ACCESS_KEY = '38302d18-c8c7-4846-9679-ee1896d504fb';
const COMUNI_REMOTE = 'https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json';

const isMobileDevice = navigator.userAgentData
    ? navigator.userAgentData.mobile
    : /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
document.documentElement.classList.toggle('mobile-device', isMobileDevice);

// ============================================================
// FUNZIONI DI SUPPORTO (comuni / province)
// ============================================================

// Carica i comuni dal repository remoto
async function caricaComuni() {
    try {
        const r = await fetch(COMUNI_REMOTE);
        if (!r.ok) throw new Error('Impossibile scaricare i comuni');
        return await r.json();
    } catch (err) {
        console.error('Errore nel caricamento dei comuni:', err);
        throw err;
    }
}

// Costruisce la struttura province/comuni
function costruisciProvince(comuni) {
    const province = {};
    comuni.forEach(c => {
        const sigla = c.sigla;
        if (!province[sigla]) {
            province[sigla] = { nome: c.provincia.nome, comuni: [] };
        }
        province[sigla].comuni.push(c.nome);
    });
    Object.values(province).forEach(p =>
        p.comuni.sort((a, b) => a.localeCompare(b, 'it'))
    );
    return province;
}

// Collega i select provincia/comune
function collegaSelect(province, provId, comId) {
    const selProv = document.getElementById(provId);
    const selCom = document.getElementById(comId);

    Object.entries(province)
        .sort((a, b) => a[1].nome.localeCompare(b[1].nome, 'it'))
        .forEach(([sigla, p]) => {
            const opt = document.createElement('option');
            opt.value = sigla;
            opt.textContent = p.nome + ' (' + sigla + ')';
            selProv.appendChild(opt);
        });

    selProv.addEventListener('change', () => {
        selCom.innerHTML = '<option value="">Seleziona</option>';
        const p = province[selProv.value];
        if (!p) return;
        p.comuni.forEach(nome => {
            const opt = document.createElement('option');
            opt.value = nome;
            opt.textContent = nome;
            selCom.appendChild(opt);
        });
    });
}

// ============================================================
// INIZIALIZZAZIONE UNICA AL CARICAMENTO DELLA PAGINA
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // ---------- Menu mobile ----------
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.getElementById('main-navigation');
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function () {
            nav.classList.toggle('active');
            this.setAttribute('aria-expanded', this.getAttribute('aria-expanded') === 'false' ? 'true' : 'false');
        });
    }

    // ---------- Form PROPOSTE (proposteForm) ----------
    const formProposte = document.getElementById('proposteForm');
    if (formProposte) {
        formProposte.addEventListener('submit', async function (e) {
            e.preventDefault();

            const msg = document.getElementById('message');
            const btn = document.getElementById('submitBtn');

            if (!formProposte.checkValidity()) {
                formProposte.reportValidity();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Invio in corso...';
            msg.className = 'message';
            msg.textContent = '';

            const dati = new FormData(this);
            dati.append('access_key', ACCESS_KEY);
            dati.append('subject', 'Nuova proposta: ' + dati.get('titolo'));
            dati.append('from_name', dati.get('nome') + ' ' + dati.get('cognome'));
            dati.append('replyto', dati.get('email'));
            dati.append('to_email', 'progettoauser2026@gmail.com');

            const params = new URLSearchParams();
            for (let [key, value] of dati) {
                params.append(key, value);
            }

            try {
                const r = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: params
                });

                const j = await r.json();

                if (j.success) {
                    msg.className = 'message success';
                    msg.textContent = '✓ Proposta inviata con successo! Ti ricontatteremo entro 30 giorni.';
                    this.reset();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    throw new Error(j.message || 'Errore sconosciuto');
                }
            } catch (err) {
                msg.className = 'message error';
                msg.textContent = '✗ Errore: ' + err.message;
                console.error('Errore invio proposta:', err);
            }

            btn.disabled = false;
            btn.textContent = 'Invia proposta';
        });
    }

    // ---------- Form REGISTRAZIONE (registrationForm) ----------
    if (document.getElementById('registrationForm')) {
        try {
            const comuni = await caricaComuni();
            const province = costruisciProvince(comuni);
            collegaSelect(province, 'provinciaNascita', 'comuneNascita');
            collegaSelect(province, 'provinciaResidenza', 'comuneResidenza');
            collegaSelect(province, 'provinciaCorrispondenza', 'comuneCorrispondenza');
        } catch (err) {
            console.error('Errore nel caricamento dei comuni:', err);
        }
    }

    const form = document.getElementById('registrationForm');
    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const msg = document.getElementById('message');
            const btn = document.getElementById('submitBtn');
            const numeroSenzaPrefisso = ['telefono1', 'telefono2', 'telefono3'].find(idTelefono => {
                const numero = document.getElementById(idTelefono).value;
                const idPrefisso = `prefisso${idTelefono[0].toUpperCase()}${idTelefono.slice(1)}`;
                return numero && !document.getElementById(idPrefisso).value.trim();
            });
            if (numeroSenzaPrefisso) {
                msg.className = 'message error';
                msg.textContent = `Inserisci il prefisso internazionale per ${numeroSenzaPrefisso}.`;
                document.getElementById(`prefisso${numeroSenzaPrefisso[0].toUpperCase()}${numeroSenzaPrefisso.slice(1)}`).focus();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Invio in corso...';
            msg.className = 'message';
            msg.textContent = '';

            // Raccoglie i dati del form
            const dati = new FormData(this);
            ['telefono1', 'telefono2', 'telefono3'].forEach(idTelefono => {
                const idPrefisso = `prefisso${idTelefono[0].toUpperCase()}${idTelefono.slice(1)}`;
                const numero = dati.get(idTelefono);
                if (numero) {
                    const prefisso = dati.get(idPrefisso);
                    dati.set(idTelefono, `${prefisso} ${numero}`);
                }
                dati.delete(idPrefisso);
            });
            dati.append('access_key', ACCESS_KEY);
            dati.append('subject', 'Richiesta tesseramento - ' + dati.get('cognome') + ' ' + dati.get('nome'));
            dati.append('from_name', dati.get('nome') + ' ' + dati.get('cognome'));
            dati.append('to_email', 'giubal2001@yahoo.it');

            // Converti FormData in URLSearchParams per Web3Forms
            const params = new URLSearchParams();
            for (let [key, value] of dati) {
                params.append(key, value);
            }

            console.log('Invio dati:', {
                access_key: ACCESS_KEY,
                subject: dati.get('subject'),
                to_email: dati.get('to_email'),
                cognome: dati.get('cognome'),
                nome: dati.get('nome')
            });

            try {
                const r = await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    body: params
                });

                console.log('Risposta status:', r.status);
                const j = await r.json();
                console.log('Risposta JSON:', j);

                if (j.success) {
                    msg.className = 'message success';
                    msg.textContent = '✓ Registrazione completata! Email inviata con successo.';
                    this.reset();
                    document.getElementById('strutturaAppartenenza').value = 'AUSER Territoriale Alto Chiascio ODV-ETS';
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    throw new Error(j.message || 'Errore sconosciuto: ' + JSON.stringify(j));
                }
            } catch (err) {
                msg.className = 'message error';
                msg.textContent = '✗ Errore: ' + err.message;
                console.error('Errore completo:', err);
            }

            btn.disabled = false;
            btn.textContent = 'Invia Registrazione';
        });
    }
});