// const BASE_URL = 'http://172.172.172.72:8000/api'; 
// const LIMIT = 10;

// let currentOffset = 0;
// let currentSearch = "";
// let activeSearchParam = "name"; 
// let isFetching = false;
// let hasMore = true;
// let debounceTimer;

// document.addEventListener('DOMContentLoaded', () => {
//     checkAuth();
    
//     const loginForm = document.getElementById('login-form');
//     if (loginForm) {
//         loginForm.addEventListener('submit', (e) => {
//             e.preventDefault();
//             login();
//         });
//     }

//     document.getElementById('logout-btn').addEventListener('click', logout);

//     // REFRESH BUTTON LOGIC
//     document.getElementById('refresh-btn').addEventListener('click', () => {
//         // Reloads the popup window, resetting the list and re-fetching data
//         location.reload(); 
//     });

//     const siteListDiv = document.getElementById('site-list');
//     siteListDiv.addEventListener('scroll', () => {
//         if (siteListDiv.scrollTop + siteListDiv.clientHeight >= siteListDiv.scrollHeight - 15) {
//             if (!isFetching && hasMore) fetchPortals();
//         }
//     });

//     document.getElementById('site-search').addEventListener('input', (e) => {
//         currentSearch = e.target.value;
//         clearTimeout(debounceTimer);
//         debounceTimer = setTimeout(() => resetAndSearch(), 500);
//     });
// });

// function resetAndSearch() {
//     currentOffset = 0; hasMore = true; isFetching = false;
//     activeSearchParam = "name"; 
//     document.getElementById('site-list').innerHTML = ''; 
//     fetchPortals();
// }

// async function checkAuth() {
//     const data = await chrome.storage.local.get(['access', 'firstName']);
//     if (data.access) {
//         showMainSection();
//         document.getElementById('user-fullname').innerText = `Hi, ${data.firstName || 'User'}`;
//         fetchPortals();
//     } else { showAuthSection(); }
// }

// async function fetchPortals() {
//     if (isFetching || !hasMore) return;
//     isFetching = true;
//     const indicator = document.getElementById('load-more-indicator');
//     indicator.style.display = 'block';

//     const { access } = await chrome.storage.local.get('access');
//     const callApi = async (paramKey) => {
//         let url = `${BASE_URL}/sites/?limit=${LIMIT}&offset=${currentOffset}`;
//         if (currentSearch) url += `&${paramKey}=${encodeURIComponent(currentSearch)}`;
//         try {
//             const response = await fetch(url, { headers: { 'Authorization': `Bearer ${access}` } });
//             const data = await response.json();
//             return Array.isArray(data) ? data : (data.results || []);
//         } catch (e) { return []; }
//     };

//     let portals = await callApi(activeSearchParam);

//     if (portals.length === 0 && currentOffset === 0 && currentSearch !== "") {
//         if (activeSearchParam === "name") { activeSearchParam = "practice"; portals = await callApi("practice"); }
//         if (portals.length === 0 && activeSearchParam === "practice") { activeSearchParam = "url"; portals = await callApi("url"); }
//     }

//     if (portals.length === 0) {
//         if (currentOffset === 0) document.getElementById('site-list').innerHTML = '<div class="loading-status">No portals found.</div>';
//         hasMore = false;
//         indicator.innerText = "No more portals.";
//     } else {
//         renderPortals(portals);
//         if (portals.length < LIMIT) hasMore = false;
//         else currentOffset += LIMIT;
//         indicator.style.display = 'none';
//     }
//     isFetching = false;
// }

// function renderPortals(portals) {
//     const list = document.getElementById('site-list');
//     portals.forEach(site => {
//         const div = document.createElement('div');
//         div.className = 'site-item';
//         div.innerHTML = `
//             <div class="site-details" id="details-${site.id}">
//                 <p class="site-name">${site.name}</p>
//                 <p class="site-practice">${site.practice || 'General'}</p>
//             </div>
//             <button class="action-btn" id="btn-${site.id}">Login</button>
//         `;
//         div.querySelector('button').onclick = (e) => handleProcess(site.id, e.target);
//         list.appendChild(div);
//     });
// }

// async function handleProcess(siteId, buttonEl) {
//     const { access } = await chrome.storage.local.get('access');
//     const originalText = "Login";
//     const detailsArea = document.getElementById(`details-${siteId}`);

//     buttonEl.disabled = true;
//     buttonEl.innerHTML = '<span class="spinner"></span>';

//     const tryTrack = async () => {
//         try {
//             const response = await fetch(`${BASE_URL}/track/`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
//                 body: JSON.stringify({ site_id: siteId })
//             });
//             const data = await response.json();

//             if (!response.ok) {
//                 alert(data.error || "Blocked");
//                 buttonEl.disabled = false;
//                 buttonEl.innerText = originalText;
//                 return;
//             }

