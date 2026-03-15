import { WebContainer, FileSystemTree } from '@webcontainer/api';
import { runnerLog, NpmOutputParser } from './logger';

export const PRE_WARM_STATUS = {
  IDLE: 'idle',
  BOOTING: 'booting',
  INSTALLING: 'installing',
  READY: 'ready',
  FAILED: 'failed',
  UNSUPPORTED: 'unsupported',
} as const;

export type PreWarmStatusValue = typeof PRE_WARM_STATUS[keyof typeof PRE_WARM_STATUS];

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
let lastPackageJsonHash: string | null = null;
let preWarmPromise: Promise<boolean> | null = null;
let preWarmStatus: 'idle' | 'booting' | 'installing' | 'ready' | 'failed' | 'unsupported' = 'idle';
let preWarmListeners: Array<(status: string, message: string) => void> = [];
let preWarmProcess: { kill: () => void } | null = null;
let preWarmStartTime: number = 0;
let preWarmCompletedBatches: number = 0;
let activeDevServer: { url: string; process: any; stdinWriter?: any } | null = null;
let devServerPromise: Promise<{ url: string; process: any }> | null = null;

const STALL_TIMEOUT_MS = 45000;
const ALTERNATIVE_REGISTRIES = [
  'https://registry.npmmirror.com',
  'https://registry.npmjs.org',
];

