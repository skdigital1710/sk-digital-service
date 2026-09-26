import React, { useEffect, useMemo, useState } from "react";
import "./Admin.css";
import {
  BarChart3, Bell, CheckCircle2, Edit3, ExternalLink, Eye, FileText,
  FolderOpen, Image as ImageIcon, LayoutDashboard, Link as LinkIcon,
  LogOut, Menu, Moon, Plus, RefreshCw, Search, Settings, ShieldCheck,
  Star, Sun, Trash2, UploadCloud, X, Megaphone, Save, Clock3, Sparkles
} from "lucide-react";
import { supabase } from "./lib/supabase";

const JOB_CATEGORIES = ["SSC", "GDS", "Railway", "Banking", "Defence", "Police", "Teaching", "Other"];
const fallbackCategories = [
  { name: "Government Jobs", slug: "government-jobs", icon: "💼" },
  ...JOB_CATEGORIES.map((name) => ({ name, slug: name.toLowerCase(), icon: "" })),
  { name: "Study Material", slug: "study-material", icon: "📖" },
  { name: "Government Forms", slug: "government-forms", icon: "📄" },
];

const emptyForm = {
  title: "", shortDescription: "", fullDescription: "", category: "Government Jobs", jobCategory: "Other",
  organization: "", postName: "", totalVacancies: "", qualification: "", ageLimit: "", applicationFee: "",
  jobLocation: "", applicationStartDate: "", lastDate: "", applyUrl: "", notificationUrl: "", officialWebsiteUrl: "",
  resourceType: "pdf", isFree: true, price: "", tags: "", isPublished: false, isFeatured: false,
  file: null, image: null, organizationLogo: null, organizationLogoUrl: "", organizationLogoPath: null,
};

function slugify(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}
function normalizeDate(value) { return value ? String(value).slice(0, 10) : ""; }
function parseDateFromText(text) {
  const m = String(text || "").match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : "";
}
function firstMatch(text, patterns) {
  for (const p of patterns) { const m = text.match(p); if (m?.[1]) return m[1].trim(); }
  return "";
}
function parseJobText(text) {
  const t = String(text || "");
  const get = (labels) => firstMatch(t, labels.map(l => new RegExp(`${l}\\s*[:\\-]\\s*([^\\n\\r]+)`, "i")));
  const urls = [...t.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(m => m[0].replace(/[),.;]+$/,""));
  const title = get(["Post Name", "Job Title", "Recruitment", "Vacancy", "Position"]) || t.split(/\r?\n/).find(x => x.trim())?.trim() || "";
  const organization = get(["Organization", "Department", "Company", "Board", "Recruiting Organization"]);
  const postName = get(["Post Name", "Post", "Position"]);
  const totalVacancies = get(["Total Vacancies", "Vacancies", "No. of Vacancies", "Number of Vacancies"]);
  const qualification = get(["Qualification", "Educational Qualification", "Eligibility", "Education"]);
  const ageLimit = get(["Age Limit", "Age"]);
  const applicationFee = get(["Application Fee", "Fee", "Exam Fee"]);
  const jobLocation = get(["Job Location", "Location", "Posting"]);
  const applicationStartDate = get(["Application Start Date", "Start Date", "Apply Start", "Registration Starts"]) || parseDateFromText(t);
  const lastDate = get(["Last Date", "Last Date to Apply", "Closing Date", "Application Last Date"]);
  const applyUrl = firstMatch(t, [/Apply\s*(?:Online|Now)?\s*[:\-]?\s*(https?:\/\/[^\s]+)/i]) || urls[0] || "";
  const notificationUrl = firstMatch(t, [/Notification\s*(?:PDF|Link)?\s*[:\-]?\s*(https?:\/\/[^\s]+)/i]) || "";
  const officialWebsiteUrl = firstMatch(t, [/Official\s*Website\s*[:\-]?\s*(https?:\/\/[^\s]+)/i]) || "";
  let jobCategory = "Other";
  const low = `${title} ${organization} ${postName}`.toLowerCase();
  if (/ssc|chsl|cgl|cpo|mts/.test(low)) jobCategory = "SSC";
  else if (/gds|india post|post office/.test(low)) jobCategory = "GDS";
  else if (/railway|rrb|ntpc|group d/.test(low)) jobCategory = "Railway";
  else if (/ibps|bank|sbi|rbi/.test(low)) jobCategory = "Banking";
  else if (/army|navy|air force|defence|aoc|ship building/.test(low)) jobCategory = "Defence";
  else if (/police|constable|si |sub inspector/.test(low)) jobCategory = "Police";
  else if (/teacher|teaching|school|professor|lecturer/.test(low)) jobCategory = "Teaching";
  const shortDescription = organization ? `${organization} recruitment update${postName ? ` for ${postName}` : ""}.` : title;
  const fullDescription = t.trim();
  return { title, organization, postName, totalVacancies, qualification, ageLimit, applicationFee, jobLocation, applicationStartDate, lastDate, applyUrl, notificationUrl, officialWebsiteUrl, jobCategory, shortDescription, fullDescription };
}

