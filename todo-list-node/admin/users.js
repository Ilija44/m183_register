const db = require('../fw/db');

async function getHtml(req) {
    let conn = await db.connectDB();
    let html = '';
    // Ermittle Rolle und Gruppen-ID des eingeloggten Users
    let userId = req.cookies.userid;
    let [adminInfo] = await conn.query(`
        SELECT roles.ID as roleid, roles.title as rolename FROM users
        INNER JOIN permissions ON users.ID = permissions.userID
        INNER JOIN roles ON permissions.roleID = roles.ID
        WHERE users.ID = ?
    `, [userId]);
    let isAdmin = adminInfo.length > 0 && adminInfo[0].rolename === 'Admin';
    let adminGroupId = isAdmin ? adminInfo[0].roleid : null;
    let [result] = await conn.query(`
        SELECT users.ID, users.username, roles.title, roles.ID as roleid
        FROM users
        INNER JOIN permissions ON users.ID = permissions.userID
        INNER JOIN roles ON permissions.roleID = roles.ID
        ORDER BY users.username
    `);

    html += `
    <h2>User List</h2>
    <table border="1" cellpadding="4" cellspacing="0">
        <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Group</th>
        </tr>
    `;

    result.forEach(function (record) {
        html += `<tr>
            <td>${record.ID}</td>
            <td>${record.username}</td>
            <td>${record.title}</td>
        </tr>`;
    });

    html += `</table>`;
    return html;
}

module.exports = { html: getHtml };