//             if (data.status === "busy") {
//                 let msgEl = detailsArea.querySelector('.busy-info');
//                 if (!msgEl) {
//                     msgEl = document.createElement('span');
//                     msgEl.className = 'busy-info';
//                     detailsArea.prepend(msgEl);
//                 }
//                 msgEl.innerText = data.message;
//                 buttonEl.innerHTML = `<span class="spinner"></span> <span style="font-size:9px">Wait</span>`;
//                 setTimeout(tryTrack, data.retry_after * 1000);
//             } 
//             else if (data.url) {
//                 const msgEl = detailsArea.querySelector('.busy-info');
//                 if (msgEl) msgEl.remove();
//                 data.site_id = siteId; 
//                 chrome.runtime.sendMessage({ action: "startAutoLogin", data: data }, (res) => {
//                     buttonEl.disabled = false;
//                     buttonEl.innerText = originalText;
//                 });
//             }
//         } catch (e) {
//             buttonEl.disabled = false;
//             buttonEl.innerText = originalText;
//         }
//     };
//     tryTrack();
// }

// async function login() {
//     const email = document.getElementById('email').value;
//     const password = document.getElementById('password').value;
//     try {
//         const response = await fetch(`${BASE_URL}/login/`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ email, password })
//         });
//         const data = await response.json();
//         if (response.ok) {
//             const decoded = JSON.parse(atob(data.access.split('.')[1]));
//             await chrome.storage.local.set({ access: data.access, firstName: decoded.first_name });
//             location.reload();
//         } else {
//             document.getElementById('auth-error').innerText = data.error || "Login Failed";
//         }
//     } catch (err) { console.error(err); }
// }

// function showMainSection() { 
//     document.getElementById('auth-section').style.display = 'none'; 
//     document.getElementById('main-section').style.display = 'flex'; 
//     document.getElementById('logout-btn').style.display = 'flex'; 
//     document.getElementById('refresh-btn').style.display = 'flex'; 
// }
// function showAuthSection() { 
//     document.getElementById('auth-section').style.display = 'flex'; 
//     document.getElementById('main-section').style.display = 'none'; 
//     document.getElementById('logout-btn').style.display = 'none'; 
//     document.getElementById('refresh-btn').style.display = 'none'; 
// }
// function logout() { chrome.storage.local.clear(() => location.reload()); }






















const BASE_URL = 'http://172.172.172.72:8000/api'; 
const LIMIT = 10;

let currentOffset = 0;
let currentSearch = "";
let activeSearchParam = "name"; 
let isFetching = false;
let hasMore = true;
let debounceTimer;
let tempEmail = ""; // Stores email during 2FA step

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Auth Form Listeners
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        login();
    });

    document.getElementById('otp-form').addEventListener('submit', (e) => {
        e.preventDefault();
        verifyOTP();
    });

    document.getElementById('back-to-login').addEventListener('click', () => {
        showAuthSection();
    });

    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('refresh-btn').addEventListener('click', () => location.reload());

    // Search and Scroll Logic
    const siteListDiv = document.getElementById('site-list');
    siteListDiv.addEventListener('scroll', () => {
        if (siteListDiv.scrollTop + siteListDiv.clientHeight >= siteListDiv.scrollHeight - 15) {
            if (!isFetching && hasMore) fetchPortals();
        }
    });

    document.getElementById('site-search').addEventListener('input', (e) => {
        currentSearch = e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => resetAndSearch(), 500);
    });
});

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.innerText = "";

    try {
        const response = await fetch(`${BASE_URL}/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            if (data.is_2fa_required) {
                tempEmail = email; // Save email for verification step
                showOTPSection();
            } else {
                saveAuthData(data);
            }
        } else {
            errorEl.innerText = data.error || "Login Failed";
        }
    } catch (err) { errorEl.innerText = "Server Unreachable"; }
}

async function verifyOTP() {
    const code = document.getElementById('otp-code').value;
    const errorEl = document.getElementById('otp-error');
    errorEl.innerText = "";

    try {
        const response = await fetch(`${BASE_URL}/login/verify/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: tempEmail, otp_code: code })
        });
        const data = await response.json();

        if (response.ok) {
            saveAuthData(data);
        } else {
            errorEl.innerText = data.error || "Invalid Verification Code";
        }
    } catch (err) { errorEl.innerText = "Verification failed"; }
}

async function saveAuthData(data) {
    const decoded = JSON.parse(atob(data.access.split('.')[1]));
    await chrome.storage.local.set({ access: data.access, firstName: decoded.first_name });
    location.reload();
}

async function checkAuth() {
    const data = await chrome.storage.local.get(['access', 'firstName']);
    if (data.access) {
        showMainSection();
        document.getElementById('user-fullname').innerText = `Hi, ${data.firstName || 'User'}`;
        fetchPortals();
    } else { 
        showAuthSection(); 
    }
}

