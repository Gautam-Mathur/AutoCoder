# Codebase Endpoint & API Path Integrity Report

This document reports the verification of routing alignment between client-side fetch calls (frontend) and Next.js server-side API route handlers.

---

## 1. Executive Summary

We executed an automated static analysis scanning all frontend components and hook contexts in the `src/` directory tree. The script extracted every `fetch` and `EventSource` URL, resolved template literals and query parameters, and cross-referenced them against the physical Next.js route handlers on the filesystem.

| Metric | Value | Status |
| :--- | :--- | :--- |
| **Total Scanned Client Files** | 48 | Complete |
| **Total API Calls Scanned** | 24 | Checked |
| **Mismatched Endpoints** | 0 | **100% Aligned** |

---

## 2. API Endpoint Mapping Verification

The following table records the verification status of all endpoints invoked by the client-side app:

| Client Invocation (fetch/SSE) | Next.js API File | Type | Resolution Status |
| :--- | :--- | :--- | :--- |
| `GET /api/conversations` | `src/app/api/conversations/route.ts` | Dynamic | ✅ Aligned |
| `POST /api/conversations` | `src/app/api/conversations/route.ts` | Dynamic | ✅ Aligned |
| `DELETE /api/conversations/clear` | `src/app/api/conversations/clear/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/conversations/${id}` | `src/app/api/conversations/[id]/route.ts` | Dynamic | ✅ Aligned |
| `DELETE /api/conversations/[id]` | `src/app/api/conversations/[id]/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/conversations/${id}/download` | `src/app/api/conversations/[id]/download/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/conversations/${id}/files` | `src/app/api/conversations/[id]/files/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/conversations/${id}/files/read` | `src/app/api/conversations/[id]/files/read/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/conversations/${id}/telemetry` | `src/app/api/conversations/[id]/telemetry/route.ts` | Dynamic | ✅ Aligned |
| `POST /api/pipeline/resume` | `src/app/api/pipeline/resume/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/pipeline/stream` | `src/app/api/pipeline/stream/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/health` | `src/app/api/health/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/health/system` | `src/app/api/health/system/route.ts` | Dynamic | ✅ Aligned |
| `GET /api/settings` | `src/app/api/settings/route.ts` | Dynamic | ✅ Aligned |
| `POST /api/settings` | `src/app/api/settings/route.ts` | Dynamic | ✅ Aligned |

---

## 3. Findings

1. **Exact Segment Matching**: Dynamic parameters such as `${id}`, `${activeId}`, and `${activeConversation.id}` match the Next.js `[id]` folder structure exactly.
2. **Method Conformity**: HTTP request methods (GET, POST, DELETE) declared on client-side requests match the exported route handler functions (`GET`, `POST`, `DELETE`) defined in Next.js backend routes.
3. **Query Parameter Integrity**: Parameters like `?conversationId=...` or `?file=...` are correctly parsed by the backend routes using `request.nextUrl.searchParams`.

---

## 4. Conclusion

There are **zero mismatches** in file names, directory names, or API routing endpoints across the codebase.