const PREWARM_BATCHES: Array<{ deps: Record<string, string>; devDeps: Record<string, string>; label: string; description: string }> = [
  {
    label: 'core',
    description: 'React essentials',
    deps: {
      'react': '^18.3.1', 'react-dom': '^18.3.1', 'zod': '^3.22.0', 'clsx': '^2.1.0',
      'wouter': '^3.0.0', 'tailwind-merge': '^2.2.0', 'class-variance-authority': '^0.7.0',
      '@tanstack/react-query': '^5.0.0', 'lucide-react': '^0.344.0',
      'react-hook-form': '^7.50.0', '@hookform/resolvers': '^3.3.0',
    },
    devDeps: {
      'vite': '^5.1.0', '@vitejs/plugin-react': '^4.2.0',
      'typescript': '^5.3.0', 'esbuild': '^0.19.0',
      'tailwindcss': '3.4.17', 'postcss': '^8.4.35', 'autoprefixer': '^10.4.17',
      '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', '@types/node': '^20.10.0',
    },
  },
  {
    label: 'ui',
    description: 'UI components',
    deps: {
      '@radix-ui/react-slot': '^1.0.2', '@radix-ui/react-dialog': '^1.0.5',
      '@radix-ui/react-select': '^2.0.0', '@radix-ui/react-label': '^2.0.2',
      '@radix-ui/react-tabs': '^1.0.4', '@radix-ui/react-tooltip': '^1.0.7',
      '@radix-ui/react-popover': '^1.0.7', '@radix-ui/react-dropdown-menu': '^2.0.6',
      '@radix-ui/react-checkbox': '^1.0.4', '@radix-ui/react-separator': '^1.0.3',
      '@radix-ui/react-scroll-area': '^1.0.5', '@radix-ui/react-switch': '^1.0.3',
      '@radix-ui/react-toast': '^1.1.5', '@radix-ui/react-icons': '^1.3.0',
      '@radix-ui/react-avatar': '^1.0.4', '@radix-ui/react-alert-dialog': '^1.0.5',
      '@radix-ui/react-accordion': '^1.1.2', '@radix-ui/react-progress': '^1.0.3',
      '@radix-ui/react-radio-group': '^1.1.3', '@radix-ui/react-slider': '^1.1.2',
      '@radix-ui/react-toggle': '^1.0.3', '@radix-ui/react-toggle-group': '^1.0.4',
      '@radix-ui/react-context-menu': '^2.1.5', '@radix-ui/react-menubar': '^1.0.4',
      '@radix-ui/react-collapsible': '^1.0.3', '@radix-ui/react-navigation-menu': '^1.1.4',
      '@radix-ui/react-hover-card': '^1.0.7', '@radix-ui/react-aspect-ratio': '^1.0.3',
      'framer-motion': '^11.0.0',
      'embla-carousel-react': '^8.0.0', 'vaul': '^0.9.0', 'sonner': '^1.4.0',
      'input-otp': '^1.2.0', 'cmdk': '^0.2.0',
      'react-day-picker': '^8.10.0', 'date-fns': '^3.3.1',
      'nanoid': '^5.0.0', 'uuid': '^9.0.0',
    },
    devDeps: { '@types/uuid': '^9.0.7' },
  },
  {
    label: 'server',
    description: 'Server & utilities',
    deps: {
      'express': '^4.18.2', 'cors': '^2.8.5', 'body-parser': '^1.20.0',
      'helmet': '^7.1.0', 'cookie-parser': '^1.4.6',
      'morgan': '^1.10.0', 'compression': '^1.7.4', 'dotenv': '^16.4.0',
      'drizzle-orm': '^0.29.0', 'drizzle-zod': '^0.5.0',
      'passport': '^0.7.0', 'express-session': '^1.17.3',
      'bcryptjs': '^2.4.3', 'express-rate-limit': '^7.1.0',
      'recharts': '^2.12.0', 'axios': '^1.6.0',
      '@tanstack/react-table': '^8.11.0',
      '@dnd-kit/core': '^6.1.0', '@dnd-kit/sortable': '^8.0.0', '@dnd-kit/utilities': '^3.2.2',
      'react-icons': '^5.0.0',
      'react-markdown': '^9.0.1',
      'jszip': '^3.10.1',
      'zustand': '^4.4.0',
      'dayjs': '^1.11.0', 'lodash': '^4.17.21',
      'react-dropzone': '^14.2.3',
      'react-textarea-autosize': '^8.5.3',
      'react-resizable-panels': '^2.0.0',
    },
    devDeps: {
      '@types/express': '^4.17.21', '@types/cors': '^2.8.17',
      '@types/morgan': '^1.9.9', '@types/compression': '^1.7.5',
      'drizzle-kit': '^0.20.0', '@types/bcryptjs': '^2.4.6',
      '@types/lodash': '^4.14.202',
      'tsx': '^4.7.0',
    },
  },
  {
    label: 'extras',
    description: 'Extended libraries',
    deps: {
      'http-errors': '^2.0.0', '@neondatabase/serverless': '^0.7.0',
      'pg': '^8.11.3', 'connect-pg-simple': '^9.0.0',
      'passport-local': '^1.0.0', 'jose': '^5.2.0',
      'jsonwebtoken': '^9.0.0', 'express-validator': '^7.0.0',
      'chart.js': '^4.4.0', 'react-chartjs-2': '^5.2.0',
      'react-circular-progressbar': '^2.1.0', 'react-countup': '^6.5.0',
      'immer': '^10.0.3', 'moment': '^2.29.0',
      'swr': '^2.2.0', 'jotai': '^2.6.0',
      'react-router-dom': '^6.20.0', 'socket.io-client': '^4.7.0',
      'react-beautiful-dnd': '^13.1.1',
      'exceljs': '^4.4.0', 'file-saver': '^2.0.5',
      'slate': '^0.101.0', 'slate-react': '^0.101.0',
      'formik': '^2.4.5', 'yup': '^1.3.3',
      'react-hot-toast': '^2.4.1',
      'react-number-format': '^5.3.1',
      '@formkit/auto-animate': '^0.8.1',
      'csv-parse': '^5.5.3', 'csv-stringify': '^6.4.5',
      'currency.js': '^2.0.4', 'decimal.js': '^10.4.3',
      'superjson': '^2.2.1', 'qs': '^6.11.2',
      'zod-to-json-schema': '^3.22.0',
      'p-queue': '^8.0.1',
      'xstate': '^5.5.0',
      'multer': '^1.4.5-lts.1',
    },
    devDeps: {
      '@types/pg': '^8.10.9', '@types/passport': '^1.0.16',
      '@types/express-session': '^1.17.10', '@types/jsonwebtoken': '^9.0.5',
      '@types/react-beautiful-dnd': '^13.1.8',
      '@types/multer': '^1.4.11',
      'vitest': '^1.3.0',
      '@testing-library/react': '^14.2.0',
      '@testing-library/jest-dom': '^6.4.0',
      '@testing-library/user-event': '^14.5.0',
      'jsdom': '^24.0.0',
      'picomatch': '^4.0.2',
      'fast-glob': '^3.3.2',
    },
  },
  {
    label: 'viz',
    description: 'Visualization & media',
    deps: {
      'react-select': '^5.8.0', 'react-color': '^2.19.3',
      '@tanstack/react-virtual': '^3.2.0', 'react-virtuoso': '^4.7.0',
      'react-window': '^1.8.10',
      'react-player': '^2.14.1',
      'react-webcam': '^7.2.0',
      'react-qr-code': '^2.0.12', 'qrcode': '^1.5.3',
      'html2canvas': '^1.4.1', 'html-to-image': '^1.11.11',
      'jspdf': '^2.5.1', 'pdfmake': '^0.2.10',
      'papaparse': '^5.4.1',
      'marked': '^12.0.0', 'dompurify': '^3.0.8', 'sanitize-html': '^2.12.1',
      'highlight.js': '^11.9.0', 'prismjs': '^1.29.0',
      'swiper': '^11.0.5', 'lottie-react': '^2.4.0',
      '@react-spring/web': '^9.7.3',
      'react-signature-canvas': '^1.0.6',
      'react-intersection-observer': '^9.8.1',
      'react-use': '^17.5.0',
      'usehooks-ts': '^3.0.1',
      'react-error-boundary': '^4.0.12',
      'react-helmet-async': '^2.0.4',
      'react-i18next': '^14.0.5', 'i18next': '^23.10.0',
      'react-loading-skeleton': '^3.4.0',
      'react-confetti': '^6.1.0',
      'react-copy-to-clipboard': '^5.1.0',
      'react-syntax-highlighter': '^15.5.0',
    },
    devDeps: {
      '@types/react-color': '^3.0.12',
      '@types/react-window': '^1.8.8',
      '@types/dompurify': '^3.0.5',
      '@types/sanitize-html': '^2.11.0',
      '@types/papaparse': '^5.3.14',
      '@types/prismjs': '^1.26.3',
      '@types/react-signature-canvas': '^1.0.5',
      '@types/react-copy-to-clipboard': '^5.0.7',
      '@types/react-syntax-highlighter': '^15.5.11',
    },
  },
  {
    label: 'advanced',
    description: 'Advanced integrations',
    deps: {
      'leaflet': '^1.9.4', 'react-leaflet': '^4.2.1',
      '@tiptap/react': '^2.2.0', '@tiptap/starter-kit': '^2.2.0',
      '@tiptap/extension-placeholder': '^2.2.0',
      'reactflow': '^11.11.0',
      'konva': '^9.3.6',
      'cropperjs': '^1.6.1', 'react-cropper': '^2.3.3',
      'react-zoom-pan-pinch': '^3.4.2',
      'react-grid-layout': '^1.4.4',
      'react-big-calendar': '^1.8.7',
      'react-datepicker': '^6.1.0',
      'react-color-palette': '^7.1.1',
      'react-timer-hook': '^3.0.7',
      'react-sparklines': '^1.7.0',
      'boring-avatars': '^1.10.1',
      'canvas-confetti': '^1.9.2',
      'classnames': '^2.5.1',
      'cuid': '^3.0.0',
      'fast-deep-equal': '^3.1.3',
      'fuse.js': '^7.0.0',
      'mitt': '^3.0.1',
      'tiny-invariant': '^1.3.3',
      'use-debounce': '^10.0.0',
      'validator': '^13.11.0',
      'zxcvbn': '^4.4.2',
    },
    devDeps: {
      '@types/leaflet': '^1.9.8',
      '@types/react-grid-layout': '^1.3.5',
      '@types/react-big-calendar': '^1.8.4',
      '@types/react-datepicker': '^6.0.1',
      '@types/react-sparklines': '^1.7.5',
      '@types/validator': '^13.11.8',
      '@types/zxcvbn': '^4.4.4',
      '@types/file-saver': '^2.0.7',
      '@types/cookie-parser': '^1.4.6',
      '@types/passport-local': '^1.0.38',
      '@types/connect-pg-simple': '^7.0.3',
      '@types/qs': '^6.9.11',
      '@types/http-errors': '^2.0.4',
    },
  },
  {
    label: 'icons-validation',
    description: 'Icons, validation & class utils',
    deps: {
      '@heroicons/react': '^2.1.1', '@phosphor-icons/react': '^2.0.15',
      '@tabler/icons-react': '^3.1.0',
      'valibot': '^0.30.0', 'superstruct': '^1.0.4', 'joi': '^17.12.0',
      'ajv': '^8.12.0', 'ajv-formats': '^2.1.1',
      'tailwind-variants': '^0.2.0', 'cntl': '^1.0.0',
      '@tanstack/react-form': '^0.19.0', '@tanstack/react-router': '^1.15.0',
      'react-transition-group': '^4.4.5', 'react-flip-move': '^3.0.5',
      'auto-animate': '^0.8.1', 'animejs': '^3.2.2',
      'popmotion': '^11.0.5',
    },
    devDeps: {
      '@types/react-transition-group': '^4.4.10',
    },
  },
  {
    label: 'headless-toast',
    description: 'Headless UI & notifications',
    deps: {
      '@headlessui/react': '^1.7.18',
      '@floating-ui/react': '^0.26.9', '@floating-ui/dom': '^1.6.3',
      'downshift': '^9.0.4',
      'react-aria': '^3.33.0', 'react-aria-components': '^1.1.1',
      'react-stately': '^3.31.0', '@ariakit/react': '^0.4.5',
      'react-toastify': '^10.0.4', 'notistack': '^3.0.1',
      '@radix-ui/react-toolbar': '^1.0.4',
      '@radix-ui/react-visually-hidden': '^1.0.3',
      'serve-static': '^1.15.0', 'http-proxy-middleware': '^2.0.6',
      'express-async-errors': '^3.1.1', 'hpp': '^0.2.3',
    },
    devDeps: {},
  },
  {
    label: 'db-auth',
    description: 'Databases & auth extras',
    deps: {
      'better-sqlite3': '^9.4.3', 'kysely': '^0.27.3', 'knex': '^3.1.0',
      'mongoose': '^8.1.1', 'redis': '^4.6.13', 'ioredis': '^5.3.2',
      'bcrypt': '^5.1.1', 'passport-jwt': '^4.0.1',
      'passport-google-oauth20': '^2.0.0', 'passport-github2': '^0.1.12',
      'lucia': '^3.1.1', 'arctic': '^1.2.1',
      'otplib': '^12.0.1', 'speakeasy': '^2.0.0',
      'd3': '^7.9.0', 'victory': '^37.0.1',
      'lightweight-charts': '^4.1.3',
    },
    devDeps: {
      '@types/better-sqlite3': '^7.6.8', '@types/bcrypt': '^5.0.2',
      '@types/passport-jwt': '^4.0.1', '@types/passport-google-oauth20': '^2.0.14',
      '@types/d3': '^7.4.3',
    },
  },
  {
    label: 'charts-dnd',
    description: 'Charts, drag-drop & HTTP',
    deps: {
      '@nivo/core': '^0.84.0', '@nivo/bar': '^0.84.0', '@nivo/line': '^0.84.0',
      '@nivo/pie': '^0.84.0', '@nivo/heatmap': '^0.84.0',
      '@visx/group': '^3.3.0', '@visx/shape': '^3.5.0', '@visx/scale': '^3.5.0',
      '@visx/axis': '^3.10.1', '@visx/tooltip': '^3.3.0',
      'react-gauge-chart': '^0.4.2',
      'react-dnd': '^16.0.1', 'react-dnd-html5-backend': '^16.0.1',
      'ky': '^1.2.0', 'wretch': '^2.8.1',
      'cross-fetch': '^4.0.0', 'ofetch': '^1.3.3',
    },
    devDeps: {},
  },
  {
    label: 'state-mgmt',
    description: 'State management & realtime',
    deps: {
      'recoil': '^0.7.7', 'valtio': '^1.13.2',
      'nanostores': '^0.9.5', '@nanostores/react': '^0.7.1',
      'effector': '^23.2.0', 'effector-react': '^23.2.0',
      'mobx': '^6.12.0', 'mobx-react-lite': '^4.0.5',
      'redux': '^5.0.1', '@reduxjs/toolkit': '^2.1.0', 'react-redux': '^9.1.0',
      'redux-persist': '^6.0.0',
      'socket.io': '^4.7.4', 'ws': '^8.16.0',
      'pusher-js': '^8.4.0', 'ably': '^1.2.49',
      'remark-gfm': '^4.0.0', 'rehype-raw': '^7.0.0',
      'shiki': '^1.1.7',
    },
    devDeps: {
      '@types/ws': '^8.5.10',
    },
  },
  {
    label: 'editors-inputs',
    description: 'Rich text editors & form inputs',
    deps: {
      'slate-history': '^0.100.0',
      '@tiptap/extension-link': '^2.2.0', '@tiptap/extension-image': '^2.2.0',
      '@tiptap/extension-code-block-lowlight': '^2.2.0',
      'quill': '^2.0.0', 'react-quill': '^2.0.0',
      '@uiw/react-md-editor': '^4.0.4',
      '@monaco-editor/react': '^4.6.0',
      'codemirror': '^6.0.1', '@codemirror/lang-javascript': '^6.2.2',
      'react-phone-number-input': '^3.3.9',
      'react-tag-input-component': '^2.0.2',
      'react-input-mask': '^2.0.4',
      'react-credit-cards-2': '^1.0.2',
      'react-rating': '^2.0.5',
      'react-toggle': '^4.1.3', 'react-slider': '^2.0.6',
      '@emoji-mart/react': '^1.1.1', '@emoji-mart/data': '^1.1.2',
    },
    devDeps: {
      '@types/react-input-mask': '^3.0.5',
    },
  },
  {
    label: 'layout-media',
    description: 'Layout, media & canvas',
    deps: {
      'react-masonry-css': '^1.0.16', 'react-split': '^2.0.14',
      'react-measure': '^2.5.2',
      'elkjs': '^0.9.2', 'dagre': '^0.8.5', 'mermaid': '^10.9.0',
      '@react-google-maps/api': '^2.19.3', 'pigeon-maps': '^0.21.6',
      'react-image-gallery': '^1.3.0',
      'react-photo-album': '^2.3.1', 'react-medium-image-zoom': '^5.1.10',
      'wavesurfer.js': '^7.7.3',
      'react-konva': '^18.2.10', 'fabric': '^5.3.0',
      'three': '^0.162.0', '@react-three/fiber': '^8.15.16', '@react-three/drei': '^9.99.5',
      'xlsx': '^0.18.5', '@react-pdf/renderer': '^3.4.2', 'react-pdf': '^7.7.1',
      'docx': '^8.5.0',
    },
    devDeps: {
      '@types/dagre': '^0.7.52', '@types/fabric': '^5.3.7',
      '@types/three': '^0.162.0', '@types/react-measure': '^2.0.12',
    },
  },
  {
    label: 'utils-string',
    description: 'Utilities, strings & dates',
    deps: {
      'lodash-es': '^4.17.21', 'ramda': '^0.29.1', 'remeda': '^1.42.0',
      'ts-pattern': '^5.0.8',
      'p-limit': '^5.0.0', 'p-retry': '^6.2.0',
      'deepmerge': '^4.3.1', 'deepmerge-ts': '^5.1.0', 'defu': '^6.1.4',
      'rfdc': '^1.3.1', 'object-hash': '^3.0.0',
      'change-case': '^5.4.3', 'pluralize': '^0.0.33', 'slugify': '^1.6.6',
      'string-similarity': '^4.0.4', 'escape-html': '^1.0.3', 'he': '^1.2.0',
      'chroma-js': '^2.4.2', 'colord': '^2.9.3', 'tinycolor2': '^1.6.0',
      'luxon': '^3.4.4', 'ms': '^2.1.3', 'pretty-ms': '^9.0.0',
      'timeago.js': '^4.0.2', 'date-fns-tz': '^2.0.0',
      'big.js': '^6.2.1', 'bignumber.js': '^9.1.2', 'numbro': '^2.4.0',
    },
    devDeps: {
      '@types/lodash-es': '^4.17.12', '@types/ramda': '^0.29.11',
      '@types/chroma-js': '^2.4.4', '@types/tinycolor2': '^1.4.6',
      '@types/pluralize': '^0.0.33', '@types/luxon': '^3.4.2',
      '@types/ms': '^0.7.34', '@types/he': '^1.2.3',
      '@types/escape-html': '^1.0.4', '@types/object-hash': '^3.0.6',
      '@types/string-similarity': '^4.0.2',
    },
  },
  {
    label: 'payments-email',
    description: 'Payments, email & uploads',
    deps: {
      '@stripe/stripe-js': '^3.0.6', '@stripe/react-stripe-js': '^2.5.1',
      'stripe': '^14.18.0',
      'nodemailer': '^6.9.9', 'resend': '^3.1.0',
      '@react-email/components': '^0.0.14', '@sendgrid/mail': '^8.1.1',
      'filepond': '^4.31.1', 'react-filepond': '^7.1.2',
      'browser-image-compression': '^2.0.2',
      'blurhash': '^2.0.5',
      'copy-to-clipboard': '^3.3.3', 'react-share': '^5.1.0',
      'web-vitals': '^3.5.2',
      '@fullcalendar/react': '^6.1.10', '@fullcalendar/daygrid': '^6.1.10',
      '@fullcalendar/timegrid': '^6.1.10', '@fullcalendar/interaction': '^6.1.10',
      'ag-grid-react': '^31.1.1', 'ag-grid-community': '^31.1.1',
    },
    devDeps: {
      '@types/nodemailer': '^6.4.14',
    },
  },
  {
    label: 'effects-misc',
    description: 'Effects, logging & misc',
    deps: {
      'react-type-animation': '^3.2.0', 'typewriter-effect': '^2.21.0',
      'react-tsparticles': '^2.12.2', 'tsparticles-slim': '^2.12.0',
      'react-rough-notation': '^1.0.5', 'react-tooltip': '^5.26.3',
      'react-joyride': '^2.8.1',
      'react-spinners': '^0.13.8', 'react-content-loader': '^7.0.0',
      'nprogress': '^0.2.0', 'react-top-loading-bar': '^2.3.1',
      'react-scroll': '^1.9.0', 'react-scroll-parallax': '^3.4.5',
      'lenis': '^1.0.42',
      'ahooks': '^3.7.11', '@uidotdev/usehooks': '^2.4.1',
      'i18next-browser-languagedetector': '^7.2.0',
      'winston': '^3.11.0', 'pino': '^8.19.0', 'pino-pretty': '^10.3.1',
      'loglevel': '^1.9.1', 'consola': '^3.2.3',
      'lru-cache': '^10.2.0', 'keyv': '^4.5.4',
      'cuid2': '^2.2.2', 'ulid': '^2.3.0', 'short-uuid': '^4.2.2',
      'flexsearch': '^0.7.43', 'minisearch': '^6.3.0',
      'eventemitter3': '^5.0.1',
      'libphonenumber-js': '^1.10.56',
      'semver': '^7.6.0',
    },
    devDeps: {
      '@types/nprogress': '^0.2.3', '@types/react-scroll': '^1.8.10',
      '@types/semver': '^7.5.8',
      'prettier': '^3.2.5', 'eslint': '^8.56.0',
      '@typescript-eslint/parser': '^7.0.0', '@typescript-eslint/eslint-plugin': '^7.0.0',
      'eslint-plugin-react-hooks': '^4.6.0',
      'concurrently': '^8.2.2', 'cross-env': '^7.0.3',
      'nodemon': '^3.0.3', 'rimraf': '^5.0.5',
      '@tailwindcss/forms': '^0.5.7', '@tailwindcss/typography': '^0.5.12',
      'tailwindcss-animate': '^1.0.7',
    },
  },
  {
    label: 'config-misc',
    description: 'Config, templates & misc',
    deps: {
      'yaml': '^2.3.4', 'js-yaml': '^4.1.0',
      'ejs': '^3.1.9', 'handlebars': '^4.7.8', 'mustache': '^4.2.0',
      'crypto-js': '^4.2.0', 'hash-wasm': '^4.11.0',
      'query-string': '^9.0.0', 'path-to-regexp': '^6.2.1',
      'pako': '^2.1.0',
      'idb': '^8.0.0', 'localforage': '^1.10.0', 'dexie': '^4.0.1',
      'rxjs': '^7.8.1', 'fp-ts': '^2.16.2', 'neverthrow': '^6.1.0',
      'type-fest': '^4.10.3',
      'fast-xml-parser': '^4.3.4',
      'posthog-js': '^1.109.0', 'react-ga4': '^2.1.0',
      'msw': '^2.2.1',
      '@dicebear/core': '^8.0.1', '@dicebear/collection': '^8.0.1',
      'card-validator': '^9.1.0',
    },
    devDeps: {
      '@types/js-yaml': '^4.0.9', '@types/ejs': '^3.1.5',
      '@types/mustache': '^4.2.5', '@types/crypto-js': '^4.2.2',
      '@types/pako': '^2.0.3',
      '@types/invariant': '^2.2.37',
      '@tailwindcss/aspect-ratio': '^0.4.2', '@tailwindcss/container-queries': '^0.1.1',
      'daisyui': '^4.7.2',
    },
  },
  {
    label: 'orms-http',
    description: 'ORMs, HTTP & animation extras',
    deps: {
      'motion': '^11.0.0', 'gsap': '^3.12.5',
      'sequelize': '^6.37.1', 'typeorm': '^0.3.20',
      'prisma': '^5.10.0', '@prisma/client': '^5.10.0',
      'argon2': '^0.31.2',
      'got': '^14.2.0', 'node-fetch': '^3.3.2',
      'rehype-highlight': '^7.0.0', 'rehype-sanitize': '^6.0.0',
      'mdast-util-to-string': '^4.0.0',
      'react-star-ratings': '^2.3.0',
      'react-map-gl': '^7.1.7', 'mapbox-gl': '^3.2.0',
      'react-image-lightbox': '^5.1.4',
      'plyr-react': '^5.3.0', 'tone': '^14.9.9',
      'pixi.js': '^8.0.0',
      'archiver': '^7.0.0',
      'async-retry': '^1.3.3',
      'just-debounce-it': '^3.2.0', 'just-throttle': '^4.2.0',
      'just-safe-get': '^4.2.0', 'just-safe-set': '^4.2.1',
      'phoenix': '^1.7.11',
      'cron-parser': '^4.9.0', 'cronstrue': '^2.48.0',
      'react-data-grid': '^7.0.0-beta.42', 'mantine-datatable': '^7.5.0',
      'locomotive-scroll': '^4.1.4',
      'i18next-http-backend': '^2.4.3', 'intl-messageformat': '^10.5.11',
    },
    devDeps: {
      '@types/archiver': '^6.0.2', '@types/react-dnd': '^3.0.2',
      '@types/color': '^3.0.6', '@types/accounting': '^0.4.5',
      'lint-staged': '^15.2.2', 'husky': '^9.0.11',
    },
  },
  {
    label: 'catchall',
    description: 'Remaining packages',
    deps: {
      'react-typed': '^2.0.12', 'react-mosaic-component': '^6.1.0',
      'hashids': '^2.3.0', 'lunr': '^2.3.9',
      'tiny-emitter': '^2.1.0', 'invariant': '^2.2.4', 'warning': '^4.0.3',
      'is-email': '^1.0.2', 'is-url': '^1.2.4',
      'credit-card-type': '^10.0.1',
      'color': '^4.2.3', 'title-case': '^4.3.1',
      'mathjs': '^12.4.0', 'fraction.js': '^4.3.7',
      'numeral': '^2.0.6', 'accounting': '^0.4.1',
      'chrono-node': '^2.7.5', 'human-date': '^1.4.0',
      'paypal-js': '^8.0.4', '@paypal/react-paypal-js': '^8.1.3',
      'postmark': '^4.0.2', 'mailgun.js': '^10.2.1',
      'uppy': '^3.22.1', '@uppy/react': '^3.2.1',
      'thumbhash': '^0.1.1', 'pdfjs-dist': '^4.0.379',
      'react-hook-form-persist': '^3.0.0',
      'final-form': '^4.20.10', 'react-final-form': '^6.5.9',
      'node-cache': '^5.1.2', 'bullmq': '^5.4.2',
      'bee-queue': '^1.7.1', 'agenda': '^5.0.0',
      'nunjucks': '^3.2.4', 'liquid': '^5.1.1',
      'toml': '^3.0.0', 'ini': '^4.1.1',
      'dotenv-expand': '^11.0.6', 'conf': '^12.0.0', 'cosmiconfig': '^9.0.0',
      'remark': '^15.0.1', 'remark-parse': '^11.0.0',
      'unified': '^11.0.4', 'unist-util-visit': '^5.0.0',
      'mdx-bundler': '^10.0.1',
      'url-pattern': '^1.0.3', 'normalize-url': '^8.0.0',
      'unleash-proxy-client': '^3.3.1', 'flagsmith': '^3.27.0',
      'mixpanel-browser': '^2.49.0', 'plausible-tracker': '^0.3.8',
      'sharp': '^0.33.2', 'cheerio': '^1.0.0-rc.12',
      'turndown': '^7.1.3', 'robots-parser': '^3.0.1',
      'xml2js': '^0.6.2',
      'zod-fetch': '^0.1.1', 'ts-results': '^3.3.0',
      'tldts': '^6.1.10', 'compare-versions': '^6.1.0', 'human-id': '^4.1.1',
    },
    devDeps: {
      '@types/nunjucks': '^3.2.6', '@types/ini': '^4.1.0',
      '@types/numeral': '^2.0.5', '@types/xml2js': '^0.4.14',
      '@types/turndown': '^5.0.4', '@types/warning': '^3.0.3',
    },
  },
];

