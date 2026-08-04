import os
import httpx
from bs4 import BeautifulSoup
from anthropic import AsyncAnthropic
from app.config import get_settings
import logging
import json
import re

import logging
import json
import re

import urllib.parse

try:
    from curl_cffi.requests import AsyncSession as CurlAsyncSession
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False

logger = logging.getLogger(__name__)
settings = get_settings()

# Initialize Anthropic if key is set
anthropic_client = None
if settings.anthropic_api_key and settings.anthropic_api_key != "sk-ant-your-key-here":
    anthropic_client = AsyncAnthropic(api_key=settings.anthropic_api_key)


def _get_proxy_key_from_env_file() -> str:
    # 1. Direct case-insensitive scan of system environment variables (for Vercel serverless)
    for k, v in os.environ.items():
        if k.upper().strip() in ("SCRAPER_API_KEY", "SCRAPERAPI_KEY", "SCRAPER_KEY", "SCRAPERAPI_API_KEY"):
            val = str(v or "").strip().strip('"').strip("'")
            if val:
                return val

    # 2. Check Pydantic settings object
    try:
        s_key = getattr(get_settings(), "scraper_api_key", "")
        if s_key and s_key.strip():
            return s_key.strip()
    except Exception:
        pass

    # 3. Determine absolute path to backend/.env relative to services.py location (for local dev)
    services_dir = os.path.dirname(os.path.abspath(__file__)) # .../backend/app/core
    backend_dir = os.path.dirname(os.path.dirname(services_dir)) # .../backend
    root_dir = os.path.dirname(backend_dir)

    candidates = [
        os.path.join(backend_dir, ".env"),
        os.path.join(root_dir, ".env"),
        ".env",
        "backend/.env",
        "../.env",
    ]

    for candidate in candidates:
        try:
            if os.path.exists(candidate):
                with open(candidate, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("#") or "=" not in line:
                            continue
                        k, v = line.split("=", 1)
                        if k.strip().upper() in ("SCRAPER_API_KEY", "SCRAPERAPI_KEY", "SCRAPER_KEY", "SCRAPERAPI_API_KEY"):
                            cleaned_val = v.strip().strip('"').strip("'")
                            if cleaned_val:
                                return cleaned_val
        except Exception:
            pass

    return ""


async def fetch_html_with_stealth(url: str, timeout: float = 25.0) -> tuple[str, int, str]:
    """Fetch URL using Scraping Proxy API (residential IP) or direct httpx."""
    proxy_key = _get_proxy_key_from_env_file()

    if proxy_key:
        encoded_target = urllib.parse.quote(url, safe='')
        proxy_endpoint = f"https://api.scraperapi.com?api_key={proxy_key}&url={encoded_target}"
        try:
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, verify=False) as client:
                response = await client.get(proxy_endpoint)
                logger.info(f"🟢 [ScraperAPI] Fetched {url} - Status: {response.status_code}")
                err_snippet = response.text[:200].strip().replace('\n', ' ') if response.status_code != 200 else ""
                return response.text, response.status_code, f"scraper_api (status {response.status_code}{': ' + err_snippet if err_snippet else ''})"
        except Exception as e:
            return "", 500, f"scraper_api_exception ({type(e).__name__}: {str(e)})"

    # Direct httpx fallback if SCRAPER_API_KEY is not configured
    chrome_headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }

    env_keys_found = [k for k in os.environ.keys() if 'SCRAP' in k.upper() or 'KEY' in k.upper() or 'API' in k.upper()]
    env_missing_hint = f" [SCRAPER_API_KEY missing from os.environ. Keys detected: {env_keys_found or 'None'}]"

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, verify=False) as client:
            response = await client.get(url, headers=chrome_headers)
            logger.info(f"🟡 [httpx direct] Fetched {url} - Status: {response.status_code}")
            return response.text, response.status_code, f"httpx_direct (status {response.status_code}){env_missing_hint}"
    except Exception as e:
        return "", 500, f"httpx_exception ({type(e).__name__}: {str(e)}){env_missing_hint}"


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
                                loc_parts = [address.get("addressLocality"), address.get("addressRegion"), address.get("addressCountry")]
                                data["location"] = ", ".join([p for p in loc_parts if p])
                            elif isinstance(address, str):
                                data["location"] = address
                        
                        if item.get("description"):
                            # Clean HTML tags from description
                            desc_soup = BeautifulSoup(item["description"], "html.parser")
                            data["job_description"] = desc_soup.get_text(separator="\n").strip()
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


