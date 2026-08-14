# Manav Patidar

**AI Agent Developer · Agentic AI Systems · Computer Vision & Multimodal AI**

I'm an AI/ML engineer who turns ambitious ideas into production-grade systems. From multi-agent LangGraph orchestrations that correct themselves mid-conversation, to computer-vision interfaces that respond to a glance, I build end-to-end — model, API, UI, tests, deployment. Every system I ship is validated with automated test suites and built for zero-downtime deployment.

This repository contains the source for my personal portfolio site — a scroll-driven, canvas-animated single-page site I designed and built from scratch.

## 🔗 Links

- **Portfolio:** [manav-portfolio.onrender.com](https://manav-portfolio.onrender.com)
- **GitHub:** [github.com/Manav57](https://github.com/Manav57)
- **LinkedIn:** [linkedin.com/in/manav-patidar-44956a312](https://www.linkedin.com/in/manav-patidar-44956a312/)
- **Email:** [manavpatidar2311@gmail.com](mailto:manavpatidar2311@gmail.com)

## 🛠 Skills

| Area | Technologies |
|---|---|
| AI/ML & Agentic | LangGraph (multi-agent orchestration), LLM integration (Groq, Gemini), prompt engineering, computer vision (OpenCV, MediaPipe), NLP & applied ML |
| Backend & APIs | Python-first architecture, FastAPI, Flask, Django, REST API design, microservices, PostgreSQL & SQLite |
| Frontend & Tools | React & Redux, responsive HTML5/CSS3, automated testing (pytest, Vitest), Git/GitHub workflows, AWS & CI/CD pipelines |

## 🚀 Featured Projects

### 01 — AI-Powered Pharmaceutical Complaint Management System
- 4-stage multi-node LangGraph pipeline for complaint processing
- Stateful conversational field corrections
- Automatic model failover logic
- Verified with 144 passing automated tests
- *React · Redux · FastAPI · LangGraph · Groq · PostgreSQL*

### 02 — Vision-Based Intelligent Touchless Interface
- Gesture-controlled holographic interface
- Real-time virtual element rotation & selection
- Low-latency hands-free navigation
- *Python · OpenCV · MediaPipe*

### 03 — Multimodal HCI Eye-Tracking System
- Real-time gaze & blink pattern interpretation
- Hands-free assistive control
- Facial landmark-based tracking
- *Python · OpenCV · Facial Landmarks*

### 04 — J.A.R.V.I.S-Mk85 AI Desktop Assistant
- Self-healing LLM assistant with reactive dashboard
- Media retrieval & live-code visualization projector mode
- *Python · Gemini API · Eel*

## 🎓 Education

**B.Tech — Computer Science & Engineering**
SRM Institute of Science and Technology, Kattankulathur · 2022 — 2026

## 📄 About the site

The portfolio is a zero-dependency static site: a custom canvas scroll engine (requestAnimationFrame + lerp) drives a procedural neon-galaxy background, with smooth scroll-reveal sections for About, Skills, Projects, Education, and Contact. It ships as an nginx Docker container (`Dockerfile` + `nginx.conf`) and deploys via the Render blueprint in `render.yaml`.

Drop numbered frame sequences into [`frames/`](frames/README.txt) to replace the procedural background with a scroll-driven video sequence.
