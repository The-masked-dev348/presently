import { ArrowUpRight, Github, Globe2, Linkedin, MapPin, Sparkles, Twitter } from "lucide-react";
import type { TemplateSlug } from "@shared/presently";

export type PreviewProject = {
  id?: number;
  title: string;
  description?: string | null;
  technologies?: string | null;
  liveUrl?: string | null;
  githubUrl?: string | null;
  imageUrl?: string | null;
  media?: PreviewMedia[];
};

export type PreviewMedia = {
  id?: number;
  mediaType: "image" | "video";
  url: string;
  caption?: string | null;
  originalName?: string | null;
};

export type PreviewPortfolio = {
  fullName: string;
  professionalTitle: string;
  bio: string;
  location: string;
  skills: string;
  socialLinks?: Record<string, string>;
  templateId: TemplateSlug;
  profileImageUrl?: string | null;
  projects: PreviewProject[];
};

function chips(value?: string | null) {
  return (value ?? "").split(",").map(item => item.trim()).filter(Boolean);
}

function ProjectMedia({ media = [] }: { media?: PreviewMedia[] }) {
  if (!media.length) return null;
  return <div className="mt-4 grid gap-2 sm:grid-cols-2">
    {media.slice(0, 4).map(item => item.mediaType === "video"
      ? <video key={item.id ?? item.url} src={item.url} controls preload="metadata" className="aspect-video w-full rounded-xl bg-[#19231f] object-cover" aria-label={item.caption || item.originalName || "Project video"} />
      : <img key={item.id ?? item.url} src={item.url} alt={item.caption || item.originalName || "Project image"} className="aspect-video w-full rounded-xl bg-[#eeeade] object-cover" />)}
  </div>;
}

function Identity({ portfolio, dark = false }: { portfolio: PreviewPortfolio; dark?: boolean }) {
  return (
    <div className="flex items-start gap-4">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold ${dark ? "bg-white/10 text-white" : "bg-[#e4f18e] text-[#21473a]"}`}>
        {portfolio.profileImageUrl ? <img src={portfolio.profileImageUrl} alt="" className="h-full w-full object-cover" /> : (portfolio.fullName || "P").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{portfolio.fullName || "Your name"}</p>
        <p className={`mt-1 text-sm ${dark ? "text-white/60" : "text-[#6f786f]"}`}>{portfolio.professionalTitle || "Your professional title"}</p>
        {portfolio.location && <p className={`mt-2 flex items-center gap-1 text-xs ${dark ? "text-white/50" : "text-[#6f786f]"}`}><MapPin className="h-3 w-3" />{portfolio.location}</p>}
      </div>
    </div>
  );
}

function SocialLinks({ portfolio, dark = false }: { portfolio: PreviewPortfolio; dark?: boolean }) {
  const links = Object.entries(portfolio.socialLinks ?? {}).filter(([, value]) => Boolean(value));
  if (!links.length) return null;
  const iconFor = (name: string) => {
    const normalized = name.toLowerCase();
    if (normalized.includes("github")) return Github;
    if (normalized.includes("linkedin")) return Linkedin;
    if (normalized.includes("twitter") || normalized === "x") return Twitter;
    return Globe2;
  };
  return <div className="mt-6 flex flex-wrap gap-2">{links.map(([name, value]) => { const Icon = iconFor(name); return <a key={name} href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer" aria-label={`Open ${name}`} title={name} className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${dark ? "border-white/15 text-white/70 hover:border-[#a7d66e] hover:text-[#a7d66e]" : "border-[#dedcd2] text-[#385046] hover:border-[#e98d55] hover:text-[#e98d55]"}`}><Icon className="h-4 w-4" aria-hidden="true" /><span className="sr-only">{name}</span></a>; })}</div>;
}

