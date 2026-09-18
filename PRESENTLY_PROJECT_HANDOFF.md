# Presently Project Handoff Summary

## 1. Product Overview

**Presently** is a portfolio builder for freelancers, designers, developers, students, and independent professionals. Its purpose is to help users create a calm, professional portfolio that shows their identity, work, results, and contact path without the complexity of traditional website builders or the restrictions of freelance marketplaces.

The central product promise is:

> Presently helps freelancers turn their work into trust, visibility, and paying client conversations.

Presently is designed to give each freelancer a focused, single-link professional presence where clients can quickly understand what the freelancer does, review real work, see evidence of outcomes, and start a conversation.

## 2. Product Vision and Market Direction

The product was shaped around common complaints about existing portfolio builders and freelance platforms:

| Problem | Presently opportunity |
|---|---|
| Freelancers do not know whether prospects viewed their portfolio | Add simple portfolio analytics and client engagement tracking |
| Standard galleries show attractive work but not business results | Use structured case studies with problem, solution, and impact sections |
| Marketplace platforms take large fees and restrict direct relationships | Give freelancers an independent branded portfolio and direct inquiry flow |
| Website builders are overwhelming and require too much setup | Offer a focused, fast portfolio-building experience with structured content |
| Contact details and forms are often buried | Add persistent, highly visible contact and inquiry actions |
| Portfolio sites can distract visitors with unrelated content | Keep the experience centered on one freelancer and their work |

The product should remain simple and focused. The first priority is a strong portfolio foundation and reliable client inquiry path. Advanced analytics, payments, and monetization should come after the core experience is stable.

## 3. Current Technical Stack

The current project is named **presently** and lives at:

`/home/ubuntu/presently`

The application is a full-stack TypeScript web application using:

- React 19
- Vite
- Tailwind CSS 4
- Express
- tRPC 11
- Drizzle ORM
- MySQL/TiDB through the existing Manus WebDev environment
- Manus OAuth authentication
- Manus storage/S3-compatible file storage
- Vitest for tests
- Wouter for client routing
- Lucide React icons
- Sonner for toasts

Important clarification: the original plan to migrate to Supabase/PostgreSQL was discussed, but the implemented project currently uses the existing Manus/MySQL/TiDB backend. The working application and all completed features are built on the current Manus backend. Do not assume Supabase has been implemented unless the project is intentionally migrated in a future phase.

The project uses the managed WebDev environment and currently has a running development preview. The latest saved checkpoint is:

`7d990431`

## 4. Frontend Design System

The frontend uses a warm editorial visual system rather than a generic dashboard style.

Main design characteristics:

- Warm cream background
- Deep forest green typography and primary actions
- Orange accent color
- Lime/light green secondary accent
- Rounded cards and controls
- Editorial display typography for headlines
- Responsive layouts for desktop and mobile
- Soft borders and subtle shadows
- Portfolio templates with distinct visual directions
- Social icons rather than text-only social links
- Live preview beside the editor on larger screens

The landing page headline is centered around:

> Present your work and professional identity.

The landing page emphasizes three onboarding paths:

1. Upload a PDF
2. Start from scratch
3. Refer and earn

The entire onboarding cards were made clickable, not only the small action text or button. Authenticated users can enter the editor directly, while unauthenticated users are sent through the existing sign-in flow.

## 5. Completed Frontend Features

### 5.1 Landing Page

The starter page was replaced with a Presently-branded landing page that includes:

- Brand header
- Main product statement
- Editorial visual card
- Three onboarding cards
- Product principles
- Referral call to action
- Direct editor access
- Full-card click targets
- Keyboard/focus-friendly interaction states

The landing page route is `/`.

### 5.2 Portfolio Editor

The protected editor is available at `/editor` and includes:

- Profile name
- Professional title
- Location
- Bio
- Skills
- Website
- GitHub
- LinkedIn
- Twitter/X
- Profile photo upload
- Resume upload
- Template selection
- Work/project creation
- Work/project editing
- Work/project deletion
- Project image and video uploads
- Project media removal
- Portfolio publishing and unpublishing
- Live portfolio preview
- Message me action in the editor preview
- Inbox link and unread inquiry badge
- Referral navigation
- View-live link when published