const CORE_PACKAGES: Record<string, string> = PREWARM_BATCHES.reduce((acc, b) => ({ ...acc, ...b.deps }), {} as Record<string, string>);
const CORE_DEV_PACKAGES: Record<string, string> = PREWARM_BATCHES.reduce((acc, b) => ({ ...acc, ...b.devDeps }), {} as Record<string, string>);

export interface RunResult {
  success: boolean;
  output: string[];
  errors: string[];
  exitCode: number;
}

async function checkRegistryConnectivity(container: WebContainer): Promise<{ reachable: boolean; registry?: string }> {
  runnerLog.startTimer('registry-check');
  try {
    const proc = await container.spawn('npm', ['ping', '--registry=https://registry.npmjs.org']);
    let output = '';
    proc.output.pipeTo(new WritableStream({ write(data) { output += data; } }));
    const exitCode = await Promise.race([
      proc.exit,
      new Promise<number>(r => setTimeout(() => { try { proc.kill(); } catch {} r(-1); }, 15000)),
    ]);
    const ms = runnerLog.endTimer('registry-check');
    if (exitCode === 0) {
      runnerLog.success('NPM', 'Registry reachable (npmjs.org)', undefined, ms);
      return { reachable: true, registry: 'https://registry.npmjs.org' };
    }
  } catch {}

  for (const alt of ALTERNATIVE_REGISTRIES) {
    try {
      const proc = await container.spawn('npm', ['ping', `--registry=${alt}`]);
      let output = '';
      proc.output.pipeTo(new WritableStream({ write(data) { output += data; } }));
      const exitCode = await Promise.race([
        proc.exit,
        new Promise<number>(r => setTimeout(() => { try { proc.kill(); } catch {} r(-1); }, 10000)),
      ]);
      if (exitCode === 0) {
        runnerLog.success('NPM', `Alternative registry reachable: ${alt}`);
        return { reachable: true, registry: alt };
      }
    } catch {}
  }

  runnerLog.endTimer('registry-check');
  runnerLog.error('NPM', 'No npm registry is reachable from WebContainer');
  return { reachable: false };
}

interface StallAwareInstallOptions {
  container: WebContainer;
  args: string[];
  timeoutMs: number;
  stallTimeoutMs: number;
  onOutput?: (data: string) => void;
  label: string;
}

