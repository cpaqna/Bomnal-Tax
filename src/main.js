import './style.css';
import { taxData } from './tax-data.js';

/* =========================================
   세무회계 봄날 - Main JavaScript
   ========================================= */

// ---------- DOM References ----------
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchSuggestions = document.getElementById('search-suggestions');
const lookupResult = document.getElementById('lookup-result');
const lookupDisclaimer = document.getElementById('lookup-disclaimer');

const backToTop = document.getElementById('back-to-top');

// ---------- Responsive Placeholder ----------
function updatePlaceholder() {
    if (window.innerWidth <= 768) {
        searchInput.placeholder = '업종코드 또는 업종명 입력';
    } else {
        searchInput.placeholder = '업종코드(예: 722000) 또는 업종명(예: 소프트웨어)을 입력하세요';
    }
}
updatePlaceholder();
window.addEventListener('resize', updatePlaceholder);

// ---------- Navigation ----------
let lastScroll = 0;

function handleScroll() {
    const scrollY = window.scrollY;

    // Navbar background
    if (scrollY > 60) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }

    // Back to top
    if (scrollY > 600) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }

    lastScroll = scrollY;
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// Mobile menu toggle
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
    document.body.style.overflow = navMenu.classList.contains('open') ? 'hidden' : '';
});

// Close mobile menu on link click
navMenu.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        document.body.style.overflow = '';
    });
});

// Back to top
backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
    });
});

// ---------- Scroll Animations ----------
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            scrollObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
});

// ---------- Tax Lookup ----------
let currentSuggestionIndex = -1;
let filteredResults = [];

function formatNumber(num) {
    if (num == null || num === '' || num === 0) return '-';
    const n = Number(num);
    if (isNaN(n)) return String(num);

    // 억/만 단위 변환
    if (n >= 100000000) {
        const eok = n / 100000000;
        return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
    } else if (n >= 10000) {
        const man = n / 10000;
        return man % 1 === 0 ? `${man.toLocaleString()}만` : `${man.toFixed(0).toLocaleString()}만`;
    }
    return n.toLocaleString();
}

function formatRate(rate) {
    if (rate == null || rate === '') return '-';
    const n = Number(rate);
    if (isNaN(n)) return String(rate);
    return `${n}%`;
}

function getStatusDisplay(value) {
    const v = String(value).toLowerCase().trim();
    if (v === 'o' || v === 'ㅇ') {
        return { symbol: 'O', className: 'yes', note: '적용 가능' };
    } else if (v === 'x' || v === 'ㅌ') {
        return { symbol: 'X', className: 'no', note: '적용 불가' };
    } else if (v === '△' || v === 'ㅅ' || v === 'ㄴ' || v === 'triangle') {
        return { symbol: '△', className: 'maybe', note: '조건부 적용' };
    }
    return { symbol: '-', className: '', note: '정보 없음' };
}

function searchTaxData(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase().trim();

    // Search by code (exact prefix match first)
    const codeMatches = taxData.filter(item =>
        item.code.startsWith(q)
    );

    // Search by name
    const nameMatches = taxData.filter(item =>
        !item.code.startsWith(q) && (
            item.detail.toLowerCase().includes(q) ||
            item.sub.toLowerCase().includes(q) ||
            item.mid.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        )
    );

    return [...codeMatches, ...nameMatches].slice(0, 15);
}

function renderSuggestions(results) {
    if (results.length === 0) {
        searchSuggestions.style.display = 'none';
        return;
    }

    searchSuggestions.innerHTML = results.map((item, i) =>
        `<div class="suggestion-item${i === currentSuggestionIndex ? ' active' : ''}" data-index="${i}">
      <span class="suggestion-code">${item.code}</span>
      <span class="suggestion-name">${item.detail || item.sub}</span>
      <span class="suggestion-category">${item.mid}</span>
    </div>`
    ).join('');

    searchSuggestions.style.display = 'block';

    // Click handlers
    searchSuggestions.querySelectorAll('.suggestion-item').forEach((el) => {
        el.addEventListener('click', () => {
            const idx = parseInt(el.dataset.index);
            selectResult(filteredResults[idx]);
        });
    });
}

function selectResult(item) {
    searchInput.value = `${item.code} - ${item.detail || item.sub}`;
    searchSuggestions.style.display = 'none';
    searchClear.style.display = 'block';
    renderResult(item);
}