function Admin() {
  const [session, setSession] = useState(null), [loading, setLoading] = useState(true), [authError, setAuthError] = useState("");
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [loginLoading, setLoginLoading] = useState(false);
  const [resources, setResources] = useState([]), [categories, setCategories] = useState(fallbackCategories), [promotions, setPromotions] = useState([]);
  const [settings, setSettings] = useState(null), [dataLoading, setDataLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard"), [search, setSearch] = useState(""), [statusFilter, setStatusFilter] = useState("all");
  const [showSidebar, setShowSidebar] = useState(false), [darkMode, setDarkMode] = useState(localStorage.getItem("sk_admin_theme") === "dark");
  const [showResourceModal, setShowResourceModal] = useState(false), [editingResource, setEditingResource] = useState(null), [form, setForm] = useState(emptyForm);
  const [showPromotionModal, setShowPromotionModal] = useState(false), [editingPromotion, setEditingPromotion] = useState(null);
  const [promotion, setPromotion] = useState({title:"",subtitle:"",description:"",image:null,imageUrl:"",buttonText:"View Now",buttonUrl:"",placement:"sidebar",displayOrder:0,isActive:true,startAt:"",endAt:""});
  const [siteForm, setSiteForm] = useState(null), [jobBuilderText, setJobBuilderText] = useState("");
  const [saving, setSaving] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");

  useEffect(()=>{ document.body.classList.toggle("admin-dark",darkMode); localStorage.setItem("sk_admin_theme",darkMode?"dark":"light"); },[darkMode]);
  useEffect(()=>{ checkSession(); const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s)); return()=>subscription.unsubscribe(); },[]);
  useEffect(()=>{ if(session) loadAll(); },[session]);
  useEffect(()=>{ if(message){const x=setTimeout(()=>setMessage(""),3500);return()=>clearTimeout(x)}},[message]);

  async function checkSession(){const {data}=await supabase.auth.getSession();setSession(data.session);setLoading(false)}
  async function handleLogin(e){e.preventDefault();setAuthError("");setLoginLoading(true);const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)setAuthError(error.message);else setSession(data.session);setLoginLoading(false)}
  async function handleLogout(){await supabase.auth.signOut();setSession(null)}

  async function loadAll(){
    setDataLoading(true); setError("");
    const [r,c,p,s]=await Promise.all([
      supabase.from("resources").select("*").order("created_at",{ascending:false}),
      supabase.from("categories").select("*").eq("is_active",true).order("display_order",{ascending:true}),
      supabase.from("promotions").select("*").order("display_order",{ascending:true}).order("created_at",{ascending:false}),
      supabase.from("site_settings").select("*").eq("id",1).maybeSingle(),
    ]);
    if(r.error)setError(r.error.message); else setResources(r.data||[]);
    if(!c.error && c.data?.length)setCategories(c.data);
    if(!p.error)setPromotions(p.data||[]); else setError(p.error.message);
    if(!s.error)setSettings(s.data||{}); else setError(s.error.message);
    setDataLoading(false);
  }

  const stats=useMemo(()=>({total:resources.length,published:resources.filter(x=>x.is_published).length,drafts:resources.filter(x=>!x.is_published).length,featured:resources.filter(x=>x.is_featured).length,promotions:promotions.filter(x=>x.is_active).length}),[resources,promotions]);
  const filtered=useMemo(()=>{const q=search.toLowerCase().trim();return resources.filter(r=>(!q||[r.title,r.organization,r.post_name,r.job_category,r.category].filter(Boolean).join(" ").toLowerCase().includes(q))&&(statusFilter==="all"||(statusFilter==="published"&&r.is_published)||(statusFilter==="draft"&&!r.is_published)));},[resources,search,statusFilter]);

  function openAddResource(){setEditingResource(null);setForm({...emptyForm,category:"Government Jobs"});setJobBuilderText("");setError("");setShowResourceModal(true)}
  function openEditResource(r){setEditingResource(r);setForm({title:r.title||"",shortDescription:r.short_description||"",fullDescription:r.full_description||r.description||"",category:r.category||"Government Jobs",jobCategory:r.job_category||"Other",organization:r.organization||"",postName:r.post_name||"",totalVacancies:r.total_vacancies||"",qualification:r.qualification||"",ageLimit:r.age_limit||"",applicationFee:r.application_fee||"",jobLocation:r.job_location||"",applicationStartDate:normalizeDate(r.application_start_date),lastDate:normalizeDate(r.last_date),applyUrl:r.apply_url||"",notificationUrl:r.notification_url||"",officialWebsiteUrl:r.official_website_url||"",resourceType:r.resource_type||"pdf",isFree:r.is_free!==false,price:r.price||"",tags:(r.tags||[]).join(", "),isPublished:!!r.is_published,isFeatured:!!r.is_featured,file:null,image:null,organizationLogo:null,organizationLogoUrl:r.organization_logo_url||"",organizationLogoPath:r.organization_logo_path||null});setJobBuilderText("");setError("");setShowResourceModal(true)}
  function closeResource(){if(!saving)setShowResourceModal(false)}
  function applyBuilder(){const p=parseJobText(jobBuilderText);setForm(f=>({...f,...Object.fromEntries(Object.entries(p).filter(([,v])=>v)),category:"Government Jobs"}));setMessage("Job details auto-filled. Review once before publishing.")}

  async function uploadFile(file,pathPrefix){
    if(!file)return null;
    const ext=file.name.split(".").pop()?.toLowerCase()||"bin";
    const path=`${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
    const bucket=pathPrefix==="resources"?"resources":"resource-thumbnails";
    const {error:e}=await supabase.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||undefined});
    if(e)throw e; return path;
  }
  function publicImageUrl(path){if(!path)return "";return supabase.storage.from("resource-thumbnails").getPublicUrl(path).data.publicUrl}

  async function saveResource(e){
    e.preventDefault();setSaving(true);setError("");
    try{
      const cleanTitle=form.title.trim()||"Government Job Update";
      let filePath=editingResource?.file_path||null, imagePath=editingResource?.image_path||null, organizationLogoPath=editingResource?.organization_logo_path||null;
      if(form.file){if(form.file.type!=="application/pdf")throw new Error("Sirf PDF upload karein.");if(form.file.size>20*1024*1024)throw new Error("PDF maximum 20 MB ho sakti hai.");filePath=await uploadFile(form.file,"resources")}
      if(form.image){if(!form.image.type.startsWith("image/"))throw new Error("Thumbnail ke liye image file choose karein.");if(form.image.size>5*1024*1024)throw new Error("Image maximum 5 MB ho sakti hai.");imagePath=await uploadFile(form.image,"thumbs")}
      if(form.organizationLogo){if(!form.organizationLogo.type.startsWith("image/"))throw new Error("Organization logo ke liye image file choose karein.");if(form.organizationLogo.size>2*1024*1024)throw new Error("Organization logo maximum 2 MB ho sakta hai.");organizationLogoPath=await uploadFile(form.organizationLogo,"org-logos")}
      const isNew=!editingResource;
      let slugBase=slugify(cleanTitle)||`resource-${Date.now()}`;
      const {data:slugMatch}=await supabase.from("resources").select("id").eq("slug",slugBase).maybeSingle();
      if(slugMatch && (!editingResource || slugMatch.id!==editingResource.id)) slugBase=`${slugBase}-${Date.now()}`;
      const publishedAt=form.isPublished?(editingResource?.published_at||new Date().toISOString()):null;
      const payload={title:cleanTitle,slug:slugBase,short_description:form.shortDescription.trim(),full_description:form.fullDescription.trim(),description:form.shortDescription.trim(),category:form.category,job_category:form.category==="Government Jobs"?form.jobCategory:null,organization:form.organization.trim(),post_name:form.postName.trim(),total_vacancies:form.totalVacancies.trim(),qualification:form.qualification.trim(),age_limit:form.ageLimit.trim(),application_fee:form.applicationFee.trim(),job_location:form.jobLocation.trim(),application_start_date:form.applicationStartDate||null,last_date:form.lastDate||null,apply_url:form.applyUrl.trim(),notification_url:form.notificationUrl.trim(),official_website_url:form.officialWebsiteUrl.trim(),resource_type:form.resourceType,is_free:form.isFree,price:form.isFree?null:Number(form.price)||null,tags:form.tags.split(",").map(x=>x.trim()).filter(Boolean),is_published:form.isPublished,is_featured:form.isFeatured,file_path:filePath,image_path:imagePath,thumbnail_url:imagePath?publicImageUrl(imagePath):editingResource?.thumbnail_url||null,organization_logo_path:organizationLogoPath,organization_logo_url:organizationLogoPath?publicImageUrl(organizationLogoPath):form.organizationLogoUrl.trim()||null,published_at:publishedAt,updated_at:new Date().toISOString()};
      if(isNew){const {error:e1}=await supabase.from("resources").insert(payload);if(e1)throw e1;setMessage(form.isPublished?"Job published successfully.":"Draft created successfully.")}
      else{const {error:e2}=await supabase.from("resources").update(payload).eq("id",editingResource.id);if(e2)throw e2;setMessage("Job updated successfully. Public page automatically update ho gaya.")}
      await loadAll();setShowResourceModal(false);
    }catch(err){setError(err.message||"Save failed")}finally{setSaving(false)}
  }

  async function togglePublish(r){const next=!r.is_published;const patch={is_published:next,updated_at:new Date().toISOString(),published_at:next?(r.published_at||new Date().toISOString()):null};const {error:e}=await supabase.from("resources").update(patch).eq("id",r.id);if(e)setError(e.message);else{setMessage(next?"Published":"Moved to draft");loadAll()}}
  async function toggleFeatured(r){const {error:e}=await supabase.from("resources").update({is_featured:!r.is_featured,updated_at:new Date().toISOString()}).eq("id",r.id);if(e)setError(e.message);else loadAll()}
  async function deleteResource(r){if(!window.confirm(`Delete “${r.title||"this resource"}”?`))return;setError("");if(r.file_path)await supabase.storage.from("resources").remove([r.file_path]);if(r.image_path)await supabase.storage.from("resource-thumbnails").remove([r.image_path]);if(r.organization_logo_path)await supabase.storage.from("resource-thumbnails").remove([r.organization_logo_path]);const {error:e}=await supabase.from("resources").delete().eq("id",r.id);if(e)setError(e.message);else{setMessage("Resource deleted");loadAll()}}
  async function previewFile(r){if(!r.file_path)return setError("PDF available nahi hai.");const {data,error:e}=await supabase.storage.from("resources").createSignedUrl(r.file_path,300);if(e)setError(e.message);else if(data?.signedUrl)window.open(data.signedUrl,"_blank","noopener,noreferrer")}

  function openAddPromotion(){setEditingPromotion(null);setPromotion({title:"",subtitle:"",description:"",image:null,imageUrl:"",buttonText:"View Now",buttonUrl:"",placement:"sidebar",displayOrder:0,isActive:true,startAt:"",endAt:""});setShowPromotionModal(true)}
  function openEditPromotion(p){setEditingPromotion(p);setPromotion({title:p.title||"",subtitle:p.subtitle||"",description:p.description||"",image:null,imageUrl:p.image_url||"",buttonText:p.button_text||"View Now",buttonUrl:p.button_url||"",placement:p.placement||"sidebar",displayOrder:p.display_order||0,isActive:p.is_active!==false,startAt:p.start_at?p.start_at.slice(0,16):"",endAt:p.end_at?p.end_at.slice(0,16):""});setShowPromotionModal(true)}
  async function savePromotion(e){e.preventDefault();setSaving(true);setError("");try{let imagePath=editingPromotion?.image_path||null;if(promotion.image){imagePath=await uploadFile(promotion.image,"promo")}const payload={title:promotion.title.trim()||"Promotion",subtitle:promotion.subtitle.trim(),description:promotion.description.trim(),image_path:imagePath,image_url:imagePath?publicImageUrl(imagePath):promotion.imageUrl.trim(),button_text:promotion.buttonText.trim()||"View Now",button_url:promotion.buttonUrl.trim(),placement:promotion.placement,display_order:Number(promotion.displayOrder)||0,is_active:promotion.isActive,start_at:promotion.startAt?new Date(promotion.startAt).toISOString():null,end_at:promotion.endAt?new Date(promotion.endAt).toISOString():null,updated_at:new Date().toISOString()};let q=editingPromotion?supabase.from("promotions").update(payload).eq("id",editingPromotion.id):supabase.from("promotions").insert(payload);const {error:e1}=await q;if(e1)throw e1;setMessage("Promotion saved");setShowPromotionModal(false);loadAll()}catch(err){setError(err.message)}finally{setSaving(false)}}
  async function deletePromotion(p){if(!confirm(`Delete “${p.title}”?`))return;if(p.image_path)await supabase.storage.from("resource-thumbnails").remove([p.image_path]);const {error:e}=await supabase.from("promotions").delete().eq("id",p.id);if(e)setError(e.message);else{setMessage("Promotion deleted");loadAll()}}
  async function togglePromotion(p){const {error:e}=await supabase.from("promotions").update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq("id",p.id);if(e)setError(e.message);else loadAll()}

  async function saveSettings(e){e.preventDefault();setSaving(true);setError("");try{const {error:e1}=await supabase.from("site_settings").update({...siteForm,updated_at:new Date().toISOString()}).eq("id",1);if(e1)throw e1;setMessage("Public site settings saved");loadAll()}catch(err){setError(err.message)}finally{setSaving(false)}}

  if(loading)return <div className="admin-loading"><div className="admin-spinner"/><span>Loading Admin Panel...</span></div>;
  if(!session)return <div className="admin-auth-page"><div className="admin-login-card"><div className="admin-brand-mark">SK</div><span className="admin-kicker">SK DIGITAL SERVICE</span><h1>Admin Login</h1><p>Secure control centre for your Resource Hub.</p><form onSubmit={handleLogin}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>{authError&&<div className="admin-error">{authError}</div>}<button className="admin-primary-button" disabled={loginLoading}>{loginLoading?"Signing in...":"Sign in"}</button></form><a href="/">← Back to Public Website</a></div></div>;

  return <div className={`admin-app ${darkMode?"dark-theme":""}`}>
    {showSidebar&&<div className="mobile-sidebar-overlay" onClick={()=>setShowSidebar(false)}/>}<aside className={`admin-sidebar ${showSidebar?"mobile-sidebar-open":""}`}>
      <div className="sidebar-brand"><div className="sidebar-logo">SK</div><div><strong>SK DIGITAL</strong><span>SERVICE</span></div><button onClick={()=>setShowSidebar(false)}><X size={18}/></button></div>
      <div className="sidebar-label">MANAGEMENT</div>
      {[['dashboard','Dashboard',LayoutDashboard],['resources','Jobs & Resources',FileText],['promotions','Promotions & Ads',Megaphone],['settings','Public Site Settings',Settings]].map(([id,label,Icon])=><button key={id} className={`sidebar-item ${activeSection===id?'active':''}`} onClick={()=>{setActiveSection(id);setShowSidebar(false)}}><Icon size={19}/>{label}</button>)}
      <button className="sidebar-item" onClick={openAddResource}><Plus size={19}/>Add Job</button><div className="sidebar-label">SYSTEM</div><a className="sidebar-item" href="/"><FolderOpen size={19}/>Public Website</a><button className="sidebar-item sidebar-logout" onClick={handleLogout}><LogOut size={19}/>Logout</button>
    </aside>
    <main className="admin-main"><header className="admin-topbar"><button className="mobile-menu" onClick={()=>setShowSidebar(true)}><Menu/></button><div><span>CONTROL CENTRE</span><h1>{activeSection==='dashboard'?'Dashboard':activeSection==='resources'?'Jobs & Resources':activeSection==='promotions'?'Promotions & Ads':'Public Site Settings'}</h1></div><div className="admin-top-actions"><button className="icon-button" onClick={()=>setDarkMode(!darkMode)}>{darkMode?<Sun/>:<Moon/>}</button>{activeSection==='resources'&&<button className="admin-add-button" onClick={openAddResource}><Plus/> Add Job</button>}{activeSection==='promotions'&&<button className="admin-add-button" onClick={openAddPromotion}><Plus/> Add Promotion</button>}</div></header>
      {message&&<div className="toast success"><CheckCircle2 size={18}/>{message}</div>}{error&&<div className="toast error"><Bell size={18}/>{error}<button onClick={()=>setError("")}><X size={15}/></button></div>}
      <div className="admin-content">
        {activeSection==='dashboard'&&<><div className="welcome"><div><span>SK DIGITAL SERVICE</span><h2>Control your public job portal from one place.</h2><p>Jobs, promotions, WhatsApp CTA and public-page content are connected to Supabase.</p></div><button onClick={()=>setActiveSection('resources')}><Sparkles/> Manage Jobs</button></div><div className="stats-grid">{[[stats.total,'Total Jobs',FileText],[stats.published,'Published',CheckCircle2],[stats.drafts,'Drafts',Clock3],[stats.featured,'Featured',Star],[stats.promotions,'Active Ads',Megaphone]].map(([n,l,I])=><div className="stat-card" key={l}><I/><strong>{n}</strong><span>{l}</span></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><span>RECENT JOBS</span><h3>Latest updates</h3></div><button onClick={()=>setActiveSection('resources')}>View all <ExternalLink size={15}/></button></div>{resources.slice(0,6).map(r=><div className="mini-row" key={r.id}><div className="mini-icon">{r.is_published?<CheckCircle2/>:<Clock3/>}</div><div><strong>{r.title||'Untitled'}</strong><small>{r.organization||r.category||'Resource'} • {r.is_published?'Published':'Draft'}</small></div><button onClick={()=>openEditResource(r)}><Edit3/></button></div>)}</section><section className="panel"><div className="panel-head"><div><span>PROMOTIONS</span><h3>Public advertisements</h3></div><button onClick={()=>setActiveSection('promotions')}>Manage <ExternalLink size={15}/></button></div>{promotions.slice(0,5).map(p=><div className="mini-row" key={p.id}><div className="promo-dot"><Megaphone/></div><div><strong>{p.title}</strong><small>{p.placement} • {p.is_active?'Active':'Hidden'}</small></div><button onClick={()=>openEditPromotion(p)}><Edit3/></button></div>)}</section></div></>}
        {activeSection==='resources'&&<section className="panel large"><div className="panel-head"><div><span>CONTENT MANAGER</span><h3>Jobs & Resources</h3></div><div className="filters"><div className="search"><Search/><input placeholder="Search jobs..." value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All</option><option value="published">Published</option><option value="draft">Draft</option></select></div></div><div className="table-wrap"><table><thead><tr><th>Job</th><th>Category</th><th>Status</th><th>Deadline</th><th>Actions</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.title||'Untitled'}</strong><small>{r.organization||r.post_name||'—'}</small></td><td>{r.job_category||r.category||'—'}</td><td><span className={`badge ${r.is_published?'green':'gray'}`}>{r.is_published?'Published':'Draft'}</span>{r.is_featured&&<span className="badge gold"><Star size={12}/> Featured</span>}</td><td>{r.last_date||'—'}</td><td><div className="row-actions"><button title="Preview PDF" onClick={()=>previewFile(r)}><Eye/></button><button title="Edit" onClick={()=>openEditResource(r)}><Edit3/></button><button title={r.is_published?'Unpublish':'Publish'} onClick={()=>togglePublish(r)}>{r.is_published?<Clock3/>:<CheckCircle2/>}</button><button title="Delete" className="danger" onClick={()=>deleteResource(r)}><Trash2/></button></div></td></tr>)}</tbody></table></div></section>}
        {activeSection==='promotions'&&<section className="panel large"><div className="panel-head"><div><span>MONETIZATION & PROMOTION</span><h3>Public Ads & Banners</h3><p>Add offers, service promotions, affiliate banners or announcements. Public page updates automatically.</p></div><button className="admin-add-button" onClick={openAddPromotion}><Plus/> Add Promotion</button></div><div className="promo-grid">{promotions.map(p=><div className={`promo-card ${!p.is_active?'muted':''}`} key={p.id}>{p.image_url?<img src={p.image_url} alt=""/>:<div className="promo-placeholder"><Megaphone/></div>}<div className="promo-body"><span className="badge blue">{p.placement}</span><h3>{p.title}</h3><p>{p.subtitle||p.description||'No description'}</p><div className="promo-actions"><button onClick={()=>togglePromotion(p)}>{p.is_active?'Hide':'Show'}</button><button onClick={()=>openEditPromotion(p)}><Edit3/> Edit</button><button className="danger" onClick={()=>deletePromotion(p)}><Trash2/></button></div></div></div>)}</div></section>}
        {activeSection==='settings'&&siteForm&&<section className="panel large"><div className="panel-head"><div><span>PUBLIC WEBSITE</span><h3>Site Settings</h3><p>Control the public page without touching code.</p></div><button className="admin-add-button" onClick={saveSettings} disabled={saving}><Save/> {saving?'Saving...':'Save Settings'}</button></div><form className="settings-form" onSubmit={saveSettings}><div className="settings-card"><h3>Brand & WhatsApp</h3><label>Brand Name<input value={siteForm.brand_name||''} onChange={e=>setSiteForm({...siteForm,brand_name:e.target.value})}/></label><label>Tagline<input value={siteForm.tagline||''} onChange={e=>setSiteForm({...siteForm,tagline:e.target.value})}/></label><label>WhatsApp Channel URL<input value={siteForm.whatsapp_channel_url||''} onChange={e=>setSiteForm({...siteForm,whatsapp_channel_url:e.target.value})}/></label><label>WhatsApp CTA Text<input value={siteForm.whatsapp_cta_text||''} onChange={e=>setSiteForm({...siteForm,whatsapp_cta_text:e.target.value})}/></label></div><div className="settings-card"><h3>Hero Content</h3><label>Badge<input value={siteForm.hero_badge||''} onChange={e=>setSiteForm({...siteForm,hero_badge:e.target.value})}/></label><label>Hero Title<input value={siteForm.hero_title||''} onChange={e=>setSiteForm({...siteForm,hero_title:e.target.value})}/></label><label>Highlighted Text<input value={siteForm.hero_highlight||''} onChange={e=>setSiteForm({...siteForm,hero_highlight:e.target.value})}/></label><label>Hero Description<textarea value={siteForm.hero_description||''} onChange={e=>setSiteForm({...siteForm,hero_description:e.target.value})}/></label></div><div className="settings-card"><h3>Sections</h3>{[['show_hero','Hero'],['show_categories','Categories'],['show_latest_jobs','Latest Jobs'],['show_promotions','Promotions'],['show_whatsapp_cta','WhatsApp CTA']].map(([key,label])=><label className="check-row" key={key}><input type="checkbox" checked={!!siteForm[key]} onChange={e=>setSiteForm({...siteForm,[key]:e.target.checked})}/><span>{label}</span></label>)}</div></form></section>}
      </div>
    </main>

    {showResourceModal&&<div className="modal-backdrop"><div className="builder-modal"><div className="modal-header"><div><span>JOB BUILDER</span><h2>{editingResource?'Edit Government Job':'Create Government Job'}</h2></div><button onClick={closeResource}><X/></button></div><form onSubmit={saveResource}>
      {!editingResource&&<section className="builder-import"><div><Sparkles/><div><strong>Smart Paste Builder</strong><p>Notification/page se copied details yahan paste karo. Builder common labels aur URLs ko automatically fields me fill karega.</p></div></div><textarea value={jobBuilderText} onChange={e=>setJobBuilderText(e.target.value)} placeholder={'Example:\nPost Name: SSC CHSL 2026\nOrganization: Staff Selection Commission\nTotal Vacancies: 3712\nQualification: 12th Pass\nAge Limit: 18-27 Years\nLast Date: 18/07/2026\nApply Online: https://example.com/apply\nNotification: https://example.com/notification'}/><button type="button" className="secondary-button" onClick={applyBuilder} disabled={!jobBuilderText.trim()}><Sparkles/> Auto Fill Details</button></section>}
      <div className="builder-grid"><section className="builder-section"><h3>01 • Basic Information</h3><label>Job Title<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="two"><label>Organization<input value={form.organization} onChange={e=>setForm({...form,organization:e.target.value})}/></label><label>Post Name<input value={form.postName} onChange={e=>setForm({...form,postName:e.target.value})}/></label></div><div className="two"><label>Job Category<select value={form.jobCategory} onChange={e=>setForm({...form,jobCategory:e.target.value})}>{JOB_CATEGORIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Vacancies<input value={form.totalVacancies} onChange={e=>setForm({...form,totalVacancies:e.target.value})}/></label></div><label>Short Description<textarea rows="3" value={form.shortDescription} onChange={e=>setForm({...form,shortDescription:e.target.value})}/></label><label>Full Description<textarea rows="7" value={form.fullDescription} onChange={e=>setForm({...form,fullDescription:e.target.value})}/></label></section>
      <section className="builder-section"><h3>02 • Eligibility & Dates</h3><label>Qualification<input value={form.qualification} onChange={e=>setForm({...form,qualification:e.target.value})}/></label><div className="two"><label>Age Limit<input value={form.ageLimit} onChange={e=>setForm({...form,ageLimit:e.target.value})}/></label><label>Application Fee<input value={form.applicationFee} onChange={e=>setForm({...form,applicationFee:e.target.value})}/></label></div><div className="two"><label>Job Location<input value={form.jobLocation} onChange={e=>setForm({...form,jobLocation:e.target.value})}/></label><label>Start Date<input type="date" value={form.applicationStartDate} onChange={e=>setForm({...form,applicationStartDate:e.target.value})}/></label></div><label>Last Date<input type="date" value={form.lastDate} onChange={e=>setForm({...form,lastDate:e.target.value})}/></label><div className="two"><label>Apply URL<input type="url" value={form.applyUrl} onChange={e=>setForm({...form,applyUrl:e.target.value})} placeholder="https://..."/></label><label>Notification URL<input type="url" value={form.notificationUrl} onChange={e=>setForm({...form,notificationUrl:e.target.value})} placeholder="https://..."/></label></div><label>Official Website URL<input type="url" value={form.officialWebsiteUrl} onChange={e=>setForm({...form,officialWebsiteUrl:e.target.value})} placeholder="https://..."/></label></section>
      <section className="builder-section"><h3>03 • Media & Access</h3><label className="upload-box"><UploadCloud/><strong>{form.file?.name|| (editingResource?.file_path?'Existing PDF saved • click to replace':'Upload Notification PDF')}</strong><small>PDF only • max 20 MB</small><input type="file" accept="application/pdf" onChange={e=>setForm({...form,file:e.target.files?.[0]||null})}/></label><label className="upload-box"><ImageIcon/><strong>{form.image?.name|| (editingResource?.image_path?'Existing thumbnail saved • click to replace':'Upload Job Thumbnail')}</strong><small>PNG/JPG/WebP • max 5 MB</small><input type="file" accept="image/*" onChange={e=>setForm({...form,image:e.target.files?.[0]||null})}/></label><label className="upload-box"><ShieldCheck/><strong>{form.organizationLogo?.name|| (form.organizationLogoUrl?'Organization logo saved • click to replace':'Upload Organization Logo')}</strong><small>PNG/JPG/WebP/GIF • max 2 MB • optional</small><input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>setForm({...form,organizationLogo:e.target.files?.[0]||null})}/></label><label>Tags<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="SSC, CHSL, 2026"/></label><div className="switches"><label className="check-row"><input type="checkbox" checked={form.isPublished} onChange={e=>setForm({...form,isPublished:e.target.checked})}/><span>Publish on public website</span></label><label className="check-row"><input type="checkbox" checked={form.isFeatured} onChange={e=>setForm({...form,isFeatured:e.target.checked})}/><span>Featured job</span></label></div></section></div>
      {error&&<div className="admin-error">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={closeResource}>Cancel</button><button className="admin-primary-button" disabled={saving}>{saving?'Saving...':editingResource?'Save Changes':'Create Job'}</button></div>
    </form></div></div>}

    {showPromotionModal&&<div className="modal-backdrop"><div className="promotion-modal"><div className="modal-header"><div><span>PROMOTION BUILDER</span><h2>{editingPromotion?'Edit Promotion':'Add Promotion'}</h2></div><button onClick={()=>setShowPromotionModal(false)}><X/></button></div><form onSubmit={savePromotion}><label>Title<input value={promotion.title} onChange={e=>setPromotion({...promotion,title:e.target.value})}/></label><div className="two"><label>Subtitle<input value={promotion.subtitle} onChange={e=>setPromotion({...promotion,subtitle:e.target.value})}/></label><label>Button Text<input value={promotion.buttonText} onChange={e=>setPromotion({...promotion,buttonText:e.target.value})}/></label></div><label>Description<textarea rows="3" value={promotion.description} onChange={e=>setPromotion({...promotion,description:e.target.value})}/></label><label className="upload-box"><ImageIcon/><strong>{promotion.image?.name||'Upload Promotion Banner'}</strong><small>Recommended: wide banner image, max 5 MB</small><input type="file" accept="image/*" onChange={e=>setPromotion({...promotion,image:e.target.files?.[0]||null})}/></label><label>Existing/Public Image URL<input type="url" value={promotion.imageUrl} onChange={e=>setPromotion({...promotion,imageUrl:e.target.value})}/></label><label>Button URL<input type="url" value={promotion.buttonUrl} onChange={e=>setPromotion({...promotion,buttonUrl:e.target.value})}/></label><div className="three"><label>Placement<select value={promotion.placement} onChange={e=>setPromotion({...promotion,placement:e.target.value})}>{['hero','top','sidebar','latest_jobs','bottom','popup'].map(x=><option key={x}>{x}</option>)}</select></label><label>Order<input type="number" value={promotion.displayOrder} onChange={e=>setPromotion({...promotion,displayOrder:e.target.value})}/></label><label>Active<select value={promotion.isActive?'yes':'no'} onChange={e=>setPromotion({...promotion,isActive:e.target.value==='yes'})}><option value="yes">Yes</option><option value="no">No</option></select></label></div><div className="two"><label>Start (optional)<input type="datetime-local" value={promotion.startAt} onChange={e=>setPromotion({...promotion,startAt:e.target.value})}/></label><label>End (optional)<input type="datetime-local" value={promotion.endAt} onChange={e=>setPromotion({...promotion,endAt:e.target.value})}/></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowPromotionModal(false)}>Cancel</button><button className="admin-primary-button" disabled={saving}>{saving?'Saving...':'Save Promotion'}</button></div></form></div></div>}
  </div>
}

export default Admin;
