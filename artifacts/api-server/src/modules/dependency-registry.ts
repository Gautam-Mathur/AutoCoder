export const AVAILABLE_DEPS: Record<string, string> = {
  // ── Core React ──────────────────────────────────────────────────────
  'react': '^18.3.1', 'react-dom': '^18.3.1',

  // ── Routing ─────────────────────────────────────────────────────────
  'wouter': '^3.0.0', 'react-router-dom': '^6.20.0',

  // ── Data fetching & tables ──────────────────────────────────────────
  '@tanstack/react-query': '^5.0.0', '@tanstack/react-table': '^8.11.0',
  '@tanstack/react-virtual': '^3.2.0', '@tanstack/react-form': '^0.19.0',
  '@tanstack/react-router': '^1.15.0',

  // ── Icons ───────────────────────────────────────────────────────────
  'lucide-react': '^0.344.0', 'react-icons': '^5.0.0',
  '@heroicons/react': '^2.1.1', '@phosphor-icons/react': '^2.0.15',
  '@tabler/icons-react': '^3.1.0',

  // ── Class utilities ─────────────────────────────────────────────────
  'clsx': '^2.1.0', 'tailwind-merge': '^2.2.0', 'class-variance-authority': '^0.7.0',
  'classnames': '^2.5.1', 'cntl': '^1.0.0',
  'tailwind-variants': '^0.2.0',

  // ── Validation ──────────────────────────────────────────────────────
  'zod': '^3.22.0', 'zod-to-json-schema': '^3.22.0',
  'valibot': '^0.30.0', 'superstruct': '^1.0.4', 'joi': '^17.12.0',
  'ajv': '^8.12.0', 'ajv-formats': '^2.1.1',

  // ── Forms ───────────────────────────────────────────────────────────
  'react-hook-form': '^7.50.0', '@hookform/resolvers': '^3.3.0',
  'formik': '^2.4.5', 'yup': '^1.3.3',

  // ── Animation ───────────────────────────────────────────────────────
  'framer-motion': '^11.0.0', '@react-spring/web': '^9.7.3',
  'motion': '^11.0.0', 'react-transition-group': '^4.4.5',
  'react-flip-move': '^3.0.5', 'auto-animate': '^0.8.1',
  'animejs': '^3.2.2', 'gsap': '^3.12.5',
  'popmotion': '^11.0.5',

  // ── Radix UI primitives ─────────────────────────────────────────────
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
  '@radix-ui/react-toolbar': '^1.0.4',
  '@radix-ui/react-visually-hidden': '^1.0.3',

  // ── shadcn ecosystem extras ─────────────────────────────────────────
  'embla-carousel-react': '^8.0.0', 'vaul': '^0.9.0', 'sonner': '^1.4.0',
  'input-otp': '^1.2.0', 'cmdk': '^0.2.0',
  'react-day-picker': '^8.10.0', 'date-fns': '^3.3.1',
  'nanoid': '^5.0.0', 'uuid': '^9.0.0',

  // ── Headless UI ─────────────────────────────────────────────────────
  '@headlessui/react': '^1.7.18',
  '@floating-ui/react': '^0.26.9', '@floating-ui/dom': '^1.6.3',
  'downshift': '^9.0.4',
  'react-aria': '^3.33.0', 'react-aria-components': '^1.1.1',
  'react-stately': '^3.31.0',
  '@ariakit/react': '^0.4.5',

  // ── Toast / notifications ───────────────────────────────────────────
  'react-hot-toast': '^2.4.1', 'react-toastify': '^10.0.4',
  'notistack': '^3.0.1',

  // ── Server / Express ────────────────────────────────────────────────
  'express': '^4.18.2', 'cors': '^2.8.5', 'body-parser': '^1.20.0',
  'helmet': '^7.1.0', 'cookie-parser': '^1.4.6',
  'morgan': '^1.10.0', 'compression': '^1.7.4', 'dotenv': '^16.4.0',
  'serve-static': '^1.15.0', 'http-proxy-middleware': '^2.0.6',
  'express-async-errors': '^3.1.1',
  'hpp': '^0.2.3',

  // ── ORM / DB ────────────────────────────────────────────────────────
  'drizzle-orm': '^0.29.0', 'drizzle-zod': '^0.5.0',
  '@neondatabase/serverless': '^0.7.0',
  'pg': '^8.11.3', 'connect-pg-simple': '^9.0.0',
  'better-sqlite3': '^9.4.3',
  'kysely': '^0.27.3',
  'knex': '^3.1.0',
  'sequelize': '^6.37.1',
  'typeorm': '^0.3.20',
  'prisma': '^5.10.0', '@prisma/client': '^5.10.0',
  'mongoose': '^8.1.1',
  'redis': '^4.6.13', 'ioredis': '^5.3.2',

  // ── Auth ────────────────────────────────────────────────────────────
  'passport': '^0.7.0', 'passport-local': '^1.0.0', 'express-session': '^1.17.3',
  'bcryptjs': '^2.4.3', 'bcrypt': '^5.1.1',
  'express-rate-limit': '^7.1.0',
  'express-validator': '^7.0.0', 'multer': '^1.4.5-lts.1',
  'http-errors': '^2.0.0',
  'jose': '^5.2.0', 'jsonwebtoken': '^9.0.0',
  'passport-jwt': '^4.0.1', 'passport-google-oauth20': '^2.0.0',
  'passport-github2': '^0.1.12',
  'lucia': '^3.1.1',
  'arctic': '^1.2.1',
  'otplib': '^12.0.1', 'speakeasy': '^2.0.0',
  'argon2': '^0.31.2',

  // ── Charts & visualization ──────────────────────────────────────────
  'recharts': '^2.12.0', 'chart.js': '^4.4.0', 'react-chartjs-2': '^5.2.0',
  'react-circular-progressbar': '^2.1.0', 'react-countup': '^6.5.0',
  'react-sparklines': '^1.7.0',
  'd3': '^7.9.0', 'victory': '^37.0.1',
  '@nivo/core': '^0.84.0', '@nivo/bar': '^0.84.0', '@nivo/line': '^0.84.0',
  '@nivo/pie': '^0.84.0', '@nivo/heatmap': '^0.84.0',
  '@visx/group': '^3.3.0', '@visx/shape': '^3.5.0', '@visx/scale': '^3.5.0',
  '@visx/axis': '^3.10.1', '@visx/tooltip': '^3.3.0',
  'lightweight-charts': '^4.1.3',
  'react-gauge-chart': '^0.4.2',

  // ── Drag & drop ─────────────────────────────────────────────────────
  '@dnd-kit/core': '^6.1.0', '@dnd-kit/sortable': '^8.0.0', '@dnd-kit/utilities': '^3.2.2',
  'react-beautiful-dnd': '^13.1.1',
  'react-dnd': '^16.0.1', 'react-dnd-html5-backend': '^16.0.1',

  // ── HTTP clients ────────────────────────────────────────────────────
  'axios': '^1.6.0', 'swr': '^2.2.0',
  'ky': '^1.2.0', 'wretch': '^2.8.1', 'got': '^14.2.0',
  'node-fetch': '^3.3.2', 'cross-fetch': '^4.0.0',
  'ofetch': '^1.3.3',

  // ── State management ────────────────────────────────────────────────
  'zustand': '^4.4.0', 'jotai': '^2.6.0', 'immer': '^10.0.3', 'xstate': '^5.5.0',
  'recoil': '^0.7.7', 'valtio': '^1.13.2',
  'nanostores': '^0.9.5', '@nanostores/react': '^0.7.1',
  'effector': '^23.2.0', 'effector-react': '^23.2.0',
  'mobx': '^6.12.0', 'mobx-react-lite': '^4.0.5',
  'redux': '^5.0.1', '@reduxjs/toolkit': '^2.1.0', 'react-redux': '^9.1.0',
  'redux-persist': '^6.0.0',

  // ── Markdown & rich text ────────────────────────────────────────────
  'react-markdown': '^9.0.1', 'marked': '^12.0.0',
  'dompurify': '^3.0.8', 'sanitize-html': '^2.12.1',
  'highlight.js': '^11.9.0', 'prismjs': '^1.29.0',
  'react-syntax-highlighter': '^15.5.0',
  'remark-gfm': '^4.0.0', 'rehype-raw': '^7.0.0',
  'rehype-highlight': '^7.0.0', 'rehype-sanitize': '^6.0.0',
  'mdast-util-to-string': '^4.0.0',
  'shiki': '^1.1.7',

  // ── Rich text editors ───────────────────────────────────────────────
  'slate': '^0.101.0', 'slate-react': '^0.101.0', 'slate-history': '^0.100.0',
  '@tiptap/react': '^2.2.0', '@tiptap/starter-kit': '^2.2.0', '@tiptap/extension-placeholder': '^2.2.0',
  '@tiptap/extension-link': '^2.2.0', '@tiptap/extension-image': '^2.2.0',
  '@tiptap/extension-code-block-lowlight': '^2.2.0',
  'quill': '^2.0.0', 'react-quill': '^2.0.0',
  '@uiw/react-md-editor': '^4.0.4',
  '@monaco-editor/react': '^4.6.0',
  'codemirror': '^6.0.1', '@codemirror/lang-javascript': '^6.2.2',

  // ── Form inputs & pickers ──────────────────────────────────────────
  'react-select': '^5.8.0', 'react-color': '^2.19.3', 'react-color-palette': '^7.1.1',
  'react-number-format': '^5.3.1', 'react-textarea-autosize': '^8.5.3',
  'react-dropzone': '^14.2.3', 'react-signature-canvas': '^1.0.6',
  'react-datepicker': '^6.1.0',
  'react-phone-number-input': '^3.3.9',
  'react-tag-input-component': '^2.0.2',
  'react-input-mask': '^2.0.4',
  'react-credit-cards-2': '^1.0.2',
  'react-rating': '^2.0.5', 'react-star-ratings': '^2.3.0',
  'react-toggle': '^4.1.3',
  'react-slider': '^2.0.6',
  '@emoji-mart/react': '^1.1.1', '@emoji-mart/data': '^1.1.2',

  // ── Layout & resize ────────────────────────────────────────────────
  'react-virtuoso': '^4.7.0', 'react-window': '^1.8.10',
  'react-resizable-panels': '^2.0.0', 'react-grid-layout': '^1.4.4',
  'react-masonry-css': '^1.0.16',
  'react-split': '^2.0.14',
  'react-mosaic-component': '^6.1.0',
  'react-measure': '^2.5.2',

  // ── Flow / diagrams ─────────────────────────────────────────────────
  'reactflow': '^11.11.0',
  'elkjs': '^0.9.2', 'dagre': '^0.8.5',
  'mermaid': '^10.9.0',

  // ── Maps ────────────────────────────────────────────────────────────
  'leaflet': '^1.9.4', 'react-leaflet': '^4.2.1',
  '@react-google-maps/api': '^2.19.3',
  'react-map-gl': '^7.1.7', 'mapbox-gl': '^3.2.0',
  'pigeon-maps': '^0.21.6',

  // ── Media & players ─────────────────────────────────────────────────
  'react-player': '^2.14.1', 'react-webcam': '^7.2.0',
  'swiper': '^11.0.5', 'lottie-react': '^2.4.0',
  'react-image-gallery': '^1.3.0',
  'react-image-lightbox': '^5.1.4',
  'react-photo-album': '^2.3.1',
  'react-medium-image-zoom': '^5.1.10',
  'plyr-react': '^5.3.0',
  'wavesurfer.js': '^7.7.3',
  'tone': '^14.9.9',

  // ── Canvas / drawing ────────────────────────────────────────────────
  'konva': '^9.3.6', 'react-konva': '^18.2.10',
  'cropperjs': '^1.6.1', 'react-cropper': '^2.3.3',
  'react-zoom-pan-pinch': '^3.4.2',
  'fabric': '^5.3.0',
  'three': '^0.162.0', '@react-three/fiber': '^8.15.16', '@react-three/drei': '^9.99.5',
  'pixi.js': '^8.0.0',

  // ── Export / PDF / files ────────────────────────────────────────────
  'html2canvas': '^1.4.1', 'html-to-image': '^1.11.11',
  'jspdf': '^2.5.1', 'pdfmake': '^0.2.10',
  'react-qr-code': '^2.0.12', 'qrcode': '^1.5.3',
  'exceljs': '^4.4.0', 'file-saver': '^2.0.5',
  'papaparse': '^5.4.1', 'csv-parse': '^5.5.3', 'csv-stringify': '^6.4.5',
  'xlsx': '^0.18.5',
  '@react-pdf/renderer': '^3.4.2',
  'react-pdf': '^7.7.1',
  'docx': '^8.5.0',

  // ── Archive / compression ───────────────────────────────────────────
  'jszip': '^3.10.1',
  'archiver': '^7.0.0',
  'pako': '^2.1.0',

  // ── Serialization / utilities ───────────────────────────────────────
  'superjson': '^2.2.1', 'qs': '^6.11.2',
  'currency.js': '^2.0.4', 'decimal.js': '^10.4.3',
  'dayjs': '^1.11.0', 'moment': '^2.29.0', 'lodash': '^4.17.21',
  'lodash-es': '^4.17.21',
  'ramda': '^0.29.1',
  'remeda': '^1.42.0',
  'ts-pattern': '^5.0.8',
  'p-queue': '^8.0.1', 'p-limit': '^5.0.0', 'p-retry': '^6.2.0',
  'async-retry': '^1.3.3',
  'just-debounce-it': '^3.2.0', 'just-throttle': '^4.2.0',
  'just-safe-get': '^4.2.0', 'just-safe-set': '^4.2.1',
  'deepmerge': '^4.3.1', 'deepmerge-ts': '^5.1.0',
  'defu': '^6.1.4',
  'object-hash': '^3.0.0',
  'rfdc': '^1.3.1',

  // ── Real-time ───────────────────────────────────────────────────────
  'socket.io-client': '^4.7.0', 'socket.io': '^4.7.4',
  'ws': '^8.16.0',
  'pusher-js': '^8.4.0',
  'ably': '^1.2.49',
  'phoenix': '^1.7.11',

  // ── Scheduling / calendar ───────────────────────────────────────────
  'react-big-calendar': '^1.8.7',
  'react-timer-hook': '^3.0.7',
  '@fullcalendar/react': '^6.1.10', '@fullcalendar/daygrid': '^6.1.10',
  '@fullcalendar/timegrid': '^6.1.10', '@fullcalendar/interaction': '^6.1.10',
  'cron-parser': '^4.9.0',
  'cronstrue': '^2.48.0',

  // ── Table / data grid ───────────────────────────────────────────────
  'ag-grid-react': '^31.1.1', 'ag-grid-community': '^31.1.1',
  'react-data-grid': '^7.0.0-beta.42',
  'mantine-datatable': '^7.5.0',

  // ── Auto-animate / scroll ──────────────────────────────────────────
  '@formkit/auto-animate': '^0.8.1',
  'react-intersection-observer': '^9.8.1',
  'react-scroll': '^1.9.0',
  'react-scroll-parallax': '^3.4.5',
  'locomotive-scroll': '^4.1.4',
  'lenis': '^1.0.42',

  // ── Hooks libraries ─────────────────────────────────────────────────
  'react-use': '^17.5.0', 'usehooks-ts': '^3.0.1',
  'ahooks': '^3.7.11',
  '@uidotdev/usehooks': '^2.4.1',

  // ── Error / boundary / helmet ───────────────────────────────────────
  'react-error-boundary': '^4.0.12',
  'react-helmet-async': '^2.0.4',

  // ── i18n ────────────────────────────────────────────────────────────
  'react-i18next': '^14.0.5', 'i18next': '^23.10.0',
  'i18next-browser-languagedetector': '^7.2.0',
  'i18next-http-backend': '^2.4.3',
  'intl-messageformat': '^10.5.11',

  // ── Skeleton / loading ──────────────────────────────────────────────
  'react-loading-skeleton': '^3.4.0',
  'react-spinners': '^0.13.8',
  'react-content-loader': '^7.0.0',
  'nprogress': '^0.2.0',
  'react-top-loading-bar': '^2.3.1',

  // ── Fun / effects ───────────────────────────────────────────────────
  'react-confetti': '^6.1.0', 'canvas-confetti': '^1.9.2',
  'react-copy-to-clipboard': '^5.1.0',
  'react-type-animation': '^3.2.0',
  'react-typed': '^2.0.12',
  'typewriter-effect': '^2.21.0',
  'react-tsparticles': '^2.12.2', 'tsparticles-slim': '^2.12.0',
  'react-rough-notation': '^1.0.5',
  'react-tooltip': '^5.26.3',
  'react-joyride': '^2.8.1',

  // ── Avatar & placeholder ────────────────────────────────────────────
  'boring-avatars': '^1.10.1',
  '@dicebear/core': '^8.0.1', '@dicebear/collection': '^8.0.1',

  // ── IDs / crypto ────────────────────────────────────────────────────
  'cuid': '^3.0.0', 'cuid2': '^2.2.2', 'ulid': '^2.3.0',
  'short-uuid': '^4.2.2', 'hashids': '^2.3.0',

  // ── Comparison / matching ───────────────────────────────────────────
  'fast-deep-equal': '^3.1.3',
  'fuse.js': '^7.0.0', 'flexsearch': '^0.7.43',
  'minisearch': '^6.3.0', 'lunr': '^2.3.9',

  // ── Events / pubsub ─────────────────────────────────────────────────
  'mitt': '^3.0.1', 'eventemitter3': '^5.0.1',
  'tiny-emitter': '^2.1.0',

  // ── Assertions / invariants ─────────────────────────────────────────
  'tiny-invariant': '^1.3.3', 'invariant': '^2.2.4',
  'warning': '^4.0.3',

  // ── Debounce / throttle (React-specific) ────────────────────────────
  'use-debounce': '^10.0.0',

  // ── Validators ──────────────────────────────────────────────────────
  'validator': '^13.11.0', 'zxcvbn': '^4.4.2',
  'is-email': '^1.0.2', 'is-url': '^1.2.4',
  'libphonenumber-js': '^1.10.56',
  'credit-card-type': '^10.0.1',
  'card-validator': '^9.1.0',

  // ── Color manipulation ─────────────────────────────────────────────
  'chroma-js': '^2.4.2', 'colord': '^2.9.3',
  'color': '^4.2.3', 'tinycolor2': '^1.6.0',

  // ── String utilities ────────────────────────────────────────────────
  'change-case': '^5.4.3', 'title-case': '^4.3.1',
  'pluralize': '^8.0.0', 'slugify': '^1.6.6',
  'string-similarity': '^4.0.4',
  'escape-html': '^1.0.3', 'he': '^1.2.0',

  // ── Math / numbers ──────────────────────────────────────────────────
  'big.js': '^6.2.1', 'bignumber.js': '^9.1.2',
  'mathjs': '^12.4.0', 'fraction.js': '^4.3.7',
  'numbro': '^2.4.0', 'numeral': '^2.0.6',
  'accounting': '^0.4.1',

  // ── Date / time extras ──────────────────────────────────────────────
  'luxon': '^3.4.4', 'chrono-node': '^2.7.5',
  'ms': '^2.1.3', 'pretty-ms': '^9.0.0',
  'human-date': '^1.4.0', 'timeago.js': '^4.0.2',
  'date-fns-tz': '^2.0.0',

  // ── Payments ────────────────────────────────────────────────────────
  '@stripe/stripe-js': '^3.0.6', '@stripe/react-stripe-js': '^2.5.1',
  'stripe': '^14.18.0',
  'paypal-js': '^8.0.4', '@paypal/react-paypal-js': '^8.1.3',

  // ── Email ───────────────────────────────────────────────────────────
  'nodemailer': '^6.9.9',
  'resend': '^3.1.0',
  '@react-email/components': '^0.0.14',
  '@sendgrid/mail': '^8.1.1',
  'postmark': '^4.0.2',
  'mailgun.js': '^10.2.1',

  // ── File upload ─────────────────────────────────────────────────────
  'filepond': '^4.31.1', 'react-filepond': '^7.1.2',
  'uppy': '^3.22.1', '@uppy/react': '^3.2.1',
  'browser-image-compression': '^2.0.2',
  'blurhash': '^2.0.5', 'thumbhash': '^0.1.1',

  // ── Clipboard / sharing ─────────────────────────────────────────────
  'copy-to-clipboard': '^3.3.3',
  'react-share': '^5.1.0',
  'web-vitals': '^3.5.2',

  // ── PDF viewer ──────────────────────────────────────────────────────
  'pdfjs-dist': '^4.0.379',

  // ── Forms extra ─────────────────────────────────────────────────────
  'react-hook-form-persist': '^3.0.0',
  'final-form': '^4.20.10', 'react-final-form': '^6.5.9',

  // ── Testing-related (used in generated code) ────────────────────────
  'msw': '^2.2.1',

  // ── Logging ─────────────────────────────────────────────────────────
  'winston': '^3.11.0', 'pino': '^8.19.0', 'pino-pretty': '^10.3.1',
  'loglevel': '^1.9.1',
  'consola': '^3.2.3',

  // ── Caching ─────────────────────────────────────────────────────────
  'lru-cache': '^10.2.0', 'node-cache': '^5.1.2',
  'keyv': '^4.5.4',

  // ── Job queues ──────────────────────────────────────────────────────
  'bullmq': '^5.4.2',
  'bee-queue': '^1.7.1',
  'agenda': '^5.0.0',

  // ── Template / rendering ────────────────────────────────────────────
  'ejs': '^3.1.9', 'handlebars': '^4.7.8',
  'mustache': '^4.2.0', 'nunjucks': '^3.2.4',
  'liquid': '^5.1.1',

  // ── YAML / TOML / config ────────────────────────────────────────────
  'yaml': '^2.3.4', 'js-yaml': '^4.1.0',
  'toml': '^3.0.0',
  'ini': '^4.1.1',
  'dotenv-expand': '^11.0.6',
  'conf': '^12.0.0',
  'cosmiconfig': '^9.0.0',

  // ── Markdown plugins ────────────────────────────────────────────────
  'remark': '^15.0.1', 'remark-parse': '^11.0.0',
  'unified': '^11.0.4',
  'unist-util-visit': '^5.0.0',
  'mdx-bundler': '^10.0.1',

  // ── Crypto / hashing ───────────────────────────────────────────────
  'crypto-js': '^4.2.0',
  'hash-wasm': '^4.11.0',

  // ── URL / path ──────────────────────────────────────────────────────
  'path-to-regexp': '^6.2.1',
  'url-pattern': '^1.0.3',
  'query-string': '^9.0.0',
  'normalize-url': '^8.0.0',

  // ── Feature flags ───────────────────────────────────────────────────
  'unleash-proxy-client': '^3.3.1',
  'flagsmith': '^3.27.0',

  // ── Analytics / tracking ────────────────────────────────────────────
  'mixpanel-browser': '^2.49.0',
  'posthog-js': '^1.109.0',
  'react-ga4': '^2.1.0',
  'plausible-tracker': '^0.3.8',

  // ── Miscellaneous popular ───────────────────────────────────────────
  'sharp': '^0.33.2',
  'cheerio': '^1.0.0-rc.12',
  'turndown': '^7.1.3',
  'robots-parser': '^3.0.1',
  'xml2js': '^0.6.2',
  'fast-xml-parser': '^4.3.4',
  'idb': '^8.0.0',
  'localforage': '^1.10.0',
  'dexie': '^4.0.1',
  'rxjs': '^7.8.1',
  'fp-ts': '^2.16.2',
  'neverthrow': '^6.1.0',
  'zod-fetch': '^0.1.1',
  'type-fest': '^4.10.3',
  'ts-results': '^3.3.0',
  'tldts': '^6.1.10',
  'semver': '^7.6.0',
  'compare-versions': '^6.1.0',
  'human-id': '^4.1.1',
};

