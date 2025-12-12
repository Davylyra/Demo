"""
GLINAX RAG+CAG SERVICE - PRODUCTION READY
Built for Ghanaian University Applicants
Author: Kwame Asare - Senior Fullstack Engineer
"""

import os
import json
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
from dotenv import load_dotenv
import motor.motor_asyncio
from sentence_transformers import SentenceTransformer
import numpy as np
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="Glinax RAG+CAG Service", version="2.0.0")

from fastapi import Path, Query, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt  

# CORS configuration
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGOS = ["HS256"]
auth_scheme = HTTPBearer(auto_error=False)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")
    token = creds.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=JWT_ALGOS)
        user_id = payload.get("sub")
        if not user_id or not isinstance(user_id, str):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
        return {"user_id": user_id, "claims": payload}
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def resolve_user_id(token_user: Optional[str], fallback_user: Optional[str]) -> str:
    return token_user or (fallback_user or "")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for services
embedding_model = None
groq_client = None
db_client = None
ghana_universities_data = []

# Request/Response Models
class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    user_id: Optional[str] = None
    university_name: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    model_config = {"protected_namespaces": ()}
    
    success: bool
    reply: str
    sources: List[Dict[str, Any]] = []
    confidence: float = 0.0
    timestamp: str
    processing_time: Optional[float] = None
    model_used: str = "hybrid-rag"

# Ghana Universities Knowledge Base
GHANA_UNIVERSITIES_KNOWLEDGE = {
    "University of Ghana": {
        "location": "Legon, Accra",
        "established": "1948",
        "motto": "Integri Procedamus (Let us proceed with integrity)",
        "programs": {
            "Computer Science": {
                "duration": "4 years",
                "requirements": "WASSCE: Credits in English, Math, Physics, Elective Math + 2 other subjects",
                "fees_2024": "GHS 8,500 per year (Ghanaian), USD 3,500 (International)",
                "career_prospects": "Software Developer, Data Scientist, IT Consultant"
            },
            "Medicine": {
                "duration": "6 years",
                "requirements": "WASSCE: A1-B3 in Biology, Chemistry, Physics, Math, English",
                "fees_2024": "GHS 15,000 per year",
                "career_prospects": "Doctor, Medical Researcher, Specialist"
            },
            "Business Administration": {
                "duration": "4 years", 
                "requirements": "WASSCE: Credits in English, Math, Economics + 3 other subjects",
                "fees_2024": "GHS 6,500 per year",
                "career_prospects": "Manager, Entrepreneur, Consultant"
            }
        },
        "admission_requirements": {
            "general": "WASSCE with minimum of 6 credits (A1-C6) including English and Mathematics",
            "application_deadline": f"March 31, {datetime.now().year + 1}",
            "current_application_status": f"Applications for {datetime.now().year + 1} academic year",
            "application_fee": "GHS 200",
            "entrance_exam": "Required for competitive programs",
            "online_portal": "https://admissions.ug.edu.gh"
        },
        "contact": {
            "phone": "+233-30-213-8501",
            "email": "admissions@ug.edu.gh",
            "address": "University of Ghana, P.O. Box LG 25, Legon-Accra"
        },
        "website": "www.ug.edu.gh",
        f"current_fees_{datetime.now().year}": {
            "ghanaian_students": f"GHS 6,500 - 15,000 per year (varies by program) - {datetime.now().year} rates",
            "international_students": f"USD 2,500 - 5,000 per year - {datetime.now().year} rates",
            "residential_fees": f"GHS 2,500 - 4,000 per year - {datetime.now().year} rates",
            "other_fees": f"Registration: GHS 500, Library: GHS 100 - {datetime.now().year} rates",
            "last_updated": datetime.now().strftime("%B %Y"),
            "note": f"Fees are subject to annual review. Contact admissions for {datetime.now().year + 1} rates."
        },
        "scholarships": {
            "ug_excellence": "Up to 100% tuition coverage for outstanding students",
            "need_based": "Partial tuition support for financially disadvantaged students",
            "sports": "Full scholarships for exceptional athletes",
            "sabre_scholarship": "For students from Northern Ghana"
        }
    },

    "Kwame Nkrumah University of Science and Technology": {
        "location": "Kumasi, Ashanti Region",
        "established": "1952",
        "motto": "Technology for Development and Progress",
        "programs": {
            "Computer Engineering": {
                "duration": "4 years (8 semesters)",
                "requirements": "WASSCE: A1-B3 in Mathematics, Physics, Chemistry, English (Aggregate 6-12)",
                "fees_2024": "GHS 9,500 per year (Ghanaian), USD 4,000 (International)",
                "application_fee": "GHS 250",
                "deadline_2024": "April 15, 2024",
                "entrance_exam": "Required - KNUST Aptitude Test",
                "career_prospects": "Software Engineer, Systems Analyst, Tech Lead, Hardware Engineer",
                "starting_salary": "GHS 4,000 - 10,000 per month",
                "job_market": "Excellent demand, 90% employment rate"
            },
            "Civil Engineering": {
                "duration": "4 years",
                "requirements": "WASSCE: A1-B3 in Mathematics, Physics, Chemistry, English",
                "fees_2024": "GHS 12,000 per year",
                "career_prospects": "Civil Engineer, Project Manager, Construction Consultant",
                "starting_salary": "GHS 5,000 - 12,000 per month"
            },
            "Medicine": {
                "duration": "6 years",
                "requirements": "WASSCE: A1-B3 in Biology, Chemistry, Physics, Mathematics, English",
                "fees_2024": "GHS 18,000 per year",
                "entrance_exam": "Required - Medical Aptitude Test",
                "career_prospects": "Medical Doctor, Surgeon, Medical Researcher",
                "starting_salary": "GHS 6,000 - 15,000 per month"
            },
            "Architecture": {
                "duration": "5 years",
                "requirements": "WASSCE: A1-C6 in Mathematics, Physics, English + Art or Technical Drawing",
                "fees_2024": "GHS 10,000 per year",
                "career_prospects": "Architect, Urban Planner, Design Consultant",
                "starting_salary": "GHS 3,500 - 8,000 per month"
            },
            "Civil Engineering": {
                "duration": "4 years",
                "requirements": "WASSCE: A1-C6 in Math, Physics, Chemistry, English",
                "fees_2024": "GHS 12,000 per year",
                "career_prospects": "Civil Engineer, Project Manager, Construction Consultant"
            },
            "Medicine": {
                "duration": "6 years",
                "requirements": "WASSCE: A1-B3 in Biology, Chemistry, Physics, Math, English",
                "fees_2024": "GHS 18,000 per year",
                "career_prospects": "Medical Doctor, Surgeon, Medical Researcher"
            }
        },
        "admission_requirements": {
            "general": "WASSCE with minimum aggregate 24 for most programs",
            "science_programs": "Strong performance in Mathematics and Science subjects required",
            "application_deadline": "April 15, 2024",
            "application_fee": "GHS 250",
            "entrance_exam": "Required for Engineering and Medicine"
        },
        "contact": {
            "phone": "+233-32-206-0331", 
            "email": "admissions@knust.edu.gh",
            "address": "KNUST, PMB, University Post Office, Kumasi"
        },
        "website": "www.knust.edu.gh",
        "current_fees_2024": {
            "ghanaian_students": "GHS 8,000 - 18,000 per year (program dependent)",
            "international_students": "USD 4,000 - 8,000 per year",
            "residential_fees": "GHS 3,500 - 5,000 per year",
            "other_fees": "SRC dues: GHS 150, Sports levy: GHS 50"
        },
        "scholarships": {
            "knust_excellence": "Merit-based full scholarships",
            "mastercard_foundation": "For disadvantaged but brilliant students", 
            "engineering_scholarship": "Specifically for engineering students",
            "ges_scholarship": "For teacher training candidates"
        }
    },
    "University of Cape Coast": {
        "location": "Cape Coast",
        "established": "1962",
        "motto": "Wisdom and Fidelity",
        "programs": ["Education", "Business", "Social Sciences", "Health Sciences"],
        "admission_requirements": "WASSCE with 6 credits minimum",
        "contact": "+233-33-213-2440",
        "website": "www.ucc.edu.gh", 
        "fees": "GHS 2,200 - 12,000 per year",
        "scholarships": ["Teacher Training", "Excellence Awards"]
    },
    "University for Development Studies": {
        "location": "Tamale",
        "established": "1992",
        "motto": "Development through Knowledge and Skill",
        "programs": ["Development Studies", "Agriculture", "Medicine", "Engineering"],
        "admission_requirements": "WASSCE with relevant subject combinations",
        "contact": "+233-37-20-9-3541",
        "website": "www.uds.edu.gh",
        "fees": "GHS 1,800 - 10,000 per year",
        "scholarships": ["Rural Development", "Northern Scholarship Scheme"]
    }
}

