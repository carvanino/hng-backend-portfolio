import './App.css'

const PROJECTS = [
  {
    id: 'insighta',
    name: 'Insighta',
    stage: 'Stage 2',
    description:
      'A REST API for querying and enriching people profiles with natural language search. Built as part of a multi-stage gateway architecture where each stage adds capability on top of the last.',
    stack: ['Node.js', 'Express', 'PostgreSQL', 'NLP'],
    contribution: [
      'Designed and implemented 6 REST endpoints: paginated profile listing with filters, NLP-driven natural language search, profile creation via Genderize / Agify / Nationalize APIs, single profile retrieval, deletion, and gender classification',
      'Built a rule-based NLP parser (nlp.js) with no external AI dependencies — extracts gender, age range, and nationality from freeform queries like "young females from Nigeria"',
      'Wrote the database module (db.js) with connection pooling and automatic schema initialisation on startup',
      'Built a batch seeder (seed.js) that loads 2,026 profiles from JSON with deduplication',
      'Integrated the stage into the central gateway via http-proxy-middleware with path rewriting',
    ],
  },
  {
    id: 'clinsight',
    name: 'Clinical Sight',
    stage: 'Stages 3 – 6',
    description:
      'An AI-powered clinical lab result interpretation platform. Users upload lab result images; the system runs OCR then an LLM interpretation pipeline and returns structured findings through a real-time notification stream.',
    stack: ['Python', 'FastAPI', 'PostgreSQL', 'Celery', 'Redis', 'SQLAlchemy', 'Alembic', 'Nginx', 'GitHub Actions'],
    contribution: [
      'Extracted 14 database entities from the PRD, produced the ERD, and broke the work into 21 tasks across 3 milestones for the team',
      'Refactored the entire codebase to a layered architecture — introduced app/repositories/ with four repository classes, rewrote deps.py for FastAPI dependency injection, moved all SQLAlchemy out of services, and corrected domain exceptions leaking into the HTTP layer',
      'Built the fault-tolerant Celery pipeline: max retries with exponential backoff, Redis idempotency lock, dead-letter queue, dual LLM provider (OpenAI + Gemini) with a per-provider circuit breaker, and a full pipeline audit log tracking provider, attempt number, and duration per event',
      'Implemented SSE notifications using Redis pub/sub: EventBus singleton, poll-based subscribe generator, and a StreamingResponse endpoint that delivers interpretation_ready / interpretation_failed events to the browser',
      'Built the WebSocket chat endpoint — JWT auth on init, background consumer task, message queue, streaming AI response, and full cleanup on disconnect',
      'Implemented guest session management: device fingerprinting, upload and chat usage limits, session migration on signup',
      'Set up the production server: Nginx reverse proxy, systemd services for staging and production, Alembic migrations, GitHub Actions CI (Ruff + Pytest) and CD (SSH deploy on merge)',
    ],
  },
  {
    id: 'eventstore',
    name: 'Append-Only Event Store',
    stage: 'Stage 7',
    description:
      'A crash-safe key-value store built on an append-only log file with an in-memory byte-offset index. No database — the log file is the database.',
    stack: ['Python', 'FastAPI'],
    contribution: [
      'Implemented the append-only log: each event encoded as UTF-8 JSON + newline, written in binary append mode with fsync for durability',
      'Built the in-memory index { id → { offset, length } } using exact byte positions so reads seek directly to the right slice of the file — no scanning',
      'Wrote the crash recovery path: on startup, stream the log line by line tracking the running byte offset, rebuild the index, and log the recovered count',
      'Exposed three HTTP endpoints: POST /events (stamp, append, return 201), GET /events/:id (index lookup + seek), GET /stats (total + bytes)',
      'Handled the UTF-8 byte vs character length distinction correctly so unicode content never corrupts the offset',
    ],
  },
]

