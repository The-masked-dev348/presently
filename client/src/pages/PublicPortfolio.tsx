import PortfolioPreview, { type PreviewPortfolio } from "@/components/PortfolioPreview";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { Link, useParams } from "wouter";
import { parseSocialLinks } from "@shared/presently";

export default function PublicPortfolio() {
  const { slug = "" } = useParams<{ slug: string }>();
  const query = trpc.portfolio.public.useQuery({ slug }, { retry: false });
  if (query.isLoading) return <div className="flex min-h-screen items-center justify-center bg-[#f8f5ed]"><Loader2 className="h-6 w-6 animate-spin text-[#21473a]" /></div>;
  if (!query.data) return <div className="grid min-h-screen place-items-center bg-[#f8f5ed] px-5 text-center"><div><p className="display-font text-6xl font-bold text-[#21473a]">404</p><h1 className="mt-3 text-2xl font-bold text-[#21473a]">This portfolio is not public.</h1><p className="mt-2 text-sm text-[#6f786f]">It may still be a private draft, or the link may be out of date.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#21473a]"><ArrowLeft className="h-4 w-4" /> Back to Presently</Link></div></div>;
  const { portfolio, projects } = query.data;
  const preview: PreviewPortfolio = { fullName: portfolio.fullName || query.data.owner.name || "", professionalTitle: portfolio.professionalTitle || "", bio: portfolio.bio || "", location: portfolio.location || "", skills: portfolio.skills || "", templateId: portfolio.templateId as PreviewPortfolio["templateId"], socialLinks: parseSocialLinks(portfolio.socialLinks), projects: projects.map(project => ({ id: project.id, title: project.title, description: project.description, technologies: project.technologies, liveUrl: project.liveUrl, githubUrl: project.githubUrl })) };
  const links = parseSocialLinks(portfolio.socialLinks);
  return <div className="min-h-screen bg-[#f8f5ed] px-4 py-8 sm:px-8"><div className="mx-auto max-w-5xl"><div className="mb-6 flex items-center justify-between"><Link href="/" className="display-font text-lg font-bold tracking-[-.06em] text-[#21473a]">presently<span className="text-[#e98d55]">.</span></Link><div className="flex items-center gap-3">{Object.entries(links).filter(([, value]) => Boolean(value)).slice(0, 2).map(([name, value]) => <a key={name} href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold capitalize text-[#6f786f] hover:text-[#21473a]">{name}<ExternalLink className="h-3 w-3" /></a>)}</div></div><PortfolioPreview portfolio={preview} /><p className="mt-6 text-center text-xs text-[#6f786f]">Made with <Link href="/" className="font-bold text-[#21473a]">Presently</Link> — present your work and professional identity.</p></div></div>;
}
