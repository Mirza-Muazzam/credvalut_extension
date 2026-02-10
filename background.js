

// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// const activeStreams = new Map();
// const tabStates = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       // Initialize state tracking for this specific tab
//       tabStates.set(newTab.id, { 
//         step: "init", 
//         data: siteData, 
//         doneCallback: sendResponse 
//       });

//       const mainNavigationListener = async (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           const state = tabStates.get(tabId);
//           if (!state) return;

//           // --- FLOW 1: USERNAME & NEXT ---
//           if (state.step === "init" || state.step === "username") {
//             console.log(`[Tab ${tabId}] Starting Username Phase`);
//             const result = await chrome.scripting.executeScript({
//               target: { tabId: tabId },
//               func: automationPhaseUsername,
//               args: [state.data]
//             });

//             const status = result[0].result;
//             if (status === "clicked_next") {
//                 state.step = "password"; // Wait for next 'complete' event
//                 console.log("[Phase 1] Next clicked. Waiting for reload...");
//             } else {
//                 state.step = "password";
//                 // If no reload happened, trigger password phase manually
//                 setTimeout(() => mainNavigationListener(tabId, {status: 'complete'}), 500);
//             }
//           } 
//           // --- FLOW 2: PASSWORD & LOGIN ---
//           else if (state.step === "password") {
//             console.log(`[Tab ${tabId}] Starting Password Phase`);
//             const result = await chrome.scripting.executeScript({
//               target: { tabId: tabId },
//               func: automationPhasePassword,
//               args: [state.data]
//             });

//             if (result[0].result === "success") {
//                 state.step = "2fa_selection";
//                 // Move to selection phase
//                 setTimeout(() => mainNavigationListener(tabId, {status: 'complete'}), 1000);
//             }
//           }
//           // --- FLOW 3: 2FA SELECTION & STREAM ---
//           else if (state.step === "2fa_selection") {
//             console.log(`[Tab ${tabId}] Checking for 2FA Selection/Stream`);
            
//             // Handle Optional Select/Confirm buttons
//             if (state.data.select_2fa_xpath) {
//                 await runSmartClickLoop(tabId, state.data.select_2fa_xpath);
//             }
//             if (state.data.confirm_2fa_xpath) {
//                 await runSmartClickLoop(tabId, state.data.confirm_2fa_xpath);
//             }

//             // Check if OTP input eventually appears
//             if (state.data.otp_xpath) {
//                 const is2FANeeded = await runDetectionLoop(tabId, state.data.otp_xpath);
//                 if (is2FANeeded) {
//                     start2FAStream(tabId, state.data, state.doneCallback);
//                 } else {
//                     state.doneCallback({status: "success"});
//                     tabStates.delete(tabId);
//                 }
//             } else {
//                 state.doneCallback({status: "success"});
//                 tabStates.delete(tabId);
//             }
//           }
//         }
//       };

//       chrome.tabs.onUpdated.addListener(mainNavigationListener);
//       chrome.tabs.onRemoved.addListener((id) => { if(id === newTab.id) { chrome.tabs.onUpdated.removeListener(mainNavigationListener); tabStates.delete(id); }});
//     });
//     return true; 
//   }
// });

// // --- PHASE 1: USERNAME FUNCTION ---
// async function automationPhaseUsername(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   const isVisible = (el) => !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0));

//   let u = null;
//   for (let i = 0; i < 40; i++) { // VPN Patient Wait
//     u = getByXpath(sData.username_xpath);
//     if (isVisible(u)) break;
//     await sleep(1000);
//   }
//   if (!u) return "username_timeout";

//   u.focus();
//   u.value = sData.site_username;
//   u.dispatchEvent(new Event('input', { bubbles: true }));
//   u.dispatchEvent(new Event('change', { bubbles: true }));
//   await sleep(500);

//   const nextBtn = getByXpath(sData.username_next_button_xpath);
//   if (nextBtn && isVisible(nextBtn)) {
//     nextBtn.click();
//     return "clicked_next";
//   }
//   return "no_next";
// }

// // --- PHASE 2: PASSWORD & AGREEMENT FUNCTION ---
// async function automationPhasePassword(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   const isVisible = (el) => !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0));

//   let p = null;
//   for (let i = 0; i < 40; i++) {
//     p = getByXpath(sData.password_xpath);
//     if (isVisible(p)) break;
//     await sleep(1000);
//   }
//   if (!p) return "password_timeout";

//   p.focus();
//   p.value = sData.password;
//   p.dispatchEvent(new Event('input', { bubbles: true }));
//   p.dispatchEvent(new Event('change', { bubbles: true }));
//   await sleep(500);

