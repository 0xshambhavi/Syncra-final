# Syncra club analytics — setup and data contract

This branch adds the first end-to-end analytics workflow for a club president.

## Feedback from Google Forms

1. Create a Google Form with a respondent-type question (Faculty / Student / Guest), an overall rating question using a 1–5 scale, and an optional comments question.
2. In Google Forms, open **Responses → Open in Sheets**.
3. In Google Sheets, use **File → Download → Comma-separated values (.csv)**.
4. In Syncra → President workspace → **Analytics & reports**, choose the event and paste the CSV contents into the import box.
5. Syncra maps respondent type, rating and comment columns into the event's feedback dataset. Rows without a 1–5 rating are skipped.

The current integration is a CSV export/import adapter. Direct Google Forms API ingestion needs Google Cloud OAuth/service-account credentials and access to the response spreadsheet; no credentials or live Google account access are included in the demo.

Presidents can also add a clearly attributed faculty, student or guest response manually for testing. Do not use real personal data in the demo environment.

## Instagram insights

The analytics screen accepts a metrics snapshot copied from the club's Instagram professional dashboard:
- Followers
- Reach
- Impressions
- Profile visits
- Interactions
- Link clicks

Engagement rate is calculated as interactions divided by reach times 100. The current adapter is a manual snapshot import, not a live Instagram connection. A live Meta Graph API connector requires an authorised Instagram Business/Creator account, linked Facebook Page, app review/permissions and an access token stored only on the backend. Do not scrape Instagram or place tokens in frontend code.

## Event success score (0–100)

| Criterion | Weight | Input |
|---|---:|---|
| Attendance and reach | 20% | registrations / event capacity |
| Audience satisfaction | 25% | average imported feedback rating (1–5) |
| Objective delivery | 20% | organiser evaluation (0–100) |
| Operations and experience | 15% | organiser evaluation (0–100) |
| Budget discipline | 10% | organiser evaluation (0–100) |
| Digital engagement | 10% | Instagram engagement rate, scaled to 0–100 |

The score is an operational rubric, not an objective scientific measure. Missing evidence is scored as zero and the report is labelled **partial** until feedback and organiser evaluation inputs are present. The report also displays the criteria separately so a low score can be explained rather than hidden.

## Club health

Club health is the average of the latest three event scores (or fewer if the club has fewer reports). It is labelled Healthy (75+), Watch (50–74), or Needs attention (<50). This is a simple trend indicator, not a substitute for faculty judgement.

## API routes

All routes require a signed-in role:
- GET /api/v1/president/analytics/overview — club-scoped dashboard, reports and health
- POST /api/v1/president/analytics/feedback — add one feedback response
- POST /api/v1/president/analytics/feedback/import-csv — import Google Forms CSV
- PUT /api/v1/president/analytics/instagram — save an Instagram snapshot
- PUT /api/v1/president/analytics/events/{event_id}/metrics — save organiser evaluation inputs
- GET /api/v1/president/analytics/events/{event_id}/report — one event report

The demo backend stores event, feedback and analytics records in process memory, like the existing demo event and budget stores. Data is reset when the backend restarts. Use a database migration and per-club RLS policies before production deployment.
