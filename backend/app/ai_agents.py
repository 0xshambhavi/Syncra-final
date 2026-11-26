"""AI-assisted campus event clash and collaboration analysis."""
import json
import os
from datetime import datetime


def _event_window(event):
    start = datetime.fromisoformat(f'{event["date"]}T{event["time"]}')
    end = datetime.fromisoformat(
        f'{event.get("end_date") or event["date"]}T{event.get("end_time") or event["time"]}'
    )
    return start, end


def analyze_schedule(events, club):
    """Compare the president's events with campus events and explain each real conflict."""
    own = [
        e for e in events.values()
        if (e.get("owner_club") or e.get("club", "")).casefold() == (club or "").casefold()
        and e.get("status") != "cancelled"
    ]
    candidates = []
    for event in own:
        try:
            start, end = _event_window(event)
        except (KeyError, ValueError, TypeError):
            continue
        for other in events.values():
            if (
                other.get("id") == event.get("id")
                or (other.get("owner_club") or other.get("club", "")).casefold() == (club or "").casefold()
                or other.get("status") == "cancelled"
            ):
                continue
            try:
                other_start, other_end = _event_window(other)
            except (KeyError, ValueError, TypeError):
                continue

            overlap = start < other_end and other_start < end
            same_venue = bool(event.get("venue")) and event.get("venue") == other.get("venue")
            same_day = event.get("date") == other.get("date")
            if overlap:
                overlap_start = max(start, other_start)
                overlap_end = min(end, other_end)
                venue_conflict = same_venue
                candidates.append({
                    "event_id": event["id"],
                    "event_title": event.get("title", "Your event"),
                    "event_club": club,
                    "other_event": other.get("title", "Campus event"),
                    "other_event_id": other.get("id"),
                    "other_club": other.get("owner_club") or other.get("club", "Other club"),
                    "type": "time and venue conflict" if venue_conflict else "schedule conflict",
                    "reason": "Both events occupy the same time window" + (" and the same venue" if venue_conflict else ""),
                    "evidence": {
                        "date": event["date"],
                        "your_time": f'{event["time"]}–{event.get("end_time") or event["time"]}',
                        "other_time": f'{other["time"]}–{other.get("end_time") or other["time"]}',
                        "overlap": f"{overlap_start.strftime('%H:%M')}–{overlap_end.strftime('%H:%M')}",
                        "your_venue": event.get("venue"),
                        "other_venue": other.get("venue"),
                        "same_venue": venue_conflict,
                    },
                    "impact": "Attendees, speakers or volunteers may have to choose between simultaneous events" + ("; the venue is also double-booked" if venue_conflict else ""),
                    "suggestion": "Coordinate with the other organiser and consider a different time" + (" or venue" if venue_conflict else ""),
                    "resolution_options": [
                        "Move one event to a time slot outside the overlap",
                        "Choose another available campus venue" if venue_conflict else "Keep the venue and coordinate promotion if audiences are distinct",
                        "Discuss a joint event if the audiences and goals are compatible",
                    ],
                    "severity": "high" if venue_conflict else "medium",
                })
            elif same_day:
                candidates.append({
                    "event_id": event["id"],
                    "event_title": event.get("title", "Your event"),
                    "event_club": club,
                    "other_event": other.get("title", "Campus event"),
                    "other_event_id": other.get("id"),
                    "other_club": other.get("owner_club") or other.get("club", "Other club"),
                    "type": "collaboration opportunity",
                    "reason": "Events share a date but their scheduled times do not overlap",
                    "evidence": {
                        "date": event["date"],
                        "your_time": f'{event["time"]}–{event.get("end_time") or event["time"]}',
                        "other_time": f'{other["time"]}–{other.get("end_time") or other["time"]}',
                        "overlap": None,
                        "your_venue": event.get("venue"),
                        "other_venue": other.get("venue"),
                        "same_venue": same_venue,
                    },
                    "impact": "There may be an opportunity to share promotion, volunteers or audience flow",
                    "suggestion": "Explore joint promotion or shared volunteers with the other organiser",
                    "resolution_options": [
                        "Coordinate promotion and volunteer requirements",
                        "Check whether a shared audience experience makes sense",
                    ],
                    "severity": "opportunity",
                })

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and os.getenv("LLM_ENABLED", "false").lower() == "true" and candidates:
        try:
            from openai import OpenAI
            result = OpenAI(api_key=api_key).responses.create(
                model=os.getenv("LLM_MODEL", "gpt-4.1-mini"),
                instructions=(
                    "You are Syncra's live campus event coordination analyst. Analyse only the "
                    "provided event pairs and evidence. Return a JSON array, one item per pair, "
                    "with event_id, other_event, ai_reason, impact, suggestion, resolution_options "
                    "(array), and severity. Explain the actual date/time overlap and venue facts in "
                    "plain language. Distinguish a real time conflict from a same-day opportunity. "
                    "Never invent availability, event facts or resources. Do not change any event."
                ),
                input=json.dumps({"club": club, "candidate_pairs": candidates}),
            )
            parsed = json.loads(result.output_text)
            if isinstance(parsed, list):
                valid = {(x["event_id"], x["other_event"]) for x in candidates}
                refined = {
                    (x.get("event_id"), x.get("other_event")): x
                    for x in parsed
                    if (x.get("event_id"), x.get("other_event")) in valid
                }
                for item in candidates:
                    suggestion = refined.get((item["event_id"], item["other_event"]))
                    if suggestion:
                        item["ai_generated"] = True
                        item["ai_reason"] = str(suggestion.get("ai_reason") or item["reason"])[:1200]
                        item["impact"] = str(suggestion.get("impact") or item["impact"])[:1200]
                        item["suggestion"] = str(suggestion.get("suggestion") or item["suggestion"])[:1200]
                        options = suggestion.get("resolution_options")
                        if isinstance(options, list):
                            item["resolution_options"] = [str(v)[:300] for v in options[:4]]
                        if suggestion.get("severity") in {"low", "medium", "high", "opportunity"}:
                            item["severity"] = suggestion["severity"]
                    else:
                        item["ai_generated"] = False
                return candidates
        except Exception:
            pass

    return [{**item, "ai_generated": False, "ai_reason": item["reason"]} for item in candidates]