//   // Optional Agreement Checkbox
//   if (sData.agreement_checkbox_xpath) {
//     const cb = getByXpath(sData.agreement_checkbox_xpath);
//     if (cb) cb.click();
//     await sleep(500);
//   }

//   const loginBtn = getByXpath(sData.login_button_xpath);
//   if (loginBtn) {
//     loginBtn.click();
//     return "success";
//   }
//   return "login_btn_not_found";
// }

// // --- OTP HUMAN-LIKE INJECTION ---
// async function injectOTPCodeHumanLike(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));

//   for (let i = 0; i < 20; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f && f.offsetWidth > 0) {
//       f.focus();
//       f.value = ""; 
//       for (const char of code) {
//         f.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
//         f.value += char;
//         f.dispatchEvent(new Event('input', { bubbles: true }));
//         f.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
//         await sleep(Math.floor(Math.random() * 70) + 30);
//       }
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       f.blur();
//       await sleep(600); 

//       const b = getByXpath(sData.otp_submit_xpath);
//       if (b) {
//         b.removeAttribute('disabled'); // Ensure enabled
//         b.click();
//       }
//       return;
//     }
//     await sleep(1000);
//   }
// }

// // --- UTILITIES ---

// async function runSmartClickLoop(tabId, xpath) {
//     for (let i = 0; i < 10; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const el = getByXpath(targetXpath);
//                     if (!el) return false;
//                     // Handle Select/Option Case
//                     if (targetXpath.toLowerCase().includes('/select/option') && el.tagName === 'OPTION') {
//                         const ps = el.closest('select');
//                         if (ps) {
//                             el.selected = true;
//                             ps.value = el.value;
//                             ps.dispatchEvent(new Event('change', { bubbles: true }));
//                             return true;
//                         }
//                     }
//                     el.click();
//                     return true;
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
// }

// async function runDetectionLoop(tabId, xpath) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const f = getByXpath(targetXpath);
//                     return !!(f && (f.offsetWidth > 0 || f.offsetHeight > 0));
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false;
// }

// async function start2FAStream(tabId, siteData, doneCallback) {
//   const storage = await chrome.storage.local.get('access');
//   if (activeStreams.has(tabId)) activeStreams.get(tabId).close();
//   const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
//   const es = new EventSource(streamUrl);
//   activeStreams.set(tabId, es);
//   es.onmessage = (event) => {
//     const raw = event.data.trim();
//     if (!raw || raw === "ping") return;
//     // Extract code or link
//     let val = null;
//     try { val = JSON.parse(raw).value; } 
//     catch (e) { const m = raw.match(/[A-Z0-9]{4,10}/i); if(m) val = m[0]; }

//     if (val) {
//         chrome.scripting.executeScript({ target: { tabId: tabId }, func: injectOTPCodeHumanLike, args: [siteData, val] });
//         es.close(); activeStreams.delete(tabId);
//         if (doneCallback) doneCallback({status: "success"});
//     }
//   };
//   es.onerror = () => { es.close(); activeStreams.delete(tabId); if (doneCallback) doneCallback({status: "error"}); };
// }



















// background.js

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const activeStreams = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAutoLogin") {
    const siteData = message.data;
    const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
    chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
      const initialLoadListener = (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(initialLoadListener);
          
          // 1. FILL CREDENTIALS & CAPTURE XPATH ERRORS
          chrome.scripting.executeScript({
            target: { tabId: newTab.id },
            func: performCredentialFill,
            args: [siteData]
          }).then(async (results) => {
            const fillResult = results[0].result;

            // Check if performCredentialFill returned an element error
            if (fillResult && fillResult.status === "error") {
                console.log(`[ELEMENT ERROR] ${fillResult.step}: ${fillResult.message}`);
                
                // Report specific XPath failure to server
                reportErrorToServer(siteData.site_id, fillResult.step, fillResult.message);
                
                // Stop process and notify popup
                sendResponse({status: "auth_error", message: fillResult.message});
                return;
            }

            // 2. IF FILL SUCCESS: PROCEED TO MONITOR FOR 2FA OR INVALID CREDENTIALS
            console.log(`[MONITORING] Tab ${newTab.id}: Monitoring for 2FA or Auth Errors...`);
            const result = await runDetectionLoop(newTab.id, siteData.otp_xpath);

            if (result.type === "otp") {
              start2FAStream(newTab.id, siteData, sendResponse);
            } 
            else if (result.type === "error") {
              // Report invalid credentials/toast errors to server
              reportErrorToServer(siteData.site_id, "AUTH_FAILURE", result.message);
              sendResponse({status: "auth_error", message: result.message});
            } 
            else {
              sendResponse({status: "success", info: "direct_login"});
            }
          });
        }
      };
      chrome.tabs.onUpdated.addListener(initialLoadListener);
    });
    return true; 
  }
});