The editor uses tabs for:

- Profile
- Work
- Appearance

### 5.3 Portfolio Templates

The portfolio preview supports several visual directions, including:

- Minimal
- Dark developer
- Creative
- Editorial
- Professional

The preview component is shared between the editor and public portfolio. This ensures the editor preview and visitor-facing page use the same visual content model.

### 5.4 Social Links

Social links are shown in the live and public portfolio preview using recognizable icons:

- Website/globe
- GitHub
- LinkedIn
- Twitter/X

Social URLs are normalized so values without `https://` still open correctly.

### 5.5 Profile Image Upload

Profile image upload was repaired through several iterations.

The final behavior includes:

- Uploading a profile image to storage
- Saving the uploaded file ID
- Returning a typed numeric file ID from the backend
- Validating file ownership before saving the portfolio
- Showing the selected local image immediately in the live preview
- Hydrating the permanent storage URL after refresh
- Resolving the image URL for the private editor bundle
- Resolving the image URL for the public portfolio bundle

The local data URL preview was necessary because the storage URL was not always immediately available or renderable in the live preview.

### 5.6 Project Media Uploads

Freelancers can upload images and videos representing their work.

Supported formats include:

- JPG/JPEG
- PNG
- WebP
- MP4
- WebM
- MOV/QuickTime

The project media flow includes:

- Multiple file selection
- Up to eight files in the direct work upload queue
- Maximum media size of 50 MB
- Immediate local previews
- Persistent storage upload
- Owner-scoped upload procedures
- Project media deletion
- Inline rendering inside portfolio projects
- Image and video rendering in editor and public preview
- Ordered project media records

The user experience was intentionally changed from a project page requiring an additional gallery link to a direct work-upload flow. Visitors see work media directly in the portfolio instead of needing to click away to another page.

### 5.7 Structured Case Studies

The latest feature adds structured case-study sections to each project:

- **Client problem** — what issue, challenge, or opportunity the client faced
- **Solution** — what the freelancer did, built, designed, or changed
- **Business impact** — the measurable or meaningful result

These fields are:

- Editable in the Work tab
- Persisted through the backend
- Loaded when existing projects are edited
- Included in the editor live preview
- Included in the public portfolio preview
- Optional, so older projects continue to work
- Rendered only when populated

The portfolio preview displays them as compact structured sections below the project description. This moves Presently from being only a visual gallery toward an outcome-driven portfolio builder.

## 6. Inquiry and Contact Flow

Phase One added a direct client inquiry system.

### Public side

The public portfolio includes a persistent or prominent **Book Me / Message me** action. Visitors can open an inquiry form without leaving the portfolio.

The inquiry form supports:

- Sender name
- Sender email
- WhatsApp/contact value
- Service or project type
- Budget
- Timeline
- Message

### Freelancer side

Freelancers have an `/inbox` route where they can:

- View received inquiries
- See sender information
- Review message details
- Update inquiry status
- Track new, contacted, won, and archived states
- See unread inquiry count from the editor

The backend also creates in-app notifications and uses the owner notification integration for inquiry alerts where configured.

## 7. Backend and Data Model

The current schema includes the following main tables:

- `users`
- `portfolios`
- `projects`
- `projectMedia`
- `files`
- `inquiries`
- `notifications`
- `templates`
- `referrals`
- `rewards`
- `rewardAuditLogs`

### Users

Users are created or updated through Manus OAuth. The user model includes identity, role, sign-in timestamps, referral information, and suspension state.

### Portfolios

Portfolios store:

- User ownership
- Full name
- Professional title
- Bio
- Location
- Skills
- Social links
- Template ID
- Profile image file ID
- Resume file ID
- Slug
- Published state
- Published timestamp

### Projects

Projects now store:

- Portfolio ID
- Title
- Description
- Client problem
- Solution
- Business impact
- Image file ID
- Live URL
- GitHub URL
- Technologies
- Sort order
- Created/updated timestamps

The case-study fields were added as nullable text columns through migration `0004_kind_doctor_faustus.sql`.

### Project media

Project media connects projects to stored files and includes:

- Project ID
- User ID
- File ID
- Media type
- Caption
- Sort order
- Creation timestamp

### Files

Files store metadata and storage references rather than raw file bytes in the database.

