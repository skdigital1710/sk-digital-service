import React, { useEffect, useMemo, useState } from "react";
import "./Admin.css";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardPaste,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  FolderOpen,
  Globe2,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Trash2,
  UploadCloud,
  Wand2,
  X,
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
  shortDescription: "",
  fullDescription: "",
  category: "Government Jobs",
  resourceType: "pdf",
  organization: "",
  postName: "",
  totalVacancies: "",
  qualification: "",
  ageLimit: "",
  applicationFee: "",
  jobLocation: "",
  applicationStartDate: "",
  lastDate: "",
  applyUrl: "",
  notificationUrl: "",
  officialWebsiteUrl: "",
  isFree: true,
  price: "",
  tags: "",
  isPublished: false,
  isFeatured: false,
  file: null,
  image: null,
  quickPaste: "",
};

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function extractUrls(text) {
  return String(text || "").match(/https?:\/\/[^\s<>'"\]]+/gi) || [];
}

function cleanValue(value) {
  return String(value || "")
    .replace(/^[\s:–—-]+|[\s:–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findAfterLabel(text, labels) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const label of labels) {
      const regex = new RegExp(`^${label}\\s*(?:[:\\-–—]|\\s){0,3}(.+)$`, "i");
      const match = line.match(regex);
      if (match?.[1]) return cleanValue(match[1]);
    }
  }
  return "";
}

function parseDateToInput(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (!match) return "";
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function autoParseJobText(text) {
  const source = String(text || "").trim();
  const urls = extractUrls(source);
  const lower = source.toLowerCase();

  const lines = source
    .split(/\r?\n/)
    .map((line) => cleanValue(line))
    .filter(Boolean);

  const org =
    findAfterLabel(source, [
      "department",
      "department / organization",
      "organization",
      "ministry",
      "recruiting organization",
    ]) ||
    lines.find((line) => /department|ministry|government|commission|board|authority/i.test(line)) ||
    "";

  const postName = findAfterLabel(source, [
    "post name",
    "post",
    "name of post",
    "posts",
    "post(s)",
  ]);

  const vacancies = findAfterLabel(source, [
    "total vacancies",
    "total post",
    "total posts",
    "no. of post",
    "no of post",
    "vacancy",
    "vacancies",
  ]);

  const qualification = findAfterLabel(source, [
    "qualification",
    "educational qualification",
    "eligibility",
  ]);

  const ageLimit = findAfterLabel(source, [
    "age limit",
    "age",
    "age eligibility",
  ]);

  const fee = findAfterLabel(source, [
    "application fee",
    "fee",
    "application fees",
  ]);

  const location = findAfterLabel(source, [
    "job location",
    "location",
    "place of posting",
  ]);

  const startRaw = findAfterLabel(source, [
    "application start",
    "applications start",
    "start date",
    "registration start",
    "application begins",
  ]);

  const lastRaw = findAfterLabel(source, [
    "last date",
    "last date to apply",
    "closing date",
    "application last date",
    "apply online till",
  ]);

  let title = findAfterLabel(source, [
    "title",
    "job title",
    "recruitment",
    "exam",
  ]);

  if (!title) {
    const likelyTitle = lines.find(
      (line) =>
        /recruitment|vacancy|bharti|sports quota|constable|assistant|clerk|mts|technician|officer|group|apprentice/i.test(line) &&
        line.length < 120
    );
    title = likelyTitle || lines.slice(0, 4).find((line) => line.length > 8 && line.length < 120) || "";
  }

  const applyIndex = lines.findIndex((line) => /apply.*(online|form)|apply now/i.test(line));
  const notificationIndex = lines.findIndex((line) => /notification|advertisement|official notice/i.test(line));
  const websiteIndex = lines.findIndex((line) => /official website|website/i.test(line));

  const urlNear = (index) => {
    if (index < 0) return "";
    const nearby = lines.slice(index, index + 3).join(" ");
    return extractUrls(nearby)[0] || "";
  };

  let applyUrl = urlNear(applyIndex);
  let notificationUrl = urlNear(notificationIndex);
  let officialWebsiteUrl = urlNear(websiteIndex);

  if (!applyUrl && urls[0]) applyUrl = urls[0];
  if (!notificationUrl && urls[1]) notificationUrl = urls[1];
  if (!officialWebsiteUrl && urls[2]) officialWebsiteUrl = urls[2];

  const description = lines
    .filter((line) => {
      const l = line.toLowerCase();
      return !extractUrls(line).length &&
        !/^(title|post name|post|organization|department|qualification|eligibility|age|age limit|application fee|fee|vacancy|vacancies|total post|total vacancies|job location|location|last date|start date|application start|official website|notification|apply online)/i.test(l);
    })
    .slice(0, 5)
    .join(" ");

  const tags = [org, postName, title]
    .join(",")
    .split(/[\s,|/]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 2)
    .slice(0, 12)
    .join(", ");

  return {
    title,
    organization: org,
    postName,
    totalVacancies: vacancies,
    qualification,
    ageLimit,
    applicationFee: fee,
    jobLocation: location,
    applicationStartDate: parseDateToInput(startRaw),
    lastDate: parseDateToInput(lastRaw),
    applyUrl: safeUrl(applyUrl),
    notificationUrl: safeUrl(notificationUrl),
    officialWebsiteUrl: safeUrl(officialWebsiteUrl),
    shortDescription: description,
    fullDescription: source,
    tags,
  };
}

function createThumbnailSvg(form) {
  const esc = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const title = esc(form.title || "Government Job Recruitment 2026");
  const org = esc(form.organization || "Government of India");
  const post = esc(form.postName || "Latest Recruitment");
  const vacancy = esc(form.totalVacancies || "—");
  const last = esc(form.lastDate ? form.lastDate.split("-").reverse().join("/") : "—");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#062a63"/><stop offset="58%" stop-color="#0b67d1"/><stop offset="100%" stop-color="#0b1f3a"/></linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ff8a00"/><stop offset="100%" stop-color="#ffc107"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-opacity=".28"/></filter>
  </defs>
  <rect width="1200" height="675" rx="34" fill="#f7fbff"/>
  <rect x="28" y="28" width="1144" height="619" rx="30" fill="url(#bg)" filter="url(#shadow)"/>
  <circle cx="1040" cy="90" r="170" fill="#fff" opacity=".06"/>
  <circle cx="1100" cy="560" r="220" fill="#ff8a00" opacity=".08"/>
  <text x="76" y="90" font-family="Arial, sans-serif" font-size="30" font-weight="800" fill="#ffffff">SK DIGITAL SERVICE</text>
  <text x="76" y="123" font-family="Arial, sans-serif" font-size="16" font-weight="600" fill="#d8eaff">Government Jobs • Forms • Digital Resources</text>
  <rect x="76" y="170" width="1048" height="2" fill="#ffffff" opacity=".18"/>
  <text x="76" y="238" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffd166">${org}</text>
  <text x="76" y="305" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="#ffffff">${title.slice(0, 42)}</text>
  <text x="76" y="354" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#dff0ff">${post.slice(0, 60)}</text>
  <rect x="76" y="407" width="290" height="86" rx="18" fill="#ffffff" opacity=".12" stroke="#ffffff" stroke-opacity=".22"/>
  <text x="98" y="440" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#cfe6ff">TOTAL VACANCIES</text>
  <text x="98" y="475" font-family="Arial, sans-serif" font-size="27" font-weight="900" fill="#ffffff">${vacancy}</text>
  <rect x="388" y="407" width="350" height="86" rx="18" fill="#ffffff" opacity=".12" stroke="#ffffff" stroke-opacity=".22"/>
  <text x="410" y="440" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#cfe6ff">LAST DATE</text>
  <text x="410" y="475" font-family="Arial, sans-serif" font-size="27" font-weight="900" fill="#ffffff">${last}</text>
  <rect x="76" y="531" width="310" height="64" rx="16" fill="url(#accent)"/>
  <text x="231" y="571" text-anchor="middle" font-family="Arial, sans-serif" font-size="23" font-weight="900" fill="#09244b">APPLY ONLINE</text>
  <text x="1085" y="570" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#dff0ff">OFFICIAL UPDATE</text>
</svg>`;
}

function svgToFile(svg, filename) {
  return new File([svg], filename, { type: "image/svg+xml" });
}

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
  const [darkMode, setDarkMode] = useState(localStorage.getItem("sk_admin_theme") === "dark");
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [editingResource, setEditingResource] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [parseMessage, setParseMessage] = useState("");

  useEffect(() => {
    document.body.classList.toggle("admin-dark", darkMode);
    localStorage.setItem("sk_admin_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) loadDashboard(); }, [session]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 3500); return () => clearTimeout(timer); }, [message]);

  async function checkSession() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setLoading(false);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthError(""); setLoginLoading(true);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (loginError) setAuthError(loginError.message); else setSession(data.session);
    setLoginLoading(false);
  }

  async function handleLogout() { await supabase.auth.signOut(); setSession(null); }

  async function loadDashboard() {
    setDataLoading(true);
    const [resourcesResult, categoriesResult] = await Promise.all([
      supabase.from("resources").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").eq("is_active", true).order("display_order", { ascending: true }),
    ]);
    if (!resourcesResult.error) setResources(resourcesResult.data || []); else setError(resourcesResult.error.message);
    if (!categoriesResult.error && categoriesResult.data?.length) setCategories(categoriesResult.data);
    setDataLoading(false);
  }

  const stats = useMemo(() => ({
    total: resources.length,
    published: resources.filter((item) => item.is_published).length,
    drafts: resources.filter((item) => !item.is_published).length,
    featured: resources.filter((item) => item.is_featured).length,
    categories: categories.length,
    free: resources.filter((item) => item.is_free).length,
    paid: resources.filter((item) => !item.is_free).length,
  }), [resources, categories]);

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesSearch = !term || [resource.title, resource.description, resource.short_description, resource.organization, resource.post_name, resource.category, ...(resource.tags || [])].filter(Boolean).join(" ").toLowerCase().includes(term);
      const matchesStatus = statusFilter === "all" || (statusFilter === "published" && resource.is_published) || (statusFilter === "draft" && !resource.is_published);
      const matchesCategory = categoryFilter === "all" || resource.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [resources, search, statusFilter, categoryFilter]);

  function openAddResource() {
    setEditingResource(null);
    setForm({ ...emptyForm, category: categories[0]?.name || "Government Jobs" });
    setParseMessage(""); setError(""); setShowResourceModal(true); setShowSidebar(false);
  }

  function openEditResource(resource) {
    setEditingResource(resource);
    setForm({
      ...emptyForm,
      title: resource.title || "",
      shortDescription: resource.short_description || resource.description || "",
      fullDescription: resource.full_description || resource.description || "",
      category: resource.category || "Government Jobs",
      resourceType: resource.resource_type || "pdf",
      organization: resource.organization || "",
      postName: resource.post_name || "",
      totalVacancies: resource.total_vacancies || "",
      qualification: resource.qualification || "",
      ageLimit: resource.age_limit || "",
      applicationFee: resource.application_fee || "",
      jobLocation: resource.job_location || "",
      applicationStartDate: resource.application_start_date || "",
      lastDate: resource.last_date || "",
      applyUrl: resource.apply_url || "",
      notificationUrl: resource.notification_url || "",
      officialWebsiteUrl: resource.official_website_url || "",
      isFree: resource.is_free ?? true,
      price: resource.price || "",
      tags: Array.isArray(resource.tags) ? resource.tags.join(", ") : "",
      isPublished: resource.is_published ?? false,
      isFeatured: resource.is_featured ?? false,
    });
    setParseMessage(""); setError(""); setShowResourceModal(true); setShowSidebar(false);
  }

  function openDetails(resource) { setSelectedResource(resource); setShowDetailModal(true); }

  function closeResourceModal() {
    if (saving) return;
    setShowResourceModal(false); setEditingResource(null); setForm(emptyForm); setError(""); setParseMessage("");
  }

  function parsePastedDetails() {
    if (!form.quickPaste.trim()) { setParseMessage("Pehle job details paste karo."); return; }
    const parsed = autoParseJobText(form.quickPaste);
    setForm((current) => ({ ...current, ...parsed }));
    setParseMessage("Details auto-filled. Ab sirf missing link/file/image check karo.");
  }

  function generateThumbnailPreview() {
    const svg = createThumbnailSvg(form);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function handleSaveResource(event) {
    event.preventDefault(); setError(""); setMessage("");
    if (!form.title.trim()) return setError("Resource title required hai.");
    if (!form.category) return setError("Category select karo.");
    if (!editingResource && !form.file) return setError("Official PDF select karo.");
    if (!form.isFree && !form.price) return setError("Paid resource ke liye price enter karo.");

    const urlFields = ["applyUrl", "notificationUrl", "officialWebsiteUrl"];
    for (const field of urlFields) {
      if (form[field] && !safeUrl(form[field])) return setError(`${field} me valid http/https link do.`);
    }

    setSaving(true);
    let uploadedPaths = [];
    try {
      let filePath = editingResource?.file_path || null;
      let imagePath = editingResource?.image_path || null;

      if (form.file) {
        if (form.file.type !== "application/pdf") throw new Error("Sirf PDF files allowed hain.");
        if (form.file.size > 20 * 1024 * 1024) throw new Error("Maximum PDF size 20 MB hai.");
        const safeName = form.file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const uniqueName = `pdf/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("resources").upload(uniqueName, form.file, { cacheControl: "3600", upsert: false, contentType: "application/pdf" });
        if (uploadError) throw new Error(`PDF upload failed: ${uploadError.message}`);
        filePath = uniqueName; uploadedPaths.push(uniqueName);
        if (editingResource?.file_path) await supabase.storage.from("resources").remove([editingResource.file_path]);
      }

      const thumbnailFile = form.image || svgToFile(createThumbnailSvg(form), `${slugify(form.title) || "job"}-${Date.now()}.svg`);
      if (form.image) {
        if (!form.image.type.startsWith("image/")) throw new Error("Thumbnail image valid image honi chahiye.");
        if (form.image.size > 5 * 1024 * 1024) throw new Error("Thumbnail maximum 5 MB honi chahiye.");
      }
      const imageName = `images/${Date.now()}-${slugify(form.title) || "resource"}.${form.image ? (form.image.name.split(".").pop() || "jpg") : "svg"}`;
      const { error: imageError } = await supabase.storage.from("resources").upload(imageName, thumbnailFile, { cacheControl: "3600", upsert: false, contentType: thumbnailFile.type });
      if (imageError) throw new Error(`Thumbnail upload failed: ${imageError.message}`);
      imagePath = imageName; uploadedPaths.push(imageName);
      if (editingResource?.image_path) await supabase.storage.from("resources").remove([editingResource.image_path]);

      const slug = editingResource?.slug || `${slugify(form.title) || "resource"}-${Date.now()}`;
      const payload = {
        title: form.title.trim(),
        slug,
        description: form.shortDescription.trim(),
        short_description: form.shortDescription.trim(),
        full_description: form.fullDescription.trim(),
        category: form.category,
        resource_type: form.resourceType,
        organization: form.organization.trim(),
        post_name: form.postName.trim(),
        total_vacancies: form.totalVacancies.trim(),
        qualification: form.qualification.trim(),
        age_limit: form.ageLimit.trim(),
        application_fee: form.applicationFee.trim(),
        job_location: form.jobLocation.trim(),
        application_start_date: form.applicationStartDate || null,
        last_date: form.lastDate || null,
        apply_url: safeUrl(form.applyUrl) || null,
        notification_url: safeUrl(form.notificationUrl) || null,
        official_website_url: safeUrl(form.officialWebsiteUrl) || null,
        file_path: filePath,
        image_path: imagePath,
        file_url: null,
        external_url: safeUrl(form.applyUrl) || null,
        thumbnail_url: null,
        is_free: form.isFree,
        price: form.isFree ? null : Number(form.price),
        is_published: form.isPublished,
        is_featured: form.isFeatured,
        tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };

      if (editingResource) {
        const { error: updateError } = await supabase.from("resources").update(payload).eq("id", editingResource.id);
        if (updateError) throw new Error(updateError.message);
        setMessage("V3 resource successfully updated.");
      } else {
        const { error: insertError } = await supabase.from("resources").insert(payload);
        if (insertError) throw new Error(insertError.message);
        setMessage("V3 resource successfully created.");
      }
      await loadDashboard(); closeResourceModal();
    } catch (saveError) {
      if (uploadedPaths.length) await supabase.storage.from("resources").remove(uploadedPaths);
      setError(saveError.message || "Something went wrong.");
    } finally { setSaving(false); }
  }

  async function togglePublished(resource) {
    setError("");
    const { error: updateError } = await supabase.from("resources").update({ is_published: !resource.is_published, updated_at: new Date().toISOString() }).eq("id", resource.id);
    if (updateError) return setError(updateError.message);
    setMessage(resource.is_published ? "Resource moved to draft." : "Resource published successfully.");
    await loadDashboard();
  }

  async function toggleFeatured(resource) {
    const { error: updateError } = await supabase.from("resources").update({ is_featured: !resource.is_featured, updated_at: new Date().toISOString() }).eq("id", resource.id);
    if (updateError) return setError(updateError.message);
    setMessage(resource.is_featured ? "Featured status removed." : "Resource marked as featured.");
    await loadDashboard();
  }

  async function deleteResource(resource) {
    if (!window.confirm(`Delete "${resource.title || "this resource"}"?\n\nThis action cannot be undone.`)) return;
    setError("");
    const paths = [resource.file_path, resource.image_path].filter(Boolean);
    if (paths.length) await supabase.storage.from("resources").remove(paths);
    const { error: deleteError } = await supabase.from("resources").delete().eq("id", resource.id);
    if (deleteError) return setError(deleteError.message);
    setMessage("Resource deleted successfully."); await loadDashboard();
  }

  async function previewFile(resource) {
    if (!resource.file_path) return setError("Is resource ke saath PDF available nahi hai.");
    const { data, error: signedError } = await supabase.storage.from("resources").createSignedUrl(resource.file_path, 300);
    if (signedError) return setError(signedError.message);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function previewImage(resource) {
    if (!resource.image_path) return setError("Thumbnail available nahi hai.");
    const { data, error: signedError } = await supabase.storage.from("resources").createSignedUrl(resource.image_path, 300);
    if (signedError) return setError(signedError.message);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) return <div className="admin-page"><div className="admin-loading"><div className="admin-spinner"/><span>Loading Admin Panel...</span></div></div>;

  if (!session) return (
    <div className="admin-page admin-auth-page">
      <div className="admin-login-glow"/>
      <div className="admin-login-card">
        <div className="admin-brand-mark">SK</div>
        <span className="admin-kicker">SK DIGITAL SERVICE</span>
        <h1>Admin Login</h1>
        <p className="admin-subtitle">Secure access to your premium Resource Hub.</p>
        <form onSubmit={handleLogin} className="admin-form">
          <label>Email<input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required/></label>
          <label>Password<input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required/></label>
          {authError && <div className="admin-error">{authError}</div>}
          <button type="submit" className="admin-primary-button" disabled={loginLoading}>{loginLoading ? "Signing in..." : "Sign in"}</button>
        </form>
        <a href="/" className="back-home">← Back to Resource Hub</a>
      </div>
    </div>
  );

  return (
    <div className={`admin-app ${darkMode ? "dark-theme" : ""}`}>
      {showSidebar && <div className="mobile-sidebar-overlay" onClick={() => setShowSidebar(false)}/>} 
      <aside className={`admin-sidebar ${showSidebar ? "mobile-sidebar-open" : ""}`}>
        <div className="sidebar-brand"><div className="sidebar-logo">SK</div><div><strong>SK DIGITAL</strong><span>SERVICE</span></div><button className="mobile-sidebar-close" onClick={() => setShowSidebar(false)}><X size={18}/></button></div>
        <div className="sidebar-label">MANAGEMENT</div>
        <button className={`sidebar-item ${activeSection === "dashboard" ? "active" : ""}`} onClick={() => {setActiveSection("dashboard");setShowSidebar(false)}}><LayoutDashboard size={19}/>Dashboard</button>
        <button className={`sidebar-item ${activeSection === "resources" ? "active" : ""}`} onClick={() => {setActiveSection("resources");setShowSidebar(false)}}><FileText size={19}/>Resources</button>
        <button className="sidebar-item" onClick={openAddResource}><Wand2 size={19}/>Quick Job Builder</button>
        <div className="sidebar-label">SYSTEM</div>
        <a href="/" className="sidebar-item"><Globe2 size={19}/>Public Website</a>
        <button className="sidebar-item sidebar-logout" onClick={handleLogout}><LogOut size={19}/>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-mobile-menu"><button onClick={() => setShowSidebar(true)}><Menu size={21}/></button></div>
          <div><span className="admin-top-kicker">CONTROL CENTRE • V3</span><h1>{activeSection === "resources" ? "Resource Manager" : "Dashboard"}</h1></div>
          <div className="admin-top-actions"><button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="admin-add-button" onClick={openAddResource}><Sparkles size={17}/>Quick Job Builder</button></div>
        </header>

        <div className="admin-content">
          {message && <div className="admin-success toast-notification"><CheckCircle2 size={18}/>{message}</div>}
          {error && <div className="admin-error admin-global-error">{error}<button onClick={() => setError("")}><X size={16}/></button></div>}

          <section className="admin-hero-card"><div><span>PREMIUM RESOURCE ENGINE</span><h2>Paste once. Build a complete job page.</h2><p>Job details, thumbnail, PDF and real application links — one controlled workflow.</p></div><div className="hero-orb"><Wand2 size={34}/></div></section>

          <section className="admin-stat-grid">
            {[["Total Resources",stats.total,"blue",FileText],["Published",stats.published,"green",CheckCircle2],["Drafts",stats.drafts,"orange",CalendarDays],["Featured",stats.featured,"purple",Star]].map(([label,value,kind,Icon]) => <div className="admin-stat-card" key={label}><div className={`stat-icon ${kind}`}><Icon size={21}/></div><div><span>{label}</span><strong>{value}</strong></div></div>)}
          </section>

          <section className="admin-mini-stats"><div><BookOpen size={17}/><span>Categories</span><strong>{stats.categories}</strong></div><div><Download size={17}/><span>Free Resources</span><strong>{stats.free}</strong></div><div><BarChart3 size={17}/><span>Paid Resources</span><strong>{stats.paid}</strong></div></section>

          <section className="admin-panel">
            <div className="admin-panel-header"><div><span className="admin-panel-kicker">RESOURCE LIBRARY</span><h2>Manage Resources</h2></div><button className="admin-outline-button" onClick={openAddResource}><UploadCloud size={17}/>Upload Resource</button></div>
            <div className="resource-toolbar"><div className="admin-search"><Search size={18}/><input type="search" placeholder="Search title, post, department..." value={search} onChange={(e) => setSearch(e.target.value)}/></div><div className="filter-wrap"><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Resources</option><option value="published">Published</option><option value="draft">Drafts</option></select><ChevronDown size={16}/></div><div className="filter-wrap"><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All Categories</option>{categories.map((c) => <option key={c.slug || c.id} value={c.name}>{c.name}</option>)}</select><ChevronDown size={16}/></div></div>
            {dataLoading ? <div className="admin-empty"><div className="admin-spinner"/><p>Loading resources...</p></div> : filteredResources.length === 0 ? <div className="admin-empty"><div className="empty-icon"><FileText size={27}/></div><h3>No resources yet</h3><p>Paste a job notification and build your first premium page.</p><button className="admin-primary-button small" onClick={openAddResource}><Wand2 size={17}/>Start Quick Builder</button></div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>RESOURCE</th><th>CATEGORY</th><th>JOB</th><th>ACCESS</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{filteredResources.map((resource) => <tr key={resource.id}><td><div className="table-resource"><div className="table-file-icon">{resource.image_path ? <FileImage size={19}/> : <FileText size={19}/>}</div><div><strong>{resource.title || "Untitled Resource"}</strong><span>{resource.organization || resource.description || "No description"}</span></div>{resource.is_featured && <Star size={15} className="featured-star" fill="currentColor"/>}</div></td><td><span className="table-category">{resource.category}</span></td><td><span className="job-mini">{resource.post_name || "—"}</span><small>{resource.total_vacancies ? `${resource.total_vacancies} vacancies` : ""}</small></td><td>{resource.is_free ? <span className="access-free">FREE</span> : <span className="access-paid">₹{resource.price || "—"}</span>}</td><td><button className={`status-toggle ${resource.is_published ? "published" : "draft"}`} onClick={() => togglePublished(resource)}><span/>{resource.is_published ? "Published" : "Draft"}</button></td><td><div className="table-actions"><button title="View Details" onClick={() => openDetails(resource)}><Eye size={16}/></button><button title="Preview PDF" onClick={() => previewFile(resource)}><ExternalLink size={16}/></button><button title="Thumbnail" onClick={() => previewImage(resource)}><FileImage size={16}/></button><button title="Feature" className={resource.is_featured ? "featured-active" : ""} onClick={() => toggleFeatured(resource)}><Star size={16} fill={resource.is_featured ? "currentColor" : "none"}/></button><button title="Edit" onClick={() => openEditResource(resource)}><Edit3 size={16}/></button><button title="Delete" className="danger" onClick={() => deleteResource(resource)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table></div>}
          </section>

          <div className="admin-security-note"><ShieldCheck size={20}/><div><strong>Secure admin workspace</strong><span>Supabase Authentication + Row Level Security protect resource management.</span></div></div>
          <div className="admin-footer"><span>SK DIGITAL SERVICE • Premium Resource Management System</span><BarChart3 size={17}/></div>
        </div>
      </main>

      {showResourceModal && <div className="modal-backdrop"><div className="resource-modal v3-modal">
        <div className="modal-header"><div><span className="admin-panel-kicker">{editingResource ? "EDIT RESOURCE" : "QUICK JOB BUILDER"}</span><h2>{editingResource ? "Edit Resource" : "Paste → Auto Build"}</h2><p>Maximum automation • minimum manual entry</p></div><button className="modal-close" onClick={closeResourceModal} disabled={saving}><X size={20}/></button></div>
        <form className="resource-form" onSubmit={handleSaveResource}>
          {!editingResource && <div className="quick-paste-box"><div className="quick-paste-head"><div><span className="step-pill">STEP 01</span><h3>Paste Job Details</h3><p>Source website se copied text yahan paste karo. System common labels se details auto-fill karega.</p></div><ClipboardPaste size={30}/></div><textarea rows="8" placeholder="Example:\nGovernment of India\nIncome Tax Department\nPost Name: Tax Assistant\nTotal Vacancies: 82\nQualification: Degree from a recognized University\nAge Limit: 18–27 years\nApplication Fee: No Fee\nApplication Start: 27/08/2026\nLast Date: 30/09/2026\nApply Online: https://example.gov.in/apply" value={form.quickPaste} onChange={(e) => setForm({...form, quickPaste:e.target.value})}/><div className="quick-paste-actions"><button type="button" className="admin-primary-button small" onClick={parsePastedDetails}><Wand2 size={17}/>Auto Fill Details</button><button type="button" className="admin-outline-button small" onClick={() => setForm({...form, quickPaste:""})}>Clear</button></div>{parseMessage && <div className="parse-success"><CheckCircle2 size={16}/>{parseMessage}</div>}</div>}

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 02</span><div><h3>Job Identity</h3><p>Auto-filled values ko zarurat ho to edit kar sakte ho.</p></div></div><div className="form-grid"><label className="full">Job / Resource Title<input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder="Sports Person Recruitment 2026" required/></label><label>Organization / Department<input value={form.organization} onChange={(e)=>setForm({...form,organization:e.target.value})} placeholder="Income Tax Department"/></label><label>Post Name<input value={form.postName} onChange={(e)=>setForm({...form,postName:e.target.value})} placeholder="Tax Assistant / MTS"/></label><label>Total Vacancies<input value={form.totalVacancies} onChange={(e)=>setForm({...form,totalVacancies:e.target.value})} placeholder="82"/></label><label>Job Location<input value={form.jobLocation} onChange={(e)=>setForm({...form,jobLocation:e.target.value})} placeholder="All India / Department location"/></label><label>Category<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}>{categories.map((c)=><option key={c.slug || c.id} value={c.name}>{c.name}</option>)}</select></label><label>Resource Type<select value={form.resourceType} onChange={(e)=>setForm({...form,resourceType:e.target.value})}><option value="pdf">PDF</option><option value="document">Document</option><option value="link">External Link</option></select></label></div></div>

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 03</span><div><h3>Eligibility & Dates</h3><p>Ye fields public job page par premium cards me show honge.</p></div></div><div className="form-grid"><label className="full">Qualification / Eligibility<textarea rows="3" value={form.qualification} onChange={(e)=>setForm({...form,qualification:e.target.value})} placeholder="Educational qualification and eligibility details"/></label><label>Age Limit<input value={form.ageLimit} onChange={(e)=>setForm({...form,ageLimit:e.target.value})} placeholder="18–27 years"/></label><label>Application Fee<input value={form.applicationFee} onChange={(e)=>setForm({...form,applicationFee:e.target.value})} placeholder="No Fee / ₹100"/></label><label>Application Start<input type="date" value={form.applicationStartDate} onChange={(e)=>setForm({...form,applicationStartDate:e.target.value})}/></label><label>Last Date<input type="date" value={form.lastDate} onChange={(e)=>setForm({...form,lastDate:e.target.value})}/></label></div></div>

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 04</span><div><h3>Live Links</h3><p>Ye buttons public page par actual clickable <code>href</code> links honge.</p></div><Link2 size={28}/></div><div className="form-grid"><label className="full">Apply Online URL<input type="url" value={form.applyUrl} onChange={(e)=>setForm({...form,applyUrl:e.target.value})} placeholder="https://official-website.gov.in/apply"/><small>Primary orange Apply Now button isi URL ko open karega.</small></label><label>Notification URL<input type="url" value={form.notificationUrl} onChange={(e)=>setForm({...form,notificationUrl:e.target.value})} placeholder="https://.../notification.pdf"/></label><label>Official Website URL<input type="url" value={form.officialWebsiteUrl} onChange={(e)=>setForm({...form,officialWebsiteUrl:e.target.value})} placeholder="https://official.gov.in"/></label></div></div>

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 05</span><div><h3>Content</h3><p>Short text cards ke liye; full text detail page ke liye.</p></div></div><div className="form-grid"><label className="full">Short Description<textarea rows="3" value={form.shortDescription} onChange={(e)=>setForm({...form,shortDescription:e.target.value})} placeholder="2–4 line summary"/></label><label className="full">Full Description<textarea rows="7" value={form.fullDescription} onChange={(e)=>setForm({...form,fullDescription:e.target.value})} placeholder="Complete recruitment details / copied notification summary"/></label><label className="full">Tags<input value={form.tags} onChange={(e)=>setForm({...form,tags:e.target.value})} placeholder="Income Tax, Sports Quota, Tax Assistant, MTS, 2026"/></label></div></div>

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 06</span><div><h3>PDF + Thumbnail</h3><p>Thumbnail upload optional hai — agar image nahi doge to system automatically premium thumbnail banayega.</p></div><FileImage size={28}/></div><div className="media-upload-grid"><label className="upload-box premium-upload"><input type="file" accept=".pdf,application/pdf" onChange={(e)=>setForm({...form,file:e.target.files?.[0] || null})}/><UploadCloud size={30}/><strong>{form.file ? form.file.name : editingResource?.file_path ? "Existing PDF saved • Click to replace" : "Upload Official PDF"}</strong><span>PDF • Max 20 MB • Private Storage</span></label><label className="upload-box premium-upload"><input type="file" accept="image/*" onChange={(e)=>setForm({...form,image:e.target.files?.[0] || null})}/><FileImage size={30}/><strong>{form.image ? form.image.name : editingResource?.image_path ? "Existing thumbnail saved • Click to replace" : "Upload Thumbnail (Optional)"}</strong><span>Image • Max 5 MB • Auto-generated if empty</span></label></div><div className="thumbnail-actions"><button type="button" className="admin-outline-button" onClick={generateThumbnailPreview}><Eye size={17}/>Preview Auto Thumbnail</button><span>Recommended: 1200 × 675</span></div></div>

          <div className="form-section"><div className="section-heading"><span className="step-pill">STEP 07</span><div><h3>Publishing & Access</h3><p>Save as draft or publish instantly.</p></div></div><div className="access-options"><button type="button" className={`access-option ${form.isFree ? "active" : ""}`} onClick={()=>setForm({...form,isFree:true,price:""})}><CheckCircle2 size={19}/><div><strong>Free Resource</strong><span>Public access</span></div></button><button type="button" className={`access-option ${!form.isFree ? "active" : ""}`} onClick={()=>setForm({...form,isFree:false})}><span className="rupee-symbol">₹</span><div><strong>Paid Resource</strong><span>Payment flow later</span></div></button></div>{!form.isFree && <label className="price-field">Price<input type="number" min="1" step="0.01" value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} placeholder="49"/></label>}<label className="publish-switch"><input type="checkbox" checked={form.isPublished} onChange={(e)=>setForm({...form,isPublished:e.target.checked})}/><span className="fake-switch"/><div><strong>Publish this resource</strong><small>Published resources public website par automatically show honge.</small></div></label><label className="publish-switch"><input type="checkbox" checked={form.isFeatured} onChange={(e)=>setForm({...form,isFeatured:e.target.checked})}/><span className="fake-switch featured-switch"/><div><strong>Feature this resource</strong><small>Featured resources ko premium placement diya ja sakta hai.</small></div></label></div>

          {error && <div className="admin-error modal-error">{error}</div>}
          <div className="modal-actions"><button type="button" className="admin-cancel-button" onClick={closeResourceModal} disabled={saving}>Cancel</button><button type="submit" className="admin-primary-button" disabled={saving}>{saving ? "Building..." : editingResource ? "Save V3 Changes" : "Build Resource"}</button></div>
        </form>
      </div></div>}

      {showDetailModal && selectedResource && <div className="modal-backdrop"><div className="resource-detail-modal v3-detail-modal"><div className="detail-cover"><div className="detail-icon"><Sparkles size={32}/></div><button className="modal-close detail-close" onClick={()=>setShowDetailModal(false)}><X size={20}/></button></div><div className="resource-detail-content"><div className="detail-badges"><span>{selectedResource.category}</span>{selectedResource.is_featured && <span className="featured-badge"><Star size={12} fill="currentColor"/>Featured</span>}<span>{selectedResource.is_published ? "Published" : "Draft"}</span></div><h2>{selectedResource.title}</h2><p className="detail-description">{selectedResource.short_description || selectedResource.description || "No description available."}</p><div className="detail-job-grid">{[["Organization",selectedResource.organization],["Post",selectedResource.post_name],["Vacancies",selectedResource.total_vacancies],["Qualification",selectedResource.qualification],["Age Limit",selectedResource.age_limit],["Fee",selectedResource.application_fee],["Start Date",selectedResource.application_start_date],["Last Date",selectedResource.last_date]].map(([k,v])=><div key={k}><small>{k}</small><strong>{v || "—"}</strong></div>)}</div><div className="detail-link-row">{selectedResource.apply_url && <a href={selectedResource.apply_url} target="_blank" rel="noreferrer" className="detail-apply"><ExternalLink size={17}/>Apply Now</a>}{selectedResource.notification_url && <a href={selectedResource.notification_url} target="_blank" rel="noreferrer" className="detail-link"><FileText size={17}/>Notification</a>}{selectedResource.official_website_url && <a href={selectedResource.official_website_url} target="_blank" rel="noreferrer" className="detail-link"><Globe2 size={17}/>Official Website</a>}</div><div className="detail-actions"><button className="admin-outline-button" onClick={()=>previewImage(selectedResource)}><FileImage size={17}/>Thumbnail</button><button className="admin-outline-button" onClick={()=>{setShowDetailModal(false);openEditResource(selectedResource)}}><Edit3 size={17}/>Edit</button><button className="admin-primary-button" onClick={()=>previewFile(selectedResource)}><Eye size={17}/>Preview PDF</button></div></div></div></div>}
    </div>
  );
}

export default Admin;