async function stallAwareNpmInstall(opts: StallAwareInstallOptions): Promise<RunResult & { stalledOut: boolean }> {
  const { container, args, timeoutMs, stallTimeoutMs, onOutput, label } = opts;
  const output: string[] = [];
  const errors: string[] = [];
  let lastActivityTime = Date.now();
  let stalledOut = false;

  return new Promise(async (resolve) => {
    let processRef: { kill: () => void } | null = null;

    const overallTimer = setTimeout(() => {
      runnerLog.warn('NPM', `${label}: Overall timeout (${Math.round(timeoutMs / 1000)}s)`);
      try { processRef?.kill(); } catch {}
      resolve({ success: false, output, errors: ['Timeout'], exitCode: -1, stalledOut: false });
    }, timeoutMs);

    const stallChecker = setInterval(() => {
      const silentMs = Date.now() - lastActivityTime;
      if (silentMs > stallTimeoutMs) {
        stalledOut = true;
        runnerLog.warn('NPM', `${label}: Stall detected — no output for ${Math.round(silentMs / 1000)}s, killing npm`);
        onOutput?.(`\n⚠ npm appears stuck (no activity for ${Math.round(silentMs / 1000)}s), restarting...\n`);
        clearInterval(stallChecker);
        try { processRef?.kill(); } catch {}
        clearTimeout(overallTimer);
        resolve({ success: false, output, errors: ['Stalled - no output'], exitCode: -2, stalledOut: true });
      }
    }, 5000);

    try {
      const process = await container.spawn('npm', args);
      processRef = process;

      const parser = new NpmOutputParser((line, level) => {
        if (level !== 'debug') onOutput?.(line + '\n');
      });

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            lastActivityTime = Date.now();
            output.push(data);
            parser.feed(data);
          },
        })
      );

      const exitCode = await process.exit;
      parser.flush();
      clearTimeout(overallTimer);
      clearInterval(stallChecker);

      resolve({
        success: exitCode === 0,
        output,
        errors,
        exitCode,
        stalledOut: false,
      });
    } catch (err) {
      clearTimeout(overallTimer);
      clearInterval(stallChecker);
      resolve({
        success: false,
        output,
        errors: [String(err)],
        exitCode: 1,
        stalledOut: false,
      });
    }
  });
}

export type { FileSystemTree };

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export async function hasNodeModules(): Promise<boolean> {
  try {
    const container = await getWebContainer();
    const entries = await container.fs.readdir('node_modules');
    runnerLog.debug('FileSystem', `node_modules check: ${entries.length} entries found`);
    return true;
  } catch {
    runnerLog.debug('FileSystem', 'node_modules check: not found');
    return false;
  }
}

export function setPackageJsonHash(packageJson: string): boolean {
  const newHash = simpleHash(packageJson);
  const changed = lastPackageJsonHash !== newHash;
  if (changed) {
    runnerLog.info('Cache', `package.json hash changed: ${lastPackageJsonHash || '(none)'} → ${newHash}`);
  } else {
    runnerLog.debug('Cache', `package.json hash unchanged: ${newHash}`);
  }
  lastPackageJsonHash = newHash;
  return changed;
}

async function computePackageJsonHash(pkgJsonStr: string): Promise<string> {
  try {
    const parsed = JSON.parse(pkgJsonStr);
    const normalized = JSON.stringify({
      dependencies: Object.fromEntries(Object.entries(parsed.dependencies || {}).sort()),
      devDependencies: Object.fromEntries(Object.entries(parsed.devDependencies || {}).sort()),
    });
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch {
    return simpleHash(pkgJsonStr).replace('-', 'f').slice(0, 16);
  }
}

export async function triggerSnapshotBuild(files: Array<{ path: string; content: string }>): Promise<string | null> {
  try {
    const pkgFile = files.find(f => f.path === 'package.json' || f.path === '/package.json');
    if (!pkgFile) {
      runnerLog.debug('Snapshot', 'No package.json found in files, skipping snapshot trigger');
      return null;
    }
    const hash = await computePackageJsonHash(pkgFile.content);
    localStorage.setItem('autocoder-last-project-hash', hash);
    runnerLog.info('Snapshot', `Triggering snapshot build for hash ${hash}`);
    const resp = await fetch('/api/cache/build-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageJsonContent: pkgFile.content, hash }),
    });
    const data = await resp.json();
    runnerLog.debug('Snapshot', `Build trigger response: ${data.status}`);
    if (data.upgradedPackageJson && typeof data.upgradedPackageJson === 'string') {
      runnerLog.info('Snapshot', 'Received upgraded package.json from server');
      if (data.upgradeInfo) {
        const info = data.upgradeInfo;
        if (info.removedPackages?.length > 0) {
          runnerLog.debug('Snapshot', `Removed packages: ${info.removedPackages.join(', ')}`);
        }
        if (info.renamedPackages?.length > 0) {
          runnerLog.debug('Snapshot', `Renamed packages: ${info.renamedPackages.map((r: any) => `${r.from} → ${r.to}`).join(', ')}`);
        }
      }
      return data.upgradedPackageJson;
    }
    return null;
  } catch (err) {
    runnerLog.debug('Snapshot', `triggerSnapshotBuild error (non-fatal): ${err}`);
    return null;
  }
}

export function getPreWarmStatus(): 'idle' | 'booting' | 'installing' | 'ready' | 'failed' | 'unsupported' {
  return preWarmStatus;
}

export function isWebContainerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return window.crossOriginIsolated === true;
}

export function subscribePreWarmStatus(
  callback: (status: typeof preWarmStatus) => void
): () => void {
  const listener = (_phase: string, _msg: string) => callback(preWarmStatus);
  preWarmListeners.push(listener);
  return () => {
    preWarmListeners = preWarmListeners.filter(l => l !== listener);
  };
}

export function onPreWarmProgress(listener: (status: string, message: string) => void) {
  preWarmListeners.push(listener);
  return () => {
    preWarmListeners = preWarmListeners.filter(l => l !== listener);
  };
}

function notifyPreWarm(status: string, message: string) {
  runnerLog.info('PreWarm', `[${status}] ${message}`);
  preWarmListeners.forEach(l => l(status, message));
}

export function getPreWarmedPackages(): { deps: Record<string, string>; devDeps: Record<string, string> } {
  return { deps: { ...CORE_PACKAGES }, devDeps: { ...CORE_DEV_PACKAGES } };
}

export async function awaitPreWarm(timeoutMs: number = 120000): Promise<boolean> {
  if (preWarmStatus === 'ready') return true;
  if (preWarmStatus === 'failed' || preWarmStatus === 'idle') return false;
  if (!preWarmPromise) return false;

  runnerLog.info('PreWarm', `Awaiting pre-warm completion (status: ${preWarmStatus}, timeout: ${Math.round(timeoutMs / 1000)}s)...`);
  runnerLog.startTimer('await-prewarm');

  try {
    const result = await Promise.race([
      preWarmPromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);
    const ms = runnerLog.endTimer('await-prewarm');
    if (result) {
      runnerLog.success('PreWarm', `Pre-warm completed while waiting`, undefined, ms);
    } else {
      runnerLog.warn('PreWarm', `Pre-warm did not complete in time (${Math.round(timeoutMs / 1000)}s)`);
    }
    return result;
  } catch {
    runnerLog.warn('PreWarm', 'Pre-warm promise rejected while waiting');
    return false;
  }
}

async function runBatchInstall(
  container: WebContainer,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
  batchLabel: string,
  timeoutMs: number = 150000,
  stallTimeoutMs: number = 90000,
): Promise<{ success: boolean; output: string }> {
  const pkgJson = JSON.stringify({
    name: 'prewarm-cache',
    private: true,
    version: '1.0.0',
    type: 'module',
    scripts: { dev: 'vite' },
    dependencies: deps,
    devDependencies: devDeps,
  }, null, 2);

  await container.fs.writeFile('package.json', pkgJson);
  runnerLog.debug('FileSystem', `Wrote ${batchLabel} package.json`, { size: `${pkgJson.length} bytes` });

  runnerLog.startTimer(`prewarm-npm-${batchLabel}`);
  const installProcess = await container.spawn('npm', [
    'install',
    '--prefer-offline',
    '--no-audit',
    '--no-fund',
    '--omit=optional',
    '--legacy-peer-deps',
    '--loglevel=http',
    '--fetch-retries=2',
    '--fetch-timeout=30000'
  ]);
  preWarmProcess = installProcess;
  const totalPkgs = Object.keys(deps).length + Object.keys(devDeps).length;
  runnerLog.info('NPM', `${batchLabel}: installing ${totalPkgs} packages`, {
    timeout: `${timeoutMs / 1000}s`,
    stallTimeout: `${stallTimeoutMs / 1000}s`,
  });

  let installOutput = '';
  let lastRealProgress = Date.now();
  let lastAnyOutput = Date.now();
  let isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;
  let stallPausedAt: number | null = null;

  const CRASH_SILENCE_MS = 60000;

  let outputBuffer = '';
  let spinnerCount = 0;
  function hasRealNpmProgress(data: string): boolean {
    outputBuffer += data;
    const lines = outputBuffer.split(/[\r\n]+/);
    outputBuffer = lines.pop() || '';

    for (const line of lines) {
      const stripped = line
        .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
        .replace(/\x1b\][^\x07]*\x07/g, '')
        .replace(/\x9b[0-9;]*[a-zA-Z]/g, '')
        .replace(/[\x00-\x1f]/g, '')
        .replace(/\[[\d;]*[A-Za-z]/g, '')
        .trim();
      const clean = stripped.replace(/[|/\-\\]/g, '').trim();
      if (clean.length >= 3) return true;
      if (stripped.length > 0 && /^[|/\-\\]+$/.test(stripped)) {
        spinnerCount++;
        if (spinnerCount % 20 === 0) return true;
      }
    }
    return false;
  }

  const handleVisibilityChange = () => {
    isTabVisible = !document.hidden;
    if (!isTabVisible) {
      stallPausedAt = Date.now();
      runnerLog.debug('PreWarm', `${batchLabel}: tab hidden, pausing stall timer`);
    } else if (stallPausedAt) {
      const pauseDuration = Date.now() - stallPausedAt;
      lastRealProgress += pauseDuration;
      lastAnyOutput += pauseDuration;
      stallPausedAt = null;
      runnerLog.debug('PreWarm', `${batchLabel}: tab visible, resumed stall timer (paused ${Math.round(pauseDuration / 1000)}s)`);
    }
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  const parser = new NpmOutputParser((line, level) => {
    if (level === 'success') notifyPreWarm('installing', `${batchLabel}: ${line}`);
  });
  installProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        installOutput += data;
        lastAnyOutput = Date.now();
        if (hasRealNpmProgress(data)) {
          lastRealProgress = Date.now();
        }
        parser.feed(data);
      },
    })
  );

  const stallCheck = setInterval(() => {
    if (!isTabVisible) return;

    const silenceMs = Date.now() - lastAnyOutput;
    if (silenceMs > CRASH_SILENCE_MS) {
      runnerLog.error('PreWarm', `${batchLabel}: WebContainer crash detected — total silence for ${Math.round(silenceMs / 1000)}s, killing`);
      clearInterval(stallCheck);
      try { installProcess.kill(); } catch {}
      return;
    }

    const stallMs = Date.now() - lastRealProgress;
    if (stallMs > stallTimeoutMs) {
      runnerLog.warn('PreWarm', `${batchLabel}: npm stall — no real progress for ${Math.round(stallMs / 1000)}s (spinner only), killing`);
      clearInterval(stallCheck);
      try { installProcess.kill(); } catch {}
    }
  }, 10000);

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const exitCode = await Promise.race([
    installProcess.exit,
    new Promise<number>((resolve) => {
      timeoutId = setTimeout(() => {
        runnerLog.warn('PreWarm', `${batchLabel}: npm install timed out after ${timeoutMs / 1000}s, killing`);
        try { installProcess.kill(); } catch {}
        resolve(-1);
      }, timeoutMs);
    }),
  ]);
  if (timeoutId !== null) clearTimeout(timeoutId);
  clearInterval(stallCheck);
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }
  preWarmProcess = null;
  parser.flush();
  const npmTime = runnerLog.endTimer(`prewarm-npm-${batchLabel}`);

  if (exitCode === 0) {
    runnerLog.success('PreWarm', `${batchLabel} complete (${totalPkgs} packages)`, { npmTime: `${npmTime}ms` }, npmTime);
    return { success: true, output: installOutput };
  } else {
    runnerLog.error('PreWarm', `${batchLabel} failed`, {
      exitCode,
      npmTime: `${npmTime}ms`,
      output: installOutput.slice(-500),
    });
    return { success: false, output: installOutput };
  }
}