The file record includes:

- User ID
- Portfolio ID
- Original filename
- Storage key
- Public/storage URL
- MIME type
- File size
- Category

## 8. Security and Ownership Work

Several security fixes were implemented.

### File ownership validation

The backend checks that a profile image or resume file belongs to the requesting user before saving the portfolio. A foreign file ID is rejected with a `FORBIDDEN` error.

The same ownership principles are applied to project media and project operations.

### Project ownership

Project create, update, delete, and media operations are scoped through the authenticated user’s portfolio. A user cannot modify another user’s project by changing an ID in the request.

### Public privacy

Public portfolio queries only return published portfolios. Profile images and project media are resolved with owner constraints so foreign files cannot leak into public bundles.

### Authentication

The app uses Manus OAuth. Earlier backend problems were traced to missing or incompatible session behavior around OAuth callbacks and cookies. Fixes included:

- Protocol-aware cookie handling
- Proxy trust configuration
- SameSite cookie correction
- Managed WebDev OAuth callback bridge
- Session cookie clearing consistency

The application backend routes are mounted under tRPC and the OAuth callback routes are part of the Express server.

## 9. Backend Repairs Already Completed

The original backend appeared to be nonfunctional from the frontend because authenticated session state was not persisting correctly. Public tRPC routes worked, but protected routes returned unauthorized errors.

The debugging process found and repaired:

- OAuth callback handling
- Session cookie attributes
- HTTPS proxy awareness
- Managed WebDev callback routing
- File upload insert ID handling
- Profile image URL resolution
- File ownership checks
- Project ownership lookup

The backend now has working public and protected procedure patterns, although authenticated browser testing still requires a valid logged-in session.

## 10. Validation and Testing

The latest automated verification passed:

- TypeScript check: passed
- Vitest test suite: passed
- Test files: 5
- Tests: 14 passing
- Production build: passed
- Case-study artifact verification: passed
- Database migration: applied successfully

The test suite currently covers:

- Auth logout behavior
- Cookie behavior
- Inquiry validation
- Portfolio file ownership
- Presently product rules
- Upload validation
- Slug behavior
- Referral qualification logic

## 11. GitHub and Branch History

A Claude-generated ownership patch was reviewed and applied to the Presently project. The work included profile image URL plumbing and file ownership validation.

The branch and pull request workflow was handled through the GitHub repository:

`The-masked-dev348/presently`

The project later incorporated the working changes into the active project state. The current WebDev checkpoint is the authoritative state for browser testing.

## 12. Current Known Limitations

The following areas are not yet complete or should be reviewed before production launch:

1. Authentication should be tested again in a clean browser session, especially the OAuth callback and protected editor access.
2. PDF upload exists as a file upload path but does not yet parse a PDF into profile/project fields.
3. Portfolio analytics have not yet been implemented.
4. There is no client-facing payment or service checkout system yet.
5. Email notification delivery depends on the configured notification integration.
6. There is no advanced drag-and-drop ordering for projects or case-study sections yet.
7. Case-study fields are currently plain text and do not yet support rich formatting, metrics, or visual result cards.
8. The current backend is still Manus/MySQL/TiDB-based rather than Supabase/PostgreSQL-based.
9. The public portfolio route and inquiry flow should be tested end to end with an authenticated freelancer and a separate visitor session.
10. The project currently has a large client bundle warning from Vite; code splitting could improve performance later.

## 13. Recommended Next Product Priorities

### Priority 1: Finish the case-study experience

Add optional structured metrics to each case study:

- Metric name
- Before value
- After value
- Percentage change
- Time period
- Client quote

This would make business impact more credible than a plain paragraph.

### Priority 2: Implement portfolio analytics

Track privacy-conscious events such as:

- Portfolio visit
- Project opened or viewed
- Media play
- External link click
- Inquiry form opened
- Inquiry submitted
- Scroll depth or engagement duration

Start with simple counts and timestamps rather than attempting a complex analytics platform.

### Priority 3: Improve inquiry conversion

Add:

- Email notifications to freelancers
- Auto-reply confirmation to clients
- Spam protection and rate limiting
- Inquiry source tracking
- Persistent mobile Message me button
- WhatsApp shortcut when configured

