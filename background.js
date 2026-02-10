












































// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// const activeStreams = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       const initialLoadListener = (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           chrome.tabs.onUpdated.removeListener(initialLoadListener);
//           handleLoginProcess(newTab.id, siteData, sendResponse);
//         }
//       };
//       chrome.tabs.onUpdated.addListener(initialLoadListener);
//     });
//     return true; 
//   }
// });

// async function handleLoginProcess(tabId, siteData, sendResponse) {
//     const step1Result = await chrome.scripting.executeScript({
//         target: { tabId: tabId },
//         func: performUsernameStep,
//         args: [siteData]
//     });

//     if (step1Result[0].result) {
//         const reloadListener = (tId, changeInfo) => {
//             if (tId === tabId && changeInfo.status === 'complete') {
//                 chrome.tabs.onUpdated.removeListener(reloadListener);
//                 finishLoginProcess(tabId, siteData, sendResponse);
//             }
//         };
//         chrome.tabs.onUpdated.addListener(reloadListener);
//     } else {
//         finishLoginProcess(tabId, siteData, sendResponse);
//     }
// }

// async function finishLoginProcess(tabId, siteData, sendResponse) {
//     await chrome.scripting.executeScript({
//         target: { tabId: tabId },
//         func: performPasswordAndFinalStep,
//         args: [siteData]
//     });

//     console.log(`[Tab ${tabId}] Credentials submitted. Monitoring for 2FA or Magic Link...`);

//     // --- ENHANCED DETECTION ---
//     // Returns: 1 (OTP found), 2 (Stuck on Login - probably Link), 0 (Success/No 2FA)
//     const detectionType = await runEnhancedDetectionLoop(tabId, siteData);

//     if (detectionType > 0) {
//         console.log(`[Tab ${tabId}] 2FA/Link wait detected (Type ${detectionType}). Opening Stream.`);
//         start2FAStream(tabId, siteData, sendResponse);
//     } else {
//         console.log(`[Tab ${tabId}] No 2FA required. Sequence complete.`);
//         sendResponse({status: "success"});
//     }
// }

// // --- STREAM HANDLER (Supports Code Injection and URL Redirection) ---
// async function start2FAStream(tabId, siteData, doneCallback) {
//   const storage = await chrome.storage.local.get('access');
//   if (activeStreams.has(tabId)) activeStreams.get(tabId).close();

//   const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  
//   const es = new EventSource(streamUrl);
//   activeStreams.set(tabId, es);

//   es.onmessage = (event) => {
//     try {
//       const parsedData = JSON.parse(event.data);
//       const receivedValue = parsedData.value ? parsedData.value.toString().trim() : "";

//       if (receivedValue && receivedValue !== "" && receivedValue !== "ping") {
        
//         // CHECK: Is it a Magic Link (URL) or an OTP Code?
//         if (receivedValue.startsWith('http')) {
//             console.log(`[Tab ${tabId}] Magic Link received. Updating tab...`);
//             chrome.tabs.update(tabId, { url: receivedValue });
//         } else {
//             console.log(`[Tab ${tabId}] OTP Code received. Injecting into field...`);
//             chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: injectOTPCode,
//                 args: [siteData, receivedValue]
//             });
//         }

//         es.close();
//         activeStreams.delete(tabId);
//         if (doneCallback) doneCallback({status: "success"});
//       }
//     } catch (err) {
//         console.error("Stream parse error:", err);
//     }
//   };

//   es.onerror = () => { es.close(); activeStreams.delete(tabId); if (doneCallback) doneCallback({status: "error"}); };
// }

// // --- DETECTION LOOP (Checks for OTP box OR if we are still on login page) ---
// async function runEnhancedDetectionLoop(tabId, sData) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (otpX, userX) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    
//                     const otpField = getByXpath(otpX);
//                     if (otpField && otpField.offsetWidth > 0) return 1; // 2FA Input visible

//                     const userField = getByXpath(userX);
//                     if (userField && userField.offsetWidth > 0) return 2; // Login fields still visible (holding for Link)

//                     return 0; 
//                 },
//                 args: [sData.otp_xpath || "none", sData.username_xpath]
//             });
//             if (results[0].result > 0) return results[0].result;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return 0; 
// }

// // --- INJECTION FUNCTIONS ---

// async function performUsernameStep(sData) {
//     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//     const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//     for (let i = 0; i < 20; i++) {
//         const u = getByXpath(sData.username_xpath);
//         if (u) {
//             u.focus(); u.value = sData.site_username;
//             u.dispatchEvent(new Event('input', { bubbles: true }));
//             u.dispatchEvent(new Event('change', { bubbles: true }));
//             break;
//         }
//         await sleep(500);
//     }
//     await sleep(500);
//     if (sData.username_next_button_xpath) {
//         const nextBtn = getByXpath(sData.username_next_button_xpath);
//         if (nextBtn) { nextBtn.click(); return true; }
//     }
//     return false;
// }

