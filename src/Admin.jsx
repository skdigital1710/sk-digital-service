import React, { useEffect, useMemo, useState } from "react";
import "./Admin.css";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Trash2,
  UploadCloud,
  X,
  Star,
  Clock3,
  Download,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const fallbackCategories = [
  { name: "Government Jobs", slug: "government-jobs", icon: "💼" },
  { name: "SSC", slug: "ssc", icon: "📚" },
  { name: "Study Material", slug: "study-material", icon: "📖" },
  { name: "Government Forms", slug: "government-forms", icon: "📄" },
];

const emptyForm = {
  title: "",
  description: "",
  category: "Government Jobs",
  resourceType: "pdf",
  isFree: true,
  price: "",
  tags: "",
  isPublished: false,
  isFeatured: false,
  file: null,
};

function Admin() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [dataLoading, setDataLoading] = useState(false);

  const [activeSection, setActiveSection] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showSidebar, setShowSidebar] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("sk_admin_theme") === "dark"
  );

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);

  const [editingResource, setEditingResource] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.toggle("admin-dark", darkMode);
    localStorage.setItem("sk_admin_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadDashboard();
    }
  }, [session]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setLoading(false);
  }

  async function handleLogin(event) {
    event.preventDefault();

    setAuthError("");
    setLoginLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setAuthError(loginError.message);
    } else {
      setSession(data.session);
    }

    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
  }

  async function loadDashboard() {
    setDataLoading(true);

    const [resourcesResult, categoriesResult] = await Promise.all([
      supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
    ]);

    if (!resourcesResult.error) {
      setResources(resourcesResult.data || []);
    } else {
      setError(resourcesResult.error.message);
    }

    if (!categoriesResult.error && categoriesResult.data?.length) {
      setCategories(categoriesResult.data);
    }

    setDataLoading(false);
  }

  const stats = useMemo(() => {
    return {
      total: resources.length,
      published: resources.filter((item) => item.is_published).length,
      drafts: resources.filter((item) => !item.is_published).length,
      featured: resources.filter((item) => item.is_featured).length,
      categories: categories.length,
      free: resources.filter((item) => item.is_free).length,
      paid: resources.filter((item) => !item.is_free).length,
    };
  }, [resources, categories]);

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();

    return resources.filter((resource) => {
      const matchesSearch =
        !term ||
        [
          resource.title,
          resource.description,
          resource.category,
          ...(resource.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && resource.is_published) ||
        (statusFilter === "draft" && !resource.is_published);

      const matchesCategory =
        categoryFilter === "all" ||
        resource.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [resources, search, statusFilter, categoryFilter]);

  function openAddResource() {
    setEditingResource(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "Government Jobs",
    });
    setError("");
    setShowResourceModal(true);
    setShowSidebar(false);
  }

  function openEditResource(resource) {
    setEditingResource(resource);

    setForm({
      title: resource.title || "",
      description: resource.description || "",
      category: resource.category || "Government Jobs",
      resourceType: resource.resource_type || "pdf",
      isFree: resource.is_free ?? true,
      price: resource.price || "",
      tags: Array.isArray(resource.tags) ? resource.tags.join(", ") : "",
      isPublished: resource.is_published ?? false,
      isFeatured: resource.is_featured ?? false,
      file: null,
    });

    setError("");
    setShowResourceModal(true);
    setShowSidebar(false);
  }

  function openDetails(resource) {
    setSelectedResource(resource);
    setShowDetailModal(true);
  }

  function closeResourceModal() {
    if (saving) return;

    setShowResourceModal(false);
    setEditingResource(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSaveResource(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.title.trim()) {
      setError("Resource title required hai.");
      return;
    }

    if (!form.category) {
      setError("Category select karo.");
      return;
    }

    if (!editingResource && !form.file) {
      setError("PDF file select karo.");
      return;
    }

    if (!form.isFree && !form.price) {
      setError("Paid resource ke liye price enter karo.");
      return;
    }

    setSaving(true);

    try {
      let filePath = editingResource?.file_path || null;

      if (form.file) {
        if (form.file.type !== "application/pdf") {
          throw new Error("Sirf PDF files allowed hain.");
        }

        if (form.file.size > 20 * 1024 * 1024) {
          throw new Error("Maximum PDF size 20 MB hai.");
        }

        const safeName = form.file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-");

        const uniqueName = `${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(uniqueName, form.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: "application/pdf",
          });

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        filePath = uniqueName;

        if (editingResource?.file_path) {
          await supabase.storage
            .from("resources")
            .remove([editingResource.file_path]);
        }
      }

      const slug =
        editingResource?.slug ||
        `${form.title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-${Date.now()}`;

      const payload = {
        title: form.title.trim(),
        slug,
        description: form.description.trim(),
        category: form.category,
        resource_type: form.resourceType,
        file_path: filePath,
        file_url: null,
        external_url: null,
        thumbnail_url: null,
        is_free: form.isFree,
        price: form.isFree ? null : Number(form.price),
        is_published: form.isPublished,
        is_featured: form.isFeatured,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        updated_at: new Date().toISOString(),
      };

      if (editingResource) {
        const { error: updateError } = await supabase
          .from("resources")
          .update(payload)
          .eq("id", editingResource.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        setMessage("Resource successfully updated.");
      } else {
        const { error: insertError } = await supabase
          .from("resources")
          .insert(payload);

        if (insertError) {
          throw new Error(insertError.message);
        }

        setMessage("Resource successfully added.");
      }

      await loadDashboard();
      closeResourceModal();
    } catch (saveError) {
      setError(saveError.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(resource) {
    setError("");

    const { error: updateError } = await supabase
      .from("resources")
      .update({
        is_published: !resource.is_published,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resource.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      resource.is_published
        ? "Resource moved to draft."
        : "Resource published successfully."
    );

    await loadDashboard();
  }

  async function toggleFeatured(resource) {
    const { error: updateError } = await supabase
      .from("resources")
      .update({
        is_featured: !resource.is_featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", resource.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(
      resource.is_featured
        ? "Featured status removed."
        : "Resource marked as featured."
    );

    await loadDashboard();
  }

  async function deleteResource(resource) {
    const confirmed = window.confirm(
      `Delete "${resource.title || "this resource"}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");

    if (resource.file_path) {
      await supabase.storage
        .from("resources")
        .remove([resource.file_path]);
    }

    const { error: deleteError } = await supabase
      .from("resources")
      .delete()
      .eq("id", resource.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Resource deleted successfully.");
    await loadDashboard();
  }

  async function previewFile(resource) {
    if (!resource.file_path) {
      setError("Is resource ke saath file available nahi hai.");
      return;
    }

    const { data, error: signedError } = await supabase.storage
      .from("resources")
      .createSignedUrl(resource.file_path, 300);

    if (signedError) {
      setError(signedError.message);
      return;
    }

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <span>Loading Admin Panel...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin-page admin-auth-page">
        <div className="admin-login-card">
          <div className="admin-brand-mark">SK</div>

          <span className="admin-kicker">
            SK DIGITAL SERVICE
          </span>

          <h1>Admin Login</h1>

          <p className="admin-subtitle">
            Secure access to your Resource Hub.
          </p>

          <form onSubmit={handleLogin} className="admin-form">
            <label>
              Email
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            {authError && (
              <div className="admin-error">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="admin-primary-button"
              disabled={loginLoading}
            >
              {loginLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <a href="/" className="back-home">
            ← Back to Resource Hub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-app ${darkMode ? "dark-theme" : ""}`}>
      {showSidebar && (
        <div
          className="mobile-sidebar-overlay"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <aside
        className={`admin-sidebar ${
          showSidebar ? "mobile-sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-logo">SK</div>

          <div>
            <strong>SK DIGITAL</strong>
            <span>SERVICE</span>
          </div>

          <button
            className="mobile-sidebar-close"
            onClick={() => setShowSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-label">
          MANAGEMENT
        </div>

        <button
          className={`sidebar-item ${
            activeSection === "dashboard" ? "active" : ""
          }`}
          onClick={() => {
            setActiveSection("dashboard");
            setShowSidebar(false);
          }}
        >
          <LayoutDashboard size={19} />
          Dashboard
        </button>

        <button
          className={`sidebar-item ${
            activeSection === "resources" ? "active" : ""
          }`}
          onClick={() => {
            setActiveSection("resources");
            setShowSidebar(false);
          }}
        >
          <FileText size={19} />
          Resources
        </button>

        <button
          className="sidebar-item"
          onClick={openAddResource}
        >
          <Plus size={19} />
          Add Resource
        </button>

        <div className="sidebar-label">
          SYSTEM
        </div>

        <a href="/" className="sidebar-item">
          <FolderOpen size={19} />
          Public Website
        </a>

        <button
          className="sidebar-item sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-mobile-menu">
            <button onClick={() => setShowSidebar(true)}>
              <Menu size={21} />
            </button>
          </div>

          <div>
            <span className="admin-top-kicker">
              CONTROL CENTRE
            </span>

            <h1>
              {activeSection === "resources"
                ? "Resource Manager"
                : "Dashboard"}
            </h1>
          </div>

          <div className="admin-top-actions">
            <button
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={
                darkMode
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
            >
              {darkMode ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>

            <button
              className="admin-add-button"
              onClick={openAddResource}
            >
              <Plus size={18} />
              Add Resource
            </button>
          </div>
        </header>

        <div className="admin-content">
          {message && (
            <div className="admin-success toast-notification">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          {error && (
            <div className="admin-error admin-global-error">
              {error}

              <button onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}

          <section className="admin-stat-grid">
            <div className="admin-stat-card">
              <div className="stat-icon blue">
                <FileText size={21} />
              </div>

              <div>
                <span>Total Resources</span>
                <strong>{stats.total}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon green">
                <CheckCircle2 size={21} />
              </div>

              <div>
                <span>Published</span>
                <strong>{stats.published}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon orange">
                <Clock3 size={21} />
              </div>

              <div>
                <span>Drafts</span>
                <strong>{stats.drafts}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon purple">
                <Star size={21} />
              </div>

              <div>
                <span>Featured</span>
                <strong>{stats.featured}</strong>
              </div>
            </div>
          </section>

          <section className="admin-mini-stats">
            <div>
              <BookOpen size={17} />
              <span>Categories</span>
              <strong>{stats.categories}</strong>
            </div>

            <div>
              <Download size={17} />
              <span>Free Resources</span>
              <strong>{stats.free}</strong>
            </div>

            <div>
              <BarChart3 size={17} />
              <span>Paid Resources</span>
              <strong>{stats.paid}</strong>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-panel-kicker">
                  RESOURCE LIBRARY
                </span>

                <h2>
                  Manage Resources
                </h2>
              </div>

              <button
                className="admin-outline-button"
                onClick={openAddResource}
              >
                <UploadCloud size={17} />
                Upload Resource
              </button>
            </div>

            <div className="resource-toolbar">
              <div className="admin-search">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search resources..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="filter-wrap">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All Resources
                  </option>

                  <option value="published">
                    Published
                  </option>

                  <option value="draft">
                    Drafts
                  </option>
                </select>

                <ChevronDown size={16} />
              </div>

              <div className="filter-wrap">
                <select
                  value={categoryFilter}
                  onChange={(event) =>
                    setCategoryFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All Categories
                  </option>

                  {categories.map((category) => (
                    <option
                      key={category.slug || category.id}
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>

                <ChevronDown size={16} />
              </div>
            </div>

            {dataLoading ? (
              <div className="admin-empty">
                <div className="admin-spinner" />
                <p>Loading resources...</p>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="admin-empty">
                <div className="empty-icon">
                  <FileText size={27} />
                </div>

                <h3>
                  No resources yet
                </h3>

                <p>
                  Add your first PDF/resource and it will appear here.
                </p>

                <button
                  className="admin-primary-button small"
                  onClick={openAddResource}
                >
                  <Plus size={17} />
                  Add First Resource
                </button>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>RESOURCE</th>
                      <th>CATEGORY</th>
                      <th>TYPE</th>
                      <th>ACCESS</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredResources.map((resource) => (
                      <tr key={resource.id}>
                        <td>
                          <div className="table-resource">
                            <div className="table-file-icon">
                              <FileText size={19} />
                            </div>

                            <div>
                              <strong>
                                {resource.title ||
                                  "Untitled Resource"}
                              </strong>

                              <span>
                                {resource.description ||
                                  "No description"}
                              </span>
                            </div>

                            {resource.is_featured && (
                              <Star
                                size={15}
                                className="featured-star"
                                fill="currentColor"
                              />
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="table-category">
                            {resource.category}
                          </span>
                        </td>

                        <td>
                          <span className="type-badge">
                            {(resource.resource_type ||
                              "pdf").toUpperCase()}
                          </span>
                        </td>

                        <td>
                          {resource.is_free ? (
                            <span className="access-free">
                              FREE
                            </span>
                          ) : (
                            <span className="access-paid">
                              ₹{resource.price || "—"}
                            </span>
                          )}
                        </td>

                        <td>
                          <button
                            className={`status-toggle ${
                              resource.is_published
                                ? "published"
                                : "draft"
                            }`}
                            onClick={() =>
                              togglePublished(resource)
                            }
                          >
                            <span />

                            {resource.is_published
                              ? "Published"
                              : "Draft"}
                          </button>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              title="View Details"
                              onClick={() =>
                                openDetails(resource)
                              }
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              title="Preview PDF"
                              onClick={() =>
                                previewFile(resource)
                              }
                            >
                              <ExternalLink size={16} />
                            </button>

                            <button
                              title="Feature"
                              className={
                                resource.is_featured
                                  ? "featured-active"
                                  : ""
                              }
                              onClick={() =>
                                toggleFeatured(resource)
                              }
                            >
                              <Star
                                size={16}
                                fill={
                                  resource.is_featured
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>

                            <button
                              title="Edit"
                              onClick={() =>
                                openEditResource(resource)
                              }
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              title="Delete"
                              className="danger"
                              onClick={() =>
                                deleteResource(resource)
                              }
                            >
                              <Trash2 size={16} />
                            </button>

                            <button
                              title="More"
                              className="more-button"
                            >
                              <MoreVertical size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="admin-security-note">
            <ShieldCheck size={20} />

            <div>
              <strong>
                Secure admin workspace
              </strong>

              <span>
                Resource management is protected through Supabase
                Authentication and Row Level Security.
              </span>
            </div>
          </div>

          <div className="admin-footer">
            <span>
              SK DIGITAL SERVICE • Resource Management System
            </span>

            <BarChart3 size={17} />
          </div>
        </div>
      </main>

      {/* RESOURCE MODAL */}

      {showResourceModal && (
        <div className="modal-backdrop">
          <div className="resource-modal">
            <div className="modal-header">
              <div>
                <span className="admin-panel-kicker">
                  {editingResource
                    ? "EDIT RESOURCE"
                    : "NEW RESOURCE"}
                </span>

                <h2>
                  {editingResource
                    ? "Edit Resource"
                    : "Add New Resource"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeResourceModal}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="resource-form"
              onSubmit={handleSaveResource}
            >
              <div className="form-section">
                <h3>
                  Basic Information
                </h3>

                <div className="form-grid">
                  <label className="full">
                    Resource Title

                    <input
                      type="text"
                      placeholder="e.g. SSC CHSL 2026 GK Practice Set"
                      value={form.title}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          title: event.target.value,
                        })
                      }
                      required
                    />
                  </label>

                  <label className="full">
                    Description

                    <textarea
                      placeholder="Short description of this resource..."
                      rows="4"
                      value={form.description}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Category

                    <select
                      value={form.category}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          category:
                            event.target.value,
                        })
                      }
                    >
                      {categories.map((category) => (
                        <option
                          key={
                            category.slug ||
                            category.id
                          }
                          value={category.name}
                        >
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Resource Type

                    <select
                      value={form.resourceType}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          resourceType:
                            event.target.value,
                        })
                      }
                    >
                      <option value="pdf">
                        PDF
                      </option>

                      <option value="document">
                        Document
                      </option>

                      <option value="link">
                        External Link
                      </option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>
                  File & Access
                </h3>

                <label className="upload-box">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        file:
                          event.target.files?.[0] ||
                          null,
                      })
                    }
                  />

                  <UploadCloud size={30} />

                  <strong>
                    {form.file
                      ? form.file.name
                      : editingResource?.file_path
                      ? "Existing file saved • Click to replace"
                      : "Upload PDF"}
                  </strong>

                  <span>
                    PDF only • Maximum 20 MB • Secure Storage
                  </span>
                </label>

                <div className="access-options">
                  <button
                    type="button"
                    className={
                      form.isFree
                        ? "access-option active"
                        : "access-option"
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        isFree: true,
                        price: "",
                      })
                    }
                  >
                    <CheckCircle2 size={19} />

                    <div>
                      <strong>
                        Free Resource
                      </strong>

                      <span>
                        Everyone can access
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={
                      !form.isFree
                        ? "access-option active"
                        : "access-option"
                    }
                    onClick={() =>
                      setForm({
                        ...form,
                        isFree: false,
                      })
                    }
                  >
                    <span className="rupee-symbol">
                      ₹
                    </span>

                    <div>
                      <strong>
                        Paid Resource
                      </strong>

                      <span>
                        Payment required
                      </span>
                    </div>
                  </button>
                </div>

                {!form.isFree && (
                  <label>
                    Price

                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="e.g. 49"
                      value={form.price}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          price:
                            event.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </div>

              <div className="form-section">
                <h3>
                  Discovery & Publishing
                </h3>

                <div className="form-grid">
                  <label className="full">
                    Tags

                    <input
                      type="text"
                      placeholder="SSC, CHSL, GK, 2026"
                      value={form.tags}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          tags:
                            event.target.value,
                        })
                      }
                    />

                    <small>
                      Comma se separate karo.
                    </small>
                  </label>
                </div>

                <label className="publish-switch">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        isPublished:
                          event.target.checked,
                      })
                    }
                  />

                  <span className="fake-switch" />

                  <div>
                    <strong>
                      Publish this resource
                    </strong>

                    <small>
                      Published resources public website par
                      automatically show honge.
                    </small>
                  </div>
                </label>

                <label className="publish-switch">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        isFeatured:
                          event.target.checked,
                      })
                    }
                  />

                  <span className="fake-switch featured-switch" />

                  <div>
                    <strong>
                      Feature this resource
                    </strong>

                    <small>
                      Featured resources ko public website par
                      special placement diya ja sakta hai.
                    </small>
                  </div>
                </label>
              </div>

              {error && (
                <div className="admin-error modal-error">
                  {error}
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="admin-cancel-button"
                  onClick={closeResourceModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingResource
                    ? "Save Changes"
                    : "Create Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}

      {showDetailModal && selectedResource && (
        <div className="modal-backdrop">
          <div className="resource-detail-modal">
            <div className="detail-cover">
              <div className="detail-icon">
                <FileText size={32} />
              </div>

              <button
                className="modal-close detail-close"
                onClick={() =>
                  setShowDetailModal(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="resource-detail-content">
              <div className="detail-badges">
                <span>
                  {selectedResource.category}
                </span>

                {selectedResource.is_featured && (
                  <span className="featured-badge">
                    <Star size={12} fill="currentColor" />
                    Featured
                  </span>
                )}

                <span>
                  {selectedResource.is_published
                    ? "Published"
                    : "Draft"}
                </span>
              </div>

              <h2>
                {selectedResource.title}
              </h2>

              <p className="detail-description">
                {selectedResource.description ||
                  "No description available."}
              </p>

              <div className="detail-info-grid">
                <div>
                  <small>
                    RESOURCE TYPE
                  </small>

                  <strong>
                    {(
                      selectedResource.resource_type ||
                      "pdf"
                    ).toUpperCase()}
                  </strong>
                </div>

                <div>
                  <small>
                    ACCESS
                  </small>

                  <strong>
                    {selectedResource.is_free
                      ? "FREE"
                      : `₹${selectedResource.price}`}
                  </strong>
                </div>

                <div>
                  <small>
                    CREATED
                  </small>

                  <strong>
                    {selectedResource.created_at
                      ? new Date(
                          selectedResource.created_at
                        ).toLocaleDateString("en-IN")
                      : "—"}
                  </strong>
                </div>

                <div>
                  <small>
                    FILE
                  </small>

                  <strong>
                    {selectedResource.file_path
                      ? "Available"
                      : "Not uploaded"}
                  </strong>
                </div>
              </div>

              {selectedResource.tags?.length > 0 && (
                <div className="detail-tags">
                  {selectedResource.tags.map(
                    (tag) => (
                      <span key={tag}>
                        #{tag}
                      </span>
                    )
                  )}
                </div>
              )}

              <div className="detail-actions">
                <button
                  className="admin-outline-button"
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditResource(
                      selectedResource
                    );
                  }}
                >
                  <Edit3 size={17} />
                  Edit
                </button>

                <button
                  className="admin-primary-button"
                  onClick={() =>
                    previewFile(
                      selectedResource
                    )
                  }
                >
                  <Eye size={17} />
                  Preview Resource
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;
