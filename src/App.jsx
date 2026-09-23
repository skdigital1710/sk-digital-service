import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  IndianRupee,
  MapPin,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./App.css";

const fallbackCategories = [
  { name: "Government Jobs", slug: "government-jobs", icon: "💼" },
  { name: "SSC", slug: "ssc", icon: "📚" },
  { name: "Study Material", slug: "study-material", icon: "📖" },
  { name: "Government Forms", slug: "government-forms", icon: "📄" },
];

const jobCategories = [
  { name: "Latest Jobs", slug: "latest", icon: "🔥" },
  { name: "SSC", slug: "ssc", icon: "📚" },
  { name: "GDS", slug: "gds", icon: "📮" },
  { name: "Railway", slug: "railway", icon: "🚆" },
  { name: "Banking", slug: "banking", icon: "🏦" },
  { name: "Defence", slug: "defence", icon: "🛡️" },
  { name: "Police", slug: "police", icon: "👮" },
  { name: "Teaching", slug: "teaching", icon: "🎓" },
  { name: "Other", slug: "other", icon: "▦" },
];

function getJobCategory(resource) {
  return String(resource?.job_category || resource?.category || "Other").trim();
}

function isGovernmentJob(resource) {
  const value = getJobCategory(resource).toLowerCase();
  return (
    value === "government jobs" ||
    value === "latest jobs" ||
    jobCategories.some((item) => item.name.toLowerCase() === value)
  );
}