// async function performPasswordAndFinalStep(sData) {
//     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//     const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//     for (let i = 0; i < 20; i++) {
//         const p = getByXpath(sData.password_xpath);
//         if (p && p.offsetWidth > 0) {
//             p.focus(); p.value = sData.password;
//             p.dispatchEvent(new Event('input', { bubbles: true }));
//             p.dispatchEvent(new Event('change', { bubbles: true }));
//             if (sData.agreement_checkbox_xpath) {
//                 const checkbox = getByXpath(sData.agreement_checkbox_xpath);
//                 if (checkbox) checkbox.click();
//             }
//             await sleep(500);
//             const loginBtn = getByXpath(sData.login_button_xpath);
//             if (loginBtn) loginBtn.click();
//             return;
//         }
//         await sleep(500);
//     }
// }

// async function injectOTPCode(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   for (let i = 0; i < 15; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f) {
//       f.focus(); f.value = code;
//       f.dispatchEvent(new Event('input', { bubbles: true }));
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       setTimeout(() => {
//         const b = getByXpath(sData.otp_submit_xpath);
//         if (b) b.click();
//       }, 500);
//       return;
//     }
//     await new Promise(r => setTimeout(r, 1000));
//   }
// }



























































// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// // Map to track active streams per tab ID
// const activeStreams = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       console.log(`[PROCESS START] Tab ID: ${newTab.id}`);

//       const initialLoadListener = (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           chrome.tabs.onUpdated.removeListener(initialLoadListener);
          
//           chrome.scripting.executeScript({
//             target: { tabId: newTab.id },
//             func: performCredentialFill,
//             args: [siteData]
//           }).then(async () => {
            
//             // 1. CLICK INTERMEDIATE BUTTON (Select 2FA)
//             // if (siteData.select_2fa_xpath) {
//             //   console.log(`[INTERMEDIATE] Waiting for Select 2FA Button (Tab ${newTab.id})...`);
//             //   await runClickLoop(newTab.id, siteData.select_2fa_xpath);
//             // }
//             // This will now use the "Smart Click" logic automatically
//                 async function runClickLoop(tabId, xpath) {
//                 for (let i = 0; i < 15; i++) {
//                     try {
//                         const results = await chrome.scripting.executeScript({
//                             target: { tabId: tabId },
//                             func: (targetXpath) => {
//                                 const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                                 const element = getByXpath(targetXpath);
                                
//                                 if (element) {
//                                     // Check if it's an <option> inside a <select>
//                                     if (element.tagName === 'OPTION') {
//                                         const parentSelect = element.closest('select');
//                                         if (parentSelect) {
//                                             // 1. Set the selection
//                                             element.selected = true;
//                                             parentSelect.value = element.value;

//                                             // 2. Trigger events so the website reacts
//                                             parentSelect.dispatchEvent(new Event('input', { bubbles: true }));
//                                             parentSelect.dispatchEvent(new Event('change', { bubbles: true }));
//                                             return true;
//                                         }
//                                     }

//                                     // Default behavior for standard buttons/links
//                                     element.click();
                                    
//                                     // Extra: Dispatch MouseEvents for custom non-standard dropdowns
//                                     ['mousedown', 'mouseup', 'click'].forEach(type => {
//                                         element.dispatchEvent(new MouseEvent(type, {
//                                             view: window,
//                                             bubbles: true,
//                                             cancelable: true,
//                                             buttons: 1
//                                         }));
//                                     });
//                                     return true;
//                                 }
//                                 return false;
//                             },
//                             args: [xpath]
//                         });
//                         if (results && results[0] && results[0].result) return true;
//                     } catch (e) {
//                         console.error("Error in Click Loop:", e);
//                     }
//                     await new Promise(r => setTimeout(r, 1000));
//                 }
//                 return false;
//             }
//             if (siteData.select_2fa_xpath) {
//                 console.log(`[INTERMEDIATE] Waiting for Select 2FA (Tab ${newTab.id})...`);
//                 await runClickLoop(newTab.id, siteData.select_2fa_xpath);
//             }

//             // 2. DETECT OTP FIELD & START STREAM
//             if (siteData.otp_xpath) {
//               console.log(`[MONITORING] Waiting for OTP field in Tab ${newTab.id}...`);
//               const is2FANeeded = await runDetectionLoop(newTab.id, siteData.otp_xpath);

//               if (is2FANeeded) {
//                 console.log(`[STREAM] Opening Stream for Tab ID: ${newTab.id}`);
//                 start2FAStream(newTab.id, siteData, sendResponse);
//               } else {
//                 console.log(`[FINISHED] No 2FA field found in Tab ${newTab.id}.`);
//                 sendResponse({status: "success", info: "direct_login"});
//               }
//             } else {
//               sendResponse({status: "success", info: "no_otp_configured"});
//             }
//           });
//         }
//       };
//       chrome.tabs.onUpdated.addListener(initialLoadListener);
//     });
//     return true; 
//   }
// });

// // --- SMART STREAM RECEIVER ---
// async function start2FAStream(tabId, siteData, doneCallback) {
//   const storage = await chrome.storage.local.get('access');
//   if (activeStreams.has(tabId)) activeStreams.get(tabId).close();

//   const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  
//   const es = new EventSource(streamUrl);
//   activeStreams.set(tabId, es);

//   es.onmessage = (event) => {
//     const rawData = event.data.trim();
//     if (!rawData || rawData === "ping") return;

//     console.log(`[STREAM DATA] Raw received for Tab ${tabId}: ${rawData}`);

//     let extractedCode = null;
//     let extractedLink = null;

//     // --- STEP 1: ATTEMPT TO PARSE JSON ---
//     try {
//         const parsed = JSON.parse(rawData);
//         if (parsed.type === "link") {
//             extractedLink = parsed.value;
//         } else {
//             // Treat anything else as a code if JSON contains a value
//             extractedCode = parsed.value;
//         }
//     } catch (e) {
//         // --- STEP 2: FALLBACK TO RAW TEXT REGEX ---
//         const urlPattern = /(https?:\/\/[^\s]+)/g;
//         const urlMatch = rawData.match(urlPattern);

//         if (urlMatch) {
//             extractedLink = urlMatch[0];
//         } else {
//             // Match alphanumeric codes (4 to 10 characters long)
//             const codeMatch = rawData.match(/[A-Z0-9]{4,10}/i);
//             if (codeMatch) extractedCode = codeMatch[0];
//         }
//     }

//     // --- STEP 3: EXECUTE ACTION ---
//     if (extractedLink) {
//         console.log(`[ACTION] Detected Link. Redirecting Tab ${tabId} to: ${extractedLink}`);
//         chrome.tabs.update(tabId, { url: extractedLink });
//         cleanupStream(tabId, doneCallback);
//     } 
//     else if (extractedCode) {
//         console.log(`[ACTION] Detected Alphanumeric Code: ${extractedCode}. Injecting into Tab ${tabId}`);
//         chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: injectOTPCode,
//             args: [siteData, extractedCode]
//         });
//         cleanupStream(tabId, doneCallback);
//     } else {
//         console.log("[STREAM INFO] Data received but no URL or Code found.");
//     }
// };

//   es.onerror = () => {
//     cleanupStream(tabId, doneCallback, true);
//   };
// }

// function cleanupStream(tabId, callback, isError = false) {
//     if (activeStreams.has(tabId)) {
//         activeStreams.get(tabId).close();
//         activeStreams.delete(tabId);
//     }
//     if (callback) callback({status: isError ? "error" : "success"});
// }

// // --- HELPER LOOPS ---

// async function runClickLoop(tabId, xpath) {
//     for (let i = 0; i < 15; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const btn = getByXpath(targetXpath);
//                     if (btn && (btn.offsetWidth > 0 || btn.offsetHeight > 0)) {
//                         btn.click(); return true;
//                     }
//                     return false;
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false;
// }

// async function runDetectionLoop(tabId, xpath) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const field = getByXpath(targetXpath);
//                     return !!(field && (field.offsetWidth > 0 || field.offsetHeight > 0 || field.offsetParent !== null));
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false; 
// }

// // --- INJECTION FUNCTIONS ---

// async function performCredentialFill(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   let u, p;
//   for (let i = 0; i < 15; i++) {
//     u = getByXpath(sData.username_xpath);
//     p = getByXpath(sData.password_xpath);
//     if (u && p) break;
//     await sleep(500);
//   }
//   if (u && p) {
//     u.focus(); u.value = sData.site_username;
//     u.dispatchEvent(new Event('input', { bubbles: true }));
//     u.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     p.focus(); p.value = sData.password;
//     p.dispatchEvent(new Event('input', { bubbles: true }));
//     p.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     const btn = getByXpath(sData.login_button_xpath);
//     if (btn) btn.click();
//   }
// }

// async function injectOTPCode(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   for (let i = 0; i < 15; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f) {
//       f.focus(); f.value = code;
//       f.dispatchEvent(new Event('input', { bubbles: true }));
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       setTimeout(() => {
//         const b = getByXpath(sData.otp_submit_xpath);
//         if (b) b.click();
//       }, 500);
//       return;
//     }
//     await new Promise(r => setTimeout(r, 1000));
//   }
// }





























































































// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// // Map to track active streams per tab ID
// const activeStreams = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       console.log(`[PROCESS START] Tab ID: ${newTab.id}`);

//       const initialLoadListener = (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           chrome.tabs.onUpdated.removeListener(initialLoadListener);
          
//           chrome.scripting.executeScript({
//             target: { tabId: newTab.id },
//             func: performCredentialFill,
//             args: [siteData]
//           }).then(async () => {
            
//             // 1. SMART CLICK: Select 2FA method
//             if (siteData.select_2fa_xpath) {
//               console.log(`[INTERMEDIATE] Waiting for Select 2FA: ${siteData.select_2fa_xpath} (Tab ${newTab.id})`);
//               await runSmartClickLoop(newTab.id, siteData.select_2fa_xpath);
//             }

//             // 2. SMART CLICK: Confirm 2FA (New Step)
//             if (siteData.confirm_2fa_xpath) {
//               console.log(`[CONFIRMATION] Waiting for Confirm 2FA: ${siteData.confirm_2fa_xpath} (Tab ${newTab.id})`);
//               await runSmartClickLoop(newTab.id, siteData.confirm_2fa_xpath);
//             }

//             // 3. DETECT OTP FIELD & START STREAM
//             if (siteData.otp_xpath) {
//               console.log(`[MONITORING] Waiting for OTP field in Tab ${newTab.id}...`);
//               const is2FANeeded = await runDetectionLoop(newTab.id, siteData.otp_xpath);

//               if (is2FANeeded) {
//                 console.log(`[STREAM] Opening Stream for Tab ID: ${newTab.id}`);
//                 start2FAStream(newTab.id, siteData, sendResponse);
//               } else {
//                 console.log(`[FINISHED] No 2FA field found in Tab ${newTab.id}.`);
//                 sendResponse({status: "success", info: "direct_login"});
//               }
//             } else {
//               sendResponse({status: "success", info: "no_otp_configured"});
//             }
//           });
//         }
//       };
//       chrome.tabs.onUpdated.addListener(initialLoadListener);
//     });
//     return true; 
//   }
// });

// // --- SMART CLICK HELPER (Handles standard buttons and dropdown options) ---
// async function runSmartClickLoop(tabId, xpath) {
//     for (let i = 0; i < 15; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const element = getByXpath(targetXpath);
                    
//                     if (element) {
//                         // Check if it's an <option> inside a <select>
//                         if (element.tagName === 'OPTION') {
//                             const parentSelect = element.closest('select');
//                             if (parentSelect) {
//                                 element.selected = true;
//                                 parentSelect.value = element.value;
//                                 parentSelect.dispatchEvent(new Event('input', { bubbles: true }));
//                                 parentSelect.dispatchEvent(new Event('change', { bubbles: true }));
//                                 return true;
//                             }
//                         }

//                         // Default click
//                         element.click();
                        
//                         // Dispatch mouse events for custom JS elements
//                         ['mousedown', 'mouseup', 'click'].forEach(type => {
//                             element.dispatchEvent(new MouseEvent(type, { view: window, bubbles: true, cancelable: true, buttons: 1 }));
//                         });
//                         return true;
//                     }
//                     return false;
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false;
// }

// // --- SMART STREAM RECEIVER ---
// async function start2FAStream(tabId, siteData, doneCallback) {
//   const storage = await chrome.storage.local.get('access');
//   if (activeStreams.has(tabId)) activeStreams.get(tabId).close();

//   const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  
//   const es = new EventSource(streamUrl);
//   activeStreams.set(tabId, es);

//   es.onmessage = (event) => {
//     const rawData = event.data.trim();
//     if (!rawData || rawData === "ping") return;

//     console.log(`[STREAM DATA] Raw received for Tab ${tabId}: ${rawData}`);

//     let extractedCode = null;
//     let extractedLink = null;

//     try {
//         const parsed = JSON.parse(rawData);
//         if (parsed.type === "link") extractedLink = parsed.value;
//         else extractedCode = parsed.value;
//     } catch (e) {
//         const urlPattern = /(https?:\/\/[^\s]+)/g;
//         const urlMatch = rawData.match(urlPattern);
//         if (urlMatch) extractedLink = urlMatch[0];
//         else {
//             const codeMatch = rawData.match(/[A-Z0-9]{4,10}/i);
//             if (codeMatch) extractedCode = codeMatch[0];
//         }
//     }

//     if (extractedLink) {
//         chrome.tabs.update(tabId, { url: extractedLink });
//         cleanupStream(tabId, doneCallback);
//     } 
//     else if (extractedCode) {
//         chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: injectOTPCode,
//             args: [siteData, extractedCode]
//         });
//         cleanupStream(tabId, doneCallback);
//     }
//   };

//   es.onerror = () => cleanupStream(tabId, doneCallback, true);
// }

// function cleanupStream(tabId, callback, isError = false) {
//     if (activeStreams.has(tabId)) {
//         activeStreams.get(tabId).close();
//         activeStreams.delete(tabId);
//     }
//     if (callback) callback({status: isError ? "error" : "success"});
// }

// async function runDetectionLoop(tabId, xpath) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const field = getByXpath(targetXpath);
//                     return !!(field && (field.offsetWidth > 0 || field.offsetHeight > 0 || field.offsetParent !== null));
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false; 
// }

// // --- INJECTION FUNCTIONS ---

// async function performCredentialFill(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   let u, p;
//   for (let i = 0; i < 15; i++) {
//     u = getByXpath(sData.username_xpath);
//     p = getByXpath(sData.password_xpath);
//     if (u && p) break;
//     await sleep(500);
//   }
//   if (u && p) {
//     u.focus(); u.value = sData.site_username;
//     u.dispatchEvent(new Event('input', { bubbles: true }));
//     u.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     p.focus(); p.value = sData.password;
//     p.dispatchEvent(new Event('input', { bubbles: true }));
//     p.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     const btn = getByXpath(sData.login_button_xpath);
//     if (btn) btn.click();
//   }
// }

// async function injectOTPCode(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   for (let i = 0; i < 15; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f) {
//       f.focus(); f.value = code;
//       f.dispatchEvent(new Event('input', { bubbles: true }));
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       setTimeout(() => {
//         const b = getByXpath(sData.otp_submit_xpath);
//         if (b) b.click();
//       }, 500);
//       return;
//     }
//     await new Promise(r => setTimeout(r, 1000));
//   }
// }








































































// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// // Map to track active streams per tab ID
// const activeStreams = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       console.log(`[PROCESS START] Tab ID: ${newTab.id}`);

//       const initialLoadListener = (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           chrome.tabs.onUpdated.removeListener(initialLoadListener);
          
//           chrome.scripting.executeScript({
//             target: { tabId: newTab.id },
//             func: performCredentialFill,
//             args: [siteData]
//           }).then(async () => {
            
//             // 1. SMART CLICK: Select 2FA method
//             if (siteData.select_2fa_xpath) {
//               console.log(`[INTERMEDIATE] Handling Select 2FA: ${siteData.select_2fa_xpath}`);
//               await runSmartClickLoop(newTab.id, siteData.select_2fa_xpath);
//             }

//             // 2. SMART CLICK: Confirm 2FA
//             if (siteData.confirm_2fa_xpath) {
//               console.log(`[CONFIRMATION] Handling Confirm 2FA: ${siteData.confirm_2fa_xpath}`);
//               await runSmartClickLoop(newTab.id, siteData.confirm_2fa_xpath);
//             }

//             // 3. DETECT OTP FIELD & START STREAM
//             if (siteData.otp_xpath) {
//               console.log(`[MONITORING] Waiting for OTP field in Tab ${newTab.id}...`);
//               const is2FANeeded = await runDetectionLoop(newTab.id, siteData.otp_xpath);

//               if (is2FANeeded) {
//                 console.log(`[STREAM] Opening Stream for Tab ID: ${newTab.id}`);
//                 start2FAStream(newTab.id, siteData, sendResponse);
//               } else {
//                 console.log(`[FINISHED] No 2FA field found in Tab ${newTab.id}.`);
//                 sendResponse({status: "success", info: "direct_login"});
//               }
//             } else {
//               sendResponse({status: "success", info: "no_otp_configured"});
//             }
//           });
//         }
//       };
//       chrome.tabs.onUpdated.addListener(initialLoadListener);
//     });
//     return true; 
//   }
// });

// // --- HELPER: SMART CLICK (With Dropdown Condition) ---
// async function runSmartClickLoop(tabId, xpath) {
//     for (let i = 0; i < 15; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const element = getByXpath(targetXpath);
                    
//                     if (!element) return false;

//                     // Condition: Check if XPath contains dropdown-specific keywords
//                     const isDropdown = targetXpath.toLowerCase().includes('/select/option');

//                     if (isDropdown && element.tagName === 'OPTION') {
//                         const parentSelect = element.closest('select');
//                         if (parentSelect) {
//                             element.selected = true;
//                             parentSelect.value = element.value;
//                             parentSelect.dispatchEvent(new Event('input', { bubbles: true }));
//                             parentSelect.dispatchEvent(new Event('change', { bubbles: true }));
//                             return "Dropdown selection successful";
//                         }
//                     }

//                     // Condition Not Met: Simply click
//                     element.click();
//                     return "Simple click successful";
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false;
// }

// // --- SMART STREAM RECEIVER ---
// async function start2FAStream(tabId, siteData, doneCallback) {
//   const storage = await chrome.storage.local.get('access');
//   if (activeStreams.has(tabId)) activeStreams.get(tabId).close();

//   const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  
//   const es = new EventSource(streamUrl);
//   activeStreams.set(tabId, es);

//   es.onmessage = (event) => {
//     const rawData = event.data.trim();
//     if (!rawData || rawData === "ping") return;

//     let extractedCode = null;
//     let extractedLink = null;

//     try {
//         const parsed = JSON.parse(rawData);
//         if (parsed.type === "link") extractedLink = parsed.value;
//         else extractedCode = parsed.value;
//     } catch (e) {
//         const urlPattern = /(https?:\/\/[^\s]+)/g;
//         const urlMatch = rawData.match(urlPattern);
//         if (urlMatch) extractedLink = urlMatch[0];
//         else {
//             const codeMatch = rawData.match(/[A-Z0-9]{4,10}/i);
//             if (codeMatch) extractedCode = codeMatch[0];
//         }
//     }

//     if (extractedLink) {
//         chrome.tabs.update(tabId, { url: extractedLink });
//         cleanupStream(tabId, doneCallback);
//     } 
//     else if (extractedCode) {
//         chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: injectOTPCode,
//             args: [siteData, extractedCode]
//         });
//         cleanupStream(tabId, doneCallback);
//     }
//   };

//   es.onerror = () => cleanupStream(tabId, doneCallback, true);
// }

// function cleanupStream(tabId, callback, isError = false) {
//     if (activeStreams.has(tabId)) {
//         activeStreams.get(tabId).close();
//         activeStreams.delete(tabId);
//     }
//     if (callback) callback({status: isError ? "error" : "success"});
// }

// async function runDetectionLoop(tabId, xpath) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const field = getByXpath(targetXpath);
//                     return !!(field && (field.offsetWidth > 0 || field.offsetHeight > 0 || field.offsetParent !== null));
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false; 
// }

// // --- INJECTION FUNCTIONS ---

// async function performCredentialFill(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   let u, p;
//   for (let i = 0; i < 15; i++) {
//     u = getByXpath(sData.username_xpath);
//     p = getByXpath(sData.password_xpath);
//     if (u && p) break;
//     await sleep(500);
//   }
//   if (u && p) {
//     u.focus(); u.value = sData.site_username;
//     u.dispatchEvent(new Event('input', { bubbles: true }));
//     u.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     p.focus(); p.value = sData.password;
//     p.dispatchEvent(new Event('input', { bubbles: true }));
//     p.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     const btn = getByXpath(sData.login_button_xpath);
//     if (btn) btn.click();
//   }
// }

// async function injectOTPCode(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   for (let i = 0; i < 15; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f) {
//       f.focus(); f.value = code;
//       f.dispatchEvent(new Event('input', { bubbles: true }));
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       setTimeout(() => {
//         const b = getByXpath(sData.otp_submit_xpath);
//         if (b) b.click();
//       }, 500);
//       return;
//     }
//     await new Promise(r => setTimeout(r, 1000));
//   }
// }

























































// // background.js

// chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// const activeStreams = new Map();

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "startAutoLogin") {
//     const siteData = message.data;
//     const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
//     chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
//       const initialLoadListener = (tabId, changeInfo) => {
//         if (tabId === newTab.id && changeInfo.status === 'complete') {
//           chrome.tabs.onUpdated.removeListener(initialLoadListener);
          
//           chrome.scripting.executeScript({
//             target: { tabId: newTab.id },
//             func: performCredentialFill,
//             args: [siteData]
//           }).then(async () => {
            
//             if (siteData.select_2fa_xpath) {
//               await runSmartClickLoop(newTab.id, siteData.select_2fa_xpath);
//             }

//             if (siteData.confirm_2fa_xpath) {
//               await runSmartClickLoop(newTab.id, siteData.confirm_2fa_xpath);
//             }

//             if (siteData.otp_xpath) {
//               const is2FANeeded = await runDetectionLoop(newTab.id, siteData.otp_xpath);
//               if (is2FANeeded) {
//                 start2FAStream(newTab.id, siteData, sendResponse);
//               } else {
//                 sendResponse({status: "success", info: "direct_login"});
//               }
//             } else {
//               sendResponse({status: "success", info: "no_otp_configured"});
//             }
//           });
//         }
//       };
//       chrome.tabs.onUpdated.addListener(initialLoadListener);
//     });
//     return true; 
//   }
// });

// // --- UPDATED HUMAN-LIKE TYPING WITH FULL KEYBOARD EVENTS ---
// async function injectOTPCodeHumanLike(sData, code) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));

//   for (let i = 0; i < 15; i++) {
//     const f = getByXpath(sData.otp_xpath);
//     if (f) {
//       f.focus();
//       f.value = ""; 

//       for (const char of code) {
//         // 1. KeyDown
//         f.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        
//         // 2. Update Value
//         f.value += char;
        
//         // 3. Input Event (Essential for React/Vue)
//         f.dispatchEvent(new Event('input', { bubbles: true }));
        
//         // 4. KeyUp
//         f.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        
//         // Human-like speed delay
//         await sleep(Math.floor(Math.random() * 80) + 40);
//       }

//       // 5. Final Change and Blur (Triggers validation in many frameworks)
//       f.dispatchEvent(new Event('change', { bubbles: true }));
//       f.blur(); 
//       f.focus(); // Re-focus to be safe

//       await sleep(600); 

//       const b = getByXpath(sData.otp_submit_xpath);
//       if (b) {
//         b.removeAttribute('disabled'); // Force enable if possible
//         b.click();
//       }
//       return;
//     }
//     await sleep(1000);
//   }
// }

// // --- REST OF THE CODE REMAINS THE SAME ---

// async function runSmartClickLoop(tabId, xpath) {
//     for (let i = 0; i < 15; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const element = getByXpath(targetXpath);
//                     if (!element) return false;
//                     const isDropdown = targetXpath.toLowerCase().includes('/select/option');
//                     if (isDropdown && element.tagName === 'OPTION') {
//                         const parentSelect = element.closest('select');
//                         if (parentSelect) {
//                             element.selected = true;
//                             parentSelect.value = element.value;
//                             parentSelect.dispatchEvent(new Event('input', { bubbles: true }));
//                             parentSelect.dispatchEvent(new Event('change', { bubbles: true }));
//                             return true;
//                         }
//                     }
//                     element.click();
//                     return true;
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
//     const rawData = event.data.trim();
//     if (!rawData || rawData === "ping") return;
//     let extractedCode = null;
//     let extractedLink = null;
//     try {
//         const parsed = JSON.parse(rawData);
//         if (parsed.type === "link") extractedLink = parsed.value;
//         else extractedCode = parsed.value;
//     } catch (e) {
//         const urlPattern = /(https?:\/\/[^\s]+)/g;
//         const urlMatch = rawData.match(urlPattern);
//         if (urlMatch) extractedLink = urlMatch[0];
//         else {
//             const codeMatch = rawData.match(/[A-Z0-9]{4,10}/i);
//             if (codeMatch) extractedCode = codeMatch[0];
//         }
//     }

//     if (extractedLink) {
//         chrome.tabs.update(tabId, { url: extractedLink });
//         cleanupStream(tabId, doneCallback);
//     } 
//     else if (extractedCode) {
//         chrome.scripting.executeScript({
//             target: { tabId: tabId },
//             func: injectOTPCodeHumanLike, // Calls the updated human-like function
//             args: [siteData, extractedCode]
//         });
//         cleanupStream(tabId, doneCallback);
//     }
//   };
//   es.onerror = () => cleanupStream(tabId, doneCallback, true);
// }

// function cleanupStream(tabId, callback, isError = false) {
//     if (activeStreams.has(tabId)) {
//         activeStreams.get(tabId).close();
//         activeStreams.delete(tabId);
//     }
//     if (callback) callback({status: isError ? "error" : "success"});
// }

// async function runDetectionLoop(tabId, xpath) {
//     for (let i = 0; i < 20; i++) {
//         try {
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tabId },
//                 func: (targetXpath) => {
//                     const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//                     const field = getByXpath(targetXpath);
//                     return !!(field && (field.offsetWidth > 0 || field.offsetHeight > 0 || field.offsetParent !== null));
//                 },
//                 args: [xpath]
//             });
//             if (results && results[0] && results[0].result) return true;
//         } catch (e) {}
//         await new Promise(r => setTimeout(r, 1000));
//     }
//     return false; 
// }

// async function performCredentialFill(sData) {
//   const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
//   const sleep = (ms) => new Promise(r => setTimeout(r, ms));
//   let u, p;
//   for (let i = 0; i < 15; i++) {
//     u = getByXpath(sData.username_xpath);
//     p = getByXpath(sData.password_xpath);
//     if (u && p) break;
//     await sleep(500);
//   }
//   if (u && p) {
//     u.focus(); u.value = sData.site_username;
//     u.dispatchEvent(new Event('input', { bubbles: true }));
//     u.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     p.focus(); p.value = sData.password;
//     p.dispatchEvent(new Event('input', { bubbles: true }));
//     p.dispatchEvent(new Event('change', { bubbles: true }));
//     await sleep(500);
//     const btn = getByXpath(sData.login_button_xpath);
//     if (btn) btn.click();
//   }
// }



















































// background.js

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

const activeStreams = new Map();
const tabStates = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startAutoLogin") {
    const siteData = message.data;
    const targetUrl = siteData.url.startsWith('http') ? siteData.url : 'https://' + siteData.url;
    
    chrome.tabs.create({ url: targetUrl, active: true }, (newTab) => {
      // Initialize state tracking for this specific tab
      tabStates.set(newTab.id, { 
        step: "init", 
        data: siteData, 
        doneCallback: sendResponse 
      });

      const mainNavigationListener = async (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          const state = tabStates.get(tabId);
          if (!state) return;

          // --- FLOW 1: USERNAME & NEXT ---
          if (state.step === "init" || state.step === "username") {
            console.log(`[Tab ${tabId}] Starting Username Phase`);
            const result = await chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: automationPhaseUsername,
              args: [state.data]
            });

            const status = result[0].result;
            if (status === "clicked_next") {
                state.step = "password"; // Wait for next 'complete' event
                console.log("[Phase 1] Next clicked. Waiting for reload...");
            } else {
                state.step = "password";
                // If no reload happened, trigger password phase manually
                setTimeout(() => mainNavigationListener(tabId, {status: 'complete'}), 500);
            }
          } 
          // --- FLOW 2: PASSWORD & LOGIN ---
          else if (state.step === "password") {
            console.log(`[Tab ${tabId}] Starting Password Phase`);
            const result = await chrome.scripting.executeScript({
              target: { tabId: tabId },
              func: automationPhasePassword,
              args: [state.data]
            });

            if (result[0].result === "success") {
                state.step = "2fa_selection";
                // Move to selection phase
                setTimeout(() => mainNavigationListener(tabId, {status: 'complete'}), 1000);
            }
          }
          // --- FLOW 3: 2FA SELECTION & STREAM ---
          else if (state.step === "2fa_selection") {
            console.log(`[Tab ${tabId}] Checking for 2FA Selection/Stream`);
            
            // Handle Optional Select/Confirm buttons
            if (state.data.select_2fa_xpath) {
                await runSmartClickLoop(tabId, state.data.select_2fa_xpath);
            }
            if (state.data.confirm_2fa_xpath) {
                await runSmartClickLoop(tabId, state.data.confirm_2fa_xpath);
            }

            // Check if OTP input eventually appears
            if (state.data.otp_xpath) {
                const is2FANeeded = await runDetectionLoop(tabId, state.data.otp_xpath);
                if (is2FANeeded) {
                    start2FAStream(tabId, state.data, state.doneCallback);
                } else {
                    state.doneCallback({status: "success"});
                    tabStates.delete(tabId);
                }
            } else {
                state.doneCallback({status: "success"});
                tabStates.delete(tabId);
            }
          }
        }
      };

      chrome.tabs.onUpdated.addListener(mainNavigationListener);
      chrome.tabs.onRemoved.addListener((id) => { if(id === newTab.id) { chrome.tabs.onUpdated.removeListener(mainNavigationListener); tabStates.delete(id); }});
    });
    return true; 
  }
});

// --- PHASE 1: USERNAME FUNCTION ---
async function automationPhaseUsername(sData) {
  const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const isVisible = (el) => !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0));

  let u = null;
  for (let i = 0; i < 40; i++) { // VPN Patient Wait
    u = getByXpath(sData.username_xpath);
    if (isVisible(u)) break;
    await sleep(1000);
  }
  if (!u) return "username_timeout";

  u.focus();
  u.value = sData.site_username;
  u.dispatchEvent(new Event('input', { bubbles: true }));
  u.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);

  const nextBtn = getByXpath(sData.username_next_button_xpath);
  if (nextBtn && isVisible(nextBtn)) {
    nextBtn.click();
    return "clicked_next";
  }
  return "no_next";
}