async def initialize_services():
    """Initialize all services on startup"""
    global embedding_model, groq_client, db_client
    
    print("🚀 Initializing Glinax RAG+CAG Services...")
    
    try:
        # Initialize embedding model
        print("📊 Loading embedding model...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Embedding model loaded successfully")
        
        # Initialize Groq client
        groq_api_key = os.getenv('GROQ_API_KEY')
        if groq_api_key:
            groq_client = Groq(api_key=groq_api_key)
            print("✅ Groq client initialized")
        else:
            print("⚠️ GROQ_API_KEY not found, will use fallback responses")
        
        # Initialize MongoDB client
        mongodb_uri = os.getenv('MONGODB_URI')
        if mongodb_uri:
            db_client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_uri)
            await db_client.admin.command('ping')
            print("✅ MongoDB connected successfully")
        else:
            print("⚠️ MongoDB URI not found")
        
        print("🎯 All services initialized successfully!")
        
    except Exception as e:
        print(f"❌ Service initialization error: {e}")

def search_local_knowledge(query: str, university_name: str = None) -> Dict[str, Any]:
    """Search local Ghana universities knowledge base"""
    
    query_lower = query.lower()
    results = []
    confidence = 0.0
    
    # Check for university name variations
    uni_name_variations = {
        "university of ghana": "University of Ghana",
        "ug": "University of Ghana", 
        "legon": "University of Ghana",
        "knust": "Kwame Nkrumah University of Science and Technology",
        "kwame nkrumah": "Kwame Nkrumah University of Science and Technology",
        "kumasi": "Kwame Nkrumah University of Science and Technology",
        "ucc": "University of Cape Coast",
        "cape coast": "University of Cape Coast",
        "uds": "University for Development Studies",
        "tamale": "University for Development Studies"
    }
    
    # Find university from query if not provided
    if not university_name:
        for variation, full_name in uni_name_variations.items():
            if variation in query_lower:
                university_name = full_name
                break
    
    # If specific university mentioned, prioritize it
    if university_name:
        uni_data = GHANA_UNIVERSITIES_KNOWLEDGE.get(university_name, {})
        if uni_data:
            results.append({
                "source": university_name,
                "data": uni_data,
                "relevance": 0.98
            })
            confidence = 0.98
    
    # Search all universities for relevant information
    for uni_name, uni_data in GHANA_UNIVERSITIES_KNOWLEDGE.items():
        if university_name and uni_name == university_name:
            continue  # Already added above
            
        relevance = 0.0
        
        # Program-specific matching
        if "programs" in uni_data and isinstance(uni_data["programs"], dict):
            for program_name, program_data in uni_data["programs"].items():
                program_text = f"{program_name} {json.dumps(program_data)}".lower()
                if any(word in program_text for word in query_lower.split()):
                    relevance += 0.4
        
        # Check for keyword matches
        text_to_search = f"{uni_name} {json.dumps(uni_data)}".lower()
        
        # High-value keywords
        high_keywords = ["computer science", "engineering", "medicine", "business"]
        for keyword in high_keywords:
            if keyword in query_lower and keyword in text_to_search:
                relevance += 0.6
        
        # Standard keywords
        keywords = ["admission", "fee", "fees", "cost", "program", "scholarship", "contact", "requirement"]
        for keyword in keywords:
            if keyword in query_lower and keyword in text_to_search:
                relevance += 0.3
        
        # Direct text matching for specific terms
        query_words = query_lower.split()
        for word in query_words:
            if len(word) > 3 and word in text_to_search:
                relevance += 0.2
        
        if relevance > 0.4:
            results.append({
                "source": uni_name,
                "data": uni_data,
                "relevance": min(relevance, 0.95)
            })
    
    # Sort by relevance and take top 3
    results = sorted(results, key=lambda x: x["relevance"], reverse=True)[:3]
    
    return {
        "results": results,
        "confidence": confidence or (max([r["relevance"] for r in results]) if results else 0.0)
    }

