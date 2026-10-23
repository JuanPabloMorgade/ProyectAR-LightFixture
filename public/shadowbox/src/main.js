/**
 * Main entry: wires up tabs, initializes the geometry and designer modules.
 */

(function () {
  'use strict';

  const { t, setText } = I18n;
  let designer = null;

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.id === `tab-${name}`);
      });
      window.dispatchEvent(new Event('resize'));
      if (name === 'designer' && designer) designer.recompute();
    });
  });

  const geo = Geometry.init(document.getElementById('three-wrap'));

  const SLIDER_IDS = ['s-W','s-H','s-d','s-lightz','g-h','g-rlid','g-rays','d-R','d-margin'];

  function readState() {
    const v = {};
    SLIDER_IDS.forEach((id) => { v[id] = +document.getElementById(id).value; });
    return v;
  }

  function getGeoParams() {
    return {
      W: +document.getElementById('s-W').value,
      H: +document.getElementById('s-H').value,
      d: +document.getElementById('s-d').value,
      h: +document.getElementById('g-h').value,
      rlid: +document.getElementById('g-rlid').value,
      rays: +document.getElementById('g-rays').value,
      lightFrac: +document.getElementById('s-lightz').value / 100,
    };
  }

  function updateOutputs() {
    document.getElementById('s-W-out').textContent      = +document.getElementById('s-W').value;
    document.getElementById('s-H-out').textContent      = +document.getElementById('s-H').value;
    document.getElementById('s-d-out').textContent      = +document.getElementById('s-d').value;
    document.getElementById('s-lightz-out').textContent = +document.getElementById('s-lightz').value;
    document.getElementById('g-h-out').textContent      = +document.getElementById('g-h').value;
    document.getElementById('g-rlid-out').textContent   = +document.getElementById('g-rlid').value;
    document.getElementById('g-rays-out').textContent   = +document.getElementById('g-rays').value;
  }

  function rebuildGeo() {
    const p = getGeoParams();
    updateOutputs();
    geo.setTarget(0, 0, p.lightFrac * p.d);
    const masks = designer ? designer.getWallMasks() : null;
    geo.buildScene(p.W, p.H, p.d, p.h, p.rlid, p.rays, p.lightFrac, masks);
  }

  function rebuildAll() {
    if (designer) designer.recompute(); // updates masks, then notifies us via onWallMasksUpdated
    else rebuildGeo();
  }

  window.onWallMasksUpdated = () => rebuildGeo();

  ['g-h','g-rlid','g-rays'].forEach((id) => {
    document.getElementById(id).addEventListener('input', rebuildGeo);
  });
  ['s-W','s-H','s-d','s-lightz'].forEach((id) => {
    document.getElementById(id).addEventListener('input', rebuildAll);
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  document.getElementById('g-download-stl').addEventListener('click', () => {
    const masks = designer ? designer.getWallMasks() : null;
    if (!masks || !masks.top) {
      alert(t('error.noPattern'));
      return;
    }
    const p = getGeoParams();
    const thickness = +document.getElementById('g-thickness').value;
    if (!isFinite(thickness) || thickness <= 0) { alert(t('error.thickness')); return; }
    let stl;
    try {
      stl = STLExport.buildBoxSTL(masks, p.W, p.H, p.d, thickness);
    } catch (err) {
      console.error('STL build failed:', err);
      alert(t('error.stl'));
      return;
    }
    downloadBlob(new Blob([stl], { type: 'model/stl' }), 'shadowbox-box.stl');
  });

  document.getElementById('g-toggle-cutouts').addEventListener('click', () => {
    geo.setShowCutouts(!geo.isCutoutsVisible());
    rebuildGeo();
  });
  document.getElementById('g-toggle-lid').addEventListener('click', () => {
    geo.setShowLid(!geo.isLidVisible());
    rebuildGeo();
  });
  document.getElementById('g-reset-view').addEventListener('click', () => geo.resetView());

  rebuildGeo();

  designer = Designer.init({
    target:    document.getElementById('target'),
    sim:       document.getElementById('sim'),
    wallTop:   document.getElementById('wall-top'),
    wallBot:   document.getElementById('wall-bot'),
    wallLeft:  document.getElementById('wall-left'),
    wallRight: document.getElementById('wall-right'),
  });

  // Now that designer exists, refresh 3D so the initial scene picks up the masks.
  rebuildGeo();

  let currentDesignName = null;
  const currentNameEl = document.getElementById('current-design-name');
  function setCurrentName(name) {
    currentDesignName = name;
    if (name) {
      delete currentNameEl.dataset.i18n;
      delete currentNameEl.dataset.i18nParams;
      currentNameEl.textContent = name;
    } else {
      setText(currentNameEl, 'design.untitled');
    }
  }

  function buildPayload() {
    return {
      version: 1,
      sliders: readState(),
      targetImage: designer.getTargetImageDataURL(),
    };
  }

  async function applyPayload(payload) {
    if (payload && payload.sliders) {
      Object.entries(payload.sliders).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      });
    }
    if (payload && payload.targetImage) {
      try { await designer.loadTargetImageDataURL(payload.targetImage); }
      catch (_) { alert(t('error.designImage')); }
    }
    rebuildAll();
  }

  // ----- modal helpers -----

  const saveasModal  = document.getElementById('modal-saveas');
  const openModal    = document.getElementById('modal-open');
  const saveasName   = document.getElementById('saveas-name');
  const saveasError  = document.getElementById('saveas-error');
  const designListEl = document.getElementById('design-list');
  const designEmpty  = document.getElementById('design-list-empty');
  const openDataDir  = document.getElementById('open-data-dir');

  if (!DesignStorage.isDesktop) {
    setText(document.getElementById('save-location'), 'save.browserLocation');
  }

  function updateDesignDates() {
    designListEl.querySelectorAll('[data-mtime]').forEach((element) => {
      element.textContent = new Date(Number(element.dataset.mtime)).toLocaleString(I18n.getLocale());
    });
  }
  window.addEventListener('languagechange', updateDesignDates);

  function showSaveAs(initial) {
    saveasName.value = initial || currentDesignName || '';
    saveasError.hidden = true;
    saveasModal.hidden = false;
    setTimeout(() => saveasName.focus(), 0);
  }
  function hideSaveAs() { saveasModal.hidden = true; }

  async function showOpen() {
    try {
      await populateDesignList();
      openModal.hidden = false;
    } catch (err) {
      console.error('Could not list designs:', err);
      alert(t('error.list'));
    }
  }

  async function populateDesignList() {
    if (DesignStorage.isDesktop) {
      setText(openDataDir, 'open.folder', { path: await DesignStorage.dataDir() });
    } else {
      setText(openDataDir, 'open.browserStorage');
    }
    const items = await DesignStorage.list();
    designListEl.innerHTML = '';
    designEmpty.hidden = items.length > 0;
    items.forEach((it) => {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = it.name;
      const meta = document.createElement('span');
      meta.className = 'meta';
      if (it.mtimeMs) meta.dataset.mtime = it.mtimeMs;
      const del = document.createElement('button');
      del.className = 'delete';
      del.dataset.i18nTitle = 'action.delete';
      del.dataset.i18nAriaLabel = 'action.delete';
      del.title = t('action.delete');
      del.setAttribute('aria-label', t('action.delete'));
      del.textContent = '×';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(t('open.deleteConfirm', { name: it.name }))) return;
        try {
          await DesignStorage.remove(it.name);
          if (currentDesignName === it.name) setCurrentName(null);
          await showOpen();
        } catch (err) {
          console.error('Could not delete design:', err);
          alert(t('error.delete'));
        }
      });
      li.appendChild(name);
      li.appendChild(meta);
      li.appendChild(del);
      li.addEventListener('click', async () => {
        try {
          const text = await DesignStorage.read(it.name);
          const payload = JSON.parse(text);
          await applyPayload(payload);
          setCurrentName(it.name);
          hideOpen();
        } catch (err) {
          console.error('Could not open design:', err);
          alert(t('error.open'));
        }
      });
      designListEl.appendChild(li);
    });
    updateDesignDates();
  }
  function hideOpen() { openModal.hidden = true; }

  // ----- button wiring -----

  const saveToastEl = document.getElementById('save-toast');
  let saveToastTimer = null;
  function showSavedToast(name) {
    if (!saveToastEl) return;
    setText(saveToastEl, name ? 'save.savedName' : 'save.saved', { name });
    saveToastEl.hidden = false;
    if (saveToastTimer) clearTimeout(saveToastTimer);
    saveToastTimer = setTimeout(() => { saveToastEl.hidden = true; }, 5000);
  }

  document.getElementById('state-save').addEventListener('click', async () => {
    if (!currentDesignName) { showSaveAs(''); return; }
    const json = JSON.stringify(buildPayload(), null, 2);
    try {
      await DesignStorage.write(currentDesignName, json);
      showSavedToast(currentDesignName);
    } catch (err) {
      console.error('Save failed:', err);
      alert(t('error.save'));
    }
  });

  document.getElementById('state-saveas').addEventListener('click', () => showSaveAs());
  document.getElementById('state-open').addEventListener('click', () => showOpen());
  document.getElementById('state-reveal').addEventListener('click', async () => {
    try { await DesignStorage.reveal(); }
    catch (err) {
      console.error('Could not open data folder:', err);
      alert(t('error.reveal'));
    }
  });

  document.getElementById('saveas-cancel').addEventListener('click', hideSaveAs);
  document.getElementById('open-cancel').addEventListener('click', hideOpen);

  async function confirmSaveAs() {
    const raw = saveasName.value.trim();
    if (!raw) {
      setText(saveasError, 'save.nameRequired');
      saveasError.hidden = false;
      return;
    }
    const name = raw.endsWith('.json') ? raw : raw + '.json';
    try {
      if (await DesignStorage.exists(name) && name !== currentDesignName) {
        if (!confirm(t('save.overwrite', { name }))) return;
      }
      const json = JSON.stringify(buildPayload(), null, 2);
      const result = await DesignStorage.write(name, json);
      setCurrentName(result.name || name);
      hideSaveAs();
      showSavedToast(result.name || name);
    } catch (err) {
      console.error('Save failed:', err);
      setText(saveasError, 'error.save');
      saveasError.hidden = false;
    }
  }

  document.getElementById('saveas-confirm').addEventListener('click', confirmSaveAs);
  saveasName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmSaveAs(); }
    if (e.key === 'Escape') { e.preventDefault(); hideSaveAs(); }
  });
  [saveasModal, openModal].forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) m.hidden = true; });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { saveasModal.hidden = true; openModal.hidden = true; }
  });

  setCurrentName(null);
})();