const VITE_CONFIG_CONTENTS = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5200,
  },
});
`;

const FALLBACK_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const FALLBACK_TSCONFIG_NODE = JSON.stringify({
  compilerOptions: {
    composite: true,
    skipLibCheck: true,
    module: "ESNext",
    moduleResolution: "bundler",
    allowSyntheticDefaultImports: true,
  },
  include: ["vite.config.ts"],
}, null, 2);

function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]|\x1B\].*?\x07|\x1B\[[\?]?[0-9;]*[A-Za-z]/g, '');
}

async function tryFetchAndMountSnapshot(container: WebContainer, url: string, label: string, onOutput?: (msg: string) => void): Promise<boolean> {
  try {
    const emit = (msg: string) => { notifyPreWarm('installing', msg); onOutput?.(msg); };
    runnerLog.info('PreWarm', `Trying snapshot from ${label}...`);
    emit('Downloading package cache...');

    const response = await fetch(url);
    if (!response.ok) {
      runnerLog.debug('PreWarm', `Snapshot not available at ${label} (HTTP ${response.status})`);
      onOutput?.(`Snapshot not available (${label})`);
      return false;
    }

    const compressedBuffer = await response.arrayBuffer();
    const compressedSize = (compressedBuffer.byteLength / 1024 / 1024).toFixed(1);
    runnerLog.info('PreWarm', `Downloaded snapshot: ${compressedSize} MB compressed`);
    emit(`Package cache downloaded (${compressedSize} MB), extracting...`);

    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(
      new Response(compressedBuffer).body!.pipeThrough(ds)
    );
    const jsonText = await decompressedStream.text();
    const uncompressedSize = (jsonText.length / 1024 / 1024).toFixed(1);
    runnerLog.info('PreWarm', `Decompressed: ${uncompressedSize} MB`);
    emit('Mounting packages into environment...');

    const snapshot = JSON.parse(jsonText) as FileSystemTree;

    runnerLog.startTimer('snapshot-mount');
    await container.mount(snapshot);
    const mountTime = runnerLog.endTimer('snapshot-mount');
    runnerLog.success('PreWarm', `Snapshot mounted from ${label}`, undefined, mountTime);
    emit(`Snapshot mounted (${mountTime}ms)`);

    await container.fs.writeFile('vite.config.ts', VITE_CONFIG_CONTENTS);
    runnerLog.debug('FileSystem', 'Wrote vite.config.ts after snapshot mount');

    return true;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    runnerLog.debug('PreWarm', `Snapshot load failed from ${label}: ${errMsg}`);
    onOutput?.(`Snapshot load failed: ${errMsg}`);
    return false;
  }
}

async function tryLoadSnapshot(container: WebContainer, onOutput?: (msg: string) => void): Promise<boolean> {
  const emit = (msg: string) => { onOutput?.(msg); };
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    runnerLog.warn('PreWarm', 'Snapshot skipped: no browser environment (window/fetch unavailable)');
    emit('Snapshot skipped: no browser environment');
    return false;
  }
  if (typeof DecompressionStream === 'undefined') {
    runnerLog.warn('PreWarm', 'Snapshot skipped: DecompressionStream not supported in this browser');
    emit('Snapshot skipped: browser does not support DecompressionStream');
    return false;
  }

  const origin = window.location.origin;

  const projectHash = localStorage.getItem('autocoder-last-project-hash');
  if (projectHash) {
    emit(`Looking for project snapshot (${projectHash})...`);
    notifyPreWarm('installing', `Looking for cached snapshot...`);
    const projectSnapshotUrl = `${origin}/cache/snapshot-${projectHash}.json.gz`;
    const loaded = await tryFetchAndMountSnapshot(container, projectSnapshotUrl, `project snapshot (${projectHash})`, onOutput);
    if (loaded) return true;
    runnerLog.debug('PreWarm', `Project snapshot not ready yet (hash ${projectHash}), falling back to live npm install`);
    emit('Project snapshot not available, falling back to npm install');
  } else {
    runnerLog.debug('PreWarm', 'No project hash found, falling back to live npm install');
    emit('No cached snapshot found, using npm install');
  }

  return false;
}

async function npmBatchInstallFallback(container: WebContainer): Promise<boolean> {
  const totalBatches = PREWARM_BATCHES.length;
  const totalDeps = Object.keys(CORE_PACKAGES).length;
  const totalDevDeps = Object.keys(CORE_DEV_PACKAGES).length;
  const totalPackageCount = totalDeps + totalDevDeps;

  runnerLog.info('PreWarm', `Falling back to npm install: ${totalDeps} deps + ${totalDevDeps} devDeps in ${totalBatches} batches`);
  notifyPreWarm('installing', `Installing ${totalPackageCount} packages via npm in ${totalBatches} steps...`);

  await container.fs.writeFile('vite.config.ts', VITE_CONFIG_CONTENTS);
  runnerLog.debug('FileSystem', 'Wrote pre-warm vite.config.ts');

  let completedBatches = 0;
  let cachedPackages = 0;
  const cumulativeDeps: Record<string, string> = {};
  const cumulativeDevDeps: Record<string, string> = {};

  for (let i = 0; i < totalBatches; i++) {
    const batch = PREWARM_BATCHES[i];
    const batchPkgCount = Object.keys(batch.deps).length + Object.keys(batch.devDeps).length;
    Object.assign(cumulativeDeps, batch.deps);
    Object.assign(cumulativeDevDeps, batch.devDeps);
    const cumulativeTotal = Object.keys(cumulativeDeps).length + Object.keys(cumulativeDevDeps).length;
    const pct = Math.round((cumulativeTotal / totalPackageCount) * 100);
    notifyPreWarm('installing', `${batch.description} (${i + 1}/${totalBatches}) — ${batchPkgCount} packages... ${pct}%`);

    const isLargeBatch = i === 0 || i === totalBatches - 1;
    const batchTimeout = isLargeBatch ? 300000 : 180000;
    const batchStallTimeout = i === 0 ? 180000 : 90000;
    let result = await runBatchInstall(container, cumulativeDeps, cumulativeDevDeps, batch.label, batchTimeout, batchStallTimeout);

    if (!result.success) {
      runnerLog.warn('PreWarm', `${batch.label} failed, retrying once...`);
      notifyPreWarm('installing', `${batch.description} failed, retrying... ${pct}%`);
      if (i === 0) {
        try {
          await container.fs.rm('node_modules', { recursive: true });
          runnerLog.debug('PreWarm', 'Cleared node_modules before retry (first batch, safe to clear)');
        } catch {}
      } else {
        runnerLog.debug('PreWarm', `Keeping node_modules intact (${cachedPackages} packages from earlier batches cached)`);
      }
      try {
        await container.fs.rm('package-lock.json');
        runnerLog.debug('PreWarm', 'Cleared package-lock.json before retry');
      } catch {}
      const retryTimeout = Math.max(batchTimeout, 300000);
      result = await runBatchInstall(container, cumulativeDeps, cumulativeDevDeps, `${batch.label}-retry`, retryTimeout, batchStallTimeout);
    }

    if (result.success) {
      completedBatches++;
      preWarmCompletedBatches = completedBatches;
      cachedPackages += batchPkgCount;
      const donePct = Math.round((cachedPackages / totalPackageCount) * 100);
      runnerLog.info('PreWarm', `${batch.description} done — ${cachedPackages}/${totalPackageCount} packages (${donePct}%)`);
      notifyPreWarm('installing', `${batch.description} done (${i + 1}/${totalBatches}) — ${donePct}%`);
    } else {
      runnerLog.warn('PreWarm', `${batch.description} (${batch.label}) failed`);
      if (completedBatches === 0) {
        return false;
      }
      break;
    }
  }
  return completedBatches > 0;
}

export async function preWarmWebContainer(): Promise<boolean> {
  // Guard: WebContainer requires SharedArrayBuffer, which needs COOP/COEP headers.
  // If cross-origin isolation is missing, set status to 'unsupported' and bail out
  // before attempting boot (which would throw immediately).
  if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
    preWarmStatus = 'unsupported';
    for (const listener of preWarmListeners) {
      listener('unsupported', 'Cross-Origin Isolation is not enabled. Live preview is unavailable.');
    }
    return false;
  }

  if (preWarmStatus === 'ready') {
    runnerLog.debug('PreWarm', 'Already warmed, skipping');
    return true;
  }
  if (preWarmPromise && preWarmStatus !== 'failed') {
    runnerLog.debug('PreWarm', 'Already in progress, waiting...');
    return preWarmPromise;
  }

  runnerLog.separator('PRE-WARM START');
  runnerLog.startTimer('prewarm-total');
  preWarmStartTime = Date.now();
  preWarmCompletedBatches = 0;

  const totalPackageCount = Object.keys(CORE_PACKAGES).length + Object.keys(CORE_DEV_PACKAGES).length;

  preWarmPromise = (async () => {
    try {
      preWarmStatus = 'booting';
      notifyPreWarm('booting', 'Starting WebContainer environment...');

      runnerLog.startTimer('prewarm-boot');
      const container = await getWebContainer();
      const bootTime = runnerLog.endTimer('prewarm-boot');
      runnerLog.success('PreWarm', 'WebContainer booted', undefined, bootTime);
      notifyPreWarm('booting', 'Environment ready');

      preWarmStatus = 'installing';

      const snapshotLoaded = await tryLoadSnapshot(container);

      if (snapshotLoaded) {
        preWarmCompletedBatches = PREWARM_BATCHES.length;
        preWarmStatus = 'ready';
        const totalTime = runnerLog.endTimer('prewarm-total');
        runnerLog.success('PreWarm', `Snapshot loaded! All ${totalPackageCount} packages ready (no npm needed)`, {
          totalTime: `${totalTime}ms`,
        }, totalTime);
        runnerLog.separator('PRE-WARM DONE (SNAPSHOT)');
        notifyPreWarm('ready', `All ${totalPackageCount} packages loaded from cache — 100%`);
        return true;
      }

      runnerLog.info('PreWarm', 'Snapshot unavailable, falling back to npm install...');
      notifyPreWarm('installing', 'Cache not available, installing via npm...');

      const npmSuccess = await npmBatchInstallFallback(container);

      preWarmStatus = npmSuccess ? 'ready' : 'failed';
      const totalTime = runnerLog.endTimer('prewarm-total');

      if (npmSuccess) {
        runnerLog.success('PreWarm', `npm install complete`, { totalTime: `${totalTime}ms` }, totalTime);
        runnerLog.separator('PRE-WARM DONE (NPM)');
        notifyPreWarm('ready', `Packages cached via npm — 100%`);
      } else {
        preWarmPromise = null;
        runnerLog.separator('PRE-WARM FAILED');
        notifyPreWarm('failed', 'Package installation failed — packages will install on demand');
      }
      return npmSuccess;
    } catch (err) {
      preWarmStatus = 'failed';
      preWarmPromise = null;
      runnerLog.endTimer('prewarm-total');
      const errMsg = err instanceof Error ? err.message : String(err);
      runnerLog.error('PreWarm', `Pre-warm error: ${errMsg}`, {
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
      });
      runnerLog.separator('PRE-WARM FAILED');
      notifyPreWarm('failed', `Pre-warm error: ${errMsg}`);
      return false;
    }
  })();

  return preWarmPromise;
}

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (bootPromise) {
    runnerLog.debug('WebContainer', 'Waiting for existing boot promise...');
    try {
      const instance = await bootPromise;
      if (instance) {
        webcontainerInstance = instance;
        return instance;
      }
    } catch (err) {
      runnerLog.warn('WebContainer', 'Previous boot promise failed, will retry', { error: String(err) });
      bootPromise = null;
    }
  }

  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  const isIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
  runnerLog.info('WebContainer', 'Booting WebContainer...', {
    coep: 'require-corp',
    crossOriginIsolated: isIsolated,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'unknown',
  });
  if (!isIsolated) {
    runnerLog.warn('WebContainer', 'crossOriginIsolated is FALSE - SharedArrayBuffer may not be available. Check server COOP/COEP headers.');
  }
  runnerLog.startTimer('wc-boot');
  bootPromise = WebContainer.boot();
  try {
    webcontainerInstance = await bootPromise;
    const bootMs = runnerLog.endTimer('wc-boot');
    runnerLog.success('WebContainer', 'WebContainer booted successfully', undefined, bootMs);
    return webcontainerInstance;
  } catch (err) {
    const errorStr = String(err);
    if (errorStr.includes('single') || errorStr.includes('already') || errorStr.includes('Only')) {
      runnerLog.warn('WebContainer', 'Boot rejected (singleton already exists). This is a browser-level limitation - page reload required for a fresh instance.');
    }
    bootPromise = null;
    throw err;
  }
}

export async function mountFiles(files: FileSystemTree): Promise<void> {
  const fileCount = countFiles(files);
  runnerLog.info('FileSystem', `Mounting ${fileCount} files...`);
  runnerLog.startTimer('mount-files');
  const container = await getWebContainer();
  await container.mount(files);
  const mountMs = runnerLog.endTimer('mount-files');
  runnerLog.success('FileSystem', `Mounted ${fileCount} files`, undefined, mountMs);
}

function countFiles(tree: FileSystemTree, depth = 0): number {
  let count = 0;
  for (const key of Object.keys(tree)) {
    const entry = tree[key];
    if ('file' in entry) {
      count++;
    } else if ('directory' in entry) {
      count += countFiles(entry.directory, depth + 1);
    }
  }
  return count;
}

export async function writeFile(path: string, contents: string): Promise<void> {
  const container = await getWebContainer();
  await container.fs.writeFile(path, contents);
  runnerLog.debug('FileSystem', `Wrote file: ${path}`, { size: `${contents.length} bytes` });
}

export async function readFile(path: string): Promise<string> {
  const container = await getWebContainer();
  const content = await container.fs.readFile(path, 'utf-8');
  runnerLog.debug('FileSystem', `Read file: ${path}`, { size: `${content.length} bytes` });
  return content;
}

export async function runCommand(
  command: string,
  args: string[] = [],
  onOutput?: (data: string) => void
): Promise<RunResult> {
  const container = await getWebContainer();
  const output: string[] = [];
  const errors: string[] = [];

  const cmdStr = `${command} ${args.join(' ')}`;
  runnerLog.info('Process', `Spawning: ${cmdStr}`);
  runnerLog.startTimer(`cmd-${cmdStr}`);

  const process = await container.spawn(command, args);

  process.output.pipeTo(
    new WritableStream({
      write(data) {
        output.push(data);
        onOutput?.(data);
      },
    })
  );

  const exitCode = await process.exit;
  const cmdMs = runnerLog.endTimer(`cmd-${cmdStr}`);

  if (exitCode === 0) {
    runnerLog.success('Process', `Command completed: ${cmdStr}`, { exitCode }, cmdMs);
  } else {
    runnerLog.error('Process', `Command failed: ${cmdStr}`, {
      exitCode,
      lastOutput: output.slice(-3).join('').trim().slice(-200),
    });
  }

  return {
    success: exitCode === 0,
    output,
    errors,
    exitCode,
  };
}

export async function installDependencies(
  onOutput?: (data: string) => void,
  timeoutMs: number = 300000,
  maxRetries: number = 3
): Promise<RunResult> {
  const container = await getWebContainer();
  const allOutput: string[] = [];
  const allErrors: string[] = [];
  let registryArg: string | null = null;

  if (preWarmProcess || (preWarmStatus === 'installing' && preWarmPromise)) {
    const elapsedMs = preWarmStartTime ? Date.now() - preWarmStartTime : 0;
    const elapsedS = Math.round(elapsedMs / 1000);
    const completedBatches = preWarmCompletedBatches ?? 0;
    const totalBatches = PREWARM_BATCHES.length;
    const remainingBatches = totalBatches - completedBatches;
    const waitTimeMs = Math.min(remainingBatches * 45000, 600000);
    const waitTimeS = Math.round(waitTimeMs / 1000);

    runnerLog.info('NPM', `Pre-warm is running (${elapsedS}s elapsed, ${completedBatches}/${totalBatches} batches done), waiting up to ${waitTimeS}s...`);
    onOutput?.(`⏳ Background package cache: ${completedBatches}/${totalBatches} batches done (${elapsedS}s elapsed), waiting up to ${waitTimeS}s...\n`);
    const preWarmDone = await awaitPreWarm(waitTimeMs);

    if (preWarmDone) {
      runnerLog.success('NPM', 'Pre-warm completed! Cached packages will speed up install.');
      onOutput?.('✓ Background cache complete, proceeding with install\n');
    } else if (preWarmProcess) {
      const nowCompleted = preWarmCompletedBatches ?? 0;
      runnerLog.warn('NPM', `Pre-warm did not finish in time (${nowCompleted}/${totalBatches} batches done after ${elapsedS + waitTimeS}s), stopping it to avoid conflicts`);
      onOutput?.(`⚠ Cache built ${nowCompleted}/${totalBatches} batches, stopping to proceed with install...\n`);
      try { preWarmProcess.kill(); } catch {}
      preWarmProcess = null;
      preWarmStatus = nowCompleted > 0 ? 'ready' : 'failed';

      runnerLog.info('NPM', 'Waiting for pre-warm process to fully terminate...');
      await new Promise(r => setTimeout(r, 3000));

      try {
        runnerLog.info('NPM', 'Cleaning up npm lock files after pre-warm stop...');
        const cleanups = [
          container.spawn('rm', ['-rf', 'node_modules/.package-lock.json']),
          container.spawn('rm', ['-f', 'package-lock.json']),
        ];
        const cleanupResults = await Promise.allSettled(cleanups.map(async (p) => {
          const proc = await p;
          await proc.exit;
        }));
        runnerLog.debug('NPM', 'Lock file cleanup done', {
          results: cleanupResults.map(r => r.status).join(', ')
        });
        await new Promise(r => setTimeout(r, 500));
      } catch (cleanErr) {
        runnerLog.debug('NPM', `Lock cleanup error (non-fatal): ${String(cleanErr)}`);
      }
    }
  }

  if (preWarmStatus === 'ready') {
    try {
      const pkgRaw = await container.fs.readFile('package.json', 'utf-8');
      const pkgJson = JSON.parse(pkgRaw);
      const projectDeps = pkgJson.dependencies || {};
      const projectDevDeps = pkgJson.devDependencies || {};
      const { deps: preWarmedDeps, devDeps: preWarmedDevDeps } = getPreWarmedPackages();
      const allPreWarmed = { ...preWarmedDeps, ...preWarmedDevDeps };

      const extraDeps = Object.keys(projectDeps).filter(d => !allPreWarmed[d]);
      const extraDevDeps = Object.keys(projectDevDeps).filter(d => !allPreWarmed[d]);

      runnerLog.separator('NPM INSTALL (SNAPSHOT-AWARE)');
      runnerLog.info('NPM', `Snapshot loaded — diffing packages instead of full install`);
      runnerLog.info('NPM', `Pre-warm diff: ${extraDeps.length} extra deps, ${extraDevDeps.length} extra devDeps`, {
        extraDeps: extraDeps.join(', ') || '(none)',
        extraDevDeps: extraDevDeps.join(', ') || '(none)',
        cachedDeps: Object.keys(preWarmedDeps).length,
        cachedDevDeps: Object.keys(preWarmedDevDeps).length,
      });

      if (extraDeps.length === 0 && extraDevDeps.length === 0) {
        runnerLog.success('NPM', 'All packages already pre-installed, skipping npm install');
        onOutput?.('✅ All packages pre-installed from snapshot, no npm install needed\n');
        await fixBinPermissions();
        runnerLog.separator('NPM INSTALL DONE (SNAPSHOT)');
        return { success: true, output: [], errors: [], exitCode: 0 };
      }

      onOutput?.(`📦 Installing ${extraDeps.length + extraDevDeps.length} extra packages (snapshot has the rest)...\n`);
      let allExtrasOk = true;

      if (extraDeps.length > 0) {
        const result = await runNpmInstall(extraDeps, false, onOutput, 120000, true);
        if (!result.success) {
          runnerLog.warn('NPM', 'Some extra dependency packages failed to install');
          onOutput?.('⚠️ Some extra packages failed, continuing...\n');
          allExtrasOk = false;
        }
      }
      if (extraDevDeps.length > 0) {
        const result = await runNpmInstall(extraDevDeps, true, onOutput, 120000, true);
        if (!result.success) {
          runnerLog.warn('NPM', 'Some extra devDependency packages failed to install');
          onOutput?.('⚠️ Some extra dev packages failed, continuing...\n');
          allExtrasOk = false;
        }
      }

      await fixBinPermissions();
      runnerLog.success('NPM', `Extra packages installed (${allExtrasOk ? 'all succeeded' : 'some failed'})`);
      onOutput?.('✅ Dependencies ready\n');
      runnerLog.separator('NPM INSTALL DONE (SNAPSHOT)');
      return { success: true, output: [], errors: [], exitCode: 0 };
    } catch (snapshotErr) {
      runnerLog.warn('NPM', `Snapshot-aware install failed (${String(snapshotErr)}), falling back to full install`);
      onOutput?.('⚠️ Could not use snapshot shortcut, running full install...\n');
    }
  }

  runnerLog.separator('NPM INSTALL');
  runnerLog.startTimer('npm-install-total');

  runnerLog.info('NPM', 'Checking npm registry connectivity...');
  onOutput?.('🔍 Checking npm registry connectivity...\n');
  const connectivity = await checkRegistryConnectivity(container);
  if (!connectivity.reachable) {
    runnerLog.error('NPM', 'Cannot reach any npm registry — network issue in WebContainer');
    onOutput?.('❌ Cannot reach npm registry. This is usually a network issue.\n');
    onOutput?.('   Try: 1) Check your internet connection  2) Disable VPN/proxy  3) Restart the app\n');
    allErrors.push('No npm registry reachable');
  } else {
    onOutput?.(`✓ Registry reachable: ${connectivity.registry}\n`);
    if (connectivity.registry && connectivity.registry !== 'https://registry.npmjs.org') {
      registryArg = `--registry=${connectivity.registry}`;
      runnerLog.info('NPM', `Using alternative registry: ${connectivity.registry}`);
      onOutput?.(`📦 Using mirror registry for faster downloads\n`);
    }
  }

  let stallCount = 0;
  let useNestedStrategy = false;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const baseArgs = [
      'install',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      '--omit=optional',
      '--legacy-peer-deps',
      '--loglevel=http',
      '--fetch-retries=2',
      '--fetch-timeout=30000'
    ];
    if (useNestedStrategy) {
      baseArgs.push('--install-strategy=nested', '--force');
    }
    if (registryArg) baseArgs.push(registryArg);

    runnerLog.info('NPM', `Install attempt ${attempt}/${maxRetries}`, {
      timeout: `${Math.round(timeoutMs / 1000)}s`,
      stallTimeout: `${Math.round(STALL_TIMEOUT_MS / 1000)}s`,
      flags: baseArgs.slice(1).join(' '),
    });
    onOutput?.(`\n--- npm install attempt ${attempt}/${maxRetries}...\n`);

    runnerLog.startTimer(`npm-attempt-${attempt}`);

    const result = await stallAwareNpmInstall({
      container,
      args: baseArgs,
      timeoutMs,
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onOutput,
      label: `Attempt ${attempt}`,
    });

    const attemptMs = runnerLog.endTimer(`npm-attempt-${attempt}`);

    if (result.success) {
      const totalMs = runnerLog.endTimer('npm-install-total');
      runnerLog.success('NPM', `Dependencies installed successfully on attempt ${attempt}`, {
        attemptTime: `${attemptMs}ms`,
        totalTime: `${totalMs}ms`,
      }, totalMs);
      runnerLog.separator('NPM INSTALL DONE');
      onOutput?.(`\n✅ Dependencies installed successfully!\n`);
      return {
        success: true,
        output: allOutput.concat(result.output),
        errors: allErrors,
        exitCode: 0,
      };
    }

    if (result.stalledOut) stallCount++;

    const outputText = result.output.join('\n') + '\n' + result.errors.join('\n');
    const hasEnotempty = outputText.includes('ENOTEMPTY') || outputText.includes('directory not empty');

    runnerLog.warn('NPM', `Attempt ${attempt} failed`, {
      exitCode: result.exitCode,
      stalledOut: result.stalledOut,
      attemptTime: `${attemptMs}ms`,
      reason: result.stalledOut ? 'stall (no output)' : hasEnotempty ? 'ENOTEMPTY (directory conflict)' : result.exitCode === -1 ? 'timeout' : `exit code ${result.exitCode}`,
    });
    allOutput.push(...result.output);
    allErrors.push(...result.errors);

    if (attempt < maxRetries) {
      const backoffMs = Math.min(2000 * Math.pow(2, attempt - 1), 15000);
      runnerLog.info('NPM', `Retrying in ${backoffMs / 1000}s (cleaning up first)...`);
      onOutput?.(`\n🔄 Retrying in ${Math.round(backoffMs/1000)}s...\n`);

      try {
        runnerLog.info('NPM', 'Cleaning npm cache/locks before retry...');
        const rmLock = await container.spawn('rm', ['-f', 'package-lock.json']);
        await rmLock.exit;
        const rmPkgLock = await container.spawn('rm', ['-rf', 'node_modules/.package-lock.json']);
        await rmPkgLock.exit;

        const isSnapshotLoaded = preWarmStatus === 'ready' && preWarmCompletedBatches >= PREWARM_BATCHES.length;
        if (attempt >= 2 || stallCount >= 2 || hasEnotempty) {
          if (isSnapshotLoaded) {
            runnerLog.info('NPM', 'ENOTEMPTY detected but snapshot is loaded — preserving node_modules, will retry with --install-strategy=nested');
            onOutput?.('🔄 Retrying with isolated install strategy (preserving cached packages)...\n');
            useNestedStrategy = true;
          } else {
            runnerLog.info('NPM', hasEnotempty ? 'ENOTEMPTY detected, removing node_modules for clean install' : 'Removing node_modules for clean install');
            onOutput?.('🧹 Cleaning node_modules for fresh install...\n');
            const rmModules = await container.spawn('rm', ['-rf', 'node_modules']);
            await rmModules.exit;
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        if (stallCount >= 2 && !registryArg) {
          runnerLog.info('NPM', 'Multiple stalls detected, trying alternative registry...');
          onOutput?.('🔄 Trying alternative npm registry...\n');
          for (const alt of ALTERNATIVE_REGISTRIES) {
            const check = await checkRegistryConnectivity(container);
            if (check.reachable && check.registry) {
              registryArg = `--registry=${check.registry}`;
              runnerLog.info('NPM', `Switching to registry: ${check.registry}`);
              onOutput?.(`📦 Switched to: ${check.registry}\n`);
              break;
            }
          }
        }
      } catch (cleanErr) {
        runnerLog.debug('NPM', `Pre-retry cleanup error (non-fatal): ${String(cleanErr)}`);
      }

      await new Promise(r => setTimeout(r, backoffMs));
    }
  }

  runnerLog.warn('NPM', 'Standard install failed after all retries, trying minimal install...');
  onOutput?.('\n⚠️ Standard install failed, trying minimal install...\n');

  try {
    runnerLog.info('NPM', 'Full cleanup before minimal install fallback');
    onOutput?.('🧹 Cleaning everything for fresh minimal install...\n');
    const rmAll = await container.spawn('rm', ['-rf', 'node_modules', 'package-lock.json']);
    await rmAll.exit;
    await new Promise(r => setTimeout(r, 1000));

    runnerLog.startTimer('npm-minimal');

    const minimalArgs = [
      'install',
      '--prefer-offline',
      '--no-audit',
      '--no-fund',
      '--omit=optional',
      '--legacy-peer-deps',
      '--ignore-scripts',
      '--loglevel=http'
    ];
    if (registryArg) minimalArgs.push(registryArg);

    const minimalResult = await stallAwareNpmInstall({
      container,
      args: minimalArgs,
      timeoutMs: 90000,
      stallTimeoutMs: STALL_TIMEOUT_MS,
      onOutput,
      label: 'Minimal install',
    });

    const minimalMs = runnerLog.endTimer('npm-minimal');

    if (minimalResult.success) {
      const totalMs = runnerLog.endTimer('npm-install-total');
      runnerLog.success('NPM', 'Minimal install succeeded (some scripts skipped)', {
        minimalTime: `${minimalMs}ms`,
        totalTime: `${totalMs}ms`,
      }, totalMs);
      runnerLog.separator('NPM INSTALL DONE (MINIMAL)');
      onOutput?.('\n✅ Minimal dependencies installed (some scripts skipped)\n');
      return {
        success: true,
        output: allOutput.concat(minimalResult.output),
        errors: allErrors,
        exitCode: 0,
      };
    }

    runnerLog.error('NPM', 'Minimal install also failed', {
      minimalTime: `${minimalMs}ms`,
      stalledOut: minimalResult.stalledOut,
    });
  } catch (err) {
    allErrors.push(String(err));
    runnerLog.error('NPM', `Minimal install error: ${err}`);
  }

  runnerLog.endTimer('npm-install-total');
  const networkNote = stallCount > 0
    ? ' This appears to be a network/connectivity issue — npm could not download packages.'
    : '';
  runnerLog.error('NPM', 'All install attempts exhausted', {
    totalAttempts: maxRetries + 1,
    stallCount,
    errors: allErrors.slice(-3),
  });
  runnerLog.separator('NPM INSTALL FAILED');
  onOutput?.(`\n❌ npm install failed after all attempts.${networkNote}\n`);
  if (stallCount > 0) {
    onOutput?.('   Possible fixes:\n');
    onOutput?.('   1. Check your internet connection\n');
    onOutput?.('   2. Disable VPN or proxy if active\n');
    onOutput?.('   3. Try using Node.js LTS (v20.x) instead of v24\n');
    onOutput?.('   4. Close and reopen the app to reset WebContainer\n');
  } else {
    onOutput?.('   Some packages may be missing. The app may still run if core dependencies are cached.\n');
  }
  return {
    success: false,
    output: allOutput,
    errors: [...allErrors, 'Installation failed after all retries'],
    exitCode: 1,
  };
}

export async function runNpmInstall(
  packages: string[],
  isDev: boolean = false,
  onOutput?: (data: string) => void,
  timeoutMs: number = 120000,
  noReconcile: boolean = false
): Promise<RunResult> {
  const container = await getWebContainer();
  const output: string[] = [];
  const errors: string[] = [];

  const pkgList = packages.join(', ');
  const installType = isDev ? 'devDependency' : 'dependency';
  runnerLog.info('NPM', `Installing ${packages.length} ${installType} packages: ${pkgList}${noReconcile ? ' (no-reconcile)' : ''}`);
  runnerLog.startTimer(`npm-pkg-${pkgList.slice(0, 30)}`);

  const args = [
    'install',
    ...packages,
    '--prefer-offline',
    '--no-audit',
    '--no-fund',
    '--loglevel=http',
    '--fetch-retries=1',
    '--fetch-timeout=15000'
  ];

  if (noReconcile) {
    args.push('--no-package-lock', '--legacy-peer-deps', '--install-strategy=nested', '--force');
  }

  if (isDev) {
    args.push('--save-dev');
  }

  return new Promise(async (resolve) => {
    let processRef: { kill: () => void } | null = null;

    const timeoutId = setTimeout(() => {
      runnerLog.error('NPM', `Package install timed out after ${Math.round(timeoutMs / 1000)}s`, {
        packages: pkgList,
        type: installType,
      });
      try { processRef?.kill(); } catch {}
      resolve({
        success: false,
        output,
        errors: ['Timeout'],
        exitCode: -1,
      });
    }, timeoutMs);

    try {
      const pkgParser = new NpmOutputParser((line, level) => {
        if (level !== 'debug') onOutput?.(line + '\n');
      });
      const process = await container.spawn('npm', args);
      processRef = process;

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            output.push(data);
            pkgParser.feed(data);
          },
        })
      );

      const exitCode = await process.exit;
      pkgParser.flush();
      clearTimeout(timeoutId);

      const timerKey = `npm-pkg-${pkgList.slice(0, 30)}`;
      const pkgMs = runnerLog.endTimer(timerKey);

      if (exitCode === 0) {
        runnerLog.success('NPM', `Installed ${packages.length} ${installType} packages`, {
          packages: pkgList,
        }, pkgMs);
      } else {
        runnerLog.error('NPM', `Failed to install ${installType} packages`, {
          packages: pkgList,
          exitCode,
          lastOutput: output.slice(-2).join('').trim().slice(-200),
        });
      }

      resolve({
        success: exitCode === 0,
        output,
        errors,
        exitCode,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      const errStr = String(err);
      errors.push(errStr);
      runnerLog.error('NPM', `Spawn error during package install: ${errStr}`, {
        packages: pkgList,
        type: installType,
      });
      resolve({
        success: false,
        output,
        errors: [errStr],
        exitCode: 1,
      });
    }
  });
}

export async function fixBinPermissions(): Promise<void> {
  try {
    const container = await getWebContainer();
    const binEntries = await container.fs.readdir('node_modules/.bin').catch(() => [] as string[]);
    if (binEntries.length === 0) return;

    const criticalBins = ['vite', 'tsc', 'tsx', 'esbuild', 'tailwindcss'];
    const toFix = criticalBins.filter(b => binEntries.includes(b));

    if (toFix.length > 0) {
      const proc = await container.spawn('chmod', ['+x', ...toFix.map(b => `node_modules/.bin/${b}`)]);
      await proc.exit;
      runnerLog.debug('FileSystem', `Fixed bin permissions: ${toFix.join(', ')}`);
    }
  } catch (err) {
    runnerLog.debug('FileSystem', `fixBinPermissions non-fatal: ${String(err)}`);
  }
}

export async function runNodeScript(
  scriptPath: string,
  onOutput?: (data: string) => void
): Promise<RunResult> {
  runnerLog.info('Process', `Running node script: ${scriptPath}`);
  return runCommand('node', [scriptPath], onOutput);
}

async function ensureCriticalFiles(container: WebContainer): Promise<void> {
  // Ensure vite.config.ts has ESM __dirname polyfill
  try {
    const viteContent = await container.fs.readFile('vite.config.ts', 'utf-8');
    if (viteContent && !viteContent.includes('fileURLToPath')) {
      const patched = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nimport path from 'path';\nimport { fileURLToPath } from 'url';\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n` +
        viteContent
          .replace(/import\s*\{?\s*defineConfig\s*\}?\s*from\s*['"]vite['"];?\n?/g, '')
          .replace(/import\s+react\s+from\s*['"]@vitejs\/plugin-react['"];?\n?/g, '')
          .replace(/import\s+path\s+from\s*['"]path['"];?\n?/g, '')
          .replace(/import\s*\*\s*as\s+path\s+from\s*['"]path['"];?\n?/g, '')
          .replace(/const\s+__dirname\s*=\s*[^;\n]+;?\n?/g, '')
          .replace(/const\s+__filename\s*=\s*[^;\n]+;?\n?/g, '');
      await container.fs.writeFile('vite.config.ts', patched);
      runnerLog.info('DevServer', 'Patched vite.config.ts with ESM __dirname polyfill');
    }
  } catch {
    await container.fs.writeFile('vite.config.ts', VITE_CONFIG_CONTENTS);
    runnerLog.info('DevServer', 'Wrote fallback vite.config.ts');
  }

  // Ensure index.html exists (Vite exits silently without it)
  try {
    await container.fs.readFile('index.html', 'utf-8');
  } catch {
    await container.fs.writeFile('index.html', FALLBACK_INDEX_HTML);
    runnerLog.info('DevServer', 'Wrote fallback index.html');
  }

  // Ensure tsconfig.node.json exists (tsconfig.json references it)
  try {
    await container.fs.readFile('tsconfig.node.json', 'utf-8');
  } catch {
    await container.fs.writeFile('tsconfig.node.json', FALLBACK_TSCONFIG_NODE);
    runnerLog.info('DevServer', 'Wrote fallback tsconfig.node.json');
  }
}

async function attemptStartVite(
  container: WebContainer,
  onOutput?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<{ url: string; process: any; stdinWriter: WritableStreamDefaultWriter<string> | null }> {
  runnerLog.startTimer('dev-server-startup');

  // Spawn vite directly instead of via `npm run dev`.
  // npm doesn't forward stdin to child processes, so holding npm's stdin
  // open does NOT prevent Vite from seeing EOF on its own stdin.
  const proc = await container.spawn('./node_modules/.bin/vite', ['--host', '0.0.0.0']);
  runnerLog.debug('DevServer', 'Vite process spawned directly (./node_modules/.bin/vite --host)');

  // CRITICAL: Keep stdin open to prevent Vite from exiting.
  // Vite 5+ in non-TTY mode listens for stdin EOF and calls server.close().
  let stdinWriter: WritableStreamDefaultWriter<string> | null = null;
  try {
    stdinWriter = proc.input.getWriter();
    runnerLog.debug('DevServer', 'Acquired stdin writer to keep Vite alive');
  } catch (e) {
    runnerLog.warn('DevServer', `Could not acquire stdin writer: ${e}`);
  }

  const outputChunks: string[] = [];

  proc.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput?.(data);
        const clean = stripAnsi(data).trim();
        if (clean) {
          outputChunks.push(clean);
          if (clean.includes('error') || clean.includes('Error') || clean.includes('ERR')) {
            runnerLog.error('DevServer', clean);
          } else if (clean.includes('warn') || clean.includes('WARN')) {
            runnerLog.warn('DevServer', clean);
          } else if (clean.includes('ready') || clean.includes('localhost') || clean.includes('Local:')) {
            runnerLog.success('DevServer', clean);
          } else {
            runnerLog.debug('DevServer', clean);
          }
        }
      },
    })
  );

  const DEV_SERVER_TIMEOUT_MS = 60000;

  return new Promise<{ url: string; process: any; stdinWriter: WritableStreamDefaultWriter<string> | null }>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      runnerLog.error('DevServer', `Dev server did not become ready within ${DEV_SERVER_TIMEOUT_MS / 1000}s`);
      reject(new Error(`Dev server startup timed out after ${DEV_SERVER_TIMEOUT_MS / 1000}s`));
    }, DEV_SERVER_TIMEOUT_MS);

    const serverReadyHandler = (port: number, url: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try { container.off('server-ready', serverReadyHandler); } catch {}
      const startupMs = runnerLog.endTimer('dev-server-startup');
      runnerLog.success('DevServer', `Server ready at ${url} (port ${port})`, { port, url }, startupMs);
      runnerLog.separator('DEV SERVER READY');
      resolve({ url, process: proc, stdinWriter });
    };
    container.on('server-ready', serverReadyHandler);

    proc.exit.then((exitCode: number) => {
      runnerLog.info('DevServer', `Vite process exited with code ${exitCode}`);
      if (stdinWriter) {
        try { stdinWriter.releaseLock(); } catch {}
        stdinWriter = null;
      }
      if (settled) {
        activeDevServer = null;
        devServerPromise = null;
        return;
      }
      settled = true;
      clearTimeout(timeout);
      try { container.off('server-ready', serverReadyHandler); } catch {}
      const lastOutput = outputChunks.slice(-5).join(' | ');
      reject(new Error(`Vite exited with code ${exitCode} before becoming ready. Last output: ${lastOutput || '(none)'}`));
    });
  });
}

