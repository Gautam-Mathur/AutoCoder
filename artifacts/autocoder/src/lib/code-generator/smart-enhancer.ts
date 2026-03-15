// Smart Template Enhancer - Makes templates produce AI-quality output
// This module takes basic templates and enhances them with detected features

export interface EnhancementRequest {
  baseCode: string;
  userPrompt: string;
  templateType: string;
}

export interface DetectedFeatures {
  animations: boolean;
  darkMode: boolean;
  responsive: boolean;
  gradients: boolean;
  glassmorphism: boolean;
  forms: boolean;
  charts: boolean;
  tables: boolean;
  modals: boolean;
  notifications: boolean;
  search: boolean;
  filters: boolean;
  pagination: boolean;
  authentication: boolean;
  api: boolean;
  database: boolean;
  realtime: boolean;
  icons: boolean;
  images: boolean;
  socialProof: boolean;
  pricing: boolean;
  testimonials: boolean;
  faq: boolean;
  footer: boolean;
  cta: boolean;
}

// Detect what features user wants from their prompt
export function detectFeatures(prompt: string): DetectedFeatures {
  const lower = prompt.toLowerCase();

  return {
    animations: /animat|motion|fade|slide|bounce|transition|smooth|hover effect/.test(lower),
    darkMode: /dark mode|dark theme|light mode|theme toggle|dark\/light/.test(lower),
    responsive: /responsive|mobile|tablet|adaptive|breakpoint/.test(lower),
    gradients: /gradient|colorful|vibrant|rainbow/.test(lower),
    glassmorphism: /glass|blur|frosted|translucent|backdrop/.test(lower),
    forms: /form|input|submit|contact|signup|login|register|subscribe/.test(lower),
    charts: /chart|graph|analytics|metrics|visualization|data viz/.test(lower),
    tables: /table|list|data table|grid view|spreadsheet/.test(lower),
    modals: /modal|popup|dialog|overlay|lightbox/.test(lower),
    notifications: /notification|toast|alert|message|snackbar/.test(lower),
    search: /search|filter|find|lookup|query/.test(lower),
    filters: /filter|sort|category|tag/.test(lower),
    pagination: /pagination|page|load more|infinite scroll/.test(lower),
    authentication: /auth|login|signup|register|user|account|password/.test(lower),
    api: /api|fetch|request|endpoint|backend/.test(lower),
    database: /database|db|storage|persist|save|crud/.test(lower),
    realtime: /realtime|real-time|live|socket|websocket|push/.test(lower),
    icons: /icon|emoji|symbol/.test(lower),
    images: /image|photo|picture|gallery|carousel/.test(lower),
    socialProof: /testimonial|review|rating|trust|social proof|customer/.test(lower),
    pricing: /pricing|price|plan|subscription|tier/.test(lower),
    testimonials: /testimonial|review|feedback|customer say/.test(lower),
    faq: /faq|question|answer|help|support/.test(lower),
    footer: /footer|bottom|copyright|links/.test(lower),
    cta: /cta|call to action|button|click|get started|sign up/.test(lower),
  };
}

