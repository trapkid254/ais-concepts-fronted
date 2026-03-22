(function (global) {
  function checkRules(p) {
    p = p || '';
    return {
      len: p.length >= 8 && p.length <= 16,
      lower: /[a-z]/.test(p),
      upper: /[A-Z]/.test(p),
      digit: /[0-9]/.test(p),
      special: /[^A-Za-z0-9]/.test(p)
    };
  }

  function allMet(p) {
    var r = checkRules(p);
    return r.len && r.lower && r.upper && r.digit && r.special;
  }

  function updateMeter(meterEl, p) {
    if (!meterEl) return;
    var r = checkRules(p);
    var items = meterEl.querySelectorAll('[data-rule]');
    items.forEach(function (el) {
      var key = el.getAttribute('data-rule');
      var ok = r[key];
      el.classList.toggle('met', !!ok);
    });
  }

  function bindToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', function () {
      var isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
      var i = btn.querySelector('i');
      if (i) {
        i.className = isPw ? 'fas fa-eye-slash' : 'fas fa-eye';
      }
    });
  }

  global.AisPassword = {
    checkRules: checkRules,
    allMet: allMet,
    updateMeter: updateMeter,
    bindToggle: bindToggle
  };
})(typeof window !== 'undefined' ? window : this);
