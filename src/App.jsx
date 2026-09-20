import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const fallbackCategories = [
  {
    name: "Government Jobs",
    slug: "government-jobs",
    icon: "💼",
    description: "Latest recruitment updates and application resources.",
  },
  {
    name: "SSC",
    slug: "ssc",
    icon: "📚",
    description: "SSC exam resources, practice material and notes.",
  },
  {
    name: "Study Material",
    slug: "study-material",
    icon: "📖",
    description: "Useful PDFs and preparation resources.",
  },
  {
    name: "Government Forms",
    slug: "government-forms",
    icon: "📄",
    description: "Important forms and document resources.",
  },
];

function App() {
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
    loadCategories();
  }, []);

  async function loadResources() {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (!error) {
      setResources(data || []);
    }

    setLoading(false);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!error && data?.length) {
      setCategories(data);
    } else {
      setCategories(fallbackCategories);
    }
  }

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return resources;

    return resources.filter((resource) => {
      const searchableText = [
        resource.title,
        resource.description,
        resource.category,
        ...(resource.tags || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [resources, search]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container nav-inner">
          <a className="brand" href="/">
            <div className="brand-mark">SK</div>
            <div>
              <strong>SK DIGITAL SERVICE</strong>
              <span>Resource Hub</span>
            </div>
          </a>

          <a className="admin-link" href="/admin">
            Admin
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">
                <Sparkles size={16} />
                Digital Resource Centre
              </div>

              <h1>
                Useful resources.
                <br />
                <span>One trusted place.</span>
              </h1>

              <p>
                Government job updates, study material, forms and useful PDFs —
                organized for quick and simple access.
              </p>

              <div className="search-box">
                <Search size={20} />
                <input
                  type="search"
                  placeholder="Search resources..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="hero-card">
              <div className="hero-card-icon">
                <ShieldCheck size={28} />
              </div>
              <span>SK DIGITAL SERVICE</span>
              <h2>Resources made simple.</h2>
              <p>
                Find the material you need without searching through multiple
                links.
              </p>
            </div>
          </div>
        </section>

        <section className="container section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">EXPLORE</span>
              <h2>Browse by category</h2>
            </div>
          </div>

          <div className="category-grid">
            {(categories.length ? categories : fallbackCategories).map(
              (category) => (
                <button
                  className="category-card"
                  key={category.slug || category.id}
                  onClick={() => setSearch(category.name)}
                >
                  <div className="category-icon">
                    {category.icon || "📄"}
                  </div>
                  <div>
                    <h3>{category.name}</h3>
                    <p>{category.description}</p>
                  </div>
                  <ArrowRight size={18} />
                </button>
              )
            )}
          </div>
        </section>

        <section className="container section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">LIBRARY</span>
              <h2>Latest resources</h2>
            </div>

            <span className="resource-count">
              {filteredResources.length} resources
            </span>
          </div>

          {loading ? (
            <div className="empty-state">
              <div className="loader" />
              <p>Loading resources...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="empty-state">
              <FileText size={34} />
              <h3>No resources found</h3>
              <p>
                New resources will appear here automatically when published.
              </p>
            </div>
          ) : (
            <div className="resource-grid">
              {filteredResources.map((resource) => (
                <article className="resource-card" key={resource.id}>
                  <div className="resource-top">
                    <div className="resource-icon">
                      <FileText size={22} />
                    </div>

                    {resource.is_free ? (
                      <span className="free-badge">FREE</span>
                    ) : (
                      <span className="paid-badge">
                        ₹{resource.price || "—"}
                      </span>
                    )}
                  </div>

                  <span className="resource-category">
                    {resource.category}
                  </span>

                  <h3>{resource.title || "Untitled Resource"}</h3>

                  <p>
                    {resource.description ||
                      "Useful digital resource from SK DIGITAL SERVICE."}
                  </p>

                  <button className="resource-action">
                    View Resource <ArrowRight size={17} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="container trust-section">
          <div className="trust-card">
            <div className="trust-item">
              <BriefcaseBusiness size={22} />
              <div>
                <strong>Government & Jobs</strong>
                <span>Useful application resources</span>
              </div>
            </div>

            <div className="trust-item">
              <BookOpen size={22} />
              <div>
                <strong>Study Resources</strong>
                <span>Preparation material in one place</span>
              </div>
            </div>

            <div className="trust-item">
              <Upload size={22} />
              <div>
                <strong>Updated Library</strong>
                <span>New resources can be added anytime</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <strong>SK DIGITAL SERVICE</strong>
            <p>Digital services • Government resources • Online support</p>
          </div>

          <span>© {new Date().getFullYear()} SK DIGITAL SERVICE</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