// CSS Animation library
const ANIMATION_CSS = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
    .animate-slide-in { animation: slideIn 0.4s ease-out forwards; }
    .animate-pulse { animation: pulse 2s ease-in-out infinite; }
    .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
    .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }
    .hover-glow { transition: box-shadow 0.3s; }
    .hover-glow:hover { box-shadow: 0 0 30px var(--primary-glow, rgba(139, 92, 246, 0.4)); }`;

// Glassmorphism CSS
const GLASS_CSS = `
    .glass {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .glass-card {
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
    }`;

// Gradient presets
const GRADIENT_CSS = `
    .gradient-text {
      background: linear-gradient(135deg, var(--primary), #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .gradient-bg {
      background: linear-gradient(135deg, var(--primary), #ec4899);
    }
    .gradient-border {
      position: relative;
      background: var(--card);
      border-radius: 16px;
    }
    .gradient-border::before {
      content: '';
      position: absolute;
      inset: -2px;
      background: linear-gradient(135deg, var(--primary), #ec4899);
      border-radius: 18px;
      z-index: -1;
    }`;

// Dark mode toggle JavaScript
const DARK_MODE_JS = `
  // Theme Toggle System
  (function() {
    const toggle = document.getElementById('themeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    function setTheme(dark) {
      document.documentElement.classList.toggle('light-mode', !dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      if (toggle) toggle.textContent = dark ? '☀️' : '🌙';
    }

    // Load saved theme or use system preference
    const saved = localStorage.getItem('theme');
    setTheme(saved ? saved === 'dark' : prefersDark.matches);

    // Toggle on click
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isDark = !document.documentElement.classList.contains('light-mode');
        setTheme(!isDark);
      });
    }

    // Listen for system changes
    prefersDark.addEventListener('change', (e) => {
      if (!localStorage.getItem('theme')) setTheme(e.matches);
    });
  })();`;

// Light mode CSS variables
const LIGHT_MODE_CSS = `
    .light-mode {
      --bg: #f8fafc;
      --surface: #ffffff;
      --card: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: rgba(0,0,0,0.1);
    }`;

// Notification/Toast system
const NOTIFICATION_JS = `
  // Toast Notification System
  const toast = {
    container: null,
    init() {
      if (this.container) return;
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = 'position:fixed;top:1rem;right:1rem;z-index:9999;display:flex;flex-direction:column;gap:0.5rem;';
      document.body.appendChild(this.container);
    },
    show(message, type = 'info', duration = 3000) {
      this.init();
      const t = document.createElement('div');
      const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
      t.style.cssText = \`padding:1rem 1.5rem;background:\${colors[type]};color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:slideIn 0.3s ease;font-weight:500;\`;
      t.textContent = message;
      this.container.appendChild(t);
      setTimeout(() => { t.style.animation = 'fadeOut 0.3s ease'; setTimeout(() => t.remove(), 300); }, duration);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); },
    warning(msg) { this.show(msg, 'warning'); }
  };`;

// Modal system
const MODAL_JS = `
  // Modal System
  const modal = {
    overlay: null,
    init() {
      if (this.overlay) return;
      this.overlay = document.createElement('div');
      this.overlay.id = 'modal-overlay';
      this.overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:9998;';
      this.overlay.onclick = (e) => { if (e.target === this.overlay) this.close(); };
      document.body.appendChild(this.overlay);
    },
    open(content, options = {}) {
      this.init();
      const box = document.createElement('div');
      box.style.cssText = 'background:var(--card, #1a1a25);border-radius:16px;padding:2rem;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;animation:fadeIn 0.3s ease;';
      if (typeof content === 'string') box.innerHTML = content;
      else box.appendChild(content);
      this.overlay.innerHTML = '';
      this.overlay.appendChild(box);
      this.overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    },
    close() {
      if (this.overlay) {
        this.overlay.style.display = 'none';
        document.body.style.overflow = '';
      }
    }
  };`;

// Search/Filter functionality
const SEARCH_JS = `
  // Live Search & Filter
  function initSearch(inputId, itemsSelector, searchKey = 'textContent') {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const items = document.querySelectorAll(itemsSelector);

      items.forEach(item => {
        const text = (item.dataset.search || item[searchKey] || '').toLowerCase();
        const matches = !query || text.includes(query);
        item.style.display = matches ? '' : 'none';
        item.style.opacity = matches ? '1' : '0';
      });
    });
  }`;

// Pricing section HTML
function generatePricingSection(title: string): string {
  return `
    <section class="pricing-section" style="padding: 5rem 2rem; max-width: 1200px; margin: 0 auto;">
      <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem;">Simple, Transparent Pricing</h2>
      <p style="text-align: center; color: var(--text-muted); margin-bottom: 3rem;">Choose the plan that works for you</p>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
        <div class="glass-card hover-lift" style="padding: 2rem; text-align: center;">
          <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Starter</h3>
          <div style="font-size: 3rem; font-weight: 800; margin: 1rem 0;">$0<span style="font-size: 1rem; color: var(--text-muted);">/mo</span></div>
          <ul style="list-style: none; padding: 0; margin: 2rem 0; text-align: left;">
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Basic features</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ 1 user</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Community support</li>
          </ul>
          <button class="btn btn-outline" style="width: 100%;">Get Started</button>
        </div>

        <div class="glass-card hover-lift gradient-border" style="padding: 2rem; text-align: center; transform: scale(1.05);">
          <span style="background: var(--primary); color: white; padding: 0.25rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">POPULAR</span>
          <h3 style="font-size: 1.5rem; margin: 1rem 0 0.5rem;">Pro</h3>
          <div style="font-size: 3rem; font-weight: 800; margin: 1rem 0;">$29<span style="font-size: 1rem; color: var(--text-muted);">/mo</span></div>
          <ul style="list-style: none; padding: 0; margin: 2rem 0; text-align: left;">
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ All Starter features</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Unlimited users</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Priority support</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Advanced analytics</li>
          </ul>
          <button class="btn gradient-bg" style="width: 100%; color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: 600; cursor: pointer;">Start Free Trial</button>
        </div>

        <div class="glass-card hover-lift" style="padding: 2rem; text-align: center;">
          <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Enterprise</h3>
          <div style="font-size: 3rem; font-weight: 800; margin: 1rem 0;">Custom</div>
          <ul style="list-style: none; padding: 0; margin: 2rem 0; text-align: left;">
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ All Pro features</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Dedicated support</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ Custom integrations</li>
            <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border);">✓ SLA guarantee</li>
          </ul>
          <button class="btn btn-outline" style="width: 100%;">Contact Sales</button>
        </div>
      </div>
    </section>`;
}

// Testimonials section HTML
function generateTestimonialsSection(): string {
  return `
    <section class="testimonials-section" style="padding: 5rem 2rem; background: var(--surface);">
      <div style="max-width: 1200px; margin: 0 auto;">
        <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem;">What Our Customers Say</h2>
        <p style="text-align: center; color: var(--text-muted); margin-bottom: 3rem;">Don't just take our word for it</p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
          <div class="glass-card hover-lift animate-fade-in" style="padding: 2rem;">
            <div style="display: flex; gap: 0.25rem; color: #fbbf24; margin-bottom: 1rem;">★★★★★</div>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">"This product completely transformed how we work. The team is more productive than ever."</p>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), #ec4899); border-radius: 50%;"></div>
              <div>
                <div style="font-weight: 600;">Sarah Johnson</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">CEO, TechCorp</div>
              </div>
            </div>
          </div>

          <div class="glass-card hover-lift animate-fade-in" style="padding: 2rem; animation-delay: 0.1s;">
            <div style="display: flex; gap: 0.25rem; color: #fbbf24; margin-bottom: 1rem;">★★★★★</div>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">"Best investment we've made this year. The ROI was visible within the first month."</p>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #22c55e, #3b82f6); border-radius: 50%;"></div>
              <div>
                <div style="font-weight: 600;">Mike Chen</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">CTO, StartupXYZ</div>
              </div>
            </div>
          </div>

          <div class="glass-card hover-lift animate-fade-in" style="padding: 2rem; animation-delay: 0.2s;">
            <div style="display: flex; gap: 0.25rem; color: #fbbf24; margin-bottom: 1rem;">★★★★★</div>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">"Outstanding support team and the product just keeps getting better with each update."</p>
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #f59e0b, #ef4444); border-radius: 50%;"></div>
              <div>
                <div style="font-weight: 600;">Emily Davis</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">Product Manager, BigCo</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>`;
}

// FAQ section HTML
function generateFAQSection(): string {
  return `
    <section class="faq-section" style="padding: 5rem 2rem; max-width: 800px; margin: 0 auto;">
      <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 1rem;">Frequently Asked Questions</h2>
      <p style="text-align: center; color: var(--text-muted); margin-bottom: 3rem;">Got questions? We've got answers.</p>

      <div class="faq-list" style="display: flex; flex-direction: column; gap: 1rem;">
        <details class="glass-card" style="padding: 1.5rem; cursor: pointer;">
          <summary style="font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            How do I get started?
            <span style="transition: transform 0.3s;">▼</span>
          </summary>
          <p style="margin-top: 1rem; color: var(--text-muted);">Simply sign up for a free account and follow our quick start guide. You'll be up and running in less than 5 minutes.</p>
        </details>

        <details class="glass-card" style="padding: 1.5rem; cursor: pointer;">
          <summary style="font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            Can I cancel anytime?
            <span style="transition: transform 0.3s;">▼</span>
          </summary>
          <p style="margin-top: 1rem; color: var(--text-muted);">Yes! You can cancel your subscription at any time with no questions asked. We believe in earning your business every day.</p>
        </details>

        <details class="glass-card" style="padding: 1.5rem; cursor: pointer;">
          <summary style="font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            Is my data secure?
            <span style="transition: transform 0.3s;">▼</span>
          </summary>
          <p style="margin-top: 1rem; color: var(--text-muted);">Absolutely. We use enterprise-grade encryption and follow industry best practices to keep your data safe and secure.</p>
        </details>

        <details class="glass-card" style="padding: 1.5rem; cursor: pointer;">
          <summary style="font-weight: 600; list-style: none; display: flex; justify-content: space-between; align-items: center;">
            Do you offer refunds?
            <span style="transition: transform 0.3s;">▼</span>
          </summary>
          <p style="margin-top: 1rem; color: var(--text-muted);">Yes, we offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment in full.</p>
        </details>
      </div>
    </section>`;
}

// Footer HTML
function generateFooter(title: string): string {
  return `
    <footer style="background: var(--surface); border-top: 1px solid var(--border); padding: 4rem 2rem 2rem;">
      <div style="max-width: 1200px; margin: 0 auto;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 3rem; margin-bottom: 3rem;">
          <div>
            <div class="gradient-text" style="font-size: 1.5rem; font-weight: 800; margin-bottom: 1rem;">${title || "Brand"}</div>
            <p style="color: var(--text-muted); font-size: 0.875rem;">Building the future, one line of code at a time.</p>
          </div>

          <div>
            <h4 style="font-weight: 600; margin-bottom: 1rem;">Product</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Features</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Pricing</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Integrations</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 style="font-weight: 600; margin-bottom: 1rem;">Company</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">About</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Blog</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Careers</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 style="font-weight: 600; margin-bottom: 1rem;">Legal</h4>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Privacy</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Terms</a></li>
              <li><a href="#" style="color: var(--text-muted); text-decoration: none; font-size: 0.875rem;">Security</a></li>
            </ul>
          </div>
        </div>

        <div style="border-top: 1px solid var(--border); padding-top: 2rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
          <p style="color: var(--text-muted); font-size: 0.875rem;">© ${new Date().getFullYear()} ${title || "Brand"}. All rights reserved.</p>
          <div style="display: flex; gap: 1rem;">
            <a href="#" style="color: var(--text-muted); text-decoration: none;">Twitter</a>
            <a href="#" style="color: var(--text-muted); text-decoration: none;">GitHub</a>
            <a href="#" style="color: var(--text-muted); text-decoration: none;">Discord</a>
          </div>
        </div>
      </div>
    </footer>`;
}

// Main enhancement function
export function enhanceTemplate(request: EnhancementRequest): string {
  const features = detectFeatures(request.userPrompt);
  let code = request.baseCode;

  // Extract title from code
  const titleMatch = code.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].split(' - ')[0].split(' |')[0] : 'Brand';

  // Inject CSS enhancements before </style>
  let cssInjections = '';

  if (features.animations) {
    cssInjections += ANIMATION_CSS;
  }

  if (features.glassmorphism) {
    cssInjections += GLASS_CSS;
  }

  if (features.gradients) {
    cssInjections += GRADIENT_CSS;
  }

  if (features.darkMode) {
    cssInjections += LIGHT_MODE_CSS;
  }

  // Always add some base animations for polish
  if (!features.animations && (request.templateType.includes('landing') || request.templateType.includes('dashboard'))) {
    cssInjections += `
    .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
    .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,0,0,0.2); }`;
  }

  if (cssInjections) {
    code = code.replace('</style>', cssInjections + '\n  </style>');
  }

  // Inject JavaScript before </body>
  let jsInjections = '';

  if (features.darkMode) {
    jsInjections += `<script>${DARK_MODE_JS}</script>\n`;
    // Add theme toggle button to nav if not present
    if (!code.includes('themeToggle')) {
      code = code.replace('</nav>', '<button id="themeToggle" style="background:none;border:none;font-size:1.5rem;cursor:pointer;padding:0.5rem;" title="Toggle theme">☀️</button></nav>');
    }
  }

  if (features.notifications) {
    jsInjections += `<script>${NOTIFICATION_JS}</script>\n`;
  }

  if (features.modals) {
    jsInjections += `<script>${MODAL_JS}</script>\n`;
  }

  if (features.search) {
    jsInjections += `<script>${SEARCH_JS}</script>\n`;
  }

  if (jsInjections) {
    code = code.replace('</body>', jsInjections + '</body>');
  }

  // Inject HTML sections before </main> or </body>
  let htmlInjections = '';

  if (features.pricing) {
    htmlInjections += generatePricingSection(title);
  }

  if (features.testimonials || features.socialProof) {
    htmlInjections += generateTestimonialsSection();
  }

  if (features.faq) {
    htmlInjections += generateFAQSection();
  }

  if (htmlInjections) {
    // Try to inject before </main>, otherwise before </body>
    if (code.includes('</main>')) {
      code = code.replace('</main>', htmlInjections + '\n  </main>');
    } else {
      code = code.replace('</body>', htmlInjections + '\n</body>');
    }
  }

  // Add footer if requested and not present
  if (features.footer && !code.includes('<footer')) {
    code = code.replace('</body>', generateFooter(title) + '\n</body>');
  }

  // Add glassmorphism class to cards if detected
  if (features.glassmorphism) {
    code = code.replace(/class="stat-card/g, 'class="stat-card glass-card');
    code = code.replace(/class="card/g, 'class="card glass-card');
  }

  // Add hover animations to cards
  if (features.animations || request.templateType.includes('landing')) {
    code = code.replace(/class="stat-card/g, 'class="stat-card hover-lift');
    code = code.replace(/class="feature-card/g, 'class="feature-card hover-lift');
  }

  return code;
}

// Quick enhance - just adds polish without major changes
export function polishCode(code: string): string {
  // Add smooth scrolling
  if (!code.includes('scroll-behavior')) {
    code = code.replace(':root {', ':root {\n      scroll-behavior: smooth;');
  }

  // Improve button transitions
  if (!code.includes('button') || !code.includes('transition')) {
    code = code.replace('button {', 'button {\n      transition: all 0.2s ease;');
  }

  // Add focus styles for accessibility
  if (!code.includes(':focus')) {
    code = code.replace('</style>', `
    *:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }
  </style>`);
  }

  return code;
}