### Priority 4: PDF import

Allow a freelancer to upload a resume or portfolio PDF, extract text, and use it to suggest:

- Name
- Title
- Bio
- Skills
- Projects
- Technologies
- Social links

The freelancer should approve the suggestions before they are saved.

### Priority 5: Improve editor usability

Add:

- Autosave or draft status
- Drag-and-drop project ordering
- Preview/edit split-view toggle on mobile
- Case-study completion indicator
- Empty-state examples
- Sample project content to help first-time users

## 14. Ready-to-Copy Prompt for ChatGPT

Copy the following prompt into ChatGPT for analysis and next-step planning:

```text
You are analyzing an existing full-stack product called Presently.

Presently is a portfolio builder for freelancers, designers, developers, students, and independent professionals. It helps users create a focused professional portfolio, show real work, explain client outcomes, receive inquiries, and publish a shareable link.

Current stack:
- React 19
- Vite
- Tailwind CSS 4
- Express
- tRPC 11
- Drizzle ORM
- MySQL/TiDB through the Manus WebDev environment
- Manus OAuth
- Manus storage/S3-compatible file storage
- Vitest
- Wouter

The current project is already working in the Manus WebDev environment. The latest checkpoint is 7d990431.

Completed product features:
1. Presently-branded landing page.
2. Full-card clickable onboarding for Upload PDF, Start from scratch, and Refer & earn.
3. Protected portfolio editor.
4. Profile fields: name, professional title, location, bio, skills, website, GitHub, LinkedIn, Twitter/X.
5. Profile image upload with immediate local live preview and persistent storage URL.
6. Resume upload.
7. Multiple visual portfolio templates.
8. Social links rendered as recognizable accessible icons.
9. Project/work creation, editing, deletion, and publishing.
10. Direct project image and video uploads.
11. Inline work media rendering in the editor and public portfolio.
12. File ownership validation and project ownership validation.
13. Public published portfolio route.
14. Persistent Message me / Book Me inquiry action.
15. Inquiry form with sender, service, budget, timeline, and message fields.
16. Freelancer inquiry inbox with statuses and unread notifications.
17. Referral tracking and reward qualification logic.
18. Structured case-study fields for every project:
    - Client problem
    - Solution
    - Business impact

Case-study fields now persist through the backend and database, load into the editor when existing projects are edited, and appear in the live/public preview when populated. Existing projects remain compatible because the fields are nullable.

Current database tables include users, portfolios, projects, projectMedia, files, inquiries, notifications, templates, referrals, rewards, and rewardAuditLogs.

Security already implemented:
- Authenticated protected procedures
- Owner-scoped portfolio and project operations
- File ownership checks
- Published-only public portfolio access
- Owner-constrained public media resolution
- OAuth session/cookie fixes

Current verification:
- TypeScript check passes
- 14 automated tests pass
- Production build passes
- Case-study migration applied successfully

Known limitations:
- PDF upload does not yet parse content into fields.
- Analytics are not implemented.
- Payments are not implemented.
- Email notification delivery needs end-to-end validation.
- Case-study fields are plain text and do not yet support metrics, quotes, or rich formatting.
- Project ordering is not drag-and-drop.
- The backend is Manus/MySQL/TiDB, not Supabase/PostgreSQL.
- Authentication should be tested in a clean browser session before production launch.

Analyze this product and recommend the best next feature to build. Prioritize features that increase the chance that a visitor becomes a paying client. Compare at least three options, explain the user value, technical scope, data changes, security concerns, UX impact, and implementation order. Do not recommend building everything at once. Select one feature as the best next step and provide a detailed implementation prompt for an engineering agent.

The recommended implementation should preserve the existing UI direction and avoid redesigning working parts without a clear reason.
```

## 15. Short Product Summary

Presently is now a functioning full-stack portfolio builder with profile management, multiple portfolio templates, project and media uploads, public portfolio publishing, direct inquiries, an inbox, referral logic, and structured case studies.

The product has moved beyond a basic gallery. Its strongest differentiator is becoming an **outcome-driven portfolio platform**: freelancers can show not only what they made, but the client problem, their solution, and the business impact.

The best next step should strengthen conversion from portfolio visitor to client inquiry while keeping the product simple and trustworthy.
