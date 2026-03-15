import { useState } from "react";
import { Book, Code2, Shield, Palette, Server, Zap, Layers, FileCode, Terminal, Sparkles, Building2, Heart, ShoppingCart, GraduationCap, Truck, MessageSquare, Headphones, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { domainTemplates, getTemplatesByCategory, DomainTemplate } from "@/lib/code-generator/domain-templates";

interface SyntaxExample {
  title: string;
  code: string;
  explanation: string;
}

interface LanguageGuide {
  name: string;
  category: string;
  description: string;
  features: string[];
  examples: string[];
  tips: string[];
  syntax: SyntaxExample[];
}

interface DevGuideProps {
  onSelectTemplate?: (prompt: string) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Security": <Shield className="h-3 w-3" />,
  "Finance": <DollarSign className="h-3 w-3" />,
  "HR": <Users className="h-3 w-3" />,
  "Healthcare": <Heart className="h-3 w-3" />,
  "Retail": <ShoppingCart className="h-3 w-3" />,
  "Enterprise": <Building2 className="h-3 w-3" />,
  "Education": <GraduationCap className="h-3 w-3" />,
  "Communication": <MessageSquare className="h-3 w-3" />,
  "Logistics": <Truck className="h-3 w-3" />,
  "Hospitality": <Heart className="h-3 w-3" />,
  "Support": <Headphones className="h-3 w-3" />,
};

const languageGuides: LanguageGuide[] = [
  {
    name: "HTML5",
    category: "Frontend",
    description: "Structure and content for web pages with semantic elements",
    features: ["Semantic tags", "Forms with validation", "Accessibility", "Meta tags", "Media elements"],
    examples: ["Landing pages", "Multi-page websites", "Contact forms", "Dashboards", "Portfolios"],
    tips: ["Always include viewport meta tag", "Use semantic elements for SEO", "Add alt text to images"],
    syntax: [
      {
        title: "Document Structure",
        code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
</head>
<body>
  <header><nav><!-- Navigation --></nav></header>
  <main><section><!-- Content --></section></main>
  <footer><!-- Footer --></footer>
</body>
</html>`,
        explanation: "Every HTML5 document needs DOCTYPE, html, head, and body tags."
      },
      {
        title: "Forms with Validation",
        code: `<form action="/submit" method="POST">
  <label for="email">Email *</label>
  <input type="email" id="email" name="email" required
         pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$">

  <label for="password">Password *</label>
  <input type="password" id="password" name="password"
         required minlength="8">

  <select id="country" name="country">
    <option value="">Select...</option>
    <option value="us">United States</option>
  </select>

  <button type="submit">Submit</button>
</form>`,
        explanation: "HTML5 provides built-in validation with required, pattern, minlength."
      }
    ]
  },
  {
    name: "CSS3",
    category: "Frontend",
    description: "Modern styling with Flexbox, Grid, animations, and responsive design",
    features: ["Flexbox layouts", "CSS Grid", "Custom properties", "Animations", "Media queries"],
    examples: ["Responsive layouts", "Card grids", "Animated buttons", "Dark mode", "Mobile-first"],
    tips: ["Use CSS variables for theming", "Mobile-first with min-width queries", "Flexbox for 1D, Grid for 2D"],
    syntax: [
      {
        title: "CSS Variables",
        code: `:root {
  --primary: #3b82f6;
  --background: #ffffff;
  --foreground: #0f172a;
  --spacing-md: 1rem;
  --radius-md: 0.5rem;
}

.dark {
  --background: #0f172a;
  --foreground: #f8fafc;
}

.button {
  background: var(--primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}`,
        explanation: "CSS variables enable consistent theming and easy dark mode."
      },
      {
        title: "Flexbox & Grid",
        code: `/* Flexbox - 1D layouts */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

/* Grid - 2D layouts */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Responsive */
@media (min-width: 768px) {
  .container { max-width: 720px; }
}`,
        explanation: "Flexbox for rows/columns, Grid for complex 2D layouts."
      }
    ]
  },
  {
    name: "JavaScript",
    category: "Frontend",
    description: "Client-side interactivity, DOM manipulation, and API integration",
    features: ["ES6+ syntax", "DOM manipulation", "Fetch API", "Local Storage", "Async/await"],
    examples: ["Interactive forms", "Dynamic content", "Todo lists", "API integration", "Modals"],
    tips: ["Use const/let instead of var", "Handle errors with try/catch", "Debounce expensive operations"],
    syntax: [
      {
        title: "Modern JavaScript",
        code: `// Variables and destructuring
const { name, age } = user;
const [first, ...rest] = items;

// Arrow functions
const greet = (name) => \`Hello, \${name}!\`;

// Array methods
const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const total = numbers.reduce((sum, n) => sum + n, 0);

// Async/await
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}`,
        explanation: "Modern JS uses arrow functions, destructuring, and async/await."
      },
      {
        title: "DOM & Events",
        code: `// Selecting elements
const btn = document.querySelector('.btn');
const items = document.querySelectorAll('.item');

// Event handling
btn.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('Clicked!');
});

// Event delegation
document.getElementById('list').addEventListener('click', (e) => {
  if (e.target.matches('.delete-btn')) {
    e.target.closest('.item').remove();
  }
});

// DOM manipulation
const div = document.createElement('div');
div.className = 'card';
div.innerHTML = '<h2>Title</h2>';
parent.appendChild(div);`,
        explanation: "Use querySelector, addEventListener, and event delegation."
      }
    ]
  },
  {
    name: "TypeScript",
    category: "Frontend",
    description: "Type-safe JavaScript with interfaces, generics, and better tooling",
    features: ["Static type checking", "Interfaces", "Generics", "Enums", "Utility types"],
    examples: ["Type-safe APIs", "React components", "State management", "Utility types"],
    tips: ["Enable strict mode", "Use interfaces for objects", "Leverage type inference"],
    syntax: [
      {
        title: "Types & Interfaces",
        code: `// Basic types
let name: string = "John";
let age: number = 30;
let items: string[] = ["a", "b"];

// Interface
interface User {
  id: number;
  name: string;
  email: string;
  age?: number;  // Optional
  readonly createdAt: Date;
}

// Union & literal types
type Status = "pending" | "active" | "completed";
type ID = string | number;

// Generics
interface ApiResponse<T> {
  data: T;
  status: number;
}

function identity<T>(value: T): T {
  return value;
}`,
        explanation: "TypeScript adds type annotations for safer code."
      }
    ]
  },
  {
    name: "React",
    category: "Frontend",
    description: "Component-based UI library with hooks and modern patterns",
    features: ["Functional components", "Hooks", "Context API", "Custom hooks", "JSX"],
    examples: ["Dashboards", "Forms", "Data tables", "Wizards", "Real-time updates"],
    tips: ["Keep components small", "Lift state up", "Use keys in lists"],
    syntax: [
      {
        title: "Components & Hooks",
        code: `// Functional component with props
function UserCard({ name, email, onEdit }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>{email}</p>
      <button onClick={onEdit}>Edit</button>
    </div>
  );
}

// useState hook
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

// useEffect hook
function DataFetcher({ url }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(setData);
  }, [url]);

  return data ? <div>{JSON.stringify(data)}</div> : <div>Loading...</div>;
}`,
        explanation: "React uses functional components with hooks for state and effects."
      }
    ]
  },
  {
    name: "Python",
    category: "Backend",
    description: "Backend development with Flask, SQLAlchemy, and REST APIs",
    features: ["Flask framework", "SQLAlchemy ORM", "REST APIs", "Authentication", "CORS"],
    examples: ["CRUD APIs", "Auth systems", "Dashboards", "Data processing", "File uploads"],
    tips: ["Use virtual environments", "Never store plain passwords", "Validate all inputs"],
    syntax: [
      {
        title: "Flask Application",
        code: `from flask import Flask, jsonify, request, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
db = SQLAlchemy(app)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True)
    password_hash = db.Column(db.String(256))

@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'email': u.email} for u in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    user = User(email=data['email'])
    user.password_hash = generate_password_hash(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'id': user.id}), 201`,
        explanation: "Flask handles HTTP methods with decorators. SQLAlchemy maps Python classes to tables."
      }
    ]
  },
  {
    name: "SQL",
    category: "Backend",
    description: "Database design, queries, and data manipulation",
    features: ["SQLite/PostgreSQL", "Schema design", "Relationships", "Indexes", "Transactions"],
    examples: ["User tables", "Product catalogs", "Orders", "Activity logs", "Analytics"],
    tips: ["Use parameterized queries", "Index frequently queried columns", "Use transactions"],
    syntax: [
      {
        title: "Table Creation & CRUD",
        code: `-- Create table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', 'hashed_pwd', 'admin');

-- Select with filter
SELECT * FROM users WHERE role = 'admin';

-- Update
UPDATE users SET role = 'moderator' WHERE id = 1;

-- Delete
DELETE FROM users WHERE id = 1;

-- Join
SELECT orders.*, users.email
FROM orders
INNER JOIN users ON orders.user_id = users.id;`,
        explanation: "SQL handles data definition (CREATE) and manipulation (INSERT/SELECT/UPDATE/DELETE)."
      }
    ]
  },
  {
    name: "Node.js",
    category: "Backend",
    description: "Server-side JavaScript with Express and async patterns",
    features: ["Express.js", "Middleware", "REST routing", "File system", "npm ecosystem"],
    examples: ["API servers", "WebSocket services", "Static file servers", "Microservices", "CLI tools"],
    tips: ["Use async/await", "Handle errors with middleware", "Use environment variables"],
    syntax: [
      {
        title: "Express Server",
        code: `import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const user = await findUser(id);
  res.json(user);
});

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  const user = await createUser({ name, email });
  res.status(201).json(user);
});

// Error middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(3000, () => console.log('Server running'));`,
        explanation: "Express uses middleware pattern. Routes handle HTTP methods."
      }
    ]
  }
];

export function DevGuide({ onSelectTemplate }: DevGuideProps) {
  const [selectedGuide, setSelectedGuide] = useState<LanguageGuide | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<DomainTemplate | null>(null);
  const [guideDialogOpen, setGuideDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const frontendGuides = languageGuides.filter(g => g.category === "Frontend");
  const backendGuides = languageGuides.filter(g => g.category === "Backend");
  const templatesByCategory = getTemplatesByCategory();

  const openGuide = (guide: LanguageGuide) => {
    setSelectedGuide(guide);
    setGuideDialogOpen(true);
  };

  const openTemplate = (template: DomainTemplate) => {
    setSelectedTemplate(template);
    setTemplateDialogOpen(true);
  };

  const useTemplate = (template: DomainTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template.prompt);
    }
    setTemplateDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" data-testid="button-dev-guide">
            <Book className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Development Guides
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="h-4 w-4 mr-2" />
              Frontend
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {frontendGuides.map(guide => (
                <DropdownMenuItem
                  key={guide.name}
                  onClick={() => openGuide(guide)}
                  data-testid={`menu-guide-${guide.name.toLowerCase()}`}
                >
                  {guide.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Server className="h-4 w-4 mr-2" />
              Backend
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {backendGuides.map(guide => (
                <DropdownMenuItem
                  key={guide.name}
                  onClick={() => openGuide(guide)}
                  data-testid={`menu-guide-${guide.name.toLowerCase()}`}
                >
                  {guide.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2 text-xs text-primary">
            <Sparkles className="h-3 w-3" />
            Functional Templates (Click to Generate)
          </DropdownMenuLabel>

          {Object.entries(templatesByCategory).map(([category, templates]) => (
            <DropdownMenuSub key={category}>
              <DropdownMenuSubTrigger>
                {categoryIcons[category] || <Zap className="h-4 w-4 mr-2" />}
                <span className="ml-2">{category}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{templates.length}</Badge>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {templates.map(template => (
                  <DropdownMenuItem
                    key={template.id}
                    onClick={() => openTemplate(template)}
                    className="flex-col items-start"
                    data-testid={`template-${template.id}`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Language Guide Dialog */}
      <Dialog open={guideDialogOpen} onOpenChange={setGuideDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedGuide && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  {selectedGuide.name} Guide
                  <Badge variant="secondary">{selectedGuide.category}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedGuide.description}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="syntax" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="syntax" className="flex items-center gap-1">
                    <FileCode className="h-3 w-3" />
                    Syntax
                  </TabsTrigger>
                  <TabsTrigger value="features" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Features
                  </TabsTrigger>
                  <TabsTrigger value="tips" className="flex items-center gap-1">
                    <Book className="h-3 w-3" />
                    Tips
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="syntax">
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      {selectedGuide.syntax.map((item, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden">
                          <div className="bg-muted px-4 py-2 border-b">
                            <h3 className="font-semibold flex items-center gap-2">
                              <Terminal className="h-4 w-4 text-primary" />
                              {item.title}
                            </h3>
                          </div>
                          <pre className="p-4 overflow-x-auto text-xs bg-zinc-950 text-zinc-100">
                            <code>{item.code}</code>
                          </pre>
                          <div className="px-4 py-2 bg-primary/5 text-sm text-muted-foreground">
                            {item.explanation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="features">
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <section>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          Features Supported
                        </h3>
                        <ul className="space-y-2">
                          {selectedGuide.features.map((feature, i) => (
                            <li key={i} className="text-sm flex items-start gap-2 bg-muted/50 p-2 rounded-md">
                              <span className="text-primary font-bold">*</span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section>
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                          <Layers className="h-4 w-4 text-primary" />
                          What You Can Build
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedGuide.examples.map((example, i) => (
                            <Badge key={i} variant="outline" className="text-sm">{example}</Badge>
                          ))}
                        </div>
                      </section>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tips">
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Book className="h-4 w-4 text-primary" />
                        Best Practices
                      </h3>
                      <ul className="space-y-3">
                        {selectedGuide.tips.map((tip, i) => (
                          <li key={i} className="text-sm bg-muted/50 p-3 rounded-md border-l-4 border-primary">
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Domain Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {selectedTemplate.name}
                  <Badge style={{ backgroundColor: selectedTemplate.color, color: 'white' }}>
                    {selectedTemplate.category}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <section>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Features Included
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.features.map((feature, i) => (
                      <Badge key={i} variant="outline">{feature}</Badge>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Database Models
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.models.map((model, i) => (
                      <Badge key={i} variant="secondary">{model}</Badge>
                    ))}
                  </div>
                </section>

                <section className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">What You'll Get</h3>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>* Complete Flask backend with SQLite database</li>
                    <li>* User authentication (admin/admin123)</li>
                    <li>* Full CRUD operations for all models</li>
                    <li>* Responsive frontend dashboard</li>
                    <li>* Demo mode with sample data</li>
                  </ul>
                </section>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => useTemplate(selectedTemplate)}
                    data-testid="button-use-template"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate This App
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setTemplateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}