def _normalize_scraped_job_data(data: dict, raw_text: str) -> dict:
    """Post-process and normalize LLM or fallback extracted job data for 100% precision."""
    if not isinstance(data, dict):
        data = {}

    company = str(data.get("company_name", "") or "").strip()
    title = str(data.get("job_title", "") or "").strip()
    location = str(data.get("location", "") or "").strip()
    salary_min = data.get("salary_min")
    salary_max = data.get("salary_max")
    currency = str(data.get("currency", "") or "USD").strip().upper()
    work_type = str(data.get("work_type", "") or "unknown").strip().lower()
    description = str(data.get("job_description", "") or "").strip()

    # 1. Clean garbage location strings (e.g. "P00, PH" or "$50 - $100")
    if re.search(r"P\d+|PHP\s*\d+|\$\d+|\b0\b", location, re.IGNORECASE):
        location = ""

    if not location:
        loc_match = re.search(r"(?:Location|Based in|Address)[:\s]+([^\n\r]+)", raw_text, re.IGNORECASE)
        if loc_match:
            location = loc_match.group(1).strip()
        elif "national capital region" in raw_text.lower():
            location = "National Capital Region, Philippines"

    if "remote" in raw_text.lower() and "remote" not in location.lower():
        location = f"Remote, {location}" if location else "Remote"

    # 2. Precise Work Type Normalization
    if "remote" in raw_text.lower() or "work from home" in raw_text.lower() or "work from anywhere" in raw_text.lower():
        work_type = "remote"
    elif "hybrid" in raw_text.lower():
        work_type = "hybrid"
    elif "onsite" in raw_text.lower() or "on-site" in raw_text.lower():
        work_type = "onsite"

    # 3. Precise Currency & Pay Rate Extraction
    pay_matches = re.findall(r"(PHP|\$|USD|EUR|GBP|₱)\s*(\d+(?:\,\d+)?(?:\.\d+)?)\s*(?:-|to|\s+)\s*(?:PHP|\$|USD|EUR|GBP|₱)?\s*(\d+(?:\,\d+)?(?:\.\d+)?)", raw_text, re.IGNORECASE)
    
    if pay_matches:
        cur_sym, val1, val2 = pay_matches[0]
        cur_sym_upper = cur_sym.upper()
        if "PHP" in cur_sym_upper or "₱" in cur_sym_upper:
            currency = "PHP"
        elif "$" in cur_sym or "USD" in cur_sym_upper:
            currency = "USD"
        elif "EUR" in cur_sym_upper or "€" in cur_sym:
            currency = "EUR"
        elif "GBP" in cur_sym_upper or "£" in cur_sym:
            currency = "GBP"

        try:
            p_min = float(val1.replace(",", ""))
            p_max = float(val2.replace(",", ""))
            # Convert to MONTHLY salary:
            if "hour" in raw_text.lower() or "hr" in raw_text.lower() or p_min < 500:
                salary_min = int(p_min * 160)
                salary_max = int(p_max * 160)
            elif p_min >= 20000:
                salary_min = int(p_min / 12)
                salary_max = int(p_max / 12)
            else:
                salary_min = int(p_min)
                salary_max = int(p_max)
        except Exception:
            pass

    # Override: If USD or $ is explicitly stated in the job text (e.g. "$50 to $100 USD per hour"), prioritize USD over localized UI text
    if re.search(r"\$\s*\d+|\bUSD\b", raw_text, re.IGNORECASE):
        currency = "USD"

    # Normalize integer values for salary & ensure MONTHLY standard (convert any residual annual numbers >= 20,000)
    if isinstance(salary_min, (float, str)):
        try:
            salary_min = int(float(str(salary_min).replace(",", "")))
        except Exception:
            salary_min = None

    if isinstance(salary_max, (float, str)):
        try:
            salary_max = int(float(str(salary_max).replace(",", "")))
        except Exception:
            salary_max = None

    if salary_min and salary_min >= 20000:
        salary_min = int(salary_min / 12)
    if salary_max and salary_max >= 20000:
        salary_max = int(salary_max / 12)

    if salary_min and salary_min <= 0:
        salary_min = None
    if salary_max and salary_max <= 0:
        salary_max = None

    # 4. Clean Description (Strip rating headers, star counts, and duplicate titles)
    if description:
        description = re.sub(r"^\s*(?:\d\.\d\s*)+", "", description)
        description = re.sub(r"^\s*\d\.\d\s+out of 5 stars\s*", "", description, flags=re.IGNORECASE)
        description = re.sub(r"^\s*Job details\s*", "", description, flags=re.IGNORECASE)
        description = description.strip()

    return {
        "company_name": company,
        "job_title": title,
        "location": location,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "currency": currency,
        "work_type": work_type if work_type in ("remote", "hybrid", "onsite") else "unknown",
        "job_description": description,
    }