function publishedSort(a, b) {
  const aDate = new Date(a.published_at || a.created_at || 0).getTime();
  const bDate = new Date(b.published_at || b.created_at || 0).getTime();
  return bDate - aDate;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function safeUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function deadlineState(lastDate) {
  if (!lastDate) return { label: "Check notification", tone: "neutral" };
  const end = new Date(`${lastDate}T23:59:59`);
  const diff = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Application Closed", tone: "closed" };
  if (diff <= 3) return { label: `${diff} day${diff === 1 ? "" : "s"} left`, tone: "urgent" };
  if (diff <= 10) return { label: `${diff} days left`, tone: "soon" };
  return { label: `${diff} days left`, tone: "open" };
}

function ResourceThumbnail({ resource, large = false }) {
  const image = resource?.thumbnail_url || "";
  if (image) {
    return (
      <img
        className={`job-thumbnail-image ${large ? "large" : ""}`}
        src={image}
        alt=""
        loading="lazy"
      />
    );
  }

  return (
    <div className={`job-thumbnail-fallback ${large ? "large" : ""}`}>
      <div className="thumb-glow thumb-glow-one" />
      <div className="thumb-glow thumb-glow-two" />
      <div className="thumb-topline">SK DIGITAL SERVICE</div>
      <div className="thumb-org">{resource?.organization || "Government of India"}</div>
      <div className="thumb-title">
        {resource?.title || "Government Job Recruitment 2026"}
      </div>
      <div className="thumb-post">
        {resource?.post_name || "Latest Government Recruitment"}
      </div>
      <div className="thumb-meta">
        <span><b>{resource?.total_vacancies || "—"}</b> Vacancies</span>
        <span><b>{formatDate(resource?.last_date)}</b> Last Date</span>
      </div>
      <div className="thumb-cta">APPLY ONLINE</div>
    </div>
  );
}

function JobDetail({ resource, onBack, resources }) {
  const deadline = deadlineState(resource.last_date);
  const applyUrl = safeUrl(resource.apply_url);
  const notificationUrl = safeUrl(resource.notification_url);
  const websiteUrl = safeUrl(resource.official_website_url);

  const related = resources
    .filter((item) => item.id !== resource.id && item.is_published)
    .filter((item) => item.category === resource.category || item.is_featured)
    .slice(0, 3);

  async function sharePage() {
    const shareData = {
      title: resource.title || "SK DIGITAL SERVICE",
      text: resource.short_description || resource.title || "Government Job Update",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Job link copied.");
      }
    } catch {
      // User cancelled share; nothing to do.
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    alert("Job link copied.");
  }

  return (
    <div className="job-page">
      <header className="job-header">
        <div className="site-shell header-inner">
          <button className="back-button" onClick={onBack}>
            <ArrowLeft size={18} />
            Resource Hub
          </button>

          <div className="job-brand">
            <div className="brand-sk">SK</div>
            <div>
              <strong>SK <span>DIGITAL SERVICE</span></strong>
              <small>One Stop Solution for Government & Online Services</small>
            </div>
          </div>

          <button className="header-share" onClick={sharePage} title="Share">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <main className="site-shell job-main">
        <div className="job-breadcrumb">
          <button onClick={onBack}>Home</button>
          <ChevronRight size={14} />
          <span>{resource.category || "Government Jobs"}</span>
          <ChevronRight size={14} />
          <strong>{resource.title}</strong>
        </div>

        <section className="job-hero">
          <div className="hero-government-mark">भारत<br /><small>Government</small></div>
          <div className="job-hero-copy">
            <span className="hero-eyebrow">GOVERNMENT JOB OPPORTUNITY</span>
            <h1>{resource.title || "Government Recruitment 2026"}</h1>
            <p>{resource.organization || "Government Department"} {resource.post_name ? `• ${resource.post_name}` : ""}</p>
            <div className="hero-pills">
              <span><CheckCircle2 size={15} /> Verified resource</span>
              {resource.is_featured && <span><Sparkles size={15} /> Featured</span>}
              <span className={`deadline-pill ${deadline.tone}`}><Clock3 size={15} /> {deadline.label}</span>
            </div>
          </div>
          <div className="hero-visual">
            <ResourceThumbnail resource={resource} large />
          </div>
        </section>

        <section className="job-key-stats">
          <div><Users size={23} /><span>Total Vacancies</span><strong>{resource.total_vacancies || "—"}</strong></div>
          <div><GraduationCap size={23} /><span>Qualification</span><strong>{resource.qualification || "See eligibility"}</strong></div>
          <div><CalendarDays size={23} /><span>Age Limit</span><strong>{resource.age_limit || "See notification"}</strong></div>
          <div><Clock3 size={23} /><span>Last Date</span><strong>{formatDate(resource.last_date)}</strong></div>
          <div><IndianRupee size={23} /><span>Application Fee</span><strong>{resource.application_fee || "See notification"}</strong></div>
        </section>

        <div className="job-layout">
          <div className="job-content-column">
            <section className="job-card">
              <div className="section-title blue">
                <BriefcaseBusiness size={20} />
                <h2>Job Overview</h2>
              </div>

              <div className="overview-table">
                {[
                  ["Organization / Department", resource.organization],
                  ["Post Name", resource.post_name],
                  ["Total Vacancies", resource.total_vacancies],
                  ["Qualification", resource.qualification],
                  ["Age Limit", resource.age_limit],
                  ["Application Fee", resource.application_fee],
                  ["Job Location", resource.job_location],
                  ["Application Start Date", formatDate(resource.application_start_date)],
                  ["Last Date", formatDate(resource.last_date)],
                ].map(([label, value]) => (
                  <div className="overview-row" key={label}>
                    <span>{label}</span>
                    <strong>{value || "—"}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="job-card">
              <div className="section-title cyan">
                <GraduationCap size={20} />
                <h2>Eligibility Criteria</h2>
              </div>
              <div className="eligibility-grid">
                <div><GraduationCap size={19} /><div><small>Educational Qualification</small><strong>{resource.qualification || "See official notification"}</strong></div></div>
                <div><CalendarDays size={19} /><div><small>Age Limit</small><strong>{resource.age_limit || "See official notification"}</strong></div></div>
                <div><FileText size={19} /><div><small>Post / Vacancy Details</small><strong>{resource.post_name || "See official notification"}</strong></div></div>
                <div><MapPin size={19} /><div><small>Job Location</small><strong>{resource.job_location || "See official notification"}</strong></div></div>
              </div>
            </section>

            <section className="job-card">
              <div className="section-title purple">
                <ExternalLink size={20} />
                <h2>Important Links</h2>
              </div>
              <div className="links-table">
                {applyUrl && <a href={applyUrl} target="_blank" rel="noreferrer"><span><WalletCards size={18} /> Apply Online Link</span><ExternalLink size={17} /></a>}
                {notificationUrl && <a href={notificationUrl} target="_blank" rel="noreferrer"><span><FileText size={18} /> Official Notification</span><ExternalLink size={17} /></a>}
                {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer"><span><Globe2 size={18} /> Official Website</span><ExternalLink size={17} /></a>}
              </div>
            </section>

            {(resource.full_description || resource.description) && (
              <section className="job-card about-card">
                <div className="section-title green">
                  <FileText size={20} />
                  <h2>About This Job</h2>
                </div>
                <div className="full-description">
                  {(resource.full_description || resource.description)
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((line, index) => <p key={index}>{line}</p>)}
                </div>
              </section>
            )}

            <section className="job-card disclaimer-card">
              <ShieldCheck size={20} />
              <div>
                <strong>Important</strong>
                <p>Application submit karne se pehle official notification aur official website par eligibility, dates, fee aur instructions verify karein.</p>
              </div>
            </section>
          </div>

          <aside className="job-sidebar">
            <div className="sticky-panel">
              <div className="notification-preview">
                <ResourceThumbnail resource={resource} />
                <div className="pdf-label"><FileText size={18} /> Official Notification</div>
              </div>

              {applyUrl && (
                <a className="primary-apply-button" href={applyUrl} target="_blank" rel="noreferrer">
                  <span><WalletCards size={22} /><b>Apply Now</b><small>Official Application Link</small></span>
                  <ArrowRight size={23} />
                </a>
              )}

              {notificationUrl && (
                <a className="secondary-action" href={notificationUrl} target="_blank" rel="noreferrer">
                  <FileText size={20} />
                  <span><b>View Notification</b><small>Official Notification / PDF</small></span>
                  <ChevronRight size={20} />
                </a>
              )}

              {websiteUrl && (
                <a className="secondary-action" href={websiteUrl} target="_blank" rel="noreferrer">
                  <Globe2 size={20} />
                  <span><b>Official Website</b><small>Department Website</small></span>
                  <ChevronRight size={20} />
                </a>
              )}

              <div className="share-card">
                <h3>Share This Job</h3>
                <div className="share-actions">
                  <button onClick={sharePage}>Share</button>
                  <button onClick={copyLink}><Copy size={16} /> Copy Link</button>
                </div>
              </div>

              <div className="why-card">
                <div className="why-icon"><Sparkles size={19} /></div>
                <h3>SK DIGITAL SERVICE</h3>
                <p><CheckCircle2 size={16} /> Latest government job resources</p>
                <p><CheckCircle2 size={16} /> Clear eligibility & dates</p>
                <p><CheckCircle2 size={16} /> Direct official links</p>
                <p><CheckCircle2 size={16} /> Fast, organized information</p>
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="related-section">
            <div className="related-heading">
              <div><span>KEEP EXPLORING</span><h2>Related Government Jobs</h2></div>
              <button onClick={onBack}>View all <ArrowRight size={17} /></button>
            </div>
            <div className="related-grid">
              {related.map((item) => (
                <button
                  className="related-card"
                  key={item.id}
                  onClick={() => {
                    window.history.pushState({}, "", `/resource/${item.slug}`);
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ResourceThumbnail resource={item} />
                  <div><span>{item.category}</span><h3>{item.title}</h3><p>{item.post_name || item.organization || "Government recruitment"}</p></div>
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="job-footer">
        <div className="site-shell footer-inner">
          <div><div className="footer-brand">SK DIGITAL SERVICE</div><small>One Stop Solution for Government & Online Services</small></div>
          <div className="footer-whatsapp">🔔 Join our WhatsApp Channel for latest updates</div>
          <div>Government Jobs &nbsp;|&nbsp; Online Forms &nbsp;|&nbsp; Digital Services</div>
        </div>
      </footer>
    </div>
  );
}

function PublicHome({ resources, categories, loading }) {
  const [search, setSearch] = useState("");
  const [jobTab, setJobTab] = useState("latest");

  const published = resources
    .filter((item) => item.is_published)
    .sort(publishedSort);

  const governmentJobs = published.filter(isGovernmentJob);
  const featured = governmentJobs.filter((item) => item.is_featured).slice(0, 4);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    let list = governmentJobs;

    if (jobTab !== "latest" && jobTab !== "all") {
      const selected = jobCategories.find((item) => item.slug === jobTab);
      if (selected) {
        list = list.filter(
          (item) => getJobCategory(item).toLowerCase() === selected.name.toLowerCase()
        );
      }
    }

    if (jobTab === "latest") {
      list = [...list].sort(publishedSort);
    }

    return list.filter((item) =>
      !term ||
      [
        item.title,
        item.organization,
        item.post_name,
        item.category,
        item.job_category,
        item.short_description,
        ...(item.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [governmentJobs, search, jobTab]);

  function openResource(resource) {
    window.history.pushState({}, "", `/resource/${resource.slug}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <div className="site-shell public-header-inner">
          <a className="public-brand" href="/">
            <div className="brand-sk">SK</div>
            <div>
              <strong>SK <span>DIGITAL SERVICE</span></strong>
              <small>Government • Forms • Digital Services</small>
            </div>
          </a>

          <nav>
            <a href="#jobs">Government Jobs</a>
            <a href="#categories">Categories</a>
            <a href="#about">About</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="public-hero">
          <div className="site-shell public-hero-inner">
            <div className="hero-copy">
              <span className="public-kicker">SK DIGITAL SERVICE • RESOURCE HUB</span>
              <h1>Government Jobs,<br /><em>organized for you.</em></h1>
              <p>
                Recruitment details, eligibility, important dates and direct
                official links — all in one premium resource page.
              </p>

              <div className="hero-search">
                <Search size={20} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search job, department, post..."
                />
              </div>

              <div className="hero-trust">
                <ShieldCheck size={17} />
                Verify every application on the official notification before applying.
              </div>
            </div>

            <div className="hero-stack">
              {featured.slice(0, 3).map((item, index) => (
                <button
                  key={item.id}
                  className={`floating-job-card card-${index}`}
                  onClick={() => openResource(item)}
                >
                  <ResourceThumbnail resource={item} />
                  <div>
                    <span>{item.organization || getJobCategory(item)}</span>
                    <strong>{item.title}</strong>
                  </div>
                </button>
              ))}

              {featured.length === 0 && (
                <div className="hero-placeholder">
                  <Sparkles size={38} />
                  <strong>Your next job resource appears here.</strong>
                  <span>Publish a Government Job from Admin.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="categories" className="site-shell category-strip">
          <a href="#jobs" onClick={() => setJobTab("latest")}>
            <span>💼</span>
            <b>Government Jobs</b>
            <ChevronRight size={17} />
          </a>

          {categories
            .filter((category) => category.name !== "Government Jobs")
            .slice(0, 3)
            .map((category) => (
              <a
                href="#jobs"
                key={category.slug || category.name}
                onClick={() => {
                  const match = jobCategories.find(
                    (item) => item.name.toLowerCase() === category.name.toLowerCase()
                  );
                  setJobTab(match?.slug || "all");
                }}
              >
                <span>{category.icon || "•"}</span>
                <b>{category.name}</b>
                <ChevronRight size={17} />
              </a>
            ))}
        </section>

        <section id="jobs" className="site-shell jobs-section">
          <div className="section-heading-public">
            <div>
              <span>GOVERNMENT JOBS</span>
              <h2>Latest Jobs</h2>
              <p>Last published job upar, older jobs niche.</p>
            </div>
            <div className="job-count">{filtered.length} jobs</div>
          </div>

          <div className="job-tabs" role="tablist" aria-label="Government Job Categories">
            {jobCategories.map((tab) => (
              <button
                key={tab.slug}
                className={jobTab === tab.slug ? "active" : ""}
                onClick={() => setJobTab(tab.slug)}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="public-loading">Loading resources...</div>
          ) : filtered.length === 0 ? (
            <div className="public-empty">
              <Sparkles size={30} />
              <h3>No matching jobs</h3>
              <p>Try another category or search term.</p>
            </div>
          ) : (
            <div className="jobs-grid">
              {filtered.map((resource) => {
                const deadline = deadlineState(resource.last_date);

                return (
                  <button
                    className="job-card-public"
                    key={resource.id}
                    onClick={() => openResource(resource)}
                  >
                    <div className="job-card-image">
                      <ResourceThumbnail resource={resource} />
                      <span className={`deadline-badge ${deadline.tone}`}>
                        {deadline.label}
                      </span>
                    </div>

                    <div className="job-card-body">
                      <span className="job-category">
                        {getJobCategory(resource)}
                      </span>

                      <h3>{resource.title}</h3>

                      <p>
                        {resource.organization ||
                          resource.short_description ||
                          "Government recruitment resource"}
                      </p>

                      <div className="job-card-meta">
                        <span>
                          <Users size={15} />
                          {resource.total_vacancies || "—"} Vacancies
                        </span>
                        <span>
                          <CalendarDays size={15} />
                          {formatDate(resource.last_date)}
                        </span>
                      </div>

                      <div className="job-card-footer">
                        <span>View Premium Details</span>
                        <ArrowRight size={17} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section id="about" className="public-trust-section">
          <div className="site-shell trust-grid">
            <div>
              <ShieldCheck size={27} />
              <h2>One organized place for every update.</h2>
              <p>
                SK DIGITAL SERVICE turns long recruitment notices into a clean,
                readable page with the original official links preserved.
              </p>
            </div>

            <div>
              <CheckCircle2 size={20} />
              <span>Eligibility & qualification</span>
              <CheckCircle2 size={20} />
              <span>Important dates & fee</span>
              <CheckCircle2 size={20} />
              <span>Direct application links</span>
              <CheckCircle2 size={20} />
              <span>Mobile-friendly job pages</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="job-footer">
        <div className="site-shell footer-inner">
          <div>
            <div className="footer-brand">SK DIGITAL SERVICE</div>
            <small>One Stop Solution for Government & Online Services</small>
          </div>
          <div>Government Jobs &nbsp;|&nbsp; Online Forms &nbsp;|&nbsp; Digital Services</div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);

    async function load() {
      setLoading(true);
      const [resourceResult, categoryResult] = await Promise.all([
        supabase
          .from("resources")
          .select("*")
          .eq("is_published", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
      ]);

      if (!resourceResult.error) setResources(resourceResult.data || []);
      if (!categoryResult.error && categoryResult.data?.length) setCategories(categoryResult.data);
      setLoading(false);
    }

    load();
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const slug = path.startsWith("/resource/") ? decodeURIComponent(path.replace("/resource/", "")) : "";
  const resource = slug ? resources.find((item) => item.slug === slug) : null;

  if (slug && resource) {
    return <JobDetail resource={resource} resources={resources} onBack={() => { window.history.pushState({}, "", "/"); setPath("/"); window.scrollTo({ top: 0 }); }} />;
  }

  return <PublicHome resources={resources} categories={categories} loading={loading} />;
}

export default App;