export default function PortfolioPreview({ portfolio }: { portfolio: PreviewPortfolio }) {
  const projects = portfolio.projects ?? [];
  const skills = chips(portfolio.skills);
  const template = portfolio.templateId;

  if (template === "dark-developer") {
    return <div className="overflow-hidden rounded-[24px] bg-[#101815] text-[#f8f5ed] shadow-2xl">
      <div className="border-b border-white/10 px-6 py-5 font-mono text-xs text-[#a7d66e]"><span className="mr-2 text-white/30">~/presently</span> portfolio.exe <span className="float-right text-white/30">● ● ●</span></div>
      <div className="grid gap-10 p-8 md:grid-cols-[.8fr_1.2fr] md:p-10">
        <div><p className="mb-7 font-mono text-sm text-[#a7d66e]">// hello, world</p><Identity portfolio={portfolio} dark /><h2 className="mt-10 font-mono text-3xl font-bold leading-tight">Building useful things<br /><span className="text-[#a7d66e]">with thoughtful code.</span></h2><p className="mt-5 max-w-md text-sm leading-7 text-white/60">{portfolio.bio || "A short introduction about you and the work you care about."}</p><div className="mt-6 flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="rounded-full border border-white/15 px-3 py-1 font-mono text-xs text-white/70">{skill}</span>)}<SocialLinks portfolio={portfolio} dark /></div></div>
        <div><p className="mb-5 font-mono text-xs uppercase tracking-[.2em] text-white/35">selected work</p><div className="space-y-3">{projects.length ? projects.map(project => <ProjectRow key={project.id ?? project.title} project={project} dark />) : <EmptyWork dark />}</div></div>
      </div>
    </div>;
  }
  if (template === "creative") {
    return <div className="overflow-hidden rounded-[24px] bg-[#f4f0e6] text-[#19231f] shadow-2xl"><div className="grid gap-8 bg-[#e98d55] p-8 md:grid-cols-[1.1fr_.9fr] md:p-10"><div><p className="mb-12 text-xs font-bold uppercase tracking-[.22em] text-[#21473a]/60">portfolio / 01</p><h2 className="display-font max-w-xl text-5xl font-bold leading-[.95] md:text-7xl">Make it<br /><span className="text-[#e4f18e]">matter.</span></h2></div><div className="flex flex-col justify-end"><Identity portfolio={portfolio} /><p className="mt-5 max-w-sm text-sm leading-6 text-[#21473a]/75">{portfolio.bio || "Your point of view, in a few considered lines."}</p><SocialLinks portfolio={portfolio} /></div></div><div className="grid gap-5 p-8 md:grid-cols-2 md:p-10"><div><p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">About the practice</p><div className="flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="rounded-full bg-[#21473a] px-3 py-1.5 text-xs font-semibold text-white">{skill}</span>)}</div></div><div><p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">Selected work</p><div className="space-y-4">{projects.length ? projects.slice(0, 3).map(project => <ProjectRow key={project.id ?? project.title} project={project} />) : <EmptyWork />}</div></div></div></div>;
  }
  if (template === "editorial") {
    return <div className="overflow-hidden rounded-[24px] bg-[#eee8db] text-[#19231f] shadow-2xl"><div className="border-b border-[#19231f]/15 px-8 py-5 text-xs uppercase tracking-[.2em]">The work of {portfolio.fullName || "a thoughtful maker"}<span className="float-right">{portfolio.location || "Presently"}</span></div><div className="grid gap-10 p-8 md:grid-cols-[.85fr_1.15fr] md:p-12"><div><p className="serif-font text-6xl leading-[.9]">A good<br />portfolio<br /><em>stays with you.</em></p><div className="mt-10"><Identity portfolio={portfolio} /><p className="mt-5 text-sm leading-7 text-[#6f786f]">{portfolio.bio || "A considered introduction belongs here."}</p><SocialLinks portfolio={portfolio} /></div></div><div><p className="mb-6 text-xs font-bold uppercase tracking-[.2em] text-[#6f786f]">Selected work — {new Date().getFullYear()}</p><div className="space-y-0">{projects.length ? projects.map((project, index) => <div key={project.id ?? project.title} className="grid grid-cols-[2.4rem_1fr] border-t border-[#19231f]/15 py-5"><span className="text-xs text-[#6f786f]">0{index + 1}</span><div><h3 className="serif-font text-2xl">{project.title}</h3><p className="mt-2 text-sm leading-6 text-[#6f786f]">{project.description || "A short description of the work."}</p><ProjectMedia media={project.media} /></div></div>) : <EmptyWork />}</div></div></div></div>;
  }
  if (template === "professional") {
    return <div className="overflow-hidden rounded-[24px] bg-white text-[#19231f] shadow-2xl"><div className="bg-[#21473a] px-8 py-8 text-white md:px-10"><div className="flex items-end justify-between gap-6"><div><p className="mb-6 text-xs font-semibold uppercase tracking-[.22em] text-[#d9e889]">Presently / profile</p><h2 className="display-font text-4xl font-bold md:text-5xl">{portfolio.fullName || "Your name"}</h2><p className="mt-2 text-white/65">{portfolio.professionalTitle || "Your professional title"}</p></div><div className="hidden sm:block"><Identity portfolio={portfolio} dark /></div></div></div><div className="grid gap-8 p-8 md:grid-cols-[.7fr_1.3fr] md:p-10"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">Profile</p><p className="text-sm leading-7 text-[#6f786f]">{portfolio.bio || "Your bio will appear here."}</p><div className="mt-7 flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="rounded-md bg-[#eef2e6] px-2.5 py-1 text-xs font-medium text-[#21473a]">{skill}</span>)}</div><SocialLinks portfolio={portfolio} /></div><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">Projects</p><div className="grid gap-3 sm:grid-cols-2">{projects.length ? projects.slice(0, 4).map(project => <ProjectCard key={project.id ?? project.title} project={project} />) : <EmptyWork />}</div></div></div></div>;
  }
  return <div className="overflow-hidden rounded-[24px] bg-[#fffdf8] text-[#19231f] shadow-2xl"><div className="grid gap-8 border-b border-[#dedcd2] p-8 md:grid-cols-[1.1fr_.9fr] md:p-10"><div><p className="mb-8 text-xs font-semibold uppercase tracking-[.22em] text-[#e98d55]">Presently / portfolio</p><h2 className="display-font max-w-xl text-5xl font-bold leading-[1.02]">{portfolio.fullName || "Your name"}</h2><p className="mt-4 text-lg text-[#6f786f]">{portfolio.professionalTitle || "Your professional title"}</p></div><div className="flex items-end md:justify-end"><Identity portfolio={portfolio} /></div></div><div className="grid gap-8 p-8 md:grid-cols-[.8fr_1.2fr] md:p-10"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">A little about me</p><p className="text-sm leading-7 text-[#6f786f]">{portfolio.bio || "A short introduction about you and the work you care about."}</p><div className="mt-7 flex flex-wrap gap-2">{skills.map(skill => <span key={skill} className="rounded-full border border-[#dedcd2] px-3 py-1 text-xs text-[#385046]">{skill}</span>)}</div><SocialLinks portfolio={portfolio} /></div><div><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-[#6f786f]">Selected work</p><div className="space-y-3">{projects.length ? projects.map(project => <ProjectRow key={project.id ?? project.title} project={project} />) : <EmptyWork />}</div></div></div></div>;
}

function ProjectRow({ project, dark = false }: { project: PreviewProject; dark?: boolean }) {
  return <div className={`group rounded-2xl border p-4 transition hover:-translate-y-0.5 ${dark ? "border-white/10 bg-white/[.04] hover:bg-white/[.08]" : "border-[#dedcd2] bg-white/50 hover:border-[#e98d55]"}`}><div className="flex items-start justify-between gap-4"><div><h3 className="font-semibold">{project.title}</h3><p className={`mt-1 text-sm leading-6 ${dark ? "text-white/55" : "text-[#6f786f]"}`}>{project.description || "A short description of the work."}</p><div className="mt-3 flex flex-wrap gap-1.5">{chips(project.technologies).slice(0, 4).map(tech => <span key={tech} className={`rounded-full px-2 py-1 text-[10px] ${dark ? "bg-white/10 text-white/60" : "bg-[#eeeade] text-[#6f786f]"}`}>{tech}</span>)}</div><ProjectMedia media={project.media} /></div><ArrowUpRight className={`h-4 w-4 shrink-0 ${dark ? "text-[#a7d66e]" : "text-[#e98d55]"}`} /></div></div>;
}
function ProjectCard({ project }: { project: PreviewProject }) { return <div className="rounded-2xl border border-[#dedcd2] p-4"><ProjectMedia media={project.media} /><div className="mb-8 flex h-20 items-end rounded-xl bg-[#eeeade] p-3"><Sparkles className="h-4 w-4 text-[#e98d55]" /></div><h3 className="font-semibold">{project.title}</h3><p className="mt-1 line-clamp-2 text-sm leading-6 text-[#6f786f]">{project.description || "A short description of the work."}</p></div>; }
function EmptyWork({ dark = false }: { dark?: boolean }) { return <div className={`rounded-2xl border border-dashed p-5 text-sm ${dark ? "border-white/15 text-white/45" : "border-[#dedcd2] text-[#6f786f]"}`}>Your selected work will appear here.</div>; }
