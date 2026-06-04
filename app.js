(function () {
  const STORAGE_KEY = 'mesrevenus_data';
  const THEME_KEY = 'mesrevenus_theme';

  let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  let selectedCategory = 'salary';
  let activeFilter = 'week';
  let viewMonth = new Date();
  let barChart, lineChart;

  // Theme — noir par défaut (style Trade Republic), bascule possible en clair
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') {
    document.body.classList.add('light');
  }

  document.getElementById('themeBtn').addEventListener('click', function () {
    document.body.classList.toggle('light');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
    updateCharts();
  });

  // Default date to today
  document.getElementById('entryDate').valueAsDate = new Date();

  // Category toggle
  document.getElementById('catSalary').addEventListener('click', function () {
    selectedCategory = 'salary';
    this.classList.add('active-salary');
    document.getElementById('catTips').classList.remove('active-tips');
  });
  document.getElementById('catTips').addEventListener('click', function () {
    selectedCategory = 'tips';
    this.classList.add('active-tips');
    document.getElementById('catSalary').classList.remove('active-salary');
  });

  // Form submit
  document.getElementById('entryForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var date = document.getElementById('entryDate').value;
    var amount = parseFloat(document.getElementById('entryAmount').value);
    if (!date || isNaN(amount) || amount <= 0) return;

    entries.push({ id: Date.now(), date: date, amount: amount, category: selectedCategory });
    entries.sort(function (a, b) { return b.date.localeCompare(a.date); });
    save();
    document.getElementById('entryAmount').value = '';
    document.getElementById('entryDate').valueAsDate = new Date();
    showToast('Revenu ajouté !');
    render();
  });

  // Filters
  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      activeFilter = this.dataset.filter;
      document.getElementById('monthNav').style.display = activeFilter === 'month' ? 'flex' : 'none';
      render();
    });
  });

  // Month nav
  document.getElementById('prevMonth').addEventListener('click', function () {
    viewMonth.setMonth(viewMonth.getMonth() - 1);
    render();
  });
  document.getElementById('nextMonth').addEventListener('click', function () {
    viewMonth.setMonth(viewMonth.getMonth() + 1);
    render();
  });

  // Delete
  document.getElementById('entriesBody').addEventListener('click', function (e) {
    var btn = e.target.closest('.delete-btn');
    if (!btn) return;
    var id = parseInt(btn.dataset.id);
    entries = entries.filter(function (en) { return en.id !== id; });
    save();
    render();
    showToast('Entrée supprimée');
  });

  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', function () {
    if (entries.length === 0) { showToast('Aucune donnée à exporter'); return; }
    var csv = 'Date,Catégorie,Montant\n';
    entries.forEach(function (en) {
      csv += en.date + ',' + (en.category === 'salary' ? 'Salaire' : 'Tips') + ',' + en.amount.toFixed(2) + '\n';
    });
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'mes-revenus-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exporté !');
  });

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2000);
  }

  function getFilteredEntries() {
    var now = new Date();
    if (activeFilter === 'week') {
      var day = now.getDay();
      var diff = day === 0 ? 6 : day - 1;
      var monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);
      var mondayStr = monday.toISOString().slice(0, 10);
      var sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      var sundayStr = sunday.toISOString().slice(0, 10);
      return entries.filter(function (e) { return e.date >= mondayStr && e.date <= sundayStr; });
    }
    if (activeFilter === 'month') {
      var y = viewMonth.getFullYear();
      var m = String(viewMonth.getMonth() + 1).padStart(2, '0');
      var prefix = y + '-' + m;
      return entries.filter(function (e) { return e.date.startsWith(prefix); });
    }
    return entries.slice();
  }

  function formatDate(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function formatMoney(n) {
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '€';
  }

  var monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  function render() {
    var filtered = getFilteredEntries();

    // Month label
    document.getElementById('monthLabel').textContent = monthNames[viewMonth.getMonth()] + ' ' + viewMonth.getFullYear();

    // Stats
    var salarySum = 0, tipsSum = 0;
    filtered.forEach(function (e) {
      if (e.category === 'salary') salarySum += e.amount;
      else tipsSum += e.amount;
    });
    document.getElementById('statSalary').textContent = formatMoney(salarySum);
    document.getElementById('statTips').textContent = formatMoney(tipsSum);
    document.getElementById('statTotal').textContent = formatMoney(salarySum + tipsSum);

    // Sous-titre hero : période + nombre d'entrées
    var periodLabel = activeFilter === 'week' ? 'cette semaine'
      : activeFilter === 'month' ? monthNames[viewMonth.getMonth()].toLowerCase() + ' ' + viewMonth.getFullYear()
      : 'toutes périodes';
    var n = filtered.length;
    document.getElementById('heroSub').textContent = n + ' entrée' + (n > 1 ? 's' : '') + ' · ' + periodLabel;

    // Table
    var tbody = document.getElementById('entriesBody');
    var empty = document.getElementById('emptyState');
    if (filtered.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'block';
      document.getElementById('entriesTable').style.display = 'none';
    } else {
      empty.style.display = 'none';
      document.getElementById('entriesTable').style.display = 'table';
      tbody.innerHTML = filtered.map(function (e) {
        var badgeClass = e.category === 'salary' ? 'badge-salary' : 'badge-tips';
        var catLabel = e.category === 'salary' ? 'Salaire' : 'Tips';
        return '<tr>' +
          '<td>' + formatDate(e.date) + '</td>' +
          '<td><span class="badge ' + badgeClass + '"><span class="swatch"></span>' + catLabel + '</span></td>' +
          '<td class="td-amount">' + e.amount.toFixed(2).replace('.', ',') + '€</td>' +
          '<td><button class="delete-btn" data-id="' + e.id + '" aria-label="Supprimer">&#x2715;</button></td>' +
          '</tr>';
      }).join('');
    }

    updateCharts(filtered);
  }

  function getChartColors() {
    var isDark = !document.body.classList.contains('light');
    return {
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      tick: isDark ? '#86868b' : '#86868b',
      salary: isDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.85)',
      tips: '#2f6bff',
      line: isDark ? '#ffffff' : '#000000',
      lineFill: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
    };
  }

  function updateCharts(filtered) {
    if (!filtered) filtered = getFilteredEntries();
    var colors = getChartColors();

    // Group by date
    var dateMap = {};
    filtered.forEach(function (e) {
      if (!dateMap[e.date]) dateMap[e.date] = { salary: 0, tips: 0 };
      dateMap[e.date][e.category] += e.amount;
    });

    var dates = Object.keys(dateMap).sort();
    var salaryData = dates.map(function (d) { return dateMap[d].salary; });
    var tipsData = dates.map(function (d) { return dateMap[d].tips; });
    var totalData = dates.map(function (d) { return dateMap[d].salary + dateMap[d].tips; });
    var labels = dates.map(function (d) { return formatDate(d); });

    // Bar chart
    if (barChart) barChart.destroy();
    barChart = new Chart(document.getElementById('barChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Salaire', data: salaryData, backgroundColor: colors.salary, borderRadius: 6, borderSkipped: false },
          { label: 'Tips', data: tipsData, backgroundColor: colors.tips, borderRadius: 6, borderSkipped: false }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: colors.tick, font: { size: 12 } } } },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: colors.tick, font: { size: 11 } } },
          y: { stacked: true, grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 11 } } }
        }
      }
    });

    // Line chart
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(document.getElementById('lineChart'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total',
          data: totalData,
          borderColor: colors.line,
          backgroundColor: colors.lineFill,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.line,
          pointBorderColor: colors.line,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: colors.tick, font: { size: 12 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: colors.tick, font: { size: 11 } } },
          y: { grid: { color: colors.grid }, ticks: { color: colors.tick, font: { size: 11 } } }
        }
      }
    });
  }

  render();

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
})();
