import httpx
from bs4 import BeautifulSoup
from anthropic import AsyncAnthropic
from app.config import get_settings
import logging
import json
import re

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Anthropic if key is set
anthropic_client = None
if settings.anthropic_api_key and settings.anthropic_api_key != "sk-ant-your-key-here":
    anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)


def extract_metadata_from_html(html: str) -> dict:
    """Fallback parser to extract job details from HTML structure and JSON-LD when Claude isn't available."""
    data = {
        "company_name": "",
        "job_title": "",
        "location": "",
        "salary_min": None,
        "salary_max": None,
        "currency": "USD",
        "job_description": "",
        "work_type": "unknown",
    }
    
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        # 1. Try to find JSON-LD JobPosting structured data
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                js_data = json.loads(script.string or "")
                if isinstance(js_data, list):
                    items = js_data
                elif isinstance(js_data, dict):
                    items = js_data.get("@graph", [js_data])
                else:
                    continue
                
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    if item.get("@type") == "JobPosting" or "JobPosting" in str(item.get("@type")):
                        if item.get("title"):
                            data["job_title"] = item["title"]
                        
                        org = item.get("hiringOrganization")
                        if isinstance(org, dict) and org.get("name"):
                            data["company_name"] = org["name"]
                        elif isinstance(org, str):
                            data["company_name"] = org
                            
                        loc = item.get("jobLocation")
                        if isinstance(loc, dict):
                            address = loc.get("address")
                            if isinstance(address, dict):
                                parts = []
                                for k in ["addressLocality", "addressRegion", "addressCountry"]:
                                    val = address.get(k)
                                    if val:
                                        parts.append(val)
                                data["location"] = ", ".join(parts)
                            elif isinstance(address, str):
                                data["location"] = address
                            elif loc.get("name"):
                                data["location"] = loc["name"]
                                
                        desc = item.get("description")
                        if desc:
                            desc_soup = BeautifulSoup(desc, "html.parser")
                            data["job_description"] = desc_soup.get_text(separator="\n").strip()
                            
                        salary = item.get("baseSalary")
                        if isinstance(salary, dict):
                            val = salary.get("value")
                            if isinstance(val, dict):
                                data["salary_min"] = val.get("minValue") or val.get("value")
                                data["salary_max"] = val.get("maxValue") or val.get("value")
                                if isinstance(data["salary_min"], (int, float)):
                                    data["salary_min"] = int(data["salary_min"])
                                if isinstance(data["salary_max"], (int, float)):
                                    data["salary_max"] = int(data["salary_max"])
                            data["currency"] = salary.get("currency") or "USD"
                            
                        empt = item.get("employmentType")
                        if empt:
                            empt_str = str(empt).lower()
                            if "remote" in empt_str:
                                data["work_type"] = "remote"
                            elif "telecommute" in empt_str:
                                data["work_type"] = "remote"
                                
                        break
            except Exception as json_e:
                logger.debug(f"JSON-LD parsing error: {json_e}")
                
        # 2. Extract from standard OpenGraph/Meta tags if fields are still empty
        if not data["job_title"]:
            og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
            if og_title and og_title.get("content"):
                data["job_title"] = og_title["content"]
            elif soup.title:
                data["job_title"] = soup.title.string.strip()
                
        if not data["company_name"]:
            og_site = soup.find("meta", property="og:site_name") or soup.find("meta", attrs={"name": "twitter:site"})
            if og_site and og_site.get("content"):
                data["company_name"] = og_site["content"]
                
        if data["job_title"] and not data["company_name"]:
            title_text = data["job_title"]
            for delim in [" at ", " - ", " | ", " : "]:
                if delim in title_text:
                    parts = title_text.split(delim)
                    if delim == " at ":
                        data["job_title"] = parts[0].strip()
                        data["company_name"] = parts[1].strip()
                    elif delim == " - " or delim == " | ":
                        data["job_title"] = parts[0].strip()
                        data["company_name"] = parts[1].strip()
                    break
                    
        if not data["job_description"]:
            og_desc = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
            if og_desc and og_desc.get("content"):
                data["job_description"] = og_desc["content"].strip()
                
    except Exception as e:
        logger.error(f"Error in extract_metadata_from_html: {e}")
        
    return data


