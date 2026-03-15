export interface DetectedFramework {
  category: string;
  name: string;
  version?: string;
  confidence: number;
  evidence: string[];
}

export interface TechStackProfile {
  frontend: DetectedFramework | null;
  backend: DetectedFramework | null;
  orm: DetectedFramework | null;
  auth: DetectedFramework | null;
  css: DetectedFramework | null;
  buildTool: DetectedFramework | null;
  testFramework: DetectedFramework | null;
  stateManagement: DetectedFramework | null;
  language: DetectedFramework | null;
  additional: DetectedFramework[];
  summary: string;
}

interface FileInfo {
  path: string;
  content: string;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  name?: string;
}

const FRONTEND_SIGNATURES: Record<string, { packages: string[]; filePatterns: RegExp[]; importPatterns: RegExp[]; configFiles: string[] }> = {
  'React': {
    packages: ['react', 'react-dom'],
    filePatterns: [/\.jsx$/, /\.tsx$/],
    importPatterns: [/from\s+['"]react['"]/, /import\s+React/],
    configFiles: [],
  },
  'Vue': {
    packages: ['vue'],
    filePatterns: [/\.vue$/],
    importPatterns: [/from\s+['"]vue['"]/, /createApp/],
    configFiles: ['vue.config.js', 'vue.config.ts'],
  },
  'Angular': {
    packages: ['@angular/core', '@angular/common'],
    filePatterns: [/\.component\.ts$/, /\.module\.ts$/],
    importPatterns: [/from\s+['"]@angular\/core['"]/, /@Component/, /@NgModule/],
    configFiles: ['angular.json'],
  },
  'Svelte': {
    packages: ['svelte'],
    filePatterns: [/\.svelte$/],
    importPatterns: [/from\s+['"]svelte['"]/, /from\s+['"]svelte\//],
    configFiles: ['svelte.config.js', 'svelte.config.ts'],
  },
  'Next.js': {
    packages: ['next'],
    filePatterns: [/pages\/.*\.(tsx|jsx|ts|js)$/, /app\/.*\/page\.(tsx|jsx|ts|js)$/],
    importPatterns: [/from\s+['"]next\//, /getServerSideProps|getStaticProps/],
    configFiles: ['next.config.js', 'next.config.ts', 'next.config.mjs'],
  },
  'Nuxt': {
    packages: ['nuxt', 'nuxt3'],
    filePatterns: [/\.nuxt\//, /pages\/.*\.vue$/],
    importPatterns: [/from\s+['"]#app['"]/, /defineNuxtConfig/],
    configFiles: ['nuxt.config.js', 'nuxt.config.ts'],
  },
  'Solid': {
    packages: ['solid-js'],
    filePatterns: [/\.tsx$/, /\.jsx$/],
    importPatterns: [/from\s+['"]solid-js['"]/, /createSignal|createEffect/],
    configFiles: [],
  },
  'Astro': {
    packages: ['astro'],
    filePatterns: [/\.astro$/],
    importPatterns: [/from\s+['"]astro['"]/, /---[\s\S]*---/],
    configFiles: ['astro.config.mjs', 'astro.config.ts'],
  },
};

const BACKEND_SIGNATURES: Record<string, { packages: string[]; importPatterns: RegExp[]; filePatterns: RegExp[] }> = {
  'Express': {
    packages: ['express'],
    importPatterns: [/from\s+['"]express['"]/, /require\(['"]express['"]\)/, /app\.get|app\.post|app\.use|app\.listen/],
    filePatterns: [/server\.(ts|js)$/, /app\.(ts|js)$/],
  },
  'Fastify': {
    packages: ['fastify'],
    importPatterns: [/from\s+['"]fastify['"]/, /require\(['"]fastify['"]\)/],
    filePatterns: [],
  },
  'NestJS': {
    packages: ['@nestjs/core', '@nestjs/common'],
    importPatterns: [/from\s+['"]@nestjs\//, /@Controller|@Injectable|@Module/],
    filePatterns: [/\.controller\.ts$/, /\.service\.ts$/, /\.module\.ts$/],
  },
  'Koa': {
    packages: ['koa'],
    importPatterns: [/from\s+['"]koa['"]/, /require\(['"]koa['"]\)/],
    filePatterns: [],
  },
  'Hono': {
    packages: ['hono'],
    importPatterns: [/from\s+['"]hono['"]/, /new Hono/],
    filePatterns: [],
  },
  'Hapi': {
    packages: ['@hapi/hapi'],
    importPatterns: [/from\s+['"]@hapi\/hapi['"]/, /require\(['"]@hapi\/hapi['"]\)/],
    filePatterns: [],
  },
  'Flask': {
    packages: ['flask'],
    importPatterns: [/from\s+flask\s+import/, /import\s+flask/],
    filePatterns: [/app\.py$/, /wsgi\.py$/],
  },
  'Django': {
    packages: ['django'],
    importPatterns: [/from\s+django/, /import\s+django/],
    filePatterns: [/manage\.py$/, /settings\.py$/, /urls\.py$/],
  },
  'FastAPI': {
    packages: ['fastapi'],
    importPatterns: [/from\s+fastapi\s+import/, /import\s+fastapi/],
    filePatterns: [/main\.py$/],
  },
};

const ORM_SIGNATURES: Record<string, { packages: string[]; importPatterns: RegExp[]; configFiles: string[] }> = {
  'Drizzle': {
    packages: ['drizzle-orm', 'drizzle-kit'],
    importPatterns: [/from\s+['"]drizzle-orm['"]/, /pgTable|mysqlTable|sqliteTable/, /drizzle\(/],
    configFiles: ['drizzle.config.ts', 'drizzle.config.js'],
  },
  'Prisma': {
    packages: ['@prisma/client', 'prisma'],
    importPatterns: [/from\s+['"]@prisma\/client['"]/, /PrismaClient/, /prisma\.\w+\.findMany/],
    configFiles: ['prisma/schema.prisma'],
  },
  'TypeORM': {
    packages: ['typeorm'],
    importPatterns: [/from\s+['"]typeorm['"]/, /@Entity|@Column|@PrimaryGeneratedColumn/],
    configFiles: ['ormconfig.json', 'ormconfig.ts'],
  },
  'Sequelize': {
    packages: ['sequelize'],
    importPatterns: [/from\s+['"]sequelize['"]/, /Sequelize/, /sequelize\.define/],
    configFiles: ['.sequelizerc'],
  },
  'Mongoose': {
    packages: ['mongoose'],
    importPatterns: [/from\s+['"]mongoose['"]/, /mongoose\.model|mongoose\.Schema|new Schema/],
    configFiles: [],
  },
  'Knex': {
    packages: ['knex'],
    importPatterns: [/from\s+['"]knex['"]/, /knex\(|knex\.migrate/],
    configFiles: ['knexfile.ts', 'knexfile.js'],
  },
  'SQLAlchemy': {
    packages: ['sqlalchemy', 'flask-sqlalchemy'],
    importPatterns: [/from\s+sqlalchemy/, /import\s+sqlalchemy/, /db\.Model/],
    configFiles: [],
  },
};

const AUTH_SIGNATURES: Record<string, { packages: string[]; importPatterns: RegExp[] }> = {
  'NextAuth': { packages: ['next-auth'], importPatterns: [/from\s+['"]next-auth['"]/, /NextAuth|getServerSession/] },
  'Passport': { packages: ['passport'], importPatterns: [/from\s+['"]passport['"]/, /passport\.use|passport\.authenticate/] },
  'Auth0': { packages: ['@auth0/nextjs-auth0', 'auth0', '@auth0/auth0-react'], importPatterns: [/from\s+['"]@auth0\//, /Auth0Provider/] },
  'Clerk': { packages: ['@clerk/nextjs', '@clerk/clerk-react'], importPatterns: [/from\s+['"]@clerk\//, /ClerkProvider/] },
  'Lucia': { packages: ['lucia', 'lucia-auth'], importPatterns: [/from\s+['"]lucia['"]/, /lucia\(/] },
  'Firebase Auth': { packages: ['firebase', 'firebase-admin'], importPatterns: [/firebase\/auth/, /getAuth|signInWith/] },
  'Supabase Auth': { packages: ['@supabase/supabase-js'], importPatterns: [/supabase\.auth/, /createClient.*supabase/] },
  'JWT (manual)': { packages: ['jsonwebtoken', 'jose'], importPatterns: [/from\s+['"]jsonwebtoken['"]/, /jwt\.sign|jwt\.verify/] },
  'bcrypt': { packages: ['bcrypt', 'bcryptjs'], importPatterns: [/from\s+['"]bcrypt/, /bcrypt\.hash|bcrypt\.compare/] },
};

const CSS_SIGNATURES: Record<string, { packages: string[]; filePatterns: RegExp[]; importPatterns: RegExp[]; configFiles: string[] }> = {
  'Tailwind CSS': {
    packages: ['tailwindcss'],
    filePatterns: [/tailwind\.config\.(ts|js|cjs|mjs)$/],
    importPatterns: [/className=.*"[^"]*(?:flex|grid|p-|m-|text-|bg-|rounded|shadow)/],
    configFiles: ['tailwind.config.ts', 'tailwind.config.js'],
  },
  'Styled Components': {
    packages: ['styled-components'],
    filePatterns: [],
    importPatterns: [/from\s+['"]styled-components['"]/, /styled\.\w+`/],
    configFiles: [],
  },
  'Emotion': {
    packages: ['@emotion/react', '@emotion/styled'],
    filePatterns: [],
    importPatterns: [/from\s+['"]@emotion\//, /css`/, /styled\(/],
    configFiles: [],
  },
  'CSS Modules': {
    packages: [],
    filePatterns: [/\.module\.css$/, /\.module\.scss$/],
    importPatterns: [/import\s+\w+\s+from\s+['"].*\.module\.(css|scss)['"]/],
    configFiles: [],
  },
  'Sass/SCSS': {
    packages: ['sass', 'node-sass'],
    filePatterns: [/\.scss$/, /\.sass$/],
    importPatterns: [],
    configFiles: [],
  },
  'Material UI': {
    packages: ['@mui/material', '@material-ui/core'],
    filePatterns: [],
    importPatterns: [/from\s+['"]@mui\//, /from\s+['"]@material-ui\//],
    configFiles: [],
  },
  'Chakra UI': {
    packages: ['@chakra-ui/react'],
    filePatterns: [],
    importPatterns: [/from\s+['"]@chakra-ui\//],
    configFiles: [],
  },
  'Ant Design': {
    packages: ['antd'],
    filePatterns: [],
    importPatterns: [/from\s+['"]antd['"]/, /from\s+['"]antd\//],
    configFiles: [],
  },
  'shadcn/ui': {
    packages: [],
    filePatterns: [/components\/ui\/.*\.(tsx|jsx)$/],
    importPatterns: [/from\s+['"]@\/components\/ui\//, /from\s+['"]\.\/ui\//],
    configFiles: ['components.json'],
  },
};

const BUILD_TOOL_SIGNATURES: Record<string, { packages: string[]; configFiles: string[] }> = {
  'Vite': { packages: ['vite'], configFiles: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'] },
  'Webpack': { packages: ['webpack'], configFiles: ['webpack.config.js', 'webpack.config.ts'] },
  'esbuild': { packages: ['esbuild'], configFiles: [] },
  'Rollup': { packages: ['rollup'], configFiles: ['rollup.config.js', 'rollup.config.ts'] },
  'Parcel': { packages: ['parcel'], configFiles: ['.parcelrc'] },
  'Turbopack': { packages: ['@vercel/turbopack'], configFiles: [] },
};

const TEST_SIGNATURES: Record<string, { packages: string[]; filePatterns: RegExp[]; configFiles: string[] }> = {
  'Jest': { packages: ['jest', '@jest/core'], filePatterns: [/\.test\.(ts|tsx|js|jsx)$/, /\.spec\.(ts|tsx|js|jsx)$/, /__tests__\//], configFiles: ['jest.config.ts', 'jest.config.js'] },
  'Vitest': { packages: ['vitest'], filePatterns: [/\.test\.(ts|tsx|js|jsx)$/, /\.spec\.(ts|tsx|js|jsx)$/], configFiles: ['vitest.config.ts'] },
  'Playwright': { packages: ['@playwright/test'], filePatterns: [/\.spec\.(ts|tsx|js|jsx)$/, /e2e\//], configFiles: ['playwright.config.ts'] },
  'Cypress': { packages: ['cypress'], filePatterns: [/cypress\//, /\.cy\.(ts|tsx|js|jsx)$/], configFiles: ['cypress.config.ts', 'cypress.config.js'] },
  'Mocha': { packages: ['mocha'], filePatterns: [/\.test\.(ts|tsx|js|jsx)$/, /\.spec\.(ts|tsx|js|jsx)$/], configFiles: ['.mocharc.yml'] },
  'Testing Library': { packages: ['@testing-library/react', '@testing-library/jest-dom'], filePatterns: [], configFiles: [] },
};

const STATE_MANAGEMENT_SIGNATURES: Record<string, { packages: string[]; importPatterns: RegExp[] }> = {
  'Redux': { packages: ['@reduxjs/toolkit', 'redux', 'react-redux'], importPatterns: [/from\s+['"]@reduxjs\/toolkit['"]/, /createSlice|configureStore/] },
  'Zustand': { packages: ['zustand'], importPatterns: [/from\s+['"]zustand['"]/, /create\(\s*\(/] },
  'MobX': { packages: ['mobx', 'mobx-react'], importPatterns: [/from\s+['"]mobx['"]/, /@observable|@action|makeAutoObservable/] },
  'Jotai': { packages: ['jotai'], importPatterns: [/from\s+['"]jotai['"]/, /atom\(|useAtom/] },
  'Recoil': { packages: ['recoil'], importPatterns: [/from\s+['"]recoil['"]/, /atom\(|selector\(|useRecoilState/] },
  'TanStack Query': { packages: ['@tanstack/react-query'], importPatterns: [/from\s+['"]@tanstack\/react-query['"]/, /useQuery|useMutation|QueryClient/] },
  'SWR': { packages: ['swr'], importPatterns: [/from\s+['"]swr['"]/, /useSWR/] },
  'Pinia': { packages: ['pinia'], importPatterns: [/from\s+['"]pinia['"]/, /defineStore/] },
  'Vuex': { packages: ['vuex'], importPatterns: [/from\s+['"]vuex['"]/, /createStore|useStore/] },
  'XState': { packages: ['xstate', '@xstate/react'], importPatterns: [/from\s+['"]xstate['"]/, /createMachine|useMachine/] },
  'Valtio': { packages: ['valtio'], importPatterns: [/from\s+['"]valtio['"]/, /proxy\(|useSnapshot/] },
};

const LANGUAGE_INDICATORS: Record<string, { extensions: string[]; configFiles: string[] }> = {
  'TypeScript': { extensions: ['.ts', '.tsx'], configFiles: ['tsconfig.json'] },
  'JavaScript': { extensions: ['.js', '.jsx', '.mjs', '.cjs'], configFiles: [] },
  'Python': { extensions: ['.py'], configFiles: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'] },
  'Go': { extensions: ['.go'], configFiles: ['go.mod', 'go.sum'] },
  'Rust': { extensions: ['.rs'], configFiles: ['Cargo.toml'] },
  'Ruby': { extensions: ['.rb', '.erb'], configFiles: ['Gemfile', 'Rakefile'] },
  'PHP': { extensions: ['.php'], configFiles: ['composer.json'] },
  'Java': { extensions: ['.java'], configFiles: ['pom.xml', 'build.gradle'] },
  'C#': { extensions: ['.cs'], configFiles: ['*.csproj', '*.sln'] },
  'Dart': { extensions: ['.dart'], configFiles: ['pubspec.yaml'] },
  'Elixir': { extensions: ['.ex', '.exs'], configFiles: ['mix.exs'] },
  'Kotlin': { extensions: ['.kt', '.kts'], configFiles: ['build.gradle.kts'] },
  'Swift': { extensions: ['.swift'], configFiles: ['Package.swift'] },
};

const ADDITIONAL_TOOL_SIGNATURES: Record<string, { packages: string[]; importPatterns: RegExp[] }> = {
  'Socket.IO': { packages: ['socket.io', 'socket.io-client'], importPatterns: [/from\s+['"]socket\.io['"]/, /io\(/] },
  'GraphQL': { packages: ['graphql', '@apollo/server', '@apollo/client', 'graphql-yoga'], importPatterns: [/from\s+['"]graphql['"]/, /gql`/, /useQuery.*gql/] },
  'tRPC': { packages: ['@trpc/server', '@trpc/client', '@trpc/react-query'], importPatterns: [/from\s+['"]@trpc\//, /createTRPCRouter|trpc\./] },
  'Stripe': { packages: ['stripe', '@stripe/stripe-js', '@stripe/react-stripe-js'], importPatterns: [/from\s+['"]stripe['"]/, /Stripe\(/] },
  'AWS SDK': { packages: ['@aws-sdk/client-s3', 'aws-sdk'], importPatterns: [/from\s+['"]@aws-sdk\//, /from\s+['"]aws-sdk['"]/] },
  'Docker': { packages: [], importPatterns: [/FROM\s+\w+/, /EXPOSE\s+\d+/] },
  'Redis': { packages: ['redis', 'ioredis'], importPatterns: [/from\s+['"](?:io)?redis['"]/, /createClient.*redis/] },
  'Zod': { packages: ['zod'], importPatterns: [/from\s+['"]zod['"]/, /z\.object|z\.string|z\.number/] },
  'i18next': { packages: ['i18next', 'react-i18next'], importPatterns: [/from\s+['"]i18next['"]/, /useTranslation/] },
  'Storybook': { packages: ['@storybook/react'], importPatterns: [/from\s+['"]@storybook\//] },
  'React Router': { packages: ['react-router-dom', 'react-router'], importPatterns: [/from\s+['"]react-router/, /BrowserRouter|Route|Link/] },
  'Wouter': { packages: ['wouter'], importPatterns: [/from\s+['"]wouter['"]/, /useRoute|useLocation/] },
  'Axios': { packages: ['axios'], importPatterns: [/from\s+['"]axios['"]/, /axios\.get|axios\.post/] },
  'Day.js': { packages: ['dayjs'], importPatterns: [/from\s+['"]dayjs['"]/, /dayjs\(/] },
  'date-fns': { packages: ['date-fns'], importPatterns: [/from\s+['"]date-fns['"]/, /format\(|parseISO/] },
  'Lodash': { packages: ['lodash', 'lodash-es'], importPatterns: [/from\s+['"]lodash/, /import\s+_\s+from/] },
  'Recharts': { packages: ['recharts'], importPatterns: [/from\s+['"]recharts['"]/, /LineChart|BarChart|PieChart/] },
  'Chart.js': { packages: ['chart.js', 'react-chartjs-2'], importPatterns: [/from\s+['"]chart\.js['"]/, /from\s+['"]react-chartjs-2['"]/] },
  'D3': { packages: ['d3'], importPatterns: [/from\s+['"]d3['"]/, /d3\.select|d3\.scale/] },
  'Framer Motion': { packages: ['framer-motion'], importPatterns: [/from\s+['"]framer-motion['"]/, /motion\./] },
  'React Hook Form': { packages: ['react-hook-form'], importPatterns: [/from\s+['"]react-hook-form['"]/, /useForm|Controller/] },
  'Formik': { packages: ['formik'], importPatterns: [/from\s+['"]formik['"]/, /useFormik|Formik/] },
};

function parsePackageJson(files: FileInfo[]): PackageJson | null {
  const pkgFile = files.find(f => f.path === 'package.json' || f.path.endsWith('/package.json'));
  if (!pkgFile) return null;
  try {
    return JSON.parse(pkgFile.content);
  } catch {
    return null;
  }
}

function getAllDependencies(pkg: PackageJson | null): Record<string, string> {
  if (!pkg) return {};
  return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
}

function detectWithSignatures(
  sigMap: Record<string, { packages: string[]; importPatterns?: RegExp[]; filePatterns?: RegExp[]; configFiles?: string[] }>,
  files: FileInfo[],
  deps: Record<string, string>,
  filePaths: string[],
  allContent: string,
  category: string
): DetectedFramework | null {
  let best: DetectedFramework | null = null;

  for (const [name, sig] of Object.entries(sigMap)) {
    const evidence: string[] = [];
    let confidence = 0;

    for (const pkg of sig.packages) {
      if (deps[pkg]) {
        evidence.push(`package: ${pkg}@${deps[pkg]}`);
        confidence += 0.4;
      }
    }

    if (sig.configFiles) {
      for (const cf of sig.configFiles) {
        if (filePaths.some(fp => fp === cf || fp.endsWith('/' + cf))) {
          evidence.push(`config: ${cf}`);
          confidence += 0.3;
        }
      }
    }

    if (sig.filePatterns) {
      let fpMatches = 0;
      for (const fp of sig.filePatterns) {
        const matchCount = filePaths.filter(p => fp.test(p)).length;
        fpMatches += matchCount;
      }
      if (fpMatches > 0) {
        evidence.push(`${fpMatches} matching file(s)`);
        confidence += Math.min(0.3, fpMatches * 0.05);
      }
    }

    if (sig.importPatterns) {
      let importMatches = 0;
      for (const ip of sig.importPatterns) {
        const matches = allContent.match(new RegExp(ip.source, 'gm'));
        if (matches) importMatches += matches.length;
      }
      if (importMatches > 0) {
        evidence.push(`${importMatches} import(s) found`);
        confidence += Math.min(0.3, importMatches * 0.03);
      }
    }

    confidence = Math.min(confidence, 1.0);

    if (evidence.length > 0 && confidence > (best?.confidence || 0)) {
      const version = sig.packages.length > 0 ? deps[sig.packages[0]]?.replace(/[\^~]/, '') : undefined;
      best = { category, name, version, confidence, evidence };
    }
  }

  return best;
}

function detectLanguage(files: FileInfo[], filePaths: string[]): DetectedFramework | null {
  const extCounts: Record<string, number> = {};

  for (const fp of filePaths) {
    if (fp.includes('node_modules/') || fp.includes('.git/') || fp.includes('dist/')) continue;
    const ext = '.' + (fp.split('.').pop() || '');
    for (const [lang, info] of Object.entries(LANGUAGE_INDICATORS)) {
      if (info.extensions.includes(ext)) {
        extCounts[lang] = (extCounts[lang] || 0) + 1;
      }
    }
    for (const [lang, info] of Object.entries(LANGUAGE_INDICATORS)) {
      for (const cf of info.configFiles) {
        if (fp === cf || fp.endsWith('/' + cf)) {
          extCounts[lang] = (extCounts[lang] || 0) + 5;
        }
      }
    }
  }

  let bestLang = 'JavaScript';
  let bestCount = 0;
  for (const [lang, count] of Object.entries(extCounts)) {
    if (count > bestCount) {
      bestLang = lang;
      bestCount = count;
    }
  }

  if (bestCount === 0) return null;

  return {
    category: 'Language',
    name: bestLang,
    confidence: Math.min(1, bestCount / 10),
    evidence: [`${bestCount} file(s) with ${bestLang} extensions`],
  };
}

export function detectTechStack(files: FileInfo[]): TechStackProfile {
  const filePaths = files.map(f => f.path);
  const pkg = parsePackageJson(files);
  const deps = getAllDependencies(pkg);

  const codeFiles = files.filter(f =>
    /\.(ts|tsx|js|jsx|py|go|rs|rb|php|java|vue|svelte|astro)$/.test(f.path) &&
    !f.path.includes('node_modules/') && !f.path.includes('dist/')
  );
  const allContent = codeFiles.map(f => f.content).join('\n');

  const frontend = detectWithSignatures(FRONTEND_SIGNATURES, files, deps, filePaths, allContent, 'Frontend');
  const backend = detectWithSignatures(BACKEND_SIGNATURES, files, deps, filePaths, allContent, 'Backend');
  const orm = detectWithSignatures(ORM_SIGNATURES, files, deps, filePaths, allContent, 'ORM');

  const authSigs: Record<string, { packages: string[]; importPatterns: RegExp[]; filePatterns?: RegExp[]; configFiles?: string[] }> = {};
  for (const [k, v] of Object.entries(AUTH_SIGNATURES)) {
    authSigs[k] = { ...v, filePatterns: [], configFiles: [] };
  }
  const auth = detectWithSignatures(authSigs, files, deps, filePaths, allContent, 'Auth');

  const css = detectWithSignatures(CSS_SIGNATURES, files, deps, filePaths, allContent, 'CSS');

  const buildSigs: Record<string, { packages: string[]; importPatterns?: RegExp[]; configFiles: string[] }> = {};
  for (const [k, v] of Object.entries(BUILD_TOOL_SIGNATURES)) {
    buildSigs[k] = { ...v };
  }
  const buildTool = detectWithSignatures(buildSigs, files, deps, filePaths, allContent, 'Build Tool');

  const testSigs: Record<string, { packages: string[]; importPatterns?: RegExp[]; filePatterns: RegExp[]; configFiles: string[] }> = {};
  for (const [k, v] of Object.entries(TEST_SIGNATURES)) {
    testSigs[k] = { ...v };
  }
  const testFramework = detectWithSignatures(testSigs, files, deps, filePaths, allContent, 'Testing');

  const stateSigs: Record<string, { packages: string[]; importPatterns: RegExp[]; filePatterns?: RegExp[]; configFiles?: string[] }> = {};
  for (const [k, v] of Object.entries(STATE_MANAGEMENT_SIGNATURES)) {
    stateSigs[k] = { ...v, filePatterns: [], configFiles: [] };
  }
  const stateManagement = detectWithSignatures(stateSigs, files, deps, filePaths, allContent, 'State Management');

  const language = detectLanguage(files, filePaths);

  const additional: DetectedFramework[] = [];
  const addlSigs: Record<string, { packages: string[]; importPatterns: RegExp[]; filePatterns?: RegExp[]; configFiles?: string[] }> = {};
  for (const [k, v] of Object.entries(ADDITIONAL_TOOL_SIGNATURES)) {
    addlSigs[k] = { ...v, filePatterns: [], configFiles: [] };
  }
  for (const [name, sig] of Object.entries(addlSigs)) {
    const detected = detectWithSignatures({ [name]: sig }, files, deps, filePaths, allContent, 'Additional');
    if (detected && detected.confidence >= 0.3) {
      additional.push(detected);
    }
  }

  const parts: string[] = [];
  if (language) parts.push(language.name);
  if (frontend) parts.push(frontend.name);
  if (backend) parts.push(backend.name);
  if (orm) parts.push(orm.name);
  if (css) parts.push(css.name);
  if (auth) parts.push(`${auth.name} auth`);
  if (buildTool) parts.push(buildTool.name);
  if (stateManagement) parts.push(stateManagement.name);
  if (additional.length > 0) parts.push(`+ ${additional.length} libraries`);

  const summary = parts.length > 0
    ? `Detected stack: ${parts.join(' + ')}`
    : 'Unable to determine tech stack from provided files';

  return {
    frontend,
    backend,
    orm,
    auth,
    css,
    buildTool,
    testFramework,
    stateManagement,
    language,
    additional,
    summary,
  };
}

export function formatTechStackReport(profile: TechStackProfile): string {
  const sections: string[] = [];
  sections.push(`## Tech Stack Analysis\n`);
  sections.push(`**${profile.summary}**\n`);

  const categories: [string, DetectedFramework | null][] = [
    ['Language', profile.language],
    ['Frontend', profile.frontend],
    ['Backend', profile.backend],
    ['ORM/Database', profile.orm],
    ['Authentication', profile.auth],
    ['Styling', profile.css],
    ['Build Tool', profile.buildTool],
    ['Testing', profile.testFramework],
    ['State Management', profile.stateManagement],
  ];

  for (const [label, fw] of categories) {
    if (fw) {
      const ver = fw.version ? ` v${fw.version}` : '';
      sections.push(`- **${label}**: ${fw.name}${ver} (${Math.round(fw.confidence * 100)}% confidence)`);
    }
  }

  if (profile.additional.length > 0) {
    sections.push(`\n**Additional Libraries:**`);
    for (const lib of profile.additional) {
      const ver = lib.version ? ` v${lib.version}` : '';
      sections.push(`- ${lib.name}${ver}`);
    }
  }

  return sections.join('\n');
}