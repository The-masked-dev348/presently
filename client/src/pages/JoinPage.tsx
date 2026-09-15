import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Gift, Loader2, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function JoinPage() {
  const { code = "" } = useParams<{ code: string }>();
  const visit = trpc.referrals.visit.useMutation();
  useEffect(() => { if (!code) return; localStorage.setItem("presently-referral-code", code.toUpperCase()); visit.mutate({ code }, { onError: error => toast.error(error.message) }); }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="grid min-h-screen place-items-center bg-[#f8f5ed] px-5"><main className="w-full max-w-lg text-center"><Link href="/" className="display-font text-xl font-bold tracking-[-.06em] text-[#21473a]">presently<span className="text-[#e98d55]">.</span></Link><div className="mx-auto mt-12 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#e4f18e] text-[#21473a]"><Gift className="h-7 w-7" /></div><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#e98d55]">You were invited</p><h1 className="display-font mt-3 text-5xl font-bold leading-[.95] tracking-[-.06em] text-[#21473a]">Make your work<br />easy to remember.</h1><p className="mx-auto mt-6 max-w-md text-base leading-7 text-[#6f786f]">Presently gives your work a considered home—without asking you to start from a blank website.</p><Button onClick={() => startLogin()} className="mt-8 rounded-full bg-[#21473a] px-6 py-5 text-[#f8f5ed] hover:bg-[#2f5c4b]">Create my portfolio <ArrowRight className="h-4 w-4" /></Button><div className="mx-auto mt-10 flex max-w-sm items-center justify-center gap-2 text-xs text-[#6f786f]"><ShieldCheck className="h-4 w-4 text-[#769b83]" /> The referrer earns only after you publish.</div>{visit.isPending && <Loader2 className="mx-auto mt-5 h-4 w-4 animate-spin text-[#6f786f]" />}</main></div>;
}