async def call_gemini_api(prompt: str, system_instruction: str = None, response_json: bool = False) -> str:
    """Helper to query Gemini API via httpx."""
    if not settings.gemini_api_key or settings.gemini_api_key == "your-key" or "your-key" in settings.gemini_api_key:
        raise ValueError("Gemini API key is not configured.")
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.gemini_api_key}"
    
    contents = [
        {
            "parts": [
                {"text": prompt}
            ]
        }
    ]
    
    payload = {
        "contents": contents
    }
    
    if system_instruction:
        payload["systemInstruction"] = {
            "parts": [
                {"text": system_instruction}
            ]
        }
        
    generation_config = {
        "temperature": 0.2
    }
    if response_json:
        generation_config["responseMimeType"] = "application/json"
        
    payload["generationConfig"] = generation_config
    
    headers = {
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            resp_data = response.json()
            candidates = resp_data.get("candidates", [])
            if not candidates:
                raise ValueError("No candidates returned from Gemini.")
            
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                raise ValueError("No parts returned from Gemini candidate content.")
                
            return parts[0].get("text", "").strip()
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise ValueError(f"Gemini API call failed: {str(e)}")
async def call_ollama_api(prompt: str, system_instruction: str = None) -> str:
    """Helper to query Ollama API running locally."""
    if not settings.ollama_api_url:
        raise ValueError("Ollama API URL is not configured.")
    
    # Combine system instruction with prompt if provided
    full_prompt = prompt
    if system_instruction:
        full_prompt = f"{system_instruction}\n\n{prompt}"
    
    url = f"{settings.ollama_api_url}/api/generate"
    
    payload = {
        "model": settings.ollama_model,
        "prompt": full_prompt,
        "stream": False,
        "temperature": 0.3
    }
    
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=2.0)) as client:
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            resp_data = response.json()
            return resp_data.get("response", "").strip()
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            raise ValueError(f"Ollama API call failed: {str(e)}")


def _should_try_ollama() -> bool:
    """Never attempt Ollama on Vercel/production when URL points to host.docker.internal."""
    if not settings.ollama_api_url:
        return False
    if settings.environment == "production" and "host.docker.internal" in settings.ollama_api_url:
        return False
    return True


def _extract_json_object(text: str) -> dict:
    """Cleanly extract and parse a JSON object from LLM markdown/text output."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\n", "", cleaned)
        cleaned = re.sub(r"\n```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


async def scrape_job_url(url: str, html: str = None) -> dict:
    """Scrape HTML from a job posting URL and use LLM (Claude/Gemini) to extract structured details.
    If html is provided (e.g. from the browser extension), skip the HTTP fetch entirely.
    """
    if html:
        # HTML already provided by the browser extension — skip server-side fetch
        pass
    else:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }
        
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()
                html = response.text
        except Exception as e:
            logger.error(f"Failed to fetch URL {url}: {e}")
            return {
                "company_name": "",
                "job_title": "",
                "location": "",
                "salary_min": None,
                "salary_max": None,
                "currency": "USD",
                "job_description": "",
                "work_type": "unknown",
            }

    # Clean the HTML to extract content text
    soup = BeautifulSoup(html, "html.parser")
    
    # Extract metadata using fallback HTML parsing if no key is configured
    fallback_data = extract_metadata_from_html(html)
    
    for script_or_style in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        script_or_style.decompose()

    text = soup.get_text(separator="\n")
    # Clean up whitespace
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r" +", " ", text).strip()
    text = text[:12000]

    # Prompt details
    prompt = f"""Extract the following details as a JSON object:
