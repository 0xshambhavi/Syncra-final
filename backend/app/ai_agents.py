"""Optional LLM-assisted campus event clash and collaboration agent."""
import json, os
from datetime import datetime


def analyze_schedule(events, club):
    own = [e for e in events.values() if (e.get("owner_club") or e.get("club","")).casefold() == (club or "").casefold()]
    candidates = []
    for event in own:
        try:
            start = datetime.fromisoformat(f'{event["date"]}T{event["time"]}')
            end = datetime.fromisoformat(f'{event.get("end_date") or event["date"]}T{event.get("end_time") or event["time"]}')
        except (KeyError, ValueError):
            continue
        for other in events.values():
            if other["id"] == event["id"] or (other.get("owner_club") or other.get("club","")).casefold() == (club or "").casefold():
                continue
            try:
                other_start = datetime.fromisoformat(f'{other["date"]}T{other["time"]}')
                other_end = datetime.fromisoformat(f'{other.get("end_date") or other["date"]}T{other.get("end_time") or other["time"]}')
            except (KeyError, ValueError):
                continue
            overlap = start < other_end and other_start < end
            same_venue = event.get("venue") and event.get("venue") == other.get("venue") and overlap
            same_day = event.get("date") == other.get("date")
            if overlap or same_venue:
                candidates.append({"event_id":event["id"],"event_title":event["title"],"other_event":other["title"],"other_club":other.get("club"),"type":"schedule/venue conflict","reason":"Event times overlap" if overlap else "Venue is double-booked","suggestion":"Contact the other organiser to coordinate a different time or venue. No event will be changed automatically.","severity":"high"})
            elif same_day:
                candidates.append({"event_id":event["id"],"event_title":event["title"],"other_event":other["title"],"other_club":other.get("club"),"type":"collaboration opportunity","reason":"Events share a date and may compete for audience or volunteers","suggestion":"Explore joint promotion, a shared volunteer pool or a combined audience experience.","severity":"opportunity"})
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and os.getenv("LLM_ENABLED","false").lower() == "true" and candidates:
        try:
            from openai import OpenAI
            prompt = {"club":club,"candidate_pairs":candidates}
            result = OpenAI(api_key=api_key).responses.create(
                model=os.getenv("LLM_MODEL","gpt-4.1-mini"),
                instructions="You are Syncra's campus event coordination agent. Review only the supplied event pairs. Return a JSON array with the same event_id and other_event for each pair, type (schedule/venue conflict or collaboration opportunity), concise evidence-based reason, actionable suggestion and severity. Never invent dates, venues or resources. A clash must be based on overlapping times or shared venue; same-day alone is only a collaboration opportunity. Do not alter events.",
                input=json.dumps(prompt))
            parsed = json.loads(result.output_text)
            if isinstance(parsed,list):
                valid={(x["event_id"],x["other_event"]) for x in candidates}
                refined=[x for x in parsed if (x.get("event_id"),x.get("other_event")) in valid]
                if refined:
                    return [{**x,"ai_generated":True} for x in refined]
        except Exception:
            pass
    return [{**x,"ai_generated":False} for x in candidates]
