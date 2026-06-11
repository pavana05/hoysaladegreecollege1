## Goal

Bring every page in the Teacher Dashboard to the same premium, iOS-feel polish as `AdminAppUpdates` — same hero, same chip system, same dropzones, same card chrome, same icon-tile grammar, same motion. Not a per-page rewrite each time — extract the App Updates design into a reusable kit, then refit each teacher page to use it.

## What "App Updates style" actually means

The visual signature of that page is a small, repeatable vocabulary:

- **Aurora hero card** — `rounded-[2rem]` card with two blurred radial gradient orbs (primary + gold), a hairline highlight on the top edge, and a 64px `rounded-[1.4rem]` "iOS app icon" tile (gradient fill + inner highlight + outer glow) sitting next to the title.
- **Eyebrow chip** — pill with `Sparkles` icon + uppercase tracked label.
- **Display/body type pair** — `font-display` for headings (28–34px, tight), `font-body` for paragraphs (15px muted).
- **Status chips** — pill-shaped, `bg-background/60 backdrop-blur-xl border border-border/40`, with a live `ping` dot for "active" states (emerald).
- **Quick-stats triplet** — `grid-cols-3` mini-cards with icon + uppercase micro-label + bold display value.
- **Content surface** — second `rounded-[2rem]` card, `bg-card/80 backdrop-blur-2xl`, section header with a 36px gradient icon-tile + title + subline.
- **Inputs** — labels are `text-[11px] uppercase tracking-wider text-muted-foreground`; fields are `rounded-2xl`; primary CTA is a gradient pill with inner highlight and soft shadow.
- **Dropzone / empty state** — dashed `rounded-3xl` with state-driven color (idle / hover / filled).
- **Motion** — subtle `transition-all duration-300`, `active:scale-[0.98]`, hover lifts, the ping dot.

This vocabulary is the actual deliverable.

## Step 1 — Extract the kit (one-time, ~6 files)

Create `src/components/dashboard/premium/` with composable building blocks. Every teacher page renders these — no per-page reinvention.

```text
src/components/dashboard/premium/
├── PageHero.tsx          // aurora card + iOS icon tile + eyebrow + title + subline + right-side chip slot
├── StatChip.tsx          // status pill (variant: live | idle | warn | neutral) with optional ping dot
├── QuickStatsRow.tsx     // 3-up stat grid
├── SectionCard.tsx       // rounded-[2rem] card + header (icon tile + title + subline) + children
├── FieldLabel.tsx        // uppercase micro-label
├── PrimaryCTA.tsx        // gradient pill button with inner highlight
└── EmptyDropzone.tsx     // dashed rounded-3xl idle/hover/filled states
```

Tokens stay in the existing design system — no new globals, no hardcoded hex. The kit uses the same `--primary`, `--card`, `--border`, `--muted-foreground` tokens that App Updates uses today.

## Step 2 — Refit each teacher page (10 pages, ~30–60 min/page)

Each page keeps its existing business logic; only its layout shell changes. Standard refit per page:

1. Replace top heading block → `<PageHero>` with the page's own icon (Lucide), eyebrow label, title, subline, and a right-side `<StatChip>` for the page's primary live metric.
2. Optional `<QuickStatsRow>` directly under the hero where the page has three meaningful numbers.
3. Wrap every existing content block in `<SectionCard>` with an icon-tile header instead of a plain `<h2>`.
4. Swap raw `<input>` / `<select>` labels for `<FieldLabel>`; round fields to `rounded-2xl`.
5. Replace the main action button with `<PrimaryCTA>`.
6. Use `<EmptyDropzone>` for any file-upload, "no data yet", or "select a class to begin" surface.

### Per-page mapping

| Page | Icon | Eyebrow | Hero stat chip | Quick stats |
| --- | --- | --- | --- | --- |
| TeacherStudents | `Users` | Roster | Total students live count | Total · Present today · At-risk (<75%) |
| TeacherAttendance | `CalendarCheck` | Today's class | Period in progress | Marked · Pending · Absent |
| TeacherAttendanceOverview | `BarChart3` | Trends | Class avg this week | Class avg · Below 75% · Streaks |
| TeacherMarks | `GraduationCap` | Assessments | Last upload time | Uploaded · Pending · Top scorer |
| TeacherAbsent | `UserX` | Follow-ups | Absent today | Today · This week · Notified |
| TeacherMaterials | `BookOpen` | Library | Files published | Total · This month · Storage used |
| TeacherNotices | `Megaphone` | Bulletin | Active notices | Active · Drafts · Reach |
| TeacherTimetable | `CalendarDays` | Schedule | Next class in | Periods today · Free · Total weekly |
| TeacherAnnouncements | `Radio` | Broadcasts | Last sent | Sent · Scheduled · Targeted students |
| TeacherMessages | `MessageSquare` | Inbox | Unread count | Unread · Today · Threads |

No business logic, data hook, query, or route changes. Just shell-and-chrome refit.

## Step 3 — Verify

- Per-page: open each route signed in as the teacher account (`jsps.kuruba2@gmail.com`) and compare side-by-side with `/dashboard/admin/app-updates` — hero proportions, chip placement, card radius, stat grid spacing, button gradient should be visually identical.
- Run the existing test suite to make sure nothing regressed in the data layer.

## Out of scope

- Admin, principal, and student dashboards — this pass is teacher only, as requested.
- New features, new data, new routes.
- Color palette changes — kept on existing dark-luxury / light-mode tokens, no blue backgrounds.