const SKILLS = [
  {
    category: 'API Design',
    detail: 'REST API design with FastAPI and Express — request validation, error handling, dependency injection, versioning',
    evidence: 'Clinsight, Insighta',
  },
  {
    category: 'Authentication',
    detail: 'JWT access/refresh tokens, Google OAuth, token blocklisting, guest session fingerprinting',
    evidence: 'Clinsight',
  },
  {
    category: 'Databases',
    detail: 'PostgreSQL with async SQLAlchemy, schema design via ERD, Alembic migrations, NullPool for test isolation',
    evidence: 'Clinsight, Insighta',
  },
  {
    category: 'Background Jobs',
    detail: 'Celery task queues with exponential backoff retries, dead-letter queue, Redis idempotency lock, circuit breaker across LLM providers',
    evidence: 'Clinsight',
  },
  {
    category: 'Real-time Delivery',
    detail: 'Server-Sent Events via Redis pub/sub EventBus, WebSocket chat with consumer task and streaming AI responses',
    evidence: 'Clinsight',
  },
  {
    category: 'Architecture',
    detail: 'Layered architecture — repositories layer, service layer, HTTP layer with clear separation of concerns and domain exceptions',
    evidence: 'Clinsight',
  },
  {
    category: 'Testing',
    detail: 'pytest with asyncio, session-scoped fixtures, NullPool test engine, mocked repositories and services',
    evidence: 'Clinsight',
  },
  {
    category: 'Deployment',
    detail: 'Ubuntu server, Nginx reverse proxy, systemd services, GitHub Actions CI/CD with SSH deploy on merge',
    evidence: 'Clinsight',
  },
  {
    category: 'Storage Systems',
    detail: 'Append-only log with byte-offset indexing, crash recovery by replaying the log, fsync for durability',
    evidence: 'Event Store',
  },
]

const CHALLENGE = {
  problem:
    'SSE connections to the /notifications/stream endpoint were closing immediately after delivering one notification. Users would connect, receive their first result, and get disconnected — forcing a full page reload to reconnect.',
  diagnosis:
    "Traced the bug to Starlette's request.is_disconnected() method. It uses anyio.move_on_after(0) — a zero-second deadline — to do a non-blocking check of the ASGI receive queue. The initial GET request puts one http.request message in the queue. Once that message is consumed, every subsequent is_disconnected() call finds an empty queue, the zero-second timeout fires, and Starlette sets _is_disconnected = True — not because the client left, but because the queue was empty.",
  fix: 'Removed is_disconnected() from the live subscribe loop entirely. In asyncio, when a client actually disconnects, uvicorn cancels the ASGI task which raises CancelledError through the awaiting coroutine. Added raise to the except asyncio.CancelledError block in the EventBus generator so cancellation propagates correctly. The connection now stays alive until the client actually closes it.',
}

function Tag({ label }) {
  return <span className="tag">{label}</span>
}

