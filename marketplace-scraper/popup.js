const DEFAULT_API_BASE = "https://marketplace-system-lf78.onrender.com";
const DEFAULT_DEALER_SLUG = "hummel-auto-sales";
const DEFAULT_DEALER_KEY = "hummel-auto-sales-0t4aNS8VxMyIkjSmGQQSkMzf";

let autoEnabled = true;

const apiBaseInput = document.getElementById("api-base-input");
const dealerSlugInput = document.getElementById("dealer-slug-input");
const dealerKeyInput = document.getElementById("dealer-key-input");
const facebookProfileInput = document.getElementById("facebook-profile-input");
const output = document.getElementById("output");

function cleanBaseUrl(value) {
  return (value || DEFAULT_API_BASE).trim().replace(/\/+$/, "");
}

async function getDealerSettings() {
  const saved = await chrome.storage.local.get(["apiBase", "dealerSlug", "dealerKey", "facebookProfileUrl"]);
  return {
    apiBase: cleanBaseUrl(saved.apiBase || DEFAULT_API_BASE),
    dealerSlug: (saved.dealerSlug || DEFAULT_DEALER_SLUG).trim(),
    dealerKey: (saved.dealerKey || DEFAULT_DEALER_KEY).trim(),
    facebookProfileUrl: (saved.facebookProfileUrl || "").trim(),
  };
}

async function loadSettingsForm() {
  const settings = await getDealerSettings();
  apiBaseInput.value = settings.apiBase;
  dealerSlugInput.value = settings.dealerSlug;
  dealerKeyInput.value = settings.dealerKey;
  facebookProfileInput.value = settings.facebookProfileUrl;
  const configuredLabel = document.getElementById("configured-label");
  if (configuredLabel) {
    configuredLabel.innerText = `Connected to ${settings.dealerSlug}. Auto scan runs every 30 minutes.${settings.facebookProfileUrl ? " Facebook profile saved." : ""}`;
  }
}

async function saveSettingsForm() {
  await chrome.storage.local.set({
    apiBase: cleanBaseUrl(apiBaseInput.value),
    dealerSlug: dealerSlugInput.value.trim(),
    dealerKey: dealerKeyInput.value.trim(),
    facebookProfileUrl: facebookProfileInput.value.trim(),
  });
}

function renderResult(result, fallback) {
  output.innerText = (result && result.message) || fallback;
}

function refreshAutoStatus() {
  chrome.runtime.sendMessage({ type: "NUC_AUTO_STATUS" }, (status) => {
    if (chrome.runtime.lastError || !status) return;
    autoEnabled = status.enabled !== false;
    document.getElementById("auto-button").innerText = autoEnabled ? "Auto Scan: On" : "Auto Scan: Off";
    const last = status.last;
    if (last && last.message) {
      output.innerText = `${last.message}\n${new Date(last.at).toLocaleString()}`;
    }
  });
}

[apiBaseInput, dealerSlugInput, dealerKeyInput, facebookProfileInput].forEach((input) => {
  input.addEventListener("change", saveSettingsForm);
  input.addEventListener("blur", saveSettingsForm);
});

document.getElementById("sync-button").addEventListener("click", async () => {
  await saveSettingsForm();
  output.innerText = "Capturing raw listing page for backend parsing...";
  chrome.runtime.sendMessage({ type: "NUC_CAPTURE_CURRENT_PUPPET" }, (result) => {
    if (chrome.runtime.lastError) {
      output.innerText = "Puppet capture failed to start.";
      return;
    }
    renderResult(result, "Puppet capture finished.");
  });
});

document.getElementById("auto-button").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "NUC_SET_AUTO", enabled: !autoEnabled }, () => {
    refreshAutoStatus();
  });
});

document.getElementById("run-auto-button").addEventListener("click", async () => {
  await saveSettingsForm();
  output.innerText = "Scanning profile, syncing inventory, then enriching missing details...";
  chrome.runtime.sendMessage({ type: "NUC_RUN_AUTO_NOW" }, (result) => {
    if (chrome.runtime.lastError) {
      output.innerText = "Auto scan failed to start.";
      return;
    }
    renderResult(result, "Auto scan finished.");
    refreshAutoStatus();
  });
});

document.getElementById("scan-profile-button").addEventListener("click", async () => {
  await saveSettingsForm();
  output.innerText = "Scanning saved Facebook profile, importing listings, then enriching missing details...";
  chrome.runtime.sendMessage({ type: "NUC_SCAN_PROFILE_NOW" }, (result) => {
    if (chrome.runtime.lastError) {
      output.innerText = "Profile scan failed to start.";
      return;
    }
    renderResult(result, "Profile scan finished.");
    refreshAutoStatus();
  });
});

document.getElementById("stop-button").addEventListener("click", () => {
  output.innerText = "Stopping current scan...";
  chrome.runtime.sendMessage({ type: "NUC_STOP_AUTO" }, (result) => {
    if (chrome.runtime.lastError) {
      output.innerText = "Stop request failed.";
      return;
    }
    renderResult(result, "Stop requested.");
    refreshAutoStatus();
  });
});

loadSettingsForm();
refreshAutoStatus();
