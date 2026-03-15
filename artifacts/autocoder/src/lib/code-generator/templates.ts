// Code templates for common web development patterns - Professional Grade

export interface CodeTemplate {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  language: string;
  generate: (params: Record<string, string>) => string;
}

// HTML Templates - Professional & Modern
export const htmlTemplates: CodeTemplate[] = [
  {
    id: "html-basic",
    name: "Basic HTML Page",
    keywords: ["html", "page", "basic", "simple", "webpage", "website", "starter"],
    description: "A basic HTML5 page structure",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${params.description || 'A modern web page'}">
  <title>${params.title || "My Page"}</title>
  <style>
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --bg: #0f0f23;
      --surface: #1a1a2e;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      min-height: 100vh;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    header {
      padding: 1.5rem 2rem;
      background: var(--surface);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    h1 { font-size: 2rem; font-weight: 700; }
    main { padding: 3rem 2rem; }
    p { color: var(--text-muted); font-size: 1.1rem; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>${params.title || "Welcome"}</h1>
    </div>
  </header>
  <main>
    <div class="container">
      <p>Your content goes here. Start building something amazing!</p>
    </div>
  </main>
</body>
</html>`,
  },
  {
    id: "html-counter",
    name: "Counter App",
    keywords: ["counter", "increment", "decrement", "number", "click", "count", "clicker", "tally", "plus", "minus", "add", "subtract"],
    description: "A simple counter with increment/decrement buttons",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Counter App"}</title>
  <style>
    :root {
      --primary: #6366f1;
      --primary-dark: #4f46e5;
      --danger: #ef4444;
      --danger-dark: #dc2626;
      --bg: #0f0f23;
      --surface: #1a1a2e;
      --text: #e2e8f0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2rem;
    }
    h1 { font-size: 1.5rem; color: #94a3b8; }
    .counter-display {
      font-size: 6rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .buttons {
      display: flex;
      gap: 1rem;
    }
    button {
      padding: 1rem 2rem;
      font-size: 1.5rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .increment {
      background: var(--primary);
      color: white;
    }
    .increment:hover { background: var(--primary-dark); transform: translateY(-2px); }
    .decrement {
      background: var(--danger);
      color: white;
    }
    .decrement:hover { background: var(--danger-dark); transform: translateY(-2px); }
    .reset {
      background: var(--surface);
      color: var(--text);
      border: 1px solid rgba(255,255,255,0.2);
    }
    .reset:hover { background: rgba(255,255,255,0.1); }
  </style>
</head>
<body>
  <h1>${params.title || "Counter"}</h1>
  <div class="counter-display" id="counter">0</div>
  <div class="buttons">
    <button type="button" class="decrement" id="decrementBtn">-</button>
    <button type="button" class="reset" id="resetBtn">Reset</button>
    <button type="button" class="increment" id="incrementBtn">+</button>
  </div>
  <script>
    let count = 0;
    const counterDisplay = document.getElementById('counter');
    const incrementBtn = document.getElementById('incrementBtn');
    const decrementBtn = document.getElementById('decrementBtn');
    const resetBtn = document.getElementById('resetBtn');

    function updateDisplay() {
      counterDisplay.textContent = count;
    }

    incrementBtn.addEventListener('click', function() {
      count++;
      updateDisplay();
    });

    decrementBtn.addEventListener('click', function() {
      count--;
      updateDisplay();
    });

    resetBtn.addEventListener('click', function() {
      count = 0;
      updateDisplay();
    });
  </script>
</body>
</html>`,
  },
  {
    id: "html-landing",
    name: "Landing Page",
    keywords: ["landing", "hero", "marketing", "homepage", "home", "startup", "saas", "product"],
    description: "A stunning marketing landing page",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Amazing Product"} - The Future is Here</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --primary-glow: rgba(139, 92, 246, 0.4);
      --bg: #0a0a0f;
      --surface: #12121a;
      --card: #1a1a25;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.08);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    /* Navigation */
    nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
      padding: 1rem 2rem;
      background: rgba(10, 10, 15, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }
    .nav-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary), #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nav-links { display: flex; gap: 2rem; list-style: none; }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      transition: color 0.2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-links a:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; border-radius: 4px; }

    /* Accessibility */
    .skip-link { position: absolute; left: -9999px; top: 1rem; background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 4px; z-index: 999; }
    .skip-link:focus { left: 1rem; }
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }

    /* Hero Section */
    .hero {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 8rem 2rem 4rem;
      position: relative;
      overflow: hidden;
    }
    .hero::before {
      content: '';
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, var(--primary-glow) 0%, transparent 70%);
      pointer-events: none;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 100px;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 2rem;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .hero h1 {
      font-size: clamp(2.5rem, 8vw, 5rem);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 1.5rem;
      max-width: 800px;
    }
    .hero h1 span {
      background: linear-gradient(135deg, var(--primary), #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero p {
      font-size: 1.25rem;
      color: var(--text-muted);
      max-width: 600px;
      margin-bottom: 2.5rem;
    }
    .btn-group { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
    .btn {
      padding: 1rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      color: white;
      box-shadow: 0 4px 20px var(--primary-glow);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px var(--primary-glow);
    }
    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-secondary:hover { background: var(--card); }
    .btn:focus-visible { outline: 2px solid white; outline-offset: 2px; }
    .btn:active { transform: scale(0.98); }

    /* Entrance Animations */
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .animate-in { animation: fadeInUp 0.6s ease-out forwards; opacity: 0; }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }

    /* Features Section */
    .features {
      padding: 6rem 2rem;
      background: var(--surface);
    }
    .features-content {
      max-width: 1200px;
      margin: 0 auto;
    }
    .section-header {
      text-align: center;
      margin-bottom: 4rem;
    }
    .section-header h2 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }
    .section-header p {
      color: var(--text-muted);
      font-size: 1.1rem;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .feature-card {
      padding: 2rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      transition: all 0.3s;
    }
    .feature-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
      box-shadow: 0 10px 40px rgba(139, 92, 246, 0.1);
    }
    .feature-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .feature-card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.75rem;
    }
    .feature-card p {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    /* CTA Section */
    .cta {
      padding: 6rem 2rem;
      text-align: center;
    }
    .cta-box {
      max-width: 800px;
      margin: 0 auto;
      padding: 4rem;
      background: linear-gradient(135deg, var(--card), var(--surface));
      border: 1px solid var(--border);
      border-radius: 24px;
      position: relative;
      overflow: hidden;
    }
    .cta-box::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 400px;
      height: 200px;
      background: radial-gradient(ellipse, var(--primary-glow) 0%, transparent 70%);
    }
    .cta h2 { font-size: 2rem; margin-bottom: 1rem; position: relative; }
    .cta p { color: var(--text-muted); margin-bottom: 2rem; position: relative; }

    /* Footer */
    footer {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <nav role="navigation" aria-label="Main navigation">
    <div class="nav-content">
      <a href="#" class="logo">${params.title || "Brand"}</a>
      <ul class="nav-links">
        <li><a href="#features">Features</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#about">About</a></li>
      </ul>
      <a href="#" class="btn btn-primary" style="padding: 0.75rem 1.5rem;">Get Started</a>
    </div>
  </nav>

  <main id="main">
  <section class="hero">
    <div class="badge animate-in">
      <span class="badge-dot" aria-hidden="true"></span>
      Now Available
    </div>
    <h1 class="animate-in delay-1">Build Something <span>Incredible</span> Today</h1>
    <p class="animate-in delay-2">${params.description || "The most powerful platform for creating amazing digital experiences. Fast, intuitive, and built for the future."}</p>
    <div class="btn-group animate-in delay-3">
      <a href="#" class="btn btn-primary">Start Free Trial</a>
      <a href="#" class="btn btn-secondary">Watch Demo</a>
    </div>
  </section>

  <section class="features" id="features">
    <div class="features-content">
      <div class="section-header">
        <h2>Why Choose Us</h2>
        <p>Everything you need to build, launch, and scale</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h3>Lightning Fast</h3>
          <p>Optimized performance that keeps your users engaged and coming back for more.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3>Secure by Default</h3>
          <p>Enterprise-grade security built into every layer of the platform.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="17" r="2"/><circle cx="5" cy="17" r="2"/><path d="M3 17h4v-6h10v6h4"/></svg>
          </div>
          <h3>Beautiful Design</h3>
          <p>Stunning templates and components that make your product shine.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="cta">
    <div class="cta-box">
      <h2>Ready to Get Started?</h2>
      <p>Join thousands of creators building the future</p>
      <a href="#" class="btn btn-primary">Start Building Free</a>
    </div>
  </section>

  </main>

  <footer role="contentinfo">
    <p>&copy; 2024 ${params.title || "Brand"}. All rights reserved.</p>
  </footer>
</body>
</html>`,
  },
  {
    id: "html-form",
    name: "Contact Form",
    keywords: ["form", "contact", "input", "submit", "email", "signup", "register", "login", "auth"],
    description: "A beautiful contact/signup form",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Contact Us"}</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --primary-hover: #7c3aed;
      --bg: #0a0a0f;
      --surface: #12121a;
      --card: #1a1a25;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.1);
      --error: #ef4444;
      --success: #22c55e;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }
    .form-container {
      width: 100%;
      max-width: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 2.5rem;
      position: relative;
      overflow: hidden;
    }
    .form-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 100px;
      background: radial-gradient(ellipse, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
    }
    .form-header {
      text-align: center;
      margin-bottom: 2rem;
      position: relative;
    }
    .form-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 1.5rem;
    }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
    .form-header p { color: var(--text-muted); font-size: 0.95rem; }

    .form-group { margin-bottom: 1.25rem; }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text);
    }
    input, textarea {
      width: 100%;
      padding: 0.875rem 1rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      font-size: 1rem;
      color: var(--text);
      transition: all 0.2s;
    }
    input::placeholder, textarea::placeholder { color: var(--text-muted); }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
    }
    textarea { resize: vertical; min-height: 120px; }

    .btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, var(--primary), #7c3aed);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 0.5rem;
    }
    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
    }
    .btn:active { transform: translateY(0); }

    .form-footer {
      text-align: center;
      margin-top: 1.5rem;
      color: var(--text-muted);
      font-size: 0.875rem;
    }
    .form-footer a {
      color: var(--primary);
      text-decoration: none;
    }
    .form-footer a:hover { text-decoration: underline; }

    .success-message {
      display: none;
      text-align: center;
      padding: 1rem;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 10px;
      color: var(--success);
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div class="form-header">
      <div class="form-icon">✉️</div>
      <h1>${params.title || "Get in Touch"}</h1>
      <p>We'd love to hear from you. Send us a message!</p>
    </div>

    <form id="contactForm">
      <div class="form-group">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" placeholder="John Doe" required>
      </div>
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" placeholder="john@example.com" required>
      </div>
      <div class="form-group">
        <label for="message">Your Message</label>
        <textarea id="message" name="message" placeholder="Tell us what's on your mind..." required></textarea>
      </div>
      <button type="submit" class="btn">Send Message</button>
      <div class="success-message" id="successMessage">
        ✓ Message sent successfully! We'll get back to you soon.
      </div>
    </form>

    <div class="form-footer">
      <p>Need help? <a href="#">Contact support</a></p>
    </div>
  </div>

  <script>
    document.getElementById('contactForm').addEventListener('submit', function(e) {
      e.preventDefault();

      const btn = this.querySelector('button');
      btn.textContent = 'Sending...';
      btn.disabled = true;

      // Simulate API call
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.disabled = false;
        document.getElementById('successMessage').style.display = 'block';
        this.reset();

        setTimeout(() => {
          document.getElementById('successMessage').style.display = 'none';
        }, 3000);
      }, 1500);
    });
  </script>
</body>
</html>`,
  },
  {
    id: "html-card-grid",
    name: "Card Grid Layout",
    keywords: ["card", "grid", "gallery", "products", "portfolio", "items", "list", "shop", "store", "ecommerce"],
    description: "A responsive card grid layout",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Products"}</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --bg: #0a0a0f;
      --surface: #12121a;
      --card: #1a1a25;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.08);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    header {
      text-align: center;
      margin-bottom: 3rem;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    header p { color: var(--text-muted); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      transition: all 0.3s;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: var(--primary);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    .card-image {
      height: 200px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }
    .card-image::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, var(--card) 0%, transparent 50%);
    }
    .card-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.25rem 0.75rem;
      background: var(--primary);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 100px;
      z-index: 1;
    }
    .card-content { padding: 1.5rem; }
    .card h3 {
      font-size: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .card p {
      color: var(--text-muted);
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 1rem;
    }
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .price {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
    }
    .price span {
      font-size: 0.875rem;
      color: var(--text-muted);
      font-weight: 400;
    }
    .btn {
      padding: 0.75rem 1.25rem;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #7c3aed;
      transform: scale(1.02);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${params.title || "Featured Products"}</h1>
      <p>Discover our amazing collection</p>
    </header>

    <div class="grid">
      <article class="card">
        <div class="card-image">
          <span class="card-badge">New</span>
        </div>
        <div class="card-content">
          <h3>Premium Package</h3>
          <p>Everything you need to get started with our platform.</p>
          <div class="card-footer">
            <div class="price">$99 <span>/month</span></div>
            <button class="btn">Get Started</button>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-image" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <span class="card-badge">Popular</span>
        </div>
        <div class="card-content">
          <h3>Pro Package</h3>
          <p>Advanced features for growing teams and businesses.</p>
          <div class="card-footer">
            <div class="price">$199 <span>/month</span></div>
            <button class="btn">Get Started</button>
          </div>
        </div>
      </article>

      <article class="card">
        <div class="card-image" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
        </div>
        <div class="card-content">
          <h3>Enterprise</h3>
          <p>Custom solutions for large organizations.</p>
          <div class="card-footer">
            <div class="price">Custom</div>
            <button class="btn">Contact Us</button>
          </div>
        </div>
      </article>
    </div>
  </div>
</body>
</html>`,
  },
  {
    id: "html-navbar",
    name: "Navigation Bar",
    keywords: ["navbar", "navigation", "menu", "header", "nav", "topbar"],
    description: "A modern responsive navigation bar",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Navigation"}</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --bg: #0a0a0f;
      --surface: #12121a;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.08);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    nav {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(10, 10, 15, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
    }
    .nav-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary), #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-decoration: none;
    }
    .nav-links {
      display: flex;
      gap: 2rem;
      list-style: none;
    }
    .nav-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.95rem;
      transition: color 0.2s;
      position: relative;
    }
    .nav-links a::after {
      content: '';
      position: absolute;
      bottom: -4px;
      left: 0;
      width: 0;
      height: 2px;
      background: var(--primary);
      transition: width 0.2s;
    }
    .nav-links a:hover { color: var(--text); }
    .nav-links a:hover::after { width: 100%; }

    .nav-actions { display: flex; gap: 0.75rem; align-items: center; }
    .btn {
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-ghost {
      background: transparent;
      color: var(--text);
    }
    .btn-ghost:hover { background: var(--surface); }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover { background: #7c3aed; }

    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      cursor: pointer;
      padding: 0.5rem;
    }
    .hamburger span {
      width: 24px;
      height: 2px;
      background: var(--text);
      border-radius: 2px;
      transition: all 0.3s;
    }

    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 4rem 2rem;
    }
    h1 { font-size: 3rem; margin-bottom: 1rem; }
    p { color: var(--text-muted); font-size: 1.1rem; }

    @media (max-width: 768px) {
      .nav-links, .nav-actions { display: none; }
      .hamburger { display: flex; }
    }
  </style>
</head>
<body>
  <nav>
    <div class="nav-content">
      <a href="#" class="logo">${params.title || "Brand"}</a>

      <ul class="nav-links">
        <li><a href="#">Home</a></li>
        <li><a href="#">Features</a></li>
        <li><a href="#">Pricing</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Contact</a></li>
      </ul>

      <div class="nav-actions">
        <a href="#" class="btn btn-ghost">Log in</a>
        <a href="#" class="btn btn-primary">Sign up</a>
      </div>

      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </nav>

  <main>
    <h1>Welcome to ${params.title || "Our Site"}</h1>
    <p>Start building something amazing with our platform.</p>
  </main>
</body>
</html>`,
  },
  {
    id: "html-dashboard",
    name: "Dashboard Layout",
    keywords: ["dashboard", "admin", "panel", "analytics", "stats", "metrics"],
    description: "A modern dashboard layout with sidebar",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title || "Dashboard"}</title>
  <style>
    :root {
      --primary: #8b5cf6;
      --bg: #0a0a0f;
      --surface: #12121a;
      --card: #1a1a25;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255,255,255,0.08);
      --success: #22c55e;
      --warning: #f59e0b;
      --error: #ef4444;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
    }
    .sidebar-logo {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, var(--primary), #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2rem;
    }
    .sidebar-nav { flex: 1; }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1rem;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 10px;
      margin-bottom: 0.25rem;
      transition: all 0.2s;
    }
    .nav-item:hover { background: var(--card); color: var(--text); }
    .nav-item.active {
      background: var(--primary);
      color: white;
    }
    .nav-icon { font-size: 1.25rem; }

    /* Main Content */
    .main-content { flex: 1; padding: 2rem; overflow-y: auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    h1 { font-size: 1.75rem; }
    .user-avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--primary), #ec4899);
      border-radius: 50%;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .stat-label {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
    }
    .stat-change {
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    .stat-change.up { color: var(--success); }
    .stat-change.down { color: var(--error); }

    /* Chart Placeholder */
    .chart-section {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 1.5rem;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .chart-title { font-size: 1.1rem; font-weight: 600; }
    .chart-placeholder {
      height: 300px;
      background: linear-gradient(to right, var(--surface) 0%, var(--card) 100%);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-logo">${params.title || "Dashboard"}</div>
    <nav class="sidebar-nav">
      <a href="#" class="nav-item active">
        <span class="nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        </span>
        Overview
      </a>
      <a href="#" class="nav-item">
        <span class="nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
        </span>
        Analytics
      </a>
      <a href="#" class="nav-item">
        <span class="nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </span>
        Users
      </a>
      <a href="#" class="nav-item">
        <span class="nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </span>
        Revenue
      </a>
      <a href="#" class="nav-item">
        <span class="nav-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </span>
        Settings
      </a>
    </nav>
  </aside>

  <main class="main-content">
    <header class="header">
      <h1>Overview</h1>
      <div class="user-avatar"></div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">$45,231</div>
        <div class="stat-change up">↑ 12% from last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Users</div>
        <div class="stat-value">2,340</div>
        <div class="stat-change up">↑ 8% from last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Conversions</div>
        <div class="stat-value">1,203</div>
        <div class="stat-change down">↓ 3% from last month</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Avg. Session</div>
        <div class="stat-value">4m 32s</div>
        <div class="stat-change up">↑ 15% from last month</div>
      </div>
    </div>

    <section class="chart-section">
      <div class="chart-header">
        <h2 class="chart-title">Revenue Over Time</h2>
      </div>
      <div class="chart-placeholder">
        Chart visualization goes here
      </div>
    </section>
  </main>
</body>
</html>`,
  },
];

// JavaScript Templates - Modern & Clean
export const jsTemplates: CodeTemplate[] = [
  {
    id: "js-fetch",
    name: "Fetch API Request",
    keywords: ["fetch", "api", "http", "request", "get", "post", "ajax", "rest"],
    description: "Modern HTTP requests with fetch",
    language: "javascript",
    generate: (params) => `/**
 * Modern Fetch API Wrapper
 * Clean, type-safe HTTP requests with error handling
 */

const API_BASE = '${params.url || "https://api.example.com"}';

// Generic request handler with error handling
async function request(endpoint, options = {}) {
  const url = \`\${API_BASE}\${endpoint}\`;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || \`HTTP \${response.status}: \${response.statusText}\`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(\`Request failed: \${endpoint}\`, error);
    throw error;
  }
}

// API Methods
const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),

  post: (endpoint, data) => request(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  put: (endpoint, data) => request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  patch: (endpoint, data) => request(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

// Usage Examples
async function examples() {
  // GET request
  const users = await api.get('/users');
  console.log('Users:', users);

  // POST request
  const newUser = await api.post('/users', {
    name: 'John Doe',
    email: 'john@example.com'
  });
  console.log('Created:', newUser);

  // With error handling
  try {
    const data = await api.get('/protected-resource');
  } catch (error) {
    console.error('Failed to fetch:', error.message);
  }
}

export { api, request };`,
  },
  {
    id: "js-localstorage",
    name: "LocalStorage Manager",
    keywords: ["localstorage", "storage", "save", "persist", "cache", "store", "session"],
    description: "Type-safe localStorage utility",
    language: "javascript",
    generate: () => `/**
 * Advanced LocalStorage Manager
 * With TTL support, compression, and type safety
 */

const Storage = {
  prefix: 'app_',

  // Set item with optional expiry (in minutes)
  set(key, value, ttlMinutes = null) {
    try {
      const item = {
        value,
        timestamp: Date.now(),
        ttl: ttlMinutes ? ttlMinutes * 60 * 1000 : null,
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      return true;
    } catch (error) {
      console.error('Storage.set error:', error);
      if (error.name === 'QuotaExceededError') {
        this.cleanup(); // Try to free space
      }
      return false;
    }
  },

  // Get item (returns null if expired)
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return defaultValue;

      const item = JSON.parse(raw);

      // Check if expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        this.remove(key);
        return defaultValue;
      }

      return item.value;
    } catch (error) {
      console.error('Storage.get error:', error);
      return defaultValue;
    }
  },

  // Remove item
  remove(key) {
    localStorage.removeItem(this.prefix + key);
  },

  // Check if key exists and is not expired
  has(key) {
    return this.get(key) !== null;
  },

  // Get all keys with this prefix
  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .map(k => k.slice(this.prefix.length));
  },

  // Clear all items with this prefix
  clear() {
    this.keys().forEach(key => this.remove(key));
  },

  // Remove expired items
  cleanup() {
    this.keys().forEach(key => this.get(key)); // Get triggers expiry check
  },

  // Get storage size in bytes
  size() {
    let total = 0;
    this.keys().forEach(key => {
      const item = localStorage.getItem(this.prefix + key);
      total += item ? item.length * 2 : 0; // UTF-16 = 2 bytes per char
    });
    return total;
  }
};

// Usage Examples
Storage.set('user', { id: 1, name: 'John' });
Storage.set('token', 'abc123', 60); // Expires in 60 minutes

const user = Storage.get('user');
console.log(user); // { id: 1, name: 'John' }

console.log('Storage size:', Storage.size(), 'bytes');
console.log('All keys:', Storage.keys());

export { Storage };`,
  },
  {
    id: "js-debounce",
    name: "Debounce & Throttle",
    keywords: ["debounce", "throttle", "delay", "performance", "optimize", "search", "scroll"],
    description: "Performance optimization utilities",
    language: "javascript",
    generate: () => `/**
 * Debounce & Throttle Utilities
 * Essential performance optimization functions
 */

// Debounce: Wait until user stops triggering
function debounce(fn, wait = 300, options = {}) {
  let timeoutId;
  let lastArgs;
  const { leading = false, trailing = true } = options;

  function debounced(...args) {
    lastArgs = args;
    const callNow = leading && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (trailing && lastArgs) {
        fn.apply(this, lastArgs);
      }
    }, wait);

    if (callNow) {
      fn.apply(this, args);
    }
  }

  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };

  return debounced;
}

// Throttle: Limit execution rate
function throttle(fn, limit = 300, options = {}) {
  let waiting = false;
  let lastArgs = null;
  const { leading = true, trailing = true } = options;

  function throttled(...args) {
    if (!waiting) {
      if (leading) {
        fn.apply(this, args);
      }
      waiting = true;

      setTimeout(() => {
        waiting = false;
        if (trailing && lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  }

  throttled.cancel = () => {
    waiting = false;
    lastArgs = null;
  };

  return throttled;
}

// RAF Throttle: Smooth animations using requestAnimationFrame
function rafThrottle(fn) {
  let rafId = null;
  let lastArgs = null;

  function throttled(...args) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn.apply(this, lastArgs);
        rafId = null;
      });
    }
  }

  throttled.cancel = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  return throttled;
}

// Usage Examples
// Search input - wait until user stops typing
const handleSearch = debounce((query) => {
  console.log('Searching for:', query);
  // Call search API
}, 500);

// Scroll handler - run at most every 100ms
const handleScroll = throttle(() => {
  console.log('Scroll position:', window.scrollY);
}, 100);

// Resize - smooth with RAF
const handleResize = rafThrottle(() => {
  console.log('Window size:', window.innerWidth, window.innerHeight);
});

// Attach listeners
document.querySelector('#search')?.addEventListener('input', (e) => handleSearch(e.target.value));
window.addEventListener('scroll', handleScroll);
window.addEventListener('resize', handleResize);

export { debounce, throttle, rafThrottle };`,
  },
  {
    id: "js-form-validation",
    name: "Form Validation",
    keywords: ["validate", "validation", "form", "input", "email", "password", "check", "rules"],
    description: "Comprehensive form validation",
    language: "javascript",
    generate: () => `/**
 * Form Validation Library
 * Declarative, composable validation rules
 */

// Validation rules
const rules = {
  required: (msg = 'This field is required') =>
    (value) => (value?.toString().trim() ? null : msg),

  email: (msg = 'Invalid email address') =>
    (value) => (/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value) ? null : msg),

  minLength: (min, msg) =>
    (value) => (value?.length >= min ? null : msg || \`Must be at least \${min} characters\`),

  maxLength: (max, msg) =>
    (value) => (!value || value.length <= max ? null : msg || \`Must be at most \${max} characters\`),

  pattern: (regex, msg = 'Invalid format') =>
    (value) => (regex.test(value) ? null : msg),

  match: (fieldName, msg) =>
    (value, allValues) => (value === allValues[fieldName] ? null : msg || \`Must match \${fieldName}\`),

  password: (msg = 'Password must have 8+ chars, uppercase, lowercase, and number') =>
    (value) => (/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$/.test(value) ? null : msg),

  url: (msg = 'Invalid URL') =>
    (value) => {
      try { new URL(value); return null; }
      catch { return msg; }
    },

  number: (msg = 'Must be a number') =>
    (value) => (!isNaN(Number(value)) ? null : msg),

  min: (min, msg) =>
    (value) => (Number(value) >= min ? null : msg || \`Must be at least \${min}\`),

  max: (max, msg) =>
    (value) => (Number(value) <= max ? null : msg || \`Must be at most \${max}\`),
};

// Validator factory
function createValidator(schema) {
  return function validate(values) {
    const errors = {};
    let isValid = true;

    for (const [field, fieldRules] of Object.entries(schema)) {
      const value = values[field];
      const ruleList = Array.isArray(fieldRules) ? fieldRules : [fieldRules];

      for (const rule of ruleList) {
        const error = rule(value, values);
        if (error) {
          errors[field] = error;
          isValid = false;
          break; // Stop at first error for this field
        }
      }
    }

    return { isValid, errors };
  };
}

// Usage Example
const validateSignup = createValidator({
  name: [rules.required(), rules.minLength(2)],
  email: [rules.required(), rules.email()],
  password: [rules.required(), rules.password()],
  confirmPassword: [rules.required(), rules.match('password', 'Passwords must match')],
});

// Test it
const result = validateSignup({
  name: 'John',
  email: 'john@example.com',
  password: 'SecurePass123',
  confirmPassword: 'SecurePass123',
});

console.log(result);
// { isValid: true, errors: {} }

// Form integration example
function setupFormValidation(formId, schema) {
  const form = document.getElementById(formId);
  const validate = createValidator(schema);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(form));
    const { isValid, errors } = validate(formData);

    // Clear previous errors
    form.querySelectorAll('.error').forEach(el => el.textContent = '');

    if (isValid) {
      console.log('Form is valid!', formData);
      // Submit form
    } else {
      // Display errors
      for (const [field, error] of Object.entries(errors)) {
        const errorEl = form.querySelector(\`[data-error="\${field}"]\`);
        if (errorEl) errorEl.textContent = error;
      }
    }
  });
}

export { rules, createValidator, setupFormValidation };`,
  },
  {
    id: "js-todo-app",
    name: "Todo App",
    keywords: ["todo", "task", "list", "add", "delete", "complete", "crud", "app"],
    description: "Complete todo application",
    language: "javascript",
    generate: () => `/**
 * Modern Todo App
 * Full CRUD with localStorage persistence
 */

class TodoApp {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.storageKey = 'todos_app';
    this.todos = this.load();
    this.filter = 'all'; // all, active, completed
    this.render();
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.todos));
  }

  add(text) {
    if (!text.trim()) return;

    this.todos.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    });

    this.save();
    this.render();
  }

  toggle(id) {
    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.save();
    this.render();
  }

  delete(id) {
    this.todos = this.todos.filter(todo => todo.id !== id);
    this.save();
    this.render();
  }

  edit(id, newText) {
    if (!newText.trim()) return this.delete(id);

    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, text: newText.trim() } : todo
    );
    this.save();
    this.render();
  }

  clearCompleted() {
    this.todos = this.todos.filter(todo => !todo.completed);
    this.save();
    this.render();
  }

  setFilter(filter) {
    this.filter = filter;
    this.render();
  }

  getFiltered() {
    switch (this.filter) {
      case 'active': return this.todos.filter(t => !t.completed);
      case 'completed': return this.todos.filter(t => t.completed);
      default: return this.todos;
    }
  }

  render() {
    const filtered = this.getFiltered();
    const active = this.todos.filter(t => !t.completed).length;

    this.container.innerHTML = \`
      <style>
        .todo-app {
          max-width: 500px;
          margin: 2rem auto;
          font-family: system-ui, sans-serif;
        }
        .todo-header {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          padding: 2rem;
          border-radius: 16px 16px 0 0;
          color: white;
        }
        .todo-header h1 { margin: 0 0 1rem; font-size: 1.5rem; }
        .todo-input-group { display: flex; gap: 0.5rem; }
        .todo-input {
          flex: 1;
          padding: 0.875rem 1rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
        }
        .todo-add {
          padding: 0.875rem 1.5rem;
          background: white;
          color: #8b5cf6;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .todo-list {
          background: #1a1a25;
          border: 1px solid rgba(255,255,255,0.1);
          border-top: none;
        }
        .todo-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          color: #f1f5f9;
        }
        .todo-item.completed .todo-text {
          text-decoration: line-through;
          opacity: 0.5;
        }
        .todo-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
        }
        .todo-text { flex: 1; }
        .todo-delete {
          opacity: 0;
          padding: 0.25rem 0.5rem;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .todo-item:hover .todo-delete { opacity: 1; }
        .todo-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: #12121a;
          border-radius: 0 0 16px 16px;
          color: #94a3b8;
          font-size: 0.875rem;
        }
        .todo-filters { display: flex; gap: 0.5rem; }
        .todo-filter {
          padding: 0.25rem 0.75rem;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          border-radius: 4px;
          cursor: pointer;
        }
        .todo-filter.active {
          border-color: #8b5cf6;
          color: #8b5cf6;
        }
        .todo-clear {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }
        .todo-clear:hover { color: #ef4444; }
        .todo-empty {
          padding: 3rem;
          text-align: center;
          color: #64748b;
        }
      </style>

      <div class="todo-app">
        <div class="todo-header">
          <h1>My Todos</h1>
          <div class="todo-input-group">
            <input
              type="text"
              class="todo-input"
              placeholder="What needs to be done?"
              id="todoInput"
            >
            <button class="todo-add" onclick="app.add(document.getElementById('todoInput').value); document.getElementById('todoInput').value = '';">
              Add
            </button>
          </div>
        </div>

        <div class="todo-list">
          \${filtered.length === 0 ? \`
            <div class="todo-empty">
              \${this.filter === 'all' ? 'No todos yet. Add one above!' : 'No ' + this.filter + ' todos'}
            </div>
          \` : filtered.map(todo => \`
            <div class="todo-item \${todo.completed ? 'completed' : ''}">
              <input
                type="checkbox"
                class="todo-checkbox"
                \${todo.completed ? 'checked' : ''}
                onchange="app.toggle('\${todo.id}')"
              >
              <span class="todo-text">\${this.escapeHtml(todo.text)}</span>
              <button class="todo-delete" onclick="app.delete('\${todo.id}')">Delete</button>
            </div>
          \`).join('')}
        </div>

        <div class="todo-footer">
          <span>\${active} item\${active !== 1 ? 's' : ''} left</span>
          <div class="todo-filters">
            <button class="todo-filter \${this.filter === 'all' ? 'active' : ''}" onclick="app.setFilter('all')">All</button>
            <button class="todo-filter \${this.filter === 'active' ? 'active' : ''}" onclick="app.setFilter('active')">Active</button>
            <button class="todo-filter \${this.filter === 'completed' ? 'active' : ''}" onclick="app.setFilter('completed')">Done</button>
          </div>
          <button class="todo-clear" onclick="app.clearCompleted()">Clear done</button>
        </div>
      </div>
    \`;

    // Focus input and add enter key handler
    const input = document.getElementById('todoInput');
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.add(input.value);
        input.value = '';
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize: const app = new TodoApp('app');
// Make sure you have <div id="app"></div> in your HTML`,
  },
];

// React Templates - Production Ready
export const reactTemplates: CodeTemplate[] = [
  {
    id: "react-component",
    name: "React Component",
    keywords: ["react", "component", "functional", "hook", "useState", "typescript"],
    description: "Modern React functional component",
    language: "tsx",
    generate: (params) => `import { useState, useCallback } from 'react';

interface ${params.name || "Counter"}Props {
  initialValue?: number;
  step?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
}

export function ${params.name || "Counter"}({
  initialValue = 0,
  step = 1,
  min = -Infinity,
  max = Infinity,
  onChange,
}: ${params.name || "Counter"}Props) {
  const [value, setValue] = useState(initialValue);

  const updateValue = useCallback((newValue: number) => {
    const clamped = Math.min(Math.max(newValue, min), max);
    setValue(clamped);
    onChange?.(clamped);
  }, [min, max, onChange]);

  const increment = () => updateValue(value + step);
  const decrement = () => updateValue(value - step);
  const reset = () => updateValue(initialValue);

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-xl border">
      <div className="text-4xl font-bold tabular-nums">{value}</div>

      <div className="flex gap-2">
        <button
          onClick={decrement}
          disabled={value <= min}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
                     hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          - {step}
        </button>

        <button
          onClick={reset}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg
                     hover:bg-secondary/80 transition-colors"
        >
          Reset
        </button>

        <button
          onClick={increment}
          disabled={value >= max}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg
                     hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          + {step}
        </button>
      </div>
    </div>
  );
}`,
  },
  {
    id: "react-form",
    name: "React Form",
    keywords: ["react", "form", "input", "submit", "controlled", "validation"],
    description: "React form with validation",
    language: "tsx",
    generate: (params) => `import { useState, FormEvent } from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export function ${params.name || "ContactForm"}() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Form submitted:', formData);
      setSubmitted(true);
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-8 bg-card rounded-2xl border text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Message Sent!</h2>
        <p className="text-muted-foreground mb-4">We'll get back to you soon.</p>
        <button
          onClick={() => setSubmitted(false)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Send Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-8 bg-card rounded-2xl border">
      <h2 className="text-2xl font-bold mb-6 text-center">Get in Touch</h2>

      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className={\`w-full px-4 py-2.5 rounded-lg border bg-background
            \${errors.name ? 'border-destructive' : 'border-input'}
            focus:outline-none focus:ring-2 focus:ring-primary/50\`}
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium mb-1.5">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={\`w-full px-4 py-2.5 rounded-lg border bg-background
            \${errors.email ? 'border-destructive' : 'border-input'}
            focus:outline-none focus:ring-2 focus:ring-primary/50\`}
          placeholder="john@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="message" className="block text-sm font-medium mb-1.5">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={4}
          className={\`w-full px-4 py-2.5 rounded-lg border bg-background resize-none
            \${errors.message ? 'border-destructive' : 'border-input'}
            focus:outline-none focus:ring-2 focus:ring-primary/50\`}
          placeholder="Your message..."
        />
        {errors.message && (
          <p className="mt-1 text-sm text-destructive">{errors.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium
                   hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Sending...
          </>
        ) : (
          'Send Message'
        )}
      </button>
    </form>
  );
}`,
  },
  {
    id: "react-modal",
    name: "React Modal",
    keywords: ["react", "modal", "popup", "dialog", "overlay", "portal"],
    description: "Accessible modal component",
    language: "tsx",
    generate: () => `import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Focus trap
      contentRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return createPortal(
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={\`w-full \${sizeClasses[size]} bg-card rounded-2xl shadow-2xl
                   border border-border overflow-hidden
                   animate-in zoom-in-95 slide-in-from-bottom-4 duration-200\`}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 id="modal-title" className="text-lg font-semibold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Usage Example:
/*
import { useState } from 'react';
import { Modal } from './Modal';

function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open Modal</button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Welcome"
        size="md"
      >
        <p>This is the modal content!</p>
        <button
          onClick={() => setIsOpen(false)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
        >
          Close
        </button>
      </Modal>
    </>
  );
}
*/`,
  },
  {
    id: "react-fetch-hook",
    name: "React useFetch Hook",
    keywords: ["react", "hook", "fetch", "api", "useFetch", "custom", "data"],
    description: "Custom data fetching hook",
    language: "tsx",
    generate: () => `import { useState, useEffect, useCallback, useRef } from 'react';

interface UseFetchOptions<T> {
  initialData?: T;
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T) => void;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    initialData = null,
    immediate = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(immediate && !!url);
  const [isValidating, setIsValidating] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!url) return;

    // Cancel previous request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setIsValidating(true);
    if (!data) setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const result = await response.json();
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
      }
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [url, onSuccess, onError]);

  useEffect(() => {
    if (immediate && url) {
      fetchData();
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url, immediate, fetchData]);

  const mutate = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData);
    } else {
      fetchData();
    }
  }, [fetchData]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    refetch: fetchData,
  };
}

// Usage Examples:
/*
// Basic usage
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useFetch<User>(
    \`/api/users/\${userId}\`
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return <div>Hello, {user.name}!</div>;
}

// With options
function Posts() {
  const { data: posts, refetch, isValidating } = useFetch<Post[]>('/api/posts', {
    onSuccess: (posts) => console.log('Loaded', posts.length, 'posts'),
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <button onClick={refetch} disabled={isValidating}>
        {isValidating ? 'Refreshing...' : 'Refresh'}
      </button>
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}

// Conditional fetching
function SearchResults({ query }: { query: string }) {
  const { data, isLoading } = useFetch<Result[]>(
    query.length >= 3 ? \`/api/search?q=\${query}\` : null,
    { immediate: true }
  );

  // ...
}
*/`,
  },
];

// CSS Templates
export const cssTemplates: CodeTemplate[] = [
  {
    id: "css-flexbox",
    name: "Flexbox Layouts",
    keywords: ["flexbox", "flex", "layout", "center", "align", "row", "column"],
    description: "Essential flexbox patterns",
    language: "css",
    generate: () => `/**
 * Essential Flexbox Layout Patterns
 * Copy and use these battle-tested layouts
 */

/* ===== Centering ===== */
/* Center absolutely anything */
.center-all {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Center horizontally only */
.center-x {
  display: flex;
  justify-content: center;
}

/* Center vertically only */
.center-y {
  display: flex;
  align-items: center;
}

/* ===== Navigation Patterns ===== */
/* Classic navbar: logo left, links right */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

/* Navigation links */
.nav-links {
  display: flex;
  gap: 2rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ===== Card Layouts ===== */
/* Flexible card grid */
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.card {
  flex: 1 1 300px; /* Grow, shrink, min-width */
  max-width: 400px;
}

/* Card with footer at bottom */
.card-stretch {
  display: flex;
  flex-direction: column;
}

.card-stretch .card-content {
  flex: 1; /* Takes remaining space */
}

.card-stretch .card-footer {
  margin-top: auto;
}

/* ===== Page Layouts ===== */
/* Holy Grail: Header, Footer, 3-column */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-layout main {
  flex: 1; /* Pushes footer down */
  display: flex;
}

.page-layout .sidebar-left,
.page-layout .sidebar-right {
  flex: 0 0 250px; /* Fixed width sidebars */
}

.page-layout .content {
  flex: 1; /* Flexible center */
}

/* Sidebar layout */
.with-sidebar {
  display: flex;
  min-height: 100vh;
}

.with-sidebar .sidebar {
  flex: 0 0 280px;
}

.with-sidebar .main {
  flex: 1;
  min-width: 0; /* Prevents overflow */
}

/* ===== Form Layouts ===== */
/* Input with button */
.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group input {
  flex: 1;
}

/* Form row */
.form-row {
  display: flex;
  gap: 1rem;
}

.form-row > * {
  flex: 1;
}

/* ===== Utility Classes ===== */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-wrap { flex-wrap: wrap; }
.flex-1 { flex: 1; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }`,
  },
  {
    id: "css-grid",
    name: "CSS Grid Layouts",
    keywords: ["grid", "layout", "columns", "responsive", "auto", "template"],
    description: "Modern CSS Grid patterns",
    language: "css",
    generate: () => `/**
 * Modern CSS Grid Layout Patterns
 * Responsive, flexible, and production-ready
 */

/* ===== Responsive Grids ===== */
/* Auto-fit: Items shrink and grow */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

/* Auto-fill: Empty columns preserved */
.grid-fill {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

/* ===== Fixed Column Grids ===== */
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

/* ===== Dashboard Layout ===== */
.dashboard {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "sidebar header"
    "sidebar main";
  min-height: 100vh;
}

.dashboard-sidebar { grid-area: sidebar; }
.dashboard-header { grid-area: header; }
.dashboard-main { grid-area: main; }

/* ===== Blog/Article Layout ===== */
.article-layout {
  display: grid;
  grid-template-columns: 1fr min(65ch, 100%) 1fr;
  padding: 0 1rem;
}

.article-layout > * {
  grid-column: 2;
}

/* Full-bleed elements */
.article-layout .full-bleed {
  grid-column: 1 / -1;
  width: 100%;
}

/* ===== Feature Grid ===== */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

/* Large feature card spans 2 columns */
.feature-grid .feature-large {
  grid-column: span 2;
}

/* ===== Masonry-like Grid ===== */
.masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-auto-rows: 10px;
  gap: 1rem;
}

.masonry .item-small { grid-row: span 20; }
.masonry .item-medium { grid-row: span 30; }
.masonry .item-large { grid-row: span 40; }

/* ===== Holy Grail with Grid ===== */
.holy-grail {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header header"
    "left   main   right"
    "footer footer footer";
  min-height: 100vh;
  gap: 1rem;
}

.holy-grail-header { grid-area: header; }
.holy-grail-left { grid-area: left; }
.holy-grail-main { grid-area: main; }
.holy-grail-right { grid-area: right; }
.holy-grail-footer { grid-area: footer; }

/* ===== Responsive Adjustments ===== */
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 {
    grid-template-columns: 1fr;
  }

  .dashboard {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main";
  }

  .dashboard-sidebar {
    display: none; /* Or use a mobile menu */
  }

  .holy-grail {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "footer";
  }

  .holy-grail-left,
  .holy-grail-right {
    display: none;
  }

  .feature-grid .feature-large {
    grid-column: span 1;
  }
}`,
  },
  {
    id: "css-animations",
    name: "CSS Animations",
    keywords: ["animation", "animate", "transition", "hover", "keyframes", "fade", "slide", "spin"],
    description: "Smooth animations and transitions",
    language: "css",
    generate: () => `/**
 * CSS Animations & Transitions Library
 * Smooth, performant, and beautiful
 */

/* ===== Base Transitions ===== */
.transition-fast { transition: all 0.15s ease; }
.transition { transition: all 0.2s ease; }
.transition-slow { transition: all 0.3s ease; }
.transition-colors { transition: background-color 0.2s, border-color 0.2s, color 0.2s; }
.transition-transform { transition: transform 0.2s ease; }
.transition-opacity { transition: opacity 0.2s ease; }

/* ===== Hover Effects ===== */
/* Lift up with shadow */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

/* Scale up slightly */
.hover-scale {
  transition: transform 0.2s ease;
}
.hover-scale:hover {
  transform: scale(1.02);
}

/* Glow effect */
.hover-glow {
  transition: box-shadow 0.2s ease;
}
.hover-glow:hover {
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.4);
}

/* Brighten */
.hover-brighten {
  transition: filter 0.2s ease;
}
.hover-brighten:hover {
  filter: brightness(1.1);
}

/* ===== Entrance Animations ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeInUp {
  animation: fadeInUp 0.4s ease-out forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fadeInDown {
  animation: fadeInDown 0.4s ease-out forwards;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-slideInRight {
  animation: slideInRight 0.4s ease-out forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.animate-scaleIn {
  animation: scaleIn 0.3s ease-out forwards;
}

/* ===== Looping Animations ===== */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.animate-bounce {
  animation: bounce 1s ease-in-out infinite;
}

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}
.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* ===== Loading Animations ===== */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.05) 25%,
    rgba(255,255,255,0.1) 50%,
    rgba(255,255,255,0.05) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Dot loading */
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
.loading-dots {
  display: flex;
  gap: 4px;
}
.loading-dots span {
  width: 8px;
  height: 8px;
  background: currentColor;
  border-radius: 50%;
  animation: dotPulse 1.4s infinite ease-in-out both;
}
.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }

/* ===== Staggered Animations ===== */
.stagger-children > * {
  animation: fadeInUp 0.4s ease-out forwards;
  opacity: 0;
}
.stagger-children > *:nth-child(1) { animation-delay: 0.1s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.2s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.3s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.4s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.5s; }

/* ===== Reduced Motion ===== */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`,
  },
];

// Cybersecurity Terminal Template - Advanced
const advancedTemplates: CodeTemplate[] = [
  {
    id: "html-cyber-terminal",
    name: "Cybersecurity Terminal",
    keywords: ["terminal", "cyber", "security", "hacker", "console", "cli", "command", "scan", "monitor", "threat", "detection"],
    description: "An animated cybersecurity terminal with typing effect",
    language: "html",
    generate: (params) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${params.title || "SecureShield"} - Advanced cybersecurity threat monitoring and detection system. Real-time protection for your digital assets.">
  <meta property="og:title" content="${params.title || "SecureShield"} - Threat Monitor">
  <meta property="og:description" content="Advanced cybersecurity threat monitoring and detection system.">
  <meta property="og:type" content="website">
  <title>${params.title || "SecureShield"} - Threat Monitor</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #0d1117;
      --card: #161b22;
      --primary: #00ff88;
      --cyan: #00d4ff;
      --warning: #ffb800;
      --error: #ff3366;
      --text: #e6edf3;
      --muted: #7d8590;
      --border: rgba(0, 255, 136, 0.1);
      --glow: rgba(0, 255, 136, 0.3);
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Skip Link */
    .skip-link {
      position: absolute;
      left: -9999px;
      top: 1rem;
      background: var(--primary);
      color: var(--bg);
      padding: 0.5rem 1rem;
      border-radius: 4px;
      z-index: 999;
      font-family: system-ui, sans-serif;
    }
    .skip-link:focus { left: 1rem; }
    :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
    }

    /* Header */
    header {
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--primary);
      text-shadow: 0 0 20px var(--glow);
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(0, 255, 136, 0.1);
      border: 1px solid var(--border);
      border-radius: 100px;
      font-size: 0.75rem;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      background: var(--primary);
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--glow); } 50% { opacity: 0.8; box-shadow: 0 0 0 8px transparent; } }

    /* Main Layout */
    main {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 2rem;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    @media (max-width: 1024px) {
      main { grid-template-columns: 1fr; }
    }

    /* Terminal */
    .terminal {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .terminal-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--card);
      border-bottom: 1px solid var(--border);
    }
    .terminal-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .terminal-dot.red { background: #ff5f56; }
    .terminal-dot.yellow { background: #ffbd2e; }
    .terminal-dot.green { background: #27c93f; }
    .terminal-title {
      flex: 1;
      text-align: center;
      font-size: 0.8rem;
      color: var(--muted);
    }
    .terminal-body {
      padding: 1.5rem;
      min-height: 400px;
      font-size: 0.9rem;
      line-height: 1.8;
    }
    .line { opacity: 0; animation: fadeIn 0.3s ease forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
    .line.prompt::before { content: '> '; color: var(--primary); }
    .line .highlight { color: var(--primary); }
    .line .cyan { color: var(--cyan); }
    .line .warning { color: var(--warning); }
    .line .error { color: var(--error); }
    .line .success { color: var(--primary); }
    .cursor {
      display: inline-block;
      width: 8px;
      height: 16px;
      background: var(--primary);
      animation: blink 1s step-end infinite;
      vertical-align: middle;
      margin-left: 2px;
    }
    @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

    /* Stats Panel */
    .stats-panel { display: flex; flex-direction: column; gap: 1rem; }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      transition: all 0.3s;
    }
    .stat-card:hover { border-color: var(--primary); box-shadow: 0 0 20px var(--glow); }
    .stat-label { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 2rem; font-weight: 600; color: var(--primary); font-variant-numeric: tabular-nums; }
    .stat-value.warning { color: var(--warning); }
    .stat-value.error { color: var(--error); }
    .stat-change { font-size: 0.75rem; margin-top: 0.5rem; color: var(--muted); }

    /* Threat List */
    .threat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
    }
    .threat-card h3 { font-size: 0.875rem; margin-bottom: 1rem; color: var(--text); }
    .threat-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.8rem;
    }
    .threat-item:last-child { border-bottom: none; }
    .threat-type { color: var(--muted); }
    .threat-count { font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 100px; font-size: 0.7rem; }
    .threat-count.low { background: rgba(0, 255, 136, 0.1); color: var(--primary); }
    .threat-count.medium { background: rgba(255, 184, 0, 0.1); color: var(--warning); }
    .threat-count.high { background: rgba(255, 51, 102, 0.1); color: var(--error); }

    /* Entrance Animation */
    .animate-in { animation: slideUp 0.5s ease forwards; opacity: 0; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }
    .delay-4 { animation-delay: 0.4s; }
  </style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>

  <header role="banner">
    <div class="logo">${params.title || "SecureShield"}</div>
    <div class="status-badge">
      <span class="status-dot" aria-hidden="true"></span>
      <span>SYSTEM ACTIVE</span>
    </div>
  </header>

  <main id="main" role="main">
    <section class="terminal animate-in">
      <div class="terminal-header">
        <div class="terminal-dot red" aria-hidden="true"></div>
        <div class="terminal-dot yellow" aria-hidden="true"></div>
        <div class="terminal-dot green" aria-hidden="true"></div>
        <div class="terminal-title">threat_monitor.sh</div>
      </div>
      <div class="terminal-body" id="terminal" aria-live="polite" aria-label="Security scan output">
      </div>
    </section>

    <aside class="stats-panel" aria-label="Security statistics">
      <div class="stat-card animate-in delay-1">
        <div class="stat-label">Threats Blocked</div>
        <div class="stat-value" id="threats-blocked">0</div>
        <div class="stat-change">Last 24 hours</div>
      </div>
      <div class="stat-card animate-in delay-2">
        <div class="stat-label">Active Scans</div>
        <div class="stat-value" id="active-scans">0</div>
        <div class="stat-change">Running now</div>
      </div>
      <div class="stat-card animate-in delay-3">
        <div class="stat-label">System Health</div>
        <div class="stat-value">98.7%</div>
        <div class="stat-change">All systems operational</div>
      </div>
      <div class="threat-card animate-in delay-4">
        <h3>Threat Types Detected</h3>
        <div class="threat-item">
          <span class="threat-type">Malware Attempts</span>
          <span class="threat-count low">12</span>
        </div>
        <div class="threat-item">
          <span class="threat-type">Phishing Links</span>
          <span class="threat-count medium">47</span>
        </div>
        <div class="threat-item">
          <span class="threat-type">DDoS Attacks</span>
          <span class="threat-count high">3</span>
        </div>
        <div class="threat-item">
          <span class="threat-type">SQL Injections</span>
          <span class="threat-count low">8</span>
        </div>
      </div>
    </aside>
  </main>

  <script>
    const lines = [
      { text: '[init] Starting ${params.title || "SecureShield"} threat detection engine...', delay: 0 },
      { text: '[conn] Establishing secure connection to neural network...', delay: 800 },
      { text: '[auth] <span class="success">Authentication successful</span>', delay: 1400 },
      { text: '', delay: 1800 },
      { text: '[scan] Initiating deep packet inspection...', delay: 2200 },
      { text: '[scan] Sector 1 (Firewall)..... <span class="success">SECURE</span>', delay: 2800 },
      { text: '[scan] Sector 2 (Database)..... <span class="success">SECURE</span>', delay: 3400 },
      { text: '[scan] Sector 3 (API Gateway).. <span class="success">SECURE</span>', delay: 4000 },
      { text: '[scan] Sector 4 (Auth Server).. <span class="success">SECURE</span>', delay: 4600 },
      { text: '', delay: 5000 },
      { text: '[detect] <span class="warning">Anomaly detected in packet_stream_04</span>', delay: 5400 },
      { text: '[analyze] Running behavioral analysis...', delay: 6000 },
      { text: '[result] Threat classified as: <span class="cyan">Low Risk - False Positive</span>', delay: 6800 },
      { text: '[action] <span class="success">Threat neutralized and logged</span>', delay: 7400 },
      { text: '', delay: 7800 },
      { text: '[status] All systems operational. Monitoring active.', delay: 8200 },
      { text: '[monitor] Awaiting next scan cycle...<span class="cursor"></span>', delay: 8800 }
    ];

    const terminal = document.getElementById('terminal');

    lines.forEach((line, index) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'line' + (line.text.startsWith('[') ? ' prompt' : '');
        div.innerHTML = line.text;
        div.style.animationDelay = '0s';
        terminal.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
      }, line.delay);
    });

    // Animate stats
    function animateValue(id, start, end, duration) {
      const obj = document.getElementById(id);
      if (!obj) return;
      let startTime = null;
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        obj.textContent = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    setTimeout(() => animateValue('threats-blocked', 0, 1247, 2000), 500);
    setTimeout(() => animateValue('active-scans', 0, 12, 1000), 700);
  </script>
</body>
</html>`,
  },
];

// All templates combined
export const allTemplates: CodeTemplate[] = [
  ...htmlTemplates,
  ...jsTemplates,
  ...reactTemplates,
  ...cssTemplates,
  ...advancedTemplates,
];