async def scrape_job_url(url: str, html: str = None) -> dict:
    """Scrape HTML from a job posting URL and use LLM (Claude/Gemini) to extract structured details."""
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
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, verify=False) as client:
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
    prompt = f"""You are a master job posting data extractor. Extract details from this scraped job page text with 100% precision.

Respond with a JSON object containing EXACTLY these fields:
- company_name (string): Name of hiring organization (e.g. "DataAnnotation").
- job_title (string): Specific position title (e.g. "Full Stack Developer - AI Trainer").
- location (string): Location or Region (e.g. "National Capital Region, Philippines" or "Remote, Philippines"). NEVER output garbage like "P00, PH" or salary numbers in location.
- salary_min (integer or null): Monthly base salary minimum. If hourly (e.g. $50/hr), convert to monthly by multiplying hourly rate by 160 (e.g. 50 * 160 = 8000). If annual (e.g. $120,000/yr), convert to monthly by dividing by 12 (120000 / 12 = 10000).
- salary_max (integer or null): Monthly base salary maximum. If hourly (e.g. $100/hr), convert to monthly (100 * 160 = 16000). If annual, divide by 12.
- currency (string): 3-letter currency code (e.g. "USD", "PHP", "EUR", "GBP"). Detect accurately from symbols ($ -> USD, PHP / ₱ -> PHP).
- work_type (string): MUST be one of "remote", "hybrid", "onsite", "unknown". If "Remote" or "Fully remote" is mentioned, output "remote".
- job_description (string): Clean Markdown text of the job description, qualifications, and responsibilities. Exclude website headers, ratings like "4.1 out of 5 stars", and navigation noise.

Text scraped from job page:
---
{text}
---

Return raw JSON only."""

    raw_result = None

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You extract structured data from unstructured text. You always respond with raw JSON only.",
                response_json=True
            )
            raw_result = _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Gemini: {e}")

    # Use Claude if available
    if not raw_result and anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1500,
                temperature=0.0,
                system="You extract structured data from unstructured text. You always respond with raw JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            raw_result = _extract_json_object(message.content[0].text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Claude: {e}")

    # Use Ollama if available
    if not raw_result and _should_try_ollama():
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You extract structured data from unstructured text. You always respond with raw JSON only."
            )
            raw_result = _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed parsing job description with Ollama: {e}")

    if not raw_result:
        logger.warning("No LLM key configured or LLM failed. Using HTML/JSON-LD fallback metadata.")
        if not fallback_data["job_description"]:
            fallback_data["job_description"] = text[:4000]
        raw_result = fallback_data

    # Post-process & normalize output for 100% precision
    return _normalize_scraped_job_data(raw_result, text)


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


