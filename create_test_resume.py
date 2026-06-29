from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_resume():
    c = canvas.Canvas("test_resume.pdf", pagesize=letter)
    c.drawString(100, 750, "Niko Alfonso Pangilinan")
    c.drawString(100, 730, "nikoalfonsop@gmail.com | linkedin.com/in/nico-pangilinan")
    c.drawString(100, 700, "Professional Experience:")
    c.drawString(100, 680, "Software Engineer - TechCorp (2023 - Present)")
    c.drawString(120, 660, "- Built scalable microservices using Python, FastAPI and PostgreSQL.")
    c.drawString(120, 640, "- Designed responsive user interfaces in React and Tailwind CSS.")
    c.drawString(120, 620, "- Implemented multi-model AI routing with Gemini and Claude APIs.")
    c.drawString(100, 580, "Education:")
    c.drawString(100, 560, "BS Computer Science - State University")
    c.save()

if __name__ == "__main__":
    create_resume()
