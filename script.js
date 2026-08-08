const fmtINR = v => {
    const n = Math.round(v);
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L';
    return '₹' + n.toLocaleString('en-IN');
  };

  function calcEMI(P, annualRate, years) {
    const r = annualRate / 100 / 12;
    const n = years * 12;
    if (r === 0) return P / n;
    return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  }

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function buildData(P, annualRate, years, startYear) {
    const r = annualRate / 100 / 12;
    const emi = calcEMI(P, annualRate, years);
    const totalPayment = emi * years * 12;
    const labels = [], principalPaid = [], interestPaid = [], balance = [], rows = [];
    const baseYear = startYear || new Date().getFullYear();
    let bal = P;
    let cumPaid = 0;
    for (let y = 1; y <= years; y++) {
      let yp = 0, yi = 0;
      const months = [];
      for (let m = 0; m < 12; m++) {
        const ip = bal * r;
        const pp = Math.min(emi - ip, bal);
        yi += ip; yp += pp;
        bal = Math.max(0, bal - pp);
        months.push({
          label: monthNames[m] + ' ' + (baseYear + y - 1),
          ip, pp, total: ip + pp, bal
        });
        if (bal <= 0) break;
      }
      cumPaid += (yp + yi);
      labels.push('Yr ' + y);
      principalPaid.push(Math.round(yp));
      interestPaid.push(Math.round(yi));
      balance.push(Math.round(bal));
      rows.push({
        y, calYear: baseYear + y - 1, emi: emi * 12, yp, yi, bal: Math.round(bal),
        paidPct: Math.min(100, cumPaid / totalPayment * 100),
        months
      });
      if (bal <= 0) break;
    }
    return {
      labels, principalPaid, interestPaid, balance, emi, rows,
      totalPayment, totalInterest: totalPayment - P, principal: P, rate: annualRate, years
    };
  }

  let currentData = null;

  function render(P, rate, years) {
    const d = buildData(P, rate, years);
    currentData = d;

    document.getElementById('s-emi').textContent      = fmtINR(d.emi);
    document.getElementById('s-total').textContent    = fmtINR(d.totalPayment);
    document.getElementById('s-interest').textContent = fmtINR(d.totalInterest);

    myChart.data.labels = d.labels;
    myChart.data.datasets[0].data = d.interestPaid;
    myChart.data.datasets[1].data = d.principalPaid;
    myChart.data.datasets[2].data = d.balance;
    myChart.update('none');

    breakupChart.data.datasets[0].data = [Math.round(d.principal), Math.round(d.totalInterest)];
    breakupChart.update('none');

    const tbody = document.getElementById('table-body');
    tbody.innerHTML = d.rows.map((r, i) => `
      <tr class="year-row" data-yr="${i}" onclick="toggleYear(${i})">
        <td><span class="yr-toggle">+</span>${r.calYear}</td>
        <td class="td-principal">${fmtINR(r.yp)}</td>
        <td class="td-interest">${fmtINR(r.yi)}</td>
        <td class="td-total">${fmtINR(r.yp + r.yi)}</td>
        <td class="td-balance">${fmtINR(r.bal)}</td>
        <td class="td-paid">${r.paidPct.toFixed(2)}%</td>
      </tr>
      <tr class="month-rows" data-forYr="${i}" style="display:none;"><td colspan="6" style="padding:0;">
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
          ${r.months.map(mo => `
            <tr class="month-row">
              <td>${mo.label}</td>
              <td class="td-principal">${fmtINR(mo.pp)}</td>
              <td class="td-interest">${fmtINR(mo.ip)}</td>
              <td class="td-total">${fmtINR(mo.total)}</td>
              <td class="td-balance">${fmtINR(mo.bal)}</td>
              <td></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </td></tr>`).join('');
  }

  function toggleYear(i) {
    const yearRow  = document.querySelector('tr.year-row[data-yr="' + i + '"]');
    const monthRow = document.querySelector('tr.month-rows[data-forYr="' + i + '"]');
    const open = monthRow.style.display !== 'none';
    monthRow.style.display = open ? 'none' : 'table-row';
    yearRow.classList.toggle('open', !open);
  }

  function applyManual() {
    const P     = parseFloat(document.getElementById('m-loan').value)   || 1000000;
    const rate  = parseFloat(document.getElementById('m-rate').value)   || 8.5;
    const years = parseInt(document.getElementById('m-tenure').value)   || 10;

    document.getElementById('loan').value   = Math.min(Math.max(P, 50000), 10000000);
    document.getElementById('rate').value   = Math.min(Math.max(rate, 1), 24);
    document.getElementById('tenure').value = Math.min(Math.max(years, 1), 30);
    document.getElementById('v-loan').textContent   = fmtINR(P);
    document.getElementById('v-rate').textContent   = rate.toFixed(1) + '%';
    document.getElementById('v-tenure').textContent = years + ' yrs';
    render(P, rate, years);
  }

  function showTab(t) {
    document.getElementById('view-chart').style.display = t === 'chart' ? 'block' : 'none';
    document.getElementById('view-table').style.display = t === 'table' ? 'block' : 'none';
    document.getElementById('tab-chart').className = 'tab' + (t === 'chart' ? ' active' : '');
    document.getElementById('tab-table').className = 'tab' + (t === 'table' ? ' active' : '');
  }

  const d0 = buildData(1000000, 8.5, 10);

  const myChart = new Chart(document.getElementById('loanChart'), {
    type: 'bar',
    data: {
      labels: d0.labels,
      datasets: [
        { label: 'Interest',   data: d0.interestPaid,  backgroundColor: '#D85A30', stack: 'a', borderRadius: 2, borderSkipped: false },
        { label: 'Principal',  data: d0.principalPaid, backgroundColor: '#888780', stack: 'a', borderRadius: 2, borderSkipped: false },
        { label: 'Balance',    data: d0.balance, type: 'line', borderColor: '#1D9E75', borderWidth: 2,
          borderDash: [5, 4], pointRadius: 0, fill: false, yAxisID: 'y2' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + fmtINR(ctx.raw) } }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { maxTicksLimit: 15, color: '#888', font: { size: 11 } },
          grid: { display: false }
        },
        y: {
          stacked: true,
          ticks: {
            callback: v => v >= 1e7 ? '₹'+(v/1e7).toFixed(1)+'Cr' : v >= 1e5 ? '₹'+(v/1e5).toFixed(0)+'L' : '₹'+v,
            color: '#888', font: { size: 11 }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y2: {
          position: 'right',
          ticks: {
            callback: v => v >= 1e7 ? '₹'+(v/1e7).toFixed(1)+'Cr' : v >= 1e5 ? '₹'+(v/1e5).toFixed(0)+'L' : '₹'+v,
            color: '#1D9E75', font: { size: 11 }
          },
          grid: { display: false }
        }
      }
    }
  });

  const breakupChart = new Chart(document.getElementById('breakupChart'), {
    type: 'doughnut',
    data: {
      labels: ['Principal Loan Amount', 'Total Interest'],
      datasets: [{
        data: [1000000, 596272],
        backgroundColor: ['#8CB93C', '#E8912D'],
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + ctx.label + ': ' + fmtINR(ctx.raw) } },
        datalabels: undefined
      }
    },
    plugins: [{
      id: 'centerPct',
      afterDraw(chart) {
        const { ctx, chartArea: { width, height, left, top } } = chart;
        const ds = chart.data.datasets[0].data;
        const total = ds[0] + ds[1];
        if (!total) return;
        ctx.save();
        ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const meta = chart.getDatasetMeta(0);
        meta.data.forEach((arc, i) => {
          const pct = (ds[i] / total * 100).toFixed(1) + '%';
          const pos = arc.tooltipPosition();
          ctx.fillText(pct, pos.x, pos.y);
        });
        ctx.restore();
      }
    }]
  });

  render(1000000, 8.5, 10);

  ['loan', 'rate', 'tenure'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const P     = +document.getElementById('loan').value;
      const rate  = +document.getElementById('rate').value;
      const years = +document.getElementById('tenure').value;
      document.getElementById('v-loan').textContent   = fmtINR(P);
      document.getElementById('v-rate').textContent   = rate.toFixed(1) + '%';
      document.getElementById('v-tenure').textContent = years + ' yrs';
      document.getElementById('m-loan').value   = P;
      document.getElementById('m-rate').value   = rate;
      document.getElementById('m-tenure').value = years;
      render(P, rate, years);
    });
  });

  ['m-loan', 'm-rate', 'm-tenure'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => {
      if (e.key === 'Enter') applyManual();
    });
  });

  const loanTypeDefaults = {
    all:            { rate: 8.5,  tenure: 10, amount: 1000000, label: '' },
    personal:       { rate: 13.0, tenure: 5,  amount: 300000,  label: '' },
    home:           { rate: 8.5,  tenure: 20, amount: 5000000, label: '' },
    business:       { rate: 14.0, tenure: 7,  amount: 1000000, label: '' },
    vehicle:        { rate: 9.5,  tenure: 5,  amount: 700000,  label: '' },
    selfemployment: { rate: 12.0, tenure: 7,  amount: 500000,  label: '' },
    gold:           { rate: 9.0,  tenure: 2,  amount: 200000,  label: '' },
  };

  function selectLoanType(btn, type) {
    document.querySelectorAll('.ltype-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const info = document.getElementById('loan-type-info');
    const d = loanTypeDefaults[type];
    if (d.label) {
      info.textContent = d.label;
    } else {
      info.textContent = '';
    }
    // Auto-fill inputs with typical values
    document.getElementById('m-loan').value   = d.amount;
    document.getElementById('m-rate').value   = d.rate;
    document.getElementById('m-tenure').value = d.tenure;
    applyManual();
  }


  // ---------- Prefill from a shared link ----------
  (function initFromURL() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('loan') || params.has('rate') || params.has('tenure')) {
      const P     = parseFloat(params.get('loan'))   || 1000000;
      const rate  = parseFloat(params.get('rate'))   || 8.5;
      const years = parseInt(params.get('tenure'))   || 10;
      document.getElementById('m-loan').value   = P;
      document.getElementById('m-rate').value   = rate;
      document.getElementById('m-tenure').value = years;
      applyManual();
    }
  })();