// --- PHASE 2: PASSWORD & AGREEMENT FUNCTION ---
async function automationPhasePassword(sData) {
  const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const isVisible = (el) => !!(el && (el.offsetWidth > 0 || el.offsetHeight > 0));

  let p = null;
  for (let i = 0; i < 40; i++) {
    p = getByXpath(sData.password_xpath);
    if (isVisible(p)) break;
    await sleep(1000);
  }
  if (!p) return "password_timeout";

  p.focus();
  p.value = sData.password;
  p.dispatchEvent(new Event('input', { bubbles: true }));
  p.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(500);

  // Optional Agreement Checkbox
  if (sData.agreement_checkbox_xpath) {
    const cb = getByXpath(sData.agreement_checkbox_xpath);
    if (cb) cb.click();
    await sleep(500);
  }

  const loginBtn = getByXpath(sData.login_button_xpath);
  if (loginBtn) {
    loginBtn.click();
    return "success";
  }
  return "login_btn_not_found";
}

// --- OTP HUMAN-LIKE INJECTION ---
async function injectOTPCodeHumanLike(sData, code) {
  const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  for (let i = 0; i < 20; i++) {
    const f = getByXpath(sData.otp_xpath);
    if (f && f.offsetWidth > 0) {
      f.focus();
      f.value = ""; 
      for (const char of code) {
        f.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
        f.value += char;
        f.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        await sleep(Math.floor(Math.random() * 70) + 30);
      }
      f.dispatchEvent(new Event('change', { bubbles: true }));
      f.blur();
      await sleep(600); 

      const b = getByXpath(sData.otp_submit_xpath);
      if (b) {
        b.removeAttribute('disabled'); // Ensure enabled
        b.click();
      }
      return;
    }
    await sleep(1000);
  }
}

