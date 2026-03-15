export interface DeploymentGuide {
  platform: string;
  icon: string;
  steps: string[];
  configFiles: { name: string; content: string }[];
  commands: string[];
  url: string;
  features: string[];
}

export interface ProjectAnalysis {
  type: "static" | "node" | "react" | "nextjs" | "express" | "fullstack";
  framework?: string;
  hasDatabase: boolean;
  hasAuth: boolean;
  dependencies: string[];
  envVars: string[];
}

export function analyzeProject(files: { path: string; content: string }[]): ProjectAnalysis {
  const analysis: ProjectAnalysis = {
    type: "static",
    hasDatabase: false,
    hasAuth: false,
    dependencies: [],
    envVars: [],
  };

  const packageJson = files.find(f => f.path.includes("package.json"));
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content);
      analysis.dependencies = Object.keys(pkg.dependencies || {});

      if (analysis.dependencies.includes("next")) {
        analysis.type = "nextjs";
        analysis.framework = "Next.js";
      } else if (analysis.dependencies.includes("express")) {
        analysis.type = "express";
        analysis.framework = "Express.js";
      } else if (analysis.dependencies.includes("react")) {
        analysis.type = "react";
        analysis.framework = "React";
      } else if (analysis.dependencies.includes("vue")) {
        analysis.type = "react";
        analysis.framework = "Vue.js";
      }

      if (analysis.dependencies.some(d => ["pg", "mysql2", "mongodb", "prisma", "drizzle-orm"].includes(d))) {
        analysis.hasDatabase = true;
      }

      if (analysis.dependencies.some(d => ["passport", "next-auth", "jsonwebtoken", "bcrypt"].includes(d))) {
        analysis.hasAuth = true;
      }
    } catch (e) {
      console.error("Failed to parse package.json");
    }
  }

  const hasHtml = files.some(f => f.path.endsWith(".html"));
  const hasJs = files.some(f => f.path.endsWith(".js") || f.path.endsWith(".ts"));

  if (!packageJson && hasHtml) {
    analysis.type = "static";
  }

  for (const file of files) {
    const envMatches = file.content.match(/process\.env\.(\w+)|import\.meta\.env\.(\w+)/g);
    if (envMatches) {
      for (const match of envMatches) {
        const varName = match.replace(/process\.env\.|import\.meta\.env\./, "");
        if (!analysis.envVars.includes(varName)) {
          analysis.envVars.push(varName);
        }
      }
    }
  }

  return analysis;
}

export function generateDeploymentGuides(analysis: ProjectAnalysis): DeploymentGuide[] {
  const guides: DeploymentGuide[] = [];

  // PaaS - Easy deployment
  guides.push(generateVercelGuide(analysis));
  guides.push(generateNetlifyGuide(analysis));
  guides.push(generateReplitGuide(analysis));
  guides.push(generateRailwayGuide(analysis));

  // Cloud Providers - Enterprise deployment
  guides.push(generateAWSGuide(analysis));
  guides.push(generateGCPGuide(analysis));
  guides.push(generateAzureGuide(analysis));

  return guides;
}

function generateVercelGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps = [
    "Sign up or log in to Vercel (vercel.com)",
    "Click 'Add New Project'",
    "Import your Git repository or drag & drop your project folder",
  ];

  const commands: string[] = [];
  const configFiles: { name: string; content: string }[] = [];

  if (analysis.type === "react" || analysis.type === "nextjs") {
    steps.push("Vercel will auto-detect your framework");
    steps.push("Configure environment variables if needed");
    steps.push("Click 'Deploy'");
  } else if (analysis.type === "express" || analysis.type === "fullstack") {
    steps.push("Add vercel.json configuration for serverless functions");
    configFiles.push({
      name: "vercel.json",
      content: JSON.stringify({
        version: 2,
        builds: [{ src: "*.js", use: "@vercel/node" }],
        routes: [{ src: "/(.*)", dest: "/" }],
      }, null, 2),
    });
  } else {
    steps.push("Set output directory to your build folder");
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Add environment variables: ${analysis.envVars.join(", ")}`);
  }

  commands.push("npm i -g vercel");
  commands.push("vercel login");
  commands.push("vercel --prod");

  return {
    platform: "Vercel",
    icon: "▲",
    steps,
    configFiles,
    commands,
    url: "https://vercel.com",
    features: ["Automatic HTTPS", "Edge Functions", "Preview Deployments", "Analytics"],
  };
}

function generateNetlifyGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps = [
    "Sign up or log in to Netlify (netlify.com)",
    "Click 'Add new site' → 'Import an existing project'",
    "Connect your Git repository",
  ];

  const commands: string[] = [];
  const configFiles: { name: string; content: string }[] = [];

  if (analysis.type === "react") {
    steps.push("Set build command: npm run build");
    steps.push("Set publish directory: dist or build");
  } else if (analysis.type === "express" || analysis.type === "fullstack") {
    steps.push("Create netlify.toml for serverless functions");
    configFiles.push({
      name: "netlify.toml",
      content: `[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200`,
    });
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Add environment variables in Site settings → Environment variables`);
  }

  steps.push("Click 'Deploy site'");

  commands.push("npm i -g netlify-cli");
  commands.push("netlify login");
  commands.push("netlify deploy --prod");

  return {
    platform: "Netlify",
    icon: "◆",
    steps,
    configFiles,
    commands,
    url: "https://netlify.com",
    features: ["Form Handling", "Serverless Functions", "Split Testing", "Identity"],
  };
}

function generateReplitGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps = [
    "Sign up or log in to Replit (replit.com)",
    "Create a new Repl and import your code",
    "Click the 'Run' button to start your app",
    "Click 'Deploy' in the top right",
    "Choose 'Autoscale' for production apps",
    "Configure your deployment settings",
    "Click 'Deploy' to publish",
  ];

  if (analysis.envVars.length > 0) {
    steps.splice(3, 0, `Add secrets in the Secrets tab: ${analysis.envVars.join(", ")}`);
  }

  return {
    platform: "Replit",
    icon: "◎",
    steps,
    configFiles: [],
    commands: [],
    url: "https://replit.com",
    features: ["Built-in Database", "Always-on Hosting", "Multiplayer Editing", "GitHub Sync"],
  };
}

function generateRailwayGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps = [
    "Sign up or log in to Railway (railway.app)",
    "Click 'New Project' → 'Deploy from GitHub repo'",
    "Select your repository",
    "Railway auto-detects your framework and builds",
  ];

  if (analysis.hasDatabase) {
    steps.push("Add a PostgreSQL database: New → Database → PostgreSQL");
    steps.push("Railway auto-injects DATABASE_URL");
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Add variables in the Variables tab: ${analysis.envVars.join(", ")}`);
  }

  steps.push("Your app deploys automatically!");

  return {
    platform: "Railway",
    icon: "🚂",
    steps,
    configFiles: [],
    commands: ["npm i -g @railway/cli", "railway login", "railway up"],
    url: "https://railway.app",
    features: ["PostgreSQL Included", "Redis Available", "Auto Deploys", "Usage-based Pricing"],
  };
}

// ==================== AWS DEPLOYMENT ====================
function generateAWSGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps: string[] = [];
  const commands: string[] = [];
  const configFiles: { name: string; content: string }[] = [];

  if (analysis.type === "static" || analysis.type === "react") {
    // S3 + CloudFront for static sites
    steps.push(
      "Create an S3 bucket with static website hosting enabled",
      "Build your project: npm run build",
      "Upload build files to S3 bucket",
      "Create CloudFront distribution pointing to S3",
      "Configure custom domain in Route 53 (optional)",
      "Enable HTTPS with ACM certificate"
    );

    commands.push(
      "# Install AWS CLI",
      "pip install awscli",
      "aws configure",
      "",
      "# Build and deploy to S3",
      "npm run build",
      'aws s3 sync ./dist s3://your-bucket-name --delete',
      "",
      "# Invalidate CloudFront cache",
      'aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"'
    );

    configFiles.push({
      name: "buildspec.yml",
      content: `version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 18
    commands:
      - npm ci
  build:
    commands:
      - npm run build
artifacts:
  files:
    - '**/*'
  base-directory: dist`
    });

  } else if (analysis.type === "express" || analysis.type === "fullstack") {
    // Elastic Beanstalk or ECS for backend
    steps.push(
      "Install AWS CLI and EB CLI",
      "Initialize Elastic Beanstalk: eb init",
      "Create environment: eb create production",
      "Configure environment variables in EB console",
      "Deploy: eb deploy"
    );

    if (analysis.hasDatabase) {
      steps.push(
        "Create RDS PostgreSQL instance",
        "Add DATABASE_URL to EB environment variables",
        "Configure security groups for RDS access"
      );
    }

    commands.push(
      "# Install EB CLI",
      "pip install awsebcli",
      "",
      "# Initialize and deploy",
      "eb init -p node.js your-app-name",
      "eb create production",
      "eb deploy",
      "",
      "# Set environment variables",
      'eb setenv NODE_ENV=production DATABASE_URL=your-db-url'
    );

    configFiles.push({
      name: ".ebextensions/nodecommand.config",
      content: `option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production`
    });

    configFiles.push({
      name: "Procfile",
      content: "web: npm start"
    });

  } else if (analysis.type === "nextjs") {
    // AWS Amplify for Next.js
    steps.push(
      "Sign in to AWS Amplify Console",
      "Click 'Host web app' → Connect repository",
      "Select your Git provider and repository",
      "Amplify auto-detects Next.js settings",
      "Configure environment variables",
      "Click 'Save and deploy'"
    );

    commands.push(
      "# Install Amplify CLI",
      "npm install -g @aws-amplify/cli",
      "amplify configure",
      "",
      "# Initialize and publish",
      "amplify init",
      "amplify add hosting",
      "amplify publish"
    );

    configFiles.push({
      name: "amplify.yml",
      content: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*`
    });
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Configure environment variables: ${analysis.envVars.join(", ")}`);
  }

  return {
    platform: "AWS",
    icon: "☁️",
    steps,
    configFiles,
    commands,
    url: "https://aws.amazon.com",
    features: ["Global Infrastructure", "Auto Scaling", "Load Balancing", "RDS Databases", "Lambda Functions", "S3 Storage"],
  };
}

// ==================== GCP DEPLOYMENT ====================
function generateGCPGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps: string[] = [];
  const commands: string[] = [];
  const configFiles: { name: string; content: string }[] = [];

  if (analysis.type === "static" || analysis.type === "react") {
    // Firebase Hosting for static sites
    steps.push(
      "Install Firebase CLI: npm install -g firebase-tools",
      "Login to Firebase: firebase login",
      "Initialize project: firebase init",
      "Select 'Hosting' and your Firebase project",
      "Build your app: npm run build",
      "Deploy: firebase deploy"
    );

    commands.push(
      "# Install Firebase CLI",
      "npm install -g firebase-tools",
      "",
      "# Login and initialize",
      "firebase login",
      "firebase init hosting",
      "",
      "# Build and deploy",
      "npm run build",
      "firebase deploy --only hosting"
    );

    configFiles.push({
      name: "firebase.json",
      content: JSON.stringify({
        hosting: {
          public: "dist",
          ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
          rewrites: [{ source: "**", destination: "/index.html" }]
        }
      }, null, 2)
    });

  } else if (analysis.type === "express" || analysis.type === "fullstack") {
    // Cloud Run for containers / App Engine for Node.js
    steps.push(
      "Install Google Cloud SDK",
      "Login: gcloud auth login",
      "Set project: gcloud config set project YOUR_PROJECT",
      "Deploy to Cloud Run: gcloud run deploy",
      "Or deploy to App Engine: gcloud app deploy"
    );

    if (analysis.hasDatabase) {
      steps.push(
        "Create Cloud SQL PostgreSQL instance",
        "Enable Cloud SQL Admin API",
        "Add DATABASE_URL to Cloud Run environment"
      );
    }

    commands.push(
      "# Install gcloud CLI (visit cloud.google.com/sdk)",
      "",
      "# Login and set project",
      "gcloud auth login",
      "gcloud config set project YOUR_PROJECT_ID",
      "",
      "# Deploy to Cloud Run (containerized)",
      "gcloud run deploy your-service --source . --region us-central1 --allow-unauthenticated",
      "",
      "# Or deploy to App Engine",
      "gcloud app deploy"
    );

    configFiles.push({
      name: "app.yaml",
      content: `runtime: nodejs18

