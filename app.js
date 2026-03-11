document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("jwt");
    if (token) {
        showProfile();
    } else {
        showLogin();
    }

    document.getElementById("login-form").addEventListener("submit", (e) => {
        e.preventDefault();
        handleLogin();
    });

    document.getElementById("logout-link").addEventListener("click", (e) => {
        e.preventDefault();
        logout();
    });
});

function showLogin() {
    document.getElementById("login-page").style.display = "flex";
    document.getElementById("main-content").style.display = "none";
}

function showProfile() {
    document.getElementById("login-page").style.display = "none";
    document.getElementById("main-content").style.display = "block";
    loadData();
}

async function handleLogin() {
    const identifier = document.getElementById("identifier").value.trim();
    const password = document.getElementById("password").value.trim();

    document.getElementById("identifier-error").textContent = "";
    document.getElementById("password-error").textContent = "";
    document.getElementById("form-error").textContent = "";

    if (!identifier) {
        document.getElementById("identifier-error").textContent = "Username or email is required";
        return;
    }
    if (!password) {
        document.getElementById("password-error").textContent = "Password is required";
        return;
    }

    try {
        const credentials = btoa(`${identifier}:${password}`);
        const response = await fetch("https://learn.reboot01.com/api/auth/signin", {
            method: "POST",
            headers: {
                "Authorization": `Basic ${credentials}`
            }
        });

        if (!response.ok) throw new Error("Invalid credentials");

        const jwt = await response.json();
        localStorage.setItem("jwt", jwt);
        showProfile();

    } catch (err) {
        document.getElementById("form-error").textContent = err.message;
    }
}

function logout() {
    localStorage.removeItem("jwt");
    showLogin();
}

async function queryGraphQL(query) {
    const jwt = localStorage.getItem("jwt");

    const response = await fetch("https://learn.reboot01.com/api/graphql-engine/v1/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${jwt}`
        },
        body: JSON.stringify({ query })
    });

    const data = await response.json();
    return data.data;
}

async function loadData() {
    const data = await queryGraphQL(`{
    user {
        id
        login
        auditRatio
        totalUp
        totalDown
    }
    transaction(where: { type: { _eq: "xp" } }) {
        amount
        createdAt
        path
    }
    skill: transaction(where: { type: { _like: "skill_%" } }) {
        amount
        type
        object { name }
    }
    level: transaction(
        where: { type: { _eq: "level" } }
        order_by: { amount: desc }
        limit: 1
    ) {
        amount
    }
    result(where: { 
    path: { _regex: "^/bahrain/bh-module/[^/]+$" }
}) {
    grade
    path
}
}`);

    document.getElementById("graphs-section").innerHTML = "";

    const processed = processData(data);
    renderProfile(processed);
    renderLevel(data);
    renderRecentActivity(data.transaction);
    renderXPPerProject(data.transaction);
    renderStreakCard(data.transaction);
    renderSpiderChart(processed.skills);
    renderPassFailChart(data.result);
}

function processData(data) {
    const user = data.user[0];
    const totalXP = data.transaction.reduce((sum, t) => sum + t.amount, 0);

    const skillMap = {};
    data.skill.forEach(s => {
        const name = s.type.replace("skill_", "");
        if (!skillMap[name] || s.amount > skillMap[name]) {
            skillMap[name] = s.amount;
        }
    });
    const skills = Object.entries(skillMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8);

    return {
        user,
        totalXP,
        skills
    };
}

function formatXP(xp) {
    if (xp >= 1000000) return (xp / 1000000).toFixed(2) + " MB";
    if (xp >= 1000) return (xp / 1000).toFixed(2) + " kB";
    return xp + " B";
}

function renderProfile(processed) {
    const { user, totalXP } = processed;
    document.getElementById("user-info").innerHTML = `
        <h3>Identity</h3>
        <div class="username">${user.login}</div>
        <div class="meta">
            <div class="meta-item">
                <span class="meta-label">Tag (User ID)</span>
                <span class="meta-value">#${user.id}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Stamina (Total XP)</span>
                <span class="meta-value">${formatXP(totalXP)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">FAT (Audit Ratio)</span>
                <span class="meta-value">${processed.user.auditRatio.toFixed(1)}</span>
            </div>
        </div>
    `;
}

