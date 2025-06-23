const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const header = require('./fw/header');
const footer = require('./fw/footer');
const login = require('./login');
const index = require('./index');
const adminUser = require('./admin/users');
const editTask = require('./edit');
const saveTask = require('./savetask');
const search = require('./search');
const searchProvider = require('./search/v2/index');

const db = require('./fw/db'); // damit es für Invite-Links da ist
const crypto = require('crypto');


const app = express();
const PORT = 3000;

// Middleware für Session-Handling
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Middleware für Body-Parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Routen
app.get('/', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await index.html(req), req)
        res.send(html);
    } else {
        res.redirect('login');
    }
});

app.post('/', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await index.html(req), req)
        res.send(html);
    } else {
        res.redirect('login');
    }
})

// edit task
app.get('/admin/users', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await adminUser.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// edit task
app.get('/edit', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await editTask.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// Login-Seite anzeigen
app.get('/login', async (req, res) => {
    let content = await login.handleLogin(req, res);

    if(content.user.userid !== 0) {
        // login was successful... set cookies and redirect to /
        login.startUserSession(res, content.user);
    } else {
        // login unsuccessful or not made jet... display login form
        let html = await wrapContent(content.html, req);
        res.send(html);
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.cookie('username','');
    res.cookie('userid','');
    res.redirect('/login');
});

// Profilseite anzeigen
app.get('/profile', (req, res) => {
    if (req.session.loggedin) {
        res.send(`Welcome, ${req.session.username}! <a href="/logout">Logout</a>`);
    } else {
        res.send('Please login to view this page');
    }
});

// save task
app.post('/savetask', async (req, res) => {
    if (activeUserSession(req)) {
        let html = await wrapContent(await saveTask.html(req), req);
        res.send(html);
    } else {
        res.redirect('/');
    }
});

// search
app.post('/search', async (req, res) => {
    let html = await search.html(req);
    res.send(html);
});

// search provider
app.get('/search/v2/', async (req, res) => {
    let result = await searchProvider.search(req);
    res.send(result);
});

// Invite-Link erstellen (GET)
app.get('/invite-link', async (req, res) => {
    if (!activeUserSession(req)) return res.redirect('/login');
    const dbConnection = await db.connectDB();
    // Ermittle die Gruppe des eingeloggten Users
    const [userInfo] = await dbConnection.query(`
        SELECT roles.ID as roleid, roles.title as rolename FROM users
        INNER JOIN permissions ON users.ID = permissions.userID
        INNER JOIN roles ON permissions.roleID = roles.ID
        WHERE users.ID = ?
    `, [req.cookies.userid]);
    if (!userInfo.length) return res.send(await wrapContent('<p>Keine Berechtigung.</p>', req));
    const groupId = userInfo[0].roleid;
    const groupName = userInfo[0].rolename;
    let html = `<h2>Invite-Link für deine Gruppe erstellen</h2>
        <form method="post" action="/invite-link">
            <input type="hidden" name="groupid" value="${groupId}" />
            <b>Gruppe:</b> ${groupName}<br><br>
            <button type="submit">Invite-Link generieren</button>
        </form>
        <p><a href="/admin/users">Zurück zur User-Übersicht</a></p>`;
    res.send(await wrapContent(html, req));
});

// Invite-Link generieren (POST)
app.post('/invite-link', async (req, res) => {
    if (!activeUserSession(req)) return res.redirect('/login');
    const dbConnection = await db.connectDB();
    // Ermittle die Gruppe des eingeloggten Users
    const [userInfo] = await dbConnection.query(`
        SELECT roles.ID as roleid FROM users
        INNER JOIN permissions ON users.ID = permissions.userID
        INNER JOIN roles ON permissions.roleID = roles.ID
        WHERE users.ID = ?
    `, [req.cookies.userid]);
    if (!userInfo.length) return res.send(await wrapContent('<p>Keine Berechtigung.</p>', req));
    const allowedGroupId = userInfo[0].roleid;
    const groupId = req.body.groupid;
    if (parseInt(groupId) !== allowedGroupId) {
        return res.send(await wrapContent('<p>Du darfst nur für deine eigene Gruppe einen Invite-Link generieren!</p>', req));
    }
    const token = crypto.randomBytes(32).toString('hex');
    await dbConnection.query('INSERT INTO invite_links (group_id, token) VALUES (?, ?)', [groupId, token]);
    const link = `http://localhost:8080/register?invite=${token}`;
    let html = `<h2>Invite-Link generiert</h2>
        <input type="text" style="width:100%" value="${link}" readonly onclick="this.select();document.execCommand('copy');" />
        <p>Klicke in das Feld zum Kopieren. <a href="/invite-link">Neuen Link generieren</a></p>
        <p><a href="/admin/users">Zurück zur User-Übersicht</a></p>`;
    res.send(await wrapContent(html, req));
});

// Registrierung GET
app.get('/register', async (req, res) => {
    const invite = req.query.invite || '';
    let html = `
        <h2>Registrieren</h2>
        <form method="post" action="/register" id="registerForm">
            <div>
                <label for="username">Benutzername:</label>
                <input type="text" name="username" required>
            </div>
            <div>
                <label for="password">Passwort:</label>
                <input type="password" name="password" id="password" required>
                <ul style="font-size:0.9em;">
                  <li id="pw-length" style="color:red;">Mindestens 8 Zeichen</li>
                  <li id="pw-upper" style="color:red;">Mindestens ein Großbuchstabe</li>
                  <li id="pw-lower" style="color:red;">Mindestens ein Kleinbuchstabe</li>
                  <li id="pw-digit" style="color:red;">Mindestens eine Zahl</li>
                  <li id="pw-special" style="color:red;">Mindestens ein Sonderzeichen</li>
                </ul>
            </div>
            <input type="hidden" name="invite" value="${invite}">
            <button type="submit">Registrieren</button>
        </form>
        <p>Du benötigst einen gültigen Einladungslink!</p>
        <script>
        const pw = document.getElementById('password');
        pw && pw.addEventListener('input', function() {
          const val = pw.value;
          update('pw-length', val.length >= 8);
          update('pw-upper', /[A-Z]/.test(val));
          update('pw-lower', /[a-z]/.test(val));
          update('pw-digit', /[0-9]/.test(val));
          update('pw-special', /[^A-Za-z0-9]/.test(val));
        });
        function update(id, valid) {
          const el = document.getElementById(id);
          if (el) el.style.color = valid ? 'green' : 'red';
        }
        </script>
    `;
    res.send(await wrapContent(html, req));
});

// Registrierung POST
app.post('/register', async (req, res) => {
    const { username, password, invite } = req.body;
    if (!username || !password || !invite) {
        return res.send(await wrapContent('<p>Alle Felder sind Pflicht und ein Einladungslink ist nötig!</p>', req));
    }
    // Passwort-Validierung (Backend)
    const pwErrors = [];
    if (password.length < 8) pwErrors.push('Mindestens 8 Zeichen');
    if (!/[A-Z]/.test(password)) pwErrors.push('Mindestens ein Großbuchstabe');
    if (!/[a-z]/.test(password)) pwErrors.push('Mindestens ein Kleinbuchstabe');
    if (!/[0-9]/.test(password)) pwErrors.push('Mindestens eine Zahl');
    if (!/[^A-Za-z0-9]/.test(password)) pwErrors.push('Mindestens ein Sonderzeichen');
    if (pwErrors.length > 0) {
        let html = `<p>Das Passwort ist zu schwach:</p><ul>`;
        pwErrors.forEach(e => html += `<li>${e}</li>`);
        html += `</ul><a href="javascript:history.back()">Zurück</a>`;
        return res.send(await wrapContent(html, req));
    }
    try {
        const dbConnection = await db.connectDB();
        // 1. Invite prüfen
        const [invites] = await dbConnection.query(
            'SELECT * FROM invite_links WHERE token=? AND used=0',
            [invite]
        );
        if (invites.length === 0) {
            return res.send(await wrapContent('<p>Ungültiger oder bereits benutzter Einladungslink.</p>', req));
        }
        const groupId = invites[0].group_id;
        // 2. Prüfen, ob Username schon existiert
        const [users] = await dbConnection.query('SELECT id FROM users WHERE username=?', [username]);
        if (users.length > 0) {
            return res.send(await wrapContent('<p>Benutzername bereits vergeben.</p>', req));
        }
        // 3. User anlegen
        const [userResult] = await dbConnection.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, password]
        );
        const userId = userResult.insertId;
        // 4. Permission setzen (Gruppe joinen)
        await dbConnection.query(
            'INSERT INTO permissions (userID, roleID) VALUES (?, ?)',
            [userId, groupId]
        );
        // 5. Invite als benutzt markieren
        await dbConnection.query('UPDATE invite_links SET used=1 WHERE token=?', [invite]);
        // Auto-Login nach Registrierung
        res.cookie('username', username);
        res.cookie('userid', userId);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.send(await wrapContent('<p>Fehler bei der Registrierung. Bitte versuche es später erneut.</p>', req));
    }
});

async function wrapContent(content, req) {
    let headerHtml = await header(req);
    return headerHtml+content+footer;
}

function activeUserSession(req) {
    return req.cookies !== undefined && req.cookies.username !== undefined && req.cookies.username !== '';
}

app.use((req, res) => {
    res.status(404).send('Seite nicht gefunden');
});

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});