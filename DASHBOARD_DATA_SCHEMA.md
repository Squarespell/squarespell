# Dashboard Data Schema & API Binding Map

Production data schema for the Squarespell dashboard overview page.
All values are fetched from the Express API — zero hardcoded data.

---

## 1. Dashboard Analytics (Aggregated)

**Source:** Computed client-side by iterating `GET /api/quizzes` + `GET /api/analytics/:quizId`

```json
{
  "total_views": "{{sum(quizzes[*].view_count)}}",
  "total_leads": "{{sum(quizzes[*].lead_count)}}",
  "completion_rate": "{{(total_completions / total_views) * 100}}",
  "lead_rate": "{{(total_leads / total_views) * 100}}",
  "active_quizzes": "{{quizzes.filter(q => q.status === 'live').length}}",
  "quiz_limit": "{{plan.limits.quizzes || 20}}",
  "views_change": "{{percent_change(current_period.views, previous_period.views)}}",
  "leads_change": "{{percent_change(current_period.leads, previous_period.leads)}}",
  "completion_change": "{{percent_change(current.completion_rate, previous.completion_rate)}}",
  "lead_rate_change": "{{percent_change(current.lead_rate, previous.lead_rate)}}",
  "compare_label": "{{previous_period_start}} – {{previous_period_end}}"
}
```

### API Endpoints Used

| Binding | Endpoint | Method |
|---------|----------|--------|
| `quizzes` | `/api/quizzes` | GET |
| `analytics` | `/api/analytics/:quizId` | GET |
| `plan` | `/api/user/plan` | GET |

---

## 2. Stat Cards

| Card | Value Binding | Change Binding |
|------|--------------|----------------|
| Total views | `{{analytics.total_views}}` | `{{analytics.views_change}}%` |
| Leads captured | `{{analytics.total_leads}}` | `{{analytics.leads_change}}%` |
| Completion rate | `{{analytics.completion_rate}}%` | `{{analytics.completion_change}}%` |
| Lead rate | `{{analytics.lead_rate}}%` | `{{analytics.lead_rate_change}}%` |
| Active quizzes | `{{analytics.active_quizzes}} / {{analytics.quiz_limit}}` | N/A |

---

## 3. Performance Chart (Timeseries)

**Endpoint:** `GET /api/analytics/:quizId/timeseries?period={7d|30d|90d}`

```json
{
  "dates": ["2025-06-01", "2025-06-02", "..."],
  "views": [120, 145, "..."],
  "leads": [32, 41, "..."]
}
```

Aggregated across all quizzes client-side. Period maps: Daily → 7d, Weekly → 30d, Monthly → 90d.

---

## 4. Top Quizzes

**Source:** `GET /api/quizzes` sorted by `view_count` DESC, top 5

```json
{
  "id": "{{quiz.id}}",
  "title": "{{quiz.title}}",
  "view_count": "{{quiz.view_count}}",
  "lead_count": "{{quiz.lead_count}}",
  "conversion_rate": "{{(quiz.lead_count / quiz.view_count) * 100}}"
}
```

---

## 5. Conversion Funnel

**Source:** Aggregated from `GET /api/analytics/:quizId` across all quizzes

```json
{
  "views": "{{sum(analytics[*].views)}}",
  "started": "{{sum(analytics[*].started)}}",
  "completed": "{{sum(analytics[*].completions)}}",
  "leads": "{{sum(analytics[*].leads)}}"
}
```

Percentages computed as `(step_value / views) * 100`.

---

## 6. Lead Sources (Donut Chart)

**Source:** Derived from `GET /api/leads` by grouping on `lead.source`

```json
[
  {
    "name": "{{source_name}}",
    "count": "{{count_for_source}}",
    "percentage": "{{(count / total_leads) * 100}}",
    "color": "{{SOURCE_COLORS[index]}}"
  }
]
```