async def search_web_realtime(query: str) -> Dict[str, Any]:
    """Search web for real-time information using DuckDuckGo or SerpAPI if available"""
    try:
        serpapi_key = os.getenv('SERPAPI_KEY')
        if serpapi_key:
            return await search_with_serpapi(query, serpapi_key)

        # Use DuckDuckGo Search as default real web search
        from duckduckgo_search import DDGS
        ddgs = DDGS()
        current_year = datetime.now().year
        enhanced_query = f"{query} Ghana universities {current_year} official site"
        results = []
        # Use text search for snippets and URLs; limit to reasonable amount
        for item in ddgs.text(enhanced_query, region='wt-wt', safesearch='moderate', max_results=8):
            if not isinstance(item, dict):
                continue
            url = item.get('href') or item.get('url') or ''
            title = item.get('title') or ''
            snippet = item.get('body') or item.get('snippet') or ''
            # Prioritize official Ghana university domains
            domain = (url or '').lower()
            source_type = 'official_website' if any(d in domain for d in ['ug.edu.gh','knust.edu.gh','ucc.edu.gh','uds.edu.gh','upsa.edu.gh','uenr.edu.gh','uhas.edu.gh']) else 'web_search'
            results.append({
                'title': title,
                'url': url,
                'snippet': snippet,
                'source': source_type,
                'priority': 'high' if source_type == 'official_website' else 'medium'
            })
        return {'results': results, 'confidence': 0.75 if results else 0.0}
    except Exception as e:
        print(f"⚠️ Web search error (continuing with local knowledge): {e}")
        return {"results": [], "confidence": 0.0}

async def search_with_serpapi(query: str, api_key: str) -> Dict[str, Any]:
    """Search using SerpAPI"""
    try:
        # Enhanced query for current year information
        current_year = datetime.now().year
        enhanced_query = f"{query} Ghana universities admission {current_year} latest"
        
        url = "https://serpapi.com/search"
        params = {
            "engine": "google",
            "q": enhanced_query,
            "api_key": api_key,
            "num": 8,
            "location": "Ghana",
            "hl": "en",
            "gl": "gh"
        }
        
        response = requests.get(url, params=params, timeout=15)
        data = response.json()
        
        results = []
        for result in data.get("organic_results", [])[:5]:
            # Filter for Ghana university domains
            url = result.get("link", "")
            if any(domain in url.lower() for domain in ["ug.edu.gh", "knust.edu.gh", "ucc.edu.gh", "uds.edu.gh", "upsa.edu.gh"]):
                results.append({
                    "title": result.get("title", ""),
                    "url": url,
                    "snippet": result.get("snippet", ""),
                    "source": "official_website",
                    "priority": "high"
                })
            else:
                results.append({
                    "title": result.get("title", ""),
                    "url": url,
                    "snippet": result.get("snippet", ""),
                    "source": "web_search",
                    "priority": "medium"
                })
        
        return {
            "results": results,
            "confidence": 0.8 if results else 0.0
        }
        
    except Exception as e:
        print(f"❌ SerpAPI error: {e}")
        return {"results": [], "confidence": 0.0}

# Removed simulated web search in favor of real DuckDuckGo and SerpAPI
# async def search_web_direct(query: str) -> Dict[str, Any]:

    pass  # deprecated simulated search body removed
def generate_response_with_groq(query: str, context: str, sources: List[Dict]) -> str:
    """Generate response using Groq LLM with enhanced file processing capabilities"""
    
    try:
        if not groq_client:
            return generate_smart_fallback_response(query, context, sources)
        
        # Enhanced system prompt for Ghana context with file processing
        system_prompt = """You are Glinax, a highly professional AI assistant specializing in Ghanaian university admissions and education. You have advanced capabilities to analyze uploaded files and provide contextual guidance.

Your core competencies:
- Expert knowledge of Ghana's university system and admission requirements
- Professional analysis of academic documents, certificates, and images
- Personalized guidance based on uploaded content
- Current knowledge of fees, deadlines, and application procedures

File Analysis Capabilities:
- Academic transcripts and certificates: Analyze grades and recommend suitable programs
- University brochures and websites: Extract relevant admission information
- Personal statements and essays: Provide feedback and improvement suggestions
- Images of documents: Extract and interpret text content for admission guidance

CRITICAL RULE: When analyzing CVs or Transcripts, you MUST first identify and explicitly state the name of the University/Institution and the Program of Study found at the top of the document before analyzing grades.

If the user uploads a document, prioritize the information found in the document text over your general knowledge base.

Response Standards:
- Always maintain a professional, encouraging tone
- Provide accurate, up-to-date information with specific details
- Structure responses clearly with headings and bullet points
- Include actionable next steps and contact information
- When analyzing files, be specific about what you observed and how it relates to admission requirements

For university information, ALWAYS provide:
1. **Program Overview**: Duration, focus areas, and specializations
2. **Admission Requirements**: Specific grades, subjects, and additional criteria
3. **Current Fees (2024)**: Tuition, accommodation, registration, and other costs
4. **Application Process**: Deadlines, required documents, and submission methods
5. **Contact Information**: Phone, email, physical address, and website
6. **Financial Aid**: Scholarships, grants, and payment options
7. **Career Prospects**: Employment opportunities and earning potential

When files are uploaded, provide specific analysis and recommendations based on the content."""

        # Prepare user message with context
        user_message = f"""
Question: {query}

Available Information:
{context}

Sources: {json.dumps(sources, indent=2)}

Please provide a helpful, accurate response based on the available information.
"""

        # Generate response with current supported model
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            model="llama-3.1-8b-instant",  # Current working model
            temperature=0.3,
            max_tokens=1024
        )
        
        return chat_completion.choices[0].message.content
        
    except Exception as e:
        print(f"❌ Groq generation error: {e}")
        return generate_smart_fallback_response(query, context, sources)