async def check_job_active(url: str, html: str | None = None) -> dict:
    """Check if a job posting URL is still active or has been closed/removed."""
    fetch_engine = "client_provided_html"

    # 1. Direct ATS API Check for Greenhouse / Lever (Instant, 100% reliable, zero bot blocks)
    if "greenhouse.io" in url:
        gh_match = re.search(r"greenhouse\.io/([^/]+)/jobs/(\d+)", url)
        if gh_match:
            board, job_id = gh_match.group(1), gh_match.group(2)
            api_url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs/{job_id}"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(api_url)
                    if resp.status_code == 404:
                        return {"is_active": False, "reason": "Listing removed from Greenhouse (404)", "engine": "greenhouse_api"}
                    if resp.status_code == 200:
                        return {"is_active": True, "reason": "Active on Greenhouse", "engine": "greenhouse_api"}
            except Exception as e:
                logger.debug(f"Greenhouse API check error: {e}")

    if "lever.co" in url:
        lever_match = re.search(r"lever\.co/([^/]+)/([a-f0-9\-]+)", url)
        if lever_match:
            comp, job_id = lever_match.group(1), lever_match.group(2)
            api_url = f"https://api.lever.co/v0/postings/{comp}/{job_id}"
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(api_url)
                    if resp.status_code == 404:
                        return {"is_active": False, "reason": "Listing removed from Lever (404)", "engine": "lever_api"}
                    if resp.status_code == 200:
                        return {"is_active": True, "reason": "Active on Lever", "engine": "lever_api"}
            except Exception as e:
                logger.debug(f"Lever API check error: {e}")

    # Direct LinkedIn Guest API Shortcut (Public unauthenticated job posting view - zero authwalls)
    if "linkedin.com" in url:
        li_match = re.search(r"(\d{8,})", url)
        if li_match:
            job_id = li_match.group(1)
            guest_url = f"https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}"
            try:
                html_text, status_code, fetch_engine = await fetch_html_with_stealth(guest_url)
                if status_code == 404:
                    return {"is_active": False, "reason": "Listing removed from LinkedIn (404)", "engine": f"linkedin_guest_api ({fetch_engine})"}
                if status_code == 200:
                    lower_html = html_text.lower()
                    closed_phrases = ["no longer accepting applications", "job is closed", "this job is no longer available", "listing has ended"]
                    is_closed = any(phrase in lower_html for phrase in closed_phrases)
                    return {
                        "is_active": not is_closed,
                        "reason": "Job closed/expired on LinkedIn" if is_closed else "Active on LinkedIn",
                        "engine": f"linkedin_guest_api ({fetch_engine})"
                    }
            except Exception as e:
                logger.debug(f"LinkedIn Guest API check error: {e}")

    # 2. Fetch page HTML using Chrome TLS Impersonation (curl_cffi) to bypass 401/403 bot blocks
    if not html:
        try:
            html_text, status_code, fetch_engine = await fetch_html_with_stealth(url)
            if status_code == 404:
                return {"is_active": False, "reason": "Page not found (404)", "engine": fetch_engine}
            if status_code in (401, 403):
                return {"is_active": False, "reason": f"Access restricted ({status_code})", "engine": fetch_engine}
            html = html_text
        except Exception as e:
            logger.error(f"Failed to fetch job URL for active check {url}: {e}")
            return {"is_active": False, "reason": f"Job posting page unreachable ({str(e) or type(e).__name__})", "engine": "error_fallback"}

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

    res_data = None

    # Use Gemini if available
    if settings.gemini_api_key and settings.gemini_api_key != "your-key" and "your-key" not in settings.gemini_api_key:
        try:
            content_text = await call_gemini_api(
                prompt=prompt,
                system_instruction="You determine if job listings are still active. You always respond with raw JSON only.",
                response_json=True
            )
            res_data = _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Gemini: {e}")

    # Use Claude if available
    if not res_data and anthropic_client:
        try:
            message = await anthropic_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=500,
                temperature=0.0,
                system="You determine if job listings are still active. You always respond with raw JSON only.",
                messages=[{"role": "user", "content": prompt}]
            )
            res_data = _extract_json_object(message.content[0].text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Claude: {e}")

    # Use Ollama if available
    if not res_data and _should_try_ollama():
        try:
            content_text = await call_ollama_api(
                prompt=prompt,
                system_instruction="You determine if job listings are still active. You always respond with raw JSON only."
            )
            res_data = _extract_json_object(content_text)
        except Exception as e:
            logger.error(f"Failed checking job active status with Ollama: {e}")

    if not res_data:
        # Simple heuristic fallback
        lower_text = text.lower()
        closed_keywords = ["no longer accepting applications", "job is closed", "expired", "filled", "listing has ended", "not active"]
        is_closed = any(kw in lower_text for kw in closed_keywords)
        res_data = {
            "is_active": not is_closed,
            "reason": "Closed (keyword detected)" if is_closed else "Active",
        }

    res_data["engine"] = fetch_engine
    return res_data