function ProjectCard({ project, featured }) {
  return (
    <div className={`project-card ${featured ? 'featured' : ''}`}>
      <div className="project-header">
        <div>
          <span className="stage-badge">{project.stage}</span>
          <h3 className="project-name">{project.name}</h3>
        </div>
      </div>
      <p className="project-description">{project.description}</p>
      <div className="stack-row">
        {project.stack.map((s) => (
          <Tag key={s} label={s} />
        ))}
      </div>
      <div className="contribution-section">
        <p className="contribution-label">What I built</p>
        <ul className="contribution-list">
          {project.contribution.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SkillRow({ skill }) {
  return (
    <div className="skill-row">
      <div className="skill-left">
        <span className="skill-category">{skill.category}</span>
        <span className="skill-evidence">{skill.evidence}</span>
      </div>
      <p className="skill-detail">{skill.detail}</p>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      {/* NAV */}
      <nav className="nav">
        <span className="nav-name">Tofunmi Akinola</span>
        <div className="nav-links">
          <a href="#projects">Projects</a>
          <a href="#skills">Skills</a>
          <a href="#deep-dive">Deep Dive</a>
          <a href="#reflection">Reflection</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <main className="main">
        {/* HERO */}
        <section className="hero" id="profile">
          <div className="hero-eyebrow">
            <span className="mono">Backend Engineer</span>
            <span className="dot" />
            <span className="mono">Lagos, Nigeria</span>
          </div>
          <h1 className="hero-name">Oluwatofunmi<br />Akinola</h1>
          <p className="hero-bio">
            Backend engineer focused on building reliable systems — APIs that hold up under
            pressure, pipelines that recover from failure, and architectures that are
            straightforward to extend. I worked across the full backend stack during the HNG
            internship: from database design and service architecture through async task
            pipelines, real-time delivery, and production deployment.
          </p>
          <div className="hero-contact">
            <a href="mailto:akinolatofunmi.tech@gmail.com" className="contact-link">
              akinolatofunmi.tech@gmail.com
            </a>
            <a href="https://github.com/carvanino" className="contact-link" target="_blank" rel="noreferrer">
              github.com/carvanino
            </a>
          </div>
        </section>

        <hr className="divider" />

        {/* PROJECTS */}
        <section id="projects" className="section">
          <h2 className="section-title">HNG Projects</h2>
          <p className="section-subtitle">
            Three projects across six stages — from a Node.js API with a custom NLP parser
            through a full production FastAPI system, to a crash-safe log-based event store.
          </p>
          <div className="projects-grid">
            {PROJECTS.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* SKILLS */}
        <section id="skills" className="section">
          <h2 className="section-title">Backend Skills</h2>
          <p className="section-subtitle">
            Every skill below is backed by a specific project. If it is not in a project, it is not in this list.
          </p>
          <div className="skills-list">
            {SKILLS.map((s) => (
              <SkillRow key={s.category} skill={s} />
            ))}
          </div>
        </section>

        <hr className="divider" />

        {/* FEATURED — CLINSIGHT DEEP DIVE */}
        <section id="deep-dive" className="section">
          <h2 className="section-title">Featured Project</h2>
          <p className="section-subtitle">Clinical Sight — in depth.</p>

          <div className="deep-dive">
            {/* Problem */}
            <div className="dd-block">
              <h3 className="dd-heading">The Problem</h3>
              <p>
                Clinicians needed a way to upload a lab result image and get a structured AI
                interpretation back — without waiting at a loading screen. The result could take
                20–60 seconds to generate. The system needed to process the file asynchronously,
                survive LLM provider failures, and push the result to the browser the moment it
                was ready.
              </p>
            </div>

            {/* Architecture */}
            <div className="dd-block">
              <h3 className="dd-heading">Architecture & Request Flow</h3>
              <div className="flow-diagram">
                <div className="flow-step">
                  <span className="flow-num">01</span>
                  <div>
                    <p className="flow-title">Upload</p>
                    <p className="flow-desc">Client POSTs the lab image. File is written to local storage, a LabResult record is created, and a Celery task is dispatched. The HTTP response returns immediately with the case ID — no waiting.</p>
                  </div>
                </div>
                <div className="flow-arrow">↓</div>
                <div className="flow-step">
                  <span className="flow-num">02</span>
                  <div>
                    <p className="flow-title">Celery Pipeline</p>
                    <p className="flow-desc">Worker acquires a Redis idempotency lock for the lab result ID, runs OCR (OpenAI Vision → Gemini fallback), then runs LLM interpretation. Each stage writes an audit log row with provider, attempt, and duration. On failure, the task retries with exponential backoff up to 3 times, then moves to a dead-letter queue.</p>
                  </div>
                </div>
                <div className="flow-arrow">↓</div>
                <div className="flow-step">
                  <span className="flow-num">03</span>
                  <div>
                    <p className="flow-title">Event Publication</p>
                    <p className="flow-desc">On success or failure, the pipeline publishes an event to the user's Redis pub/sub channel (events:{'{'}user_id{'}'}) with the case ID and notification ID.</p>
                  </div>
                </div>
                <div className="flow-arrow">↓</div>
                <div className="flow-step">
                  <span className="flow-num">04</span>
                  <div>
                    <p className="flow-title">SSE Delivery</p>
                    <p className="flow-desc">The browser holds an open SSE connection. The EventBus generator polls Redis every 1 second. When the event arrives it is delivered as interpretation_ready or interpretation_failed. The client then fetches the full result.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key modules */}
            <div className="dd-block">
              <h3 className="dd-heading">Key Modules</h3>
              <div className="modules-grid">
                <div className="module">
                  <p className="module-name">app/tasks/pipeline.py</p>
                  <p className="module-desc">Celery task with idempotency lock, dual-provider OCR and AI, dead-letter queue, and audit logging on every event transition</p>
                </div>
                <div className="module">
                  <p className="module-name">app/services/events.py</p>
                  <p className="module-desc">EventBus singleton managing Redis pub/sub. subscribe() generator polls with asyncio.sleep(1) and yields None every 30s as a keepalive signal</p>
                </div>
                <div className="module">
                  <p className="module-name">app/api/v1/endpoints/notification.py</p>
                  <p className="module-desc">SSE StreamingResponse endpoint. Replays missed notifications on reconnect via Last-Event-ID, then enters the live subscribe loop</p>
                </div>
                <div className="module">
                  <p className="module-name">app/repositories/</p>
                  <p className="module-desc">Repository layer encapsulating all SQLAlchemy queries. Services receive repository instances via FastAPI dependency injection — no raw sessions in business logic</p>
                </div>
                <div className="module">
                  <p className="module-name">app/api/v1/endpoints/ws_chat.py</p>
                  <p className="module-desc">WebSocket endpoint with JWT auth on init, asyncio Queue for message ordering, background consumer task, and streaming AI token delivery</p>
                </div>
                <div className="module">
                  <p className="module-name">app/services/llm.py</p>
                  <p className="module-desc">Dual-provider LLM client (OpenAI + Gemini) with a per-provider Redis circuit breaker. PDF uploads bypass OpenAI (returns 400 on vision) and route directly to Gemini</p>
                </div>
              </div>
            </div>

            {/* Challenge */}
            <div className="dd-block challenge-block">
              <h3 className="dd-heading">Technical Challenge</h3>
              <div className="challenge-label">The bug</div>
              <p className="challenge-text">{CHALLENGE.problem}</p>
              <div className="challenge-label" style={{ marginTop: '1.5rem' }}>The diagnosis</div>
              <p className="challenge-text">{CHALLENGE.diagnosis}</p>
              <div className="challenge-label" style={{ marginTop: '1.5rem' }}>The fix</div>
              <p className="challenge-text">{CHALLENGE.fix}</p>
              <div className="code-block">
                <span className="code-comment"># Before — is_disconnected() returns True on empty queue</span>{'\n'}
                <span className="code-keyword">while</span> <span className="code-name">True</span>:{'\n'}
                {'    '}<span className="code-keyword">if await</span> request.is_disconnected(): <span className="code-keyword">return</span>{'\n'}
                {'    '}event = <span className="code-keyword">await</span> sub_iter.__anext__{'\n\n'}
                <span className="code-comment"># After — let CancelledError from uvicorn close the connection naturally</span>{'\n'}
                <span className="code-keyword">while</span> <span className="code-name">True</span>:{'\n'}
                {'    '}event = <span className="code-keyword">await</span> sub_iter.__anext__()
              </div>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* REFLECTION */}
        <section id="reflection" className="section">
          <h2 className="section-title">Learning Reflection</h2>
          <div className="reflection-grid">
            <div className="reflection-block">
              <h3 className="reflection-heading">Architecture thinking</h3>
              <p>
                Before HNG, I understood what a repository pattern was in theory. After spending
                weeks refactoring Clinsight's codebase — moving SQLAlchemy calls out of services,
                fixing HTTP exceptions leaking into business logic — I understand why it matters
                in practice. The difference shows up when you need to swap a dependency, write a
                test, or trace a bug. Clean layers make all three significantly faster.
              </p>
            </div>
            <div className="reflection-block">
              <h3 className="reflection-heading">Async systems</h3>
              <p>
                Building the SSE stream and the Celery pipeline in the same week forced me to
                understand what "async" actually means at each layer — the event loop, coroutines,
                task cancellation, and how asyncio.CancelledError propagates. The SSE bug was a
                good example: fixing it required understanding Starlette's ASGI receive queue
                behaviour, not just the application code.
              </p>
            </div>
            <div className="reflection-block">
              <h3 className="reflection-heading">Storage fundamentals</h3>
              <p>
                The append-only event store was the most conceptually instructive project. Working
                with byte offsets and binary file I/O changed how I think about storage. Kafka,
                PostgreSQL's WAL, and Loki are all built on the same idea — write to the end,
                never overwrite, replay to recover. Having built the smallest possible version of
                it makes the design decisions in those systems obvious in a way that reading about
                them never did.
              </p>
            </div>
            <div className="reflection-block">
              <h3 className="reflection-heading">Failure handling</h3>
              <p>
                The Celery pipeline had to handle LLM provider failures, network timeouts,
                duplicate task submissions, and partial failures mid-pipeline. Getting this right
                — idempotency lock, circuit breaker, dead-letter queue, audit log — taught me
                that reliability is not a feature you add at the end. It's a set of decisions
                baked into how you structure the work from the beginning.
              </p>
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* CONTACT */}
        <section id="contact" className="section contact-section">
          <h2 className="section-title">Contact</h2>
          <p className="contact-bio">
            Open to backend and DevOps roles. Reach out directly.
          </p>
          <div className="contact-links">
            <a href="mailto:akinolatofunmi.tech@gmail.com" className="contact-card">
              <span className="contact-card-label">Email</span>
              <span className="contact-card-value">akinolatofunmi.tech@gmail.com</span>
            </a>
            <a href="https://github.com/carvanino" className="contact-card" target="_blank" rel="noreferrer">
              <span className="contact-card-label">GitHub</span>
              <span className="contact-card-value">github.com/carvanino</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span className="mono">Oluwatofunmi Akinola</span>
        <span className="footer-sep">·</span>
        <span className="mono text-muted">Backend Engineer · HNG Internship 2025</span>
      </footer>
    </div>
  )
}