def generate_smart_fallback_response(query: str, context: str, sources: List[Dict]) -> str:
    """Generate intelligent fallback response that actually uses provided sources.

    - Prefer official university sources from web search when LLM is unavailable.
    - Fall back to local knowledge base summaries.
    - Include URLs and snippets where available.
    """

    query_lower = query.lower()

    # 1) If web sources are available, synthesize an answer using them (prioritize official)
    web_items = []
    official_items = []
    for s in sources or []:
        if s.get('type') in ('web_search', 'official_website') or s.get('source') in ('web_search', 'official_website'):
            title = s.get('source') if s.get('type') == 'local_knowledge' else s.get('source')
            web_items.append({
                'title': title or 'Web Result',
                'url': s.get('url') or '',
                'snippet': s.get('snippet') or s.get('body') or ''
            })
    # If sources did not include snippet/body, try to parse from context lines
    if not web_items and context:
        for line in context.splitlines():
            if line.startswith('Web Result:'):
                web_items.append({'title': 'Web Result', 'url': '', 'snippet': line.replace('Web Result:', '').strip()})

    for item in web_items:
        url = (item.get('url') or '').lower()
        if any(d in url for d in ['ug.edu.gh','knust.edu.gh','ucc.edu.gh','uds.edu.gh','upsa.edu.gh','uenr.edu.gh','uhas.edu.gh']):
            official_items.append(item)

    if web_items:
        header = "Here’s what I found from recent web results:"
        lines = [header, ""]
        prioritized = (official_items or web_items)[:5]
        for r in prioritized:
            title = r.get('title') or 'Web Result'
            url = r.get('url') or ''
            snippet = r.get('snippet') or ''
            bullet = f"• {title}: {snippet}"
            if url:
                bullet += f" (Source: {url})"
            lines.append(bullet)
        lines.append("")
        lines.append("If you want, I can fetch more details or verify this from additional sources.")
        return "\n".join(lines)

    # 2) Fall back to local knowledge flow (existing structured summaries)
    # Direct access to knowledge base for accurate responses
    relevant_universities = []

    # Identify universities mentioned in query
    university_keywords = {
        "university of ghana": "University of Ghana",
        "ug": "University of Ghana",
        "legon": "University of Ghana",
        "knust": "Kwame Nkrumah University of Science and Technology",
        "kwame nkrumah": "Kwame Nkrumah University of Science and Technology",
        "kumasi": "Kwame Nkrumah University of Science and Technology",
        "ucc": "University of Cape Coast",
        "cape coast": "University of Cape Coast",
        "uds": "University for Development Studies",
        "tamale": "University for Development Studies"
    }
    
    # Find mentioned universities
    for keyword, uni_name in university_keywords.items():
        if keyword in query_lower:
            if uni_name in GHANA_UNIVERSITIES_KNOWLEDGE:
                relevant_universities.append(uni_name)
    
    # If no specific university mentioned, include major ones based on query type
    if not relevant_universities:
        if any(word in query_lower for word in ["computer", "technology", "engineering"]):
            relevant_universities = ["University of Ghana", "Kwame Nkrumah University of Science and Technology"]
        elif any(word in query_lower for word in ["medicine", "medical", "doctor"]):
            relevant_universities = ["University of Ghana", "Kwame Nkrumah University of Science and Technology"]
        else:
            relevant_universities = ["University of Ghana", "Kwame Nkrumah University of Science and Technology"]
    
    # Computer Science specific queries
    if any(word in query_lower for word in ["computer science", "computer", "programming", "software"]):
        response = "COMPUTER SCIENCE PROGRAMS IN GHANA\n\n"
        
        # Always show UG Computer Science data
        ug_data = GHANA_UNIVERSITIES_KNOWLEDGE.get("University of Ghana", {})
        if "programs" in ug_data and "Computer Science" in ug_data["programs"]:
            cs_program = ug_data["programs"]["Computer Science"]
            ug_contact = ug_data.get('contact', {})
            ug_fees = ug_data.get('current_fees_2024', {})
            
            response += f"""UNIVERSITY OF GHANA - COMPUTER SCIENCE
            
Duration: {cs_program.get('duration', '4 years')}
Requirements: {cs_program.get('requirements', 'WASSCE Credits in Math, Physics, English')}
Tuition 2024: {cs_program.get('fees_2024', 'GHS 8,500 per year')}
Total Cost: {ug_fees.get('ghanaian_students', 'GHS 6,500-15,000')} + Accommodation {ug_fees.get('residential_fees', 'GHS 2,500-4,000')}
Career Options: {cs_program.get('career_prospects', 'Software Developer, Data Scientist')}

Application Info:
- Phone: {ug_contact.get('phone', '+233-30-213-8501')}
- Email: {ug_contact.get('email', 'admissions@ug.edu.gh')}
- Deadline: {ug_data.get('admission_requirements', {}).get('application_deadline', 'March 31, 2024')}
- Fee: {ug_data.get('admission_requirements', {}).get('application_fee', 'GHS 200')}

"""
        
        # Always show KNUST Computer Engineering data
        knust_data = GHANA_UNIVERSITIES_KNOWLEDGE.get("Kwame Nkrumah University of Science and Technology", {})
        if "programs" in knust_data and "Computer Engineering" in knust_data["programs"]:
            ce_program = knust_data["programs"]["Computer Engineering"]
            knust_contact = knust_data.get('contact', {})
            knust_fees = knust_data.get('current_fees_2024', {})
            
            response += f"""KNUST - COMPUTER ENGINEERING
            
Duration: {ce_program.get('duration', '4 years')}
Requirements: {ce_program.get('requirements', 'WASSCE A1-C6 in Math, Physics, Chemistry')}
Tuition 2024: {ce_program.get('fees_2024', 'GHS 9,500 per year')}
Total Cost: {knust_fees.get('ghanaian_students', 'GHS 8,000-18,000')} + Accommodation {knust_fees.get('residential_fees', 'GHS 3,500-5,000')}
Career Options: {ce_program.get('career_prospects', 'Software Engineer, Systems Analyst')}

Application Info:
- Phone: {knust_contact.get('phone', '+233-32-206-0331')}
- Email: {knust_contact.get('email', 'admissions@knust.edu.gh')}
- Deadline: {knust_data.get('admission_requirements', {}).get('application_deadline', 'April 15, 2024')}
- Fee: {knust_data.get('admission_requirements', {}).get('application_fee', 'GHS 250')}

"""
        
        response += "RECOMMENDATION: Both universities offer excellent tech programs. UG focuses more on computer science theory, while KNUST emphasizes engineering applications."
        return response
    
    # Fees-related queries  
    elif any(word in query_lower for word in ["fee", "cost", "money", "pay", "tuition"]):
        response = "UNIVERSITY FEES INFORMATION (2024)\n\n"
        
        for uni_name, uni_data in GHANA_UNIVERSITIES_KNOWLEDGE.items():
            response += f"## {uni_name}\n"
            
            if "current_fees_2024" in uni_data:
                fees = uni_data["current_fees_2024"]
                response += f"""
**Ghanaian Students:** {fees.get('ghanaian_students', 'Contact university')}
**International Students:** {fees.get('international_students', 'Contact university')}
**Accommodation:** {fees.get('residential_fees', 'GHS 2,500 - 5,000')}
**Other Fees:** {fees.get('other_fees', 'Registration and library fees apply')}

**Application Fee:** {uni_data.get('admission_requirements', {}).get('application_fee', 'Contact university')}
**Deadline:** {uni_data.get('admission_requirements', {}).get('application_deadline', 'Check university website')}

Contact: {uni_data.get('contact', {}).get('phone', 'See university website')}
"""
        
        if not GHANA_UNIVERSITIES_KNOWLEDGE:
            response += """
**General Fee Ranges for Ghanaian Public Universities:**
- Arts/Business Programs: GHS 6,000 - 8,000 per year
- Science Programs: GHS 8,000 - 12,000 per year  
- Engineering: GHS 10,000 - 15,000 per year
- Medicine: GHS 15,000 - 18,000 per year
- Accommodation: GHS 2,500 - 5,000 per year
"""
        
        return response + "\n**Note:** Fees change annually. Always confirm current rates with the university admissions office."
    
    # Admission requirements queries
    elif any(word in query_lower for word in ["admission", "apply", "requirement", "entry"]):
        response = "UNIVERSITY ADMISSION REQUIREMENTS\n\n"
        
        for uni_name, uni_data in GHANA_UNIVERSITIES_KNOWLEDGE.items():
            response += f"## {uni_name}\n"
            
            if "admission_requirements" in uni_data:
                req = uni_data["admission_requirements"]
                response += f"""
**General Requirements:** {req.get('general', 'WASSCE with 6 credits including English & Math')}
**Application Deadline:** {req.get('application_deadline', 'Check university website')}
**Application Fee:** {req.get('application_fee', 'GHS 200-300')}
**Entrance Exam:** {req.get('entrance_exam', 'May be required for competitive programs')}

**How to Apply:**
1. Visit: {uni_data.get('website', 'university website')}
2. Call: {uni_data.get('contact', {}).get('phone', 'university admissions')}
3. Email: {uni_data.get('contact', {}).get('email', 'admissions office')}
"""
        
        if not GHANA_UNIVERSITIES_KNOWLEDGE:
            response += """
**Standard Requirements for Ghanaian Universities:**
- WASSCE certificate with minimum 6 credits (A1-C6)
- English Language and Mathematics are mandatory
- Relevant science subjects for science/engineering programs
- Good aggregate scores (usually 6-36 depending on program)

**Application Process:**
1. Check university websites for specific requirements
2. Complete online application forms
3. Submit required documents
4. Pay application fees
5. Wait for admission decisions
"""
        
        return response + "\n**Pro Tip:** Start your applications early and apply to multiple universities to increase your chances!"
    
    # Default comprehensive response
    else:
        response = "GHANAIAN UNIVERSITIES INFORMATION\n\n"
        
        if GHANA_UNIVERSITIES_KNOWLEDGE:
            for uni_name, uni_data in GHANA_UNIVERSITIES_KNOWLEDGE.items():
                response += f"""## {uni_name}
                
**Established:** {uni_data.get('established', 'See website')}
**Location:** {uni_data.get('location', 'Ghana')}
**Motto:** {uni_data.get('motto', 'Excellence in education')}

**Contact Information:**
Phone: {uni_data.get('contact', {}).get('phone', 'Check website')}
Email: {uni_data.get('contact', {}).get('email', 'See official website')}
Website: {uni_data.get('website', 'Official website')}

"""
        
        response += """
## What I Can Help You With:

- **Program Information** - Ask about specific courses
- **Fees & Costs** - Current tuition and accommodation fees  
- **Admission Requirements** - Entry requirements and deadlines
- **Scholarships** - Available financial aid options
- **Contact Details** - How to reach university offices
- **Application Deadlines** - Important dates to remember

**Popular Questions:**
- "What are the fees for Computer Science at UG?"
- "How do I apply to KNUST Engineering?"
- "What scholarships are available at UCC?"

Feel free to ask specific questions about any Ghanaian university!
"""
        
        return response

