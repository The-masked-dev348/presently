import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import InquiryDialog from "@/components/InquiryDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import PortfolioPreview, { type PreviewEvidence, type PreviewMedia, type PreviewMetric, type PreviewPortfolio, type PreviewTestimonial } from "@/components/PortfolioPreview";
import { trpc } from "@/lib/trpc";
import { ALLOWED_PROJECT_MEDIA, ALLOWED_UPLOADS, MAX_PROJECT_MEDIA_BYTES, MAX_UPLOAD_BYTES, TEMPLATE_OPTIONS, type TemplateSlug } from "@shared/presently";
import { ArrowLeft, Bell, Check, ExternalLink, FileUp, Loader2, LogOut, Plus, Save, Send, Trash2, Upload, WandSparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const emptyProfile = { fullName: "", professionalTitle: "", bio: "", location: "", skills: "", website: "", github: "", linkedin: "", twitter: "", templateId: "minimal" as TemplateSlug };
const emptyProject = { title: "", description: "", clientProblem: "", solution: "", businessImpact: "", technologies: "", liveUrl: "", githubUrl: "", metrics: [] as PreviewMetric[], testimonials: [] as PreviewTestimonial[], evidence: [] as PreviewEvidence[] };

const emptyMetric: PreviewMetric = { label: "", beforeValue: "", afterValue: "", unit: "", displayedChange: "", timeframe: "" };
const emptyTestimonial: PreviewTestimonial = { quote: "", clientName: "", clientRoleCompany: "", attribution: "named" };

function fileToBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); }); }