function renderSpiderChart(skills) {
    const size = 300;
    const center = size / 2;
    const radius = 100;
    const total = skills.length;
    const angleStep = (2 * Math.PI) / total;

    let gridLines = "";
    for (let i = 1; i <= 4; i++) {
        const r = (radius / 4) * i;
        gridLines += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="#444" stroke-width="0.5"/>`;
    }

    let axes = "";
    let labels = "";
    skills.forEach((skill, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        axes += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#444" stroke-width="0.5"/>`;

        const lx = center + (radius + 20) * Math.cos(angle);
        const ly = center + (radius + 20) * Math.sin(angle);
        labels += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="#ccc">${skill.name}</text>`;
    });

    const maxAmount = 100;
    const points = skills.map((skill, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = (skill.amount / maxAmount) * radius;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
    }).join(" ");

    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${gridLines}
            ${axes}
            <polygon points="${points}" fill="rgba(0,200,150,0.3)" stroke="#00c896" stroke-width="2"/>
            ${labels}
        </svg>
    `;

    document.getElementById("graphs-section").innerHTML += `
        <div>
            <h3>Skills</h3>
            ${svg}
        </div>
    `;
}

function renderPassFailChart(results) {
    const bestGrades = {};
    results.forEach(r => {
        if (!bestGrades[r.path] || r.grade > bestGrades[r.path]) {
            bestGrades[r.path] = r.grade;
        }
    });

    const grades = Object.values(bestGrades);
    const passed = grades.filter(g => g >= 1).length;
    const failed = grades.filter(g => g < 1).length;
    const total = passed + failed;

    const size = 300;
    const cx = size / 2, cy = size / 2;
    const r = 80, strokeWidth = 30;
    const circumference = 2 * Math.PI * r;
    const passDash = (passed / total) * circumference;
    const failDash = circumference - passDash;

    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#333" stroke-width="${strokeWidth}"/>
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                stroke="#f0ece0" stroke-width="${strokeWidth}"
                stroke-dasharray="${passDash} ${failDash}"
                transform="rotate(-90 ${cx} ${cy})"/>
            <text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="24" fill="white" font-weight="bold">${Math.round((passed / total) * 100)}%</text>
            <text x="${cx}" y="${cy + 15}" text-anchor="middle" font-size="11" fill="#aaa">Pass Rate</text>
        </svg>
        <div class="audit-legend">
            <span class="up">✓ Passed: ${passed}</span>
            <span class="down">✗ Failed: ${failed}</span>
        </div>
    `;

    document.getElementById("graphs-section").innerHTML += `
        <div>
            <h3>Project Pass / Fail</h3>
            ${svg}
        </div>
    `;
}

function renderLevel(data) {
    const level = data.level[0]?.amount || 0;
    document.getElementById("level-card").innerHTML = `
        <h3>Respect Level</h3>
        <div class="level-number">${level}</div>
        <div class="level-label">Current Level</div>
    `;
}

function renderRecentActivity(transactions) {
    const recent = [...transactions]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    const items = recent.map(t => {
        const date = new Date(t.createdAt).toLocaleDateString();
        const name = t.path.split("/").pop();
        return `<li>
            <span class="item-name">${name}</span>
            <span class="item-xp">${t.amount > 0 ? '+' : ''}${formatXP(t.amount)}</span>
            <span class="item-date">${date}</span>
        </li>`;
    }).join("");

    document.getElementById("activity-card").innerHTML = `
        <h3>CRIMINAL RECORD (Recent Activity)</h3>
        <ul>${items}</ul>
    `;
}

function renderXPPerProject(transactions) {
    const projectMap = {};

    transactions
        .filter(t => !t.path.includes("quest") && !t.path.includes("checkpoint") && t.amount > 0)
        .forEach(t => {
            const name = t.path.split("/").pop();
            if (!projectMap[name] || t.amount > projectMap[name]) {
                projectMap[name] = t.amount;
            }
        });

    const projects = Object.entries(projectMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    const items = projects.map(([name, xp]) =>
        `<li>
            <span class="item-name">${name}</span>
            <span class="item-xp">${formatXP(xp)}</span>
        </li>`
    ).join("");

    document.getElementById("xp-projects-card").innerHTML = `
        <h3>Top Projects by Respect</h3>
        <ul>${items}</ul>
    `;
}

function renderStreakCard(transactions) {
    // Get unique days where XP was earned
    const days = [...new Set(
        transactions
            .filter(t => t.amount > 0)
            .map(t => new Date(t.createdAt).toLocaleDateString())
    )].map(d => new Date(d)).sort((a, b) => a - b);

    let longest = 1, current = 1;
    for (let i = 1; i < days.length; i++) {
        const diff = (days[i] - days[i - 1]) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
            current++;
            longest = Math.max(longest, current);
        } else {
            current = 1;
        }
    }

    document.getElementById("streak-card").innerHTML = `
        <h3>Longest Streak</h3>
        <div class="level-number">${longest}</div>
        <div class="level-label">Consecutive Days</div>
    `;
}