- company_name (string, or empty string if not found)
- job_title (string, or empty string if not found)
- location (string, e.g., "New York, NY", or empty string if not found)
- salary_min (integer, annual base salary minimum or hourly rate multiplied by 2000, or null)
- salary_max (integer, annual base salary maximum, or null)
- currency (string, ISO currency code like "USD", "EUR", "GBP", default "USD")
- work_type (string, must be one of: "remote", "hybrid", "onsite", "unknown")
- job_description (string, clean markdown summary of the job description and requirements)

Only return a valid JSON object. Do not include markdown code block formatting (like ```json) in your final response. Return raw JSON text only.

Here is the text scraped from a job application URL:
---
{text}
---"""

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You extract structured data from unstructured text. You always respond with raw JSON only.",
                response_json=True
            )
            return _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Gemini: {e}")

    # Use Claude if available
    if anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1500,
                temperature=0.0,
                system="You extract structured data from unstructured text. You always respond with raw JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            return _extract_json_object(message.content[0].text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Claude: {e}")

    # Use Ollama if available
    if _should_try_ollama():
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You extract structured data from unstructured text. You always respond with raw JSON only."
            )
            return _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Ollama: {e}")

    # Fallback to local regex/JSON-LD metadata extraction
    logger.warning("No LLM key configured or LLM failed. Using HTML/JSON-LD fallback metadata.")
    if not fallback_data["job_description"]:
        fallback_data["job_description"] = text[:4000]
    return fallback_data


async def calculate_match_score(profile_summary: str, job_description: str) -> dict:
    """Calculate match score (0-100) with structured strengths and gaps using LLM."""
    
    if not profile_summary or not job_description:
        return {
            "ai_match_score": 0.0,
            "ai_match_explanation": "Please fill out your profile summary and the job description to calculate a match score.",
        }

    prompt = f"""You are a professional recruiting assistant. Compare this candidate's resume / profile summary with the job description.

Candidate Resume / Profile Summary:
---
{profile_summary}
---

Job Description:
---
{job_description}
---

Analyze how well the candidate matches the job requirements.

Respond with a JSON object containing EXACTLY these fields:
- ai_match_score (float, 0.0 to 100.0 where 100.0 is a perfect match)
- strengths (array of 2-4 short strings: specific reasons the candidate is a good fit)
- gaps (array of 1-4 short strings: specific requirements the candidate is missing or weak on)

Rules:
- If the match is strong (score >= 70), include MORE strengths than gaps.
- If the match is weak (score < 50), include MORE gaps than strengths.
- Each item should be a single concise sentence, no bullet prefix characters.
- Do NOT use markdown inside the strings. Plain text only.

Return only the raw JSON object. No wrapper, no markdown block syntax."""

    def _parse_structured(data: dict) -> dict:
        """Extract and validate the structured response."""
        strengths = data.get("strengths", [])
        gaps = data.get("gaps", [])
        # Normalize: ensure lists of strings
        if not isinstance(strengths, list):
            strengths = []
        if not isinstance(gaps, list):
            gaps = []
        strengths = [str(s).strip("- •*").strip() for s in strengths if s]
        gaps = [str(g).strip("- •*").strip() for g in gaps if g]
        return {
            "ai_match_score": float(data.get("ai_match_score", 0.0)),
            "ai_match_explanation": json.dumps({"strengths": strengths, "gaps": gaps}),
        }

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You evaluate job candidate matches. You always respond with raw JSON only.",
                response_json=True
            )
            return _parse_structured(_extract_json_object(content_text))
        except Exception as e:
            logger.error(f"Failed calculating match score with Gemini: {e}")

    # Use Claude if available
    if anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                temperature=0.2,
                system="You evaluate job candidate matches. You always respond with raw JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            return _parse_structured(_extract_json_object(message.content[0].text))
        except Exception as e:
            logger.error(f"Failed calculating match score with Claude: {e}")

    # Use Ollama as fallback
    if _should_try_ollama():
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You evaluate job candidate matches. You always respond with raw JSON only."
            )
            return _parse_structured(_extract_json_object(content_text))
        except Exception as e:
            logger.error(f"Failed calculating match score with Ollama: {e}")

    return {
        "ai_match_score": 0.0,
        "ai_match_explanation": "Failed to calculate match score due to an API error.",
    }


async def summarize_resume(resume_text: str) -> str:
    """Generate a clean professional candidate profile summary from a resume using LLM."""
    
    def _fallback_summary(text: str) -> str:
        """Generate fallback summary from raw resume text."""
        lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 10]
        cleaned_text = ' '.join(lines[:5])
        if len(cleaned_text) > 300:
            return cleaned_text[:300] + "..."
        return cleaned_text if cleaned_text else "Resume uploaded. Use the match analysis feature to evaluate job fit."
    
    prompt = f"""You are a professional resume summarizer. Create a concise, compelling 2-3 sentence summary of the candidate's background, key skills, and experience, followed by 3-4 bullet points highlighting their core technical strengths.

Candidate Resume:
---
{resume_text}
---

Provide only the clean markdown summary. No wrappers, intro text, or code block formatting."""

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You summarize resumes professionally. Respond only with the summary text in Markdown format."
            )
            return content_text.strip()
        except Exception as e:
            logger.error(f"Failed to summarize resume with Gemini: {e}")

    # Use Claude if available
    if anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=600,
                temperature=0.3,
                system="You summarize resumes professionally. Respond only with the summary text in Markdown format.",
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            logger.error(f"Failed to summarize resume with Claude: {e}")

    # Use Ollama as fallback
    if settings.ollama_api_url:
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You summarize resumes professionally. Respond only with the summary text in Markdown format."
            )
            return content_text.strip()
        except Exception as e:
            logger.error(f"Failed to summarize resume with Ollama: {e}")

    return _fallback_summary(resume_text)


async def check_job_active(url: str) -> dict:
    """Check if a job posting URL is still active or has been closed/removed."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code == 404:
                return {"is_active": False, "reason": "Page not found (404)"}
            response.raise_for_status()
            html = response.text
    except Exception as e:
        logger.error(f"Failed to fetch job URL for active check {url}: {e}")
        return {"is_active": False, "reason": f"Job posting page unreachable ({str(e) or type(e).__name__})"}

    soup = BeautifulSoup(html, "html.parser")
    for script_or_style in soup(["script", "style", "nav", "footer", "header", "noscript"]):
        script_or_style.decompose()

    text = soup.get_text(separator="\n")
    text = re.sub(r"\n+", "\n", text)
    text = re.sub(r" +", " ", text).strip()
    text = text[:8000]

    prompt = f"""Analyze the following text scraped from a job application URL and determine if the job listing is still active/open, or if it has been closed, filled, expired, or deleted.

Job Page Text:
---
{text}
---

Respond with a JSON object containing:
- is_active (boolean: true if the job is active and accepting applications, false otherwise)
- reason (string: a very brief explanation, e.g., 'Active', 'Job closed/expired', 'No longer accepting applications', 'Page not found')

Return only the raw JSON. No wrapper, no markdown block syntax."""

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You determine if job listings are still active. You always respond with raw JSON only.",
                response_json=True
            )
            return _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Gemini: {e}")

    # Use Claude if available
    if anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                temperature=0.0,
                system="You determine if job listings are still active. You always respond with raw JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            return _extract_json_object(message.content[0].text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Claude: {e}")

    # Use Ollama if available
    if _should_try_ollama():
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You determine if job listings are still active. You always respond with raw JSON only."
            )
            return _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Ollama: {e}")

    # Simple heuristic fallback
    lower_text = text.lower()
    closed_keywords = ["no longer accepting applications", "job is closed", "expired", "filled", "listing has ended", "not active"]
    for kw in closed_keywords:
        if kw in lower_text:
            return {"is_active": False, "reason": f"Closed ({kw})"}

    return {"is_active": True, "reason": "Active"}
