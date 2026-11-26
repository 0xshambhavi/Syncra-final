# Syncra AI event and club-health reports

## Shared model

The reporting endpoints reuse the same OpenAI configuration as the schedule/clash assistant:

- `OPENAI_API_KEY`
- `LLM_ENABLED=true`
- `LLM_MODEL=gpt-4.1-mini` (default)

If the key is absent, the model is disabled, or the request fails, deterministic fallback reporting is used. The UI identifies the method and model. Feedback text is treated as untrusted input; respondent identities are not sent to the model.

## Event report

- `POST /api/v1/president/ai-reports/events/{event_id}/generate`
- Available to the president or faculty coordinator assigned to the event's club.
- Combines the existing weighted event scorecard with feedback analysis.
- Produces an executive summary, strengths, improvement areas, anonymised audience voice, and prioritised action plan.
- Missing evidence is not invented. Attendance, budget, objective delivery and digital metrics remain separately identified.

### TEDxBMSIT&M sample: Latency

When a TEDxBMSIT&M analytics account opens the overview, Syncra seeds a clearly labelled synthetic event named **Latency** if it does not already exist. It includes 12 illustrative feedback responses and sample event metrics so the report workflow can be demonstrated without a live Google Form.

These values and comments are fabricated demonstration data. Replace them with the real Latency event and Google Forms export before presenting the report as an official event record.

## Conditional club-health report

- `GET /api/v1/president/ai-reports/club-health/check`
- Reads the assigned club's roster from `CLUB_MEMBERS` and event/registration activity from the previous 90 days.
- Captures a baseline snapshot and then a new snapshot no more than once every seven days when the endpoint is checked.
- Generates a club-health report only when a verified comparison crosses one of these thresholds:
  - Membership falls by at least 20%.
  - Events in the previous 90 days fall by at least 30%.
  - Registrations in the previous 90 days fall by at least 30%.
- Otherwise the API returns a monitoring status and no report.

The report describes measured signals, possible risks and recommended actions. It does not infer the cause of a decline. Snapshots are currently held in process memory, so they reset when the backend restarts. The current implementation captures snapshots when the dashboard check endpoint is called; it does not yet run a background scheduler. A persistent database-backed history and scheduled weekly job are required for production-grade continuous monitoring.

## Validation notes

This feature is implemented as API and dashboard code. A live OpenAI request, live Google Forms import, and browser end-to-end test require the configured credentials and a running Syncra environment; they are not claimed as completed here.