function ProjectMediaControls({ projectId, media, onUpload, onDelete }: { projectId: number; media: PreviewMedia[]; onUpload: (file: File | undefined) => void; onDelete: (mediaId: number) => void }) {
  return <div className="mt-4 rounded-2xl border border-[#dedcd2] bg-[#f8f5ed] p-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.14em] text-[#e98d55]">Project gallery</p><p className="mt-1 text-xs text-[#6f786f]">Show clients the work, process, and result.</p></div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#e4f18e] px-3 py-2 text-xs font-bold text-[#21473a] hover:bg-[#d9e889]"><Upload className="h-3.5 w-3.5" />Add media<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="hidden" onChange={event => { onUpload(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
    </div>
    {media.length > 0 && <div className="mt-3 grid grid-cols-2 gap-2">{media.map(item => <div key={item.id ?? item.url} className="group relative overflow-hidden rounded-xl border border-[#dedcd2] bg-white">{item.mediaType === "video" ? <video src={item.url} controls preload="metadata" className="aspect-video w-full object-cover" /> : <img src={item.url} alt={item.caption || item.originalName || "Project media"} className="aspect-video w-full object-cover" />}<button type="button" onClick={() => item.id !== undefined && onDelete(item.id)} className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-[#b83f3f] opacity-0 shadow transition group-hover:opacity-100">Remove</button></div>)}</div>}
  </div>;
}

type ProjectDraft = typeof emptyProject;

function ProjectProofControls({ project, onChange, onChooseEvidence, pendingEvidenceFile }: { project: ProjectDraft; onChange: (next: ProjectDraft) => void; onChooseEvidence: (file: File | undefined) => void; pendingEvidenceFile: File | null }) {
  return <div className="rounded-2xl border border-[#dedcd2] bg-white/60 p-4">
    <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#e98d55]">Proof layer</p><p className="mt-1 text-xs leading-5 text-[#6f786f]">Add evidence that helps a client trust the story. Metrics and testimonials are labeled user-provided, not independently verified.</p></div>
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#385046]">Outcome metrics</p><button type="button" onClick={() => onChange({ ...project, metrics: [...project.metrics, { ...emptyMetric }] })} className="rounded-full border border-[#dedcd2] px-3 py-1.5 text-xs font-semibold text-[#21473a]">Add metric</button></div>
      {project.metrics.map((metric, index) => <div key={metric.id ?? index} className="rounded-xl border border-[#dedcd2] bg-[#f8f5ed] p-3"><div className="grid gap-2 sm:grid-cols-2"><Input value={metric.label} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, label: e.target.value } : item) })} placeholder="Metric name (e.g. qualified leads)" /><Input value={metric.afterValue ?? ""} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, afterValue: e.target.value } : item) })} placeholder="After value" /><Input value={metric.beforeValue ?? ""} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, beforeValue: e.target.value } : item) })} placeholder="Before value (optional)" /><Input value={metric.unit ?? ""} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, unit: e.target.value } : item) })} placeholder="Unit (%, leads, hours)" /><Input value={metric.displayedChange ?? ""} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, displayedChange: e.target.value } : item) })} placeholder="Displayed change (e.g. +42%)" /><Input value={metric.timeframe ?? ""} onChange={e => onChange({ ...project, metrics: project.metrics.map((item, itemIndex) => itemIndex === index ? { ...item, timeframe: e.target.value } : item) })} placeholder="Timeframe (optional)" /></div><button type="button" onClick={() => onChange({ ...project, metrics: project.metrics.filter((_, itemIndex) => itemIndex !== index) })} className="mt-2 text-xs font-semibold text-[#b83f3f]">Remove metric</button></div>)}
    </div>
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#385046]">Client testimonials</p><button type="button" onClick={() => onChange({ ...project, testimonials: [...project.testimonials, { ...emptyTestimonial }] })} className="rounded-full border border-[#dedcd2] px-3 py-1.5 text-xs font-semibold text-[#21473a]">Add testimonial</button></div>
      {project.testimonials.map((testimonial, index) => <div key={testimonial.id ?? index} className="rounded-xl border border-[#dedcd2] bg-[#f8f5ed] p-3"><Textarea rows={3} value={testimonial.quote} onChange={e => onChange({ ...project, testimonials: project.testimonials.map((item, itemIndex) => itemIndex === index ? { ...item, quote: e.target.value } : item) })} placeholder="A short client quote (user-provided)" /><div className="mt-2 grid gap-2 sm:grid-cols-2"><Input value={testimonial.clientName ?? ""} onChange={e => onChange({ ...project, testimonials: project.testimonials.map((item, itemIndex) => itemIndex === index ? { ...item, clientName: e.target.value } : item) })} placeholder="Client name (optional)" /><Input value={testimonial.clientRoleCompany ?? ""} onChange={e => onChange({ ...project, testimonials: project.testimonials.map((item, itemIndex) => itemIndex === index ? { ...item, clientRoleCompany: e.target.value } : item) })} placeholder="Role or company (optional)" /></div><div className="mt-2 flex items-center justify-between gap-3"><select value={testimonial.attribution ?? "named"} onChange={e => onChange({ ...project, testimonials: project.testimonials.map((item, itemIndex) => itemIndex === index ? { ...item, attribution: e.target.value as "named" | "anonymous" } : item) })} className="h-9 rounded-md border border-[#dedcd2] bg-white px-2 text-xs text-[#385046]"><option value="named">Show attribution</option><option value="anonymous">Anonymous client</option></select><button type="button" onClick={() => onChange({ ...project, testimonials: project.testimonials.filter((_, itemIndex) => itemIndex !== index) })} className="text-xs font-semibold text-[#b83f3f]">Remove testimonial</button></div></div>)}
    </div>
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#385046]">Evidence</p><button type="button" onClick={() => onChange({ ...project, evidence: [...project.evidence, { evidenceType: "link", externalUrl: "", caption: "" }] })} className="rounded-full border border-[#dedcd2] px-3 py-1.5 text-xs font-semibold text-[#21473a]">Add evidence link</button></div>
      {project.evidence.map((item, index) => <div key={item.id ?? index} className="flex flex-col gap-2 rounded-xl border border-[#dedcd2] bg-[#f8f5ed] p-3 sm:flex-row"><Input value={item.caption ?? ""} onChange={e => onChange({ ...project, evidence: project.evidence.map((current, itemIndex) => itemIndex === index ? { ...current, caption: e.target.value } : current) })} placeholder="Evidence label" /><Input value={item.externalUrl ?? ""} onChange={e => onChange({ ...project, evidence: project.evidence.map((current, itemIndex) => itemIndex === index ? { ...current, externalUrl: e.target.value } : current) })} placeholder="https://..." /><button type="button" onClick={() => onChange({ ...project, evidence: project.evidence.filter((_, itemIndex) => itemIndex !== index) })} className="text-xs font-semibold text-[#b83f3f]">Remove</button></div>)}
      <label className="block rounded-xl border border-dashed border-[#c9c7bb] bg-[#f8f5ed] p-3 text-xs text-[#6f786f]"><span className="font-semibold text-[#385046]">Upload supporting evidence</span><input type="file" accept="application/pdf,image/png,image/jpeg" className="mt-2 block w-full text-xs" onChange={event => { onChooseEvidence(event.target.files?.[0]); event.currentTarget.value = ""; }} />{pendingEvidenceFile && <span className="mt-2 block">Ready: {pendingEvidenceFile.name}</span>}</label>
    </div>
  </div>;
}

