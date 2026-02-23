# GitHub Copilot Instructions for React & Next.js Projects

This file provides guidelines for GitHub Copilot to generate **consistent, clean, maintainable, and modern** React and Next.js code while reinforcing best practices and supporting long-term skill development.

---

## General Principles

- **Clean Code First:** Prioritize readability, maintainability, and reusability over cleverness.
- **Concise but Clear:** Prefer explicit, readable solutions over overly compact code.
- **Descriptive Naming:** Use long, clear names over short or vague ones (e.g., `getUserProfile`, `ProductCard`, `useAuthState`).
- **DRY (Don’t Repeat Yourself):** Extract reusable logic into functions, custom hooks, or shared utilities.
- **Feature-Based Structure:** Group code by feature, not by technical type.
- **Separation of Concerns:** Clearly separate UI, application logic, and data access.
- **Replaceable by Design:** Code should be easy to extend, refactor, or delete.
- **One Responsibility per Function:** One level of abstraction per function or API.
- **Favor Pure Functions:** Pure functions are preferred whenever possible to improve testability.
- **Type Safety Across the Stack:** Database → server → client types should be aligned. If a type changes, all usages should be aware.
- **TypeScript First:** All new code must be written in **TypeScript**.
- **Testable Code:** Design logic to be easily unit-testable.
- **Package Management:** Use **pnpm** exclusively (no `npm` or `yarn`).
- **Documentation:** Project documentation belongs in the `docs/` folder.

---

## Documentation & References

- **Use Context7** for documentation lookups when referencing frameworks, libraries, or APIs.
- Prefer **official documentation** and up-to-date sources over blog posts or outdated examples.
- Follow current best practices from React, Next.js, Tailwind, and shadcn/ui.

---

## React Guidelines

### Component Design

- **Functional Components Only:** Use functional components with hooks.
- **No Class Components:** Except explicitly for error boundaries.
- **Single Responsibility:** Components should be small, focused, and composable.
- **Naming:** Use `PascalCase` for components.
- **Props:**
  - Use `camelCase`
  - Destructure props in the function signature
  - Define explicit prop types using `interface` or `type`
- **Typing Components:**
  - Avoid `React.FC`
  - Explicitly type props instead
- **Immutability:** Never mutate props or state directly.
- **Fragments:** Avoid unnecessary DOM wrappers.
- **Custom Hooks:** Extract reusable stateful logic into custom hooks (e.g., `useDebounce`, `useLocalStorage`).
- **UI Components:** Use **shadcn/ui** for consistent, accessible UI primitives.

---

## Server vs Client Components (Critical)

- **Default to Server Components**
- Only use `"use client"` when required:
  - React hooks
  - Event handlers
  - Browser-only APIs
- **Client Components should:**
  - Be as small as possible
  - Receive data via props
  - Contain UI + interaction logic only
- **Never fetch data directly in Client Components** unless unavoidable.

---

## State Management

- **Local State:** Use `useState` or `useReducer` for component-level state.
- **Shared / Global State:** Prefer:
  - React Context for low-frequency updates
  - Zustand or similar lightweight libraries when needed
- **Avoid prop drilling** when state is shared across multiple layers.

---

## Styling

- **Tailwind CSS:** Use Tailwind CSS v4 or later.
- **Consistency:** Follow a consistent utility-first approach.
- **Scoped by Default:** Avoid global styles unless intentional.

---

## Performance Guidelines

- Always use stable, unique keys when rendering lists.
- Avoid using array indexes as keys for dynamic lists.
- Use `React.lazy`, `Suspense`, or `next/dynamic` for large or infrequently used components.
- Prefer server-side data fetching to reduce client bundle size.

---

## Next.js Guidelines

### Routing & Structure

- **App Router Only** for new development.
- Use file-system routing conventions.
- Use route groups `(folderName)` for organization without affecting URLs.
- Use dynamic routes (`[slug]`) clearly and intentionally.
- Use `middleware.ts` only for true cross-cutting concerns (auth, headers, redirects).

---

### Data Fetching

- Fetch data **in Server Components by default**.
- Use:
  - `fetch` with `revalidate` for static or semi-static data
  - Dynamic server fetches for frequently changing data
- Avoid client-side fetching for initial page loads unless required.
- Initiate independent fetches in parallel.

---

### Data Access Layer (Required)

- All data access must live outside UI components:
  - `lib/data/` → read operations
  - `lib/actions/` → mutations and server actions
- UI components must **never**:
  - Call databases directly
  - Call external APIs directly
- Data functions should return **typed domain objects**, not raw responses.

---

### Mutations & Server Actions

- Prefer **Server Actions** for:
  - Form submissions
  - Mutations
- Place Server Actions in `lib/actions/`.
- Client Components may call Server Actions directly—do not introduce REST APIs unnecessarily.

---

### Error & Loading States

- Use `loading.tsx` and `error.tsx` where appropriate.
- Handle errors explicitly in data-fetching and mutation logic.
- Avoid silent failures or empty UI states.

---

### Optimization

- Always use `next/image` for images.
- Always use `next/font` for fonts.
- Use `next/dynamic` for lazy-loading client-only components.

---

## Project Structure

- **Colocation:** Keep components, tests, and styles close to where they’re used.
- **Types:**
  - Shared / domain types → `types/`
  - Component-specific prop types → colocated with the component
- **Utilities:** Place reusable utilities in `lib/`.
- **Private Folders:** Use `_`-prefixed folders for internal modules.
- **No Barrel Files:** Import directly from source files to improve traceability and avoid circular dependencies.

---

## SEO & Accessibility

- Use `generateMetadata` for SEO.
- Prefer semantic HTML.
- Ensure keyboard navigation and proper ARIA usage.
- Accessibility is not optional.

---

## TypeScript

- `strict: true` must be enabled.
- All API responses, props, and state must be typed.
- Avoid `any` unless explicitly justified.

---

## Testing (Lightweight but Intentional)

- Suggest unit tests for complex logic.
- Prefer behavior-based tests over implementation details.
- Avoid excessive snapshot testing.

---

## Learning Mode (Important)

- When generating non-trivial logic:
  - Include brief inline comments explaining design decisions
  - Prefer clarity over clever abstractions
- When modifying existing code:
  - Prefer refactoring over rewriting
  - Preserve behavior unless instructed otherwise