export const DEV_DEPS: Record<string, string> = {
  'vite': '^5.1.0', '@vitejs/plugin-react': '^4.2.0',
  'typescript': '^5.3.0', 'esbuild': '^0.19.0',
  'tailwindcss': '3.4.17', 'postcss': '^8.4.35', 'autoprefixer': '^10.4.17',
  '@types/react': '^18.2.0', '@types/react-dom': '^18.2.0', '@types/node': '^20.10.0',
  '@types/uuid': '^9.0.7',
  '@types/express': '^4.17.21', '@types/cors': '^2.8.17',
  '@types/morgan': '^1.9.9', '@types/compression': '^1.7.5',
  'drizzle-kit': '^0.20.0', '@types/bcryptjs': '^2.4.6',
  '@types/lodash': '^4.14.202',
  'tsx': '^4.7.0',
  '@types/pg': '^8.10.9', '@types/passport': '^1.0.16',
  '@types/express-session': '^1.17.10', '@types/jsonwebtoken': '^9.0.5',
  '@types/react-beautiful-dnd': '^13.1.8', '@types/multer': '^1.4.11',
  '@types/react-color': '^3.0.12', '@types/react-window': '^1.8.8',
  '@types/dompurify': '^3.0.5', '@types/sanitize-html': '^2.11.0',
  '@types/papaparse': '^5.3.14', '@types/prismjs': '^1.26.3',
  '@types/react-signature-canvas': '^1.0.5',
  '@types/react-copy-to-clipboard': '^5.0.7',
  '@types/react-syntax-highlighter': '^15.5.11',
  '@types/leaflet': '^1.9.8',
  '@types/react-grid-layout': '^1.3.5',
  '@types/react-big-calendar': '^1.8.4',
  '@types/react-datepicker': '^6.0.1',
  '@types/react-sparklines': '^1.7.5',
  '@types/validator': '^13.11.8', '@types/zxcvbn': '^4.4.4',
  '@types/file-saver': '^2.0.7', '@types/cookie-parser': '^1.4.6',
  '@types/passport-local': '^1.0.38', '@types/connect-pg-simple': '^7.0.3',
  '@types/qs': '^6.9.11', '@types/http-errors': '^2.0.4',
  'vitest': '^1.3.0',
  '@testing-library/react': '^14.2.0',
  '@testing-library/jest-dom': '^6.4.0',
  '@testing-library/user-event': '^14.5.0',
  'jsdom': '^24.0.0',
  'picomatch': '^4.0.2', 'fast-glob': '^3.3.2',

  '@types/better-sqlite3': '^7.6.8',
  '@types/bcrypt': '^5.0.2',
  '@types/passport-jwt': '^4.0.1',
  '@types/passport-google-oauth20': '^2.0.14',
  '@types/react-transition-group': '^4.4.10',
  '@types/d3': '^7.4.3',
  '@types/react-dnd': '^3.0.2',
  '@types/lodash-es': '^4.17.12',
  '@types/ramda': '^0.29.11',
  '@types/chroma-js': '^2.4.4',
  '@types/color': '^3.0.6',
  '@types/tinycolor2': '^1.4.6',
  '@types/pluralize': '^0.0.33',
  '@types/accounting': '^0.4.5',
  '@types/luxon': '^3.4.2',
  '@types/ms': '^0.7.34',
  '@types/nodemailer': '^6.4.14',
  '@types/archiver': '^6.0.2',
  '@types/pako': '^2.0.3',
  '@types/ejs': '^3.1.5',
  '@types/mustache': '^4.2.5',
  '@types/nunjucks': '^3.2.6',
  '@types/js-yaml': '^4.0.9',
  '@types/ini': '^4.1.0',
  '@types/crypto-js': '^4.2.2',
  '@types/numeral': '^2.0.5',
  '@types/he': '^1.2.3',
  '@types/escape-html': '^1.0.4',
  '@types/xml2js': '^0.4.14',
  '@types/turndown': '^5.0.4',
  '@types/semver': '^7.5.8',
  '@types/object-hash': '^3.0.6',
  '@types/nprogress': '^0.2.3',
  '@types/react-scroll': '^1.8.10',
  '@types/dagre': '^0.7.52',
  '@types/fabric': '^5.3.7',
  '@types/three': '^0.162.0',
  '@types/ws': '^8.5.10',
  '@types/string-similarity': '^4.0.2',
  '@types/react-input-mask': '^3.0.5',
  '@types/invariant': '^2.2.37',
  '@types/warning': '^3.0.3',
  '@types/react-measure': '^2.0.12',
  'prettier': '^3.2.5',
  'eslint': '^8.56.0',
  '@typescript-eslint/parser': '^7.0.0', '@typescript-eslint/eslint-plugin': '^7.0.0',
  'eslint-plugin-react-hooks': '^4.6.0',
  'lint-staged': '^15.2.2', 'husky': '^9.0.11',
  'concurrently': '^8.2.2',
  'cross-env': '^7.0.3',
  'nodemon': '^3.0.3',
  'rimraf': '^5.0.5',
  '@tailwindcss/forms': '^0.5.7',
  '@tailwindcss/typography': '^0.5.12',
  '@tailwindcss/aspect-ratio': '^0.4.2',
  '@tailwindcss/container-queries': '^0.1.1',
  'tailwindcss-animate': '^1.0.7',
  'daisyui': '^4.7.2',
};