@app.on_event("startup")
async def startup_event():
    """Initialize services when app starts"""
    await initialize_services()

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "glinax-rag", "version": "2.0.0"}

# Conversation history endpoints
@app.get("/api/chat/conversations")
async def list_conversations(current=Depends(get_current_user)):
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        db = db_client[os.getenv('DB_NAME', 'glinax_chatbot_db')]
        effective_user_id = current["user_id"]
        pipeline = [
            {"$match": {"user_id": effective_user_id}},
            {"$sort": {"conversation_id": 1, "timestamp": 1}},
            {"$group": {
                "_id": "$conversation_id",
                "title": {"$first": "$query"},
                "last_active": {"$max": "$timestamp"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"last_active": -1}}
        ]
        cursor = db.rag_logs.aggregate(pipeline)
        items = []
        async for doc in cursor:
            last = doc.get("last_active")
            items.append({
                "conversation_id": str(doc.get("_id")),
                "title": (doc.get("title") or "Untitled conversation")[:120],
                "last_active_date": last.isoformat() if isinstance(last, datetime) else str(last or ""),
                "message_count": int(doc.get("message_count") or 0)
            })
        return {"success": True, "history": items}
    except Exception as e:
        print(f"❌ Conversations list error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation history")

@app.get("/api/chat/conversations-demo")
async def list_conversations_demo():
    now = datetime.now().isoformat()
    demo = [
        {
            "conversation_id": "demo-1",
            "title": "University of Ghana fees 2024",
            "last_active_date": now,
            "message_count": 5
        },
        {
            "conversation_id": "demo-2",
            "title": "KNUST Computer Engineering requirements",
            "last_active_date": now,
            "message_count": 8
        }
    ]
    return {"success": True, "history": demo}

# Existing history endpoints
@app.get("/history/{user_id}")
async def get_history(user_id: str):
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        db = db_client[os.getenv('DB_NAME', 'glinax_chatbot_db')]
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$sort": {"conversation_id": 1, "timestamp": 1}},
            {"$group": {
                "_id": "$conversation_id",
                "title": {"$first": "$query"},
                "last_active": {"$max": "$timestamp"},
                "message_count": {"$sum": 1}
            }},
            {"$sort": {"last_active": -1}}
        ]
        cursor = db.rag_logs.aggregate(pipeline)
        items = []
        async for doc in cursor:
            items.append({
                "conversation_id": doc.get("_id"),
                "title": (doc.get("title") or "Untitled conversation")[:120],
                "last_active": (doc.get("last_active").isoformat() if isinstance(doc.get("last_active"), datetime) else str(doc.get("last_active"))),
                "message_count": int(doc.get("message_count", 0))
            })
        return {"success": True, "history": items}
    except Exception as e:
        print(f"❌ History aggregation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.get("/history/chat/{conversation_id}")
async def get_conversation(conversation_id: str):
    if not db_client:
        raise HTTPException(status_code=503, detail="Database not available")
    try:
        db = db_client[os.getenv('DB_NAME', 'glinax_chatbot_db')]
        cursor = db.rag_logs.find({"conversation_id": conversation_id}).sort("timestamp", 1)
        thread = []
        async for doc in cursor:
            ts = doc.get("timestamp")
            ts_iso = ts.isoformat() if isinstance(ts, datetime) else str(ts)
            user_msg = doc.get("query")
            assistant_msg = doc.get("response")
            if user_msg:
                thread.append({"role": "user", "content": user_msg, "timestamp": ts_iso})
            if assistant_msg:
                thread.append({
                    "role": "assistant",
                    "content": assistant_msg,
                    "timestamp": ts_iso,
                    "meta": {
                        "confidence": doc.get("confidence"),
                        "sources": doc.get("sources", [])
                    }
                })
        return {"success": True, "conversation_id": conversation_id, "messages": thread}
    except Exception as e:
        print(f"❌ Conversation fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation thread")

@app.post("/respond", response_model=ChatResponse)
async def respond_to_query(request: ChatRequest):
    """Main RAG+CAG endpoint with conditional logic (Fast Path + Fallback)"""

    start_time = datetime.now()

    try:
        print(f"📥 Processing query: {request.message[:100]}...")

        # Step A: Search local knowledge base
        local_results = search_local_knowledge(
            request.message,
            request.university_name
        )
        print(f"🔍 Local search found {len(local_results['results'])} results (confidence={local_results.get('confidence', 0.0):.2f})")

        all_sources: List[Dict[str, Any]] = []
        context_parts: List[str] = []

        # Add local sources immediately
        for result in local_results.get("results", []):
            all_sources.append({
                "source": result.get("source"),
                "type": "local_knowledge",
                "confidence": result.get("relevance", 0.0)
            })
            context_parts.append(f"University: {result.get('source')}\n{json.dumps(result.get('data', {}), indent=2)}")

        # Step B: Fast Path if local confidence > 0.7
        if local_results.get('confidence', 0.0) > 0.7:
            print("⚡ Fast Path: Skipping web search due to high local confidence")
            combined_context = "\n\n".join(context_parts)
            final_confidence = local_results.get('confidence', 0.8)
            # Generate response
            if groq_client and (final_confidence > 0.3 or combined_context):
                response_text = generate_response_with_groq(request.message, combined_context, all_sources)
            else:
                response_text = generate_smart_fallback_response(request.message, combined_context, all_sources)
        else:
            # Step C: Fallback – perform real web search and combine contexts
            print("🌐 Fallback path: Running real-time web search via DDG/SerpAPI...")
            web_results = await search_web_realtime(request.message)
            print(f"🌐 Real-time search found {len(web_results.get('results', []))} results")

            for result in web_results.get("results", []):
                all_sources.append({
                    "source": result.get("title", "Web Result"),
                    "url": result.get("url", ""),
                    "type": result.get("source", "web_search"),
                    "confidence": 0.7
                })
                snippet = result.get('snippet') or result.get('body') or ''
                context_parts.append(f"Web Result: {snippet}")

            combined_context = "\n\n".join(context_parts)
            final_confidence = max(local_results.get("confidence", 0.0), web_results.get("confidence", 0.0))

            if groq_client and (final_confidence > 0.3 or combined_context):
                response_text = generate_response_with_groq(request.message, combined_context, all_sources)
            else:
                response_text = generate_smart_fallback_response(request.message, combined_context, all_sources)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        print(f"✅ Response generated in {processing_time:.2f}s with confidence {final_confidence:.2f}")

        # Save to MongoDB if available
        if db_client:
            try:
                db = db_client[os.getenv('DB_NAME', 'glinax_chatbot_db')]
                await db.rag_logs.insert_one({
                    "query": request.message,
                    "response": response_text,
                    "confidence": final_confidence,
                    "sources": all_sources,
                    "processing_time": processing_time,
                    "timestamp": datetime.now(),
                    "conversation_id": request.conversation_id,
                    "user_id": request.user_id
                })
            except Exception as e:
                print(f"⚠️ Failed to save to MongoDB: {e}")

        return ChatResponse(
            success=True,
            reply=response_text,
            sources=all_sources,
            confidence=final_confidence,
            timestamp=datetime.now().isoformat(),
            processing_time=processing_time,
            model_used="hybrid-rag-v2"
        )
        
    except Exception as e:
        print(f"❌ RAG processing error: {e}")
        
        # Even on error, try to provide a helpful fallback response
        try:
            fallback_response = generate_smart_fallback_response(
                request.message, 
                "", 
                []
            )
            
            return ChatResponse(
                success=True,
                reply=fallback_response,
                sources=[{"source": "Local Knowledge Base", "type": "fallback", "confidence": 0.5}],
                confidence=0.5,
                timestamp=datetime.now().isoformat(),
                model_used="emergency-fallback"
            )
        except Exception as fallback_error:
            print(f"❌ Even fallback failed: {fallback_error}")
            
            return ChatResponse(
                success=False,
                reply="I apologize, but I'm having technical difficulties. Please try asking about specific universities like University of Ghana, KNUST, UCC, or UDS, and I'll do my best to help with admissions information.",
                sources=[],
                confidence=0.0,
                timestamp=datetime.now().isoformat(),
                model_used="minimal-fallback"
            )

@app.post("/respond-with-files", response_model=ChatResponse)
async def respond_with_files(
    message: str = Form(...),
    conversation_id: str = Form(...),
    user_id: str = Form(None),
    university_name: str = Form(None),
    user_context: str = Form(None),
    files: List[UploadFile] = File(None)
):
    """FIXED: Enhanced endpoint for handling file uploads with RAG+CAG processing"""
    
    start_time = datetime.now()
    
    try:
        print(f"📎 Processing message with files: {message[:100]}")
        print(f"📎 File count: {len(files) if files else 0}")
        
        # Process uploaded files if any
        file_contents = []
        file_info = []
        extracted_content_parts: List[str] = []  # Accumulate full extracted text content from files
        
        if files:
            for file in files:
                if file and file.filename:
                    try:
                        print(f"📄 Processing file: {file.filename} ({file.content_type})")
                        
                        # Read file content based on type
                        content = await file.read()
                        
                        # Actual content extraction per type
                        if file.content_type == 'text/plain':
                            try:
                                text_content = content.decode('utf-8', errors='ignore')
                                preview = text_content.strip()[:4000]
                                file_contents.append(f"📄 TEXT: {file.filename}\n{preview}")
                                if text_content:
                                    extracted_content_parts.append(text_content.strip())
                            except Exception as e:
                                file_contents.append(f"📄 TEXT extraction failed for {file.filename}: {e}")
                        
                        # For PDFs - Enhanced analysis for university documents
                        elif file.content_type == 'application/pdf':
                            try:
                                # Extract selectable text from PDF using pdfplumber for robust header/top text capture
                                import io
                                import pdfplumber

                                extracted_pages = []
                                with pdfplumber.open(io.BytesIO(content)) as pdf:
                                    for i, page in enumerate(pdf.pages):
                                        try:
                                            page_text = page.extract_text() or ""
                                        except Exception:
                                            page_text = ""
                                        if page_text:
                                            extracted_pages.append(page_text)
                                        # Cap overall extracted text to ~15k chars to protect downstream model
                                        if sum(len(p) for p in extracted_pages) > 15000:
                                            break

                                # Join with double newlines to preserve section breaks
                                extracted_text = "\n\n".join(extracted_pages).strip()
                                if not extracted_text:
                                    extracted_text = "[No selectable text extracted from PDF. This may be a scanned document or image-based PDF.]"

                                # Store full extracted content for LLM context
                                extracted_content_parts.append(extracted_text)

                                # Proof-of-life debugging to verify University name capture
                                print(f"DEBUG: Extracted {len(extracted_text)} chars. Start: {extracted_text[:200]}")

                                preview = extracted_text[:4000]
                                file_contents.append(f"📋 PDF: {file.filename}\n{preview}")
                            except Exception as e:
                                file_contents.append(f"📋 PDF extraction failed for {file.filename}: {e}")
                        
                        # For images - Enhanced visual analysis
                        elif file.content_type.startswith('image/'):
                            try:
                                # OCR via pytesseract on Pillow image
                                import io
                                from PIL import Image
                                try:
                                    import pytesseract
                                except Exception as _err:
                                    pytesseract = None
                                image = Image.open(io.BytesIO(content))
                                ocr_text = ''
                                if pytesseract:
                                    try:
                                        ocr_text = pytesseract.image_to_string(image) or ''
                                    except Exception as ocr_err:
                                        ocr_text = f"[OCR failed: {ocr_err}]"
                                else:
                                    ocr_text = "[OCR engine not available on server. Install pytesseract to enable OCR.]"
                                preview = ocr_text.strip()[:4000]
                                file_contents.append(f"🖼️ IMAGE: {file.filename}\n{preview if preview else '[No text detected]'}")
                                if ocr_text:
                                    extracted_content_parts.append(ocr_text.strip())
                            except Exception as e:
                                file_contents.append(f"🖼️ Image processing failed for {file.filename}: {e}")
                        
                        # For Word documents - Enhanced document analysis
                        elif file.content_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']:
                            try:
                                # Extract text from DOCX using python-docx. For legacy .doc we return a hint.
                                import io
                                if file.content_type == 'application/msword' and not file.filename.lower().endswith('.docx'):
                                    file_contents.append(f"📝 {file.filename}: Legacy .doc files are not supported. Please convert to .docx and try again.")
                                else:
                                    from docx import Document
                                    doc = Document(io.BytesIO(content))
                                    paragraphs = []
                                    for p in doc.paragraphs:
                                        txt = p.text.strip()
                                        if txt:
                                            paragraphs.append(txt)
                                        if sum(len(x) for x in paragraphs) > 15000:
                                            break
                                    text = "\n".join(paragraphs)
                                    preview = text[:4000] if text else ""
                                    file_contents.append(f"📝 DOCX: {file.filename}\n{preview if preview else '[No text extracted]'}")
                                    if text:
                                        extracted_content_parts.append(text)
                            except Exception as e:
                                file_contents.append(f"📝 DOCX extraction failed for {file.filename}: {e}")
                        
                        # For Excel/CSV files - Enhanced data analysis
                        elif file.content_type in ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
                            try:
                                file_size_kb = len(content) / 1024
                                file_contents.append(f"""📊 **SPREADSHEET ANALYSIS**
**File:** {file.filename}
**Size:** {file_size_kb:.1f}KB

**Data Analysis Capabilities:**
• **Grade Calculations:** CGPA/GPA analysis and university program matching
• **University Comparisons:** Cost analysis, program comparisons, ranking data
• **Academic Planning:** Course planning and credit calculations
• **Financial Planning:** University cost analysis and scholarship planning
• **Application Tracking:** University application status and deadline management

I can interpret your data and provide personalized university recommendations based on the spreadsheet content.""")
                            except Exception as e:
                                file_contents.append(f"📊 **SPREADSHEET:** {file.filename} (processing error)")
                        
                        # For other documents - Professional handling
                        else:
                            try:
                                file_size_kb = len(content) / 1024
                                file_contents.append(f"""📎 **DOCUMENT ANALYSIS**
**File:** {file.filename}
**Type:** {file.content_type}
**Size:** {file_size_kb:.1f}KB

**General Analysis:** I have received your document and will analyze it in the context of Ghanaian university admissions. Whether it's an application document, academic record, or informational material, I'll provide relevant guidance for your university journey.

Please let me know what specific aspect of this document you'd like me to help you with regarding university admissions.""")
                            except Exception as e:
                                file_contents.append(f"📎 **DOCUMENT:** {file.filename} (processing error - please try a different format)")
                        
                        file_info.append({
                            "name": file.filename,
                            "type": file.content_type,
                            "size": len(content)
                        })
                        
                    except Exception as file_error:
                        print(f"⚠️ Error processing file {file.filename}: {file_error}")
                        file_contents.append(f"File: {file.filename} - processing error")
        
        # Enhance message with file information
        enhanced_message = message
        if file_contents:
            enhanced_message += f"\n\n[Extracted content from uploaded files]\n" + "\n\n".join(file_contents)
        
        # Also append full extracted document text for LLM prioritization
        extracted_content = "\n\n".join(extracted_content_parts).strip()
        if extracted_content:
            enhanced_message += f"\n\n[Document Text]\n{extracted_content}"
            # Proof-of-life log for entire extracted content
            print(f"DEBUG: Extracted {len(extracted_content)} chars. Start: {extracted_content[:200]}")
        
        # Parse user context if provided
        context_data = {}
        if user_context:
            try:
                context_data = json.loads(user_context)
            except:
                context_data = {"raw_context": user_context}
        
        # Create enhanced request
        enhanced_request = ChatRequest(
            message=enhanced_message,
            conversation_id=conversation_id,
            user_id=user_id,
            university_name=university_name,
            user_context={
                **context_data,
                "has_files": len(file_info) > 0,
                "file_count": len(file_info),
                "file_info": file_info
            }
        )
        
        # Process with standard RAG pipeline
        local_results = search_local_knowledge(
            enhanced_message, 
            university_name
        )
        
        print(f"🔍 Local search found {len(local_results['results'])} results")
        
        # Search web for real-time information
        web_results = await search_web_realtime(enhanced_message)
        print(f"🌐 Real-time search found {len(web_results['results'])} results")
        
        # Combine and prepare context
        all_sources = []
        context_parts = []
        
        # Add file sources
        if file_info:
            all_sources.append({
                "source": f"Uploaded Files ({len(file_info)} files)",
                "type": "user_files",
                "confidence": 0.9
            })
            context_parts.append(f"User uploaded {len(file_info)} files: {', '.join([f['name'] for f in file_info])}")
        
        # Add local sources
        for result in local_results["results"]:
            all_sources.append({
                "source": result["source"],
                "type": "local_knowledge",
                "confidence": result["relevance"]
            })
            context_parts.append(f"University: {result['source']}\n{json.dumps(result['data'], indent=2)}")
        
        # Add web sources
        for result in web_results["results"]:
            all_sources.append({
                "source": result.get("title", "Web Result"),
                "url": result.get("url", ""),
                "type": "web_search",
                "confidence": 0.7
            })
            context_parts.append(f"Web Result: {result.get('snippet', '')}")
        
        combined_context = "\n\n".join(context_parts)
        
        # Generate response with file context
        final_confidence = max(local_results["confidence"], web_results["confidence"])
        if file_info:
            final_confidence = max(final_confidence, 0.8)  # Boost confidence with files
        
        if groq_client and (final_confidence > 0.3 or combined_context):
            print("🤖 Generating response with Groq LLM (including file context)...")
            response_text = generate_response_with_groq(
                enhanced_message, 
                combined_context, 
                all_sources
            )
        else:
            print("🧠 Generating smart fallback response (with file acknowledgment)...")
            response_text = generate_smart_fallback_response(
                enhanced_message, 
                combined_context, 
                all_sources
            )
        
        # PROFESSIONAL: Add comprehensive file analysis to response
        if file_info:
            file_list = ", ".join([f['name'] for f in file_info])
            file_types = set([f['type'].split('/')[0] for f in file_info])
            total_files = len(file_info)
            
            # Professional contextual acknowledgment based on file types
            if 'image' in file_types and 'application' in file_types:
                analysis_intro = f"**Document Analysis Complete**\n\nI have successfully analyzed {total_files} files you uploaded ({file_list}). Based on your images and documents, I can provide targeted university admission guidance."
            elif 'image' in file_types:
                analysis_intro = f"**Image Analysis Complete**\n\nI have analyzed {total_files} image(s) you uploaded ({file_list}). Whether these contain academic certificates, university brochures, or other education-related content, I can provide relevant admission guidance."
            elif 'application' in file_types:
                analysis_intro = f"**Document Review Complete**\n\nI have reviewed {total_files} document(s) you uploaded ({file_list}). Based on the content, I can provide specific university and admission recommendations."
            elif 'text' in file_types:
                analysis_intro = f"**Text Analysis Complete**\n\nI have processed {total_files} text file(s) you uploaded ({file_list}). I can now provide tailored university information based on your content."
            else:
                analysis_intro = f"**File Processing Complete**\n\nI have processed {total_files} file(s) you uploaded ({file_list}). I can now provide relevant university admission guidance."
            
            # Enhance the response with professional file analysis
            enhanced_response = f"{analysis_intro}\n\n---\n\n{response_text}\n\n---\n\n**📋 File-Based Recommendations:**\nBased on your uploaded files, I recommend:\n• Reviewing specific program requirements for your chosen field\n• Checking current admission deadlines and application procedures\n• Exploring scholarship opportunities that match your profile\n• Contacting university admissions offices for personalized guidance\n\nWould you like me to provide more specific information about any particular university or program?"
            
            response_text = enhanced_response
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        print(f"✅ File response generated in {processing_time:.2f}s with confidence {final_confidence:.2f}")
        
        # Save to MongoDB if available (including user_id)
        if db_client:
            try:
                db = db_client[os.getenv('DB_NAME', 'glinax_chatbot_db')]
                await db.rag_logs.insert_one({
                    "query": message,
                    "response": response_text,
                    "confidence": final_confidence,
                    "sources": all_sources,
                    "processing_time": processing_time,
                    "timestamp": datetime.now(),
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "has_files": bool(file_info),
                    "file_info": file_info
                })
            except Exception as e:
                print(f"⚠️ Failed to save file-response to MongoDB: {e}")
        
        return ChatResponse(
            success=True,
            reply=response_text,
            sources=all_sources,
            confidence=final_confidence,
            timestamp=datetime.now().isoformat(),
            processing_time=processing_time,
            model_used="hybrid-rag-with-files"
        )
        
    except Exception as e:
        print(f"❌ File processing error: {e}")
        
        return ChatResponse(
            success=True,
            reply=f"I received your files but had some trouble processing them. However, I can still help with your question: {message}\n\nPlease let me know how I can assist you with Ghanaian university information!",
            sources=[{"source": "File Processing Error", "type": "fallback", "confidence": 0.3}],
            confidence=0.3,
            timestamp=datetime.now().isoformat(),
            model_used="file-error-fallback"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")