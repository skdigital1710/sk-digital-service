import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Copy, ExternalLink, FileText, Flame, Globe2, GraduationCap,
  Grid3x3, IndianRupee, Instagram, Landmark, Link2, MapPin, Menu, MessageCircle,
  Moon, Search, Send, Share2, ShieldCheck, Sparkles, Star, Sun, TrainFront, Users,
  WalletCards, X, Youtube, Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./App.css";
import "./AppDetailExact.css";
import SocialFollowGate, { useSocialFollowGate } from "./SocialFollowGate";

const WA_FALLBACK =
  "https://whatsapp.com/channel/0029Vb6H3cS1SWsyxdVo471w";

const IG_FALLBACK =
  "https://instagram.com/skdigitalservice.dhule";

const YT_FALLBACK =
  "https://youtube.com/@skdigitalservice-t9u";

const EBOOK_URL =
  "https://qsaim.gumroad.com/l/ai-career-system";

const JOB_CATS = [
  ["Latest Jobs", "latest", Flame, "#ff7a00"],
  ["SSC", "ssc", GraduationCap, "#0b63d6"],
  ["Railway", "railway", TrainFront, "#0b63d6"],
  ["Banking", "banking", Landmark, "#0b3f7a"],
  ["Defence", "defence", ShieldCheck, "#e5384a"],
  ["Police", "police", Star, "#1c4fa8"],
  ["Teaching", "teaching", GraduationCap, "#0b8a57"],
  ["Other", "other", Grid3x3, "#5b6b82"]
];