function renderResult(item) {
    const startup = getStatusDisplay(item.startup);
    const sme = getStatusDisplay(item.sme);
    const employment = getStatusDisplay(item.employment);

    lookupResult.innerHTML = `
    <div class="result-header">
      <span class="result-code">${item.code}</span>
      <div class="result-info">
        <div class="result-name">${item.detail || item.sub}</div>
        <div class="result-category">${item.category} > ${item.mid} > ${item.sub}</div>
      </div>
    </div>
    <div class="result-body">
      <div class="result-tax-row">
        <div class="tax-card">
          <div class="tax-card-label">창업중소기업 세액감면</div>
          <div class="tax-card-value ${startup.className}">${startup.symbol}</div>
          <div class="tax-card-note">${startup.note}</div>
        </div>
        <div class="tax-card">
          <div class="tax-card-label">중소기업 특별세액감면</div>
          <div class="tax-card-value ${sme.className}">${sme.symbol}</div>
          <div class="tax-card-note">${sme.note}</div>
        </div>
        <div class="tax-card">
          <div class="tax-card-label">통합고용증대 세액공제</div>
          <div class="tax-card-value ${employment.className}">${employment.symbol}</div>
          <div class="tax-card-note">${employment.note}</div>
        </div>
      </div>
      <div class="result-info-grid">
        <div class="info-cell">
          <div class="info-cell-label">단순경비율</div>
          <div class="info-cell-value">${formatRate(item.simpleRate)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">기준경비율</div>
          <div class="info-cell-value">${formatRate(item.stdRate)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">단순경비율(초과율)</div>
          <div class="info-cell-value">${formatRate(item.simpleRateExcess)}</div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">성실신고 기준액</div>
          <div class="info-cell-value">${formatNumber(item.sincerity)}<span class="info-cell-unit">원</span></div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">복식부기 기준액</div>
          <div class="info-cell-value">${formatNumber(item.bookkeeping)}<span class="info-cell-unit">원</span></div>
        </div>
        <div class="info-cell">
          <div class="info-cell-label">경비율 적용 기준액</div>
          <div class="info-cell-value">${formatNumber(item.expenseThreshold)}<span class="info-cell-unit">원</span></div>
        </div>
      </div>
      ${item.desc ? `<div class="result-desc">
        <div class="result-desc-label">적용기준내용</div>
        <div class="result-desc-text">${item.desc}</div>
      </div>` : ''}
    </div>
  `;

    lookupResult.style.display = 'block';
    lookupDisclaimer.style.display = 'block';

    // Scroll to result
    lookupResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Search input event
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;

    clearTimeout(searchTimeout);
    searchClear.style.display = query ? 'block' : 'none';
    currentSuggestionIndex = -1;

    if (!query || query.length < 1) {
        searchSuggestions.style.display = 'none';
        lookupResult.style.display = 'none';
        lookupDisclaimer.style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(() => {
        filteredResults = searchTaxData(query);
        renderSuggestions(filteredResults);

        // Auto-select if exact code match
        if (/^\d{6}$/.test(query)) {
            const exact = taxData.find(item => item.code === query);
            if (exact) {
                selectResult(exact);
            }
        }
    }, 150);
});

// Keyboard nav for suggestions
searchInput.addEventListener('keydown', (e) => {
    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, filteredResults.length - 1);
        renderSuggestions(filteredResults);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
        renderSuggestions(filteredResults);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSuggestionIndex >= 0) {
            selectResult(filteredResults[currentSuggestionIndex]);
        } else if (filteredResults.length > 0) {
            selectResult(filteredResults[0]);
        }
    } else if (e.key === 'Escape') {
        searchSuggestions.style.display = 'none';
    }
});

// Clear search
searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    searchSuggestions.style.display = 'none';
    lookupResult.style.display = 'none';
    lookupDisclaimer.style.display = 'none';
    currentSuggestionIndex = -1;
    filteredResults = [];
    searchInput.focus();
});

// Close suggestions on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.lookup-box')) {
        searchSuggestions.style.display = 'none';
    }
});

// ---------- Active section highlight ----------
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link[href^="#"]');

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        }
    });
}, { threshold: 0.3 });

sections.forEach(section => sectionObserver.observe(section));

console.log(`세무회계 봄날 웹사이트 로드 완료. 업종 데이터: ${taxData.length}건`);