Color palette: `#0D7377`, `#4DC2C6`, `#B3E6E8`, `#F79009`, `#F04438`

---

## 7. Recent Leads Table

**Endpoint:** `GET /api/leads` (latest 10, paginated)

```json
{
  "id": "{{lead.id}}",
  "name": "{{lead.name}}",
  "email": "{{lead.email}}",
  "quiz_id": "{{lead.quiz_id}}",
  "score": "{{lead.score}}",
  "source": "{{lead.source}}",
  "status": "{{lead.status}}",
  "created_at": "{{lead.created_at}}",
  "quizzes": {
    "title": "{{lead.quizzes.title}}"
  }
}
```

### Score Badge Variants

| Range | Background | Color |
|-------|-----------|-------|
| ≥ 70 | `#ECFDF3` | `#027A48` |
| 50–69 | `#F0FAFB` | `#0D7377` |
| < 50 | `#FFFAEB` | `#B54708` |

### Status Pill Variants

| Status | Background | Color |
|--------|-----------|-------|
| New | `#F0FAFB` | `#0D7377` |
| Contacted | `#F2F4F7` | `#475467` |
| Qualified | `#ECFDF3` | `#027A48` |
| Nurturing | `#FFF6ED` | `#C4320A` |

---

## 8. Question Drop-off Analysis

**Endpoint:** `GET /api/analytics/:quizId/dropoff`

```json
[
  {
    "question": "{{question_text}}",
    "dropoff_rate": "{{dropoff_percentage}}",
    "completion_rate": "{{100 - dropoff_rate}}"
  }
]
```

Quiz selector defaults to the top quiz by views.

---

## 9. Recent Activity

**Endpoint:** `GET /api/dashboard/activity` (latest 5)

```json
[
  {
    "id": "{{activity.id}}",
    "type": "lead | quiz | integration | ab_test | export",
    "title": "{{activity.title}}",
    "description": "{{activity.description}}",
    "time": "{{relative_time(activity.created_at)}}"
  }
]
```

### Activity Type → Icon Style

| Type | Background | Color |
|------|-----------|-------|
| lead | `#F0FAFB` | `#0D7377` |
| quiz | `#ECFDF3` | `#12B76A` |
| integration | `#F4EBFF` | `#7F56D9` |
| ab_test | `#FFFAEB` | `#B54708` |
| export | `#F2F4F7` | `#475467` |

---

## 10. Sidebar Plan Card

**Endpoint:** `GET /api/user/plan`

```json
{
  "plan_name": "{{plan.plan}} Plan",
  "renews_at": "{{format_date(plan.current_period_end)}}",
  "views_used": "{{plan.usage.views}}",
  "views_limit": "{{plan.limits.views}}",
  "usage_percentage": "{{(views_used / views_limit) * 100}}"
}
```

---

## 11. Welcome Header

| Element | Binding |
|---------|---------|
| User name | `{{clerk.user.firstName \|\| plan.email.split('@')[0]}}` |
| Date range | `{{30_days_ago}} – {{today}}` (computed client-side) |

---

## Component → File Map

| Component | File |
|-----------|------|
| DashboardShell (sidebar + topbar) | `_components/DashboardShell.tsx` |
| Stat cards | `page.tsx → DashStatCard` |
| Performance chart | `page.tsx → PerformanceChart` |
| Top quizzes | `page.tsx → TopQuizzesList` |
| Conversion funnel | `page.tsx → ConversionFunnel` |
| Lead sources donut | `page.tsx → LeadSourcesDonut` |
| Recent leads table | `page.tsx → RecentLeadsTable` |
| Question drop-off | `page.tsx → QuestionDropoff` |
| Recent activity | `page.tsx → RecentActivityList` |
| A/B testing banner | `page.tsx → ABTestingBanner` |
| Sidebar plan card | `DashboardShell.tsx → SidebarPlanCard` |
| Sidebar help card | `DashboardShell.tsx → SidebarHelpCard` |
