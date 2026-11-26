import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { useSite } from '../../lib/content.jsx';
import { useSeo } from '../../lib/seo.js';
import Reveal from '../../components/Reveal.jsx';

export default function Contact() {
  const { content } = useSite();
  const c = content.contact || {};
  const faq = content.faq?.items || [];
  useSeo({ title: `Contact | ${content.store?.name || 'Adcessories'}`, description: 'Get in touch with us about any product.' });
  const rows = [
    c.email && { icon: Mail, label: 'Email', value: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, label: 'Phone', value: c.phone, href: `tel:${c.phone.replace(/\s/g, '')}` },
    c.whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: c.whatsapp, href: `https://wa.me/${c.whatsapp.replace(/[^\d]/g, '')}` },
    c.address && { icon: MapPin, label: 'Visit', value: c.address },
    c.hours && { icon: Clock, label: 'Hours', value: c.hours },
  ].filter(Boolean);

  return (
    <div className="container-x py-14">
      <Reveal className="max-w-2xl">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">We'd love to hear from you</h1>
        <p className="mt-4 text-taupe">Ask about any product, availability or delivery. We usually reply within a few hours.</p>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r, i) => (
          <Reveal key={r.label} delay={i * 0.05} className="card flex gap-4 p-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-cream text-gold"><r.icon className="h-5 w-5" /></div>
            <div>
              <p className="label !mb-1">{r.label}</p>
              {r.href ? <a href={r.href} target={r.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="hover:text-gold-dark">{r.value}</a> : <p>{r.value}</p>}
            </div>
          </Reveal>
        ))}
      </div>
      {c.mapUrl && <iframe title="Map" src={c.mapUrl} className="mt-10 h-80 w-full rounded-xl2 border border-line" loading="lazy" />}
      {faq.length > 0 && (
        <section className="mt-16 max-w-3xl">
          <h2 className="text-3xl">Frequently asked questions</h2>
          <div className="mt-6 divide-y divide-line border-y border-line">
            {faq.map((f, i) => (
              <details key={i} className="group py-4">
                <summary className="cursor-pointer list-none font-medium">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-taupe">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