function safeUrl(v) {
  try {
    const u = new URL(String(v || "").trim());

    return ["http:", "https:"].includes(u.protocol)
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}

function dateText(v) {
  if (!v) return "—";

  const d = new Date(`${v}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
}

function daysLeft(v) {
  if (!v) return null;

  const end = new Date(`${v}T23:59:59`);

  return Math.ceil(
    (end - Date.now()) / 86400000
  );
}

function deadline(v) {
  const d = daysLeft(v);

  if (d === null) {
    return {
      text: "Check Notification",
      tone: "neutral"
    };
  }

  if (d < 0) {
    return {
      text: "Application Closed",
      tone: "closed"
    };
  }

  if (d <= 3) {
    return {
      text: `Only ${d} Day${d === 1 ? "" : "s"} Left`,
      tone: "urgent"
    };
  }

  if (d <= 10) {
    return {
      text: `Only ${d} Days Left`,
      tone: "soon"
    };
  }

  return {
    text: `${d} Days Left`,
    tone: "open"
  };
}

function jobCat(r) {
  const s = String(
    r?.job_category ||
    r?.category ||
    "other"
  ).toLowerCase();

  for (const [name, slug] of JOB_CATS) {
    if (
      s.includes(slug) ||
      s.includes(name.toLowerCase())
    ) {
      return slug;
    }
  }

  return "other";
}

function isGov(r) {
  return Boolean(r?.is_published) &&
    (r?.job_category || r?.category);
}

function publishedSort(a, b) {
  return new Date(
    b.published_at ||
    b.created_at ||
    0
  ) - new Date(
    a.published_at ||
    a.created_at ||
    0
  );
}

function Logo({ className = "" }) {
  return (
    <img
      className={`sk-logo ${className}`}
      src="/sk-logo.png"
      alt="SK DIGITAL SERVICE"
    />
  );
}

function Thumb({ r, large = false }) {
  if (r?.organization_logo_url) {
    return (
      <div
        className={`org-logo-thumb ${
          large ? "large" : ""
        }`}
      >
        <img
          src={r.organization_logo_url}
          alt={
            r?.organization ||
            "Organization logo"
          }
          loading="lazy"
        />
      </div>
    );
  }

  if (r?.thumbnail_url) {
    return (
      <img
        className={`thumb-image ${
          large ? "large" : ""
        }`}
        src={r.thumbnail_url}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`thumb-fallback ${
        large ? "large" : ""
      }`}
    >
      <div className="tf-glow" />
      <b>SK</b>
      <span>DIGITAL SERVICE</span>

      <strong>
        {r?.organization ||
          "Government Recruitment 2026"}
      </strong>

      <em>
        {r?.title ||
          "Latest Government Job"}
      </em>

      <small>
        {r?.total_vacancies || "—"} Vacancies •
        Last Date {dateText(r?.last_date)}
      </small>
    </div>
  );
}

function CountdownCard({ job, wa }) {
  const d = deadline(job?.last_date);

  return (
    <div className="countdown-card">

      <div className="count-head">
        <span>
          <Clock3 size={17} />
          Last Date Coming Soon
        </span>

        <span
          className={`live-dot ${d.tone}`}
        />
      </div>

      <h3>
        {job?.title ||
          "Latest Government Job"}
      </h3>

      <p>
        {job?.organization ||
          "Government Recruitment 2026"}
      </p>

      <div className="count-boxes">
        {[
          "Days",
          "Hours",
          "Minutes",
          "Seconds"
        ].map((x, i) => (
          <div key={x}>
            <b>
              {i === 0
                ? Math.max(
                    0,
                    daysLeft(job?.last_date) || 0
                  )
                : "—"}
            </b>

            <small>{x}</small>
          </div>
        ))}
      </div>

      <div className="miss-strip">
        <Bell size={15} />

        {d.tone === "urgent"
          ? "Don't Miss!"
          : "Apply Before Last Date"}
      </div>

      <a
        className="wa-hero"
        href={wa}
        target="_blank"
        rel="noreferrer"
      >
        <MessageCircle size={22} />

        <span>
          <b>Join WhatsApp Channel</b>
          <small>
            Get Instant Job Updates &
            Notifications
          </small>
        </span>

        <ArrowRight size={19} />
      </a>
    </div>
  );
}

function Promotion({ p, compact = false }) {
  const u = safeUrl(p.button_url);

  return (
    <div
      className={`promotion-card ${
        compact ? "compact" : ""
      }`}
    >
      {p.image_url ? (
        <img
          src={p.image_url}
          alt=""
          loading="lazy"
        />
      ) : (
        <div className="promo-placeholder">
          <Sparkles size={22} />
        </div>
      )}

      <div className="promo-overlay">
        <small>
          {p.subtitle ||
            "SK DIGITAL SERVICE"}
        </small>

        <h3>{p.title}</h3>

        {p.description && (
          <p>{p.description}</p>
        )}

        {u && (
          <a
            href={u}
            target="_blank"
            rel="noreferrer"
          >
            {p.button_text ||
              "View Now"}

            <ArrowRight size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   FEATURED PRODUCTS
   ========================================================= */

function ProductsSection() {
  const cardStyle = {
    background: "rgba(255,255,255,0.96)",
    color: "#12213a",
    border: "1px solid rgba(18,99,214,0.16)",
    borderRadius: "24px",
    padding: "clamp(20px, 3vw, 32px)",
    boxShadow: "0 18px 48px rgba(12, 55, 115, 0.12)",
    display: "flex",
    flexDirection: "column",
    minWidth: 0
  };

  const buttonStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "14px",
    padding: "14px 18px",
    background: "linear-gradient(135deg, #075fe4, #0a3b91)",
    color: "#fff",
    fontWeight: 800,
    textDecoration: "none",
    border: 0,
    cursor: "pointer"
  };

  return (
    <section
      id="products"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: "clamp(34px, 6vw, 72px) 20px",
        margin: "28px auto",
        background: "linear-gradient(135deg, #edf5ff 0%, #ffffff 48%, #fff3e7 100%)",
        borderTop: "1px solid #dbeafe",
        borderBottom: "1px solid #dbeafe"
      }}
    >
      <div style={{ maxWidth: "1180px", margin: "0 auto", position: "relative" }}>
        <div style={{ textAlign: "center", margin: "0 auto 30px", maxWidth: "720px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            borderRadius: "999px", padding: "8px 14px",
            color: "#0754bd", background: "#dcecff",
            fontSize: "12px", fontWeight: 900, letterSpacing: "1.4px"
          }}>
            <Sparkles size={15} /> SK DIGITAL SERVICE STORE
          </span>
          <h2 style={{
            margin: "16px 0 10px", fontSize: "clamp(30px, 5vw, 48px)",
            lineHeight: 1.08, letterSpacing: "-1.4px", color: "#10213e"
          }}>
            Explore Our <span style={{ color: "#075fe4" }}>Products</span>
          </h2>
          <p style={{ margin: 0, color: "#52627a", fontSize: "16px", lineHeight: 1.7 }}>
            Practical digital guides and learning resources from SK DIGITAL SERVICE.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: "22px",
          alignItems: "stretch"
        }}>
          <article style={{
            ...cardStyle,
            border: "2px solid #82b7ff",
            background: "linear-gradient(145deg, #ffffff 0%, #f2f8ff 100%)"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              gap: "12px", marginBottom: "22px"
            }}>
              <span style={{
                background: "#dcecff", color: "#0754bd", padding: "7px 11px",
                borderRadius: "999px", fontSize: "11px", fontWeight: 900, letterSpacing: ".8px"
              }}>FEATURED EBOOK</span>
              <span style={{ color: "#f59e0b", fontSize: "13px", fontWeight: 900 }}>DIGITAL GUIDE</span>
            </div>

            <div style={{
              minHeight: "180px", borderRadius: "18px", padding: "24px",
              color: "#fff", background: "radial-gradient(circle at top right, #347df4, transparent 45%), linear-gradient(135deg, #071b45, #075fe4)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.18)"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "1.8px" }}>SK DIGITAL SERVICE</div>
              <div>
                <div style={{ fontSize: "clamp(25px, 4vw, 34px)", fontWeight: 950, lineHeight: 1.05 }}>AI CAREER<br />SYSTEM</div>
                <div style={{ marginTop: "10px", fontSize: "12px", color: "#dbeafe" }}>JOB SEARCH • RESUME • LINKEDIN • INTERVIEWS</div>
              </div>
            </div>

            <h3 style={{ margin: "22px 0 8px", fontSize: "23px", lineHeight: 1.2 }}>
              AI CAREER SYSTEM
            </h3>
            <p style={{ margin: "0 0 18px", color: "#52627a", lineHeight: 1.65 }}>
              A practical guide to using AI for job search, resumes, LinkedIn, interviews and career growth.
            </p>
            <div style={{ marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "16px" }}>
                <strong style={{ fontSize: "30px", color: "#0754bd" }}>$5</strong>
                <span style={{ color: "#66758b", fontSize: "13px" }}>One-time payment</span>
              </div>
              <a href={EBOOK_URL} target="_blank" rel="noreferrer" style={buttonStyle}>
                Get the eBook <ArrowRight size={18} />
              </a>
            </div>
          </article>

          <article style={{
            ...cardStyle,
            border: "2px solid #ffd19a",
            background: "linear-gradient(145deg, #ffffff 0%, #fff8ef 100%)"
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              gap: "12px", marginBottom: "22px"
            }}>
              <span style={{
                background: "#fff0d9", color: "#a65300", padding: "7px 11px",
                borderRadius: "999px", fontSize: "11px", fontWeight: 900, letterSpacing: ".8px"
              }}>NEW LEARNING PRODUCT</span>
              <span style={{ color: "#e8790c", fontSize: "13px", fontWeight: 900 }}>AGES 3–5</span>
            </div>

            <div style={{
              minHeight: "180px", borderRadius: "18px", padding: "24px",
              color: "#512d0a", background: "radial-gradient(circle at top right, #ffe49a, transparent 44%), linear-gradient(135deg, #fff0c7, #ffcf83)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,.7)"
            }}>
              <div style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "1.4px" }}>SK DIGITAL SERVICE • KIDS</div>
              <div>
                <div style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 950, lineHeight: 1.08 }}>ACTIVITY<br />WORKBOOK</div>
                <div style={{ marginTop: "10px", fontSize: "12px", fontWeight: 800 }}>LETTERS • NUMBERS • SHAPES</div>
              </div>
            </div>

            <h3 style={{ margin: "22px 0 8px", fontSize: "23px", lineHeight: 1.2 }}>
              Kids Activity & Tracing Book
            </h3>
            <p style={{ margin: "0 0 18px", color: "#52627a", lineHeight: 1.65 }}>
              Printable early-learning practice for little learners, designed to make learning letters, numbers and shapes fun.
            </p>
            <div style={{ marginTop: "auto" }}>
              <div style={{ marginBottom: "16px", color: "#a65300", fontSize: "13px", fontWeight: 800 }}>
                Printable digital PDF
              </div>
              <a
                href="https://qsaim.gumroad.com/l/kids-activity-book"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...buttonStyle,
                  background: "linear-gradient(135deg, #f59e0b, #c65d08)"
                }}
              >
                Buy Now <ArrowRight size={18} />
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

/* =========================================================
   HEADER
   ========================================================= */

function Header({
  search,
  setSearch,
  openMenu = false,
  onMenu,
  dark,
  onToggleTheme
}) {
  return (
    <header className="site-header">

      <div className="shell header-inner">

        <a
          className="brand"
          href="/"
          onClick={e => {
            if (location.pathname !== "/") {
              e.preventDefault();

              history.pushState(
                {},
                "",
                "/"
              );

              window.dispatchEvent(
                new PopStateEvent("popstate")
              );
            }
          }}
        >
          <Logo />

          <span>
            SK DIGITAL SERVICE
            <small>
              Government & Online Services
            </small>
          </span>
        </a>

        <nav
          className={
            openMenu
              ? "nav open"
              : "nav"
          }
        >
          <a
            className="active"
            href="/"
          >
            ⌂ <span>Home</span>
          </a>

          <a href="#latest">
            🔥 <span>Latest Jobs</span>
          </a>

          <a href="#categories">
            ▦ <span>All Categories</span>
          </a>

          <a href="#products">
            ✦ <span>Products</span>
          </a>

          <a href="#resources">
            ▣ <span>Resources</span>
          </a>

          <a href="#about">
            ● <span>About</span>
          </a>
        </nav>

        <div className="header-tools">

          <div className="head-search">
            <Search size={18} />

            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="Search jobs, schemes, services..."
            />
          </div>

          <button
            className="theme-toggle"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            {dark ? (
              <Sun size={17} />
            ) : (
              <Moon size={17} />
            )}
          </button>

          <a
            className="header-cta"
            href="#latest"
            aria-label="Latest jobs"
          >
            <ArrowRight size={17} />
          </a>

          <button
            className="mobile-menu"
            onClick={onMenu}
          >
            <Menu size={21} />
          </button>

        </div>

      </div>
    </header>
  );
}

/* =========================================================
   JOB CARD
   ========================================================= */

function JobCard({ r, onOpen }) {
  const d = deadline(r.last_date);
  const { requestAccess } =
    useSocialFollowGate();

  return (
    <button
      className="job-list-card"
      onClick={() =>
        requestAccess(() =>
          onOpen(r)
        )
      }
    >

      <div className="job-logo-wrap">
        <Thumb r={r} />
      </div>

      <div className="job-main-copy">

        <div className="job-title-row">

          <h3>
            {r.title ||
              "Government Job Recruitment"}
          </h3>

          <span>
            {r.job_category ||
              r.category ||
              "Government Job"}
          </span>

        </div>

        <div className="job-meta">

          <span>
            ◆ Vacancies:
            {" "}
            <b>
              {r.total_vacancies || "—"}
            </b>
          </span>

          <i />

          <span>
            Qualification:
            {" "}
            <b>
              {r.qualification ||
                "See Notification"}
            </b>
          </span>

        </div>

        <div className="job-meta">

          <span>
            ▣ Start:
            {" "}
            <b>
              {dateText(
                r.application_start_date
              )}
            </b>
          </span>

          <i />

          <span>
            ◷ Last Date:
            {" "}
            <b>
              {dateText(r.last_date)}
            </b>
          </span>

        </div>

      </div>

      <div className="job-card-action">

        <span
          className={`days-pill ${d.tone}`}
        >
          <Clock3 size={13} />
          {d.text}
        </span>

        <span className="apply-mini">
          Apply Now
          <ArrowRight size={15} />
        </span>

      </div>

    </button>
  );
}

/* =========================================================
   JOB DETAIL
   ========================================================= */

function JobDetail({
  r,
  resources,
  onBack,
  wa
}) {
  const d = deadline(r.last_date);

  const apply = safeUrl(r.apply_url);
  const note = safeUrl(r.notification_url);
  const web = safeUrl(
    r.official_website_url
  );

  const related = resources
    .filter(
      x =>
        x.id !== r.id &&
        x.is_published
    )
    .sort(publishedSort)
    .slice(0, 3);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title:
            r.title ||
            "SK DIGITAL SERVICE",
          text:
            r.short_description ||
            r.title,
          url: location.href
        });
      } else {
        await navigator.clipboard.writeText(
          location.href
        );

        alert("Job link copied.");
      }
    } catch {}
  };

  const back = () => onBack();

  const orgLogo = safeUrl(
    r.organization_logo_url
  );

  return (
    <div className="detail-page detail-reference-page">

      <header className="detail-header">

        <div className="shell detail-head-inner">

          <button
            className="back-btn"
            onClick={back}
          >
            <ChevronLeft size={17} />
            Resource Hub
          </button>

          <Logo />

          <button
            className="icon-btn"
            onClick={share}
          >
            <Share2 size={18} />
          </button>

        </div>

      </header>

      <main className="shell detail-main">

        <div className="breadcrumbs">

          <button onClick={back}>
            Home
          </button>

          <ChevronRight size={13} />

          <span>
            {r.job_category ||
              r.category ||
              "Government Jobs"}
          </span>

          <ChevronRight size={13} />

          <b>{r.title}</b>

        </div>

        <section className="ref-hero">

          <div className="ref-org-logo">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={
                  r.organization ||
                  "Organization logo"
                }
              />
            ) : null}
          </div>

          <div className="ref-hero-copy">

            <span className="ref-badge">
              GOVERNMENT JOB
            </span>

            <h1>
              {r.title ||
                "Government Recruitment 2026"}
            </h1>

            <p className="ref-org">
              {r.organization ||
                "Government Department"}
            </p>

            {r.post_name && (
              <p className="ref-post">
                {r.post_name}
              </p>
            )}

            <div className="ref-meta">

              <span>
                <CalendarDays />
                Notification Released:
                {" "}
                {dateText(
                  r.application_start_date
                )}
              </span>

              <i />

              <span>
                Last Date:
                {" "}
                {dateText(r.last_date)}
              </span>

            </div>

            <div className="ref-pills">

              <span>
                <ShieldCheck />
                Verified Notification
              </span>

              {r.is_featured && (
                <span>
                  <Star />
                  Featured Job
                </span>
              )}

              <span>
                <Landmark />
                {r.job_category ||
                  "Government Job"}
              </span>

            </div>

          </div>

          <div className="ref-hero-art">

            {r.thumbnail_url ? (
              <img
                src={r.thumbnail_url}
                alt=""
              />
            ) : (
              <div className="ref-art-placeholder">
                <Landmark size={64} />

                <b>
                  {r.organization ||
                    "Government Recruitment"}
                </b>

                <span>
                  Official Job Update
                </span>
              </div>
            )}

            <div className="ref-art-copy">
              <span>
                Build Your Career
              </span>

              <b>
                with{" "}
                {r.job_category ||
                  "Government Jobs"}
              </b>
            </div>

            <div className="ref-hero-summary">

              <div>
                <Users />

                <small>
                  Total Vacancies
                </small>

                <b>
                  {r.total_vacancies || "—"}
                </b>
              </div>

              <div>
                <BriefcaseBusiness />

                <small>Posts</small>

                <b>
                  {r.post_name ||
                    "Multiple Posts"}
                </b>
              </div>

              <div>
                <MapPin />

                <small>
                  Job Location
                </small>

                <b>
                  {r.job_location ||
                    "Across India"}
                </b>
              </div>

            </div>

          </div>

        </section>

        <section className="ref-stat-grid">

          {[
            [
              "Total Vacancies",
              r.total_vacancies,
              Users
            ],
            [
              "Qualification",
              r.qualification,
              GraduationCap
            ],
            [
              "Age Limit",
              r.age_limit,
              CalendarDays
            ],
            [
              "Last Date",
              dateText(r.last_date),
              Clock3
            ],
            [
              "Application Fee",
              r.application_fee,
              IndianRupee
            ]
          ].map(
            ([a, b, I], i) => (
              <div
                className={`ref-stat s${i}`}
                key={a}
              >
                <span className="ref-stat-icon">
                  <I />
                </span>

                <small>{a}</small>

                <b>
                  {b || "—"}
                </b>

                {i === 1 && (
                  <em>
                    (Post-specific)
                  </em>
                )}

                {i === 2 && (
                  <em>
                    (Post-wise)
                  </em>
                )}

                {i === 3 && (
                  <em>
                    (Online Application)
                  </em>
                )}

                {i === 4 && (
                  <em>
                    (Category Wise)
                  </em>
                )}

              </div>
            )
          )}

        </section>

        <div className="ref-detail-layout">

          <div>

            <InfoBlock
              title="Job Overview"
              icon={BriefcaseBusiness}
              cls="blue"
            >
              <div className="ref-overview">

                {[
                  [
                    "Organization / Department",
                    r.organization
                  ],
                  [
                    "Post Name",
                    r.post_name
                  ],
                  [
                    "Total Vacancies",
                    r.total_vacancies
                  ],
                  [
                    "Qualification",
                    r.qualification
                  ],
                  [
                    "Age Limit",
                    r.age_limit
                  ],
                  [
                    "Application Fee",
                    r.application_fee
                  ],
                  [
                    "Job Location",
                    r.job_location
                  ],
                  [
                    "Application Start Date",
                    dateText(
                      r.application_start_date
                    )
                  ],
                  [
                    "Last Date",
                    dateText(r.last_date)
                  ]
                ].map(
                  ([a, b]) => (
                    <div
                      className="ref-overview-row"
                      key={a}
                    >
                      <span>{a}</span>

                      <b>
                        {b || "—"}
                      </b>
                    </div>
                  )
                )}

              </div>
            </InfoBlock>

            <InfoBlock
              title="Eligibility Criteria"
              icon={GraduationCap}
              cls="cyan"
            >
              <div className="ref-elig-grid">

                {[
                  [
                    "Educational Qualification",
                    r.qualification,
                    GraduationCap
                  ],
                  [
                    "Age Limit",
                    r.age_limit,
                    CalendarDays
                  ],
                  [
                    "Post / Vacancy",
                    r.post_name ||
                      r.total_vacancies,
                    BriefcaseBusiness
                  ],
                  [
                    "Job Location",
                    r.job_location,
                    MapPin
                  ]
                ].map(
                  ([a, b, I]) => (
                    <div key={a}>
                      <I />

                      <span>
                        <small>
                          {a}
                        </small>

                        <b>
                          {b ||
                            "See official notification"}
                        </b>
                      </span>
                    </div>
                  )
                )}

              </div>
            </InfoBlock>

            <InfoBlock
              title="Important Links"
              icon={Link2}
              cls="purple"
            >
              <div className="link-list">

                {apply && (
                  <a
                    href={apply}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <WalletCards />
                      Apply Online Link
                    </span>

                    <ExternalLink />
                  </a>
                )}

                {note && (
                  <a
                    href={note}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <FileText />
                      Official Notification
                    </span>

                    <ExternalLink />
                  </a>
                )}

                {web && (
                  <a
                    href={web}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <Globe2 />
                      Official Website
                    </span>

                    <ExternalLink />
                  </a>
                )}

              </div>
            </InfoBlock>

            {(r.full_description ||
              r.description) && (
              <InfoBlock
                title="About This Job"
                icon={FileText}
                cls="green"
              >
                <div className="description">

                  {String(
                    r.full_description ||
                      r.description
                  )
                    .split(/\n+/)
                    .map(
                      (x, i) => (
                        <p key={i}>
                          {x}
                        </p>
                      )
                    )}

                </div>
              </InfoBlock>
            )}

          </div>

          <aside className="detail-side">

            <div className="sticky">

              <div className="ref-apply-card">

                {orgLogo && (
                  <div className="ref-side-logo">
                    <img
                      src={orgLogo}
                      alt=""
                    />
                  </div>
                )}

                <h3>
                  {r.title ||
                    "Government Recruitment 2026"}
                </h3>

                <p>
                  Apply online and take the
                  next step toward your career.
                </p>

                {apply && (
                  <a
                    className="ref-apply-btn"
                    href={apply}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apply Now
                    <ArrowRight />
                  </a>
                )}

                {note && (
                  <a
                    className="ref-notification-btn"
                    href={note}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText />
                    Official Notification
                    <ExternalLink />
                  </a>
                )}

              </div>

              <div className="ref-quick-card">

                <h3>
                  <Link2 />
                  Quick Links
                </h3>

                {note && (
                  <a
                    href={note}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <FileText />

                      <b>
                        Official Notification
                        <small>
                          View / Download
                        </small>
                      </b>
                    </span>

                    <ChevronRight />
                  </a>
                )}

                {apply && (
                  <a
                    href={apply}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <WalletCards />

                      <b>
                        Apply Online
                        <small>
                          Open application portal
                        </small>
                      </b>
                    </span>

                    <ChevronRight />
                  </a>
                )}

                {web && (
                  <a
                    href={web}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      <Globe2 />

                      <b>
                        Official Website
                        <small>
                          Department website
                        </small>
                      </b>
                    </span>

                    <ChevronRight />
                  </a>
                )}

              </div>

              <div className="share-card">

                <h3>
                  Share This Job
                </h3>

                <div>

                  <button onClick={share}>
                    <Share2 />
                    Share
                  </button>

                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(
                        location.href
                      );

                      alert("Copied.");
                    }}
                  >
                    <Copy />
                    Copy Link
                  </button>

                </div>

              </div>

            </div>

          </aside>

        </div>

        {related.length > 0 && (
          <section className="related">

            <div className="section-head">

              <div>
                <span>
                  YOU MAY ALSO LIKE
                </span>

                <h2>
                  Latest Government Jobs
                </h2>
              </div>

              <button onClick={back}>
                View All
                <ArrowRight size={16} />
              </button>

            </div>

            <div className="related-grid">

              {related.map(x => (
                <button
                  key={x.id}
                  onClick={() => {
                    history.pushState(
                      {},
                      "",
                      `/resource/${x.slug || x.id}`
                    );

                    window.dispatchEvent(
                      new PopStateEvent(
                        "popstate"
                      )
                    );
                  }}
                >
                  <Thumb r={x} />

                  <span>
                    {x.job_category ||
                      x.category}
                  </span>

                  <b>
                    {x.title}
                  </b>

                  <small>
                    {deadline(
                      x.last_date
                    ).text}
                  </small>

                  <ArrowRight />
                </button>
              ))}

            </div>

          </section>
        )}

      </main>

      <footer className="site-footer">

        <div className="shell footer-grid">

          <div>
            <Logo />

            <p>
              One Stop Solution for
              Government & Online Services
            </p>
          </div>

          <div>
            <b>
              Connect With Us
            </b>

            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle />
              Join WhatsApp Channel
            </a>
          </div>

          <div>
            <b>
              Stay Informed
            </b>

            <span>
              Your Success • Our Priority
            </span>
          </div>

        </div>

        <div className="copyright">
          © 2026 SK Digital Service.
          All Rights Reserved.
        </div>

      </footer>

    </div>
  );
}

function InfoBlock({
  title,
  icon: Icon,
  cls,
  children
}) {
  return (
    <section className="info-block">

      <div
        className={`block-title ${cls}`}
      >
        <Icon size={19} />

        <h2>
          {title}
        </h2>
      </div>

      <div>
        {children}
      </div>

    </section>
  );
}

/* =========================================================
   MAIN APP
   ========================================================= */

export default function App() {

  const [resources, setResources] =
    useState([]);

  const [categories, setCategories] =
    useState([]);

  const [promotions, setPromotions] =
    useState([]);

  const [settings, setSettings] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [selectedCat, setSelectedCat] =
    useState("latest");

  const [mobileNav, setMobileNav] =
    useState(false);

  const [route, setRoute] =
    useState(location.pathname);

  const [loading, setLoading] =
    useState(true);

  const [dark, setDark] =
    useState(false);

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      dark ? "dark" : "light"
    );
  }, [dark]);

  useEffect(() => {

    const fn = () => {
      setRoute(location.pathname);

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    };

    window.addEventListener(
      "popstate",
      fn
    );

    return () =>
      window.removeEventListener(
        "popstate",
        fn
      );

  }, []);

  useEffect(() => {

    (async () => {

      setLoading(true);

      const [
        rr,
        cc,
        pp,
        ss
      ] = await Promise.all([

        supabase
          .from("resources")
          .select("*")
          .eq("is_published", true)
          .order(
            "published_at",
            {
              ascending: false,
              nullsFirst: false
            }
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          ),

        supabase
          .from("categories")
          .select("*")
          .eq("is_active", true)
          .order("display_order"),

        supabase
          .from("promotions")
          .select("*")
          .eq("is_active", true)
          .order(
            "display_order",
            {
              ascending: true
            }
          ),

        supabase
          .from("site_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle()

      ]);

      if (!rr.error) {
        setResources(rr.data || []);
      }

      if (!cc.error) {
        setCategories(cc.data || []);
      }

      if (!pp.error) {
        setPromotions(pp.data || []);
      }

      if (!ss.error) {
        setSettings(ss.data);
      }

      setLoading(false);

    })();

  }, []);

  const gov = useMemo(
    () =>
      resources.filter(isGov),
    [resources]
  );

  const nearest = useMemo(
    () =>
      gov
        .filter(
          r =>
            daysLeft(r.last_date) >= 0
        )
        .sort(
          (a, b) =>
            (daysLeft(a.last_date) ??
              9999) -
            (daysLeft(b.last_date) ??
              9999)
        )[0] || gov[0],
    [gov]
  );

  const filtered = useMemo(() => {

    const q =
      search
        .trim()
        .toLowerCase();

    let arr = [...gov];

    if (selectedCat !== "latest") {
      arr = arr.filter(
        r =>
          jobCat(r) ===
          selectedCat
      );
    }

    if (q) {
      arr = arr.filter(
        r =>
          [
            r.title,
            r.organization,
            r.post_name,
            r.qualification,
            r.job_category,
            r.category,
            ...(r.tags || [])
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
      );
    }

    return arr.sort(
      publishedSort
    );

  }, [
    gov,
    selectedCat,
    search
  ]);

  const wa =
    safeUrl(
      settings?.whatsapp_channel_url
    ) ||
    WA_FALLBACK;

  const ig =
    safeUrl(
      settings?.instagram_url
    ) ||
    IG_FALLBACK;

  const yt =
    safeUrl(
      settings?.youtube_url
    ) ||
    YT_FALLBACK;

  const topPromos =
    promotions.filter(
      p =>
        p.placement === "top"
    );

  const sidePromos =
    promotions.filter(
      p =>
        p.placement === "sidebar"
    );

  const bottomPromos =
    promotions.filter(
      p =>
        p.placement === "bottom"
    );

  const openJob = r => {

    history.pushState(
      {},
      "",
      `/resource/${r.slug || r.id}`
    );

    setRoute(
      `/resource/${r.slug || r.id}`
    );

    window.scrollTo(
      0,
      0
    );
  };

  /* =======================================================
     JOB DETAIL ROUTE
     ======================================================= */

  if (
    route.startsWith(
      "/resource/"
    )
  ) {

    const slug =
      decodeURIComponent(
        route.split(
          "/resource/"
        )[1] || ""
      );

    const r =
      resources.find(
        x =>
          String(
            x.slug || x.id
          ) === slug
      );

    if (r) {
      return (
        <JobDetail
          r={r}
          resources={resources}
          onBack={() => {
            history.pushState(
              {},
              "",
              "/"
            );

            setRoute("/");
          }}
          wa={wa}
        />
      );
    }
  }

  /* =======================================================
     PUBLIC WEBSITE
     ======================================================= */

  return (
    <SocialFollowGate
      instagramUrl={ig}
      youtubeUrl={yt}
    >

      <div className="public-site">

        <Header
          search={search}
          setSearch={setSearch}
          openMenu={mobileNav}
          onMenu={() =>
            setMobileNav(
              v => !v
            )
          }
          dark={dark}
          onToggleTheme={() =>
            setDark(
              v => !v
            )
          }
        />

        <main>

          {/* =================================================
              HERO
          ================================================= */}

          <section className="hero-section">

            <div className="shell hero-grid">

              <div className="hero-copy">

                <span className="hero-badge">
                  <Flame size={14} />

                  {settings?.hero_badge ||
                    "Latest Job Update"}
                </span>

                <h1>
                  {settings?.hero_title ||
                    "Your Dream Job"}

                  <br />

                  <mark>
                    {settings?.hero_highlight ||
                      "Is Just a Click Away"}
                  </mark>
                </h1>

                <p>
                  {settings?.hero_description ||
                    "Government Jobs • Online Services • Useful Resources"}

                  <br />

                  Everything You Need –
                  In One Place
                </p>

                <div className="trust-row">

                  <span>
                    <Zap size={14} />
                    Fast & Easy Process
                  </span>

                  <span>
                    <ShieldCheck size={14} />
                    Trusted Service
                  </span>

                  <span>
                    <Sparkles size={14} />
                    100% Genuine Updates
                  </span>

                </div>

              </div>

              <div className="hero-illustration">

                <div className="illus-glow" />

                <div className="illus-laptop">

                  <div className="illus-screen">

                    <div className="dash-topbar">
                      <span />
                      <span />
                      <span />
                    </div>

                    <div className="dash-bars">

                      <div
                        style={{
                          height: "38%"
                        }}
                      />

                      <div
                        style={{
                          height: "68%"
                        }}
                      />

                      <div
                        style={{
                          height: "52%"
                        }}
                      />

                      <div
                        style={{
                          height: "88%"
                        }}
                      />

                      <div
                        style={{
                          height: "60%"
                        }}
                      />

                      <div
                        style={{
                          height: "78%"
                        }}
                      />

                    </div>

                    <svg
                      className="dash-graph"
                      viewBox="0 0 100 30"
                      preserveAspectRatio="none"
                    >
                      <polyline points="0,25 16,17 32,20 48,9 64,13 80,5 100,8" />
                    </svg>

                  </div>

                  <div className="illus-base" />

                </div>

                <div className="glass-badge b1">
                  <b>9+</b>
                  <span>Years</span>
                </div>

                <div className="glass-badge b2">
                  <b>1000+</b>
                  <span>Customers</span>
                </div>

                <div className="glass-badge b3">

                  <Star size={14} />

                  <div>
                    <b>5★</b>
                    <span>Rated</span>
                  </div>

                </div>

                <div className="illus-brandline">

                  <Logo className="illus-logo" />

                  <div>
                    <b>
                      SK DIGITAL SERVICE
                    </b>

                    <small>
                      Dhule · Since 2015
                    </small>
                  </div>

                </div>

                <small className="illus-caption">
                  Apply · Download · Get Done
                </small>

              </div>

              <div>

                {nearest ? (
                  <CountdownCard
                    job={nearest}
                    wa={wa}
                  />
                ) : (
                  <div className="countdown-card empty">

                    <h3>
                      Latest Government Jobs
                    </h3>

                    <p>
                      New verified updates
                      will appear here.
                    </p>

                    <a
                      className="wa-hero"
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle />

                      <b>
                        Join WhatsApp Channel
                      </b>

                      <ArrowRight />
                    </a>

                  </div>
                )}

              </div>

            </div>

          </section>

          {/* =================================================
              TOP PROMOTIONS
          ================================================= */}

          {topPromos.length > 0 && (
            <section className="shell promo-row">

              {topPromos.map(
                p => (
                  <Promotion
                    p={p}
                    key={p.id}
                  />
                )
              )}

            </section>
          )}

          {/* =================================================
              FEATURED PRODUCTS
          ================================================= */}

          <ProductsSection />

          {/* =================================================
              JOB CATEGORIES
          ================================================= */}

          <section
            id="categories"
            className="shell category-row"
          >

            {JOB_CATS.map(
              ([
                name,
                slug,
                Icon,
                color
              ]) => (

                <button
                  key={slug}
                  className={
                    selectedCat === slug
                      ? "selected"
                      : ""
                  }
                  onClick={() =>
                    setSelectedCat(
                      slug
                    )
                  }
                >

                  <span
                    style={{
                      background:
                        color + "1a",
                      color
                    }}
                  >
                    <Icon size={24} />
                  </span>

                  <b>
                    {name}
                  </b>

                </button>

              )
            )}

          </section>

          {/* =================================================
              JOBS + SIDEBAR
          ================================================= */}

          <section
            id="latest"
            className="shell content-layout"
          >

            <div className="jobs-panel">

              <div className="panel-heading">

                <div>

                  <span>
                    <Flame size={11} />

                    {selectedCat ===
                    "latest"
                      ? "Latest Jobs"
                      : "Government Jobs"}
                  </span>

                  <h2>
                    {selectedCat ===
                    "latest"
                      ? "Latest Jobs"
                      : JOB_CATS.find(
                          x =>
                            x[1] ===
                            selectedCat
                        )?.[0] ||
                        "Jobs"}
                  </h2>

                  <p>
                    {selectedCat ===
                    "latest"
                      ? "Recently Published Jobs (Newest First)"
                      : "Latest published updates in this category"}
                  </p>

                </div>

                <button
                  onClick={() =>
                    setSelectedCat(
                      "latest"
                    )
                  }
                >
                  View All
                  <ArrowRight size={16} />
                </button>

              </div>

              {loading ? (
                <div className="empty-state">
                  Loading latest jobs…
                </div>
              ) : filtered.length ? (
                <div className="job-list">

                  {filtered
                    .slice(0, 8)
                    .map(r => (
                      <JobCard
                        key={r.id}
                        r={r}
                        onOpen={
                          openJob
                        }
                      />
                    ))}

                </div>
              ) : (
                <div className="empty-state">
                  No published jobs found.
                </div>
              )}

              {filtered.length > 8 && (
                <button
                  className="view-all-btn"
                  onClick={() =>
                    setSelectedCat(
                      selectedCat
                    )
                  }
                >
                  View All Jobs
                  <ArrowRight />
                </button>
              )}

            </div>

            <aside className="side-panel">

              {/* QUICK LINKS */}

              <div className="quick-links">

                <h3>
                  <Link2 size={15} />
                  Quick Links
                </h3>

                {[
                  [
                    "Apply Online",
                    "#latest"
                  ],
                  [
                    "Download Notification",
                    "#latest"
                  ],
                  [
                    "Official Website",
                    "#about"
                  ],
                  [
                    "Syllabus & Exam Pattern",
                    "#resources"
                  ],
                  [
                    "Previous Year Papers",
                    "#resources"
                  ],
                  [
                    "Admit Card",
                    "#latest"
                  ],
                  [
                    "Result",
                    "#latest"
                  ],
                  [
                    "Important Documents",
                    "#resources"
                  ]
                ].map(
                  ([x, u]) => (
                    <a
                      href={u}
                      key={x}
                    >
                      {x}
                      <ChevronRight
                        size={15}
                      />
                    </a>
                  )
                )}

              </div>

              {/* SOCIAL FOLLOW */}

              <div className="follow-card">

                <h3>
                  <Users size={14} />
                  Follow Us for Latest Updates
                </h3>

                <a
                  className="follow-btn insta"
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Instagram size={18} />

                  <span>
                    <b>
                      Follow on Instagram
                    </b>

                    <small>
                      @skdigitalservice.dhule
                    </small>
                  </span>

                  <ChevronRight size={15} />
                </a>

                <a
                  className="follow-btn yt"
                  href={yt}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Youtube size={18} />

                  <span>
                    <b>
                      Subscribe on YouTube
                    </b>

                    <small>
                      @skdigitalservice-t9u
                    </small>
                  </span>

                  <ChevronRight size={15} />
                </a>

                <div className="follow-tags">
                  <span>Jobs</span>
                  <span>Schemes</span>
                  <span>Updates</span>
                  <span>Tips</span>
                </div>

              </div>

              {/* SIDEBAR PROMOTIONS */}

              {sidePromos.map(
                p => (
                  <Promotion
                    key={p.id}
                    p={p}
                    compact
                  />
                )
              )}

            </aside>

          </section>

          {/* =================================================
              WHY SK DIGITAL SERVICE
          ================================================= */}

          <section
            id="about"
            className="shell why-strip"
          >

            <div>
              <ShieldCheck />
              <b>
                Why Choose SK Digital Service?
              </b>
            </div>

            <span>
              <ShieldCheck />
              Trusted & Reliable
            </span>

            <span>
              <Zap />
              Fast Processing
            </span>

            <span>
              <Sparkles />
              Expert Support
            </span>

            <span>
              <CheckCircle2 />
              All Government Services Under One Roof
            </span>

          </section>

          {/* =================================================
              BOTTOM PROMOTIONS
          ================================================= */}

          {bottomPromos.length > 0 && (
            <section className="shell promo-bottom">

              {bottomPromos.map(
                p => (
                  <Promotion
                    p={p}
                    key={p.id}
                  />
                )
              )}

            </section>
          )}

        </main>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          id="resources"
          className="site-footer"
        >

          <div className="shell footer-grid">

            <div>
              <Logo />

              <p>
                Government & Online Services
              </p>
            </div>

            <div>

              <b>
                Our Services
              </b>

              <span>
                Government Job Updates
              </span>

              <span>
                Online Application Services
              </span>

              <span>
                Document Assistance
              </span>

              <span>
                Digital & Design Services
              </span>

            </div>

            <div>

              <b>
                Connect With Us
              </b>

              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle />
                Join WhatsApp Channel
              </a>

              <small>
                {wa}
              </small>

              <div className="footer-social">

                <a
                  href={ig}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram size={15} />
                </a>

                <a
                  href={yt}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                >
                  <Youtube size={15} />
                </a>

                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Channel"
                >
                  <Send size={15} />
                </a>

              </div>

            </div>

            <div>

              <b>
                Stay Informed
              </b>

              <strong>
                Your Success
                <br />
                Our Priority
              </strong>

            </div>

          </div>

          <div className="copyright-row">

            <span>
              © 2026 SK Digital Service.
              All Rights Reserved.
            </span>

            <span className="footer-address">
              <MapPin size={12} />
              Vadjai Road, Near Haji Chicken Center, Dhule
            </span>

            <span>
              Built with ❤ for a Digital India
            </span>

          </div>

        </footer>

      </div>

    </SocialFollowGate>
  );
}