instance_class: F2

env_variables:
  NODE_ENV: "production"

handlers:
  - url: /.*
    script: auto
    secure: always`
    });

    configFiles.push({
      name: "Dockerfile",
      content: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
ENV PORT 8080
CMD ["npm", "start"]`
    });

    configFiles.push({
      name: ".dockerignore",
      content: `node_modules
npm-debug.log
.git
.gitignore`
    });

  } else if (analysis.type === "nextjs") {
    // Firebase or Cloud Run for Next.js
    steps.push(
      "Install Firebase CLI",
      "Enable Firebase Hosting with Cloud Functions",
      "Configure firebase.json for Next.js SSR",
      "Build and deploy: firebase deploy"
    );

    commands.push(
      "# Install Firebase CLI",
      "npm install -g firebase-tools",
      "",
      "# Login and initialize with SSR",
      "firebase login",
      "firebase init hosting",
      "firebase init functions",
      "",
      "# Build and deploy",
      "npm run build",
      "firebase deploy"
    );
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Set environment variables in Cloud Console: ${analysis.envVars.join(", ")}`);
  }

  return {
    platform: "Google Cloud",
    icon: "🔷",
    steps,
    configFiles,
    commands,
    url: "https://cloud.google.com",
    features: ["Cloud Run", "App Engine", "Cloud SQL", "Firebase Hosting", "Cloud Functions", "Global CDN"],
  };
}

// ==================== AZURE DEPLOYMENT ====================
function generateAzureGuide(analysis: ProjectAnalysis): DeploymentGuide {
  const steps: string[] = [];
  const commands: string[] = [];
  const configFiles: { name: string; content: string }[] = [];

  if (analysis.type === "static" || analysis.type === "react") {
    // Azure Static Web Apps
    steps.push(
      "Sign in to Azure Portal (portal.azure.com)",
      "Create a new Static Web App resource",
      "Connect to your GitHub repository",
      "Azure auto-detects build settings",
      "Configure environment variables in Configuration",
      "Deployment happens automatically on push"
    );

    commands.push(
      "# Install Azure CLI",
      "# macOS: brew install azure-cli",
      "# Windows: Download from aka.ms/installazurecli",
      "",
      "# Login and create Static Web App",
      "az login",
      "az staticwebapp create --name your-app --resource-group your-rg --source https://github.com/user/repo --branch main --app-location '/' --output-location 'dist'",
      "",
      "# Or use SWA CLI",
      "npm install -g @azure/static-web-apps-cli",
      "swa init",
      "swa deploy"
    );

    configFiles.push({
      name: "staticwebapp.config.json",
      content: JSON.stringify({
        navigationFallback: {
          rewrite: "/index.html",
          exclude: ["/images/*.{png,jpg,gif}", "/css/*"]
        },
        routes: [
          { route: "/api/*", allowedRoles: ["authenticated"] }
        ],
        globalHeaders: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY"
        }
      }, null, 2)
    });

  } else if (analysis.type === "express" || analysis.type === "fullstack") {
    // Azure App Service
    steps.push(
      "Sign in to Azure Portal",
      "Create a new App Service (Web App)",
      "Select Node.js runtime",
      "Configure deployment source (GitHub, local Git, or ZIP)",
      "Set environment variables in Configuration → Application settings"
    );

    if (analysis.hasDatabase) {
      steps.push(
        "Create Azure Database for PostgreSQL",
        "Get connection string from Azure portal",
        "Add DATABASE_URL to Application settings"
      );
    }

    steps.push(
      "Deploy your code",
      "Enable 'Always On' for production apps"
    );

    commands.push(
      "# Install Azure CLI",
      "az login",
      "",
      "# Create resource group and App Service plan",
      "az group create --name myResourceGroup --location eastus",
      "az appservice plan create --name myPlan --resource-group myResourceGroup --sku B1 --is-linux",
      "",
      "# Create web app",
      'az webapp create --resource-group myResourceGroup --plan myPlan --name your-app-name --runtime "NODE:18-lts"',
      "",
      "# Deploy from local",
      "az webapp up --name your-app-name --resource-group myResourceGroup",
      "",
      "# Or deploy from GitHub",
      "az webapp deployment source config --name your-app-name --resource-group myResourceGroup --repo-url https://github.com/user/repo --branch main"
    );

    configFiles.push({
      name: "web.config",
      content: `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\\/debug[\\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
    <iisnode watchedFiles="web.config;*.js"/>
  </system.webServer>
</configuration>`
    });

  } else if (analysis.type === "nextjs") {
    // Azure Static Web Apps with SSR or App Service
    steps.push(
      "Use Azure Static Web Apps for Next.js",
      "Create Static Web App in Azure Portal",
      "Connect GitHub repository",
      "Azure detects Next.js and configures build",
      "Add environment variables in Configuration"
    );

    commands.push(
      "# Install SWA CLI for local development",
      "npm install -g @azure/static-web-apps-cli",
      "",
      "# Build and deploy",
      "npm run build",
      "swa deploy .next --env production"
    );
  }

  if (analysis.envVars.length > 0) {
    steps.push(`Add Application settings: ${analysis.envVars.join(", ")}`);
  }

  return {
    platform: "Azure",
    icon: "🔵",
    steps,
    configFiles,
    commands,
    url: "https://azure.microsoft.com",
    features: ["App Service", "Static Web Apps", "Azure Functions", "Azure SQL", "Azure CDN", "Active Directory"],
  };
}

export function generatePackageJson(
  projectName: string,
  type: ProjectAnalysis["type"],
  dependencies: Record<string, string> = {}
): string {
  const baseDeps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};
  let scripts: Record<string, string> = {};

  switch (type) {
    case "react":
      Object.assign(baseDeps, {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      });
      Object.assign(devDeps, {
        vite: "^5.0.0",
      });
      scripts = {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      };
      break;
    case "express":
      Object.assign(baseDeps, {
        express: "^4.18.2",
      });
      scripts = {
        start: "node server.js",
        dev: "node --watch server.js",
      };
      break;
    case "nextjs":
      Object.assign(baseDeps, {
        next: "^14.0.0",
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      });
      scripts = {
        dev: "next dev",
        build: "next build",
        start: "next start",
      };
      break;
    default:
      scripts = {
        start: "npx serve .",
      };
  }

  return JSON.stringify(
    {
      name: projectName.toLowerCase().replace(/\s+/g, "-"),
      version: "1.0.0",
      type: "module",
      scripts,
      dependencies: { ...baseDeps, ...dependencies },
      devDependencies: devDeps,
    },
    null,
    2
  );
}