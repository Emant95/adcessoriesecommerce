import { useSite } from '../../lib/content.jsx';
import { useSeo } from '../../lib/seo.js';

const SECTIONS = [
  ['shipping', 'Shipping & delivery'],
  ['returns', 'Returns & exchanges'],
  ['privacy', 'Privacy policy'],
  ['terms', 'Terms of use'],
];

export default function Policies() {
  const { content } = useSite();
  const p = content.policies || {};
  useSeo({ title: `Store policies | ${content.store?.name || 'Adcessories'}` });
  return (
    <div className="container-x max-w-3xl py-14">
      <p className="eyebrow">Policies</p>
      <h1 className="mt-3 text-4xl">Store policies</h1>
      <div className="mt-10 space-y-10">
        {SECTIONS.filter(([k]) => p[k]).map(([k, title]) => (
          <section key={k} id={k} className="scroll-mt-24">
            <h2 className="text-2xl">{title}</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-taupe">{p[k]}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