// --- Portal Data Logic ---

function resetAndSearch() {
    currentOffset = 0; hasMore = true; isFetching = false;
    activeSearchParam = "name"; 
    document.getElementById('site-list').innerHTML = ''; 
    fetchPortals();
}

async function fetchPortals() {
    if (isFetching || !hasMore) return;
    isFetching = true;
    const indicator = document.getElementById('load-more-indicator');
    indicator.style.display = 'block';

    const { access } = await chrome.storage.local.get('access');
    const callApi = async (paramKey) => {
        let url = `${BASE_URL}/sites/?limit=${LIMIT}&offset=${currentOffset}`;
        if (currentSearch) url += `&${paramKey}=${encodeURIComponent(currentSearch)}`;
        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${access}` } });
            const data = await response.json();
            return Array.isArray(data) ? data : (data.results || []);
        } catch (e) { return []; }
    };

    let portals = await callApi(activeSearchParam);

    if (portals.length === 0 && currentOffset === 0 && currentSearch !== "") {
        if (activeSearchParam === "name") { activeSearchParam = "practice"; portals = await callApi("practice"); }
        if (portals.length === 0 && activeSearchParam === "practice") { activeSearchParam = "url"; portals = await callApi("url"); }
    }

    if (portals.length === 0) {
        if (currentOffset === 0) document.getElementById('site-list').innerHTML = '<div class="loading-status">No portals found.</div>';
        hasMore = false;
        indicator.innerText = "No more portals.";
    } else {
        renderPortals(portals);
        if (portals.length < LIMIT) hasMore = false;
        else currentOffset += LIMIT;
        indicator.style.display = 'none';
    }
    isFetching = false;
}

function renderPortals(portals) {
    const list = document.getElementById('site-list');
    portals.forEach(site => {
        const div = document.createElement('div');
        div.className = 'site-item';
        div.innerHTML = `
            <div class="site-details" id="details-${site.id}">
                <p class="site-name">${site.name}</p>
                <p class="site-practice">${site.practice || 'General'}</p>
            </div>
            <button class="action-btn" id="btn-${site.id}">Login</button>
        `;
        div.querySelector('button').onclick = (e) => handleProcess(site.id, e.target);
        list.appendChild(div);
    });
}

async function handleProcess(siteId, buttonEl) {
    const { access } = await chrome.storage.local.get('access');
    const originalText = "Login";
    const detailsArea = document.getElementById(`details-${siteId}`);
    buttonEl.disabled = true;
    buttonEl.innerHTML = '<span class="spinner"></span>';

    const tryTrack = async () => {
        try {
            const response = await fetch(`${BASE_URL}/track/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${access}` },
                body: JSON.stringify({ site_id: siteId })
            });
            const data = await response.json();
            if (!response.ok) { alert(data.error || "Denied"); buttonEl.disabled = false; buttonEl.innerText = originalText; return; }

            if (data.status === "busy") {
                let msgEl = detailsArea.querySelector('.busy-info');
                if (!msgEl) { msgEl = document.createElement('span'); msgEl.className = 'busy-info'; detailsArea.prepend(msgEl); }
                msgEl.innerText = data.message;
                buttonEl.innerHTML = `<span class="spinner"></span> <span style="font-size:9px">Wait</span>`;
                setTimeout(tryTrack, data.retry_after * 1000);
            } 
            else if (data.url) {
                const msgEl = detailsArea.querySelector('.busy-info');
                if (msgEl) msgEl.remove();
                data.site_id = siteId; 
                chrome.runtime.sendMessage({ action: "startAutoLogin", data: data }, (res) => {
                    buttonEl.disabled = false;
                    buttonEl.innerText = originalText;
                });
            }
        } catch (e) { buttonEl.disabled = false; buttonEl.innerText = originalText; }
    };
    tryTrack();
}

// --- UI Toggle Helpers ---

function showMainSection() { 
    document.getElementById('auth-section').style.display = 'none'; 
    document.getElementById('otp-section').style.display = 'none'; 
    document.getElementById('main-section').style.display = 'flex'; 
    document.getElementById('logout-btn').style.display = 'flex'; 
}

function showAuthSection() { 
    document.getElementById('auth-section').style.display = 'flex'; 
    document.getElementById('otp-section').style.display = 'none'; 
    document.getElementById('main-section').style.display = 'none'; 
    document.getElementById('logout-btn').style.display = 'none'; 
}

function showOTPSection() {
    document.getElementById('auth-section').style.display = 'none'; 
    document.getElementById('otp-section').style.display = 'flex'; 
    document.getElementById('main-section').style.display = 'none'; 
    document.getElementById('logout-btn').style.display = 'none'; 
}

function logout() { chrome.storage.local.clear(() => location.reload()); }