import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Edit3,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const fallbackCategories = [
  {
    name: "Government Jobs",
    slug: "government-jobs",
    icon: "💼",
  },
  {
    name: "SSC",
    slug: "ssc",
    icon: "📚",
  },
  {
    name: "Study Material",
    slug: "study-material",
    icon: "📖",
  },
  {
    name: "Government Forms",
    slug: "government-forms",
    icon: "📄",
  },
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

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      categories: categories.length,
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

      return matchesSearch && matchesStatus;
    });
  }, [resources, search, statusFilter]);

  function openAddResource() {
    setEditingResource(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.name || "Government Jobs",
    });
    setError("");
    setMessage("");
    setShowResourceModal(true);
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
      file: null,
    });

    setError("");
    setMessage("");
    setShowResourceModal(true);
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

      /*
       * File upload
       *
       * Bucket: resources
       */
      if (form.file) {
        const safeName = form.file.name
          .toLowerCase()
          .replace(/[^a-z0-9.]+/g, "-");

        const uniqueName = `${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("resources")
          .upload(uniqueName, form.file, {
            cacheControl: "3600",
            upsert: false,
            contentType: form.file.type || "application/pdf",
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

      setTimeout(() => {
        closeResourceModal();
      }, 600);
    } catch (saveError) {
      setError(saveError.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(resource) {
    setError("");
    setMessage("");

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

  async function deleteResource(resource) {
    const confirmed = window.confirm(
      `Delete "${resource.title || "this resource"}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

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

          <span className="admin-kicker">SK DIGITAL SERVICE</span>

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
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">SK</div>

          <div>
            <strong>SK DIGITAL</strong>
            <span>SERVICE</span>
          </div>
        </div>

        <div className="sidebar-label">MANAGEMENT</div>

        <button
          className={`sidebar-item ${
            activeSection === "dashboard" ? "active" : ""
          }`}
          onClick={() => setActiveSection("dashboard")}
        >
          <LayoutDashboard size={19} />
          Dashboard
        </button>

        <button
          className={`sidebar-item ${
            activeSection === "resources" ? "active" : ""
          }`}
          onClick={() => setActiveSection("resources")}
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

        <div className="sidebar-label">SYSTEM</div>

        <a
          href="/"
          className="sidebar-item"
        >
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
          <div>
            <span className="admin-top-kicker">CONTROL CENTRE</span>
            <h1>
              {activeSection === "resources"
                ? "Resource Manager"
                : "Dashboard"}
            </h1>
          </div>

          <button
            className="admin-add-button"
            onClick={openAddResource}
          >
            <Plus size={18} />
            Add Resource
          </button>
        </header>

        <div className="admin-content">
          {message && (
            <div className="admin-success">
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
                <Edit3 size={21} />
              </div>

              <div>
                <span>Drafts</span>
                <strong>{stats.drafts}</strong>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="stat-icon purple">
                <BookOpen size={21} />
              </div>

              <div>
                <span>Categories</span>
                <strong>{stats.categories}</strong>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <span className="admin-panel-kicker">
                  RESOURCE LIBRARY
                </span>
                <h2>Manage Resources</h2>
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
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <div className="filter-wrap">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="all">All Resources</option>
                  <option value="published">Published</option>
                  <option value="draft">Drafts</option>
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

                <h3>No resources yet</h3>

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
                      <th />
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
                          </div>
                        </td>

                        <td>
                          <span className="table-category">
                            {resource.category}
                          </span>
                        </td>

                        <td>
                          <span className="type-badge">
                            {(
                              resource.resource_type || "pdf"
                            ).toUpperCase()}
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
              <strong>Secure admin workspace</strong>
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
                <h3>Basic Information</h3>

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
                          description: event.target.value,
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
                          category: event.target.value,
                        })
                      }
                    >
                      {categories.map((category) => (
                        <option
                          key={category.slug || category.id}
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
                          resourceType: event.target.value,
                        })
                      }
                    >
                      <option value="pdf">PDF</option>
                      <option value="document">Document</option>
                      <option value="link">External Link</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <h3>File & Access</h3>

                <label className="upload-box">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        file: event.target.files?.[0] || null,
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
                    PDF files only • Secure storage
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
                      <strong>Free Resource</strong>
                      <span>Everyone can access</span>
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
                    <span className="rupee-symbol">₹</span>
                    <div>
                      <strong>Paid Resource</strong>
                      <span>Payment required</span>
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
                          price: event.target.value,
                        })
                      }
                    />
                  </label>
                )}
              </div>

              <div className="form-section">
                <h3>Discovery & Publishing</h3>

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
                          tags: event.target.value,
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
                        isPublished: event.target.checked,
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
    </div>
  );
}

export default Admin;