// --- UPDATED REPORTING FUNCTION ---
async function reportErrorToServer(siteId, failedStep, errorMsg) {
  const storage = await chrome.storage.local.get('access');
  const payload = { 
    site_id: siteId, 
    failed_step: failedStep, 
    error_message: errorMsg 
  };
  
  fetch(`http://172.172.172.72:8000/api/report-error/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${storage.access}` },
    body: JSON.stringify(payload)
  }).catch(e => console.error("Report failed", e));
}

// --- UPDATED FILL FUNCTION: Returns error if XPaths fail ---
async function performCredentialFill(sData) {
  const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  
  // 1. Find Username
  let u = null;
  for (let i = 0; i < 15; i++) {
    u = getByXpath(sData.username_xpath);
    if (u) break;
    await sleep(500);
  }
  if (!u) return { status: "error", step: "USERNAME_XPATH", message: `Username xpath not found: ${sData.username_xpath}` };

  // 2. Find Password
  let p = null;
  for (let i = 0; i < 10; i++) {
    p = getByXpath(sData.password_xpath);
    if (p) break;
    await sleep(500);
  }
  if (!p) return { status: "error", step: "PASSWORD_XPATH", message: `Password xpath not found: ${sData.password_xpath}` };

  // 3. Fill Data
  u.focus(); u.value = sData.site_username; u.dispatchEvent(new Event('input', { bubbles: true }));
  u.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);
  p.focus(); p.value = sData.password; p.dispatchEvent(new Event('input', { bubbles: true }));
  p.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);

  // 4. Find & Click Login Button
  const btn = getByXpath(sData.login_button_xpath);
  if (!btn) return { status: "error", step: "LOGIN_BUTTON", message: `Login button xpath not found: ${sData.login_button_xpath}` };
  
  btn.click();
  return { status: "success" };
}

// --- DETECTION LOOP (Unchanged logic) ---
async function runDetectionLoop(tabId, otpXpath) {
    for (let i = 0; i < 20; i++) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (xpath) => {
                    const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    const otpField = getByXpath(xpath);
                    if (otpField && (otpField.offsetWidth > 0 || otpField.offsetHeight > 0)) return { type: "otp" };

                    const keywords = ["incorrect", "invalid", "failed", "not recognized", "wrong", "error"];
                    const alerts = document.querySelectorAll('[role="alert"], .toast, .alert, .error-msg');
                    for (let a of alerts) {
                        const txt = a.innerText.trim();
                        if (txt.length > 2 && txt.length < 150 && keywords.some(k => txt.toLowerCase().includes(k))) 
                            return { type: "error", message: txt };
                    }
                    const allDivs = document.querySelectorAll('div, span, p');
                    for (let el of allDivs) {
                        if (el.offsetParent !== null && el.innerText.length > 2 && el.innerText.length < 100) {
                            const style = window.getComputedStyle(el);
                            const isRed = style.color.includes('rgb(2') || style.color.includes('rgb(1');
                            if (isRed && keywords.some(k => el.innerText.toLowerCase().includes(k))) 
                                return { type: "error", message: el.innerText.trim() };
                        }
                    }
                    return null;
                },
                args: [otpXpath]
            });
            if (results && results[0].result) return results[0].result;
        } catch (e) { }
        await new Promise(r => setTimeout(r, 1000));
    }
    return { type: "none" };
}

// --- STREAM & OTP INJECTION (Unchanged logic) ---
async function start2FAStream(tabId, siteData, doneCallback) {
  const storage = await chrome.storage.local.get('access');
  if (activeStreams.has(tabId)) activeStreams.get(tabId).close();
  const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  const es = new EventSource(streamUrl);
  activeStreams.set(tabId, es);
  es.onmessage = (event) => {
    const code = event.data.trim();
    if (code && code !== "" && code !== "ping") {
      chrome.scripting.executeScript({ target: { tabId: tabId }, func: injectOTPCode, args: [siteData, code] });
      es.close(); activeStreams.delete(tabId);
      if (doneCallback) doneCallback({status: "success"});
    }
  };
  es.onerror = () => { es.close(); activeStreams.delete(tabId); if (doneCallback) doneCallback({status: "error"}); };
}

async function injectOTPCode(sData, code) {
  const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  for (let i = 0; i < 30; i++) {
    const f = getByXpath(sData.otp_xpath);
    if (f) {
      f.focus(); f.value = code; f.dispatchEvent(new Event('input', { bubbles: true }));
      f.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => { const b = getByXpath(sData.otp_submit_xpath); if (b) b.click(); }, 500);
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}