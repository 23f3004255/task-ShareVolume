const DEFAULT_CIK = '0000769397';
const LOCAL_DATA = './data.json';

function getCIKFromQuery() {
  const params = new URLSearchParams(window.location.search);
  let cik = params.get('CIK');
  if (cik && /^\d{10}$/.test(cik.trim())) return cik.trim();
  return DEFAULT_CIK;
}

// Use this proxy for SEC data when CIK is not default
const SEC_API = cik => `https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/dei/EntityCommonStockSharesOutstanding.json`;
const CORS_PROXY = 'https://api.aipipe.ai/proxy/'; // Must be public and support JSON

function setLoading(loading, msg) {
  document.getElementById('loader').style.display = loading ? '' : 'none';
  if (loading && msg) {
    document.getElementById('loader').textContent = msg;
  }
  // hide stats when loading
  document.getElementById('stats-area').style.opacity = loading ? 0.32 : 1;
}

function updateStatsView(data) {
  // best guess entityName formatting
  let shortEntity = data.entityName;
  if (/[a-z]/.test(shortEntity) && /\([A-Z]{1,5}\)/.test(shortEntity)) {
    // seems ticker is already in name
  } else if (shortEntity.length < 55) {
    shortEntity = shortEntity.replace(/,? (Inc\.|LLC|Ltd\.|Corp\.|Corporation)$/, '') + '';
  }
  // Title & H1
  document.title = `${shortEntity} — Shares Outstanding Stats`;
  document.getElementById('share-entity-name').textContent = shortEntity;
  document.getElementById('share-max-value').textContent = data.max && data.max.val ? data.max.val.toLocaleString('en-US') : '—';
  document.getElementById('share-max-fy').textContent = data.max && data.max.fy ? data.max.fy : '—';
  document.getElementById('share-min-value').textContent = data.min && data.min.val ? data.min.val.toLocaleString('en-US') : '—';
  document.getElementById('share-min-fy').textContent = data.min && data.min.fy ? data.min.fy : '—';
}

function processSecJson(secJson) {
  // Expects: .entityName (string), .units.shares (array)
  const entityName = secJson.entityName || 'Unknown Entity';
  const sharesArr = (secJson.units && secJson.units.shares) ? secJson.units.shares : [];
  // Keep entries with fy > '2020' and number val
  const filtered = sharesArr.filter(e => {
    if (!e.fy || !e.val) return false;
    return String(e.fy) > '2020' && typeof e.val === 'number' && isFinite(e.val);
  });
  if (!filtered.length) {
    throw new Error('No share data for FY > 2020');
  }
  let max = filtered[0], min = filtered[0];
  for (let entry of filtered) {
    if (entry.val > max.val || (entry.val === max.val && String(entry.fy) > String(max.fy))) max = entry;
    if (entry.val < min.val || (entry.val === min.val && String(entry.fy) > String(min.fy))) min = entry;
  }
  return {
    entityName,
    max: { val: max.val, fy: String(max.fy) },
    min: { val: min.val, fy: String(min.fy) }
  };
}

async function fetchSecData(cik) {
  // Per SEC policy, set User-Agent
  const url = SEC_API(cik);
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'autodesk-shares-demo/1.0 (contact: opensource@autodesk.com)'
    }
  });
  if (!resp.ok) throw new Error('SEC API failed');
  return await resp.json();
}

async function fetchSecDataViaProxy(cik) {
  // Use AIPipe.ai as generic proxy to SEC API
  const secUrl = SEC_API(cik);
  const proxied = `${CORS_PROXY}?url=${encodeURIComponent(secUrl)}`;
  const resp = await fetch(proxied, {
    headers: {
      'User-Agent': 'autodesk-shares-demo/1.0 (contact: opensource@autodesk.com)'
    }
  });
  if (!resp.ok) throw new Error('Proxy fetch failed');
  return await resp.json();
}

async function loadDataAndRender() {
  const cik = getCIKFromQuery();
  let entityData = null;
  setLoading(true, 'Loading data…');
  document.getElementById('data-source').textContent = '';

  if (cik === DEFAULT_CIK) {
    // Use local data.json first for speed
    try {
      const resp = await fetch(LOCAL_DATA, {cache:'no-store'});
      if (!resp.ok) throw new Error('Local data.json failed');
      entityData = await resp.json();
      updateStatsView(entityData);
      setLoading(false);
      document.getElementById('data-source').innerHTML = `<a href="https://data.sec.gov/api/xbrl/companyconcept/CIK${DEFAULT_CIK}/dei/EntityCommonStockSharesOutstanding.json" target="_blank">SEC source</a>`;
      return;
    } catch(e) {
      // fallback
    }
    try {
      const secJson = await fetchSecData(cik);
      entityData = processSecJson(secJson);
      updateStatsView(entityData);
      setLoading(false);
      document.getElementById('data-source').innerHTML = `<a href="https://data.sec.gov/api/xbrl/companyconcept/CIK${DEFAULT_CIK}/dei/EntityCommonStockSharesOutstanding.json" target="_blank">SEC live</a>`;
    } catch (e) {
      setLoading(false);
      document.getElementById('share-entity-name').textContent = "Data unavailable";
      document.getElementById('share-max-value').textContent = document.getElementById('share-max-fy').textContent =
      document.getElementById('share-min-value').textContent = document.getElementById('share-min-fy').textContent = '—';
      document.getElementById('data-source').textContent = '';
    }
  } else {
    // Use proxy for other CIKs
    try {
      const secJson = await fetchSecDataViaProxy(cik);
      entityData = processSecJson(secJson);
      updateStatsView(entityData);
      setLoading(false);
      document.getElementById('data-source').innerHTML = `<a href="https://www.sec.gov/edgar/browse/?CIK=${cik}" target="_blank">SEC for ${cik}</a>`;
    } catch(e) {
      setLoading(false);
      document.getElementById('share-entity-name').textContent = "Data unavailable";
      document.getElementById('share-max-value').textContent = document.getElementById('share-max-fy').textContent =
      document.getElementById('share-min-value').textContent = document.getElementById('share-min-fy').textContent = '—';
      document.getElementById('data-source').textContent = '';
    }
  }
}

window.addEventListener('DOMContentLoaded', loadDataAndRender);