export const ALWAYS_INCLUDE_DEPS = [
  'react', 'react-dom', 'clsx', 'tailwind-merge', 'zod',
];

export const ALWAYS_INCLUDE_DEV_DEPS = [
  'vite', '@vitejs/plugin-react', 'tailwindcss', 'postcss', 'autoprefixer', 'picomatch', 'fast-glob',
  'vitest', '@testing-library/react', '@testing-library/jest-dom', 'jsdom',
];

export const ALL_KNOWN_PACKAGES = new Set([
  ...Object.keys(AVAILABLE_DEPS),
  ...Object.keys(DEV_DEPS),
]);

interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export function detectUsedPackages(files: GeneratedFile[]): Set<string> {
  const allCode = files.map(f => f.content).join('\n');
  const used = new Set<string>();

  for (const pkg of Object.keys(AVAILABLE_DEPS)) {
    if (ALWAYS_INCLUDE_DEPS.includes(pkg)) {
      used.add(pkg);
      continue;
    }

    const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`['"]${escapedPkg}(?:/[^'"]*)?['"]`);
    if (importRegex.test(allCode)) {
      used.add(pkg);
    }
  }

  return used;
}

export function detectUsedDevPackages(files: GeneratedFile[]): Set<string> {
  const allCode = files.map(f => f.content).join('\n');
  const used = new Set<string>();

  for (const pkg of Object.keys(DEV_DEPS)) {
    if (ALWAYS_INCLUDE_DEV_DEPS.includes(pkg)) {
      used.add(pkg);
      continue;
    }

    const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRegex = new RegExp(`['"]${escapedPkg}(?:/[^'"]*)?['"]`);
    if (importRegex.test(allCode)) {
      used.add(pkg);
    }
  }

  return used;
}
