import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  slug: string;
  freelancerName: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

const initialForm = { senderName: "", senderEmail: "", senderWhatsapp: "", service: "", budget: "", timeline: "", message: "", website: "" };

export default function InquiryDialog({ slug, freelancerName, triggerClassName = "", triggerLabel = "Book me" }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const submit = trpc.inquiries.submit.useMutation();
  const update = (key: keyof typeof initialForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const handleOpenChange = (nextOpen: boolean) => { setOpen(nextOpen); if (nextOpen) submit.reset(); };
  const submitInquiry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await submit.mutateAsync({ portfolioSlug: slug, ...form });
      setForm(initialForm);
      toast.success("Your inquiry was sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send your inquiry");
    }
  };
  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild><button type="button" className={triggerClassName}>{triggerLabel}<ArrowUpRight className="h-4 w-4" /></button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto border-[#dedcd2] bg-[#fffdf8] text-[#21473a] sm:max-w-xl">
      <DialogHeader><DialogTitle className="display-font text-2xl">Start a conversation with {freelancerName || "this freelancer"}</DialogTitle><DialogDescription className="text-[#6f786f]">Tell them what you need. Keep it simple—there is no account to create.</DialogDescription></DialogHeader>
      {submit.isSuccess ? <div className="rounded-2xl bg-[#eef4e9] p-6 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#dcefdc] text-[#21473a]"><Check className="h-6 w-6" /></div><h3 className="mt-4 font-bold">Inquiry sent</h3><p className="mt-2 text-sm leading-6 text-[#6f786f]">{freelancerName || "The freelancer"} will be able to review your request and get back to you.</p><Button type="button" onClick={() => setOpen(false)} className="mt-5 rounded-full bg-[#21473a] text-white hover:bg-[#2f5c4b]">Done</Button></div> : <form onSubmit={submitInquiry} className="space-y-4">
        <input tabIndex={-1} autoComplete="off" value={form.website} onChange={event => update("website", event.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0" aria-hidden="true" />
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-semibold"><span>Your name</span><Input required value={form.senderName} onChange={event => update("senderName", event.target.value)} placeholder="Jordan Lee" /></label><label className="space-y-1.5 text-sm font-semibold"><span>Email</span><Input required type="email" value={form.senderEmail} onChange={event => update("senderEmail", event.target.value)} placeholder="jordan@example.com" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-semibold"><span>WhatsApp <span className="font-normal text-[#6f786f]">(optional)</span></span><Input value={form.senderWhatsapp} onChange={event => update("senderWhatsapp", event.target.value)} placeholder="+234…" /></label><label className="space-y-1.5 text-sm font-semibold"><span>What do you need?</span><Input value={form.service} onChange={event => update("service", event.target.value)} placeholder="Brand identity, website…" /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-semibold"><span>Budget</span><select value={form.budget} onChange={event => update("budget", event.target.value)} className="h-9 w-full rounded-md border border-[#dedcd2] bg-transparent px-3 text-sm"><option value="">Choose a range</option><option>Under $500</option><option>$500 – $1,500</option><option>$1,500 – $5,000</option><option>$5,000+</option><option>Let’s discuss</option></select></label><label className="space-y-1.5 text-sm font-semibold"><span>Timeline</span><select value={form.timeline} onChange={event => update("timeline", event.target.value)} className="h-9 w-full rounded-md border border-[#dedcd2] bg-transparent px-3 text-sm"><option value="">Choose a timeline</option><option>ASAP</option><option>Within 2 weeks</option><option>Within a month</option><option>Flexible</option></select></label></div>
        <label className="block space-y-1.5 text-sm font-semibold"><span>Message</span><Textarea required minLength={10} rows={5} value={form.message} onChange={event => update("message", event.target.value)} placeholder="What are you hoping to make, improve, or launch?" /></label>
        <DialogFooter><Button disabled={submit.isPending} type="submit" className="w-full rounded-full bg-[#21473a] text-white hover:bg-[#2f5c4b]">{submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}Send inquiry</Button></DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>;
}