export async function startDevServer(
  onOutput?: (data: string) => void,
  onServerReady?: (url: string) => void
): Promise<{ url: string; process: any }> {
  if (activeDevServer) {
    runnerLog.info('DevServer', `Dev server already running at ${activeDevServer.url}, reusing`);
    onServerReady?.(activeDevServer.url);
    return activeDevServer;
  }

  if (devServerPromise) {
    runnerLog.info('DevServer', 'Dev server already starting, waiting for it...');
    const result = await devServerPromise;
    onServerReady?.(result.url);
    return result;
  }

  devServerPromise = (async () => {
    const container = await getWebContainer();

    await fixBinPermissions();
    await ensureCriticalFiles(container);

    runnerLog.separator('DEV SERVER START');
    runnerLog.info('DevServer', 'Starting Vite dev server (direct binary)...');

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          runnerLog.info('DevServer', `Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
          await fixBinPermissions();
        }

        const result = await attemptStartVite(container, onOutput, onServerReady);
        activeDevServer = result;
        onServerReady?.(result.url);

        result.process.exit.then(() => {
          activeDevServer = null;
          devServerPromise = null;
        });

        return { url: result.url, process: result.process };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        runnerLog.warn('DevServer', `Attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}`);
      }
    }

    throw lastError || new Error('Dev server failed to start after all retries');
  })();

  try {
    return await devServerPromise;
  } catch (err) {
    devServerPromise = null;
    throw err;
  }
}

export async function teardown(): Promise<void> {
  if (webcontainerInstance) {
    runnerLog.info('WebContainer', 'Tearing down WebContainer...');
    runnerLog.startTimer('wc-teardown');
    await webcontainerInstance.teardown();
    const teardownMs = runnerLog.endTimer('wc-teardown');
    runnerLog.success('WebContainer', 'WebContainer torn down', undefined, teardownMs);
    webcontainerInstance = null;
    bootPromise = null;
    preWarmStatus = 'idle';
    preWarmPromise = null;
    lastPackageJsonHash = null;
    activeDevServer = null;
    devServerPromise = null;
  } else {
    runnerLog.debug('WebContainer', 'Teardown called but no instance exists');
  }
}