export default function PortfolioEditor() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState(emptyProfile);
  const [project, setProject] = useState(emptyProject);
  const [pendingProjectMediaFiles, setPendingProjectMediaFiles] = useState<File[]>([]);
  const [pendingEvidenceFile, setPendingEvidenceFile] = useState<File | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "work" | "appearance">("profile");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"profile_image" | "resume" | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [projectMediaPreviews, setProjectMediaPreviews] = useState<Record<number, PreviewMedia[]>>({});
  const profileInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const portfolioQuery = trpc.portfolio.mine.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const templatesQuery = trpc.templates.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const unreadCount = trpc.notifications.unreadCount.useQuery(undefined, { enabled: Boolean(user), refetchInterval: 30000 });
  const saveProfile = trpc.portfolio.save.useMutation();
  const publish = trpc.portfolio.publish.useMutation();
  const createProject = trpc.projects.create.useMutation();
  const updateProject = trpc.projects.update.useMutation();
  const deleteProject = trpc.projects.delete.useMutation();
  const uploadFile = trpc.files.upload.useMutation();
  const uploadProjectMedia = trpc.projectMedia.upload.useMutation();
  const deleteProjectMedia = trpc.projectMedia.delete.useMutation();
  const uploadProjectEvidence = trpc.projectEvidence.upload.useMutation();
  const claimReferral = trpc.referrals.claim.useMutation();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const data = portfolioQuery.data?.portfolio;
    if (!data || hasHydrated) return;
    let socials: Record<string, string> = {};
    try { socials = JSON.parse(data.socialLinks || "{}"); } catch { /* use empty socials */ }
    setProfile({ fullName: data.fullName || user?.name || "", professionalTitle: data.professionalTitle || "", bio: data.bio || "", location: data.location || "", skills: data.skills || "", website: socials.website || "", github: socials.github || "", linkedin: socials.linkedin || "", twitter: socials.twitter || "", templateId: (data.templateId || "minimal") as TemplateSlug });
    setProfileImageUrl(portfolioQuery.data?.profileImageUrl ?? null);
    setHasHydrated(true);
  }, [portfolioQuery.data, user?.name, hasHydrated]);

  useEffect(() => {
    if (!user) return;
    const code = localStorage.getItem("presently-referral-code");
    if (code) claimReferral.mutate({ code }, { onSuccess: () => localStorage.removeItem("presently-referral-code") });
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = useMemo<PreviewPortfolio>(() => ({
    fullName: profile.fullName,
    professionalTitle: profile.professionalTitle,
    bio: profile.bio,
    location: profile.location,
    skills: profile.skills,
    templateId: profile.templateId,
    socialLinks: { website: profile.website, github: profile.github, linkedin: profile.linkedin, twitter: profile.twitter },
    profileImageUrl,
    projects: (projectsQuery.data ?? []).map(item => {
      const localMedia = projectMediaPreviews[item.id] ?? [];
      const localIds = new Set(localMedia.map(media => media.id));
      return { id: item.id, title: item.title, description: item.description, clientProblem: item.clientProblem, solution: item.solution, businessImpact: item.businessImpact, technologies: item.technologies, liveUrl: item.liveUrl, githubUrl: item.githubUrl, metrics: item.metrics, testimonials: item.testimonials, evidence: item.evidence, media: [...localMedia, ...(item.media ?? []).filter(media => !localIds.has(media.id))] };
    }),
  }), [profile, projectsQuery.data, profileImageUrl, projectMediaPreviews]);

  const save = async () => {
    setSaving(true);
    try { await saveProfile.mutateAsync({ fullName: profile.fullName, professionalTitle: profile.professionalTitle, bio: profile.bio, location: profile.location, skills: profile.skills.split(",").map(item => item.trim()).filter(Boolean), socialLinks: { website: profile.website, github: profile.github, linkedin: profile.linkedin, twitter: profile.twitter }, templateId: profile.templateId }); await utils.portfolio.mine.invalidate(); toast.success("Your changes are saved"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your changes"); } finally { setSaving(false); }
  };
  const publishPortfolio = async () => { try { await save(); const result = await publish.mutateAsync({ published: !(portfolioQuery.data?.portfolio?.published ?? false) }); await utils.portfolio.mine.invalidate(); toast.success(result.published ? "Your portfolio is live" : "Your portfolio is private again"); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not update publishing"); } };
  const handleUpload = async (file: File | undefined, category: "profile_image" | "resume") => {
    if (!file) return;
    setUploading(category);
    try {
      const dataUrl = await fileToBase64(file);
      // Show the selected image immediately in the live preview. The permanent
      // storage URL is still saved below and will hydrate again after reload.
      if (category === "profile_image") setProfileImageUrl(dataUrl);
      const result = await uploadFile.mutateAsync({ originalName: file.name, mimeType: file.type, dataBase64: dataUrl, category });
      await saveProfile.mutateAsync(category === "profile_image" ? { profileImageFileId: result.id } : { resumeFileId: result.id });
      await utils.portfolio.mine.invalidate();
      toast.success(category === "profile_image" ? "Profile photo uploaded" : "Resume uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };
  const handleProjectMediaUpload = async (projectId: number, file: File | undefined) => {
    if (!file) return;
    if (!(ALLOWED_PROJECT_MEDIA as readonly string[]).includes(file.type)) return toast.error("Use JPG, PNG, WebP, MP4, WebM, or MOV files.");
    if (file.size > MAX_PROJECT_MEDIA_BYTES) return toast.error("Project media must be 50 MB or smaller.");
    try {
      const dataUrl = await fileToBase64(file);
      const mediaType = file.type.startsWith("video/") ? "video" as const : "image" as const;
      const localMedia: PreviewMedia = { id: -Date.now(), mediaType, url: dataUrl, originalName: file.name };
      setProjectMediaPreviews(current => ({ ...current, [projectId]: [...(current[projectId] ?? []), localMedia] }));
      const result = await uploadProjectMedia.mutateAsync({ projectId, originalName: file.name, mimeType: file.type, dataBase64: dataUrl });
      setProjectMediaPreviews(current => ({ ...current, [projectId]: (current[projectId] ?? []).map(item => item.id === localMedia.id ? { ...item, id: result.id } : item) }));
      await utils.projects.list.invalidate();
      toast.success("Project media uploaded");
    } catch (error) {
      setProjectMediaPreviews(current => ({ ...current, [projectId]: (current[projectId] ?? []).filter(item => item.id !== undefined && item.id >= 0) }));
      toast.error(error instanceof Error ? error.message : "Could not upload project media");
    }
  };
  const handleProjectMediaDelete = async (projectId: number, mediaId: number) => {
    if (mediaId < 0) {
      setProjectMediaPreviews(current => ({ ...current, [projectId]: (current[projectId] ?? []).filter(item => item.id !== mediaId) }));
      return;
    }
    try {
      await deleteProjectMedia.mutateAsync({ id: mediaId });
      setProjectMediaPreviews(current => ({ ...current, [projectId]: (current[projectId] ?? []).filter(item => item.id !== mediaId) }));
      await utils.projects.list.invalidate();
      toast.success("Project media removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove project media");
    }
  };
  const chooseEvidenceFile = (file: File | undefined) => {
    if (!file) return;
    if (!(ALLOWED_UPLOADS as readonly string[]).includes(file.type) || file.size > MAX_UPLOAD_BYTES) return toast.error("Evidence files must be PDF, JPG, JPEG, or PNG and no larger than 10 MB.");
    setPendingEvidenceFile(file);
  };
  const resetProject = () => { setProject(emptyProject); setEditingProjectId(null); setPendingProjectMediaFiles([]); setPendingEvidenceFile(null); };
  const chooseProjectMedia = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    const invalid = selected.find(file => !(ALLOWED_PROJECT_MEDIA as readonly string[]).includes(file.type) || file.size > MAX_PROJECT_MEDIA_BYTES);
    if (invalid) return toast.error(`${invalid.name} is not a supported image/video or is larger than 50 MB.`);
    if (selected.length > 8) return toast.error("Choose up to 8 work files at a time.");
    setPendingProjectMediaFiles(selected);
  };
  const saveProject = async () => {
    if (!project.title.trim()) return toast.error("Give this project a title first");
    const payload = { title: project.title, description: project.description, clientProblem: project.clientProblem, solution: project.solution, businessImpact: project.businessImpact, technologies: project.technologies.split(",").map(item => item.trim()).filter(Boolean), liveUrl: project.liveUrl, githubUrl: project.githubUrl, metrics: project.metrics.map(({ id: _id, ...metric }) => ({ ...metric, beforeValue: metric.beforeValue || undefined, afterValue: metric.afterValue || undefined, unit: metric.unit || undefined, displayedChange: metric.displayedChange || undefined, timeframe: metric.timeframe || undefined })), testimonials: project.testimonials.map(({ id: _id, ...testimonial }) => ({ ...testimonial, clientName: testimonial.clientName || undefined, clientRoleCompany: testimonial.clientRoleCompany || undefined, attribution: testimonial.attribution || "named" })), evidence: project.evidence.map(({ id: _id, url: _url, originalName: _originalName, ...evidence }) => ({ ...evidence, fileId: evidence.fileId ?? undefined, externalUrl: evidence.externalUrl || undefined, caption: evidence.caption || undefined })) };
    try {
      let projectId = editingProjectId;
      if (projectId) await updateProject.mutateAsync({ id: projectId, data: payload });
      else projectId = (await createProject.mutateAsync(payload)).id;
      for (const file of pendingProjectMediaFiles) await handleProjectMediaUpload(projectId, file);
      if (pendingEvidenceFile) {
        const dataUrl = await fileToBase64(pendingEvidenceFile);
        await uploadProjectEvidence.mutateAsync({ projectId, originalName: pendingEvidenceFile.name, mimeType: pendingEvidenceFile.type, dataBase64: dataUrl, evidenceType: pendingEvidenceFile.type.startsWith("image/") ? "image" : "uploaded_file" });
      }
      await utils.projects.list.invalidate();
      await utils.portfolio.mine.invalidate();
      resetProject();
      toast.success(editingProjectId ? "Work updated" : "Work added to your portfolio");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your work"); }
  };
  const startEdit = (item: NonNullable<typeof projectsQuery.data>[number]) => { setEditingProjectId(item.id); setProject({ title: item.title, description: item.description || "", clientProblem: item.clientProblem || "", solution: item.solution || "", businessImpact: item.businessImpact || "", technologies: item.technologies || "", liveUrl: item.liveUrl || "", githubUrl: item.githubUrl || "", metrics: item.metrics ?? [], testimonials: item.testimonials ?? [], evidence: item.evidence ?? [] }); setPendingProjectMediaFiles([]); setPendingEvidenceFile(null); setActiveTab("work"); };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-[#f8f5ed]"><Loader2 className="h-6 w-6 animate-spin text-[#21473a]" /></div>;
  const isPublished = portfolioQuery.data?.portfolio?.published ?? false;
  return <div className="min-h-screen bg-[#f8f5ed]">
    <header className="border-b border-[#dedcd2] bg-[#f8f5ed]/90 backdrop-blur"><div className="container flex items-center justify-between py-4"><div className="flex items-center gap-5"><Link href="/" className="display-font text-xl font-bold tracking-[-.06em] text-[#21473a]">presently<span className="text-[#e98d55]">.</span></Link><span className="hidden text-sm text-[#6f786f] sm:block">Portfolio editor</span></div><div className="flex items-center gap-2"><Link href="/inbox" className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[#21473a] hover:bg-[#ebe8dc]"><Bell className="h-4 w-4" /> <span className="hidden sm:inline">Inbox</span>{Boolean(unreadCount.data) && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#e98d55] px-1 text-[10px] font-bold text-white">{unreadCount.data}</span>}</Link><Link href="/refer" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-[#21473a] hover:bg-[#ebe8dc] sm:block">Refer & earn</Link>{isPublished && portfolioQuery.data?.portfolio?.slug && <a href={`/p/${portfolioQuery.data.portfolio.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#dedcd2] px-3 py-2 text-sm font-semibold text-[#21473a]">View live <ExternalLink className="h-3.5 w-3.5" /></a>}<button onClick={() => logout().then(() => setLocation("/"))} className="rounded-full p-2 text-[#6f786f] hover:bg-[#ebe8dc]" aria-label="Log out"><LogOut className="h-4 w-4" /></button></div></div></header>
    <main className="container py-8"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e98d55]">Make it yours</p><h1 className="display-font mt-2 text-4xl font-bold tracking-[-.06em] text-[#21473a]">Your portfolio, in progress.</h1><p className="mt-2 text-sm text-[#6f786f]">Save as you go. Publish when it feels like you.</p></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${isPublished ? "bg-[#dcefdc] text-[#21473a]" : "bg-[#ebe8dc] text-[#6f786f]"}`}>{isPublished ? "Live to the world" : "Private draft"}</span><Button onClick={publishPortfolio} disabled={publish.isPending || saving} className="rounded-full bg-[#21473a] px-5 text-[#f8f5ed] hover:bg-[#2f5c4b]">{publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{isPublished ? "Unpublish" : "Publish"}</Button></div></div>
      <div className="grid gap-8 xl:grid-cols-[minmax(0,.92fr)_minmax(420px,1.08fr)]"><section><div className="mb-4 flex gap-1 rounded-2xl bg-[#ebe8dc] p-1"><button onClick={() => setActiveTab("profile")} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "profile" ? "bg-white text-[#21473a] shadow-sm" : "text-[#6f786f]"}`}>Profile</button><button onClick={() => setActiveTab("work")} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "work" ? "bg-white text-[#21473a] shadow-sm" : "text-[#6f786f]"}`}>Work</button><button onClick={() => setActiveTab("appearance")} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${activeTab === "appearance" ? "bg-white text-[#21473a] shadow-sm" : "text-[#6f786f]"}`}>Appearance</button></div>
        {activeTab === "profile" && <Card className="border-[#dedcd2] bg-white/70 shadow-none"><CardHeader><CardTitle className="display-font text-xl text-[#21473a]">The essentials</CardTitle><CardDescription>Start with the details people need to understand your work.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Full name</span><Input value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} placeholder="Alex Morgan" /></label><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Professional title</span><Input value={profile.professionalTitle} onChange={e => setProfile({ ...profile, professionalTitle: e.target.value })} placeholder="Product designer" /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Location</span><Input value={profile.location} onChange={e => setProfile({ ...profile, location: e.target.value })} placeholder="Lagos, Nigeria" /></label><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Skills <span className="font-normal text-[#6f786f]">(comma separated)</span></span><Input value={profile.skills} onChange={e => setProfile({ ...profile, skills: e.target.value })} placeholder="React, Figma, Strategy" /></label></div><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Short bio</span><Textarea rows={5} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} placeholder="What do you make, and why does it matter?" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Website</span><Input value={profile.website} onChange={e => setProfile({ ...profile, website: e.target.value })} placeholder="https://yourname.com" /></label><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>GitHub</span><Input value={profile.github} onChange={e => setProfile({ ...profile, github: e.target.value })} placeholder="https://github.com/you" /></label><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>LinkedIn</span><Input value={profile.linkedin} onChange={e => setProfile({ ...profile, linkedin: e.target.value })} placeholder="https://linkedin.com/in/you" /></label><label className="space-y-2 text-sm font-semibold text-[#385046]"><span>Twitter / X</span><Input value={profile.twitter} onChange={e => setProfile({ ...profile, twitter: e.target.value })} placeholder="https://x.com/you" /></label></div><div className="flex flex-wrap gap-3 border-t border-[#dedcd2] pt-5"><input ref={profileInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => handleUpload(e.target.files?.[0], "profile_image")} /><Button variant="outline" onClick={() => profileInput.current?.click()} disabled={uploading === "profile_image"} className="gap-2 rounded-full"><Upload className="h-4 w-4" />{uploading === "profile_image" ? "Uploading…" : "Add profile photo"}</Button><input ref={resumeInput} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={e => handleUpload(e.target.files?.[0], "resume")} /><Button variant="outline" onClick={() => resumeInput.current?.click()} disabled={uploading === "resume"} className="gap-2 rounded-full"><FileUp className="h-4 w-4" />{uploading === "resume" ? "Uploading…" : "Upload resume"}</Button><Button onClick={save} disabled={saving} className="ml-auto gap-2 rounded-full bg-[#21473a] text-white hover:bg-[#2f5c4b]"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save profile"}</Button></div></CardContent></Card>}
        {activeTab === "work" && <Card className="border-[#dedcd2] bg-white/70 shadow-none"><CardHeader><CardTitle className="display-font text-xl text-[#21473a]">Selected work</CardTitle><CardDescription>Add projects as concise case studies: problem, solution, and measurable impact.</CardDescription></CardHeader><CardContent className="space-y-6"><div className="rounded-2xl border border-[#dedcd2] bg-[#f8f5ed] p-5"><div className="mb-4 flex items-center justify-between"><p className="text-sm font-bold text-[#21473a]">{editingProjectId ? "Edit project" : "New project"}</p>{editingProjectId && <button onClick={resetProject} className="text-xs font-semibold text-[#6f786f]">Cancel</button>}</div><div className="space-y-4"><Input value={project.title} onChange={e => setProject({ ...project, title: e.target.value })} placeholder="Project title" /><Textarea rows={3} value={project.description} onChange={e => setProject({ ...project, description: e.target.value })} placeholder="What was the challenge, and what did you make?" /><div className="rounded-2xl border border-[#dedcd2] bg-white/60 p-4"><p className="text-xs font-bold uppercase tracking-[.15em] text-[#e98d55]">Case study</p><div className="mt-3 space-y-3"><label className="block text-sm font-semibold text-[#385046]"><span>Client problem</span><Textarea rows={3} value={project.clientProblem} onChange={e => setProject({ ...project, clientProblem: e.target.value })} placeholder="What problem or opportunity did the client face?" /></label><label className="block text-sm font-semibold text-[#385046]"><span>My solution</span><Textarea rows={3} value={project.solution} onChange={e => setProject({ ...project, solution: e.target.value })} placeholder="What did you do, build, or change?" /></label><label className="block text-sm font-semibold text-[#385046]"><span>Business impact</span><Textarea rows={3} value={project.businessImpact} onChange={e => setProject({ ...project, businessImpact: e.target.value })} placeholder="What improved? Add a number, result, or meaningful outcome." /></label></div></div><ProjectProofControls project={project} onChange={setProject} onChooseEvidence={chooseEvidenceFile} pendingEvidenceFile={pendingEvidenceFile} /><Input value={project.technologies} onChange={e => setProject({ ...project, technologies: e.target.value })} placeholder="Technologies (comma separated)" /><div className="grid gap-4 sm:grid-cols-2"><Input value={project.liveUrl} onChange={e => setProject({ ...project, liveUrl: e.target.value })} placeholder="Live URL" /><Input value={project.githubUrl} onChange={e => setProject({ ...project, githubUrl: e.target.value })} placeholder="GitHub URL" /></div><label className="block rounded-2xl border border-dashed border-[#c9c7bb] bg-white/60 p-4 text-sm text-[#385046]"><span className="font-semibold">Work files <span className="font-normal text-[#6f786f]">(images or videos, up to 8)</span></span><input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" className="mt-3 block w-full text-xs" onChange={event => chooseProjectMedia(event.target.files)} />{pendingProjectMediaFiles.length > 0 && <span className="mt-2 block text-xs text-[#6f786f]">{pendingProjectMediaFiles.length} file{pendingProjectMediaFiles.length === 1 ? "" : "s"} ready to upload with this work.</span>}</label><Button onClick={saveProject} disabled={createProject.isPending || updateProject.isPending || uploadProjectMedia.isPending} className="rounded-full bg-[#21473a] text-white hover:bg-[#2f5c4b]"><Plus className="h-4 w-4" />{editingProjectId ? "Update work" : "Add work"}</Button></div></div><div className="space-y-3">{(projectsQuery.data ?? []).map(item => <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[#dedcd2] bg-white p-4"><div><p className="font-semibold text-[#21473a]">{item.title}</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6f786f]">{item.description || "No description yet."}</p><p className="mt-2 text-xs text-[#e98d55]">{item.technologies || "Add technologies"}</p><ProjectMediaControls projectId={item.id} media={projectMediaPreviews[item.id] ?? item.media ?? []} onUpload={file => handleProjectMediaUpload(item.id, file)} onDelete={mediaId => handleProjectMediaDelete(item.id, mediaId)} /></div><div className="flex gap-1"><button onClick={() => startEdit(item)} className="rounded-lg px-2 py-1 text-xs font-semibold text-[#21473a] hover:bg-[#ebe8dc]">Edit</button><button onClick={() => deleteProject.mutate({ id: item.id }, { onSuccess: () => { utils.projects.list.invalidate(); toast.success("Project removed"); } })} className="rounded-lg p-2 text-[#6f786f] hover:bg-[#f9e4de] hover:text-[#b83f3f]" aria-label={`Delete ${item.title}`}><Trash2 className="h-4 w-4" /></button></div></div>)}{!projectsQuery.data?.length && <div className="rounded-2xl border border-dashed border-[#dedcd2] p-6 text-center text-sm text-[#6f786f]">Your projects will collect here. Start with the work you're proudest of.</div>}</div></CardContent></Card>}
        {activeTab === "appearance" && <Card className="border-[#dedcd2] bg-white/70 shadow-none"><CardHeader><CardTitle className="display-font text-xl text-[#21473a]">Choose a direction</CardTitle><CardDescription>Switch templates without losing any of your content.</CardDescription></CardHeader><CardContent><div className="grid gap-3">{(templatesQuery.data ?? TEMPLATE_OPTIONS).map(template => <button key={template.slug} onClick={() => setProfile({ ...profile, templateId: template.slug as TemplateSlug })} className={`flex items-center justify-between rounded-2xl border p-4 text-left ${profile.templateId === template.slug ? "border-[#21473a] bg-[#eef4e9] ring-2 ring-[#dcefdc]" : "border-[#dedcd2] bg-white hover:border-[#a9b8ab]"}`}><span><span className="block font-semibold text-[#21473a]">{template.name}</span><span className="mt-1 block text-sm text-[#6f786f]">{"description" in template ? template.description : "A focused visual direction for your story."}</span></span>{profile.templateId === template.slug && <Check className="h-5 w-5 text-[#21473a]" />}</button>)}<Button onClick={save} disabled={saving} className="mt-3 w-full gap-2 rounded-full bg-[#21473a] text-white hover:bg-[#2f5c4b]"><Save className="h-4 w-4" />Save appearance</Button></div></CardContent></Card>}
      </section><aside className="xl:sticky xl:top-8 xl:self-start"><div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#e98d55]">Live preview</p><p className="mt-1 text-sm text-[#6f786f]">This is what your visitors will see.</p></div><WandSparkles className="h-5 w-5 text-[#e98d55]" /></div><div className="mb-3 flex justify-end">{isPublished && portfolioQuery.data?.portfolio?.slug ? <InquiryDialog slug={portfolioQuery.data.portfolio.slug} freelancerName={preview.fullName} triggerLabel="Message me" triggerClassName="inline-flex items-center gap-2 rounded-full bg-[#21473a] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#2f5c4b]" /> : <button type="button" onClick={() => toast.info("Publish your portfolio to activate the Message me form.")} className="inline-flex items-center gap-2 rounded-full border border-[#dedcd2] bg-white px-4 py-2 text-xs font-bold text-[#21473a]">Message me</button>}</div><PortfolioPreview portfolio={preview} /></aside></div>
    </main>
  </div>;
}
