/* DryCamping.com — browser-only planning tools. No input data is transmitted. */
(() => {
  'use strict';
  const finite = (v, min, max, name) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
      throw new Error(name + ' must be between ' + min + ' and ' + max + '.');
    }
    return v;
  };
  const battery = (p) => {
    const capacity = finite(p.capacity, 1, 100000, 'Battery capacity');
    const voltage = finite(p.voltage, 1, 1000, 'Bank voltage');
    const usable = finite(p.usable, 1, 100, 'Usable capacity');
    const daily = finite(p.daily, 1, 1000000, 'Daily energy used');
    const solar = finite(p.solar, 0, 1000000, 'Daily solar energy');
    const energy = capacity * voltage * usable / 100;
    const deficit = daily - solar;
    return { usableWh: energy, netWhPerDay: deficit, days: deficit > 0 ? energy / deficit : null, dailyBalanceCovered: deficit <= 0 };
  };
  const water = (p) => {
    const fresh = finite(p.fresh, 0, 10000, 'Fresh water');
    const reserve = finite(p.reserve, 0, 10000, 'Water reserve');
    const people = finite(p.people, 1, 100, 'People');
    if (!Number.isInteger(people)) throw new Error('Enter a whole number of people.');
    if (reserve > fresh) throw new Error('The water reserve cannot exceed the water onboard.');
    const use = finite(p.use, 0.1, 1000, 'Daily use per person');
    const gray = finite(p.gray, 0, 10000, 'Gray tank space');
    const grayuse = finite(p.grayuse, 0, 10000, 'Daily gray inflow');
    const black = finite(p.black, 0, 10000, 'Black tank space');
    const blackuse = finite(p.blackuse, 0, 10000, 'Daily black inflow');
    const freshDays = (fresh - reserve) / (people * use);
    const grayDays = grayuse > 0 ? gray / grayuse : null;
    const blackDays = blackuse > 0 ? black / blackuse : null;
    const options = [['Fresh water', freshDays], ['Gray tank', grayDays], ['Black tank', blackDays]].filter(([, v]) => v !== null);
    const days = Math.min(...options.map(([, v]) => v));
    const limiting = options.filter(([, v]) => Math.abs(v - days) < 1e-8).map(([name]) => name);
    return { days, freshDays, grayDays, blackDays, limiting, freshGallonsPerDay: people * use };
  };
  const solar = (p) => {
    const energy = finite(p.energy, 1, 1000000, 'Daily battery energy');
    const sun = finite(p.sun, 0.1, 12, 'Peak sun hours');
    const efficiency = finite(p.efficiency, 1, 100, 'Delivery factor');
    const margin = finite(p.margin, 0, 200, 'Planning margin');
    const targetWh = energy * (1 + margin / 100);
    const exactWatts = targetWh / (sun * efficiency / 100);
    const panelWatts = Math.ceil(exactWatts / 50) * 50;
    return { panelWatts, exactWatts, targetWh, estimatedWhPerDay: panelWatts * sun * efficiency / 100 };
  };
  const calculations = { battery, water, solar };
  window.DryCamping = Object.freeze(calculations);
  const fmt = (n, places = 0) => n.toLocaleString('en-US', { maximumFractionDigits: places });
  const daysText = (n) => n === null ? 'No modeled inflow' : n > 0 && n < 0.1 ? '< 0.1 days' : fmt(n, 1) + ' days';
  const calcForm = document.getElementById('calculator');
  if (calcForm) {
    const kind = calcForm.dataset.calculator;
    const valueNode = document.getElementById('result-value');
    const unitNode = document.getElementById('result-unit');
    const labelNode = document.getElementById('result-label');
    const detailsNode = document.getElementById('result-details');
    const noteNode = document.getElementById('result-note');
    const errorNode = document.getElementById('validation');
    const fields = [...calcForm.querySelectorAll('input[name]')];
    const read = () => Object.fromEntries(fields.map(i => [i.name, i.value.trim() === '' ? NaN : Number(i.value)]));
    const detail = (label, value) => {
      const row = document.createElement('div');
      const l = document.createElement('span'); l.textContent = label;
      const v = document.createElement('strong'); v.textContent = value;
      row.append(l, v); detailsNode.append(row);
    };
    const render = () => {
      try {
        const result = calculations[kind](read());
        detailsNode.replaceChildren(); errorNode.textContent = '';
        valueNode.classList.remove('long');
        if (kind === 'battery') {
          labelNode.textContent = 'Estimated battery runtime';
          valueNode.textContent = result.dailyBalanceCovered ? 'Balanced' : result.days < 0.1 ? '< 0.1' : fmt(result.days, 1);
          valueNode.classList.toggle('long', result.dailyBalanceCovered || result.days > 10000);
          unitNode.textContent = result.dailyBalanceCovered ? 'solar covers modeled daily use' : 'days to your chosen discharge limit';
          detail('Usable battery energy', fmt(result.usableWh) + ' Wh');
          detail('Daily energy deficit', fmt(Math.max(0, result.netWhPerDay)) + ' Wh');
          if (!result.dailyBalanceCovered) detail('Equivalent runtime', fmt(result.days * 24, 1) + ' hours');
          noteNode.textContent = result.dailyBalanceCovered ? 'Daily balance is not unlimited runtime. Verify overnight storage, peak loads, and a backup plan for low-sun days.' : 'Assumes a full starting charge and average daily use. Keep a reserve and verify actual performance with your battery monitor.';
        } else if (kind === 'water') {
          labelNode.textContent = 'First limit: ' + result.limiting.join(' + ');
          valueNode.textContent = result.days > 0 && result.days < 0.1 ? '< 0.1' : fmt(result.days, 1);
          valueNode.classList.toggle('long', result.days > 10000);
          unitNode.textContent = 'days before the first resource limit';
          detail('Fresh water', daysText(result.freshDays));
          detail('Gray tank space', daysText(result.grayDays));
          detail('Black tank space', daysText(result.blackDays));
          noteNode.textContent = 'An estimate, not a target to exhaust. Leave time to refill or reach an approved dump station; allow for uncertain tank readings.';
        } else {
          labelNode.textContent = 'Estimated solar array';
          valueNode.textContent = fmt(result.panelWatts);
          valueNode.classList.toggle('long', result.panelWatts > 10000);
          unitNode.textContent = 'watts of panels, rounded up to 50 W';
          detail('Daily target with margin', fmt(result.targetWh) + ' Wh');
          detail('Unrounded panel estimate', fmt(result.exactWatts, 1) + ' W');
          detail('Modeled daily delivery', fmt(result.estimatedWhPerDay) + ' Wh');
          noteNode.textContent = 'A daily energy estimate—not a complete electrical design. Check low-sun conditions, battery storage, controller ratings, and installation requirements.';
        }
        return result;
      } catch (err) {
        errorNode.textContent = err.message;
        labelNode.textContent = 'Check your inputs';
        valueNode.textContent = '—'; unitNode.textContent = 'enter valid values to see an estimate';
        noteNode.textContent = 'The estimate will update when all inputs are valid.';
        detailsNode.replaceChildren();
        return null;
      }
    };
    calcForm.addEventListener('input', render);
    calcForm.addEventListener('submit', (event) => { event.preventDefault(); render(); });
    calcForm.addEventListener('reset', () => { setTimeout(render, 0); });
    render();
    const context = document.modelContext;
    if (context?.registerTool) {
      const lifecycle = new AbortController();
      const properties = Object.fromEntries(fields.map(f => [f.name, {type: f.step === '1' ? 'integer' : 'number', minimum: Number(f.min), maximum: Number(f.max), description: f.labels[0].textContent}]));
      try {
        Promise.resolve(context.registerTool({
          name: 'calculate_rv_' + kind,
          title: 'Calculate RV ' + kind,
          description: 'Calculate the RV ' + kind + ' planning estimate and update the visible form and result. All inputs are required; no data is sent to a server.',
          inputSchema: {type:'object', properties, required:fields.map(f => f.name), additionalProperties:false},
          annotations: {readOnlyHint:false, untrustedContentHint:false},
          execute(input) {
            if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k => !Object.hasOwn(properties, k))) throw new Error('Provide only the documented numeric inputs.');
            calculations[kind](input);
            fields.forEach(f => { f.value = String(input[f.name]); });
            return render();
          }
        }, {signal:lifecycle.signal})).catch(() => {});
        window.addEventListener('pagehide', () => lifecycle.abort(), {once:true});
      } catch (_) { /* Optional API; the visible calculator stays fully functional. */ }
    }
  }
  const checks = [...document.querySelectorAll('[data-check]')];
  if (checks.length) {
    const key = 'drycamping-checklist-v1';
    const progress = document.getElementById('check-progress');
    const update = () => { progress.textContent = checks.filter(c => c.checked).length + ' of ' + checks.length + ' checked'; };
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(saved)) checks.forEach(c => { c.checked = saved.includes(c.dataset.check); });
    } catch (_) {
      document.getElementById('save-notice').textContent = 'Progress cannot be saved in this browser. Print a copy to keep your checklist.';
    }
    checks.forEach(c => c.addEventListener('change', () => {
      update();
      try { localStorage.setItem(key, JSON.stringify(checks.filter(c => c.checked).map(c => c.dataset.check))); }
      catch (_) { document.getElementById('save-notice').textContent = 'Progress cannot be saved in this browser. Print a copy to keep your checklist.'; }
    }));
    document.getElementById('reset-checklist').addEventListener('click', () => {
      checks.forEach(c => { c.checked = false; });
      try { localStorage.removeItem(key); } catch (_) {}
      update();
    });
    document.getElementById('print-checklist').addEventListener('click', () => window.print());
    update();
  }
})();