// --- UTILITIES ---

async function runSmartClickLoop(tabId, xpath) {
    for (let i = 0; i < 10; i++) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (targetXpath) => {
                    const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    const el = getByXpath(targetXpath);
                    if (!el) return false;
                    // Handle Select/Option Case
                    if (targetXpath.toLowerCase().includes('/select/option') && el.tagName === 'OPTION') {
                        const ps = el.closest('select');
                        if (ps) {
                            el.selected = true;
                            ps.value = el.value;
                            ps.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                    el.click();
                    return true;
                },
                args: [xpath]
            });
            if (results && results[0] && results[0].result) return true;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 1000));
    }
}

async function runDetectionLoop(tabId, xpath) {
    for (let i = 0; i < 20; i++) {
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (targetXpath) => {
                    const getByXpath = (path) => document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    const f = getByXpath(targetXpath);
                    return !!(f && (f.offsetWidth > 0 || f.offsetHeight > 0));
                },
                args: [xpath]
            });
            if (results && results[0] && results[0].result) return true;
        } catch (e) {}
        await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

async function start2FAStream(tabId, siteData, doneCallback) {
  const storage = await chrome.storage.local.get('access');
  if (activeStreams.has(tabId)) activeStreams.get(tabId).close();
  const streamUrl = `http://172.172.172.72:8000/api/stream-2fa/?site_id=${siteData.site_id}&started_at=${siteData.server_time_ref}&token=${storage.access}`;
  const es = new EventSource(streamUrl);
  activeStreams.set(tabId, es);
  es.onmessage = (event) => {
    const raw = event.data.trim();
    if (!raw || raw === "ping") return;
    // Extract code or link
    let val = null;
    try { val = JSON.parse(raw).value; } 
    catch (e) { const m = raw.match(/[A-Z0-9]{4,10}/i); if(m) val = m[0]; }

    if (val) {
        chrome.scripting.executeScript({ target: { tabId: tabId }, func: injectOTPCodeHumanLike, args: [siteData, val] });
        es.close(); activeStreams.delete(tabId);
        if (doneCallback) doneCallback({status: "success"});
    }
  };
  es.onerror = () => { es.close(); activeStreams.delete(tabId); if (doneCallback) doneCallback({status: "error"}); };
}